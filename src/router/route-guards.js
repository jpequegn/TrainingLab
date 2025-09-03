/**
 * Route Guards for TrainingLab
 * Handles authentication, authorization, and route access control
 */

import { createLogger } from '../utils/logger.js';

const logger = createLogger('RouteGuards');

/**
 * Route guard result types
 */
export const GUARD_RESULT = {
  ALLOW: 'allow',
  DENY: 'deny',
  REDIRECT: 'redirect',
};

/**
 * Base route guard class
 */
export class RouteGuard {
  constructor(name) {
    this.name = name;
  }

  /**
   * Check if route access should be allowed
   * @param {Object} route - Target route
   * @param {Object} fromRoute - Current route
   * @returns {Promise<Object>} Guard result
   */
  async canActivate(route, fromRoute) {
    return { result: GUARD_RESULT.ALLOW };
  }

  /**
   * Check if route can be left
   * @param {Object} route - Current route
   * @param {Object} toRoute - Target route
   * @returns {Promise<Object>} Guard result
   */
  async canDeactivate(route, toRoute) {
    return { result: GUARD_RESULT.ALLOW };
  }
}

/**
 * Authentication guard - checks if user is authenticated
 */
export class AuthGuard extends RouteGuard {
  constructor() {
    super('AuthGuard');
  }

  async canActivate(route, fromRoute) {
    // For now, always allow access (no authentication system yet)
    // In the future, this would check authentication status

    if (route.meta?.requiresAuth) {
      // Check if user is authenticated
      const isAuthenticated = this.isUserAuthenticated();

      if (!isAuthenticated) {
        logger.info(
          `AuthGuard: Access denied to ${route.path} - not authenticated`
        );
        return {
          result: GUARD_RESULT.REDIRECT,
          redirectTo: '/login',
        };
      }
    }

    return { result: GUARD_RESULT.ALLOW };
  }

  /**
   * Check if user is currently authenticated
   * @returns {boolean} Authentication status
   */
  isUserAuthenticated() {
    // TODO: Implement actual authentication check
    // For now, always return true since we don't have auth system
    return true;
  }
}

/**
 * Permission guard - checks if user has required permissions
 */
export class PermissionGuard extends RouteGuard {
  constructor() {
    super('PermissionGuard');
  }

  async canActivate(route, fromRoute) {
    const requiredPermissions = route.meta?.permissions;

    if (requiredPermissions) {
      const userPermissions = this.getUserPermissions();
      const hasPermission = this.checkPermissions(
        userPermissions,
        requiredPermissions
      );

      if (!hasPermission) {
        logger.info(
          `PermissionGuard: Access denied to ${route.path} - insufficient permissions`
        );
        return {
          result: GUARD_RESULT.REDIRECT,
          redirectTo: '/403',
        };
      }
    }

    return { result: GUARD_RESULT.ALLOW };
  }

  /**
   * Get current user permissions
   * @returns {Array} User permissions
   */
  getUserPermissions() {
    // TODO: Implement actual permission system
    // For now, return empty array
    return [];
  }

  /**
   * Check if user has required permissions
   * @param {Array} userPermissions - User's permissions
   * @param {Array} requiredPermissions - Required permissions
   * @returns {boolean} True if user has all required permissions
   */
  checkPermissions(userPermissions, requiredPermissions) {
    const permissions = Array.isArray(requiredPermissions)
      ? requiredPermissions
      : [requiredPermissions];

    return permissions.every(permission =>
      userPermissions.includes(permission)
    );
  }
}

/**
 * Data guard - ensures required data is loaded before route activation
 */
export class DataGuard extends RouteGuard {
  constructor() {
    super('DataGuard');
  }

  async canActivate(route, fromRoute) {
    const requiredData = route.meta?.requiredData;

    if (requiredData) {
      try {
        // Load required data
        await this.loadRequiredData(requiredData);
        logger.debug(`DataGuard: Required data loaded for ${route.path}`);
      } catch (error) {
        logger.error(
          `DataGuard: Failed to load required data for ${route.path}:`,
          error
        );
        return {
          result: GUARD_RESULT.REDIRECT,
          redirectTo: '/error',
        };
      }
    }

    return { result: GUARD_RESULT.ALLOW };
  }

  /**
   * Load required data for route
   * @param {Array|string} requiredData - Data requirements
   * @returns {Promise} Data loading promise
   */
  async loadRequiredData(requiredData) {
    const dataList = Array.isArray(requiredData)
      ? requiredData
      : [requiredData];

    const loadPromises = dataList.map(async dataType => {
      switch (dataType) {
        case 'userProfile':
          // Load user profile data
          // return await profileService.loadUserProfile();
          break;
        case 'workoutHistory':
          // Load workout history
          // return await historyService.loadHistory();
          break;
        default:
          logger.warn(`DataGuard: Unknown data type: ${dataType}`);
      }
    });

    await Promise.all(loadPromises);
  }
}

/**
 * Unsaved changes guard - prevents navigation if there are unsaved changes
 */
export class UnsavedChangesGuard extends RouteGuard {
  constructor() {
    super('UnsavedChangesGuard');
  }

  async canDeactivate(route, toRoute) {
    // Check if current page has unsaved changes
    const hasUnsavedChanges = this.checkUnsavedChanges(route);

    if (hasUnsavedChanges) {
      const userConfirmed = await this.confirmNavigation();

      if (!userConfirmed) {
        logger.info(
          'UnsavedChangesGuard: Navigation cancelled due to unsaved changes'
        );
        return { result: GUARD_RESULT.DENY };
      }
    }

    return { result: GUARD_RESULT.ALLOW };
  }

  /**
   * Check if current route has unsaved changes
   * @param {Object} route - Current route
   * @returns {boolean} True if there are unsaved changes
   */
  checkUnsavedChanges(route) {
    // Check if the current page component has unsaved changes
    if (
      route.component &&
      typeof route.component.hasUnsavedChanges === 'function'
    ) {
      return route.component.hasUnsavedChanges();
    }

    return false;
  }

  /**
   * Show confirmation dialog for navigation
   * @returns {Promise<boolean>} User confirmation result
   */
  async confirmNavigation() {
    return new Promise(resolve => {
      const userConfirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave this page?'
      );
      resolve(userConfirmed);
    });
  }
}

/**
 * Route guard manager
 */
export class RouteGuardManager {
  constructor() {
    this.guards = [];
    this.globalGuards = [];
  }

  /**
   * Add a global guard that runs on all routes
   * @param {RouteGuard} guard - Guard instance
   */
  addGlobalGuard(guard) {
    this.globalGuards.push(guard);
    logger.debug(`Global guard added: ${guard.name}`);
  }

  /**
   * Add a route-specific guard
   * @param {string} routePath - Route path
   * @param {RouteGuard} guard - Guard instance
   */
  addRouteGuard(routePath, guard) {
    this.guards.push({ routePath, guard });
    logger.debug(`Route guard added for ${routePath}: ${guard.name}`);
  }

  /**
   * Check if route activation is allowed
   * @param {Object} route - Target route
   * @param {Object} fromRoute - Current route
   * @returns {Promise<Object>} Guard result
   */
  async canActivate(route, fromRoute) {
    // Run global guards first
    for (const guard of this.globalGuards) {
      const result = await guard.canActivate(route, fromRoute);
      if (result.result !== GUARD_RESULT.ALLOW) {
        return result;
      }
    }

    // Run route-specific guards
    const routeGuards = this.guards.filter(g => g.routePath === route.path);
    for (const { guard } of routeGuards) {
      const result = await guard.canActivate(route, fromRoute);
      if (result.result !== GUARD_RESULT.ALLOW) {
        return result;
      }
    }

    return { result: GUARD_RESULT.ALLOW };
  }

  /**
   * Check if route deactivation is allowed
   * @param {Object} route - Current route
   * @param {Object} toRoute - Target route
   * @returns {Promise<Object>} Guard result
   */
  async canDeactivate(route, toRoute) {
    // Run global guards
    for (const guard of this.globalGuards) {
      const result = await guard.canDeactivate(route, toRoute);
      if (result.result !== GUARD_RESULT.ALLOW) {
        return result;
      }
    }

    // Run route-specific guards
    const routeGuards = this.guards.filter(g => g.routePath === route.path);
    for (const { guard } of routeGuards) {
      const result = await guard.canDeactivate(route, toRoute);
      if (result.result !== GUARD_RESULT.ALLOW) {
        return result;
      }
    }

    return { result: GUARD_RESULT.ALLOW };
  }
}

// Create default guard manager instance
export const routeGuardManager = new RouteGuardManager();

// Add default guards
routeGuardManager.addGlobalGuard(new AuthGuard());
routeGuardManager.addGlobalGuard(new PermissionGuard());
routeGuardManager.addGlobalGuard(new DataGuard());
routeGuardManager.addGlobalGuard(new UnsavedChangesGuard());
