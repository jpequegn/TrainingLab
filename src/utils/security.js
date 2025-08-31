/**
 * Security Utilities
 * Provides functions for safe DOM manipulation and input sanitization
 */

/**
 * Escapes HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} HTML-escaped text
 */
export function escapeHtml(text) {
  if (typeof text !== 'string') {
    return String(text);
  }

  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Safely sets text content of an element
 * @param {HTMLElement} element - Target element
 * @param {string} text - Text content to set
 */
export function safeSetText(element, text) {
  if (!element) return;
  element.textContent = text;
}

/**
 * Safely creates a DOM element with text content
 * @param {string} tagName - HTML tag name
 * @param {string} textContent - Text content
 * @param {Object} attributes - Element attributes
 * @returns {HTMLElement} Created element
 */
export function safeCreateElement(tagName, textContent = '', attributes = {}) {
  const element = document.createElement(tagName);

  if (textContent) {
    element.textContent = textContent;
  }

  // Set attributes safely
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'dataset') {
      Object.entries(value).forEach(([dataKey, dataValue]) => {
        element.dataset[dataKey] = dataValue;
      });
    } else {
      element.setAttribute(key, value);
    }
  });

  return element;
}

/**
 * Safely appends multiple child elements
 * @param {HTMLElement} parent - Parent element
 * @param {...HTMLElement} children - Child elements to append
 */
export function safeAppendChildren(parent, ...children) {
  if (!parent) return;

  children.forEach(child => {
    if (child instanceof HTMLElement) {
      parent.appendChild(child);
    }
  });
}

/**
 * Safely clears element content
 * @param {HTMLElement} element - Element to clear
 */
export function safeClearElement(element) {
  if (!element) return;

  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/**
 * Creates a safe HTML template with escaped placeholders
 * @param {string} template - HTML template string
 * @param {Object} data - Data to substitute
 * @returns {string} Safe HTML string
 */
export function safeTemplate(template, data = {}) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return escapeHtml(data[key] || '');
  });
}

/**
 * Validates file upload security
 * @param {File} file - File to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export function validateFileUpload(file, options = {}) {
  const defaults = {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['.zwo'],
    allowedMimeTypes: ['text/xml', 'application/xml'],
  };

  const config = { ...defaults, ...options };
  const errors = [];

  // File size validation
  if (file.size > config.maxSize) {
    errors.push(
      `File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds maximum allowed size (${Math.round(config.maxSize / 1024 / 1024)}MB)`
    );
  }

  // File extension validation
  const extension = `.${  file.name.split('.').pop().toLowerCase()}`;
  if (!config.allowedTypes.includes(extension)) {
    errors.push(
      `File type "${extension}" is not allowed. Allowed types: ${config.allowedTypes.join(', ')}`
    );
  }

  // MIME type validation
  if (
    config.allowedMimeTypes.length > 0 &&
    !config.allowedMimeTypes.includes(file.type)
  ) {
    errors.push(`MIME type "${file.type}" is not allowed`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitizes XML content to prevent XML bombs and malicious content
 * @param {string} xmlContent - XML content to sanitize
 * @returns {Object} Sanitization result
 */
export function sanitizeXmlContent(xmlContent) {
  const errors = [];

  // Check for XML entities (potential XML bombs)
  if (xmlContent.includes('<!ENTITY')) {
    errors.push('XML entities are not allowed');
  }

  // Check for external references
  if (xmlContent.includes('<!DOCTYPE') && xmlContent.includes('SYSTEM')) {
    errors.push('External DTD references are not allowed');
  }

  // Check for processing instructions that could be malicious
  const dangerousPI = ['<?php', '<?xml-stylesheet', '<?import'];
  for (const pi of dangerousPI) {
    if (xmlContent.includes(pi)) {
      errors.push(
        `Potentially dangerous processing instruction detected: ${pi}`
      );
    }
  }

  // Basic XML structure validation
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'text/xml');
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      errors.push('Invalid XML structure');
    }
  } catch (error) {
    errors.push('XML parsing failed');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedContent: xmlContent, // For now, return original if valid
  };
}

/**
 * Content Security Policy nonce generator (for inline scripts if needed)
 * @returns {string} Random nonce
 */
export function generateCSPNonce() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
