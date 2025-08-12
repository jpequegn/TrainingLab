/**
 * Reactive UI Binding System
 * Automatically updates DOM elements based on state changes
 */

import { stateManager } from './state-manager.js';

export class ReactiveUI {
  constructor() {
    this.bindings = new Map();
    this.computedBindings = new Map();
    this.eventBindings = new Map();
    this.conditionalBindings = new Map();

    this.setupBindings();
  }

  /**
   * Bind DOM elements to state properties
   */
  bind(selector, statePath, options = {}) {
    const {
      property = 'textContent',
      transform = null,
      condition = null,
      immediate = true,
    } = options;

    const elements = document.querySelectorAll(selector);
    if (elements.length === 0) return;

    const binding = {
      selector,
      statePath,
      property,
      transform,
      condition,
      elements: Array.from(elements),
    };

    // Store binding
    if (!this.bindings.has(statePath)) {
      this.bindings.set(statePath, []);
    }
    this.bindings.get(statePath).push(binding);

    // Subscribe to state changes
    const unsubscribe = stateManager.subscribe(
      statePath,
      (newValue, oldValue) => {
        this.updateBinding(binding, newValue, oldValue);
      },
      { immediate }
    );

    return unsubscribe;
  }

  /**
   * Update DOM binding
   */
  updateBinding(binding, newValue, oldValue) {
    const { elements, property, transform, condition } = binding;

    // Check condition if provided
    if (condition && !condition(newValue, oldValue)) {
      return;
    }

    // Transform value if transform function provided
    const displayValue = transform ? transform(newValue, oldValue) : newValue;

    elements.forEach(element => {
      if (!document.contains(element)) return;

      try {
        if (property === 'class') {
          this.updateClassBinding(element, displayValue, oldValue);
        } else if (property === 'style') {
          this.updateStyleBinding(element, displayValue);
        } else if (property === 'attribute') {
          this.updateAttributeBinding(element, displayValue);
        } else if (property === 'innerHTML') {
          element.innerHTML = displayValue;
        } else if (property === 'textContent') {
          element.textContent = displayValue;
        } else if (property === 'value') {
          element.value = displayValue;
        } else if (property === 'checked') {
          element.checked = Boolean(displayValue);
        } else if (property === 'disabled') {
          element.disabled = Boolean(displayValue);
        } else if (property === 'hidden') {
          element.hidden = Boolean(displayValue);
        } else {
          element[property] = displayValue;
        }
      } catch (error) {
        console.error('Error updating binding:', error, binding);
      }
    });
  }

  /**
   * Update class binding
   */
  updateClassBinding(element, classData, oldValue) {
    if (typeof classData === 'string') {
      element.className = classData;
    } else if (typeof classData === 'object') {
      Object.keys(classData).forEach(className => {
        if (classData[className]) {
          element.classList.add(className);
        } else {
          element.classList.remove(className);
        }
      });
    }
  }

  /**
   * Update style binding
   */
  updateStyleBinding(element, styleData) {
    if (typeof styleData === 'string') {
      element.style.cssText = styleData;
    } else if (typeof styleData === 'object') {
      Object.keys(styleData).forEach(styleProp => {
        element.style[styleProp] = styleData[styleProp];
      });
    }
  }

  /**
   * Update attribute binding
   */
  updateAttributeBinding(element, attrData) {
    if (typeof attrData === 'object') {
      Object.keys(attrData).forEach(attr => {
        if (attrData[attr] === null || attrData[attr] === false) {
          element.removeAttribute(attr);
        } else {
          element.setAttribute(attr, attrData[attr]);
        }
      });
    }
  }

  /**
   * Bind events to state actions
   */
  bindEvent(selector, eventType, action, payload = null) {
    const elements = document.querySelectorAll(selector);

    elements.forEach(element => {
      const handler = event => {
        event.preventDefault();

        let actionPayload = payload;
        if (typeof payload === 'function') {
          actionPayload = payload(event, element);
        }

        stateManager.dispatch(action, actionPayload);
      };

      element.addEventListener(eventType, handler);

      // Store for cleanup
      const bindingKey = `${selector}:${eventType}`;
      if (!this.eventBindings.has(bindingKey)) {
        this.eventBindings.set(bindingKey, []);
      }
      this.eventBindings.get(bindingKey).push({ element, handler });
    });
  }

  /**
   * Conditional rendering
   */
  bindConditional(selector, statePath, conditions) {
    const elements = document.querySelectorAll(selector);
    if (elements.length === 0) return;

    const binding = {
      selector,
      statePath,
      conditions,
      elements: Array.from(elements),
    };

    if (!this.conditionalBindings.has(statePath)) {
      this.conditionalBindings.set(statePath, []);
    }
    this.conditionalBindings.get(statePath).push(binding);

    const unsubscribe = stateManager.subscribe(
      statePath,
      newValue => {
        this.updateConditionalBinding(binding, newValue);
      },
      { immediate: true }
    );

    return unsubscribe;
  }

  /**
   * Update conditional binding
   */
  updateConditionalBinding(binding, value) {
    const { elements, conditions } = binding;

    elements.forEach(element => {
      if (!document.contains(element)) return;

      const condition = conditions.find(c => c.when(value));
      if (condition) {
        if (condition.show !== undefined) {
          element.style.display = condition.show ? '' : 'none';
        }
        if (condition.class) {
          element.className = condition.class;
        }
        if (condition.content) {
          element.textContent = condition.content;
        }
        if (condition.html) {
          element.innerHTML = condition.html;
        }
      }
    });
  }

  /**
   * Two-way data binding for form elements
   */
  bindTwoWay(selector, statePath, options = {}) {
    const { debounce = 300, transform = null } = options;

    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      // State to element
      stateManager.subscribe(
        statePath,
        newValue => {
          if (element.type === 'checkbox') {
            element.checked = Boolean(newValue);
          } else {
            element.value = newValue;
          }
        },
        { immediate: true }
      );

      // Element to state
      let timeoutId;
      const updateState = () => {
        let value =
          element.type === 'checkbox' ? element.checked : element.value;
        if (transform) {
          value = transform(value);
        }
        stateManager.setState(statePath, value);
      };

      const debouncedUpdate = () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(updateState, debounce);
      };

      element.addEventListener('input', debouncedUpdate);
      element.addEventListener('change', updateState);
    });
  }

  /**
   * List rendering with templates
   */
  bindList(containerSelector, statePath, templateFn, options = {}) {
    const { keyProperty = 'id', emptyMessage = 'No items' } = options;

    const container = document.querySelector(containerSelector);
    if (!container) return;

    const unsubscribe = stateManager.subscribe(
      statePath,
      items => {
        this.renderList(
          container,
          items,
          templateFn,
          keyProperty,
          emptyMessage
        );
      },
      { immediate: true }
    );

    return unsubscribe;
  }

  /**
   * Render list items
   */
  renderList(container, items, templateFn, keyProperty, emptyMessage) {
    // Clear existing content
    container.innerHTML = '';

    if (!items || items.length === 0) {
      container.innerHTML = `<div class="empty-state text-gray-500 text-center py-8">${emptyMessage}</div>`;
      return;
    }

    const fragment = document.createDocumentFragment();

    items.forEach((item, index) => {
      const element = templateFn(item, index);
      if (element) {
        // Add data attributes for tracking
        element.setAttribute('data-key', item[keyProperty] || index);
        element.setAttribute('data-index', index);
        fragment.appendChild(element);
      }
    });

    container.appendChild(fragment);
  }

  /**
   * Setup common bindings
   */
  setupBindings() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () =>
        this.initializeBindings()
      );
    } else {
      this.initializeBindings();
    }
  }

  /**
   * Initialize common UI bindings
   */
  initializeBindings() {
    // Loading state bindings
    this.bindConditional('#loadingOverlay', 'isLoading', [
      { when: loading => loading, show: true },
      { when: loading => !loading, show: false },
    ]);

    // Loading progress
    this.bind('#loadingProgress', 'loadingProgress', {
      property: 'style',
      transform: progress => ({ width: `${progress}%` }),
    });

    this.bind('#loadingMessage', 'loadingMessage');

    // Active panel switching
    this.bindConditional('.panel', 'activePanel', [
      {
        when: panel => true,
        show: false, // Hide all by default
      },
    ]);

    // Show active panel
    stateManager.subscribe('activePanel', activePanel => {
      document.querySelectorAll('.panel').forEach(panel => {
        panel.style.display = 'none';
      });

      const activePanelEl = document.querySelector(
        `[data-panel="${activePanel}"]`
      );
      if (activePanelEl) {
        activePanelEl.style.display = 'block';
      }
    });

    // Chat panel state
    this.bind('#chatPanel', 'chatPanelExpanded', {
      property: 'class',
      transform: expanded => {
        const panel = document.getElementById('chatPanel');
        if (panel) {
          if (expanded) {
            panel.classList.add('expanded');
            panel.style.transform = 'translateX(0)';
          } else {
            panel.classList.remove('expanded');
            // On smaller screens, hide the panel completely
            if (window.innerWidth < 1280) {
              panel.style.transform = 'translateX(100%)';
            }
          }
        }
        return { expanded: expanded };
      },
    });

    // Theme switching
    stateManager.subscribe(
      'themeMode',
      theme => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
      },
      { immediate: true }
    );

    // Workout info display
    this.bindConditional('#workoutInfo', 'workout', [
      { when: workout => workout !== null, show: true },
      { when: workout => workout === null, show: false },
    ]);

    // Selected segment highlighting
    this.bind('[data-segment]', 'selectedSegmentIndex', {
      property: 'class',
      transform: selectedIndex => {
        const elements = document.querySelectorAll('[data-segment]');
        elements.forEach(el => {
          const segmentIndex = parseInt(el.getAttribute('data-segment'));
          el.classList.toggle('selected', segmentIndex === selectedIndex);
        });
      },
    });

    // Undo/Redo button states
    this.bind('#undoEditBtn', 'undoStack', {
      property: 'disabled',
      transform: undoStack => !undoStack || undoStack.length === 0,
    });

    // FTP input binding
    this.bindTwoWay('#ftpInput', 'ftp', {
      transform: value => parseInt(value) || 250,
    });

    // Error display
    this.bind('#errorContainer', 'lastError', {
      property: 'innerHTML',
      transform: error => {
        if (!error) return '';
        return `
                    <div class="error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                        <strong>${error.type || 'Error'}:</strong> ${error.message}
                    </div>
                `;
      },
    });

    // Performance metrics (debug)
    if (
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1')
    ) {
      this.bind('#debugInfo', 'performanceMetrics', {
        property: 'innerHTML',
        transform: metrics => `
                    Load: ${metrics.loadTime}ms | 
                    Render: ${metrics.renderTime}ms | 
                    Memory: ${Math.round(metrics.memoryUsage / 1024 / 1024)}MB
                `,
      });
    }

    // Setup event bindings
    this.setupEventBindings();
  }

  /**
   * Setup event bindings
   */
  setupEventBindings() {
    // File upload
    this.bindEvent('#fileInput', 'change', 'FILE_UPLOAD', event => ({
      file: event.target.files[0],
    }));

    // Sample workout load
    this.bindEvent('#loadSample', 'click', 'LOAD_SAMPLE');

    // Panel navigation
    this.bindEvent('[data-panel-trigger]', 'click', 'SET_ACTIVE_PANEL', event =>
      event.target.getAttribute('data-panel-trigger')
    );

    // Chat panel toggle
    this.bindEvent('#toggleChatPanel', 'click', 'TOGGLE_CHAT_PANEL');

    // Theme toggle
    this.bindEvent('#themeToggle', 'click', 'TOGGLE_THEME');

    // Segment selection
    this.bindEvent('[data-segment]', 'click', 'SELECT_SEGMENT', event =>
      parseInt(event.target.getAttribute('data-segment'))
    );

    // Undo/Redo
    this.bindEvent('#undoEditBtn', 'click', 'UNDO_WORKOUT');
    this.bindEvent('#redoEditBtn', 'click', 'REDO_WORKOUT');

    // Scaling
    this.bindEvent('#applyScale', 'click', 'APPLY_SCALING');
    this.bindEvent('#resetWorkout', 'click', 'RESET_WORKOUT');
  }

  /**
   * Cleanup bindings
   */
  cleanup() {
    // Clear event listeners
    this.eventBindings.forEach((bindings, key) => {
      bindings.forEach(({ element, handler }) => {
        const [selector, eventType] = key.split(':');
        element.removeEventListener(eventType, handler);
      });
    });

    this.eventBindings.clear();
    this.bindings.clear();
    this.computedBindings.clear();
    this.conditionalBindings.clear();
  }
}

export const reactiveUI = new ReactiveUI();
