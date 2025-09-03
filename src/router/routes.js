/**
 * Route definitions for TrainingLab
 * Defines all available routes and their configurations
 */

// Import page components (will be created)
// import { DashboardPage } from '../pages/DashboardPage.js';
// import { VisualizerPage } from '../pages/VisualizerPage.js';
// import { ProfilePage } from '../pages/ProfilePage.js';
// import { HistoryPage } from '../pages/HistoryPage.js';
// import { LibraryPage } from '../pages/LibraryPage.js';
// import { NotFoundPage } from '../pages/NotFoundPage.js';

/**
 * Route configuration object
 * Each route can have:
 * - component: Page component class
 * - title: Page title for browser tab
 * - meta: Additional metadata
 * - guards: Route guards (for authentication, etc.)
 * - container: DOM container selector (defaults to '#app-content')
 */
export const routes = {
  '/': {
    title: 'Dashboard',
    component: null, // Will be set when DashboardPage is created
    meta: {
      description:
        'TrainingLab athlete dashboard with recent activities and quick actions',
      requiresAuth: false,
    },
    container: '#app-content',
  },

  '/dashboard': {
    title: 'Dashboard',
    component: null, // Alias for root route
    redirect: '/',
  },

  '/visualizer': {
    title: 'Workout Visualizer',
    component: null, // Will be set when VisualizerPage is created
    meta: {
      description: 'Analyze and visualize workout files',
      requiresAuth: false,
    },
    container: '#app-content',
  },

  '/profile': {
    title: 'User Profile',
    component: null, // Will be set when ProfilePage is created
    meta: {
      description: 'Manage user profile, preferences, and training settings',
      requiresAuth: false,
    },
    container: '#app-content',
  },

  '/history': {
    title: 'Training History',
    component: null, // Will be set when HistoryPage is created
    meta: {
      description: 'View training history, activities, and progress tracking',
      requiresAuth: false,
    },
    container: '#app-content',
  },

  '/library': {
    title: 'Workout Library',
    component: null, // Will be set when LibraryPage is created
    meta: {
      description: 'Browse and manage workout library and training plans',
      requiresAuth: false,
    },
    container: '#app-content',
  },

  '/settings': {
    title: 'Settings',
    component: null, // Could redirect to profile or be separate
    redirect: '/profile',
  },

  '/404': {
    title: 'Page Not Found',
    component: null, // Will be set when NotFoundPage is created
    meta: {
      description: 'The requested page could not be found',
      requiresAuth: false,
    },
    container: '#app-content',
  },

  '/error': {
    title: 'Error',
    component: null, // Error page component
    meta: {
      description: 'An error occurred while loading the page',
      requiresAuth: false,
    },
    container: '#app-content',
  },
};

/**
 * Navigation menu configuration
 * Defines the main navigation items and their properties
 */
export const navigationItems = [
  {
    path: '/',
    label: 'Dashboard',
    icon: 'fas fa-home',
    order: 1,
    visible: true,
  },
  {
    path: '/visualizer',
    label: 'Visualizer',
    icon: 'fas fa-chart-line',
    order: 2,
    visible: true,
  },
  {
    path: '/profile',
    label: 'Profile',
    icon: 'fas fa-user',
    order: 3,
    visible: true,
  },
  {
    path: '/history',
    label: 'History',
    icon: 'fas fa-history',
    order: 4,
    visible: true,
  },
  {
    path: '/library',
    label: 'Library',
    icon: 'fas fa-book',
    order: 5,
    visible: true,
  },
];

/**
 * Route utility functions
 */

/**
 * Get route configuration by path
 * @param {string} path - Route path
 * @returns {Object|null} Route configuration or null if not found
 */
export function getRoute(path) {
  return routes[path] || null;
}

/**
 * Get all navigation items sorted by order
 * @returns {Array} Sorted navigation items
 */
export function getNavigationItems() {
  return navigationItems
    .filter(item => item.visible)
    .sort((a, b) => a.order - b.order);
}

/**
 * Check if a route requires authentication
 * @param {string} path - Route path
 * @returns {boolean} True if authentication required
 */
export function requiresAuth(path) {
  const route = getRoute(path);
  return route?.meta?.requiresAuth || false;
}

/**
 * Get page title for a route
 * @param {string} path - Route path
 * @returns {string} Page title
 */
export function getPageTitle(path) {
  const route = getRoute(path);
  return route?.title || 'TrainingLab';
}

/**
 * Update route component after page component is loaded
 * @param {string} path - Route path
 * @param {Function} component - Page component class
 */
export function setRouteComponent(path, component) {
  if (routes[path]) {
    routes[path].component = component;
  }
}

export default routes;
