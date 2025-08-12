# 🔄 Nebula UI Migration Guide

This guide helps migrate existing components and patterns to align with the Nebula UI design system.

## Migration Overview

### Why Migrate?

- **Consistency**: Unified visual language across the application
- **Maintainability**: Centralized design tokens and patterns
- **Accessibility**: Built-in accessibility features
- **Performance**: Optimized animations and interactions

### Migration Strategy

1. **Audit existing components** - Identify patterns that need updating
2. **Prioritize by impact** - Focus on high-visibility components first
3. **Migrate incrementally** - Update components systematically
4. **Test thoroughly** - Ensure functionality is preserved
5. **Document changes** - Keep track of what was updated

## Component Migration Patterns

### Buttons

#### Before (Legacy)

```html
<!-- Old button styles -->
<button
  class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
>
  Submit
</button>

<button
  class="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg"
>
  Cancel
</button>
```

#### After (Nebula UI)

```html
<!-- Nebula UI button styles -->
<button class="btn-modern">Submit</button>

<button class="btn-outline">Cancel</button>
```

#### Migration Steps

1. Replace hardcoded colors with semantic classes
2. Update border radius to angular design (4px max)
3. Ensure consistent padding and height
4. Add proper hover and focus states
5. Test keyboard navigation

### Cards

#### Before (Legacy)

```html
<!-- Old card styles with custom CSS -->
<div class="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
  <h3 class="text-xl font-bold text-gray-900 mb-4">Card Title</h3>
  <p class="text-gray-600">Card content goes here.</p>
</div>

<style>
  .custom-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    border-radius: 15px;
  }
</style>
```

#### After (Nebula UI)

```html
<!-- Nebula UI card -->
<div class="card-modern p-4">
  <h3 class="text-lg font-semibold text-foreground mb-4">Card Title</h3>
  <p class="text-muted-foreground">Card content goes here.</p>
</div>
```

#### Migration Steps

1. Replace custom CSS with design system classes
2. Update border radius to 4px (angular design)
3. Use semantic color tokens
4. Adjust padding for consistency (p-4 for dense layouts)
5. Remove heavy shadows and effects

### Forms

#### Before (Legacy)

```html
<!-- Old form styles -->
<div class="mb-4">
  <label class="block text-gray-700 text-sm font-bold mb-2"> Username </label>
  <input
    class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
    type="text"
  />
</div>
```

#### After (Nebula UI)

```html
<!-- Nebula UI form -->
<div class="space-y-2">
  <label class="text-sm font-medium text-foreground"> Username </label>
  <input type="text" class="input-modern" />
</div>
```

#### Migration Steps

1. Update spacing to use space-y-\* utilities
2. Replace hardcoded colors with design tokens
3. Use input-modern class for consistent styling
4. Ensure proper focus management
5. Add proper labeling for accessibility

## Color Migration

### Color Token Mapping

#### Legacy → Nebula UI

```css
/* OLD: Hardcoded colors */
.text-gray-900    → .text-foreground
.text-gray-600    → .text-muted-foreground
.text-white       → .text-primary-foreground (context-dependent)
.bg-white         → .bg-background or .bg-card
.bg-gray-100      → .bg-muted
.bg-blue-500      → .bg-primary
.border-gray-300  → .border-border

/* OLD: Custom CSS colors */
color: #374151;      → color: hsl(var(--foreground));
background: #1f2937; → background: hsl(var(--card));
border: #d1d5db;     → border-color: hsl(var(--border));
```

### Migration Script Example

```javascript
// Helper function to migrate color classes
function migrateColorClasses(html) {
  return html
    .replace(/text-gray-900/g, 'text-foreground')
    .replace(/text-gray-600/g, 'text-muted-foreground')
    .replace(/bg-white/g, 'bg-background')
    .replace(/bg-gray-100/g, 'bg-muted')
    .replace(/bg-blue-500/g, 'bg-primary')
    .replace(/border-gray-300/g, 'border-border');
}
```

## Spacing Migration

### Legacy Spacing → 8px Grid

#### Before (Legacy)

```html
<!-- Inconsistent spacing -->
<div class="p-3 m-5 space-y-3">
  <div class="mb-7">
    <h3 class="mb-2">Title</h3>
    <p class="mt-1">Description</p>
  </div>
</div>
```

#### After (Nebula UI)

```html
<!-- Consistent 8px grid spacing -->
<div class="p-4 m-6 space-y-4">
  <div class="mb-6">
    <h3 class="mb-2">Title</h3>
    <p class="mt-2">Description</p>
  </div>
</div>
```

#### Spacing Conversion Table

```
Legacy → Nebula UI (8px grid)
p-1 (4px)  → p-1 (4px)   ✅
p-2 (8px)  → p-2 (8px)   ✅
p-3 (12px) → p-4 (16px)  📝 Round up
p-5 (20px) → p-6 (24px)  📝 Round up
p-7 (28px) → p-8 (32px)  📝 Round up
```

## Border Radius Migration

### Angular Design System

#### Before (Legacy)

```css
/* Various radius values */
border-radius: 0.5rem; /* 8px - too round */
border-radius: 0.75rem; /* 12px - too round */
border-radius: 1rem; /* 16px - too round */
border-radius: 9999px; /* Pills - not angular */
```

#### After (Nebula UI)

```css
/* Angular design values */
border-radius: 4px; /* For buttons and cards */
border-radius: 2px; /* For inputs and form elements */
border-radius: 1px; /* For progress bars and minimal elements */
```

#### Migration Rules

- **Buttons/Cards**: Maximum 4px radius
- **Inputs/Forms**: 2px radius for subtle rounding
- **Progress bars**: 1px radius for minimal elements
- **No pill shapes**: Avoid rounded-full except for avatars

## Animation Migration

### Performance-Optimized Animations

#### Before (Legacy)

```css
/* Heavy, slow animations */
.legacy-card {
  transition: all 0.5s ease-in-out;
}

.legacy-card:hover {
  transform: scale(1.1) rotate(2deg);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
  filter: brightness(1.2) saturate(1.3);
}
```

#### After (Nebula UI)

```css
/* Subtle, snappy animations */
.nebula-card {
  transition: all var(--animation-duration) var(--animation-easing);
}

.nebula-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px 0 rgba(0, 0, 0, 0.08);
}
```

#### Migration Guidelines

- **Duration**: Reduce to 100-200ms range
- **Effects**: Use subtle transforms (translateY, small scale)
- **Properties**: Animate transform and opacity for performance
- **Easing**: Use consistent easing function

## Accessibility Migration

### Focus States

#### Before (Legacy)

```css
/* Poor or missing focus states */
.button:focus {
  outline: none; /* ❌ Removes accessibility */
}

.input:focus {
  box-shadow: 0 0 5px blue; /* ❌ Non-standard */
}
```

#### After (Nebula UI)

```css
/* Proper focus management */
.btn-modern:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}

.input-modern:focus-visible {
  outline: none;
  ring: 2px solid hsl(var(--ring));
  ring-offset: 2px;
}
```

### Semantic HTML

#### Before (Legacy)

```html
<!-- Non-semantic structure -->
<div class="header">
  <div class="title">Page Title</div>
  <div class="nav">
    <div onclick="navigate()">Home</div>
    <div onclick="navigate()">About</div>
  </div>
</div>
```

#### After (Nebula UI)

```html
<!-- Semantic structure -->
<header>
  <h1 class="text-2xl font-bold">Page Title</h1>
  <nav>
    <button class="btn-ghost" onclick="navigate()">Home</button>
    <button class="btn-ghost" onclick="navigate()">About</button>
  </nav>
</header>
```

## Systematic Migration Process

### Phase 1: Audit and Plan

1. **Inventory components** - List all UI components
2. **Categorize by complexity** - Simple, moderate, complex
3. **Identify dependencies** - What components depend on others
4. **Create migration priority** - High-impact components first

### Phase 2: Migrate Core Components

1. **Design tokens** - Update color and spacing variables
2. **Base components** - Buttons, inputs, cards
3. **Layout components** - Navigation, containers
4. **Test thoroughly** - Ensure no regressions

### Phase 3: Update Advanced Components

1. **Complex components** - Charts, tables, forms
2. **Interactive elements** - Modals, dropdowns, tooltips
3. **Animation updates** - Reduce durations, optimize
4. **Accessibility audit** - Test with screen readers

### Phase 4: Polish and Optimize

1. **Performance review** - Check animation performance
2. **Consistency audit** - Ensure uniform application
3. **Documentation updates** - Update component docs
4. **Team training** - Educate team on new patterns

## Migration Checklist

### Component Migration Checklist

- [ ] Colors use design tokens (no hardcoded values)
- [ ] Spacing follows 8px grid system
- [ ] Border radius follows angular design (4px, 2px, 1px)
- [ ] Typography uses defined scale
- [ ] Animations are optimized (100-200ms)
- [ ] Hover states are subtle and consistent
- [ ] Focus states are accessible
- [ ] Component follows naming conventions
- [ ] Responsive behavior is maintained
- [ ] Accessibility is preserved or improved

### Testing Checklist

- [ ] Visual appearance matches design system
- [ ] Interactive states work correctly
- [ ] Keyboard navigation functions properly
- [ ] Screen reader compatibility maintained
- [ ] Performance is not degraded
- [ ] Cross-browser compatibility verified
- [ ] Mobile responsiveness confirmed

## Common Migration Pitfalls

### ❌ Avoid These Mistakes

1. **Partial migrations** - Don't leave mixed old/new patterns
2. **Breaking accessibility** - Always test keyboard navigation
3. **Performance regressions** - Monitor animation performance
4. **Color contrast issues** - Test all color combinations
5. **Inconsistent spacing** - Stick to the 8px grid system
6. **Ignoring mobile** - Test responsive behavior thoroughly

### 🔧 Troubleshooting Common Issues

#### Colors Look Wrong

```css
/* Problem: Using wrong color tokens */
color: hsl(var(--primary)); /* Might not work in all contexts */

/* Solution: Use appropriate semantic color */
color: hsl(var(--foreground)); /* For body text */
color: hsl(var(--muted-foreground)); /* For secondary text */
```

#### Spacing Feels Off

```html
<!-- Problem: Non-grid spacing -->
<div class="p-3 m-5 space-y-3">
  <!-- Solution: Grid-aligned spacing -->
  <div class="p-4 m-6 space-y-4"></div>
</div>
```

#### Animations Are Janky

```css
/* Problem: Animating expensive properties */
transition:
  height 0.3s,
  width 0.3s,
  background-color 0.3s;

/* Solution: Animate transform and opacity */
transition:
  transform 0.15s ease,
  opacity 0.15s ease;
```

## Validation Tools

### CSS Audit Script

```javascript
// Check for non-design-system colors
function auditColors(css) {
  const hardcodedColors = css.match(/#[0-9a-f]{3,6}|rgb\(|rgba\(/gi);
  if (hardcodedColors) {
    console.warn('Found hardcoded colors:', hardcodedColors);
  }
}

// Check for non-grid spacing
function auditSpacing(html) {
  const nonGridClasses = html.match(/[pm]-[357]/g);
  if (nonGridClasses) {
    console.warn('Found non-grid spacing:', nonGridClasses);
  }
}
```

### Manual Testing Checklist

1. Compare with design system examples
2. Test all interactive states
3. Verify keyboard navigation
4. Check mobile responsive behavior
5. Test with reduced motion preferences
6. Validate color contrast ratios

## Getting Help with Migration

### Resources

- **DESIGN_SYSTEM.md** - Reference for all design tokens and patterns
- **component-examples.md** - See correct implementations
- **implementation-guide.md** - Step-by-step development guide

### Review Process

1. **Self-review** - Use the checklists above
2. **Peer review** - Have another developer check your work
3. **Design review** - Ensure visual consistency
4. **Accessibility review** - Test with assistive technologies

---

This migration guide should help you systematically update existing components to follow Nebula UI design patterns while maintaining functionality and improving consistency.
