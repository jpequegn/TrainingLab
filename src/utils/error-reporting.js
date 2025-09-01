/**
 * Error Reporting Service Integration
 * Provides integration with error reporting services like Sentry, Bugsnag, etc.
 */

import { createLogger } from './logger.js';

const logger = createLogger('ErrorReporting');

export class ErrorReportingService {
  constructor(config = {}) {
    this.config = {
      enabled: config.enabled ?? this.shouldEnableReporting(),
      endpoint: config.endpoint || this.getDefaultEndpoint(),
      apiKey: config.apiKey || null,
      environment: config.environment || this.getEnvironment(),
      release: config.release || this.getRelease(),
      maxReports: config.maxReports || 50, // Max reports per session
      rateLimitWindow: config.rateLimitWindow || 60000, // 1 minute
      ...config
    };

    this.reportCount = 0;
    this.reportedErrors = new Map(); // Deduplication
    this.rateLimiter = new Map(); // Rate limiting by error type
    
    logger.debug('Error reporting service initialized', {
      enabled: this.config.enabled,
      environment: this.config.environment
    });
  }

  /**
   * Report an error to the external service
   */
  async reportError(error, context = {}) {
    if (!this.config.enabled || !this.shouldReport(error)) {
      return false;
    }

    try {
      const errorReport = this.createErrorReport(error, context);
      const success = await this.sendReport(errorReport);
      
      if (success) {
        this.trackReportedError(error);
        logger.debug('Error reported successfully', { 
          error: error.message,
          context 
        });
      }
      
      return success;
    } catch (reportingError) {
      logger.warn('Failed to report error', reportingError, { 
        originalError: error.message 
      });
      return false;
    }
  }

  /**
   * Report a performance issue
   */
  async reportPerformance(metric, value, context = {}) {
    if (!this.config.enabled) {
      return false;
    }

    try {
      const performanceReport = {
        type: 'performance',
        metric,
        value,
        context: {
          ...context,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        }
      };

      return await this.sendReport(performanceReport);
    } catch (error) {
      logger.warn('Failed to report performance metric', error, { metric, value });
      return false;
    }
  }

  /**
   * Report a user action or event
   */
  async reportEvent(eventName, data = {}) {
    if (!this.config.enabled) {
      return false;
    }

    try {
      const eventReport = {
        type: 'event',
        eventName,
        data: {
          ...data,
          timestamp: new Date().toISOString(),
          sessionId: this.getSessionId()
        }
      };

      return await this.sendReport(eventReport);
    } catch (error) {
      logger.warn('Failed to report event', error, { eventName });
      return false;
    }
  }

  /**
   * Create structured error report
   */
  createErrorReport(error, context) {
    const report = {
      type: 'error',
      timestamp: new Date().toISOString(),
      environment: this.config.environment,
      release: this.config.release,
      sessionId: this.getSessionId(),
      
      // Error details
      error: {
        message: error.message,
        name: error.name,
        stack: error.stack,
        cause: error.cause?.toString()
      },

      // Context
      context: {
        ...context,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        screen: {
          width: window.screen.width,
          height: window.screen.height
        }
      },

      // Browser info
      browser: this.getBrowserInfo(),
      
      // Performance info
      performance: this.getPerformanceInfo(),

      // User info (anonymized)
      user: this.getUserInfo()
    };

    return report;
  }

  /**
   * Send report to external service
   */
  async sendReport(report) {
    if (!this.config.endpoint) {
      logger.debug('No endpoint configured, storing report locally', report);
      this.storeReportLocally(report);
      return true;
    }

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        body: JSON.stringify(report)
      });

      if (!response.ok) {
        throw new Error(`Report service responded with status ${response.status}`);
      }

      return true;
    } catch (error) {
      logger.warn('Failed to send report to external service', error);
      // Fallback to local storage
      this.storeReportLocally(report);
      return false;
    }
  }

  /**
   * Store report locally as fallback
   */
  storeReportLocally(report) {
    try {
      const reports = JSON.parse(localStorage.getItem('errorReports') || '[]');
      reports.push(report);
      
      // Keep only recent reports
      const maxLocalReports = 20;
      if (reports.length > maxLocalReports) {
        reports.splice(0, reports.length - maxLocalReports);
      }
      
      localStorage.setItem('errorReports', JSON.stringify(reports));
    } catch (error) {
      logger.warn('Failed to store report locally', error);
    }
  }

  /**
   * Determine if we should report this error
   */
  shouldReport(error) {
    // Check rate limits
    if (this.reportCount >= this.config.maxReports) {
      return false;
    }

    // Check for duplicate errors
    const errorKey = this.getErrorKey(error);
    if (this.reportedErrors.has(errorKey)) {
      const lastReported = this.reportedErrors.get(errorKey);
      if (Date.now() - lastReported < this.config.rateLimitWindow) {
        return false; // Too soon since last report of this error
      }
    }

    // Don't report certain types of errors
    if (this.isIgnoredError(error)) {
      return false;
    }

    return true;
  }

  /**
   * Track that we've reported this error
   */
  trackReportedError(error) {
    const errorKey = this.getErrorKey(error);
    this.reportedErrors.set(errorKey, Date.now());
    this.reportCount++;
  }

  /**
   * Generate unique key for error deduplication
   */
  getErrorKey(error) {
    return `${error.name}:${error.message}:${this.getStackTopFrame(error.stack)}`;
  }

  /**
   * Get top frame from stack trace
   */
  getStackTopFrame(stack) {
    if (!stack) return 'unknown';
    
    const lines = stack.split('\n');
    const firstFrame = lines.find(line => line.trim().startsWith('at '));
    return firstFrame ? firstFrame.trim().slice(0, 100) : 'unknown';
  }

  /**
   * Check if error should be ignored
   */
  isIgnoredError(error) {
    const ignoredPatterns = [
      /Script error/i,
      /Non-Error promise rejection captured/i,
      /ResizeObserver loop limit exceeded/i,
      /Network request failed/i
    ];

    return ignoredPatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * Determine if error reporting should be enabled
   */
  shouldEnableReporting() {
    // Enable in production, disable in development
    return typeof window !== 'undefined' && 
           window.location.hostname !== 'localhost' &&
           window.location.hostname !== '127.0.0.1';
  }

  /**
   * Get default endpoint based on environment
   */
  getDefaultEndpoint() {
    // In a real implementation, this would be configured
    return null; // Will store locally if no endpoint
  }

  /**
   * Get current environment
   */
  getEnvironment() {
    if (typeof window === 'undefined') return 'server';
    
    const {hostname} = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'development';
    } else if (hostname.includes('staging') || hostname.includes('test')) {
      return 'staging';
    } else {
      return 'production';
    }
  }

  /**
   * Get application release/version
   */
  getRelease() {
    // Try to get version from meta tag or package info
    const versionMeta = document.querySelector('meta[name="version"]');
    if (versionMeta) {
      return versionMeta.content;
    }
    
    // Fallback to git hash or timestamp
    return `build-${new Date().toISOString().split('T')[0]}`;
  }

  /**
   * Get or create session ID
   */
  getSessionId() {
    if (!this.sessionId) {
      this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    return this.sessionId;
  }

  /**
   * Get browser information
   */
  getBrowserInfo() {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    };
  }

  /**
   * Get performance information
   */
  getPerformanceInfo() {
    if (!window.performance) return {};

    return {
      memory: window.performance.memory ? {
        usedJSHeapSize: window.performance.memory.usedJSHeapSize,
        totalJSHeapSize: window.performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: window.performance.memory.jsHeapSizeLimit
      } : undefined,
      navigation: window.performance.navigation ? {
        type: window.performance.navigation.type,
        redirectCount: window.performance.navigation.redirectCount
      } : undefined,
      timing: window.performance.timing ? {
        loadComplete: window.performance.timing.loadEventEnd - window.performance.timing.navigationStart,
        domReady: window.performance.timing.domContentLoadedEventEnd - window.performance.timing.navigationStart
      } : undefined
    };
  }

  /**
   * Get anonymized user information
   */
  getUserInfo() {
    return {
      // No personally identifiable information
      sessionLength: Date.now() - (this.sessionStart || Date.now()),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: navigator.language
    };
  }

  /**
   * Get locally stored reports
   */
  getLocalReports() {
    try {
      return JSON.parse(localStorage.getItem('errorReports') || '[]');
    } catch (error) {
      logger.warn('Failed to retrieve local reports', error);
      return [];
    }
  }

  /**
   * Clear locally stored reports
   */
  clearLocalReports() {
    try {
      localStorage.removeItem('errorReports');
      return true;
    } catch (error) {
      logger.warn('Failed to clear local reports', error);
      return false;
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      reportCount: this.reportCount,
      reportedErrorsCount: this.reportedErrors.size,
      enabled: this.config.enabled,
      environment: this.config.environment,
      localReportsCount: this.getLocalReports().length
    };
  }
}

// Create singleton instance
export const errorReporting = new ErrorReportingService();

// Helper functions
export const reportError = (error, context) => errorReporting.reportError(error, context);
export const reportPerformance = (metric, value, context) => errorReporting.reportPerformance(metric, value, context);
export const reportEvent = (eventName, data) => errorReporting.reportEvent(eventName, data);