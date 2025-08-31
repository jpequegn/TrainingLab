/**
 * Event Listener Management System
 * Provides systematic event listener management with automatic cleanup
 */

import { createLogger } from './logger.js';

const logger = createLogger('EventManager');

export class EventManager {
  constructor() {
    this.listeners = new Map();
    this.delegatedListeners = new Map();
    this.abortControllers = new Map();
    this.stats = {
      active: 0,
      added: 0,
      removed: 0,
      delegated: 0
    };

    // Setup cleanup on page unload
    this.setupUnloadCleanup();
  }

  /**
   * Add event listener with automatic cleanup tracking
   */
  add(element, event, handler, options = {}) {
    if (!element || typeof handler !== 'function') {
      logger.warn('Invalid parameters for event listener', { element, event, handler });
      return null;
    }

    const listenerId = this.generateListenerId();
    const abortController = new AbortController();
    
    // Merge abort signal with user options
    const listenerOptions = {
      ...options,
      signal: abortController.signal
    };

    try {
      element.addEventListener(event, handler, listenerOptions);
      
      // Track the listener
      this.listeners.set(listenerId, {
        element,
        event,
        handler,
        options: listenerOptions,
        abortController,
        timestamp: Date.now()
      });

      this.abortControllers.set(listenerId, abortController);
      this.stats.active++;
      this.stats.added++;

      logger.debug('Event listener added', { 
        listenerId, 
        event, 
        element: this.getElementDescription(element)
      });

      return listenerId;
    } catch (error) {
      logger.error('Failed to add event listener', error, { 
        event, 
        element: this.getElementDescription(element)
      });
      return null;
    }
  }

  /**
   * Remove specific event listener
   */
  remove(listenerId) {
    if (!this.listeners.has(listenerId)) {
      logger.warn('Event listener not found for removal', { listenerId });
      return false;
    }

    const listener = this.listeners.get(listenerId);
    
    try {
      // Abort the listener (modern way)
      if (listener.abortController) {
        listener.abortController.abort();
      } else {
        // Fallback to manual removal
        listener.element.removeEventListener(
          listener.event, 
          listener.handler, 
          listener.options
        );
      }

      this.listeners.delete(listenerId);
      this.abortControllers.delete(listenerId);
      this.stats.active--;
      this.stats.removed++;

      logger.debug('Event listener removed', { listenerId });
      return true;
    } catch (error) {
      logger.error('Failed to remove event listener', error, { listenerId });
      return false;
    }
  }

  /**
   * Add delegated event listener (event delegation pattern)
   */
  delegate(container, event, selector, handler, options = {}) {
    if (!container || !selector || typeof handler !== 'function') {
      logger.warn('Invalid parameters for delegated event listener');
      return null;
    }

    const delegatedHandler = (e) => {
      // Find the closest matching element
      const target = e.target.closest(selector);
      if (target && container.contains(target)) {
        handler.call(target, e);
      }
    };

    const listenerId = this.add(container, event, delegatedHandler, options);
    
    if (listenerId) {
      this.delegatedListeners.set(listenerId, {
        container,
        event,
        selector,
        originalHandler: handler,
        delegatedHandler
      });
      this.stats.delegated++;

      logger.debug('Delegated event listener added', { 
        listenerId, 
        event, 
        selector,
        container: this.getElementDescription(container)
      });
    }

    return listenerId;
  }

  /**
   * Remove all event listeners for an element
   */
  removeForElement(element) {
    const listenersToRemove = [];

    this.listeners.forEach((listener, listenerId) => {
      if (listener.element === element) {
        listenersToRemove.push(listenerId);
      }
    });

    let removedCount = 0;
    listenersToRemove.forEach(listenerId => {
      if (this.remove(listenerId)) {
        removedCount++;
      }
    });

    logger.debug('Removed event listeners for element', { 
      element: this.getElementDescription(element),
      removedCount 
    });

    return removedCount;
  }

  /**
   * Remove all event listeners of a specific type
   */
  removeByEvent(event) {
    const listenersToRemove = [];

    this.listeners.forEach((listener, listenerId) => {
      if (listener.event === event) {
        listenersToRemove.push(listenerId);
      }
    });

    let removedCount = 0;
    listenersToRemove.forEach(listenerId => {
      if (this.remove(listenerId)) {
        removedCount++;
      }
    });

    logger.debug('Removed event listeners by event type', { event, removedCount });
    return removedCount;
  }

  /**
   * Create a scoped event manager for components
   */
  createScope(scopeName) {
    const scopedListeners = new Set();

    return {
      add: (element, event, handler, options) => {
        const listenerId = this.add(element, event, handler, options);
        if (listenerId) {
          scopedListeners.add(listenerId);
        }
        return listenerId;
      },

      delegate: (container, event, selector, handler, options) => {
        const listenerId = this.delegate(container, event, selector, handler, options);
        if (listenerId) {
          scopedListeners.add(listenerId);
        }
        return listenerId;
      },

      remove: (listenerId) => {
        scopedListeners.delete(listenerId);
        return this.remove(listenerId);
      },

      cleanup: () => {
        const removedCount = scopedListeners.size;
        scopedListeners.forEach(listenerId => {
          this.remove(listenerId);
        });
        scopedListeners.clear();
        
        logger.debug('Scoped event listeners cleaned up', { 
          scopeName, 
          removedCount 
        });
        
        return removedCount;
      },

      getStats: () => ({
        activeListeners: scopedListeners.size,
        scopeName
      })
    };
  }

  /**
   * Batch add multiple event listeners
   */
  addBatch(listeners) {
    const addedIds = [];

    listeners.forEach(({ element, event, handler, options }) => {
      const listenerId = this.add(element, event, handler, options);
      if (listenerId) {
        addedIds.push(listenerId);
      }
    });

    logger.debug('Batch event listeners added', { count: addedIds.length });
    return addedIds;
  }

  /**
   * Setup cleanup on page unload
   */
  setupUnloadCleanup() {
    const cleanup = () => {
      const cleanedUp = this.cleanup();
      logger.debug('Page unload cleanup completed', { cleanedUp });
    };

    // Multiple unload events for better compatibility
    ['beforeunload', 'pagehide', 'unload'].forEach(event => {
      window.addEventListener(event, cleanup, { passive: true });
    });
  }

  /**
   * Generate unique listener ID
   */
  generateListenerId() {
    return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get element description for logging
   */
  getElementDescription(element) {
    if (!element) return 'null';
    
    let desc = element.tagName ? element.tagName.toLowerCase() : 'unknown';
    
    if (element.id) desc += `#${element.id}`;
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.trim().split(/\s+/).slice(0, 3).join('.');
      if (classes) desc += `.${classes}`;
    }
    
    return desc;
  }

  /**
   * Clean up all event listeners
   */
  cleanup() {
    let cleanedUp = 0;

    // Abort all listeners using AbortControllers
    this.abortControllers.forEach(controller => {
      try {
        controller.abort();
        cleanedUp++;
      } catch (error) {
        logger.warn('Failed to abort event listener', error);
      }
    });

    // Clear all tracking
    this.listeners.clear();
    this.delegatedListeners.clear();
    this.abortControllers.clear();
    
    this.stats.active = 0;
    this.stats.removed += cleanedUp;

    logger.debug('All event listeners cleaned up', { cleanedUp });
    return cleanedUp;
  }

  /**
   * Get event manager statistics
   */
  getStats() {
    return {
      ...this.stats,
      delegatedActive: this.delegatedListeners.size
    };
  }

  /**
   * Get detailed information about active listeners
   */
  getActiveListeners() {
    const active = [];
    
    this.listeners.forEach((listener, listenerId) => {
      active.push({
        id: listenerId,
        event: listener.event,
        element: this.getElementDescription(listener.element),
        isDelegated: this.delegatedListeners.has(listenerId),
        timestamp: listener.timestamp
      });
    });

    return active;
  }

  /**
   * Debug: Log all active listeners
   */
  debugListeners() {
    const active = this.getActiveListeners();
    logger.debug('Active event listeners', { 
      count: active.length, 
      stats: this.getStats(),
      listeners: active 
    });
  }
}

// Create singleton instance
export const eventManager = new EventManager();

// Convenience functions
export const addListener = (element, event, handler, options) => 
  eventManager.add(element, event, handler, options);

export const removeListener = (listenerId) => 
  eventManager.remove(listenerId);

export const delegateListener = (container, event, selector, handler, options) => 
  eventManager.delegate(container, event, selector, handler, options);

export const createEventScope = (scopeName) => 
  eventManager.createScope(scopeName);

// Development helper
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  // Make available globally for debugging
  window.eventManager = eventManager;
  
  // Log stats periodically
  setInterval(() => {
    const stats = eventManager.getStats();
    if (stats.active > 0) {
      logger.debug('Event Manager Stats', stats);
    }
  }, 60000); // Every minute
}