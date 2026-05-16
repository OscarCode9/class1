---
name: Executive Precision
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#434655'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#00569c'
  on-tertiary: '#ffffff'
  tertiary-container: '#196fc0'
  on-tertiary-container: '#ebf1ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#d4e3ff'
  tertiary-fixed-dim: '#a4c9ff'
  on-tertiary-fixed: '#001c39'
  on-tertiary-fixed-variant: '#004883'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  sidebar-width: 280px
  container-max-width: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
---

## Brand & Style

The brand personality of the design system is rooted in executive efficiency, clarity, and quiet confidence. Designed for high-stakes task management, the UI avoids unnecessary decoration in favor of structural integrity and functional elegance. It targets professionals who require a workspace that feels both authoritative and frictionless.

The design style is a blend of **Corporate Modern** and **Minimalism**. It utilizes a systematic approach to whitespace and information density, ensuring that even complex project views remain legible. The emotional response is one of organized calm—moving the user from the chaos of a long to-do list to the structured satisfaction of progress. High-contrast transitions between the navigation and content areas are used to delineate work zones clearly.

## Colors

The color palette is architected to provide a distinct "Command Center" feel. 

- **Primary (#2563EB):** Used for primary actions and indicative of focus.
- **Dark Sections (#0F172A):** Reserved for high-level navigation, such as the sidebar or global header. This creates a strong "anchor" for the eyes, separating navigation from the working canvas.
- **Background (#F8FAFC):** A cool-toned white that reduces eye strain during long working sessions.
- **Accent (#60A5FA):** Used sparingly for secondary interactive elements or status indicators that require visibility without the weight of the primary blue.
- **Secondary Text (#64748B) & Border (#CBD5E1):** These define the skeleton of the interface, providing enough contrast for accessibility while allowing the primary content to take center stage.

## Typography

This design system utilizes **Hanken Grotesk** across all roles to maintain a cohesive, sharp, and contemporary feel. The typeface’s precise geometry makes it exceptionally readable in data-heavy environments like task lists and calendars.

- **Headlines:** Use a semi-bold weight (600) with slight negative letter spacing to create a compact, professional appearance.
- **Body Text:** Standardized on a 16px base for optimal legibility. Use the "Gris azulado" (#64748B) for secondary body text to establish hierarchy.
- **Labels:** Uppercase styles should be applied to `label-md` for metadata (like dates or category tags) to differentiate them from actionable text.

## Layout & Spacing

The layout follows a **Fixed Sidebar + Fluid Content** model. The sidebar acts as the primary navigational anchor, while the main content area utilizes a 12-column grid system for internal dashboard layouts.

- **Sidebar:** Fixed at 280px. Background set to the "Azul profundo" (#0F172A) to separate navigation from the workspace.
- **Grid:** On desktop, use 24px gutters. Content cards should span columns (e.g., 4 columns for small widgets, 6 for medium, 12 for full task lists).
- **Rhythm:** A base-8 vertical rhythm is strictly enforced. Elements should be spaced in multiples of 8px (8, 16, 24, 32) to ensure mathematical harmony across the interface.
- **Adaptive Strategy:** On mobile, the sidebar collapses into a hamburger menu or bottom navigation bar, and margins reduce to 16px.

## Elevation & Depth

Hierarchy is achieved through a combination of **Tonal Layering** and **Ambient Shadows**. This design system avoids heavy drop shadows in favor of a "lifted" appearance that feels integrated with the surface.

- **Level 0 (Floor):** Background (#F8FAFC).
- **Level 1 (Cards):** White (#FFFFFF) surfaces with a very soft, diffused shadow: `0px 4px 12px rgba(15, 23, 42, 0.05)`. Used for task items and widgets.
- **Level 2 (Modals/Popovers):** White (#FFFFFF) with a more pronounced shadow: `0px 12px 32px rgba(15, 23, 42, 0.12)`.
- **Borders:** Subtle `1px` borders using #CBD5E1 are used to define boundaries on flat elements (like table rows or input fields) where shadow elevation isn't required.

## Shapes

The shape language is approachable yet structured. We use **Rounded (Level 2)** settings to provide a professional softness that mitigates the clinical feel of a productivity app.

- **Components:** Buttons, input fields, and small cards use a **12px (0.75rem)** radius.
- **Large Containers:** Dashboard cards and modal windows use a **16px (1rem)** radius for a distinct, modern look.
- **Selection Indicators:** Small active states (like a pill indicator in the sidebar) may use fully rounded (pill) shapes to distinguish them from functional components.

## Components

### Buttons
- **Primary:** Background #2563EB, white text, 12px radius. Subtle hover state: #1D4ED8.
- **Ghost:** Transparent background, #2563EB text, borderless. Used for secondary actions in a list.

### Cards
- Always white (#FFFFFF) background. 16px padding. 16px corner radius. Used to house task details, project summaries, and charts.

### Input Fields
- White background with #CBD5E1 border. 12px radius. On focus, the border changes to #2563EB with a 2px blue glow. Use #64748B for placeholder text.

### Task List Items
- Horizontal layout, #CBD5E1 bottom border. Hover state should include a subtle background shift to #F1F5F9. Checkboxes are circular to contrast with the angularity of the grid.

### Sidebar Navigation
- Background: #0F172A. Text: #CBD5E1 (Inactive), #FFFFFF (Active). Active items should feature a vertical primary blue strip on the left edge or a subtle high-contrast background highlight.

### Chips/Badges
- Small 12px text. Use the Accent color (#60A5FA) with 10% opacity as a background and the Primary Blue (#2563EB) as the text for high-readability status markers.