/**
 * Error Logger and Handler for WorkoutLibrary
 * Provides comprehensive error logging, reporting, and user feedback
 */

export class ErrorLogger {
  constructor(config = {}) {
    this.config = {
      enableConsoleLogging: config.enableConsoleLogging ?? true,
      enableRemoteLogging: config.enableRemoteLogging ?? false,
      logLevel: config.logLevel || 'info',
      maxLogEntries: config.maxLogEntries || 1000,
      remoteEndpoint: config.remoteEndpoint || null,
      ...config,
    };

    this.logs = [];
    this.errorCount = 0;
    this.warningCount = 0;

    // Initialize error boundaries
    this.setupGlobalErrorHandlers();
  }

  /**
   * Setup global error handlers
   */
  setupGlobalErrorHandlers() {
    // Handle uncaught JavaScript errors
    window.addEventListener('error', event => {
      this.logError(event.error || new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'uncaught-error',
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', event => {
      this.logError(new Error(`Unhandled Promise Rejection: ${event.reason}`), {
        type: 'unhandled-rejection',
        reason: event.reason,
      });
    });

    // Handle network errors
    window.addEventListener('offline', () => {
      this.logWarning('Network connection lost', { type: 'network' });
    });

    window.addEventListener('online', () => {
      this.logInfo('Network connection restored', { type: 'network' });
    });
  }

  /**
   * Log an error with context
   */
  logError(error, context = {}) {
    const logEntry = this.createLogEntry('error', error.message, {
      ...context,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });

    this.addLogEntry(logEntry);
    this.errorCount++;

    if (this.config.enableConsoleLogging) {
      console.error('🚨 Error:', error.message, context);
    }

    // Send to remote logging service
    if (this.config.enableRemoteLogging) {
      this.sendToRemoteLogger(logEntry);
    }

    // Show user-friendly error message
    this.showUserError(error, context);

    return logEntry.id;
  }

  /**
   * Log a warning
   */
  logWarning(message, context = {}) {
    const logEntry = this.createLogEntry('warning', message, {
      ...context,
      timestamp: new Date().toISOString(),
    });

    this.addLogEntry(logEntry);
    this.warningCount++;

    if (this.config.enableConsoleLogging) {
      console.warn('⚠️ Warning:', message, context);
    }

    return logEntry.id;
  }

  /**
   * Log an info message
   */
  logInfo(message, context = {}) {
    const logEntry = this.createLogEntry('info', message, {
      ...context,
      timestamp: new Date().toISOString(),
    });

    this.addLogEntry(logEntry);

    if (this.config.enableConsoleLogging && this.config.logLevel === 'debug') {
      console.info('ℹ️ Info:', message, context);
    }

    return logEntry.id;
  }

  /**
   * Log debug information
   */
  logDebug(message, context = {}) {
    if (this.config.logLevel !== 'debug') return;

    const logEntry = this.createLogEntry('debug', message, {
      ...context,
      timestamp: new Date().toISOString(),
    });

    this.addLogEntry(logEntry);

    if (this.config.enableConsoleLogging) {
      console.debug('🐛 Debug:', message, context);
    }

    return logEntry.id;
  }

  /**
   * Create a structured log entry
   */
  createLogEntry(level, message, context) {
    return {
      id: this.generateLogId(),
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId(),
    };
  }

  /**
   * Add log entry to internal storage
   */
  addLogEntry(entry) {
    this.logs.unshift(entry);

    // Maintain max log entries
    if (this.logs.length > this.config.maxLogEntries) {
      this.logs = this.logs.slice(0, this.config.maxLogEntries);
    }

    // Store in localStorage for persistence
    try {
      const recentLogs = this.logs.slice(0, 100); // Store only recent logs
      localStorage.setItem('workoutLibrary_logs', JSON.stringify(recentLogs));
    } catch (e) {
      // Storage might be full, continue without storing
    }
  }

  /**
   * Send log entry to remote logging service
   */
  async sendToRemoteLogger(logEntry) {
    if (!this.config.remoteEndpoint) return;

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...logEntry,
          application: 'WorkoutLibrary',
          version: '1.0.0',
        }),
      });
    } catch (error) {
      console.warn('Failed to send log to remote service:', error);
    }
  }

  /**
   * Show user-friendly error message
   */
  showUserError(error, context) {
    const userMessage = this.getUserFriendlyMessage(error, context);

    // Create or update error notification
    let errorElement = document.getElementById('error-notification');
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.id = 'error-notification';
      errorElement.className = 'error-notification';
      document.body.appendChild(errorElement);
    }

    errorElement.innerHTML = `
            <div class="error-content">
                <span class="error-icon">⚠️</span>
                <span class="error-message">${userMessage}</span>
                <button class="error-close" onclick="this.parentElement.parentElement.style.display='none'">×</button>
            </div>
        `;

    errorElement.style.display = 'block';

    // Auto-hide after 10 seconds
    setTimeout(() => {
      errorElement.style.display = 'none';
    }, 10000);
  }

  /**
   * Generate user-friendly error messages
   */
  getUserFriendlyMessage(error, context) {
    const errorType = context.type || 'general';

    const friendlyMessages = {
      'file-upload':
        'There was a problem uploading your workout file. Please check the file format and try again.',
      parsing:
        "Your workout file could not be read. Please ensure it's a valid .zwo file.",
      network:
        'Connection problem. Please check your internet connection and try again.',
      storage:
        'Unable to save your workout. Your browser storage might be full.',
      'chart-render':
        'There was a problem displaying the workout chart. Try refreshing the page.',
      'uncaught-error':
        'An unexpected error occurred. The page will continue to work, but some features might be affected.',
      'unhandled-rejection':
        'A background operation failed. Your work has been saved, but please refresh the page.',
    };

    return (
      friendlyMessages[errorType] ||
      'Something went wrong. Please try again or refresh the page if the problem persists.'
    );
  }

  /**
   * Get current logs
   */
  getLogs(level = null, limit = 100) {
    let filteredLogs = this.logs;

    if (level) {
      filteredLogs = this.logs.filter(log => log.level === level);
    }

    return filteredLogs.slice(0, limit);
  }

  /**
   * Get error statistics
   */
  getStats() {
    return {
      totalLogs: this.logs.length,
      errorCount: this.errorCount,
      warningCount: this.warningCount,
      lastError: this.logs.find(log => log.level === 'error'),
      recentErrors: this.logs.filter(
        log =>
          log.level === 'error' &&
          new Date(log.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      ).length,
    };
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
    this.errorCount = 0;
    this.warningCount = 0;

    try {
      localStorage.removeItem('workoutLibrary_logs');
    } catch (e) {
      // Ignore storage errors
    }
  }

  /**
   * Export logs for debugging
   */
  exportLogs() {
    const exportData = {
      logs: this.logs,
      stats: this.getStats(),
      config: this.config,
      exportDate: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `workout-library-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Generate unique log ID
   */
  generateLogId() {
    return `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get or create session ID
   */
  getSessionId() {
    let sessionId = sessionStorage.getItem('workoutLibrary_sessionId');
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('workoutLibrary_sessionId', sessionId);
    }
    return sessionId;
  }

  /**
   * Load persisted logs from localStorage
   */
  loadPersistedLogs() {
    try {
      const stored = localStorage.getItem('workoutLibrary_logs');
      if (stored) {
        const logs = JSON.parse(stored);
        this.logs = logs.filter(
          log =>
            new Date(log.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        );
      }
    } catch (e) {
      console.warn('Failed to load persisted logs:', e);
    }
  }
}

// CSS for error notifications
const errorNotificationCSS = `
.error-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    max-width: 400px;
    background: #f8d7da;
    border: 1px solid #f5c6cb;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    display: none;
    animation: slideIn 0.3s ease-out;
}

.error-content {
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
}

.error-icon {
    font-size: 20px;
    flex-shrink: 0;
}

.error-message {
    color: #721c24;
    font-size: 14px;
    line-height: 1.4;
    flex-grow: 1;
}

.error-close {
    background: none;
    border: none;
    font-size: 18px;
    color: #721c24;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
}

.error-close:hover {
    background: #f5c6cb;
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@media (max-width: 768px) {
    .error-notification {
        left: 20px;
        right: 20px;
        max-width: none;
    }
}
`;

// Inject CSS
const style = document.createElement('style');
style.textContent = errorNotificationCSS;
document.head.appendChild(style);

// Create and export global error logger instance
export const errorLogger = new ErrorLogger({
  enableConsoleLogging: true,
  enableRemoteLogging: false, // Set to true when remote endpoint is configured
  logLevel: 'info',
});

// Load any persisted logs
errorLogger.loadPersistedLogs();

// Export helper functions for common error types
export const logFileUploadError = (error, filename) => {
  return errorLogger.logError(error, { type: 'file-upload', filename });
};

export const logParsingError = (error, fileContent) => {
  return errorLogger.logError(error, {
    type: 'parsing',
    contentLength: fileContent?.length || 0,
  });
};

export const logNetworkError = (error, url) => {
  return errorLogger.logError(error, { type: 'network', url });
};

export const logStorageError = (error, operation) => {
  return errorLogger.logError(error, { type: 'storage', operation });
};

export const logChartError = (error, chartType) => {
  return errorLogger.logError(error, { type: 'chart-render', chartType });
};
