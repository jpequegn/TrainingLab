/**
 * Quick Settings Component
 * Provides quick access to frequently used settings without navigating to profile page
 */

import { stateManager } from '../services/state-manager.js';
import { profileService } from '../services/profile-service.js';

export class QuickSettings {
  constructor(container) {
    this.container = container;
    this.isOpen = false;
    this.currentTheme = 'light';
    this.currentUnits = 'metric';
    this.currentPowerDisplay = 'ftp-percentage';

    // Bind methods
    this.toggle = this.toggle.bind(this);
    this.close = this.close.bind(this);
    this.handleThemeChange = this.handleThemeChange.bind(this);
    this.handleUnitsChange = this.handleUnitsChange.bind(this);
    this.handlePowerDisplayChange = this.handlePowerDisplayChange.bind(this);

    // Load current preferences
    this.loadCurrentPreferences();

    // Subscribe to preference changes
    this.setupSubscriptions();

    // Render the component
    this.render();

    // Attach event listeners
    this.attachEventListeners();
  }

  async loadCurrentPreferences() {
    try {
      // Try to get preferences from profile service
      const preferences = await profileService.getPreferences();
      if (preferences) {
        this.currentTheme = preferences.theme || 'light';
        this.currentUnits = preferences.units || 'metric';
        this.currentPowerDisplay = preferences.powerDisplay || 'ftp-percentage';
      } else {
        // Fall back to localStorage or defaults
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.currentUnits = localStorage.getItem('units') || 'metric';
        this.currentPowerDisplay =
          localStorage.getItem('powerDisplay') || 'ftp-percentage';
      }
    } catch (error) {
      console.warn(
        'Could not load current preferences, using defaults:',
        error
      );
      // Use defaults
      this.currentTheme = 'light';
      this.currentUnits = 'metric';
      this.currentPowerDisplay = 'ftp-percentage';
    }
  }

  setupSubscriptions() {
    // Subscribe to theme changes from state manager
    stateManager.subscribe('themeMode', theme => {
      if (theme && theme !== this.currentTheme) {
        this.currentTheme = theme;
        this.updateThemeDisplay();
      }
    });

    // Subscribe to profile changes to get preference updates
    stateManager.subscribe('userProfile', profile => {
      if (profile && profile.preferences) {
        this.currentTheme = profile.preferences.theme || this.currentTheme;
        this.currentUnits = profile.preferences.units || this.currentUnits;
        this.currentPowerDisplay =
          profile.preferences.powerDisplay || this.currentPowerDisplay;
        this.updateDisplays();
      }
    });
  }

  render() {
    this.container.innerHTML = `
      <div class="quick-settings">
        ${this.renderButton()}
        ${this.renderDropdown()}
      </div>
    `;
  }

  renderButton() {
    return `
      <button
        class="quick-settings-btn"
        id="quickSettingsBtn"
        title="Quick Settings"
        aria-label="Quick Settings"
        aria-expanded="false"
        aria-haspopup="true"
      >
        <i class="fas fa-sliders-h"></i>
      </button>
    `;
  }

  renderDropdown() {
    return `
      <div class="quick-settings-dropdown" id="quickSettingsDropdown" style="display: none;">
        ${this.renderHeader()}
        ${this.renderSettings()}
        <div class="quick-settings-divider"></div>
        ${this.renderFooter()}
      </div>
    `;
  }

  renderHeader() {
    return `
      <div class="quick-settings-header">
        <h3>Quick Settings</h3>
      </div>
    `;
  }

  renderSettings() {
    return `
      <div class="quick-settings-section">
        ${this.renderThemeSetting()}
        ${this.renderUnitsSetting()}
        ${this.renderPowerDisplaySetting()}
      </div>
    `;
  }

  renderThemeSetting() {
    return `
      <div class="quick-setting-item">
        <div class="quick-setting-label">
          <i class="fas fa-palette"></i>
          <span>Theme</span>
        </div>
        <div class="quick-setting-control">
          <select id="quickThemeSelect" class="quick-select">
            <option value="light" ${this.currentTheme === 'light' ? 'selected' : ''}>Light</option>
            <option value="dark" ${this.currentTheme === 'dark' ? 'selected' : ''}>Dark</option>
            <option value="auto" ${this.currentTheme === 'auto' ? 'selected' : ''}>Auto</option>
          </select>
        </div>
      </div>
    `;
  }

  renderUnitsSetting() {
    return `
      <div class="quick-setting-item">
        <div class="quick-setting-label">
          <i class="fas fa-ruler"></i>
          <span>Units</span>
        </div>
        <div class="quick-setting-control">
          <select id="quickUnitsSelect" class="quick-select">
            <option value="metric" ${this.currentUnits === 'metric' ? 'selected' : ''}>Metric</option>
            <option value="imperial" ${this.currentUnits === 'imperial' ? 'selected' : ''}>Imperial</option>
          </select>
        </div>
      </div>
    `;
  }

  renderPowerDisplaySetting() {
    return `
      <div class="quick-setting-item">
        <div class="quick-setting-label">
          <i class="fas fa-tachometer-alt"></i>
          <span>Power Display</span>
        </div>
        <div class="quick-setting-control">
          <select id="quickPowerDisplaySelect" class="quick-select">
            <option value="ftp-percentage" ${this.currentPowerDisplay === 'ftp-percentage' ? 'selected' : ''}>FTP %</option>
            <option value="watts" ${this.currentPowerDisplay === 'watts' ? 'selected' : ''}>Watts</option>
            <option value="both" ${this.currentPowerDisplay === 'both' ? 'selected' : ''}>Both</option>
          </select>
        </div>
      </div>
    `;
  }

  renderFooter() {
    return `
      <div class="quick-settings-footer">
        <button class="quick-settings-all-btn" id="allSettingsBtn">
          <i class="fas fa-cog"></i>
          <span>All Settings</span>
        </button>
      </div>
    `;
  }

  attachEventListeners() {
    const btn = document.getElementById('quickSettingsBtn');
    const themeSelect = document.getElementById('quickThemeSelect');
    const unitsSelect = document.getElementById('quickUnitsSelect');
    const powerDisplaySelect = document.getElementById(
      'quickPowerDisplaySelect'
    );
    const allSettingsBtn = document.getElementById('allSettingsBtn');

    if (btn) {
      btn.addEventListener('click', this.toggle);
    }

    if (themeSelect) {
      themeSelect.addEventListener('change', this.handleThemeChange);
    }

    if (unitsSelect) {
      unitsSelect.addEventListener('change', this.handleUnitsChange);
    }

    if (powerDisplaySelect) {
      powerDisplaySelect.addEventListener(
        'change',
        this.handlePowerDisplayChange
      );
    }

    if (allSettingsBtn) {
      allSettingsBtn.addEventListener('click', () => {
        this.close();
        // Navigate to full preferences
        const preferencesBtn = document.getElementById('preferencesBtn');
        if (preferencesBtn) {
          preferencesBtn.click();
        }
      });
    }

    // Close when clicking outside
    document.addEventListener('click', event => {
      if (this.isOpen && !this.container.contains(event.target)) {
        this.close();
      }
    });

    // Close on escape key
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    const dropdown = document.getElementById('quickSettingsDropdown');
    const btn = document.getElementById('quickSettingsBtn');

    if (dropdown && btn) {
      dropdown.style.display = 'block';
      btn.setAttribute('aria-expanded', 'true');
      this.isOpen = true;

      // Close other dropdowns
      const profileMenu = document.getElementById('profileMenu');
      if (profileMenu) {
        profileMenu.style.display = 'none';
      }

      // Focus first interactive element
      const firstSelect = dropdown.querySelector('select');
      if (firstSelect) {
        const FOCUS_DELAY_MS = 50;
        setTimeout(() => firstSelect.focus(), FOCUS_DELAY_MS);
      }
    }
  }

  close() {
    const dropdown = document.getElementById('quickSettingsDropdown');
    const btn = document.getElementById('quickSettingsBtn');

    if (dropdown && btn) {
      dropdown.style.display = 'none';
      btn.setAttribute('aria-expanded', 'false');
      this.isOpen = false;
    }
  }

  async handleThemeChange(event) {
    const newTheme = event.target.value;
    this.currentTheme = newTheme;

    try {
      // Update through profile service
      await profileService.updatePreferences({ theme: newTheme });

      // Also update state manager
      stateManager.dispatch('SET_THEME', newTheme);

      // Apply theme immediately
      this.applyTheme(newTheme);

      // Show feedback
      this.showToast(`Theme changed to ${newTheme}`, 'success');
    } catch (error) {
      console.warn('Could not save theme preference:', error);
      // Still apply the theme locally
      this.applyTheme(newTheme);
      localStorage.setItem('theme', newTheme);
    }
  }

  async handleUnitsChange(event) {
    const newUnits = event.target.value;
    this.currentUnits = newUnits;

    try {
      await profileService.updatePreferences({ units: newUnits });
      this.showToast(`Units changed to ${newUnits}`, 'success');

      // Trigger UI updates
      window.dispatchEvent(
        new CustomEvent('preferences:unitsChanged', {
          detail: { units: newUnits },
        })
      );
    } catch (error) {
      console.warn('Could not save units preference:', error);
      localStorage.setItem('units', newUnits);
    }
  }

  async handlePowerDisplayChange(event) {
    const newPowerDisplay = event.target.value;
    this.currentPowerDisplay = newPowerDisplay;

    try {
      await profileService.updatePreferences({ powerDisplay: newPowerDisplay });
      this.showToast(
        `Power display changed to ${newPowerDisplay.replace('-', ' ')}`,
        'success'
      );

      // Trigger UI updates
      window.dispatchEvent(
        new CustomEvent('preferences:powerDisplayChanged', {
          detail: { powerDisplay: newPowerDisplay },
        })
      );
    } catch (error) {
      console.warn('Could not save power display preference:', error);
      localStorage.setItem('powerDisplay', newPowerDisplay);
    }
  }

  applyTheme(theme) {
    // Apply theme immediately to document
    document.documentElement.classList.remove('dark', 'light');

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else if (theme === 'auto') {
      // Auto theme based on system preference
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.add('light');
      }
    }
  }

  updateThemeDisplay() {
    const themeSelect = document.getElementById('quickThemeSelect');
    if (themeSelect) {
      themeSelect.value = this.currentTheme;
    }
  }

  updateDisplays() {
    this.updateThemeDisplay();

    const unitsSelect = document.getElementById('quickUnitsSelect');
    if (unitsSelect) {
      unitsSelect.value = this.currentUnits;
    }

    const powerDisplaySelect = document.getElementById(
      'quickPowerDisplaySelect'
    );
    if (powerDisplaySelect) {
      powerDisplaySelect.value = this.currentPowerDisplay;
    }
  }

  showToast(message, type = 'info') {
    // Try to use the app's toast system if available
    if (window.app && window.app.ui && window.app.ui.showToast) {
      window.app.ui.showToast(message, type);
    } else {
      // Fallback to console log
      console.log(`${type.toUpperCase()}: ${message}`);
    }
  }

  destroy() {
    // Clean up event listeners
    const btn = document.getElementById('quickSettingsBtn');
    if (btn) {
      btn.removeEventListener('click', this.toggle);
    }

    // Clean up subscriptions
    if (this.unsubscribeTheme) {
      this.unsubscribeTheme();
    }
    if (this.unsubscribeProfile) {
      this.unsubscribeProfile();
    }
  }
}
