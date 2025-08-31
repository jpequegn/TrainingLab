/**
 * Utility Functions Index
 * Central export for all utility modules
 */

// Logging
export { createLogger, logger, debugLog, infoLog, warnLog, errorLog } from './logger.js';

// DOM Management
export { domCache, $, $$, $id } from './dom-cache.js';

// Event Management  
export { 
  eventManager, 
  addListener, 
  removeListener, 
  delegateListener, 
  createEventScope 
} from './event-manager.js';

// Error Reporting
export { 
  errorReporting, 
  reportError, 
  reportPerformance, 
  reportEvent 
} from './error-reporting.js';

// Security
export {
  escapeHtml,
  safeSetText,
  safeCreateElement,
  safeAppendChildren,
  safeClearElement,
  safeTemplate,
  validateFileUpload,
  sanitizeXmlContent,
  generateCSPNonce
} from './security.js';