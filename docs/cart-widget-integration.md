# Cart → CartWidget production shell integration

The application shell now has a persistent client Provider around server-composed
Header, content and Footer, without a DOM wrapper. ProductCard actions use that
Cart on Home and existing presentation QA pages. The isolated cart-state and
product-cart harnesses deliberately retain their own test Providers.

The previous five explicit dev line quotes are extracted into a feature fixture
module and reused unchanged. They remain frontend-only test values, not production
commerce prices. Unsupported quantities/configurations return unavailable; no
price string is parsed, scaled or used as a stale total.

The adapter maps every canonical item, in order, to the frozen Widget's existing
presentation API. The container reads Cart, invokes REMOVE, and coordinates the
last focused remove control with a stable target on the existing Header basket
link. Ordinary row focus remains owned by the frozen Widget. No optimistic local
removal, expanded state, quantity state, pricing calculation or Header indicator
is added to the container.

The consumer is mounted once in the production shared shell, between page content
and SiteFooter. The user approved the literal text «Цена недоступна» when no quote
exists. The shell explicitly supplies that policy; the row, count, configuration,
quantity and remove control remain present, and the frozen Widget API is unchanged.

Content has its own stacking context below the future fixed Widget; existing
Footer and Header layers are unchanged. The Footer still occludes the widget
through CSS stacking only; offsets, markup, geometry and scroll logic are untouched.

## QA surfaces and checks

`/dev/cart-widget-integration` and its observer route use the actual application
Provider, real ProductCards and canonical diagnostic mutations, without a nested
Provider. These routes exercise the complete production-shell path. Both remain
404 outside development. Existing isolated domain/ProductCard harnesses retain
their own scoped test Cart; the new route is the application-wide E2E surface.

Verification:

- Cart domain: 18 tests.
- Adapter/quote boundary: 6 tests, including exact line totals, configuration
  separation, order, missing quotes, fixed items and unchanged canonical snapshots.
- Existing ProductCard and Cart-state browser regressions.
- Frozen Widget presentation: desktop 1280/1440/1920, compact 375/414, 400×57,
  offsets, multiline titles, 40vh, list-only scroll, row focus and Footer occlusion.
- Application E2E-1..10 and PRICE-1..4: ADD/SET/REMOVE, two-card synchronization,
  separate configurations, exact line quotes and unavailable text, fixed products,
  native Sheet while Widget hidden, expanded state, navigation and reload.
- Last focused remove transfers focus to Header; background clearing does not.
- Production shell partial/full Footer occlusion in both states, Header layering,
  fixed offsets, long-list scrolling and no horizontal overflow.

```powershell
node --test frontend/scripts/cart-domain.test.mjs frontend/scripts/cart-widget-adapter.test.mjs
# With dev server on 3012 and disposable Chrome CDP on 9334:
node frontend/scripts/cart-widget-presentation-qa.mjs
node frontend/scripts/cart-widget-integration-qa.mjs
```

The integration surface has zero browser exceptions, React/hydration/duplicate-key
warnings and console errors/warnings in the final run. Home's existing frozen
PromoBanner emits a separate Next/Image advisory about fractional image dimensions
for next-slide.svg on client navigation. The browser suite reports it explicitly;
it does not silently suppress it or change frozen PromoBanner presentation.

Home empty/non-empty behavior and unchanged Header/Footer/page geometry are checked
separately. Footer CSS and the frozen Widget, ProductCard and Sheet presentations
are unchanged in this integration stage. Header has only a stable basket focus ID.
Header active indicator, Notification, Basket and real API/pricing remain future work.

The optimized production server was also exercised in Chrome on Home: first/repeated
ADD, exact line total, Widget removal and final Header focus all pass with zero
browser exceptions and console warnings/errors. Home returns 200; integration and
existing QA routes return 404 in production. The noted PromoBanner advisory is
development-only.
