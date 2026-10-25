# Isolated Cart domain

Dev routes: `/dev/cart-state` and `/dev/cart-state/observer`. Both return 404 outside
development. Their shared server layout hosts a client harness and one in-memory
CartProvider. The production shared shell now has its own persistent application
Cart and Widget consumer; these two routes retain explicit isolated test scopes.
See cart-widget-integration.md for the application-wide E2E surface.

## Contract

Identity is Product key plus selectable configuration ID or the fixed configuration.
The temporary Product key uses the existing presentation slug. The navigation slug
in the snapshot is independent of identity. A structured JSON tuple supplies an
opaque deterministic local line ID; a future server line ID is a separate concern.

ADD merges positive safe-integer quantities and refreshes presentation/pricing,
without moving the line. SET changes an existing line's absolute quantity. REMOVE
deletes a complete line. Unknown SET/REMOVE IDs return `not-found`; zero is invalid,
not removal. New lines append. Selectors never sum configurations.

The Provider exposes state, selectors and Promise mutation results, hiding local
transition functions from consumers. Success from ADD includes the resulting item
and addedQuantity; no notification state or event bus exists. Mutations serialize
against the latest local snapshot even when several run before React renders.

## Pricing and future API

The harness injects a small resolver of explicit line-total fixtures. Arbitrary
quantities still work, but receive pricing status `unavailable` when no fixture
exists. A previous quantity's total is never reused. No strings are parsed and no
price, discount, availability or stock rules are calculated. A throwing resolver
fails the mutation atomically.

The resolver is a local-only boundary, not an API transport abstraction. Future
backend-backed mutations replace Provider internals and adapt confirmed snapshots
to the same consumer interface. No endpoint, DTO or server identity is assumed.
An unavailable dev price is not a server commerce state or an orderable quote.

## Lifecycle and future sheet integration

Client navigation between these two routes and individual consumer remounts keep
Cart. Provider remount, reload and a new session reset it. There is no browser
storage, cookie or backend persistence.

Future sheet configuration changes select a target Cart line: use its quantity,
or 1 if absent. Do not carry quantity between configurations. Draft is a snapshot;
external updates do not rewrite it reactively. Confirm targets the current Cart:
SET if the target exists, otherwise ADD. Other configurations remain unchanged.
This policy is documented only; ProductPurchaseSheet is untouched.

## Verification

From the repository root:

```powershell
node --test frontend/scripts/cart-domain.test.mjs
npm.cmd run lint
cd frontend
npx.cmd tsc --noEmit
npm.cmd run build
```

Start development with `npm.cmd run dev`. In the harness perform scenarios A–G:
ADD 50, ADD 100, ADD 50, ADD pressed Tea, ADD teapot, REMOVE 50, REMOVE remaining
targets. Counts must be 1, 2, 2, 3, 4, 3, 0. Use the independent consumer to verify
quantities. Also exercise SET, invalid quantity, repeated fixed ADD, snapshot
refresh and two ADDs in one batch. Navigate to Observer and back; remount consumer,
then Provider, then reload. Only the latter two should clear Cart.

Check desktop widths 1280, 1440 and 1920, browser errors/warnings, hydration and
horizontal overflow. The harness is diagnostic UI, not a Figma implementation.

The repeatable browser check uses Node's built-in WebSocket and Chrome DevTools:

```powershell
# Start Chrome headless with a disposable profile outside frontend/.next:
# --headless=new --remote-debugging-port=9333 --user-data-dir=<temporary-profile>
# In restricted Windows environments Chrome may also require --no-sandbox,
# --disable-gpu and --disable-software-rasterizer for this disposable QA profile.
$env:CART_QA_URL = 'http://localhost:3010'
$env:CART_QA_CHROME = 'http://127.0.0.1:9333'
node frontend/scripts/cart-browser-qa.mjs
```

Use a separate temporary profile for this local diagnostic browser. The script
opens and closes its own tab; it does not drive an existing user tab. Production
404 verification requires a separate `next start` run after `next build`.
