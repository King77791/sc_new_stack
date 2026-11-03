# ProductCard → shared Cart integration

The ProductCard server component passes only productKey (currently its slug),
navigation slug, title and existing purchase presentation data to the client
purchase island. No image, Mood, Country or favorite data is added to this boundary.

The purchase island keeps selection, sheet visibility, focus and pending state.
Confirmed quantity is read from Cart for the selected configuration, or the single
internal fixed configuration. Changing the full selector never mutates Cart.
Full Add is ADD one for an eligible configuration. Presentations are full, compact
and CSS-responsive (compact below 1280 px). Compact selectable confirmed controls
are `[-] quantity [+] [management]`: the stepper changes only the selected canonical
CartItem; management opens ProductPurchaseSheet. Fixed Tea/Ceramics operate directly,
without a configuration selector or Sheet. Minus at one uses REMOVE, never SET 0.

The sheet starts a local draft on each mount. An explicit switch to another target
loads its current Cart quantity, or zero when absent. Clicking the already selected
target preserves edits. External updates do not rewrite the current draft. Confirm
looks up the actual target again: positive draft means SET if existing, ADD if absent.
Zero is UI draft only. Decrementing a target that existed when loaded to zero creates
explicit removal intent; returning positive clears it. Missing `0 → 1 → 0` creates
no removal intent, including after external ADD. Untouched zero cannot confirm.
Explicit zero removes an existing target or completes already achieved absence
without mutation. Switching/reopening discards draft and intent; other lines are unchanged.
Success commits selection (REMOVE follows Highest Remaining below) and closes the
sheet; failure keeps draft and error. Labels distinguish ADD, SET and REMOVE.
Ref guards prevent repeated confirmation before React renders the pending state.
A dismissed sheet session cannot later commit selection from its async completion.

## Configuration identity and availability v1.0

Regular selectable Tea input is validated as exactly four slots: `50 г.`, `100 г.`,
`200 г.`, `250 г.`. IDs are unique, stable and independent of label/index. Explicit
nominal `weightGrams` metadata normalizes canonical order; duplicate/missing/extra
slots or invalid labels are rejected. Initial selection is canonical 50, independent
of reference display label. Fixed-weight Tea/Ceramics do not use this four-slot rule.

Existence and eligibility are separate. Unavailable configurations remain visible,
inspectable and selectable, including initial 50. Existing CartItems retain identity
and canonical quantity. `Нет в наличии` is explicit; ADD/increase are forbidden,
decrease and explicit REMOVE allowed. Confirm and direct actions recheck current
Product input and actual Cart quantity; stale handlers cannot authorize an increase.
Unavailable existing equal quantity confirms without mutation. Missing zero remains
a no-op, not permission to remove. Full unavailable existing Cart action opens the
management Sheet; compact preserves minus/quantity/disabled plus/management.

Card/Sheet consume current frontend props, not Cart presentation or raw stock.
Production composition currently supplies fixture snapshots, not live backend data.
The future data owner must keep Card/Sheet and Widget inputs current and consistent.

## Async selection, focus and feedback

After successful explicit direct/Sheet REMOVE, re-read same-Product CartItems and
select the highest remaining canonical weight, including unavailable items. No
remaining item means initial CTA. Cart insertion order, label parsing and selection
history do not participate. External updates do not trigger generic selection repair.
Latest User Intent Wins: newer explicit selection supersedes stale UI completion
and transition, without rolling back the canonical mutation. There is no global lock.

Async focus restoration requires retained interaction ownership. Newer focus/pointer
intent supersedes completion, even within one Widget. A lost origin uses a visible,
enabled deterministic fallback only with ownership: direct REMOVE uses the next
selected minus or empty CTA; Sheet uses management/CTA, full action or full selector
when the unavailable empty action is disabled. Dismissal and responsive cleanup keep
the Sheet session guard. There is no global focus manager.

Compact pending spinner appears after 120 ms, locally within the purchase surface;
mutation is immediate and spinner has no minimum duration. Successful direct REMOVE
replacement uses the approved short opacity enter transition (180 ms). Reduced motion
disables spinner/enter animation. Cleanup cancels timers and stale presentation work.

Notification is integrated: successful ADD dispatches `cart.added` through the
application FIFO queue, including repeated ADD. SET, REMOVE, failures and no-ops do
not notify. Dispatch follows command success, independently of Sheet UI completion.

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
for 50/100/200/250 configurations. Below 1280 px, selectable CTA/management opens the
native modal sheet and the confirmed stepper operates directly; fixed controls operate
directly. The diagnostic ADD/SET/REMOVE controls
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
confirm, external draft changes, unavailable configurations, keyboard, focus restoration,
touch swipe, desktop 1280/1440/1920 and compact 375/414. It saves screenshots into
the OS temporary directory. Native modal keyboard checks allow focus to browser
chrome, while checking that no background page control receives focus.

`/dev/configuration-availability` additionally exercises controlled current Product
props for Card/Sheet and a separate Widget availability projection. It is QA-only,
404 in production, and does not simulate live backend synchronization. Deterministic
coverage lives in configuration-contract, purchase-sheet-draft, pending-feedback and
focus-ownership tests; browser coverage in configuration-availability-browser-qa and
product-cart-browser-qa. These suites passed the preceding implementation gates;
the documentation reconciliation does not rerun runtime QA.

CartWidget, Header indicator and Notification are integrated in the application shell.
See [Cart domain](cart-domain.md), [Widget integration](cart-widget-integration.md)
and AGENTS §§24–26. ProductCard/Sheet/Widget remain READY / FROZEN. Backend/API and
Checkout validation remain future work. Current statuses of findings F1/F4/F7/F8 are listed in the
Cart domain document; this reconciliation closes documentation drift F9 only.
