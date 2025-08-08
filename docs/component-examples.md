# 🧩 Nebula UI Component Examples

This document provides practical examples of how to implement and use Nebula UI components correctly.

## Buttons

### Primary Actions
```html
<!-- ✅ Do: Primary action button -->
<button class="btn-modern">
    Upload Workout
</button>

<!-- ✅ Do: Button with icon -->
<button class="btn-modern inline-flex items-center space-x-2">
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
    </svg>
    <span>Add New</span>
</button>

<!-- ❌ Don't: Multiple primary buttons in same context -->
<div class="flex space-x-4">
    <button class="btn-modern">Save</button>     <!-- Too many primary actions -->
    <button class="btn-modern">Publish</button>  <!-- Use btn-outline instead -->
</div>

<!-- ✅ Do: One primary, others secondary -->
<div class="flex space-x-4">
    <button class="btn-modern">Save</button>
    <button class="btn-outline">Cancel</button>
</div>
```

### Secondary Actions
```html
<!-- ✅ Do: Secondary action button -->
<button class="btn-outline border border-input bg-background hover:bg-accent hover:text-accent-foreground">
    Try Sample
</button>

<!-- ✅ Do: Ghost button for tertiary actions -->
<button class="btn-ghost hover:bg-accent hover:text-accent-foreground">
    Learn More
</button>
```

### Button States
```html
<!-- Loading state -->
<button class="btn-modern btn-loading" disabled>
    Loading...
</button>

<!-- Disabled state -->
<button class="btn-modern" disabled>
    Disabled Action
</button>
```

## Cards

### Basic Card Layout
```html
<!-- ✅ Do: Standard card with consistent padding -->
<div class="card-modern p-4">
    <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-foreground">Power Profile</h3>
        <span class="badge-modern">Active</span>
    </div>
    <p class="text-muted-foreground">Interactive workout visualization</p>
</div>

<!-- ❌ Don't: Inconsistent padding -->
<div class="card-modern p-2 pt-6 pb-8">  <!-- Avoid mixed padding values -->
    <h3>Inconsistent Card</h3>
</div>

<!-- ✅ Do: Consistent padding system -->
<div class="card-modern p-4">  <!-- Standard padding -->
    <h3>Consistent Card</h3>
</div>
```

### Glass Card for Overlays
```html
<!-- ✅ Do: Glass card for modal content -->
<div class="card-glass p-4 max-w-md w-full">
    <h2 class="text-lg font-semibold mb-4">Upload Options</h2>
    <div class="space-y-4">
        <!-- Form content -->
    </div>
</div>
```

### Card Grid Layouts
```html
<!-- ✅ Do: Responsive grid with consistent gaps -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <div class="card-modern p-4">
        <h3 class="text-lg font-semibold mb-2">Workout Stats</h3>
        <p class="text-muted-foreground">View detailed metrics</p>
    </div>
    <div class="card-modern p-4">
        <h3 class="text-lg font-semibold mb-2">Zone Analysis</h3>
        <p class="text-muted-foreground">Power zone distribution</p>
    </div>
    <div class="card-modern p-4">
        <h3 class="text-lg font-semibold mb-2">Export Options</h3>
        <p class="text-muted-foreground">Download in multiple formats</p>
    </div>
</div>
```

## Forms

### Input Fields
```html
<!-- ✅ Do: Proper input with label -->
<div class="space-y-2">
    <label for="ftp-input" class="text-sm font-medium text-foreground">
        FTP Value
    </label>
    <input 
        id="ftp-input"
        type="number" 
        class="input-modern" 
        placeholder="Enter your FTP"
        min="100" 
        max="500"
    >
</div>

<!-- ❌ Don't: Input without label -->
<input type="text" class="input-modern" placeholder="What field is this?">

<!-- ✅ Do: Input with helper text -->
<div class="space-y-2">
    <label for="power-input" class="text-sm font-medium">Power Threshold</label>
    <input id="power-input" type="number" class="input-modern" value="250">
    <p class="text-xs text-muted-foreground">Your Functional Threshold Power in watts</p>
</div>
```

### Form Layout
```html
<!-- ✅ Do: Consistent form spacing -->
<form class="space-y-4">
    <div class="space-y-2">
        <label for="workout-name" class="text-sm font-medium">Workout Name</label>
        <input id="workout-name" type="text" class="input-modern" placeholder="Enter workout name">
    </div>
    
    <div class="space-y-2">
        <label for="description" class="text-sm font-medium">Description</label>
        <textarea id="description" class="input-modern min-h-[80px]" placeholder="Workout description"></textarea>
    </div>
    
    <div class="flex space-x-3">
        <button type="submit" class="btn-modern">Save Workout</button>
        <button type="button" class="btn-outline">Cancel</button>
    </div>
</form>
```

## Navigation

### Top Navigation
```html
<!-- ✅ Do: Compact navigation with proper spacing -->
<nav class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
    <div class="container flex h-12 items-center justify-between px-4">
        <div class="flex items-center space-x-3">
            <div class="flex items-center space-x-2">
                <span class="text-2xl">🚴‍♂️</span>
                <span class="font-bold text-foreground">WKO Library</span>
            </div>
        </div>
        <div class="flex items-center space-x-2">
            <button class="btn-ghost h-9 w-9">☀️</button>
            <button class="btn-ghost h-9 w-9">❓</button>
        </div>
    </div>
</nav>
```

## Badges and Status Indicators

### Status Badges
```html
<!-- ✅ Do: Semantic badge usage -->
<div class="flex items-center space-x-2">
    <span class="badge-success">Completed</span>
    <span class="badge-warning">In Progress</span>
    <span class="badge-error">Failed</span>
</div>

<!-- ✅ Do: Badge with count -->
<span class="badge-modern">
    Power Zone 4 
    <span class="ml-1 bg-primary-foreground/20 px-1.5 py-0.5 rounded text-xs">
        12 min
    </span>
</span>
```

## Loading States

### Skeleton Loading
```html
<!-- ✅ Do: Skeleton screens for content -->
<div class="card-modern p-4">
    <div class="animate-pulse">
        <div class="skeleton h-4 bg-muted rounded mb-4"></div>
        <div class="skeleton h-32 bg-muted rounded mb-4"></div>
        <div class="skeleton h-4 bg-muted rounded w-3/4"></div>
    </div>
</div>
```

### Progress Indicators
```html
<!-- ✅ Do: Progress bar with label -->
<div class="space-y-2">
    <div class="flex justify-between text-sm">
        <span>Upload Progress</span>
        <span>65%</span>
    </div>
    <div class="progress-modern">
        <div class="progress-bar" style="width: 65%"></div>
    </div>
</div>
```

## Layout Patterns

### Hero Section
```html
<!-- ✅ Do: Centered hero with consistent spacing -->
<section class="relative py-12 px-4">
    <div class="container relative mx-auto text-center">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary to-primary/80 rounded-2xl mb-6">
            <span class="text-3xl">🚴‍♂️</span>
        </div>
        <h1 class="text-3xl font-bold mb-4 text-foreground">
            Zwift Workout Visualizer
        </h1>
        <p class="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Transform your Zwift workout files into stunning interactive visualizations
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <button class="btn-modern">Upload Workout</button>
            <button class="btn-outline">Try Sample</button>
        </div>
    </div>
</section>
```

### Content Sections
```html
<!-- ✅ Do: Consistent section spacing -->
<section class="py-6 px-4">
    <div class="container mx-auto max-w-7xl space-y-6">
        <!-- Workout Stats Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Stats cards -->
        </div>
        
        <!-- Main Content Area -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <!-- Content cards -->
        </div>
    </div>
</section>
```

## Animation Examples

### Hover Effects
```html
<!-- ✅ Do: Subtle hover animations -->
<div class="card-modern p-4 transition-all duration-150 hover:transform hover:-translate-y-1">
    <h3 class="text-lg font-semibold">Interactive Card</h3>
    <p class="text-muted-foreground">Subtle hover elevation</p>
</div>

<!-- ❌ Don't: Heavy animations -->
<div class="card-modern p-4 transition-all duration-500 hover:scale-110 hover:rotate-3">
    <h3>Distracting Animation</h3>  <!-- Too much movement -->
</div>
```

### Loading Animations
```html
<!-- ✅ Do: Subtle loading spinner -->
<div class="flex items-center justify-center p-4">
    <div class="loading-spinner"></div>
    <span class="ml-2 text-sm text-muted-foreground">Loading...</span>
</div>
```

## Responsive Design

### Mobile-First Approach
```html
<!-- ✅ Do: Mobile-first responsive grid -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <!-- Cards automatically stack on mobile -->
</div>

<!-- ✅ Do: Responsive button groups -->
<div class="flex flex-col sm:flex-row gap-4">
    <button class="btn-modern">Primary Action</button>
    <button class="btn-outline">Secondary</button>
</div>
```

### Viewport Considerations
```html
<!-- ✅ Do: Container with max-width -->
<div class="container mx-auto max-w-7xl px-4">
    <!-- Content automatically respects max width -->
</div>

<!-- ✅ Do: Responsive text sizes -->
<h1 class="text-2xl md:text-3xl lg:text-4xl font-bold">
    Responsive Heading
</h1>
```

## Accessibility Examples

### Keyboard Navigation
```html
<!-- ✅ Do: Proper focus management -->
<button class="btn-modern focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
    Accessible Button
</button>

<!-- ✅ Do: Skip links for screen readers -->
<a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-3 py-2 rounded">
    Skip to main content
</a>
```

### Semantic HTML
```html
<!-- ✅ Do: Proper heading hierarchy -->
<main id="main-content">
    <section aria-labelledby="workout-heading">
        <h2 id="workout-heading">Workout Analysis</h2>
        <div class="grid gap-4">
            <article class="card-modern p-4">
                <h3>Power Distribution</h3>
                <!-- Content -->
            </article>
        </div>
    </section>
</main>
```

## Common Anti-Patterns to Avoid

### ❌ Don't Do These

```html
<!-- ❌ Mixing design systems -->
<button class="btn-modern rounded-full">  <!-- Conflicts with angular design -->
    Mixed Styles
</button>

<!-- ❌ Hardcoded colors -->
<div class="bg-blue-500 text-white">  <!-- Use design tokens instead -->
    Hardcoded Colors
</div>

<!-- ❌ Inconsistent spacing -->
<div class="p-3 m-7 space-y-5">  <!-- Doesn't follow 8px grid -->
    Random Spacing
</div>

<!-- ❌ Missing accessibility -->
<div onclick="handleClick()">  <!-- Use proper button element -->
    Clickable Div
</div>

<!-- ❌ Complex animations -->
<div class="transition-all duration-1000 hover:scale-150 hover:rotate-45">
    Overly Complex Animation  <!-- Too distracting -->
</div>
```

---

These examples demonstrate the correct implementation of Nebula UI components. Always refer to the main design system documentation for detailed guidelines and rationale behind these patterns.