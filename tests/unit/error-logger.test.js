import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ErrorLogger,
  logFileUploadError,
  logParsingError,
} from '../../error-logger.js';

// Mock DOM methods
global.document = {
  createElement: vi.fn(() => ({
    style: {},
    innerHTML: '',
    appendChild: vi.fn(),
    removeChild: vi.fn(),
    click: vi.fn(),
  })),
  head: { appendChild: vi.fn() },
  body: { appendChild: vi.fn(), removeChild: vi.fn() },
  getElementById: vi.fn(() => null),
};

global.window = {
  addEventListener: vi.fn(),
  location: { href: 'http://localhost:8000' },
};

global.URL = {
  createObjectURL: vi.fn(() => 'blob:mock-url'),
  revokeObjectURL: vi.fn(),
};

global.navigator = {
  userAgent: 'Test Browser 1.0',
};

global.sessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
};

global.localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

global.fetch = vi.fn();

describe('ErrorLogger', () => {
  let errorLogger;

  beforeEach(() => {
    errorLogger = new ErrorLogger({
      enableConsoleLogging: false, // Disable for testing
      enableRemoteLogging: false,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    errorLogger.clearLogs();
  });

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      const logger = new ErrorLogger();

      expect(logger.config.enableConsoleLogging).toBe(true);
      expect(logger.config.logLevel).toBe('info');
      expect(logger.config.maxLogEntries).toBe(1000);
      expect(logger.logs).toEqual([]);
      expect(logger.errorCount).toBe(0);
      expect(logger.warningCount).toBe(0);
    });

    it('should accept custom configuration', () => {
      const customConfig = {
        enableConsoleLogging: false,
        logLevel: 'debug',
        maxLogEntries: 500,
        remoteEndpoint: 'https://api.example.com/logs',
      };

      const logger = new ErrorLogger(customConfig);

      expect(logger.config.enableConsoleLogging).toBe(false);
      expect(logger.config.logLevel).toBe('debug');
      expect(logger.config.maxLogEntries).toBe(500);
      expect(logger.config.remoteEndpoint).toBe('https://api.example.com/logs');
    });

    it('should setup global error handlers', () => {
      new ErrorLogger();

      expect(window.addEventListener).toHaveBeenCalledWith(
        'error',
        expect.any(Function)
      );
      expect(window.addEventListener).toHaveBeenCalledWith(
        'unhandledrejection',
        expect.any(Function)
      );
      expect(window.addEventListener).toHaveBeenCalledWith(
        'offline',
        expect.any(Function)
      );
      expect(window.addEventListener).toHaveBeenCalledWith(
        'online',
        expect.any(Function)
      );
    });
  });

  describe('Error Logging', () => {
    it('should log errors correctly', () => {
      const error = new Error('Test error');
      const context = { filename: 'test.js', lineno: 42 };

      const logId = errorLogger.logError(error, context);

      expect(logId).toBeDefined();
      expect(errorLogger.logs).toHaveLength(1);
      expect(errorLogger.errorCount).toBe(1);

      const logEntry = errorLogger.logs[0];
      expect(logEntry.level).toBe('error');
      expect(logEntry.message).toBe('Test error');
      expect(logEntry.context.filename).toBe('test.js');
      expect(logEntry.context.lineno).toBe(42);
      expect(logEntry.context.stack).toBeDefined();
    });

    it('should include environment information in error logs', () => {
      const error = new Error('Test error');

      errorLogger.logError(error);

      const logEntry = errorLogger.logs[0];
      expect(logEntry.context.userAgent).toBe('Test Browser 1.0');
      expect(logEntry.context.url).toBe('http://localhost:8000');
      expect(logEntry.timestamp).toBeDefined();
    });

    it('should send to remote logger when enabled', async () => {
      const logger = new ErrorLogger({
        enableRemoteLogging: true,
        remoteEndpoint: 'https://api.example.com/logs',
      });

      global.fetch = vi.fn().mockResolvedValue({ ok: true });

      const error = new Error('Remote test error');
      logger.logError(error);

      // Wait for async call
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(fetch).toHaveBeenCalledWith(
        'https://api.example.com/logs',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Remote test error'),
        })
      );
    });

    it('should handle remote logging failures gracefully', async () => {
      const logger = new ErrorLogger({
        enableRemoteLogging: true,
        remoteEndpoint: 'https://api.example.com/logs',
      });

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const error = new Error('Test error');
      logger.logError(error);

      // Wait for async call
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to send log to remote service:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Warning and Info Logging', () => {
    it('should log warnings correctly', () => {
      const logId = errorLogger.logWarning('Test warning', {
        component: 'uploader',
      });

      expect(logId).toBeDefined();
      expect(errorLogger.logs).toHaveLength(1);
      expect(errorLogger.warningCount).toBe(1);

      const logEntry = errorLogger.logs[0];
      expect(logEntry.level).toBe('warning');
      expect(logEntry.message).toBe('Test warning');
      expect(logEntry.context.component).toBe('uploader');
    });

    it('should log info messages correctly', () => {
      const logId = errorLogger.logInfo('Test info', { action: 'file-loaded' });

      expect(logId).toBeDefined();
      expect(errorLogger.logs).toHaveLength(1);

      const logEntry = errorLogger.logs[0];
      expect(logEntry.level).toBe('info');
      expect(logEntry.message).toBe('Test info');
      expect(logEntry.context.action).toBe('file-loaded');
    });

    it('should log debug messages when debug level is enabled', () => {
      const debugLogger = new ErrorLogger({ logLevel: 'debug' });

      const logId = debugLogger.logDebug('Debug message', { value: 42 });

      expect(logId).toBeDefined();
      expect(debugLogger.logs).toHaveLength(1);

      const logEntry = debugLogger.logs[0];
      expect(logEntry.level).toBe('debug');
      expect(logEntry.message).toBe('Debug message');
    });

    it('should not log debug messages when debug level is disabled', () => {
      const logId = errorLogger.logDebug('Debug message');

      expect(logId).toBeUndefined();
      expect(errorLogger.logs).toHaveLength(0);
    });
  });

  describe('Log Management', () => {
    it('should maintain maximum log entries', () => {
      const logger = new ErrorLogger({ maxLogEntries: 3 });

      logger.logError(new Error('Error 1'));
      logger.logError(new Error('Error 2'));
      logger.logError(new Error('Error 3'));
      logger.logError(new Error('Error 4'));

      expect(logger.logs).toHaveLength(3);
      expect(logger.logs[0].message).toBe('Error 4'); // Most recent first
      expect(logger.logs[2].message).toBe('Error 2'); // Oldest kept
    });

    it('should persist logs to localStorage', () => {
      errorLogger.logError(new Error('Persistent error'));

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'workoutLibrary_logs',
        expect.stringContaining('Persistent error')
      );
    });

    it('should handle localStorage failures gracefully', () => {
      localStorage.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });

      // Should not throw
      expect(() => {
        errorLogger.logError(new Error('Test error'));
      }).not.toThrow();
    });

    it('should load persisted logs', () => {
      const persistedLogs = [
        {
          id: 'log-1',
          level: 'error',
          message: 'Persisted error',
          timestamp: new Date().toISOString(),
        },
      ];

      localStorage.getItem.mockReturnValue(JSON.stringify(persistedLogs));

      const logger = new ErrorLogger();
      logger.loadPersistedLogs();

      expect(logger.logs).toHaveLength(1);
      expect(logger.logs[0].message).toBe('Persisted error');
    });

    it('should filter old logs when loading persisted logs', () => {
      const oldLog = {
        id: 'log-old',
        level: 'error',
        message: 'Old error',
        timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 48 hours ago
      };

      const recentLog = {
        id: 'log-recent',
        level: 'error',
        message: 'Recent error',
        timestamp: new Date().toISOString(),
      };

      localStorage.getItem.mockReturnValue(JSON.stringify([oldLog, recentLog]));

      const logger = new ErrorLogger();
      logger.loadPersistedLogs();

      expect(logger.logs).toHaveLength(1);
      expect(logger.logs[0].message).toBe('Recent error');
    });
  });

  describe('Log Retrieval and Statistics', () => {
    beforeEach(() => {
      errorLogger.logError(new Error('Error 1'));
      errorLogger.logError(new Error('Error 2'));
      errorLogger.logWarning('Warning 1');
      errorLogger.logInfo('Info 1');
    });

    it('should get all logs', () => {
      const logs = errorLogger.getLogs();

      expect(logs).toHaveLength(4);
    });

    it('should filter logs by level', () => {
      const errorLogs = errorLogger.getLogs('error');
      const warningLogs = errorLogger.getLogs('warning');

      expect(errorLogs).toHaveLength(2);
      expect(warningLogs).toHaveLength(1);
      expect(errorLogs[0].level).toBe('error');
      expect(warningLogs[0].level).toBe('warning');
    });

    it('should limit number of returned logs', () => {
      const limitedLogs = errorLogger.getLogs(null, 2);

      expect(limitedLogs).toHaveLength(2);
    });

    it('should provide accurate statistics', () => {
      const stats = errorLogger.getStats();

      expect(stats.totalLogs).toBe(4);
      expect(stats.errorCount).toBe(2);
      expect(stats.warningCount).toBe(1);
      expect(stats.lastError).toBeDefined();
      expect(stats.lastError.level).toBe('error');
    });

    it('should clear all logs', () => {
      errorLogger.clearLogs();

      expect(errorLogger.logs).toHaveLength(0);
      expect(errorLogger.errorCount).toBe(0);
      expect(errorLogger.warningCount).toBe(0);
      expect(localStorage.removeItem).toHaveBeenCalledWith(
        'workoutLibrary_logs'
      );
    });
  });

  describe('User-Friendly Messages', () => {
    it('should generate appropriate messages for different error types', () => {
      const testCases = [
        {
          type: 'file-upload',
          expected: 'There was a problem uploading your workout file',
        },
        {
          type: 'parsing',
          expected: 'Your workout file could not be read',
        },
        {
          type: 'network',
          expected: 'Connection problem',
        },
        {
          type: 'storage',
          expected: 'Unable to save your workout',
        },
      ];

      testCases.forEach(({ type, expected }) => {
        const message = errorLogger.getUserFriendlyMessage(
          new Error('Technical error'),
          { type }
        );
        expect(message).toContain(expected);
      });
    });

    it('should provide default message for unknown error types', () => {
      const message = errorLogger.getUserFriendlyMessage(
        new Error('Unknown error'),
        { type: 'unknown' }
      );

      expect(message).toContain('Something went wrong');
    });
  });

  describe('Helper Functions', () => {
    it('should log file upload errors with context', () => {
      const error = new Error('Upload failed');
      const filename = 'workout.zwo';

      const logId = logFileUploadError(error, filename);

      expect(logId).toBeDefined();
      // Test would need access to global errorLogger instance
    });

    it('should log parsing errors with content length', () => {
      const error = new Error('Parse failed');
      const content = 'xml content here';

      const logId = logParsingError(error, content);

      expect(logId).toBeDefined();
    });
  });

  describe('Session Management', () => {
    it('should generate session ID if not exists', () => {
      sessionStorage.getItem.mockReturnValue(null);

      const sessionId = errorLogger.getSessionId();

      expect(sessionId).toMatch(/^session-\d+-[a-z0-9]+$/);
      expect(sessionStorage.setItem).toHaveBeenCalledWith(
        'workoutLibrary_sessionId',
        sessionId
      );
    });

    it('should reuse existing session ID', () => {
      const existingSessionId = 'session-123-abc';
      sessionStorage.getItem.mockReturnValue(existingSessionId);

      const sessionId = errorLogger.getSessionId();

      expect(sessionId).toBe(existingSessionId);
      expect(sessionStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Export Functionality', () => {
    it('should export logs as JSON file', () => {
      errorLogger.logError(new Error('Export test'));

      const mockBlob = { type: 'application/json' };
      global.Blob = vi.fn(() => mockBlob);

      errorLogger.exportLogs();

      expect(Blob).toHaveBeenCalledWith(
        [expect.stringContaining('Export test')],
        { type: 'application/json' }
      );

      expect(document.createElement).toHaveBeenCalledWith('a');
    });
  });
});
