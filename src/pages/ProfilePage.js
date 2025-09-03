/**
 * Profile Page for TrainingLab
 * User profile, preferences, and training settings
 */

import { BasePage } from './BasePage.js';
import { createLogger } from '../utils/logger.js';
import { profileService } from '../services/profile-service.js';

const logger = createLogger('ProfilePage');

export class ProfilePage extends BasePage {
  constructor(container) {
    super(container, {
      title: 'User Profile',
      loadingText: 'Loading profile...',
    });

    // Profile-specific state
    this.profile = {
      name: '',
      email: '',
      ftp: 250,
      weight: 70,
      height: 175,
      birthYear: new Date().getFullYear() - 30,
      gender: 'other',
      units: 'metric',
      theme: 'light',
      powerDisplay: 'ftp-percentage',
    };

    this.preferences = {};
    this.activeTab = 'general';
  }

  async loadData() {
    try {
      // Load user profile and preferences
      const [profileData, preferencesData] = await Promise.all([
        this.loadProfile(),
        this.loadPreferences(),
      ]);

      this.profile = { ...this.profile, ...profileData };
      this.preferences = { ...this.preferences, ...preferencesData };

      logger.info('Profile data loaded successfully');
    } catch (error) {
      logger.error('Failed to load profile data:', error);
      // Don't throw - use default values
    }
  }

  async loadProfile() {
    // TODO: Load from actual profile service
    // For now, return default values
    return {
      name: 'TrainingLab User',
      email: 'user@example.com',
      ftp: 250,
      weight: 70,
      height: 175,
      birthYear: 1990,
    };
  }

  async loadPreferences() {
    try {
      if (profileService && profileService.getPreferences) {
        return await profileService.getPreferences();
      }
    } catch (error) {
      logger.warn('Could not load preferences:', error);
    }

    return {
      units: 'metric',
      theme: 'light',
      powerDisplay: 'ftp-percentage',
    };
  }

  async render() {
    const content = `
      <div class="profile-content">
        ${this.createProfileHeader()}
        ${this.createTabNavigation()}
        ${this.createTabContent()}
      </div>
    `;

    this.container.innerHTML = this.generatePageHTML(content, {
      pageClass: 'profile-page',
      pageId: 'profile',
    });
  }

  createProfileHeader() {
    return this.createPageHeader(
      'User Profile',
      'Manage your athlete profile, preferences, and training settings',
      `
        <button class="btn btn-primary" id="saveProfileBtn">
          <i class="fas fa-save"></i>
          Save Changes
        </button>
      `
    );
  }

  createTabNavigation() {
    const tabs = [
      { id: 'general', label: 'General', icon: 'fas fa-user' },
      { id: 'training', label: 'Training', icon: 'fas fa-dumbbell' },
      { id: 'preferences', label: 'Preferences', icon: 'fas fa-cog' },
      { id: 'performance', label: 'Performance', icon: 'fas fa-chart-line' },
    ];

    const tabsHTML = tabs
      .map(
        tab => `
      <button class="tab-button ${tab.id === this.activeTab ? 'active' : ''}" 
              data-tab="${tab.id}">
        <i class="${tab.icon}"></i>
        <span>${tab.label}</span>
      </button>
    `
      )
      .join('');

    return `
      <div class="tab-navigation">
        ${tabsHTML}
      </div>
    `;
  }

  createTabContent() {
    return `
      <div class="tab-content">
        <div class="tab-panel ${this.activeTab === 'general' ? 'active' : ''}" id="general-panel">
          ${this.createGeneralTab()}
        </div>
        <div class="tab-panel ${this.activeTab === 'training' ? 'active' : ''}" id="training-panel">
          ${this.createTrainingTab()}
        </div>
        <div class="tab-panel ${this.activeTab === 'preferences' ? 'active' : ''}" id="preferences-panel">
          ${this.createPreferencesTab()}
        </div>
        <div class="tab-panel ${this.activeTab === 'performance' ? 'active' : ''}" id="performance-panel">
          ${this.createPerformanceTab()}
        </div>
      </div>
    `;
  }

  createGeneralTab() {
    return `
      <div class="form-section">
        <h3 class="section-title">Personal Information</h3>
        
        <div class="form-grid">
          <div class="form-group">
            <label for="profileName">Full Name</label>
            <input type="text" id="profileName" class="form-input" value="${this.profile.name}" required>
          </div>
          
          <div class="form-group">
            <label for="profileEmail">Email Address</label>
            <input type="email" id="profileEmail" class="form-input" value="${this.profile.email}" required>
          </div>
          
          <div class="form-group">
            <label for="profileBirthYear">Birth Year</label>
            <input type="number" id="profileBirthYear" class="form-input" 
                   value="${this.profile.birthYear}" min="1920" max="${new Date().getFullYear()}">
          </div>
          
          <div class="form-group">
            <label for="profileGender">Gender</label>
            <select id="profileGender" class="form-input">
              <option value="male" ${this.profile.gender === 'male' ? 'selected' : ''}>Male</option>
              <option value="female" ${this.profile.gender === 'female' ? 'selected' : ''}>Female</option>
              <option value="other" ${this.profile.gender === 'other' ? 'selected' : ''}>Other</option>
            </select>
          </div>
        </div>
      </div>

      <div class="form-section">
        <h3 class="section-title">Physical Metrics</h3>
        
        <div class="form-grid">
          <div class="form-group">
            <label for="profileWeight">Weight (${this.preferences.units === 'metric' ? 'kg' : 'lbs'})</label>
            <input type="number" id="profileWeight" class="form-input" 
                   value="${this.profile.weight}" min="30" max="200" step="0.1">
          </div>
          
          <div class="form-group">
            <label for="profileHeight">Height (${this.preferences.units === 'metric' ? 'cm' : 'inches'})</label>
            <input type="number" id="profileHeight" class="form-input" 
                   value="${this.profile.height}" min="100" max="250">
          </div>
        </div>
      </div>
    `;
  }

  createTrainingTab() {
    return `
      <div class="form-section">
        <h3 class="section-title">Power & Performance</h3>
        
        <div class="form-grid">
          <div class="form-group">
            <label for="profileFTP">Functional Threshold Power (FTP)</label>
            <div class="input-with-unit">
              <input type="number" id="profileFTP" class="form-input" 
                     value="${this.profile.ftp}" min="50" max="600">
              <span class="input-unit">watts</span>
            </div>
            <div class="form-help">
              Your FTP is used for workout intensity calculations. 
              <button type="button" class="btn-link" id="ftpTestBtn">Take FTP Test</button>
            </div>
          </div>
          
          <div class="form-group">
            <label>Power-to-Weight Ratio</label>
            <div class="metric-display">
              <span class="metric-value">${(this.profile.ftp / this.profile.weight).toFixed(2)}</span>
              <span class="metric-unit">W/kg</span>
            </div>
          </div>
        </div>
      </div>

      <div class="form-section">
        <h3 class="section-title">Training Zones</h3>
        
        <div class="zones-container">
          ${this.createTrainingZones()}
        </div>
      </div>
    `;
  }

  createTrainingZones() {
    const zones = [
      { name: 'Active Recovery', range: [0, 55], color: '#9ca3af' },
      { name: 'Endurance', range: [56, 75], color: '#3b82f6' },
      { name: 'Tempo', range: [76, 90], color: '#10b981' },
      { name: 'Lactate Threshold', range: [91, 105], color: '#f59e0b' },
      { name: 'VO2 Max', range: [106, 120], color: '#ef4444' },
      { name: 'Anaerobic Capacity', range: [121, 150], color: '#8b5cf6' },
    ];

    return zones
      .map((zone, index) => {
        const minPower = Math.round((this.profile.ftp * zone.range[0]) / 100);
        const maxPower = Math.round((this.profile.ftp * zone.range[1]) / 100);

        return `
        <div class="zone-item">
          <div class="zone-color" style="background-color: ${zone.color}"></div>
          <div class="zone-info">
            <div class="zone-name">Zone ${index + 1}: ${zone.name}</div>
            <div class="zone-range">${zone.range[0]}% - ${zone.range[1]}% FTP</div>
            <div class="zone-power">${minPower} - ${maxPower} watts</div>
          </div>
        </div>
      `;
      })
      .join('');
  }

  createPreferencesTab() {
    return `
      <div class="form-section">
        <h3 class="section-title">Display Preferences</h3>
        
        <div class="form-grid">
          <div class="form-group">
            <label for="prefUnits">Units</label>
            <select id="prefUnits" class="form-input">
              <option value="metric" ${this.preferences.units === 'metric' ? 'selected' : ''}>Metric (km, kg, °C)</option>
              <option value="imperial" ${this.preferences.units === 'imperial' ? 'selected' : ''}>Imperial (mi, lbs, °F)</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="prefTheme">Theme</label>
            <select id="prefTheme" class="form-input">
              <option value="light" ${this.preferences.theme === 'light' ? 'selected' : ''}>Light</option>
              <option value="dark" ${this.preferences.theme === 'dark' ? 'selected' : ''}>Dark</option>
              <option value="auto" ${this.preferences.theme === 'auto' ? 'selected' : ''}>Auto (System)</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="prefPowerDisplay">Power Display</label>
            <select id="prefPowerDisplay" class="form-input">
              <option value="ftp-percentage" ${this.preferences.powerDisplay === 'ftp-percentage' ? 'selected' : ''}>% FTP</option>
              <option value="watts" ${this.preferences.powerDisplay === 'watts' ? 'selected' : ''}>Watts</option>
              <option value="both" ${this.preferences.powerDisplay === 'both' ? 'selected' : ''}>Both</option>
            </select>
          </div>
        </div>
      </div>

      <div class="form-section">
        <h3 class="section-title">Workout Preferences</h3>
        
        <div class="form-grid">
          <div class="form-group">
            <label>
              <input type="checkbox" id="prefAutoSave" ${this.preferences.autoSave ? 'checked' : ''}>
              Auto-save workout modifications
            </label>
          </div>
          
          <div class="form-group">
            <label>
              <input type="checkbox" id="prefShowTips" ${this.preferences.showTips !== false ? 'checked' : ''}>
              Show helpful tips and hints
            </label>
          </div>
          
          <div class="form-group">
            <label>
              <input type="checkbox" id="prefHighContrast" ${this.preferences.highContrast ? 'checked' : ''}>
              High contrast mode
            </label>
          </div>
        </div>
      </div>
    `;
  }

  createPerformanceTab() {
    return `
      <div class="form-section">
        <h3 class="section-title">Performance Tracking</h3>
        
        <div class="performance-metrics">
          <div class="metric-card">
            <div class="metric-icon">
              <i class="fas fa-bolt"></i>
            </div>
            <div class="metric-content">
              <div class="metric-value">${this.profile.ftp}</div>
              <div class="metric-label">Current FTP</div>
              <div class="metric-change">+5W from last test</div>
            </div>
          </div>
          
          <div class="metric-card">
            <div class="metric-icon">
              <i class="fas fa-weight"></i>
            </div>
            <div class="metric-content">
              <div class="metric-value">${(this.profile.ftp / this.profile.weight).toFixed(2)}</div>
              <div class="metric-label">Power-to-Weight</div>
              <div class="metric-change">W/kg</div>
            </div>
          </div>
          
          <div class="metric-card">
            <div class="metric-icon">
              <i class="fas fa-chart-line"></i>
            </div>
            <div class="metric-content">
              <div class="metric-value">42</div>
              <div class="metric-label">Total Workouts</div>
              <div class="metric-change">This month</div>
            </div>
          </div>
        </div>
      </div>

      <div class="form-section">
        <h3 class="section-title">FTP Testing</h3>
        
        <div class="ftp-test-section">
          <p>Regular FTP testing helps track your fitness progress and ensures accurate training zones.</p>
          
          <div class="ftp-history">
            <h4>FTP History</h4>
            <div class="ftp-timeline">
              <div class="ftp-entry">
                <div class="ftp-date">Current</div>
                <div class="ftp-value">${this.profile.ftp}W</div>
                <div class="ftp-change">+5W</div>
              </div>
              <div class="ftp-entry">
                <div class="ftp-date">3 months ago</div>
                <div class="ftp-value">${this.profile.ftp - 5}W</div>
                <div class="ftp-change">+8W</div>
              </div>
              <div class="ftp-entry">
                <div class="ftp-date">6 months ago</div>
                <div class="ftp-value">${this.profile.ftp - 13}W</div>
                <div class="ftp-change">Initial</div>
              </div>
            </div>
          </div>
          
          <div class="ftp-actions">
            <button class="btn btn-primary" id="newFTPTestBtn">
              <i class="fas fa-play"></i>
              Start FTP Test
            </button>
            <button class="btn btn-outline" id="manualFTPBtn">
              <i class="fas fa-edit"></i>
              Enter Manual FTP
            </button>
          </div>
        </div>
      </div>
    `;
  }

  async onInit() {
    this.setupTabs();
    this.setupFormHandlers();
    this.setupSaveButton();

    logger.info('Profile page initialized successfully');
  }

  setupTabs() {
    const tabButtons = this.container.querySelectorAll('.tab-button');

    tabButtons.forEach(button => {
      this.addEventListener(button, 'click', () => {
        const tabId = button.dataset.tab;
        this.switchTab(tabId);
      });
    });
  }

  switchTab(tabId) {
    this.activeTab = tabId;

    // Update button states
    const tabButtons = this.container.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
      button.classList.toggle('active', button.dataset.tab === tabId);
    });

    // Update panel visibility
    const tabPanels = this.container.querySelectorAll('.tab-panel');
    tabPanels.forEach(panel => {
      panel.classList.toggle('active', panel.id === `${tabId}-panel`);
    });
  }

  setupFormHandlers() {
    // FTP input handler
    const ftpInput = this.container.querySelector('#profileFTP');
    if (ftpInput) {
      this.addEventListener(ftpInput, 'change', () => {
        this.updatePowerToWeightDisplay();
      });
    }

    // Weight input handler
    const weightInput = this.container.querySelector('#profileWeight');
    if (weightInput) {
      this.addEventListener(weightInput, 'change', () => {
        this.updatePowerToWeightDisplay();
      });
    }

    // FTP test button
    const ftpTestBtn = this.container.querySelector('#ftpTestBtn');
    if (ftpTestBtn) {
      this.addEventListener(ftpTestBtn, 'click', () => {
        this.startFTPTest();
      });
    }

    // Theme change handler
    const themeSelect = this.container.querySelector('#prefTheme');
    if (themeSelect) {
      this.addEventListener(themeSelect, 'change', event => {
        this.applyTheme(event.target.value);
      });
    }
  }

  setupSaveButton() {
    const saveButton = this.container.querySelector('#saveProfileBtn');
    if (saveButton) {
      this.addEventListener(saveButton, 'click', async () => {
        await this.saveProfile();
      });
    }
  }

  updatePowerToWeightDisplay() {
    const ftpInput = this.container.querySelector('#profileFTP');
    const weightInput = this.container.querySelector('#profileWeight');
    const pwrDisplay = this.container.querySelector('.metric-value');

    if (ftpInput && weightInput && pwrDisplay) {
      const ftp = parseInt(ftpInput.value) || this.profile.ftp;
      const weight = parseFloat(weightInput.value) || this.profile.weight;
      const ratio = (ftp / weight).toFixed(2);

      pwrDisplay.textContent = ratio;
    }
  }

  applyTheme(theme) {
    // Apply theme immediately
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-theme');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark-theme');
    } else {
      // Auto theme - use system preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark-theme');
      } else {
        document.documentElement.classList.remove('dark-theme');
      }
    }
  }

  startFTPTest() {
    // TODO: Implement FTP test functionality
    this.showSuccess('FTP Test functionality coming soon!');
  }

  async saveProfile() {
    try {
      this.setLoadingState(true, 'Saving profile...');

      // Collect form data
      const formData = this.collectFormData();

      // Update local state
      this.profile = { ...this.profile, ...formData.profile };
      this.preferences = { ...this.preferences, ...formData.preferences };

      // Save to profile service
      if (profileService && profileService.updatePreferences) {
        await profileService.updatePreferences(formData.preferences);
      }

      // TODO: Save profile data to service

      this.setLoadingState(false);
      this.showSuccess('Profile saved successfully!');
    } catch (error) {
      logger.error('Failed to save profile:', error);
      this.setLoadingState(false);
      this.showError('Failed to save profile. Please try again.');
    }
  }

  collectFormData() {
    const profile = {
      name:
        this.container.querySelector('#profileName')?.value ||
        this.profile.name,
      email:
        this.container.querySelector('#profileEmail')?.value ||
        this.profile.email,
      birthYear:
        parseInt(this.container.querySelector('#profileBirthYear')?.value) ||
        this.profile.birthYear,
      gender:
        this.container.querySelector('#profileGender')?.value ||
        this.profile.gender,
      weight:
        parseFloat(this.container.querySelector('#profileWeight')?.value) ||
        this.profile.weight,
      height:
        parseInt(this.container.querySelector('#profileHeight')?.value) ||
        this.profile.height,
      ftp:
        parseInt(this.container.querySelector('#profileFTP')?.value) ||
        this.profile.ftp,
    };

    const preferences = {
      units:
        this.container.querySelector('#prefUnits')?.value ||
        this.preferences.units,
      theme:
        this.container.querySelector('#prefTheme')?.value ||
        this.preferences.theme,
      powerDisplay:
        this.container.querySelector('#prefPowerDisplay')?.value ||
        this.preferences.powerDisplay,
      autoSave:
        this.container.querySelector('#prefAutoSave')?.checked ??
        this.preferences.autoSave,
      showTips:
        this.container.querySelector('#prefShowTips')?.checked ??
        this.preferences.showTips,
      highContrast:
        this.container.querySelector('#prefHighContrast')?.checked ??
        this.preferences.highContrast,
    };

    return { profile, preferences };
  }

  showSuccess(message) {
    // Create temporary success message
    const successElement = document.createElement('div');
    successElement.className = 'success-toast';
    successElement.innerHTML = `
      <i class="fas fa-check-circle"></i>
      <span>${message}</span>
    `;

    document.body.appendChild(successElement);

    this.setTimeout(() => {
      successElement.remove();
    }, 3000);
  }

  showError(message) {
    const error = new Error(message);
    this.handleError(error, message);
  }
}

export default ProfilePage;
