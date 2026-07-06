# Emeritus Global Gadgets Design System

## Direction

The visual language is precise, calm, technical, and product-led. It uses high-contrast typography, quiet neutral surfaces, controlled cobalt emphasis, generous negative space, and subtle material depth. Decoration never competes with product photography or commerce information.

This system is influenced by premium industrial design conventions without copying another company's assets or visual identity.

## Foundations

### Color

All components use semantic CSS variables from `app/globals.css`; raw color utilities are prohibited in reusable components.

| Token | Purpose |
|---|---|
| `background` | Application canvas |
| `foreground` | Primary content |
| `card` | Elevated or grouped surfaces |
| `muted` | Recessed surfaces and selected neutral states |
| `muted-foreground` | Secondary copy; must retain readable contrast |
| `primary` | Brand cobalt, primary actions, active emphasis |
| `accent` | Low-emphasis brand surface |
| `border` / `input` | Structural and form boundaries |
| `success` | Confirmed, available, completed |
| `warning` | Attention, low stock, pending |
| `destructive` | Destructive action or failed state |
| `info` | Informational state |

Color is never the sole carrier of state. Pair it with text, iconography, or shape. Body text targets WCAG AA contrast; controls and focus indicators remain visible in both themes.

### Typography

Geist is the interface and editorial family. Geist Mono is used for prices, order references, SKUs, serial numbers, and tabular numeric data.

| Style | Size/behavior | Use |
|---|---|---|
| Display | `clamp(44px, 7vw, 104px)`, 0.94 line-height | Rare brand/product statements |
| Title | `clamp(32px, 4vw, 64px)`, 1.0 line-height | Section and modal titles |
| H2 | 30–36px, tight tracking | Major group heading |
| H3 | 20–24px | Card and subsection heading |
| Body | 16px / 1.6 | Default reading |
| UI | 14px / 1.4 | Controls and dense interfaces |
| Caption | 12px / 1.4 | Metadata and support copy |

Large type uses balanced wrapping and negative letter spacing. Long-form text is limited to approximately 68 characters per line. All prices use tabular mono numerals.

### Spacing

Use a 4px base grid:

`1, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128`.

Component interiors normally use 12–24px. Section rhythm uses 64–128px. Touch targets are at least 44×44px, except compact desktop-only table actions, which may be 36×36px.

### Radius

- 6px: tiny indicators and compact controls.
- 8px: badges and dense controls.
- 12px: standard inputs and buttons.
- 16px: compact cards and panels.
- 20–24px: product media, major cards, dialogs.
- Pill: badges, segmented controls, and status only.

Radius expresses hierarchy; it is not chosen independently per component.

### Shadows and glass

Five elevation tokens range from `xs` to `xl`. Borders define normal hierarchy; shadows communicate floating or interactive elevation. Cards do not receive strong shadows at rest.

The `.glass` material uses a translucent semantic surface, 20px blur, increased saturation, a material border, and low elevation. Use it only for content overlay, sticky navigation, or floating controls. Never stack glass surfaces or place dense text on uncontrolled imagery.

### Icons

Lucide is the single interface icon family:

- 16px in buttons, inputs, badges, and table actions.
- 20px for standard standalone controls.
- 24px for navigation or feature identifiers.
- 1.75–2px stroke; inherit `currentColor`.
- Every icon-only control has an accessible label.
- Filled icons indicate a persistent state only, such as wishlisted.
- Brand and payment marks use vendor-provided SVG assets, not Lucide substitutes.

## Components

### Buttons

Variants: primary, inverse, secondary, outline, ghost, destructive, and link. Sizes range from 32px to 56px; the default is 44px. Primary actions use cobalt, one per decision group. Destructive actions require explicit wording and confirmation when irreversible.

All buttons include visible focus, pressed scale, disabled opacity, and restrained hover elevation. Loading buttons retain their width, replace the leading icon with `Spinner`, set `aria-busy`, and keep the action label visible.

### Inputs

Inputs are 44px high with a 12px radius. A field composition must provide:

1. visible label;
2. optional description;
3. control;
4. validation message linked with `aria-describedby`.

Placeholder text is an example, never a label. Invalid state uses `aria-invalid`, a semantic border/ring, and explanatory text.

### Cards

Cards are structural surfaces, not generic wrappers. `Card` exposes normal, interactive, and glass materials. Interactive cards move at most 2px and must expose an actual link or button for their primary action; the card container itself is not made clickable with an unsemantic handler.

### Navigation

`NavLink` supports active, hover, focus, and default states. Desktop navigation uses 40px controls with low-emphasis neutral backgrounds. Mobile navigation maintains 44px touch targets. Sticky navigation may use `.glass`; the content order and keyboard order must match.

### Tables

Tables use uppercase 12px headers, 44px minimum headers, 52px typical rows, subtle row hover, horizontal overflow, and tabular numerals. On narrow screens, preserve the table for comparison-heavy data; transform to labeled records only when each row remains semantically complete.

### Badges

Badges represent compact state or classification and are never interactive. Variants are default, neutral, outline, success, warning, destructive, and info. Use sentence case and concise labels.

### Product cards

The reusable `ProductCard` is presentation-only:

- product image uses contained rendering and a restrained hover scale;
- names clamp to two lines to preserve grid rhythm;
- prices are preformatted by the caller, avoiding currency assumptions;
- callbacks own selection and wishlist behavior;
- the caller injects the commerce action;
- availability is an explicit semantic state;
- no cart, routing, or API dependency is embedded.

Product grids use two columns on small screens, three around tablet widths, and four or more only where the card's minimum readable width is preserved.

### Loading and skeletons

Use `Spinner` for an action or an indeterminate region below roughly one second. Use `Skeleton` for content whose layout is known. Skeleton geometry must match final content, use a single low-contrast shimmer direction, and expose no fake text to assistive technology. Full regions expose an external `role="status"` label.

Do not show a spinner immediately for near-instant navigation. Delaying it by roughly 150–200ms prevents flicker; skeletons can appear immediately when layout stability matters.

## Responsive model

Tailwind defaults are retained with additional extremes:

| Name | Width | Intent |
|---|---:|---|
| base | 0 | Small phones, default-first |
| `xs` | 480px | Large phones |
| `sm` | 640px | Landscape phone |
| `md` | 768px | Tablet |
| `lg` | 1024px | Small laptop |
| `xl` | 1280px | Desktop |
| `2xl` | 1440px | Wide desktop |
| `3xl` | 1920px | Large display |

Layouts are content-driven and mobile-first. Container gutters are 16px at base, 24px at `sm`, 32px at `lg`, and 48px on wide displays. Reading content remains width-constrained even when product galleries expand.

## Dark mode

Dark mode is not an inverted light palette. It uses graphite rather than pure black, slightly brighter semantic colors, translucent white boundaries, and deeper shadows. The system supports:

- `.dark` for explicit dark mode;
- `.light` to override OS dark mode;
- OS preference when neither class is present.

Theme selection should be persisted by the future theme provider and applied before hydration to avoid flashing. Product imagery and vendor logos must be tested against both surfaces.

## Motion

Motion explains state and spatial relationships. It is never required to understand or operate the interface.

| Token | Duration | Use |
|---|---:|---|
| Instant | 100ms | Press and micro-feedback |
| Fast | 160ms | Hover, color, small controls |
| Normal | 240ms | Popover, card entrance |
| Slow | 400ms | Large reveal or route-level transition |

- Standard easing: `cubic-bezier(0.2, 0, 0, 1)`.
- Entrance easing: `cubic-bezier(0.16, 1, 0.3, 1)`.
- Spring-like easing is restricted to small, playful state confirmation.
- Hover translation is limited to 2px; image scale is limited to approximately 1.035.
- Animate `transform` and `opacity`; avoid layout properties.
- Stagger is capped at 40ms per item and eight visible items.
- Exit is faster than entrance.
- `prefers-reduced-motion` disables nonessential transitions, animation, and smooth scrolling globally.

Framer Motion components must consume these duration/easing values and provide reduced-motion variants.

## Component API rules

- Components forward valid native props and expose `data-slot` hooks.
- Visual variants use Class Variance Authority.
- `className` remains available for composition but semantic tokens cannot be bypassed in shared components.
- Business behavior, data fetching, currency formatting, and navigation are injected by the feature layer.
- Native elements and Base UI primitives are preferred before custom ARIA implementations.
- Every state is testable through semantic roles, labels, state attributes, or `data-slot`.
- Reusable components must work in light/dark mode, keyboard-only operation, 200% zoom, and reduced motion.
