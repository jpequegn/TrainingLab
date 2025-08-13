# 🚀 Development Guide

This guide covers the development setup and hot reload capabilities for the Zwift Workout Visualizer.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server with Hot Reload

```bash
npm run dev
```

This command will:
- Start the Python backend server with auto-restart on file changes
- Launch Browser-sync proxy with live reload for frontend files
- Automatically open your default browser
- Watch for changes and reload the browser automatically

### 3. Alternative Development Commands

```bash
# Backend only (Python server with auto-restart)
npm run dev:server

# Frontend only (Browser-sync with live reload)
npm run dev:frontend

# Simple server (no hot reload)
npm run dev:simple
```

## Hot Reload Features

### 🔄 Automatic Reloading

The development server automatically reloads when you change:

- **Python Files**: `server.py`, `mcp_manager.py`, `mcp_tools.py`, configuration files
- **Frontend Files**: HTML, CSS, JavaScript, TypeScript files
- **Component Files**: All files in the `components/` directory
- **Utility Files**: Files in `utils/`, `src/` directories

### 🎯 Browser-Sync Features

When running `npm run dev`, you get additional features:

- **Live Reload**: Instant browser refresh on file changes
- **CSS Injection**: CSS changes are injected without full page reload
- **Synchronized Browsing**: Scroll, click, and form inputs are synchronized across multiple browsers/devices
- **Network Access**: Access your dev server from other devices on your network
- **Dev Tools UI**: Access Browser-sync UI at `http://localhost:3002`

### 🐛 Development Debugging

The development configuration (`dev-config.js`) provides:

- **Error Overlay**: Runtime errors are displayed with detailed information
- **Performance Monitoring**: Page load metrics are logged to console
- **Debug Logging**: Verbose logging for development insights
- **Development Styles**: Visual debugging aids for UI development

## Development Workflow

### 1. Start Development Mode

```bash
npm run dev
```

Your browser will open to `http://localhost:3001` (Browser-sync proxy)

### 2. Make Changes

- Edit HTML, CSS, or JavaScript files
- Changes are automatically detected and the browser reloads
- CSS changes are injected without full reload for faster development

### 3. Backend Changes

- Modify Python files (`server.py`, MCP files)
- The server automatically restarts
- Browser-sync detects the restart and reloads the page

### 4. TypeScript Development

```bash
# Watch TypeScript files and compile on changes
npm run build:watch

# Type-check without compilation
npm run type-check:watch
```

## Configuration Files

### `nodemon.json`
- Configures Python server auto-restart
- Watches Python files and JSON configs
- Sets development environment variables

### `bs-config.js`
- Browser-sync configuration
- Proxy settings for Python server
- File watching patterns
- CORS and middleware settings

### `dev-config.js`
- Development utilities and debugging
- Error handling and performance monitoring
- Environment detection and feature toggles

## Environment Variables

Development mode is automatically detected when:
- `NODE_ENV=development`
- `DEVELOPMENT=true`
- Running on `localhost` or `127.0.0.1`

## Debugging Tips

### 1. Console Logging

Development mode enables verbose logging:
```javascript
DevUtils.log('Debug information');
DevUtils.warn('Warning message');
DevUtils.error('Error details');
```

### 2. Performance Monitoring

Page load metrics are automatically logged:
```javascript
DevUtils.time('operation');
// ... your code
DevUtils.timeEnd('operation');
```

### 3. API Debugging

Development config provides proper API URLs:
```javascript
// Automatically handles proxy and development URLs
const apiUrl = DevUtils.getApiUrl('/api/endpoint');
```

### 4. Error Boundaries

Runtime errors and unhandled promises are automatically caught and logged in development mode.

## Troubleshooting

### Port Conflicts

If you encounter port conflicts:
- Python server runs on port `12000`
- Browser-sync proxy runs on port `3001` 
- Browser-sync UI runs on port `3002`

Change ports in `bs-config.js` if needed.

### File Watching Issues

If file changes aren't detected:
1. Check if files are in the watch patterns
2. Try restarting the dev server
3. Check `nodemon.json` and `bs-config.js` configurations

### Browser-Sync Not Working

If Browser-sync features aren't working:
1. Ensure you're accessing `http://localhost:3001` (not `12000`)
2. Check browser console for connection errors
3. Verify proxy configuration in `bs-config.js`

### Performance Issues

If development server is slow:
1. Reduce file watching scope in configurations
2. Use `npm run dev:server` for backend-only development
3. Use `npm run dev:frontend` for frontend-only development

## Production vs Development

### Development Features (Auto-enabled)
- Hot reload and live browser sync
- Verbose error logging and debugging
- Performance monitoring
- Development-only CSS styles
- Error boundaries and overlays

### Production Features (Auto-disabled)
- Optimized for performance
- Minimal logging
- Error reporting without debugging details
- Compressed assets and responses

The system automatically detects the environment and enables appropriate features.

## Testing with Hot Reload

```bash
# Run tests with file watching
npm run test:watch

# Run E2E tests (will use development server)
npm run test:e2e

# Type checking with watch mode
npm run type-check:watch
```

## Code Quality Integration

The hot reload setup integrates with code quality tools:

```bash
# Format code and reload
npm run format

# Lint and auto-fix issues  
npm run lint:fix

# Check all quality gates
npm run lint:all
```

## Next Steps

After setting up development environment:
1. Read [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) for UI guidelines
2. Check [docs/implementation-guide.md](docs/implementation-guide.md) for development patterns
3. Review TypeScript types in `src/types/` for data structures

---

Happy coding! 🎉