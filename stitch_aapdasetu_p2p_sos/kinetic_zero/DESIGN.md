---
name: Kinetic Zero
colors:
  surface: '#121414'
  surface-dim: '#121414'
  surface-bright: '#393939'
  surface-container-lowest: '#0d0e0f'
  surface-container-low: '#1b1c1c'
  surface-container: '#1f2020'
  surface-container-high: '#292a2a'
  surface-container-highest: '#343535'
  on-surface: '#e3e2e2'
  on-surface-variant: '#c4c7c8'
  inverse-surface: '#e3e2e2'
  inverse-on-surface: '#303031'
  outline: '#8e9192'
  outline-variant: '#444748'
  surface-tint: '#c6c6c7'
  primary: '#ffffff'
  on-primary: '#2f3131'
  primary-container: '#e2e2e2'
  on-primary-container: '#636565'
  inverse-primary: '#5d5f5f'
  secondary: '#ffb4ac'
  on-secondary: '#690006'
  secondary-container: '#a90111'
  on-secondary-container: '#ffb3ab'
  tertiary: '#ffffff'
  on-tertiary: '#313030'
  tertiary-container: '#e5e2e1'
  on-tertiary-container: '#656464'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c7'
  on-primary-fixed: '#1a1c1c'
  on-primary-fixed-variant: '#454747'
  secondary-fixed: '#ffdad6'
  secondary-fixed-dim: '#ffb4ac'
  on-secondary-fixed: '#410002'
  on-secondary-fixed-variant: '#93000d'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474746'
  background: '#121414'
  on-background: '#e3e2e2'
  surface-variant: '#343535'
typography:
  headline-lg:
    fontFamily: Space Mono
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-lg-mobile:
    fontFamily: Space Mono
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Space Mono
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.2'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  data-mono:
    fontFamily: Space Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.4'
    letterSpacing: 0.05em
  label-caps:
    fontFamily: Space Mono
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: 64px
  container-gap: 32px
---

## Brand & Style
The design system adopts a "Technical Minimalism" aesthetic, heavily influenced by industrial transparency and digital reductionism. It targets a sophisticated, tech-forward audience that values clarity and raw functionality over decorative excess. 

The emotional response is one of **controlled urgency** and **clinical precision**. The UI feels like a high-end diagnostic tool: quiet when idle, but hyper-visible when critical data emerges. The style merges "Nothing Phone" aesthetics—characterized by dot-matrix textures and translucent layers—with a rigorous, grid-based Brutalism that utilizes thin borders and expansive whitespace to separate intent from information.

## Colors
The palette is strictly monochromatic to eliminate visual noise, reserving color exclusively for functional signaling.

- **Primary (White):** Used for primary text, active icons, and high-emphasis borders.
- **Surface (Pure Black #000000):** The foundational canvas for all views.
- **Secondary (SOS Red #E53935):** Reserved strictly for critical alerts, destructive actions, and active emergency states.
- **Neutral/Muted:** Various shades of grey (#1A1A1A for containers, #757575 for secondary text) to establish hierarchy.
- **Glass/Translucent:** Backgrounds utilize 40-60% opacity blacks with heavy backdrop blurs to create depth without introducing new colors.

## Typography
The system uses a dual-font strategy to balance legibility with technical character.

- **Inter** handles all long-form reading and core UI labels, ensuring maximum clarity and a "neutral" professional tone.
- **Space Mono** (acting as our dot-matrix/monospaced surrogate) is used for headers, data points, and metadata. It provides the "engineered" feel essential to the brand.
- All headers should be treated with tight letter spacing, while mono-labels should be tracked out for a "printed circuit board" look.

## Layout & Spacing
The layout follows a **Rigid Fluid Grid**. While the content expands to fill the screen, it is governed by strict 8px increments and generous margins that enforce the "minimalist" feel.

- **Desktop:** 12-column grid with 64px outer margins. Components are often center-aligned with vast whitespace on the flanks to focus the user's eye.
- **Mobile:** 4-column grid with 20px margins.
- **Philosophy:** Use "Negative Space as a Component." Do not fill empty areas; let the whitespace define the boundaries. Elements should be grouped into distinct, glassmorphic modules with consistent 32px vertical gaps.

## Elevation & Depth
Depth is achieved through material properties rather than traditional shadows.

1.  **Level 0 (Base):** Pure Black (#000000).
2.  **Level 1 (Containers):** Semi-transparent black (approx 50% opacity) with a `20px` backdrop blur and a `1px` solid border (#1A1A1A).
3.  **Level 2 (Popovers/Modals):** Same as Level 1 but with a higher contrast border (#FFFFFF at 20% opacity) to signify interaction priority.
4.  **Borders:** All interactive elements must have a thin, 1px border. Shadows are prohibited unless they are "Glow" effects used exclusively for the SOS Red state.

## Shapes
The shape language is "Soft-Industrial." While the aesthetic is sharp and technical, subtle rounding (4px-8px) is applied to containers to prevent the UI from feeling overly aggressive or dated. 

- **Small elements (Buttons, Chips):** 4px radius.
- **Large elements (Cards, Modals):** 8px radius.
- **Strictly Square:** Icon containers and decorative "dot-matrix" patterns should remain unrounded.

## Components

- **Buttons:** 
  - *Primary:* Solid White background with Black Inter text. No radius (0px) or 4px.
  - *Secondary:* Transparent background, 1px White border, White text.
  - *Critical:* Solid #E53935 background with White text.
- **Input Fields:** Minimalist underlines or 1px borders. Focus states should switch the border from #757575 to #FFFFFF. Use Space Mono for placeholder text.
- **Cards:** Use the Level 1 Glassmorphism (blur + semi-transparent black). Titles should be in Space Mono, body in Inter.
- **Chips/Status:** Small rectangular tags with 1px borders. Use dot-matrix icons (simple squares or crosses) next to the text.
- **Progress Indicators:** Linear, thin 2px bars. For critical "Kinetic" responses, use a pulsing Red animation.
- **Iconography:** Strictly geometric (2px stroke width). No fills. Icons should look like technical schematics.