// Browser-compatible implementation of clsx and tailwind-merge functionality
// Since we're using these utilities in a browser environment without a build process,
// we need to implement them directly

/**
 * Simple clsx implementation for browser
 * Combines class names and handles various input types
 */
function clsx(...inputs) {
  const classes = [];

  for (const input of inputs) {
    if (!input) continue;

    if (typeof input === 'string') {
      classes.push(input);
    } else if (Array.isArray(input)) {
      const result = clsx(...input);
      if (result) classes.push(result);
    } else if (typeof input === 'object') {
      for (const key in input) {
        if (input[key]) classes.push(key);
      }
    }
  }

  return classes.join(' ');
}

/**
 * Simple tailwind-merge implementation for browser
 * Handles conflicting Tailwind CSS classes
 */
function twMerge(...inputs) {
  // For now, just use clsx functionality
  // In a production environment, you'd want to implement proper Tailwind class merging
  // This simplified version will work for most cases
  const combined = clsx(...inputs);

  // Basic deduplication
  const classes = combined.split(' ');
  const unique = [...new Set(classes)];

  // Simple conflict resolution for common Tailwind patterns
  const finalClasses = [];
  const seen = new Map();

  // Process classes in reverse order (later classes override earlier ones)
  for (let i = unique.length - 1; i >= 0; i--) {
    const cls = unique[i];

    // Extract the base class (e.g., 'p-4' -> 'p', 'bg-blue-500' -> 'bg')
    const match = cls.match(/^([a-z]+(?:-[a-z]+)*)-/);
    const base = match ? match[1] : cls;

    // Only add if we haven't seen this base class yet
    if (!seen.has(base)) {
      finalClasses.unshift(cls);
      seen.set(base, cls);
    }
  }

  return finalClasses.join(' ');
}

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
