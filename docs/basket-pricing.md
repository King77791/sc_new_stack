# Basket Pricing Projection — Gate 8B

Implemented as an isolated read-only layer in `frontend/features/basket`. There is
no Basket route/UI, React state, global store, network transport or Checkout action.
Cart/F1, frozen consumers, legacy fixtures, AGENTS and Knowledge remain unchanged.

## Ownership and modules

- `basket-pricing.types.ts`: local input/result contracts, not backend DTOs.
- `basket-money.ts`: RUB validation, checked integer arithmetic and exact formatting.
- `basket-product.adapter.ts`: ProductCard presentation input adapter, membership,
  safe navigation and explicit availability. No ProductCard price string is read.
- `basket-pricing.quote.ts`: coherent catalog bundle validation, Product badge,
  line quotes and pure stale-response acceptance predicate.
- `basket-pricing.projection.ts`: canonical-reference grouping, ordering, coverage,
  line/group/Basket issues, aggregates and independent counts.
- `basket-checkout-eligibility.ts`: local readiness versus provenance and missing
  Checkout integration.
- `basket-pricing.fixtures.ts`: synthetic QA inputs only, not application wiring.

Cart owns identity and confirmed quantity. Product Domain/catalog owns one monetary
discount policy per Product and prepared configuration prices. Badge is presentation;
savings is the difference of prepared amounts. Neither creates a separate policy.

## Money and price authority

Money is `{ currency: 'RUB', minor: number }`, nonnegative safe integer kopeks.
Unit prices must be positive. Validate before arithmetic; `rub` is a small internal
value constructor, not a parser/validator. Products with free unit prices are not
supported in v1. Intermediate multiplication/addition uses BigInt; public outputs
contain only JSON-compatible numbers. Overflow returns a typed issue, never clamp
or zero. Formatting groups thousands with spaces, omits zero kopeks and displays
two digits otherwise, without conversion through floating-point rubles.

The catalog supplies O=originalUnit and C=currentUnit, each configuration's
priceRevision, applied policyRevision, constant-unit-v1 rule and confirmation.
Active Product policy requires O>C>0; confirmed none requires O=C>0.
Missing policy does not default to none. Basket never calculates C from a percentage.

OriginalLine=O*Q, currentLine=C*Q, lineSavings=originalLine-currentLine.
The ready quote always contains currentLine. showOriginal is true only for active
policy. Group and Basket totals contain referenceSubtotal/currentSubtotal/
discountAmount with reference-discount=current. Group totals aggregate lines;
Basket totals aggregate complete groups. Never subtract savings from current again.
No-discount groups have equal reference/current internally, showSavings=false and
no badge. Future UI should show one total in that case.

Synthetic rounding case: O=101, C=86, Q=4, badge=15% gives 404/344/60 kopeks.
The 343-kopek result of reapplying a percentage to a group is forbidden. This does
not establish a production rounding rule. Catalog rounds unit prices upstream.

## Coherent inputs, revisions and badge

Call `projectBasketPricing(items, products, bundles, context, availability)` with
current immutable inputs. No memoization/cache is hidden inside. All input snapshots
must participate in caller dependencies, including policy/price refresh with the
same Cart array.

Each Product bundle has exactly one policy. All supplied price identities must be
unique members of that Product. Bundle, policy and price contexts must match the
requested source/catalogRevision/pricingRevision, and all prices must reference
the current monetary policyRevision. A partial revision update fails stale for the
Product. Missing price records are allowed as unavailable, keeping other ready
lines; they never produce full totals for a group containing a missing quote.

Monetary policyRevision and configuration priceRevision are distinct. Badge-only
metadata changes do not increment monetary revisions or affect quotes. Missing or
invalid percentage, semantics or roundingRuleRef hides the badge and emits a
nonblocking diagnostic. A percentage is never derived from O/C. The upstream
confirmation asserts applicability; Basket checks binding/amount invariants, not
a duplicated promotion/rounding formula. Producers must change monetary revisions
when monetary facts change. Local fixture revisions are not backend confirmation.

`acceptsBasketQuote(old, current, requestToken, currentToken)` compares identity,
quantity, policy/price revisions and complete monetary context. The caller must
replace its non-null opaque request token whenever any relevant immutable input
snapshot changes or a request is superseded (including remove/re-add and Q->Q2->Q).
The current quote must be resolved from current inputs. Tokens are caller-local;
there is no global generation store, retry, fetch, or new F4 publication guarantee.

## Coverage, issues and presentation

Coverage is complete/partially-unavailable/unavailable, counted from ready lines.
Issues are unavailable/invalid-pricing-data/stale/incompatible-currency/
aggregation-overflow, with scope, reason and relevant Product/item identity.
Expected data errors are typed. Arbitrary programming exceptions are not caught
and relabeled as unavailable. Internal exception messages are not in results.

All ready lines may have complete coverage while an aggregate overflows: totals
are then absent and an aggregation issue blocks eligibility. A partial group has
no full totals. Other complete groups retain theirs; the Basket has no full total.
No partial sum is exposed as a full result. Empty Cart has zero mathematical
totals/counts and no pricing error, but cannot proceed to Checkout.

itemCount=items.length; totalQuantity=checked sum of Q; productGroupCount=distinct
productKey count. Future “N товаров” uses totalQuantity, not CartProvider.itemCount.
Total quantity overflow is separate from monetary overflow; neither mutates Cart.

## Product and availability

Groups follow first Product occurrence in canonical Cart. Configurations sort by
validated explicit nominal weight, never parsed labels. Fixed Tea/Ceramics use the
existing fixed identity. Invalid standard Tea metadata fails membership validation,
retains canonical row order and emits ordering-fallback; no invented weight/options.

Product absence/ambiguity/invalidity retains canonical item references, quantity,
snapshot title/configuration label and safe local slug navigation where possible.
Cart contains no image fallback. No price uses old Cart displayLinePrice. REMOVE
remains available; decreases retain existing Cart command rejection rules. No
unsafe increase/transfer is authorized without current Product validation.

Availability is available/unavailable/unknown/not-purchasable, outside Cart. Explicit
availability input is required for available, including fixed Products. Regular
presentation is not stock confirmation. Preorder/disabled restrictions win over
an available input. Duplicate/missing availability is unknown. canTransfer means
the source is inspectable/selectable; target availability and current F1 validation
must still be checked at command execution. Availability changes do not erase prices.

## Eligibility and limitations

projectionReady means valid local contents, pricing, counts and available inputs.
Authority is fixture/backend/unknown. Fixture-only and unconfirmed authority block
Checkout, independently of local readiness. checkoutActionAvailable is always false;
there is no route, submit, order model or payment total. Even backend-provenance
read quotes need future authoritative Checkout validation, including quantity stock.
Totals cover merchandise only, without delivery/order-level adjustments.

Legacy ProductCard and CartWidget prepared prices remain on their existing inputs.
New QA numeric inputs are explicit and separate; no parsing/migration is attempted.
A later authorized integration gate must supply one current upstream source to all
consumers and define actual backend/version/availability contracts. F4/F7/F8 remain
open. Gate 9 is not started by this implementation.

## Verification

From `frontend`:

```powershell
node --test scripts/basket-pricing.test.mjs
node --test scripts/cart-domain.test.mjs scripts/cart-transfer-product.test.mjs scripts/cart-widget-adapter.test.mjs scripts/configuration-contract.test.mjs scripts/focus-ownership.test.mjs scripts/notification.test.mjs scripts/product-pending-feedback.test.mjs scripts/purchase-sheet-draft.test.mjs
npm.cmd run lint
npx.cmd tsc --noEmit
npm.cmd run build
```

The new suite implements R1-R30 plus malformed inputs, counts, coherence, availability,
rounding, safe navigation, ordering, overflow and formatting. R29 checks protected
tracked files against HEAD. R30 checks legacy suite integrity; legacy execution is
the separate command above, not implied by that single test.

Gate 8B verification: new deterministic suite 71/71 PASS; all eight existing
deterministic suites 134/134 PASS; ESLint PASS; TypeScript PASS; production build
PASS. No browser QA was run: this layer is not wired to a browser surface, and no
UI/Provider behavior changed. Protected tracked files have no diff against HEAD.
