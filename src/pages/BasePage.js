/**
 * Base Page Architecture for TrainingLab
 * Provides common functionality and lifecycle for all pages
 */

import { createLogger } from '../utils/logger.js';

const logger = createLogger('BasePage');

export class BasePage {
  constructor(container = '#app-content', options = {}) {
    this.container =
      typeof container === 'string'
        ? document.querySelector(container)
        : container;
    this.options = {
      title: 'TrainingLab',
      loadingText: 'Loading...',
      errorRetryEnabled: true,
      ...options,
    };

    // Page state
    this.isInitialized = false;
    this.isLoading = false;
    this.hasError = false;
    this.errorMessage = '';
    this.data = {};

    // Event listeners cleanup
    this.eventListeners = [];
    this.timeouts = [];
    this.intervals = [];

    // Bind methods
    this.handleError = this.handleError.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);

    logger.debug(`BasePage created: ${this.constructor.name}`);
  }

  /**
   * Initialize the page
   * Override this method in child classes for custom initialization
   */
  async init() {
    try {
      if (this.isInitialized) {
        logger.warn('Page already initialized');
        return;
      }

      this.setLoadingState(true);

      // Setup container
      this.setupContainer();

      // Load page data
      await this.loadData();

      // Render page content
      await this.render();

      // Setup event listeners
      this.setupEventListeners();

      // Page-specific initialization
      await this.onInit();

      this.isInitialized = true;
      this.setLoadingState(false);

      logger.info(`Page initialized: ${this.constructor.name}`);
    } catch (error) {
      this.handleError(error, 'Failed to initialize page');
    }
  }

  /**
   * Setup the page container
   */
  setupContainer() {
    if (!this.container) {
      throw new Error('Page container not found');
    }

    this.container.classList.add('page-container');
    this.container.setAttribute(
      'data-page',
      this.constructor.name.toLowerCase()
    );

    // Set page title
    if (this.options.title) {
      document.title = `${this.options.title} - TrainingLab`;
    }
  }

  /**
   * Load data required for the page
   * Override in child classes to load specific data
   */
  async loadData() {
    // Default implementation - no data loading
    return Promise.resolve();
  }

  /**
   * Render the page content
   * Must be implemented by child classes
   */
  async render() {
    throw new Error('render() method must be implemented by child classes');
  }

  /**
   * Page-specific initialization after render
   * Override in child classes for custom initialization logic
   */
  async onInit() {
    // Default implementation - no additional initialization
    return Promise.resolve();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Global event listeners
    this.addEventListener(window, 'resize', this.handleResize);
    this.addEventListener(
      document,
      'visibilitychange',
      this.handleVisibilityChange
    );
  }

  /**
   * Add event listener with automatic cleanup
   */
  addEventListener(element, event, handler, options = {}) {
    element.addEventListener(event, handler, options);
    this.eventListeners.push({ element, event, handler, options });
  }

  /**
   * Set timeout with automatic cleanup
   */
  setTimeout(callback, delay) {
    const timeoutId = setTimeout(() => {
      callback();
      // Remove from cleanup list
      this.timeouts = this.timeouts.filter(id => id !== timeoutId);
    }, delay);
    this.timeouts.push(timeoutId);
    return timeoutId;
  }

  /**
   * Set interval with automatic cleanup
   */
  setInterval(callback, delay) {
    const intervalId = setInterval(callback, delay);
    this.intervals.push(intervalId);
    return intervalId;
  }

  /**
   * Set loading state
   */
  setLoadingState(isLoading, message = null) {
    this.isLoading = isLoading;

    if (!this.container) return;

    if (isLoading) {
      this.container.classList.add('page-loading');
      this.showLoadingIndicator(message || this.options.loadingText);
    } else {
      this.container.classList.remove('page-loading');
      this.hideLoadingIndicator();
    }
  }

  /**
   * Show loading indicator
   */
  showLoadingIndicator(message) {
    const existing = this.container.querySelector('.page-loading-indicator');
    if (existing) {
      existing.querySelector('.loading-text').textContent = message;
      return;
    }

    const loadingHTML = `
      <div class="page-loading-indicator">
        <div class="loading-spinner">
          <div class="spinner-ring"></div>
        </div>
        <div class="loading-text">${message}</div>
      </div>
    `;

    this.container.insertAdjacentHTML('afterbegin', loadingHTML);
  }

  /**
   * Hide loading indicator
   */
  hideLoadingIndicator() {
    const indicator = this.container.querySelector('.page-loading-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  /**
   * Set error state
   */
  setErrorState(error, message = 'An error occurred') {
    this.hasError = true;
    this.errorMessage = message;

    logger.error(`Page error: ${message}`, error);

    if (this.container) {
      this.container.classList.add('page-error');
      this.showErrorMessage(message, error);
    }
  }

  /**
   * Clear error state
   */
  clearErrorState() {
    this.hasError = false;
    this.errorMessage = '';

    if (this.container) {
      this.container.classList.remove('page-error');
      this.hideErrorMessage();
    }
  }

  /**
   * Show error message
   */
  showErrorMessage(message, error) {
    const existing = this.container.querySelector('.page-error-message');
    if (existing) {
      existing.remove();
    }

    const retryButton = this.options.errorRetryEnabled
      ? `<button class="error-retry-btn btn btn-primary">Try Again</button>`
      : '';

    const errorHTML = `
      <div class="page-error-message">
        <div class="error-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <div class="error-content">
          <h3 class="error-title">Oops! Something went wrong</h3>
          <p class="error-text">${message}</p>
          ${retryButton}
        </div>
      </div>
    `;

    this.container.insertAdjacentHTML('afterbegin', errorHTML);

    // Setup retry button
    if (this.options.errorRetryEnabled) {
      const retryBtn = this.container.querySelector('.error-retry-btn');
      if (retryBtn) {
        this.addEventListener(retryBtn, 'click', () => {
          this.retry();
        });
      }
    }
  }

  /**
   * Hide error message
   */
  hideErrorMessage() {
    const errorMessage = this.container.querySelector('.page-error-message');
    if (errorMessage) {
      errorMessage.remove();
    }
  }

  /**
   * Retry page initialization
   */
  async retry() {
    this.clearErrorState();
    this.isInitialized = false;
    await this.init();
  }

  /**
   * Handle errors
   */
  handleError(error, message = 'An error occurred') {
    this.setLoadingState(false);
    this.setErrorState(error, message);
  }

  /**
   * Handle window resize
   */
  handleResize() {
    // Override in child classes for custom resize handling
  }

  /**
   * Handle visibility change (tab focus/blur)
   */
  handleVisibilityChange() {
    if (document.hidden) {
      this.onPageHide();
    } else {
      this.onPageShow();
    }
  }

  /**
   * Called when page becomes hidden
   */
  onPageHide() {
    // Override in child classes
  }

  /**
   * Called when page becomes visible
   */
  onPageShow() {
    // Override in child classes
  }

  /**
   * Update page data
   */
  updateData(newData) {
    this.data = { ...this.data, ...newData };
  }

  /**
   * Get page data
   */
  getData(key = null) {
    return key ? this.data[key] : this.data;
  }

  /**
   * Check if page has unsaved changes
   * Used by router guards
   */
  hasUnsavedChanges() {
    return false; // Override in child classes
  }

  /**
   * Refresh the page
   */
  async refresh() {
    try {
      this.setLoadingState(true);
      this.clearErrorState();

      await this.loadData();
      await this.render();

      this.setLoadingState(false);
      logger.info(`Page refreshed: ${this.constructor.name}`);
    } catch (error) {
      this.handleError(error, 'Failed to refresh page');
    }
  }

  /**
   * Generate common page HTML structure
   */
  generatePageHTML(content, options = {}) {
    const pageClass = options.pageClass || '';
    const pageId = options.pageId || '';

    return `
      <div class="page-content ${pageClass}" ${pageId ? `id="${pageId}"` : ''}>
        <div class="page-inner">
          ${content}
        </div>
      </div>
    `;
  }

  /**
   * Create page header
   */
  createPageHeader(title, subtitle = '', actions = '') {
    return `
      <header class="page-header">
        <div class="page-header-content">
          <div class="page-title-section">
            <h1 class="page-title">${title}</h1>
            ${subtitle ? `<p class="page-subtitle">${subtitle}</p>` : ''}
          </div>
          ${actions ? `<div class="page-actions">${actions}</div>` : ''}
        </div>
      </header>
    `;
  }

  /**
   * Destroy the page and cleanup resources
   */
  destroy() {
    try {
      // Clear timers
      this.timeouts.forEach(timeoutId => clearTimeout(timeoutId));
      this.intervals.forEach(intervalId => clearInterval(intervalId));

      // Remove event listeners
      this.eventListeners.forEach(({ element, event, handler, options }) => {
        element.removeEventListener(event, handler, options);
      });

      // Clear container
      if (this.container) {
        this.container.classList.remove(
          'page-container',
          'page-loading',
          'page-error'
        );
        this.container.removeAttribute('data-page');
        this.container.innerHTML = '';
      }

      // Reset state
      this.isInitialized = false;
      this.isLoading = false;
      this.hasError = false;
      this.errorMessage = '';
      this.data = {};
      this.eventListeners = [];
      this.timeouts = [];
      this.intervals = [];

      logger.info(`Page destroyed: ${this.constructor.name}`);
    } catch (error) {
      logger.error('Error during page cleanup:', error);
    }
  }
}

export default BasePage;
