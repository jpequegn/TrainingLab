/**
 * Base Component Architecture
 * Provides a foundation for creating reusable, reactive components
 */

import { stateManager } from '../state-manager.js';

export class BaseComponent {
  constructor(element, options = {}) {
    this.element =
      typeof element === 'string' ? document.querySelector(element) : element;
    this.options = { ...this.getDefaultOptions(), ...options };
    this.subscriptions = [];
    this.childComponents = new Map();

    if (!this.element) {
      throw new Error(`Element not found: ${element}`);
    }

    this.initialize();
    this.setupEventListeners();
    this.setupStateBindings();
    this.render();
  }

  /**
   * Get default options for the component
   */
  getDefaultOptions() {
    return {
      reactive: true,
      autoDestroy: true,
      cssClasses: [],
      attributes: {},
    };
  }

  /**
   * Initialize component (override in subclasses)
   */
  initialize() {
    // Apply CSS classes
    if (this.options.cssClasses.length > 0) {
      this.element.classList.add(...this.options.cssClasses);
    }

    // Apply attributes
    Object.entries(this.options.attributes).forEach(([key, value]) => {
      this.element.setAttribute(key, value);
    });

    // Add component identifier
    this.element.setAttribute('data-component', this.constructor.name);
  }

  /**
   * Setup event listeners (override in subclasses)
   */
  setupEventListeners() {
    // Auto-destroy on element removal
    if (this.options.autoDestroy) {
      const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          mutation.removedNodes.forEach(node => {
            if (node === this.element || node.contains?.(this.element)) {
              this.destroy();
              observer.disconnect();
            }
          });
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }
  }

  /**
   * Setup state bindings (override in subclasses)
   */
  setupStateBindings() {
    // Override in subclasses to setup reactive state bindings
  }

  /**
   * Render component (override in subclasses)
   */
  render() {
    // Override in subclasses to implement rendering logic
  }

  /**
   * Subscribe to state changes with automatic cleanup
   */
  subscribe(path, callback, options = {}) {
    const unsubscribe = stateManager.subscribe(path, callback, options);
    this.subscriptions.push(unsubscribe);
    return unsubscribe;
  }

  /**
   * Emit custom events
   */
  emit(eventName, detail = {}) {
    const event = new CustomEvent(eventName, {
      detail: {
        component: this,
        ...detail,
      },
      bubbles: true,
      cancelable: true,
    });

    this.element.dispatchEvent(event);
    return event;
  }

  /**
   * Listen to custom events with automatic cleanup
   */
  on(eventName, handler, options = {}) {
    this.element.addEventListener(eventName, handler, options);

    // Store for cleanup
    if (!this.eventListeners) {
      this.eventListeners = [];
    }
    this.eventListeners.push({ eventName, handler, options });
  }

  /**
   * Update component options
   */
  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
    this.render();
  }

  /**
   * Add child component
   */
  addChild(name, component) {
    this.childComponents.set(name, component);
    return component;
  }

  /**
   * Get child component
   */
  getChild(name) {
    return this.childComponents.get(name);
  }

  /**
   * Remove child component
   */
  removeChild(name) {
    const component = this.childComponents.get(name);
    if (component && typeof component.destroy === 'function') {
      component.destroy();
    }
    this.childComponents.delete(name);
  }

  /**
   * Show component
   */
  show() {
    this.element.style.display = '';
    this.element.setAttribute('aria-hidden', 'false');
    this.emit('component:show');
  }

  /**
   * Hide component
   */
  hide() {
    this.element.style.display = 'none';
    this.element.setAttribute('aria-hidden', 'true');
    this.emit('component:hide');
  }

  /**
   * Toggle component visibility
   */
  toggle() {
    if (this.element.style.display === 'none') {
      this.show();
    } else {
      this.hide();
    }
  }

  /**
   * Check if component is visible
   */
  isVisible() {
    return (
      this.element.style.display !== 'none' &&
      this.element.offsetParent !== null
    );
  }

  /**
   * Get component state
   */
  getState() {
    return {
      visible: this.isVisible(),
      options: { ...this.options },
      childCount: this.childComponents.size,
    };
  }

  /**
   * Destroy component and cleanup
   */
  destroy() {
    // Cleanup subscriptions
    this.subscriptions.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (error) {
        console.warn('Error unsubscribing:', error);
      }
    });
    this.subscriptions = [];

    // Cleanup event listeners
    if (this.eventListeners) {
      this.eventListeners.forEach(({ eventName, handler }) => {
        this.element.removeEventListener(eventName, handler);
      });
      this.eventListeners = [];
    }

    // Destroy child components
    this.childComponents.forEach((component, name) => {
      this.removeChild(name);
    });

    // Emit destroy event
    this.emit('component:destroy');

    // Remove component marker
    this.element.removeAttribute('data-component');

    // Clear references
    this.element = null;
    this.options = null;
  }
}

/**
 * Component Factory for creating components with automatic registration
 */
export class ComponentFactory {
  constructor() {
    this.components = new Map();
    this.instances = new WeakMap();
  }

  /**
   * Register a component class
   */
  register(name, componentClass) {
    this.components.set(name, componentClass);
  }

  /**
   * Create component instance
   */
  create(name, element, options = {}) {
    const ComponentClass = this.components.get(name);
    if (!ComponentClass) {
      throw new Error(`Component not registered: ${name}`);
    }

    const instance = new ComponentClass(element, options);
    this.instances.set(element, instance);
    return instance;
  }

  /**
   * Get component instance from element
   */
  getInstance(element) {
    return this.instances.get(element);
  }

  /**
   * Auto-initialize components from DOM
   */
  autoInitialize(container = document) {
    const elements = container.querySelectorAll('[data-component-type]');
    const instances = [];

    elements.forEach(element => {
      const componentType = element.getAttribute('data-component-type');
      const optionsAttr = element.getAttribute('data-component-options');

      let options = {};
      if (optionsAttr) {
        try {
          options = JSON.parse(optionsAttr);
        } catch (error) {
          console.warn('Invalid component options:', optionsAttr);
        }
      }

      try {
        const instance = this.create(componentType, element, options);
        instances.push(instance);
      } catch (error) {
        console.error(`Failed to create component ${componentType}:`, error);
      }
    });

    return instances;
  }

  /**
   * Destroy all component instances
   */
  destroyAll() {
    // Note: WeakMap doesn't have iteration methods
    // Components will be cleaned up by their auto-destroy functionality
    console.log('Component factory cleanup initiated');
  }
}

/**
 * Global component factory instance
 */
export const componentFactory = new ComponentFactory();

/**
 * Component decorator for automatic registration
 */
export function Component(name) {
  return function (target) {
    componentFactory.register(name, target);
    return target;
  };
}

/**
 * Utility functions
 */
export const componentUtils = {
  /**
   * Find parent component
   */
  findParentComponent(element) {
    let parent = element.parentElement;
    while (parent) {
      const instance = componentFactory.getInstance(parent);
      if (instance) {
        return instance;
      }
      parent = parent.parentElement;
    }
    return null;
  },

  /**
   * Find child components
   */
  findChildComponents(element) {
    const children = [];
    const descendants = element.querySelectorAll('[data-component]');

    descendants.forEach(descendant => {
      const instance = componentFactory.getInstance(descendant);
      if (instance) {
        children.push(instance);
      }
    });

    return children;
  },

  /**
   * Wait for component to be ready
   */
  waitForComponent(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (!element) {
        reject(new Error(`Element not found: ${selector}`));
        return;
      }

      const instance = componentFactory.getInstance(element);
      if (instance) {
        resolve(instance);
        return;
      }

      // Wait for component to be initialized
      const observer = new MutationObserver(() => {
        const instance = componentFactory.getInstance(element);
        if (instance) {
          observer.disconnect();
          clearTimeout(timeoutId);
          resolve(instance);
        }
      });

      observer.observe(element, {
        attributes: true,
        attributeFilter: ['data-component'],
      });

      const timeoutId = setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Component initialization timeout: ${selector}`));
      }, timeout);
    });
  },
};
