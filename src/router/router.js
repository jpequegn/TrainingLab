/**
 * Hash-based Router for TrainingLab
 * GitHub Pages compatible client-side routing
 */

import { createLogger } from '../utils/logger.js';

const logger = createLogger('Router');

export class Router {
  constructor(routes = {}) {
    this.routes = routes;
    this.currentRoute = null;
    this.listeners = [];
    this.beforeRouteChange = null;
    this.afterRouteChange = null;

    this.handleRouteChange = this.handleRouteChange.bind(this);
    this.init();
  }

  init() {
    // Listen to hash changes
    window.addEventListener('hashchange', this.handleRouteChange);
    window.addEventListener('load', this.handleRouteChange);

    logger.info('Router initialized');
  }

  /**
   * Add a route to the router
   * @param {string} path - Route path (e.g., '/dashboard', '/profile')
   * @param {Object} config - Route configuration
   */
  addRoute(path, config) {
    this.routes[path] = config;
    logger.debug(`Route added: ${path}`, config);
  }

  /**
   * Navigate to a specific route
   * @param {string} path - Route path to navigate to
   * @param {Object} state - Optional state object
   */
  navigate(path, state = null) {
    if (path === this.getCurrentPath()) {
      logger.debug('Already on target route:', path);
      return;
    }

    logger.info(`Navigating to: ${path}`);

    // Update hash without triggering hashchange event
    window.history.pushState(state, '', `#${path}`);

    // Manually trigger route change
    this.handleRouteChange();
  }

  /**
   * Replace current route without adding to history
   * @param {string} path - Route path to replace with
   * @param {Object} state - Optional state object
   */
  replace(path, state = null) {
    logger.info(`Replacing route with: ${path}`);
    window.history.replaceState(state, '', `#${path}`);
    this.handleRouteChange();
  }

  /**
   * Get current route path
   * @returns {string} Current route path
   */
  getCurrentPath() {
    return window.location.hash.slice(1) || '/';
  }

  /**
   * Handle route changes
   */
  async handleRouteChange() {
    const path = this.getCurrentPath();
    const route = this.matchRoute(path);

    logger.debug(`Route change detected: ${path}`, route);

    try {
      // Check if route change should proceed
      const shouldProceed = await this.executeBeforeRouteHook(route);
      if (!shouldProceed) {
        return;
      }

      // Cleanup and activate new route
      await this.activateRoute(route);

      // Post-activation tasks
      this.updateNavigationState(path);
      await this.executeAfterRouteHook(route);
      this.notifyRouteListeners(route);

      logger.info(`Route changed to: ${path}`);
    } catch (error) {
      this.handleRouteError(error, path);
    }
  }

  /**
   * Execute before route change hook
   */
  async executeBeforeRouteHook(route) {
    if (this.beforeRouteChange) {
      const shouldContinue = await this.beforeRouteChange(
        route,
        this.currentRoute
      );
      if (!shouldContinue) {
        logger.info('Route change cancelled by beforeRouteChange hook');
        return false;
      }
    }
    return true;
  }

  /**
   * Activate new route
   */
  async activateRoute(route) {
    // Cleanup current route
    this.cleanupCurrentRoute();

    // Set new route
    this.currentRoute = route;

    // Initialize and render new component
    await this.initializeRouteComponent(route);
  }

  /**
   * Cleanup current route component
   */
  cleanupCurrentRoute() {
    if (this.currentRoute?.component?.destroy) {
      this.currentRoute.component.destroy();
    }
  }

  /**
   * Initialize route component
   */
  async initializeRouteComponent(route) {
    console.log('Router: Initializing route component', route);

    if (route.component) {
      if (typeof route.component === 'function') {
        console.log(
          'Router: Instantiating component class with container:',
          route.container
        );

        // Resolve container selector to DOM element
        const containerElement = document.querySelector(route.container);
        if (!containerElement) {
          throw new Error(`Container element not found: ${route.container}`);
        }
        console.log('Router: Container element found:', containerElement);

        // Component is a class, instantiate it
        const componentInstance = new route.component(containerElement);
        console.log('Router: Component instantiated:', componentInstance);

        route.component = componentInstance;

        // Initialize the component
        if (route.component.init) {
          console.log('Router: Calling component.init()');
          await route.component.init();
        }
      }

      // Render the component
      if (route.component.render) {
        console.log('Router: Calling component.render()');
        await route.component.render();
      }
    } else {
      console.log('Router: No component found for route');
    }
  }

  /**
   * Execute after route change hook
   */
  async executeAfterRouteHook(route) {
    if (this.afterRouteChange) {
      await this.afterRouteChange(route, this.currentRoute);
    }
  }

  /**
   * Notify route change listeners
   */
  notifyRouteListeners(route) {
    this.listeners.forEach(listener => {
      try {
        listener(route, this.currentRoute);
      } catch (error) {
        logger.error('Error in route listener:', error);
      }
    });
  }

  /**
   * Handle route errors
   */
  handleRouteError(error, path) {
    logger.error('Error during route change:', error);

    // Navigate to error page or fallback
    if (path !== '/error') {
      this.navigate('/error');
    }
  }

  /**
   * Match a path to a route configuration
   * @param {string} path - Path to match
   * @returns {Object} Route configuration with matched parameters
   */
  matchRoute(path) {
    // Direct match
    if (this.routes[path]) {
      return {
        ...this.routes[path],
        path,
        params: {},
        query: this.parseQuery(),
      };
    }

    // Pattern matching for parameterized routes
    for (const routePath in this.routes) {
      const params = this.matchPattern(routePath, path);
      if (params !== null) {
        return {
          ...this.routes[routePath],
          path: routePath,
          params,
          query: this.parseQuery(),
        };
      }
    }

    // 404 - Route not found
    logger.warn(`Route not found: ${path}`);
    return (
      this.routes['/404'] || {
        path: '/404',
        component: null,
        params: {},
        query: this.parseQuery(),
      }
    );
  }

  /**
   * Match route pattern with parameters
   * @param {string} pattern - Route pattern (e.g., '/user/:id')
   * @param {string} path - Actual path (e.g., '/user/123')
   * @returns {Object|null} Parameters object or null if no match
   */
  matchPattern(pattern, path) {
    const patternParts = pattern.split('/').filter(Boolean);
    const pathParts = path.split('/').filter(Boolean);

    if (patternParts.length !== pathParts.length) {
      return null;
    }

    const params = {};

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];

      if (patternPart.startsWith(':')) {
        // Parameter
        const paramName = patternPart.slice(1);
        params[paramName] = decodeURIComponent(pathPart);
      } else if (patternPart !== pathPart) {
        // Literal part doesn't match
        return null;
      }
    }

    return params;
  }

  /**
   * Parse query parameters from URL
   * @returns {Object} Query parameters object
   */
  parseQuery() {
    const queryString = window.location.search.slice(1);
    const params = {};

    if (queryString) {
      queryString.split('&').forEach(param => {
        const [key, value] = param.split('=');
        if (key) {
          params[decodeURIComponent(key)] = value
            ? decodeURIComponent(value)
            : true;
        }
      });
    }

    return params;
  }

  /**
   * Update navigation active states
   * @param {string} currentPath - Current active path
   */
  updateNavigationState(currentPath) {
    const navLinks = document.querySelectorAll('[data-route]');
    navLinks.forEach(link => {
      const linkPath = link.dataset.route;
      link.classList.toggle('active', linkPath === currentPath);
    });

    // Update document title if route has title
    const route = this.routes[currentPath];
    if (route && route.title) {
      document.title = `${route.title} - TrainingLab`;
    }
  }

  /**
   * Add route change listener
   * @param {Function} callback - Callback function
   */
  addListener(callback) {
    this.listeners.push(callback);
  }

  /**
   * Remove route change listener
   * @param {Function} callback - Callback function to remove
   */
  removeListener(callback) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Set before route change hook
   * @param {Function} hook - Hook function that returns boolean
   */
  setBeforeRouteChange(hook) {
    this.beforeRouteChange = hook;
  }

  /**
   * Set after route change hook
   * @param {Function} hook - Hook function
   */
  setAfterRouteChange(hook) {
    this.afterRouteChange = hook;
  }

  /**
   * Get current route information
   * @returns {Object|null} Current route object
   */
  getCurrentRoute() {
    return this.currentRoute;
  }

  /**
   * Check if currently on specified path
   * @param {string} path - Path to check
   * @returns {boolean} True if on specified path
   */
  isCurrentPath(path) {
    return this.getCurrentPath() === path;
  }

  /**
   * Destroy router and cleanup
   */
  destroy() {
    window.removeEventListener('hashchange', this.handleRouteChange);
    window.removeEventListener('load', this.handleRouteChange);

    if (
      this.currentRoute &&
      this.currentRoute.component &&
      this.currentRoute.component.destroy
    ) {
      this.currentRoute.component.destroy();
    }

    this.listeners = [];
    logger.info('Router destroyed');
  }
}

export default Router;
