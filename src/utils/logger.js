/**
 * Production Logger Utility
 * Provides structured logging with environment-aware output
 */

import { ErrorLogger } from '../error/error-logger.js';

export class Logger {
  constructor() {
    this.isDevelopment =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '';

    this.errorLogger = new ErrorLogger({
      enableConsoleLogging: this.isDevelopment,
      enableRemoteLogging: !this.isDevelopment,
      logLevel: this.isDevelopment ? 'debug' : 'warn',
    });

    this.logLevels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    this.currentLogLevel = this.isDevelopment ? 0 : 2; // debug in dev, warn+ in prod
  }

  /**
   * Debug logging (development only)
   */
  debug(message, context = {}) {
    if (this.shouldLog('debug')) {
      if (this.isDevelopment) {
        console.log('🔧 [DEBUG]', message, context);
      }
      this.errorLogger.logInfo(`DEBUG: ${message}`, context);
    }
  }

  /**
   * Info logging
   */
  info(message, context = {}) {
    if (this.shouldLog('info')) {
      if (this.isDevelopment) {
        console.log('ℹ️ [INFO]', message, context);
      }
      this.errorLogger.logInfo(message, context);
    }
  }

  /**
   * Warning logging
   */
  warn(message, context = {}) {
    if (this.shouldLog('warn')) {
      if (this.isDevelopment) {
        console.warn('⚠️ [WARN]', message, context);
      }
      this.errorLogger.logWarning(message, context);
    }
  }

  /**
   * Error logging
   */
  error(message, error = null, context = {}) {
    if (this.shouldLog('error')) {
      if (this.isDevelopment) {
        console.error('🚨 [ERROR]', message, error, context);
      }

      const errorObj = error instanceof Error ? error : new Error(message);
      this.errorLogger.logError(errorObj, { message, ...context });
    }
  }

  /**
   * Performance logging
   */
  performance(operation, duration, context = {}) {
    if (this.isDevelopment && duration > 100) {
      // Log slow operations
      console.log('⏱️ [PERF]', `${operation}: ${duration}ms`, context);
    }

    this.errorLogger.logInfo(`Performance: ${operation}`, {
      duration,
      slow: duration > 100,
      ...context,
    });
  }

  /**
   * User action logging
   */
  userAction(action, context = {}) {
    this.info(`User Action: ${action}`, context);
  }

  /**
   * API call logging
   */
  apiCall(method, url, duration = null, status = null, context = {}) {
    const logData = {
      method,
      url,
      duration,
      status,
      ...context,
    };

    if (status >= 400) {
      this.error(`API Error: ${method} ${url}`, null, logData);
    } else if (this.isDevelopment) {
      this.debug(`API Call: ${method} ${url}`, logData);
    }
  }

  /**
   * Check if we should log at this level
   */
  shouldLog(level) {
    return this.logLevels[level] >= this.currentLogLevel;
  }

  /**
   * Set log level
   */
  setLogLevel(level) {
    if (this.logLevels.hasOwnProperty(level)) {
      this.currentLogLevel = this.logLevels[level];
    }
  }

  /**
   * Get logger instance for specific module
   */
  createModuleLogger(moduleName) {
    return {
      debug: (message, context) =>
        this.debug(`[${moduleName}] ${message}`, context),
      info: (message, context) =>
        this.info(`[${moduleName}] ${message}`, context),
      warn: (message, context) =>
        this.warn(`[${moduleName}] ${message}`, context),
      error: (message, error, context) =>
        this.error(`[${moduleName}] ${message}`, error, context),
      performance: (operation, duration, context) =>
        this.performance(`[${moduleName}] ${operation}`, duration, context),
      userAction: (action, context) =>
        this.userAction(`[${moduleName}] ${action}`, context),
      apiCall: (method, url, duration, status, context) =>
        this.apiCall(method, url, duration, status, {
          module: moduleName,
          ...context,
        }),
    };
  }
}

// Create singleton instance
export const logger = new Logger();

// Export module-specific loggers for common modules
export const createLogger = moduleName => logger.createModuleLogger(moduleName);

// Convenience exports
export const debugLog = (message, context) => logger.debug(message, context);
export const infoLog = (message, context) => logger.info(message, context);
export const warnLog = (message, context) => logger.warn(message, context);
export const errorLog = (message, error, context) =>
  logger.error(message, error, context);
