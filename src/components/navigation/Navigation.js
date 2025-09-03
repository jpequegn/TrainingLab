/**
 * Navigation Component for TrainingLab
 * Provides main navigation with mobile responsive design
 */

import { createLogger } from '../../utils/logger.js';
import { getNavigationItems } from '../../router/routes.js';

const logger = createLogger('Navigation');

export class Navigation {
  constructor(container, router) {
    this.container =
      typeof container === 'string'
        ? document.querySelector(container)
        : container;
    this.router = router;
    this.navigationItems = getNavigationItems();
    this.isMobileMenuOpen = false;

    // Bind methods
    this.handleRouteChange = this.handleRouteChange.bind(this);
    this.handleMobileToggle = this.handleMobileToggle.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handleClickOutside = this.handleClickOutside.bind(this);

    this.init();
  }

  init() {
    this.render();
    this.setupEventListeners();
    this.updateActiveState();
    logger.info('Navigation component initialized');
  }

  render() {
    if (!this.container) {
      logger.error('Navigation container not found');
      return;
    }

    const navigationHTML = this.generateNavigationHTML();
    this.container.innerHTML = navigationHTML;

    // Cache DOM elements after rendering
    this.navElement = this.container.querySelector('.main-navigation');
    this.mobileToggle = this.container.querySelector('.mobile-menu-toggle');
    this.navMenu = this.container.querySelector('.nav-menu');
  }

  generateNavigationHTML() {
    const navItems = this.navigationItems
      .map(
        item => `
      <li class="nav-item">
        <a href="#${item.path}" 
           class="nav-link" 
           data-route="${item.path}"
           title="${item.label}">
          <i class="${item.icon}" aria-hidden="true"></i>
          <span class="nav-text">${item.label}</span>
        </a>
      </li>
    `
      )
      .join('');

    return `
      <nav class="main-navigation" role="navigation" aria-label="Main navigation">
        <div class="nav-container">
          <!-- Brand/Logo -->
          <div class="nav-brand">
            <a href="#/" class="brand-link" data-route="/">
              <i class="fas fa-dumbbell brand-icon" aria-hidden="true"></i>
              <span class="brand-text">TrainingLab</span>
            </a>
          </div>

          <!-- Mobile Menu Toggle -->
          <button class="mobile-menu-toggle" 
                  type="button" 
                  aria-label="Toggle navigation menu"
                  aria-expanded="false"
                  aria-controls="nav-menu">
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
          </button>

          <!-- Navigation Menu -->
          <div class="nav-menu" id="nav-menu" role="menubar">
            <ul class="nav-list" role="none">
              ${navItems}
            </ul>
            
            <!-- User Actions -->
            <div class="nav-actions">
              <button class="action-btn settings-btn" 
                      type="button" 
                      title="Settings"
                      aria-label="Open settings">
                <i class="fas fa-cog" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </div>
      </nav>
    `;
  }

  setupEventListeners() {
    // Router change listener
    if (this.router && this.router.addListener) {
      this.router.addListener(this.handleRouteChange);
    }

    // Mobile menu toggle
    if (this.mobileToggle) {
      this.mobileToggle.addEventListener('click', this.handleMobileToggle);
    }

    // Navigation link clicks
    this.container.addEventListener('click', event => {
      const link = event.target.closest('[data-route]');
      if (link) {
        event.preventDefault();
        const route = link.getAttribute('data-route');

        if (this.router && this.router.navigate) {
          this.router.navigate(route);
        }

        // Close mobile menu if open
        if (this.isMobileMenuOpen) {
          this.closeMobileMenu();
        }
      }
    });

    // Window resize handler
    window.addEventListener('resize', this.handleResize);

    // Click outside to close mobile menu
    document.addEventListener('click', this.handleClickOutside);

    // Keyboard navigation
    this.container.addEventListener('keydown', event => {
      if (event.key === 'Escape' && this.isMobileMenuOpen) {
        this.closeMobileMenu();
        this.mobileToggle.focus();
      }
    });
  }

  handleRouteChange(route) {
    this.updateActiveState(route?.path);
    logger.debug(`Navigation updated for route: ${route?.path}`);
  }

  handleMobileToggle() {
    if (this.isMobileMenuOpen) {
      this.closeMobileMenu();
    } else {
      this.openMobileMenu();
    }
  }

  handleResize() {
    // Close mobile menu on larger screens
    if (window.innerWidth >= 768 && this.isMobileMenuOpen) {
      this.closeMobileMenu();
    }
  }

  handleClickOutside(event) {
    if (
      this.isMobileMenuOpen &&
      this.navElement &&
      !this.navElement.contains(event.target)
    ) {
      this.closeMobileMenu();
    }
  }

  openMobileMenu() {
    if (!this.navMenu || !this.mobileToggle) return;

    this.isMobileMenuOpen = true;
    this.navMenu.classList.add('nav-menu--open');
    this.mobileToggle.classList.add('mobile-menu-toggle--open');
    this.mobileToggle.setAttribute('aria-expanded', 'true');

    // Focus first navigation link
    const firstLink = this.navMenu.querySelector('.nav-link');
    if (firstLink) {
      firstLink.focus();
    }
  }

  closeMobileMenu() {
    if (!this.navMenu || !this.mobileToggle) return;

    this.isMobileMenuOpen = false;
    this.navMenu.classList.remove('nav-menu--open');
    this.mobileToggle.classList.remove('mobile-menu-toggle--open');
    this.mobileToggle.setAttribute('aria-expanded', 'false');
  }

  updateActiveState(currentPath) {
    const activePath = currentPath || this.getCurrentPath();

    // Remove all active states
    const navLinks = this.container.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.classList.remove('nav-link--active');
      link.removeAttribute('aria-current');
    });

    // Add active state to current route
    const activeLink = this.container.querySelector(
      `[data-route="${activePath}"]`
    );
    if (activeLink) {
      activeLink.classList.add('nav-link--active');
      activeLink.setAttribute('aria-current', 'page');
    }
  }

  getCurrentPath() {
    return window.location.hash.slice(1) || '/';
  }

  /**
   * Update navigation items (useful for dynamic menu changes)
   */
  updateNavigationItems(newItems) {
    this.navigationItems = newItems;
    this.render();
    this.setupEventListeners();
    this.updateActiveState();
    logger.info('Navigation items updated');
  }

  /**
   * Show loading state for navigation
   */
  setLoadingState(isLoading) {
    if (!this.navElement) return;

    if (isLoading) {
      this.navElement.classList.add('nav-loading');
    } else {
      this.navElement.classList.remove('nav-loading');
    }
  }

  /**
   * Highlight specific navigation item
   */
  highlightItem(path) {
    const link = this.container.querySelector(`[data-route="${path}"]`);
    if (link) {
      link.classList.add('nav-link--highlight');
      setTimeout(() => {
        link.classList.remove('nav-link--highlight');
      }, 2000);
    }
  }

  /**
   * Destroy navigation component
   */
  destroy() {
    // Remove event listeners
    if (this.router && this.router.removeListener) {
      this.router.removeListener(this.handleRouteChange);
    }

    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('click', this.handleClickOutside);

    // Clear container
    if (this.container) {
      this.container.innerHTML = '';
    }

    logger.info('Navigation component destroyed');
  }
}

export default Navigation;
