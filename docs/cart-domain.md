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

Transitions are immutable; one Product may have several configuration lines, but
only one line per Product + configuration identity. ADD merges positive safe-integer quantities and refreshes presentation/pricing,
without moving the line. SET changes an existing line's absolute quantity. REMOVE
deletes a complete line. Unknown SET/REMOVE IDs return `not-found`; zero is invalid,
not removal. New lines append. Selectors never sum configurations.

The Provider exposes state, selectors and Promise mutation results, hiding local
transition functions from consumers. Success from ADD includes the resulting item
and addedQuantity. Cart itself has no notification state or event bus; the purchase
caller dispatches application `cart.added` after successful ADD. SET/REMOVE, rejected
commands and no-ops do not notify. Canonical Cart is the sole source of confirmed
quantity; there are no quantity-zero CartItems. Mutations serialize against the
latest local snapshot even when several run before React renders. The current
in-memory Provider publishes its ref snapshot before returning success; this is
not a specified network publication/revision guarantee for a future async backend.

## Pricing and future API

The harness injects a small resolver of explicit line-total fixtures. Arbitrary
quantities still work, but receive pricing status `unavailable` when no fixture
exists. A previous quantity's total is never reused. No strings are parsed and no
price, discount, availability or stock rules are calculated. A throwing resolver
fails the mutation atomically.

The resolver is a local-only boundary, not an API transport abstraction. Future
backend-backed integration must adapt confirmed snapshots to consumers; its mutation
postconditions/publication semantics still require a separate contract (F4). The
temporary `productKey=slug` is not backend `canonical_product_id`; mapping awaits the
backend contract. No endpoint, DTO or server identity is assumed.
An unavailable dev price is not a server commerce state or an orderable quote.
Backend pricing/availability remain authoritative. Network retries/idempotency and
Checkout authoritative validation are not implemented.

## Lifecycle and integrated Sheet boundary

Client navigation between these two routes and individual consumer remounts keep
Cart. Provider remount, reload and a new session reset it. There is no browser
storage, cookie or backend persistence.

ProductPurchaseSheet is an integrated single-target editor: load canonical quantity
or 0 if absent. Switching/reopening resets draft/removal intent; external updates
do not rewrite the draft. Confirm re-reads the actual target: positive uses SET for
existing, ADD for absent. Explicit decrement of a target existing at load to zero
permits REMOVE (or successful already achieved absence); positive clears that intent.
Missing `0 → 1 → 0` never permits deletion of an externally added line. Untouched zero
cannot confirm; SET 0 is forbidden. Other configurations remain unchanged. This is
target editing, not atomic transfer/merge of a source line into another configuration.
See [ProductCard integration](product-card-cart-integration.md) for UI/session rules.

Availability is a separate current Product input, not Cart existence/presentation.
Consumers retain unavailable items and quantity, block ADD/increase and allow decrease
and explicit REMOVE. Card/Sheet guards compare requested quantity against actual Cart
quantity at action time. The domain primitives remain UI-agnostic; fixtures/diagnostic
commands are not backend stock enforcement. Widget receives a separate availability
projection through props; production uses fixture snapshots. Future data ownership
must supply consistent current inputs; no live synchronization is implemented.

## Atomic configuration transfer/merge v1.0 — implemented

F1 CLOSED after implementation and verification. Basket UI is not implemented.
The public operation is:

```ts
transferConfiguration(input: TransferConfigurationInput): Promise<TransferConfigurationResult>
// input: { expectedSource: CartItem; target: CartIdentity }
```

`expectedSource` is the canonical immutable object confirmed by the caller. Current
in-memory validation compares `actualSource === expectedSource`; cloning, JSON restore,
or quantity-only comparison does not satisfy this precondition. This is a local version
check, not a future transport DTO. Changed source returns `conflict`; missing source
returns `not-found`, without creating a target from the old snapshot.

- `transferred`: absent target replaces source at its array position with all source Q.
- `merged`: existing target retains identity/position and receives actual target Q +
  source Q; source disappears. Unrelated lines retain references and relative order.
- `unchanged`: same identity, after existence/precondition checks; returns the current
  item without resolvers, a new items snapshot or publication.

Applied success returns `source` identity, resulting `item`, `movedQuantity` and outcome.
An operation-specific `ok/value/reason` result leaves ADD/SET/REMOVE contracts unchanged.
Failures: `not-found`, `invalid-identity`, `invalid-quantity`, `pricing-failed`, `conflict`,
`unavailable`, `validation-unavailable`, `unexpected-failure`. Cross-product, affected
duplicate/inconsistent identities, unsupported configuration and overflow reject atomically.

One pure transition uses the latest Cart. Provider has no await between reading it,
validating, quoting and publishing one resulting snapshot. Rejection/no-op returns the
same array and publishes nothing. Separate public REMOVE + ADD is prohibited. Results
describe the applied transition; a subsequent command can change Cart before a caller
continues after await. No `cart.added` event is produced.

### Current Product and pricing boundaries

The optional synchronous `ResolveTransferTarget` input is read at command execution;
even an old public command reference uses the latest supplied resolver props. Missing
resolver/current Product data fails closed. The pure Product adapter owns membership,
configuration input normalization, selector applicability and current target metadata.
Cart model imports no ProductCard types and knows no four-slot or weightGrams rules.
The application provider currently validates against frontend Product fixtures only.

Unavailable target rejects both creation and merge, since either increases its actual Q.
Unavailable source can move to an available target. Availability is not stored in Cart
identity. Source changes conflict; external target ADD/SET is merged from actual quantity;
unrelated changes preserve the source precondition. Competing operations consume source
once. REMOVE→ADD of the same source identity does not revive the old object precondition.

Target presentation is rebuilt from current Product input. Existing ResolveCartPricing
quotes resulting target quantity, never source price or a sum of formatted old totals.
Normal unavailable pricing is a valid result; a throwing quote rejects with no mutation.
No unit/discount/group/Basket total calculation is added. Resolvers must be pure and
synchronous. Live Product input ownership, backend atomicity/version preconditions and
network retry/idempotency guarantees remain future integration responsibilities.

### Verification

Baseline 90 deterministic tests plus 44 F1 domain/adapter tests: 134 PASS. Public
Provider QA has 14 scenario groups (no React Fiber): one observable snapshot for applied
transfer/merge, none for no-op/rejection/quote failure, latest inputs, races and existing
commands. Dev-only `/dev/cart-transfer` exposes that isolated consumer harness and is
404 in production. Run it with `frontend/scripts/cart-transfer-provider-qa.mjs` using the
same CART_QA_URL/CART_QA_CHROME environment as other browser scripts.
ProductCard, availability, Widget/Header and Notification browser regressions, lint,
TypeScript and production build passed. Frozen UI and RootLayout were not modified.

## Remaining audit findings (open)

- F4: future async backend mutation publication/postconditions require definition.
- F7: direct/Widget mutation error feedback remains unresolved; Sheet error handling
  does not close this finding.
- F8: browser QA infrastructure/private React internals remain unresolved.

Async intent/focus and availability/identity implementation gates passed. Documentation
reconciliation closed F9; the subsequent atomic operation gate closed F1. F4/F7/F8
remain open and Basket implementation has not started.

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
