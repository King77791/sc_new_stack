# Site Header — first iteration archive

This document records the first visual implementation. Its interaction and
navigation sections are superseded by [site-header-fixes.md](site-header-fixes.md).
Disabled actions, repeated temporary navigation and the old client boundary below
describe the original defects, not the current implementation.

## Scope and sources

Implemented only the shared Site Header. Next.js App Router, CSS Modules,
local assets, no additional dependencies or backend contracts.

Figma file: `VZ3bfelRsFChkn6WVuy2yg`.
The following `get_design_context` results were read in this iteration:

| Node | Purpose |
| --- | --- |
| `145:44921` | Sparse desktop section response to locate Header children |
| `145:44923` | Desktop default Header, including embedded screenshot |
| `145:44971` | Desktop expanded catalog and its layout/image layer |
| `145:47302` | Sparse tablet section response to locate Header/menu children |
| `145:47629` | Closed tablet Header, including embedded screenshot |
| `145:47682` | Open tablet menu and category accordion |
| `145:45118` | Search with product results (integration outside current scope) |
| `145:45225` | Search with content results (integration outside current scope) |
| `145:45062` | Empty search state (integration outside current scope) |
| `145:45618` | Green category menu variant and image layer |
| `145:45661` | Oolong category menu variant and image layer |

No separate screenshot, metadata, variable-definition or asset-download calls
were made. Screenshots were embedded in the concrete design-context responses.
Mobile node was not re-read: the user explicitly approved tablet structure for mobile.
The Figma design-to-code skill was read through the Figma MCP resource, following
the server's mandatory prerequisite.

## Confirmed visual facts

- Header top bar: 80 px; desktop navigation: 80 px.
- Desktop gutter: 40 px; desktop logo source: 360 × 80 SVG.
- Tablet logo slot: 315 px wide; actions: 56 px, gaps: 15 px.
- Desktop navigation and menu item text: Cera Pro Regular, 24 px.
- Contacts: Regular, 18 px. Desktop categories: Medium, 24 px.
- Menu catalog button: 280 × 56 px; label: Regular, 20 px.
- Desktop catalog content: 1068 px total; category column: 180 px,
  gap: 16 px, item region: 872 px, three columns, 16 px column gap.
- Expanded black category reference: 528 px total height, 40 px vertical padding.
- Header green: #1E3932; Cream Gold: #EABC6F; text: white.
- Navigation background: green at 80% opacity; catalog background: 95%.
- Backdrop blur: 12.5 px; category divider: 2 px, white at 20%.
- Tablet open menu: full overlay, catalog card at x=80/y=112,
  card padding 16 px, corner radius 12 px; secondary labels 32 px.
- Tablet accordion category labels require **Bold** in Figma.

## Assets and adaptations

`frontend/public/fonts/CeraPro-Regular.woff2` (400) and
`CeraPro-Medium.woff2` (500) are loaded via `next/font/local` in the root layout.
Bold is missing; the accordion uses 500. Font synthesis is disabled.

The logo uses a single picture: `logo_image_desktop_tablet.svg` by default,
`logo_image_mobile_only.svg` below 600 px. No asset copies or renamed files.

All eight local category PNGs are 600 × 365. CSS preserves their aspect ratio,
centers their decorative layer and rotates seven images by 90 degrees. Accessories
remain unrotated and are positioned partly outside the menu's left clipping edge.
The local art is a semicircular export, so its geometry is adapted to the supplied
file rather than stretching it to the Figma layer's aspect ratio.

The user confirmed there is no separate accessories/gift set design. Both categories
are appended after the six teas; accessories positioning is an explicit adaptation,
not a measured Figma state. Native CSS chevrons are used in the accordion; burger
and X are CSS lines as requested.

## Component and responsive behavior

- `SiteHeader` is a Server Component: contacts, responsive logo, actions and
  navigation composition. Accepts `navigationItems` as optional props.
- `MainNavigation` is the client boundary for desktop disclosure, category selection,
  burger, Escape/outside/focus-leave dismissal and mobile scroll locking.
- Native details/summary provide keyboard-accessible category accordions.
- `header-data.ts` contains small presentation lists, not Product/Category/API models.
- At 1280 px and above: desktop layout. Below: shared tablet/mobile burger/menu.
  The breakpoint allows space for contact/logo/actions and long desktop labels.
- Below 800 px: 20 px gutters and 44 px action targets.
- Below 600 px: mobile logo, 12 px gutters and smaller menu typography.
- Below 360 px: 8 px gutters, 130 px logo and 40 px action targets.
- Long labels wrap; none are truncated. Navigation has a minimum height rather
  than a hardcoded count or a fixed text height.
- Burger transitions take 180 ms, using transform/opacity; reduced-motion disables
  transitions. Button geometry remains stable between states.
- Focus-visible, aria-label/expanded/controls, Escape focus restoration and native
  Enter/Tab behavior are supported. Menu closes when focus leaves its region.
- The tablet overlay covers the bar. X stays at the burger position to avoid a jump,
  which differs from the separate Figma close button's y=40 placement.

## Temporary behavior and open questions

No product slugs, category URLs, secondary URLs, contact destinations or action
routes have been invented. The Figma contacts are presentation text, not verified
production contact details. Search/favorites/cart and catalog destination are disabled
until their flows/routes are supplied.

The six temporary desktop labels disclose the same shared catalog menu when no
href is supplied. Confirmed hrefs can later be passed through props. In the catalog
the labels are non-navigating presentation text until URLs exist. The temporary list
is repeated inside each mobile category; **no category/product mapping or filtering
is asserted**. Replacing the source and supplying category-specific navigation is
pending backend/navigation information.

Visual differences: real long mock labels instead of Figma's short placeholders;
six entries instead of repeated placeholder rows; two appended categories; Medium
instead of missing Bold; adapted local semicircular image geometry; responsive
mobile logo and spacing per the user's requirements; overlay close button position.

## Validation

Browser checks use a temporary Chrome DevTools Protocol script outside the repository.
Measured widths: 1920, 1600, 1280, 1279, 1024, 800, 799, 600, 599, 375, 360, 320 px.
Checks cover closed/open horizontal overflow, Header height (160/80 px), loaded
visible images, selected logo, all eight category images, rotation, Escape/focus
restoration, keyboard Enter/Tab/accordion, reduced motion and restored body scrolling.
No runtime exceptions were recorded. Desktop, tablet and 375 px screenshots were
visually inspected against the embedded Figma screenshots.

The pre-existing ESLint configuration used unsupported flat-config imports for
Next 15. It now adapts the installed legacy Next config using installed FlatCompat;
no package additions. `npm.cmd run lint` and `npm.cmd run build` are the project
checks (PowerShell's npm.ps1 execution is disabled in this environment).
