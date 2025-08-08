# 🎨 Nebula UI Design System

## Table of Contents

1. [Overview](#overview)
2. [Design Philosophy](#design-philosophy)
3. [Design Tokens](#design-tokens)
4. [Components](#components)
5. [Usage Guidelines](#usage-guidelines)
6. [Implementation Guide](#implementation-guide)
7. [Accessibility](#accessibility)
8. [Maintenance](#maintenance)

## Overview

The Nebula UI Design System provides a comprehensive set of design guidelines, components, and patterns for building consistent, modern, and accessible user interfaces in the Zwift Workout Visualizer. This system emphasizes minimal aesthetics, angular design patterns, and power-user focused efficiency.

### Key Principles
- **Minimal & Angular**: Clean, geometric design with minimal border radii
- **Power-User Focused**: Efficient use of screen space with compact layouts
- **Consistency**: Systematic approach to spacing, typography, and interactions
- **Accessibility**: WCAG 2.1 AA compliance with reduced motion support
- **Performance**: Optimized animations and transitions (100-200ms)

## Design Philosophy

### Angular Design Language
Nebula UI follows an angular design philosophy with geometric precision:
- **Maximum border radius: 4px** for buttons and cards
- **2px radius** for inputs and form elements  
- **1px radius** for progress bars and minimal elements
- **Sharp, clean edges** that prioritize function over decoration

### 8px Grid System
All spacing follows a base 8px grid system:
- Base unit: `8px`
- Common values: `8px`, `16px`, `24px`, `32px`, `48px`, `64px`
- Consistent vertical rhythm and horizontal spacing

### Power-User Optimization
- **Dense layouts** for maximum information efficiency
- **Snappy interactions** with 100-200ms animation timing
- **Subtle feedback** that enhances without distracting
- **Keyboard navigation** support throughout

## Design Tokens

### Color System

#### Semantic Color Tokens
```css
/* Primary Brand Colors */
--primary: 214 63% 34%;           /* Main brand blue */
--primary-foreground: 225 25% 91%; /* Text on primary */

/* Surface Colors */
--background: 240 8% 9%;          /* Main background */
--foreground: 225 25% 91%;        /* Main text */
--card: 230 20% 16%;              /* Card backgrounds */
--card-foreground: 225 25% 91%;   /* Text on cards */

/* Interactive States */
--muted: 228 25% 27%;             /* Disabled/muted elements */
--muted-foreground: 223 14% 69%;  /* Muted text */
--accent: 214 63% 34%;            /* Accent elements */
--border: 228 25% 27%;            /* Border colors */
--ring: 214 63% 34%;              /* Focus rings */
```

#### Status Colors
```css
--destructive: 0 84.2% 60.2%;     /* Error/danger */
--destructive-foreground: 225 25% 91%;
```

#### Usage Guidelines
- Use HSL format for all color tokens
- Always pair colors with appropriate foreground colors
- Test color contrast ratios (minimum 4.5:1 for normal text)
- Use semantic naming rather than literal color names

### Typography System

#### Font Stack
```css
--font-family-primary: 'Inter', 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
```

#### Type Scale
```css
--text-h1: 24px;    /* Major headings */
--text-h2: 20px;    /* Section headings */
--text-h3: 16px;    /* Subsection headings */
--text-body: 14px;  /* Body text */
--text-small: 12px; /* Caption/helper text */
```

#### Line Heights
```css
--line-height-tight: 1.4;    /* Headings */
--line-height-normal: 1.5;   /* Body text */
--line-height-relaxed: 1.6;  /* Long-form content */
```

#### Letter Spacing
```css
--letter-spacing-normal: 0;      /* Default */
--letter-spacing-tight: -0.02em; /* Tight spacing for UI */
```

### Spacing System

#### Base Grid
- **Base unit**: 8px
- **Scale**: `0.5`, `1`, `1.5`, `2`, `3`, `4`, `6`, `8`, `12`, `16`, `20`, `24`
- **Pixel values**: `4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`, `64px`, `96px`, `128px`, `160px`, `192px`

#### Common Patterns
- **Card padding**: `16px` (p-4)
- **Button padding**: `12px 24px` (px-3 py-1.5)
- **Section spacing**: `24px` (space-y-6)
- **Component gaps**: `16px` (gap-4)

### Border Radius System

#### Angular Design Values
```css
--radius: 0.5rem; /* Base radius - rarely used directly */
```

#### Component-Specific Radii
- **Buttons**: `4px` - Maximum radius for primary interactive elements
- **Cards**: `4px` - Consistent with button styling
- **Inputs**: `2px` - Subtle rounding for form fields
- **Badges**: `2px` - Minimal radius for text badges
- **Progress bars**: `1px` - Nearly sharp edges for linear elements

### Shadow System

#### Glass Morphism
```css
--glass-bg: rgba(18, 19, 23, 0.4);
--glass-border: rgba(51, 58, 86, 0.3);
--glass-shadow: 0 8px 32px 0 rgba(18, 19, 23, 0.37);
```

#### Component Shadows
- **Cards**: `0 6px 16px 0 rgba(0, 0, 0, 0.08)`
- **Buttons**: `0 4px 12px 0 rgba(0, 0, 0, 0.1)`
- **Hovers**: Subtle elevation with soft shadows

### Animation Tokens

#### Duration
```css
--animation-duration: 0.15s;     /* Base duration */
--animation-easing: cubic-bezier(0.4, 0, 0.2, 1); /* Smooth easing */
```

#### Timing Guidelines
- **Instant feedback**: `0.1s` - Button presses, focus states
- **UI transitions**: `0.15s` - Standard component transitions
- **Layout changes**: `0.2s` - Panel animations, state changes
- **Maximum duration**: `0.2s` - Never exceed for UI interactions

## Components

### Buttons

#### Primary Button (.btn-modern)
```css
.btn-modern {
    @apply inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium;
    @apply transition-all duration-200;
    background: var(--gradient-primary);
    color: hsl(var(--primary-foreground));
    border-radius: 4px; /* Angular design - max 4px for buttons */
    box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.05);
}

.btn-modern:hover {
    transform: translateY(-0.5px);
    box-shadow: 0 4px 12px 0 rgba(0, 0, 0, 0.1);
}
```

#### Button Variants
- **`.btn-modern`**: Primary action button with gradient background
- **`.btn-outline`**: Secondary button with border styling
- **`.btn-ghost`**: Minimal button for tertiary actions
- **`.btn-secondary`**: Alternative button styling

#### Usage Guidelines
- Use primary buttons for main actions (1 per page/section)
- Secondary buttons for alternative actions
- Ghost buttons for less important actions
- Maintain consistent padding and height across variants

### Cards

#### Modern Card (.card-modern)
```css
.card-modern {
    @apply border bg-card text-card-foreground shadow-sm;
    border-radius: 4px; /* Angular design - 4px for cards */
    background: hsl(var(--card));
    transition: all var(--animation-duration) var(--animation-easing);
}

.card-modern:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px 0 rgba(0, 0, 0, 0.08);
}
```

#### Glass Card (.card-glass)
```css
.card-glass {
    @apply border bg-card/95 backdrop-blur-sm text-card-foreground shadow-sm;
    border-radius: 4px;
    transition: all var(--animation-duration) var(--animation-easing);
}
```

#### Usage Guidelines
- Use `.card-modern` for primary content containers
- Use `.card-glass` for overlays and modal content
- Maintain consistent padding (`p-4` for dense layouts, `p-6` for spacious)
- Ensure proper contrast ratios for text on card backgrounds

### Form Elements

#### Modern Input (.input-modern)
```css
.input-modern {
    @apply flex h-9 w-full border border-input bg-background px-2.5 py-1.5 text-sm;
    @apply ring-offset-background placeholder:text-muted-foreground;
    @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring;
    border-radius: 2px; /* Angular design - 2px for inputs */
    transition: all var(--animation-duration) var(--animation-easing);
}
```

#### Form Guidelines
- Use consistent height (`h-9`) for form elements
- Maintain 2px border radius for subtle rounding
- Ensure focus states are clearly visible
- Provide placeholder text for context

### Badges

#### Modern Badge (.badge-modern)
```css
.badge-modern {
    @apply inline-flex items-center px-2.5 py-0.5 text-xs font-semibold;
    @apply transition-colors focus:outline-none focus:ring-2 focus-ring-offset-2;
    background: hsl(var(--accent));
    color: hsl(var(--accent-foreground));
    border: 1px solid hsl(var(--border));
    border-radius: 2px; /* Angular design - minimal radius for badges */
}
```

#### Badge Variants
- **`.badge-success`**: Green for positive states
- **`.badge-warning`**: Yellow for caution states  
- **`.badge-error`**: Red for error states

### Progress Indicators

#### Modern Progress Bar
```css
.progress-modern {
    @apply relative h-2 w-full overflow-hidden bg-secondary;
    border-radius: 1px; /* Angular design - minimal radius */
}

.progress-modern .progress-bar {
    @apply h-full transition-all duration-200 ease-out;
    background: var(--gradient-primary);
    box-shadow: 0 0 4px hsl(var(--primary) / 0.15);
}
```

#### Loading Spinner
- **Size**: 32px (reduced from 40px for subtlety)
- **Animation**: 0.8s linear infinite
- **Style**: Minimal border thickness (3px)

## Usage Guidelines

### Do's and Don'ts

#### ✅ Do
- **Maintain angular design** with consistent border radii
- **Use semantic color tokens** instead of hardcoded colors
- **Follow 8px grid system** for all spacing decisions
- **Implement hover states** for interactive elements
- **Test accessibility** including reduced motion preferences
- **Keep animations snappy** (100-200ms range)
- **Use consistent typography** with the defined scale

#### ❌ Don't
- **Mix border radius values** - stick to the defined system (4px, 2px, 1px)
- **Use custom colors** - always use design tokens
- **Ignore spacing system** - avoid arbitrary margins/padding
- **Create heavy animations** - keep transitions subtle
- **Skip accessibility testing** - ensure keyboard navigation works
- **Overcomplicate layouts** - prioritize information density
- **Use inconsistent component patterns** - follow established conventions

### Common Patterns

#### Page Layout
```html
<section class="py-6 px-4">
    <div class="container mx-auto max-w-7xl space-y-6">
        <!-- Content with consistent spacing -->
    </div>
</section>
```

#### Card Grid
```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <div class="card-modern p-4">
        <!-- Card content -->
    </div>
</div>
```

#### Form Layout
```html
<div class="space-y-4">
    <div>
        <label class="text-sm font-medium">Label</label>
        <input type="text" class="input-modern" placeholder="Enter value">
    </div>
</div>
```

## Implementation Guide

### CSS Class Naming Conventions

#### Component Classes
- **Primary components**: `.component-modern` (e.g., `.btn-modern`, `.card-modern`)
- **Variants**: `.component-variant` (e.g., `.btn-outline`, `.card-glass`)
- **States**: `.component-state` (e.g., `.btn-loading`, `.card-elevated`)

#### Utility Classes
- **Spacing**: Use Tailwind spacing classes (`p-4`, `m-6`, `space-y-4`)
- **Colors**: Use semantic color utilities (`text-foreground`, `bg-card`)
- **Typography**: Use design system classes (`text-sm`, `font-medium`)

### Theme Integration

#### CSS Custom Properties
All design tokens are defined as CSS custom properties in `:root`:
```css
:root {
    --primary: 214 63% 34%;
    --background: 240 8% 9%;
    /* ... other tokens */
}
```

#### Tailwind Integration
Colors are configured in Tailwind config to use CSS custom properties:
```javascript
colors: {
    primary: {
        DEFAULT: "hsl(var(--primary))",
        foreground: "hsl(var(--primary-foreground))"
    }
}
```

#### Dark Mode Support
The system is built with dark mode as default. Light mode can be implemented by overriding CSS custom properties in a `.light` class.

### Component Development Workflow

#### 1. Design Token Usage
- Always use CSS custom properties for colors, spacing, and typography
- Reference the design system before creating new tokens
- Test with existing components to ensure consistency

#### 2. Component Creation
- Follow established naming conventions
- Implement hover states and focus management
- Include proper accessibility attributes
- Test with keyboard navigation

#### 3. Documentation Updates
- Update component examples in this document
- Add new patterns to usage guidelines
- Include accessibility considerations

## Accessibility

### Focus Management
All interactive elements include proper focus states:
```css
button:focus-visible,
input:focus-visible,
select:focus-visible {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
}
```

### Reduced Motion Support
Comprehensive `prefers-reduced-motion` implementation:
```css
@media (prefers-reduced-motion: reduce) {
    /* Disable decorative animations */
    .fade-in, .slideUp, .scaleIn {
        animation: none !important;
        opacity: 1 !important;
        transform: none !important;
    }
    
    /* Disable hover transforms */
    .btn-modern:hover,
    .card-modern:hover {
        transform: none !important;
    }
    
    /* Maintain essential focus transitions */
    button:focus-visible,
    input:focus-visible {
        transition: box-shadow 0.15s ease !important;
    }
}
```

### Color Contrast
- **Normal text**: Minimum 4.5:1 contrast ratio
- **Large text**: Minimum 3:1 contrast ratio  
- **Interactive elements**: Clear visual focus indicators
- **Status indicators**: Don't rely solely on color

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Logical tab order throughout the interface
- Clear focus indicators for all focusable elements
- Skip links for screen reader users

## Maintenance

### Design System Evolution

#### Version Control
- Document changes to design tokens
- Maintain backwards compatibility when possible
- Communicate breaking changes clearly
- Use semantic versioning for major updates

#### Review Process
1. **Design Review**: Evaluate new patterns against system principles
2. **Technical Review**: Ensure implementation follows guidelines
3. **Accessibility Review**: Test for WCAG compliance
4. **Documentation**: Update relevant documentation

#### Component Lifecycle
- **Proposal**: New component need identified
- **Design**: Create within system constraints
- **Implementation**: Follow development workflow
- **Testing**: Accessibility and browser testing
- **Documentation**: Add to system documentation
- **Adoption**: Rollout across application

### Consistency Checks

#### Regular Audits
- Review component usage across application
- Identify inconsistencies and deviation
- Plan remediation for outdated patterns
- Update documentation with new patterns

#### Tooling
- Use design tokens for consistency
- Implement linting rules for CSS patterns
- Automated testing for accessibility
- Visual regression testing for components

### Community Guidelines

#### Contributing
- Follow established patterns and conventions
- Test thoroughly across browsers and devices
- Document changes and provide examples
- Consider accessibility implications

#### Communication
- Discuss major changes with team
- Provide migration guides for breaking changes
- Share learnings and best practices
- Maintain open feedback channels

---

## Getting Started

To start using the Nebula UI Design System:

1. **Review this documentation** thoroughly
2. **Examine existing implementations** in `styles.css` and `index-modern.html`
3. **Follow the component patterns** outlined above
4. **Test accessibility** including keyboard navigation and reduced motion
5. **Maintain consistency** with established tokens and conventions

For questions or contributions to the design system, please refer to the maintenance guidelines above.

---

*Last updated: [Current Date] | Version: 1.0 | Maintained by: Development Team*