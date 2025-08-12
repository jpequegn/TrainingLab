/**
 * Centralized State Management System
 * Implements a reactive state pattern with subscriptions and middleware support
 */

export class StateManager {
  constructor() {
    this.state = {
      // Application State
      isLoading: false,
      loadingMessage: '',
      loadingProgress: 0,

      // Workout State
      workout: null,
      originalWorkout: null,
      selectedSegmentIndex: null,
      undoStack: [],
      redoStack: [],

      // UI State
      activePanel: 'upload', // upload, workout, segments, export
      chatPanelExpanded: false,
      themeMode: 'light',

      // Chart State
      chartInstance: null,
      chartData: null,
      chartOptions: null,

      // User Preferences
      ftp: 250,
      units: 'metric', // metric, imperial

      // Error State
      errors: [],
      lastError: null,

      // Performance State
      performanceMetrics: {
        loadTime: 0,
        renderTime: 0,
        memoryUsage: 0,
      },
    };

    this.subscribers = new Map();
    this.middleware = [];
    this.history = [];
    this.maxHistorySize = 50;

    // Performance monitoring
    this.performanceObserver = null;
    this.setupPerformanceMonitoring();

    // Auto-save preferences
    this.loadPreferences();
    this.setupAutoSave();
  }

  /**
   * Subscribe to state changes
   */
  subscribe(path, callback, options = {}) {
    const { immediate = false, deep = false } = options;

    if (!this.subscribers.has(path)) {
      this.subscribers.set(path, []);
    }

    const subscription = {
      callback,
      deep,
      id: Math.random().toString(36).substr(2, 9),
    };

    this.subscribers.get(path).push(subscription);

    // Call immediately with current value if requested
    if (immediate) {
      const currentValue = this.getState(path);
      callback(currentValue, null, path);
    }

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(path);
      if (subs) {
        const index = subs.findIndex(s => s.id === subscription.id);
        if (index > -1) {
          subs.splice(index, 1);
        }
      }
    };
  }

  /**
   * Get state value by path
   */
  getState(path = '') {
    if (!path) return { ...this.state };

    const keys = path.split('.');
    let value = this.state;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Set state with automatic notifications
   */
  setState(path, value, options = {}) {
    const { silent = false, source = 'unknown' } = options;

    const oldValue = this.getState(path);

    // Apply middleware
    const middlewareContext = {
      path,
      oldValue,
      newValue: value,
      source,
      timestamp: Date.now(),
    };

    for (const middleware of this.middleware) {
      const result = middleware(middlewareContext);
      if (result === false) {
        // Middleware blocked the update
        return false;
      }
      if (result && typeof result === 'object') {
        value = result;
      }
    }

    // Update state
    this.setNestedValue(path, value);

    // Add to history
    this.addToHistory({
      path,
      oldValue,
      newValue: value,
      source,
      timestamp: Date.now(),
    });

    // Notify subscribers
    if (!silent) {
      this.notifySubscribers(path, value, oldValue);
    }

    return true;
  }

  /**
   * Set nested value in state object
   */
  setNestedValue(path, value) {
    const keys = path.split('.');
    let current = this.state;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Notify subscribers of state changes
   */
  notifySubscribers(path, newValue, oldValue) {
    // Notify exact path subscribers
    const exactSubs = this.subscribers.get(path);
    if (exactSubs) {
      exactSubs.forEach(sub => {
        try {
          sub.callback(newValue, oldValue, path);
        } catch (error) {
          console.error('Error in state subscriber:', error);
        }
      });
    }

    // Notify parent path subscribers (if deep watching)
    const pathParts = path.split('.');
    for (let i = pathParts.length - 1; i > 0; i--) {
      const parentPath = pathParts.slice(0, i).join('.');
      const parentSubs = this.subscribers.get(parentPath);

      if (parentSubs) {
        parentSubs.forEach(sub => {
          if (sub.deep) {
            try {
              const parentValue = this.getState(parentPath);
              sub.callback(parentValue, null, parentPath);
            } catch (error) {
              console.error('Error in deep state subscriber:', error);
            }
          }
        });
      }
    }
  }

  /**
   * Add middleware for state changes
   */
  addMiddleware(middleware) {
    this.middleware.push(middleware);
  }

  /**
   * Computed properties that automatically update
   */
  computed(path, computeFn, dependencies = []) {
    const updateComputed = () => {
      const deps = dependencies.map(dep => this.getState(dep));
      const computedValue = computeFn(...deps);
      this.setState(path, computedValue, { silent: true, source: 'computed' });
    };

    // Subscribe to dependencies
    dependencies.forEach(dep => {
      this.subscribe(dep, updateComputed);
    });

    // Initial computation
    updateComputed();
  }

  /**
   * Action dispatcher with validation
   */
  dispatch(action, payload = {}) {
    const actionHandlers = {
      // Loading actions
      SET_LOADING: ({ isLoading, message = '', progress = 0 }) => {
        this.setState('isLoading', isLoading);
        this.setState('loadingMessage', message);
        this.setState('loadingProgress', progress);
      },

      // Workout actions
      LOAD_WORKOUT: workoutData => {
        this.setState('workout', workoutData);
        this.setState(
          'originalWorkout',
          JSON.parse(JSON.stringify(workoutData))
        );
        this.setState('undoStack', []);
        this.setState('redoStack', []);
        this.setState('activePanel', 'workout');
      },

      SELECT_SEGMENT: index => {
        this.setState('selectedSegmentIndex', index);
      },

      UPDATE_WORKOUT: workoutData => {
        const currentWorkout = this.getState('workout');
        if (currentWorkout) {
          this.setState('undoStack', [
            ...this.getState('undoStack'),
            currentWorkout,
          ]);
          this.setState('redoStack', []);
        }
        this.setState('workout', workoutData);
      },

      UNDO_WORKOUT: () => {
        const undoStack = this.getState('undoStack');
        const currentWorkout = this.getState('workout');

        if (undoStack.length > 0) {
          const previousWorkout = undoStack[undoStack.length - 1];
          this.setState('undoStack', undoStack.slice(0, -1));
          this.setState('redoStack', [
            ...this.getState('redoStack'),
            currentWorkout,
          ]);
          this.setState('workout', previousWorkout);
        }
      },

      REDO_WORKOUT: () => {
        const redoStack = this.getState('redoStack');
        const currentWorkout = this.getState('workout');

        if (redoStack.length > 0) {
          const nextWorkout = redoStack[redoStack.length - 1];
          this.setState('redoStack', redoStack.slice(0, -1));
          this.setState('undoStack', [
            ...this.getState('undoStack'),
            currentWorkout,
          ]);
          this.setState('workout', nextWorkout);
        }
      },

      // UI actions
      SET_ACTIVE_PANEL: panel => {
        this.setState('activePanel', panel);
      },

      TOGGLE_CHAT_PANEL: () => {
        const expanded = this.getState('chatPanelExpanded');
        this.setState('chatPanelExpanded', !expanded);
      },

      SET_THEME: theme => {
        this.setState('themeMode', theme);
        document.documentElement.classList.toggle('dark', theme === 'dark');
      },

      // Chart actions
      SET_CHART_INSTANCE: chartInstance => {
        this.setState('chartInstance', chartInstance);
      },

      UPDATE_CHART_DATA: data => {
        this.setState('chartData', data);
        const chart = this.getState('chartInstance');
        if (chart) {
          chart.data = data;
          chart.update();
        }
      },

      // Error actions
      ADD_ERROR: error => {
        const errors = this.getState('errors');
        this.setState('errors', [...errors, error]);
        this.setState('lastError', error);
      },

      CLEAR_ERRORS: () => {
        this.setState('errors', []);
        this.setState('lastError', null);
      },

      // Preference actions
      SET_FTP: ftp => {
        this.setState('ftp', ftp);
      },

      SET_UNITS: units => {
        this.setState('units', units);
      },
    };

    const handler = actionHandlers[action];
    if (handler) {
      try {
        handler(payload);
        return true;
      } catch (error) {
        console.error(`Error dispatching action ${action}:`, error);
        this.dispatch('ADD_ERROR', {
          type: 'ACTION_ERROR',
          message: `Failed to execute action: ${action}`,
          error,
          timestamp: Date.now(),
        });
        return false;
      }
    } else {
      console.warn(`Unknown action: ${action}`);
      return false;
    }
  }

  /**
   * Add to state history
   */
  addToHistory(change) {
    this.history.push(change);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * Get state change history
   */
  getHistory(filter = null) {
    if (filter) {
      return this.history.filter(filter);
    }
    return [...this.history];
  }

  /**
   * Setup performance monitoring
   */
  setupPerformanceMonitoring() {
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver(list => {
        const entries = list.getEntries();
        for (const entry of entries) {
          if (entry.entryType === 'navigation') {
            this.setState(
              'performanceMetrics.loadTime',
              entry.loadEventEnd - entry.loadEventStart
            );
          } else if (entry.entryType === 'paint') {
            if (entry.name === 'first-contentful-paint') {
              this.setState('performanceMetrics.renderTime', entry.startTime);
            }
          }
        }
      });

      this.performanceObserver.observe({ entryTypes: ['navigation', 'paint'] });
    }

    // Memory usage monitoring
    if ('memory' in performance) {
      setInterval(() => {
        this.setState(
          'performanceMetrics.memoryUsage',
          performance.memory.usedJSHeapSize
        );
      }, 10000);
    }
  }

  /**
   * Load user preferences from localStorage
   */
  loadPreferences() {
    try {
      const saved = localStorage.getItem('workout-visualizer-preferences');
      if (saved) {
        const preferences = JSON.parse(saved);
        this.setState('ftp', preferences.ftp || 250);
        this.setState('units', preferences.units || 'metric');
        this.setState('themeMode', preferences.theme || 'light');
      }
    } catch (error) {
      console.warn('Failed to load preferences:', error);
    }
  }

  /**
   * Setup auto-save for preferences
   */
  setupAutoSave() {
    const preferencePaths = ['ftp', 'units', 'themeMode'];

    preferencePaths.forEach(path => {
      this.subscribe(path, () => {
        this.savePreferences();
      });
    });
  }

  /**
   * Save preferences to localStorage
   */
  savePreferences() {
    try {
      const preferences = {
        ftp: this.getState('ftp'),
        units: this.getState('units'),
        theme: this.getState('themeMode'),
      };
      localStorage.setItem(
        'workout-visualizer-preferences',
        JSON.stringify(preferences)
      );
    } catch (error) {
      console.warn('Failed to save preferences:', error);
    }
  }

  /**
   * Debug utilities
   */
  debug() {
    return {
      state: { ...this.state },
      subscribers: Array.from(this.subscribers.keys()),
      history: this.getHistory(),
      performance: this.getState('performanceMetrics'),
    };
  }

  /**
   * Reset state to initial values
   */
  reset() {
    const initialState = {
      isLoading: false,
      loadingMessage: '',
      loadingProgress: 0,
      workout: null,
      originalWorkout: null,
      selectedSegmentIndex: null,
      undoStack: [],
      redoStack: [],
      activePanel: 'upload',
      chatPanelExpanded: false,
      chartInstance: null,
      chartData: null,
      chartOptions: null,
      errors: [],
      lastError: null,
    };

    Object.keys(initialState).forEach(key => {
      this.setState(key, initialState[key], { silent: true });
    });

    // Notify all subscribers
    this.subscribers.forEach((subs, path) => {
      const newValue = this.getState(path);
      subs.forEach(sub => {
        try {
          sub.callback(newValue, null, path);
        } catch (error) {
          console.error('Error in reset subscriber:', error);
        }
      });
    });
  }
}

// Export singleton instance
export const stateManager = new StateManager();

// Make globally accessible for debugging
if (typeof window !== 'undefined') {
  window.stateManager = stateManager;
}
