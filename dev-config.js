/**
 * Development configuration for hot reload and enhanced developer experience
 */

// Development environment detection
const isDevelopment = process.env.NODE_ENV === 'development' || 
                     process.env.DEVELOPMENT === 'true' ||
                     window.location.hostname === 'localhost' ||
                     window.location.hostname === '127.0.0.1';

// Hot reload configuration
const DEV_CONFIG = {
  // Enable hot reload features
  hotReload: isDevelopment,
  
  // Auto-reload interval for fallback (if WebSocket fails)
  reloadInterval: 5000,
  
  // Debug logging
  debug: isDevelopment,
  
  // Error overlay
  errorOverlay: isDevelopment,
  
  // Performance monitoring
  performanceLogging: isDevelopment,
  
  // API endpoints
  apiBase: isDevelopment ? 'http://localhost:12000' : window.location.origin,
  
  // Browser-sync proxy port (when using npm run dev)
  proxyPort: 3001,
  
  // Features for development
  features: {
    // Show debug information
    debugInfo: isDevelopment,
    // Console logging
    verboseLogging: isDevelopment,
    // Error boundaries
    errorBoundaries: true,
    // Performance metrics
    performanceMetrics: isDevelopment
  }
};

// Error overlay for development
if (DEV_CONFIG.errorOverlay && typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (DEV_CONFIG.debug) {
      console.error('🚨 Runtime Error:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (DEV_CONFIG.debug) {
      console.error('🚨 Unhandled Promise Rejection:', event.reason);
    }
  });
}

// Performance monitoring for development
if (DEV_CONFIG.performanceLogging && typeof window !== 'undefined') {
  // Monitor page load performance
  window.addEventListener('load', () => {
    setTimeout(() => {
      const perfData = performance.getEntriesByType('navigation')[0];
      if (perfData && DEV_CONFIG.debug) {
        console.log('📊 Page Performance:', {
          domContentLoaded: Math.round(perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart),
          loadComplete: Math.round(perfData.loadEventEnd - perfData.loadEventStart),
          domInteractive: Math.round(perfData.domInteractive - perfData.fetchStart),
          totalTime: Math.round(perfData.loadEventEnd - perfData.fetchStart)
        });
      }
    }, 100);
  });
}

// Development utilities
const DevUtils = {
  log: (...args) => {
    if (DEV_CONFIG.debug) {
      console.log('🔧 [DEV]', ...args);
    }
  },
  
  warn: (...args) => {
    if (DEV_CONFIG.debug) {
      console.warn('⚠️ [DEV]', ...args);
    }
  },
  
  error: (...args) => {
    if (DEV_CONFIG.debug) {
      console.error('🚨 [DEV]', ...args);
    }
  },
  
  time: (label) => {
    if (DEV_CONFIG.debug) {
      console.time(`⏱️ [DEV] ${label}`);
    }
  },
  
  timeEnd: (label) => {
    if (DEV_CONFIG.debug) {
      console.timeEnd(`⏱️ [DEV] ${label}`);
    }
  },
  
  // Check if running in hot reload mode
  isHotReload: () => {
    return DEV_CONFIG.hotReload && 
           (window.location.port === '3001' || // browser-sync proxy port
            document.querySelector('script[src*="browser-sync"]'));
  },
  
  // Get appropriate API base URL
  getApiUrl: (endpoint = '') => {
    const base = DevUtils.isHotReload() ? 'http://localhost:12000' : DEV_CONFIG.apiBase;
    return base + (endpoint.startsWith('/') ? endpoint : '/' + endpoint);
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DEV_CONFIG, DevUtils };
} else if (typeof window !== 'undefined') {
  window.DEV_CONFIG = DEV_CONFIG;
  window.DevUtils = DevUtils;
}

// Initialize development features
if (DEV_CONFIG.hotReload && typeof window !== 'undefined') {
  DevUtils.log('🚀 Development mode enabled with hot reload');
  DevUtils.log('📋 Config:', DEV_CONFIG);
  
  // Add development CSS for debugging (if not already added)
  if (!document.querySelector('#dev-styles')) {
    const devStyles = document.createElement('style');
    devStyles.id = 'dev-styles';
    devStyles.textContent = `
      /* Development-only styles */
      .dev-debug {
        outline: 2px dashed #ff6b6b !important;
        outline-offset: 2px !important;
      }
      
      .dev-error {
        background: rgba(255, 107, 107, 0.1) !important;
        border: 1px solid #ff6b6b !important;
      }
      
      .dev-performance-slow {
        background: rgba(255, 193, 7, 0.1) !important;
        border-left: 3px solid #ffc107 !important;
      }
      
      /* Hide in production */
      @media (max-width: 0px) {
        .dev-debug,
        .dev-error,
        .dev-performance-slow {
          outline: none !important;
          background: none !important;
          border: none !important;
        }
      }
    `;
    document.head.appendChild(devStyles);
  }
}