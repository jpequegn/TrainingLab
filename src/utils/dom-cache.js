/**
 * DOM Query Cache and Optimization Utility
 * Provides efficient DOM element caching and batch operations
 */

import { createLogger } from './logger.js';

const logger = createLogger('DOMCache');

export class DOMCache {
  constructor() {
    this.cache = new Map();
    this.observers = new Map();
    this.invalidationTimers = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      invalidations: 0,
    };

    // Setup automatic cache invalidation on DOM mutations
    this.setupMutationObserver();
  }

  /**
   * Get element with caching
   */
  get(selector, context = document) {
    const key = this.createKey(selector, context);

    if (this.cache.has(key)) {
      this.stats.hits++;
      const cached = this.cache.get(key);

      // Verify element is still in DOM
      if (cached.element && this.isElementValid(cached.element)) {
        return cached.element;
      } else {
        // Element was removed, invalidate cache entry
        this.invalidate(key);
      }
    }

    this.stats.misses++;
    const element = context.querySelector(selector);

    if (element) {
      this.cache.set(key, {
        element,
        selector,
        context,
        timestamp: Date.now(),
      });
    }

    return element;
  }

  /**
   * Get multiple elements with caching
   */
  getAll(selector, context = document) {
    const key = this.createKey(`${selector}_all`, context);

    if (this.cache.has(key)) {
      this.stats.hits++;
      const cached = this.cache.get(key);

      // Verify all elements are still valid
      if (
        cached.elements &&
        cached.elements.every(el => this.isElementValid(el))
      ) {
        return cached.elements;
      } else {
        this.invalidate(key);
      }
    }

    this.stats.misses++;
    const elements = Array.from(context.querySelectorAll(selector));

    if (elements.length > 0) {
      this.cache.set(key, {
        elements,
        selector,
        context,
        timestamp: Date.now(),
      });
    }

    return elements;
  }

  /**
   * Get element by ID (most efficient)
   */
  getElementById(id) {
    const key = `#${id}`;

    if (this.cache.has(key)) {
      this.stats.hits++;
      const cached = this.cache.get(key);

      if (cached.element && this.isElementValid(cached.element)) {
        return cached.element;
      } else {
        this.invalidate(key);
      }
    }

    this.stats.misses++;
    const element = document.getElementById(id);

    if (element) {
      this.cache.set(key, {
        element,
        selector: key,
        context: document,
        timestamp: Date.now(),
      });
    }

    return element;
  }

  /**
   * Batch DOM operations for better performance
   */
  batch(operations) {
    const fragment = document.createDocumentFragment();
    const results = [];

    // Use DocumentFragment for efficient DOM manipulation
    operations.forEach(op => {
      try {
        const result = op(fragment);
        results.push(result);
      } catch (error) {
        logger.error('Batch operation failed', error, {
          operation: op.toString(),
        });
        results.push(null);
      }
    });

    return { fragment, results };
  }

  /**
   * Create a unique key for caching
   */
  createKey(selector, context) {
    const contextKey =
      context === document
        ? 'document'
        : context.id || context.className || 'anonymous';
    return `${selector}::${contextKey}`;
  }

  /**
   * Check if element is still valid in DOM
   */
  isElementValid(element) {
    return element && document.contains(element);
  }

  /**
   * Invalidate cache entry
   */
  invalidate(key) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.stats.invalidations++;
      logger.debug('Cache invalidated', { key });
    }
  }

  /**
   * Invalidate all entries for a selector
   */
  invalidateSelector(selector) {
    const keysToInvalidate = Array.from(this.cache.keys()).filter(key =>
      key.startsWith(selector)
    );

    keysToInvalidate.forEach(key => this.invalidate(key));
  }

  /**
   * Clear entire cache
   */
  clear() {
    const { size } = this.cache;
    this.cache.clear();
    this.stats.invalidations += size;
    logger.debug('Cache cleared', { entriesRemoved: size });
  }

  /**
   * Setup mutation observer for automatic cache invalidation
   */
  setupMutationObserver() {
    const observer = new MutationObserver(mutations => {
      const affectedSelectors = new Set();

      mutations.forEach(mutation => {
        // Handle added/removed nodes
        if (mutation.type === 'childList') {
          // Invalidate cache entries for removed nodes
          mutation.removedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.invalidateCacheForElement(node);
            }
          });

          // Schedule revalidation for added nodes
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.scheduleRevalidation();
            }
          });
        }

        // Handle attribute changes
        if (mutation.type === 'attributes') {
          const element = mutation.target;
          if (element.nodeType === Node.ELEMENT_NODE) {
            // Invalidate class and id based selectors
            if (
              mutation.attributeName === 'class' ||
              mutation.attributeName === 'id'
            ) {
              this.invalidateCacheForElement(element);
            }
          }
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'id'],
    });

    this.observers.set('main', observer);
  }

  /**
   * Invalidate cache entries related to an element
   */
  invalidateCacheForElement(element) {
    // Get potential selectors for this element
    const selectors = [];

    if (element.id) {
      selectors.push(`#${element.id}`);
    }

    if (element.className) {
      const classes = element.className.split(/\s+/).filter(Boolean);
      classes.forEach(cls => selectors.push(`.${cls}`));
    }

    selectors.push(element.tagName.toLowerCase());

    // Invalidate related cache entries
    selectors.forEach(selector => {
      this.invalidateSelector(selector);
    });
  }

  /**
   * Schedule cache revalidation (debounced)
   */
  scheduleRevalidation() {
    const timerId = 'revalidation';

    if (this.invalidationTimers.has(timerId)) {
      clearTimeout(this.invalidationTimers.get(timerId));
    }

    const timer = setTimeout(() => {
      this.revalidateCache();
      this.invalidationTimers.delete(timerId);
    }, 100); // Debounce for 100ms

    this.invalidationTimers.set(timerId, timer);
  }

  /**
   * Revalidate all cached entries
   */
  revalidateCache() {
    const invalidKeys = [];

    this.cache.forEach((cached, key) => {
      if (cached.element && !this.isElementValid(cached.element)) {
        invalidKeys.push(key);
      } else if (
        cached.elements &&
        !cached.elements.every(el => this.isElementValid(el))
      ) {
        invalidKeys.push(key);
      }
    });

    invalidKeys.forEach(key => this.invalidate(key));

    if (invalidKeys.length > 0) {
      logger.debug('Cache revalidated', {
        invalidatedEntries: invalidKeys.length,
      });
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate =
      this.stats.hits + this.stats.misses > 0
        ? (
            (this.stats.hits / (this.stats.hits + this.stats.misses)) *
            100
          ).toFixed(2)
        : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      cacheSize: this.cache.size,
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();

    this.invalidationTimers.forEach(timer => clearTimeout(timer));
    this.invalidationTimers.clear();

    this.clear();
  }
}

// Create singleton instance
export const domCache = new DOMCache();

// Convenience functions
export const $ = (selector, context) => domCache.get(selector, context);
export const $$ = (selector, context) => domCache.getAll(selector, context);
export const $id = id => domCache.getElementById(id);

// Performance monitoring
if (typeof window !== 'undefined' && window.performance) {
  // Log cache stats periodically in development
  if (window.location.hostname === 'localhost') {
    setInterval(() => {
      const stats = domCache.getStats();
      if (stats.hits + stats.misses > 0) {
        logger.debug('DOM Cache Stats', stats);
      }
    }, 30000); // Every 30 seconds
  }
}
