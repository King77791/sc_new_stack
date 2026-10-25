# ProductCard → shared Cart integration

The ProductCard server component passes only productKey (currently its slug),
navigation slug, title and existing purchase presentation data to the client
purchase island. No image, Mood, Country or favorite data is added to this boundary.

The purchase island keeps selection, sheet visibility, focus and pending state.
Confirmed quantity is read from Cart for the selected configuration, or the single
internal fixed configuration. Changing the full selector never mutates Cart.
Full Add is ADD one; compact fixed minus uses SET, or REMOVE when quantity is one.

The sheet starts a local draft on each mount. An explicit switch to another target
loads its current Cart quantity, or one when absent. Clicking the already selected
target preserves edits. External updates do not rewrite the current draft. Confirm
looks up the target again: existing means SET, absent means ADD. Success commits
selection and closes the sheet; failure keeps it open with a small error message.
Ref guards prevent repeated confirmation before React renders the pending state.
A dismissed sheet session cannot later commit selection from its async completion.

Prices shown by ProductCard and the sheet remain prepared configuration prices.
Cart line totals remain the responsibility of the existing injected quote boundary.
Missing dev totals retain status unavailable; there is no new pricing calculation.

## Staged Provider boundary

Production RootLayout now owns one persistent application Cart. Outside a Provider, cards still render and
Cart actions are disabled; no per-card fallback Cart or local confirmed quantity
is created. A narrow optional-context hook supports this temporary boundary.
Existing product-card and promo-section dev pages use that application Provider;
isolated product-cart/domain harnesses retain their own diagnostic test scopes.
No frozen home feature is modified.

Server RootLayout composes a client Provider around server-provided
children and client consumers without making those server children client modules.
The shared Widget integration is documented in cart-widget-integration.md.

## Diagnostic route

`/dev/product-cart` is development-only (404 in production). It includes two copies
of the same selectable Tea, fixed Tea, two copies of Ceramics, unavailable options,
preorder, an independent observer and existing diagnostic Cart operations.

Use Reset integration between scenarios. Full actions read quantity independently
for 50/100/200/250 configurations. Below 1280 px, selectable controls open the native
modal sheet; fixed controls operate directly. The diagnostic ADD/SET/REMOVE controls
can change Cart externally. Native dialog makes background UI inert, so the timed
External ADD control can demonstrate an update while a draft is open.

Fail local quote exercises the existing atomic ADD/SET failure result without a
fake backend. It intentionally does not affect REMOVE, which does not quote prices.

## Checks

```powershell
node --test frontend/scripts/cart-domain.test.mjs
# With dev server and disposable headless Chrome as documented in cart-domain.md:
$env:CART_QA_URL = 'http://localhost:3012'
$env:CART_QA_CHROME = 'http://127.0.0.1:9334'
node frontend/scripts/product-cart-browser-qa.mjs
node frontend/scripts/cart-browser-qa.mjs
```

The targeted browser test covers FULL-1..5, COMPACT-1..9, FIXED-1..5, rapid double
confirm, external draft changes, disabled configurations, keyboard, focus restoration,
touch swipe, desktop 1280/1440/1920 and compact 375/414. It saves screenshots into
the OS temporary directory. Native modal keyboard checks allow focus to browser
chrome, while checking that no background page control receives focus.

ProductCard and ProductPurchaseSheet CSS, typography, spacing, breakpoint and
animation rules are unchanged. CartWidget, Header, Footer and production root
composition remain untouched. Future work: CartWidget integration, Header indicator,
Notification and the API boundary.
