# Freelance Service Marketplace — Color Palette & UI Design Guide

**Project:** Web-Based Informal Freelance Service Marketplace  
**Design direction:** Warm Modern Professional  
**Version:** 1.2  

## 1. Proposed Color Palette

The platform uses a deep mauve identity paired with cream, pebble grey, tan, and warm brown. The previous mauve (`#86649A`) is **replaced** by the new primary mauve (`#59336D`), inspired by the supplied purple reference. The reference also supports darker and lighter mauve variants for gradients and interaction states.

| Color | HEX | Primary responsibility |
|---|---|---|
| **Primary Mauve** | `#59336D` | Brand identity, primary buttons, active navigation, links, focus accents |
| Deep Mauve | `#40204F` | Hover/pressed buttons, strong headings, gradient starts |
| Soft Mauve | `#74448A` | Gradient ends, decorative brand sections, large highlights |
| Cream | `#F6F0E6` | Main light-theme background, onboarding, landing sections |
| Pebble Grey | `#B9B0AA` | Neutral accents, disabled fills, subtle decorative surfaces |
| Tan | `#C6A68E` | Illustrations, service category accents, secondary visual emphasis |
| Warm Brown | `#76513E` | Secondary branding, selected headings, warm accents |
| Deep Charcoal | `#29252B` | Primary text, important labels, readable content |
| White | `#FFFFFF` | Cards, inputs, modal surfaces, text on dark mauve |

> **Color fidelity:** HEX values are practical approximations based on the supplied reference images, not pixel-perfect measurements. The main substitution is `#86649A` → `#59336D`.

### Mauve gradient

- Start: `#40204F` (Deep Mauve)
- Middle: `#59336D` (Primary Mauve)
- End: `#74448A` (Soft Mauve)
- Suggested CSS: `linear-gradient(115deg, #40204F 0%, #59336D 55%, #74448A 100%)`
- Use for landing-page hero panels, authentication branding panels, onboarding highlights, and occasional dashboard summary banners—not every card or screen.

## 1A. Tonal Variants of the Core Palette

The **Mauve** family retains its detailed 10-step scale for interactive states and gradients. Each supporting family is deliberately limited to **three colors total** (light, original/base, dark) to keep the design system practical. These are proposed design tokens rather than exact samples from the reference images.

### Mauve — full brand scale

| 50 | 100 | 200 | 300 | 400 | 500 (primary) | 600 | 700 | 800 | 900 |
|---|---|---|---|---|---|---|---|---|---|
| `#F7F1FA` | `#EDE0F2` | `#D8BFDF` | `#BC96C9` | `#9469A8` | **`#59336D`** | `#4B2A5D` | `#40204F` | `#32183F` | `#24102E` |

### Supporting colors — three shades each

| Family | Light variant | Base (original) | Dark variant | Suggested use |
|---|---|---|---|---|
| **Cream** | `#FCF9F4` | **`#F6F0E6`** | `#EBE0D0` | Backgrounds, cards, alternating sections |
| **Pebble Grey** | `#E1DBD7` | **`#B9B0AA`** | `#807771` | Borders, muted surfaces, neutral accents |
| **Tan** | `#F4E9DF` | **`#C6A68E`** | `#947159` | Category accents, illustrations, highlights |
| **Warm Brown** | `#DCC5B5` | **`#76513E`** | `#543628` | Secondary branding, headings, warm accents |

Use light shades primarily as fills and dark shades for stronger accents; check text contrast before assigning any shade to typography.

**Mauve interaction states**

| Use | Token | HEX |
|---|---|---|
| Primary CTA / selected navigation | `mauve-500` | `#59336D` |
| CTA hover | `mauve-600` | `#4B2A5D` |
| CTA pressed | `mauve-700` | `#40204F` |
| Light mauve chip / highlight | `mauve-100` | `#EDE0F2` |
| Subtle mauve page section | `mauve-50` | `#F7F1FA` |
| Dark-theme text accent | `mauve-200` | `#D8BFDF` |
| Gradient accent (reference-inspired) | `mauve-gradient-soft` | `#74448A` |

**Usage examples:** A freelancer profile badge can have a `mauve-100` background and `mauve-700` text; a primary “Post a Job” button uses `mauve-500` with white text and darkens to `mauve-600` on hover; a filter panel can use `cream-light` with `pebble-light` borders. Do not use a light mauve variant for white button text without checking contrast.

### Extended CSS tokens

```css
:root {
  --mauve-50: #F7F1FA; --mauve-100: #EDE0F2;
  --mauve-200: #D8BFDF; --mauve-300: #BC96C9;
  --mauve-400: #9469A8; --mauve-500: #59336D;
  --mauve-600: #4B2A5D; --mauve-700: #40204F;
  --mauve-800: #32183F; --mauve-900: #24102E;
  --mauve-gradient-soft: #74448A;

  --cream-light: #FCF9F4;
  --cream-base: #F6F0E6;
  --cream-dark: #EBE0D0;

  --pebble-light: #E1DBD7;
  --pebble-base: #B9B0AA;
  --pebble-dark: #807771;

  --tan-light: #F4E9DF;
  --tan-base: #C6A68E;
  --tan-dark: #947159;

  --brown-light: #DCC5B5;
  --brown-base: #76513E;
  --brown-dark: #543628;
}
```

## 2. Assigning Responsibilities to the Colors

| Color | Role in the portal |
|---|---|
| Primary Mauve | Branding, primary CTAs, active navigation, selected tabs, interactive highlights |
| Deep Mauve | Hover/pressed states, high-contrast brand surfaces |
| Soft Mauve | Gradients and restrained decorative accents |
| Cream | Main page backgrounds, onboarding, landing sections |
| Pebble Grey | Secondary surfaces, subtle borders, disabled states (with accessible text) |
| Tan | Decorative elements, category accents, illustrations |
| Warm Brown | Secondary branding, selected headings, warm contrast |
| Deep Charcoal | Body text, important labels, high-contrast typography |
| White | Cards, forms, dialogs, and text on mauve buttons |

## 3. Visual Hierarchy and Color Distribution

Use **approximately 65%** cream/white/light-neutral surfaces, **25%** grey/tan/brown support tones, and **10%** mauve emphasis on content-heavy screens. These are flexible design targets, not rigid ratios. Mauve-dominant hero or authentication panels may intentionally differ.

- **Primary emphasis:** Mauve communicates where the user should act next.
- **Secondary emphasis:** Tan and brown add warmth without competing with primary actions.
- **Reading surfaces:** Cream backgrounds and white cards keep listings, profiles, and dashboards readable.
- **Functional feedback:** Success, warning, and error colors should have their own semantics, rather than using mauve for every status.

## 4. UI Design Tokens — Light Theme

| Token | HEX | Application |
|---|---|---|
| `background` | `#F6F0E6` | App/page canvas |
| `surface` | `#FFFFFF` | Cards, dialogs, input fields |
| `surface-muted` | `#F0E9E2` | Secondary sections, table stripes |
| `primary` | `#59336D` | Main action buttons, selected navigation |
| `primary-hover` | `#40204F` | Hover and pressed emphasis |
| `primary-soft` | `#EFE6F2` | Subtle mauve badges, selected row backgrounds |
| `text-primary` | `#29252B` | Headings and body copy |
| `text-secondary` | `#76513E` | Supporting text and metadata where legible |
| `border` | `#D9D0CA` | Card/input outlines and separators |
| `neutral-accent` | `#B9B0AA` | Decorative neutrals, disabled fills |
| `warm-accent` | `#C6A68E` | Icons, illustration accents, category elements |
| `focus-ring` | `#59336D` | Visible keyboard focus outline |

## 5. UI Design Tokens — Dark Theme

Dark mode should use **dark plum and charcoal surfaces**, not simply invert cream to black. Maintain mauve as a recognizable accent while keeping reading contrast high.

| Token | HEX | Application |
|---|---|---|
| `background` | `#211C25` | App/page canvas |
| `surface` | `#302936` | Cards, menus, dialogs |
| `surface-muted` | `#3A3141` | Secondary sections |
| `primary` | `#D3A8E3` | Accessible high-contrast actions/links on dark backgrounds |
| `primary-hover` | `#E5C7EF` | Hover accent |
| `brand-deep` | `#59336D` | Brand panels and decorative elements |
| `text-primary` | `#F8F3F7` | Main copy and headings |
| `text-secondary` | `#D5C8D4` | Supporting text |
| `border` | `#584D5E` | Outlines and separators |
| `focus-ring` | `#E5C7EF` | Keyboard focus outline |

**Important:** On dark-mode light-mauve buttons (`#D3A8E3`), use dark text (`#211C25`), not white text.

## 6. Component Rules

### Buttons

| State / Type | Background | Text / Border |
|---|---|---|
| Primary | `#59336D` | White text `#FFFFFF` |
| Primary hover | `#40204F` | White text |
| Secondary | Transparent or `#FFFFFF` | Mauve text and `#59336D` border |
| Tertiary/text action | Transparent | Mauve text; underline on hover where appropriate |
| Disabled | `#E4DEDA` | `#746C72`; do not rely on color alone |
| Destructive | `#B42332` | White text |

Use one clearly dominant primary CTA per interaction group. Keep consistent button radius and adequate target size (prefer at least 44 × 44 CSS pixels for primary touch controls).

### Navigation

- **Public site:** Cream header, charcoal labels, mauve active link and signup CTA.
- **Client dashboard:** Light sidebar or white top navigation; active item receives a pale-mauve background and dark-mauve text.
- **Freelancer dashboard:** Same shared shell for visual consistency; differentiate by content, not a separate brand color.
- **Mobile:** Cream/white navigation surfaces; mauve active icons with a visible label or indicator.

### Cards, tables and listings

- White cards on cream page backgrounds.
- Use subtle `#D9D0CA` borders and restrained shadows; avoid large dark shadows.
- Titles in `#29252B`; supporting information in accessible secondary text.
- Use mauve for actionable links and selection indicators, not for all paragraphs.
- Keep service images and freelancer portfolio work visually prominent.

### Forms and authentication

- White input surfaces, dark text, neutral borders.
- Mauve focus outline with a visible 2px ring; errors use a separate red indicator and message.
- Authentication layouts may use a mauve gradient on one branding panel and cream on the form panel.
- Avoid placing long paragraphs over complex gradients unless text contrast remains reliable.

## 7. Functional Status Colors

These functional colors complement the brand palette and should not be mistaken for additional primary brand colors.

| Status | HEX | Examples |
|---|---|---|
| Success | `#166534` | Completed jobs, successful submissions, verified outcomes |
| Warning | `#92400E` | Pending reviews, approaching deadlines, attention needed |
| Error / danger | `#B42332` | Failed payments, validation errors, destructive actions |
| Informational | `#365C85` | Neutral updates and help messages |
| Neutral | `#625C65` | Draft, inactive or archived labels |

Pair every status color with a text label and, where useful, an icon. Never convey meaning through color alone. Use light-tinted status backgrounds rather than saturated full-card fills.

## 8. Application Areas

### Public landing page

- Cream base; mauve primary CTA (`Find a Freelancer`, `Offer a Service`).
- Optional mauve gradient hero or brand strip.
- White service-category and featured-freelancer cards.
- Tan/brown illustration accents; avoid overwhelming the content.

### Client dashboard

- Cream canvas, white panels for posted requests, applications, active jobs, and recent messages.
- Mauve `Post a Job` action and active navigation.
- Semantic colors for application stages, milestones, and transaction status.

### Freelancer dashboard

- Shared cream/white shell with mauve `Browse Jobs` and `Submit Proposal` actions.
- White profile, portfolio, proposal, and earnings panels.
- Clearly labeled status chips for submitted, shortlisted, active, completed, or rejected work.

### Service search and profiles

- White listing cards, charcoal text, warm-neutral metadata.
- Mauve filters only when selected; neutral filter controls otherwise.
- Mauve `Contact`, `Hire`, or `Apply` CTA; service photography remains the focal point.

### Messaging and notifications

- White/cream conversation canvas with pale-mauve selected conversation states.
- Keep message bubbles legible; avoid low-contrast mauve text on mauve backgrounds.
- Success/warning/error alerts use functional status colors.

### Administration

- Same brand palette and design tokens.
- Data-dense tables remain neutral; mauve marks selections and primary actions.
- Moderation, verification, and dispute statuses use semantic colors and explicit text.

## 9. Accessibility and Design Quality

1. Aim for **WCAG AA** text contrast: at least **4.5:1** for normal text and **3:1** for large text; interactive component boundaries and essential icons should generally achieve at least **3:1** against adjacent colors.
2. Test all real foreground/background combinations in the browser; colors here are design starting points, not a substitute for contrast testing.
3. Use white text on deep/primary mauve; do not automatically use white text on soft mauve, tan, or pebble grey.
4. Do not use pebble grey as small text on cream; reserve it mainly for neutral surfaces and decorative accents.
5. Use accessible hover, focus, selected, loading, disabled, and error states.
6. Maintain the same semantic meaning for colors across desktop, tablet, and mobile.
7. Avoid large expanses of saturated mauve in data-heavy dashboard views.

## 10. CSS Variables — Starter Implementation

```css
:root {
  --brand-mauve: #59336D;
  --brand-mauve-deep: #40204F;
  --brand-mauve-soft: #74448A;
  --brand-gradient: linear-gradient(115deg, #40204F 0%, #59336D 55%, #74448A 100%);

  --cream: #F6F0E6;
  --pebble-grey: #B9B0AA;
  --tan: #C6A68E;
  --warm-brown: #76513E;
  --charcoal: #29252B;

  --background: #F6F0E6;
  --surface: #FFFFFF;
  --surface-muted: #F0E9E2;
  --text-primary: #29252B;
  --text-secondary: #76513E;
  --border: #D9D0CA;
  --primary: #59336D;
  --primary-hover: #40204F;
  --primary-foreground: #FFFFFF;
  --focus-ring: #59336D;

  --success: #166534;
  --warning: #92400E;
  --danger: #B42332;
  --info: #365C85;
}

[data-theme="dark"] {
  --background: #211C25;
  --surface: #302936;
  --surface-muted: #3A3141;
  --text-primary: #F8F3F7;
  --text-secondary: #D5C8D4;
  --border: #584D5E;
  --primary: #D3A8E3;
  --primary-hover: #E5C7EF;
  --primary-foreground: #211C25;
  --focus-ring: #E5C7EF;
}
```

## 11. Final Design Direction

**Identity:** Deep mauve, distinctive and professional.  
**Atmosphere:** Cream-led, warm, welcoming, and readable.  
**Supporting tones:** Pebble grey, tan, and warm brown.  
**Interaction principle:** Mauve identifies primary actions; semantic status colors communicate outcomes.  
**Experience:** One coherent visual language across public pages, client and freelancer workspaces, and administration.

**Approved replacement to carry forward:** Previous mauve `#86649A` → **Primary Mauve `#59336D`**.
