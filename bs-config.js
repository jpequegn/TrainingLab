// Browser-sync configuration for hot reload development
module.exports = {
  // Proxy the Python server
  proxy: 'http://localhost:12000',
  
  // Watch these files for changes
  files: [
    '*.html',
    '*.css', 
    '*.js',
    'components/*.js',
    'utils/*.js',
    'src/**/*.ts',
    'src/**/*.js',
    // Exclude node_modules and generated files
    '!node_modules/**/*',
    '!dist/**/*',
    '!*.min.js',
    '!*.min.css'
  ],
  
  // Browser-sync options
  port: 3001,
  open: true,
  notify: false,
  
  // UI options
  ui: {
    port: 3002
  },
  
  // Server options
  serveStatic: ['./'],
  
  // Reload delay to avoid multiple reloads
  reloadDelay: 500,
  
  // Watch options
  watchOptions: {
    ignoreInitial: true,
    ignored: [
      'node_modules',
      'dist',
      '*.log',
      '__pycache__',
      '*.pyc',
      '.git',
      '.pytest_cache',
      'coverage'
    ]
  },
  
  // CORS headers for development
  middleware: [
    {
      route: '/api',
      handle: function (req, res, next) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        next();
      }
    }
  ],
  
  // Ghost mode options (sync interactions across browsers)
  ghostMode: {
    clicks: true,
    forms: true,
    scroll: true
  },
  
  // Log level
  logLevel: 'info',
  
  // Snippet options
  snippet: true,
  
  // Reload on file change
  injectChanges: true,
  
  // Browser to open
  browser: 'default'
};