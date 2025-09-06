/**
 * Profile Page for TrainingLab
 * User profile, preferences, and training settings
 */

import { BasePage } from './BasePage.js';
import { createLogger } from '../utils/logger.js';
import { profileService } from '../services/profile-service.js';
import { FTPTestCalculator } from '../components/profile/FTPTestCalculator.js';
import { TrainingZones } from '../components/profile/TrainingZones.js';
import { FTPHistory } from '../components/profile/FTPHistory.js';
import { TrainingGoal, GOAL_TYPES } from '../models/TrainingGoal.js';

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

    // Advanced FTP and zone management components
    this.ftpTestCalculator = null;
    this.trainingZones = null;
    this.ftpHistory = null;

    // Training goals state
    this.goals = [];
    this.editingGoal = null;
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
    try {
      // Initialize profile service if not already initialized
      if (!profileService.initialized) {
        await profileService.initialize();
      }

      // Get current profile from service
      const currentProfile = profileService.getCurrentProfile();

      if (currentProfile) {
        logger.info('Profile loaded from service:', currentProfile.name);
        return {
          name: currentProfile.name || 'TrainingLab User',
          email: currentProfile.email || '',
          ftp: currentProfile.ftp || 250,
          weight: currentProfile.weight || 70,
          height: currentProfile.height || 175,
          birthYear: currentProfile.birthYear || new Date().getFullYear() - 30,
          gender: currentProfile.gender || 'other',
          profilePhoto: currentProfile.profilePhoto || null,
        };
      } else {
        // No profile exists, return defaults for new profile creation
        logger.info('No existing profile found, using defaults');
        return {
          name: '',
          email: '',
          ftp: 250,
          weight: 70,
          height: 175,
          birthYear: new Date().getFullYear() - 30,
          gender: 'other',
          profilePhoto: null,
        };
      }
    } catch (error) {
      logger.error('Failed to load profile from service:', error);
      // Return defaults if loading fails
      return {
        name: '',
        email: '',
        ftp: 250,
        weight: 70,
        height: 175,
        birthYear: new Date().getFullYear() - 30,
        gender: 'other',
        profilePhoto: null,
      };
    }
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
    console.log('ProfilePage: Starting render()');
    console.log('ProfilePage: Active tab is:', this.activeTab);

    const header = this.createProfileHeader();
    const navigation = this.createTabNavigation();
    const tabContent = this.createTabContent();

    console.log('ProfilePage: Header generated, length:', header.length);
    console.log(
      'ProfilePage: Navigation generated, length:',
      navigation.length
    );
    console.log(
      'ProfilePage: Tab content generated, length:',
      tabContent.length
    );

    const content = `
      <div class="profile-content">
        ${header}
        ${navigation}
        ${tabContent}
      </div>
    `;

    console.log('ProfilePage: Full content generated, length:', content.length);

    this.container.innerHTML = this.generatePageHTML(content, {
      pageClass: 'profile-page',
      pageId: 'profile',
    });

    console.log('ProfilePage: HTML set to container');
    console.log(
      'ProfilePage: Container innerHTML length:',
      this.container.innerHTML.length
    );
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
      { id: 'goals', label: 'Goals', icon: 'fas fa-bullseye' },
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
    console.log(
      'ProfilePage: Creating tab content for active tab:',
      this.activeTab
    );

    const generalContent = this.createGeneralTab();
    console.log(
      'ProfilePage: General tab content length:',
      generalContent.length
    );

    const result = `
      <div class="tab-content">
        <div class="tab-panel ${this.activeTab === 'general' ? 'active' : ''}" id="general-panel">
          ${generalContent}
        </div>
        <div class="tab-panel ${this.activeTab === 'training' ? 'active' : ''}" id="training-panel">
          ${this.createTrainingTab()}
        </div>
        <div class="tab-panel ${this.activeTab === 'goals' ? 'active' : ''}" id="goals-panel">
          ${this.createGoalsTab()}
        </div>
        <div class="tab-panel ${this.activeTab === 'preferences' ? 'active' : ''}" id="preferences-panel">
          ${this.createPreferencesTab()}
        </div>
        <div class="tab-panel ${this.activeTab === 'performance' ? 'active' : ''}" id="performance-panel">
          ${this.createPerformanceTab()}
        </div>
      </div>
    `;

    console.log(
      'ProfilePage: Tab content created, total length:',
      result.length
    );
    return result;
  }

  createGeneralTab() {
    console.log('ProfilePage: Creating general tab content');
    console.log('ProfilePage: Profile data:', this.profile);
    console.log('ProfilePage: Preferences data:', this.preferences);

    const result = `
      <div class="form-section">
        <h3 class="section-title">Profile Photo</h3>
        
        <div class="profile-photo-section">
          <div class="photo-upload-container">
            <div class="profile-photo-preview">
              ${
                this.profile.profilePhoto
                  ? `<img src="${this.profile.profilePhoto}" alt="Profile Photo" class="profile-photo-img">`
                  : `<div class="profile-photo-placeholder">
                     <i class="fas fa-user-circle"></i>
                     <span>No photo</span>
                   </div>`
              }
            </div>
            <div class="photo-upload-controls">
              <input type="file" id="profilePhotoInput" accept="image/*" class="file-input" style="display: none;">
              <button type="button" class="btn btn-outline" id="uploadPhotoBtn">
                <i class="fas fa-camera"></i>
                Choose Photo
              </button>
              ${
                this.profile.profilePhoto
                  ? `<button type="button" class="btn btn-outline" id="removePhotoBtn">
                     <i class="fas fa-trash"></i>
                     Remove Photo
                   </button>`
                  : ''
              }
            </div>
          </div>
        </div>
      </div>

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

    console.log(
      'ProfilePage: General tab content created, length:',
      result.length
    );
    return result;
  }

  createTrainingTab() {
    return `
      <div class="training-tab-container">
        <!-- FTP Test Calculator Section -->
        <div class="ftp-calculator-section">
          <div id="ftpTestCalculatorContainer" class="component-container">
            <!-- FTPTestCalculator component will be rendered here -->
          </div>
        </div>
        
        <!-- Training Zones Section -->
        <div class="training-zones-section">
          <div id="trainingZonesContainer" class="component-container">
            <!-- TrainingZones component will be rendered here -->
          </div>
        </div>
        
        <!-- FTP History Section -->
        <div class="ftp-history-section">
          <div id="ftpHistoryContainer" class="component-container">
            <!-- FTPHistory component will be rendered here -->
          </div>
        </div>
      </div>
    `;
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

  createGoalsTab() {
    const activeGoals = this.goals.filter(goal => goal.status === 'active');
    const completedGoals = this.goals.filter(goal => goal.status === 'completed');

    return `
      <div class="form-section">
        <div class="section-header">
          <h3 class="section-title">Training Goals</h3>
          <button class="btn btn-primary" id="addGoalBtn">
            <i class="fas fa-plus"></i>
            Add New Goal
          </button>
        </div>

        <!-- Goal Creation/Edit Form -->
        <div class="goal-form-container" id="goalFormContainer" style="display: none;">
          <div class="goal-form">
            <h4 id="goalFormTitle">Create New Goal</h4>
            
            <div class="form-grid">
              <div class="form-group">
                <label for="goalType">Goal Type</label>
                <select id="goalType" class="form-select">
                  <option value="${GOAL_TYPES.FTP}">FTP Improvement</option>
                  <option value="${GOAL_TYPES.VOLUME}">Training Volume</option>
                  <option value="${GOAL_TYPES.EVENT}">Event Preparation</option>
                  <option value="${GOAL_TYPES.WEIGHT}">Weight Management</option>
                  <option value="${GOAL_TYPES.CUSTOM}">Custom Goal</option>
                </select>
              </div>

              <div class="form-group">
                <label for="goalName">Goal Name</label>
                <input type="text" id="goalName" class="form-input" placeholder="Enter goal name" required>
              </div>

              <div class="form-group">
                <label for="goalDescription">Description</label>
                <textarea id="goalDescription" class="form-textarea" placeholder="Describe your goal..."></textarea>
              </div>

              <div class="form-group">
                <label for="goalTargetValue">Target Value</label>
                <input type="number" id="goalTargetValue" class="form-input" placeholder="Target value" required>
              </div>

              <div class="form-group">
                <label for="goalCurrentValue">Current Value</label>
                <input type="number" id="goalCurrentValue" class="form-input" placeholder="Current value" required>
              </div>

              <div class="form-group">
                <label for="goalTargetDate">Target Date</label>
                <input type="date" id="goalTargetDate" class="form-input" required>
              </div>
            </div>

            <div class="goal-form-actions">
              <button class="btn btn-primary" id="saveGoalBtn">
                <i class="fas fa-save"></i>
                Save Goal
              </button>
              <button class="btn btn-outline" id="cancelGoalBtn">
                <i class="fas fa-times"></i>
                Cancel
              </button>
            </div>
          </div>
        </div>

        <!-- Active Goals Section -->
        <div class="goals-section">
          <h4 class="subsection-title">Active Goals (${activeGoals.length})</h4>
          
          ${activeGoals.length === 0 
            ? `<div class="empty-goals">
                <i class="fas fa-bullseye empty-icon"></i>
                <p>No active goals yet</p>
                <p class="empty-subtext">Create your first training goal to start tracking progress</p>
               </div>`
            : `<div class="goals-grid">
                ${activeGoals.map(goal => this.createGoalCard(goal)).join('')}
               </div>`
          }
        </div>

        <!-- Completed Goals Section -->
        ${completedGoals.length > 0 ? `
          <div class="goals-section">
            <h4 class="subsection-title">Completed Goals (${completedGoals.length})</h4>
            <div class="goals-grid">
              ${completedGoals.map(goal => this.createGoalCard(goal)).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  createGoalCard(goal) {
    const progressPercentage = Math.min(100, Math.max(0, goal.progress));
    const statusClass = goal.status === 'completed' ? 'completed' : 
                       goal.status === 'paused' ? 'paused' : 'active';
    
    const daysRemaining = goal.targetDate ? 
      Math.max(0, Math.ceil((new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24))) : 0;

    return `
      <div class="goal-card ${statusClass}" data-goal-id="${goal.id}">
        <div class="goal-header">
          <div class="goal-type-badge ${goal.type}">
            ${this.getGoalTypeIcon(goal.type)}
            ${goal.type.toUpperCase()}
          </div>
          <div class="goal-actions">
            <button class="goal-action-btn edit-goal" data-goal-id="${goal.id}" title="Edit Goal">
              <i class="fas fa-edit"></i>
            </button>
            ${goal.status !== 'completed' ? `
              <button class="goal-action-btn complete-goal" data-goal-id="${goal.id}" title="Mark Complete">
                <i class="fas fa-check"></i>
              </button>
            ` : ''}
            <button class="goal-action-btn delete-goal" data-goal-id="${goal.id}" title="Delete Goal">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>

        <div class="goal-content">
          <h5 class="goal-name">${goal.name}</h5>
          <p class="goal-description">${goal.description}</p>

          <div class="goal-progress">
            <div class="progress-header">
              <span class="progress-label">Progress</span>
              <span class="progress-value">${progressPercentage.toFixed(1)}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progressPercentage}%"></div>
            </div>
            <div class="progress-details">
              <span class="current-value">${goal.currentValue} ${goal.unit || ''}</span>
              <span class="target-value">of ${goal.targetValue} ${goal.unit || ''}</span>
            </div>
          </div>

          ${goal.targetDate ? `
            <div class="goal-timeline">
              <div class="timeline-item">
                <i class="fas fa-calendar"></i>
                <span>Target: ${new Date(goal.targetDate).toLocaleDateString()}</span>
              </div>
              ${goal.status !== 'completed' ? `
                <div class="timeline-item">
                  <i class="fas fa-clock"></i>
                  <span>${daysRemaining} days remaining</span>
                </div>
              ` : `
                <div class="timeline-item completed">
                  <i class="fas fa-trophy"></i>
                  <span>Completed ${new Date(goal.completedDate).toLocaleDateString()}</span>
                </div>
              `}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  getGoalTypeIcon(type) {
    const iconMap = {
      [GOAL_TYPES.FTP]: '<i class="fas fa-bolt"></i>',
      [GOAL_TYPES.VOLUME]: '<i class="fas fa-clock"></i>',
      [GOAL_TYPES.EVENT]: '<i class="fas fa-flag"></i>',
      [GOAL_TYPES.WEIGHT]: '<i class="fas fa-weight"></i>',
      [GOAL_TYPES.CUSTOM]: '<i class="fas fa-star"></i>'
    };
    return iconMap[type] || '<i class="fas fa-bullseye"></i>';
  }

  async onInit() {
    console.log('ProfilePage: Starting onInit()');

    this.setupTabs();
    console.log('ProfilePage: Tabs setup completed');

    this.setupFormHandlers();
    console.log('ProfilePage: Form handlers setup completed');

    this.setupGoalsHandlers();
    console.log('ProfilePage: Goals handlers setup completed');

    this.setupSaveButton();
    console.log('ProfilePage: Save button setup completed');

    // Initialize advanced components after base setup
    this.initializeAdvancedComponents();

    logger.info('Profile page initialized successfully');
    console.log('ProfilePage: onInit() completed successfully');
  }

  /**
   * Initialize advanced FTP and zone management components
   */
  initializeAdvancedComponents() {
    console.log('ProfilePage: Initializing advanced components');

    // Only initialize when training tab containers exist
    const ftpCalculatorContainer = document.getElementById(
      'ftpTestCalculatorContainer'
    );
    const trainingZonesContainer = document.getElementById(
      'trainingZonesContainer'
    );
    const ftpHistoryContainer = document.getElementById('ftpHistoryContainer');

    if (ftpCalculatorContainer && !this.ftpTestCalculator) {
      console.log('ProfilePage: Initializing FTPTestCalculator');
      this.ftpTestCalculator = new FTPTestCalculator(ftpCalculatorContainer);
      this.ftpTestCalculator.render();
    }

    if (trainingZonesContainer && !this.trainingZones) {
      console.log('ProfilePage: Initializing TrainingZones');
      this.trainingZones = new TrainingZones(trainingZonesContainer);
      this.trainingZones.render();
    }

    if (ftpHistoryContainer && !this.ftpHistory) {
      console.log('ProfilePage: Initializing FTPHistory');
      this.ftpHistory = new FTPHistory(ftpHistoryContainer);
      this.ftpHistory.render();
    }
  }

  setupTabs() {
    const tabButtons = this.container.querySelectorAll('.tab-button');
    console.log('ProfilePage: Found', tabButtons.length, 'tab buttons');

    tabButtons.forEach(button => {
      console.log(
        'ProfilePage: Setting up tab button for:',
        button.dataset.tab
      );
      this.addEventListener(button, 'click', () => {
        const tabId = button.dataset.tab;
        console.log('ProfilePage: Tab clicked:', tabId);
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

    // Initialize advanced components when training tab is selected
    if (tabId === 'training') {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        this.initializeAdvancedComponents();
      }, 100);
    }
  }

  setupFormHandlers() {
    // Profile photo upload handlers
    const uploadPhotoBtn = this.container.querySelector('#uploadPhotoBtn');
    const profilePhotoInput =
      this.container.querySelector('#profilePhotoInput');
    const removePhotoBtn = this.container.querySelector('#removePhotoBtn');

    if (uploadPhotoBtn) {
      this.addEventListener(uploadPhotoBtn, 'click', () => {
        profilePhotoInput?.click();
      });
    }

    if (profilePhotoInput) {
      this.addEventListener(profilePhotoInput, 'change', async event => {
        const file = event.target.files[0];
        if (file) {
          await this.handlePhotoUpload(file);
        }
      });
    }

    if (removePhotoBtn) {
      this.addEventListener(removePhotoBtn, 'click', () => {
        this.handlePhotoRemove();
      });
    }

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

  setupGoalsHandlers() {
    // Add Goal button
    const addGoalBtn = this.container.querySelector('#addGoalBtn');
    if (addGoalBtn) {
      this.addEventListener(addGoalBtn, 'click', () => {
        this.showGoalForm();
      });
    }

    // Goal form buttons
    const saveGoalBtn = this.container.querySelector('#saveGoalBtn');
    if (saveGoalBtn) {
      this.addEventListener(saveGoalBtn, 'click', () => {
        this.handleSaveGoal();
      });
    }

    const cancelGoalBtn = this.container.querySelector('#cancelGoalBtn');
    if (cancelGoalBtn) {
      this.addEventListener(cancelGoalBtn, 'click', () => {
        this.hideGoalForm();
      });
    }

    // Goal action buttons (edit, complete, delete)
    const editGoalBtns = this.container.querySelectorAll('.edit-goal');
    editGoalBtns.forEach(btn => {
      this.addEventListener(btn, 'click', (event) => {
        const goalId = event.target.closest('.edit-goal').dataset.goalId;
        this.handleEditGoal(goalId);
      });
    });

    const completeGoalBtns = this.container.querySelectorAll('.complete-goal');
    completeGoalBtns.forEach(btn => {
      this.addEventListener(btn, 'click', (event) => {
        const goalId = event.target.closest('.complete-goal').dataset.goalId;
        this.handleCompleteGoal(goalId);
      });
    });

    const deleteGoalBtns = this.container.querySelectorAll('.delete-goal');
    deleteGoalBtns.forEach(btn => {
      this.addEventListener(btn, 'click', (event) => {
        const goalId = event.target.closest('.delete-goal').dataset.goalId;
        this.handleDeleteGoal(goalId);
      });
    });
  }

  showGoalForm(goal = null) {
    const formContainer = this.container.querySelector('#goalFormContainer');
    const formTitle = this.container.querySelector('#goalFormTitle');
    
    if (!formContainer || !formTitle) return;

    // Set form title and mode
    this.editingGoal = goal;
    formTitle.textContent = goal ? 'Edit Goal' : 'Create New Goal';

    // Populate form if editing
    if (goal) {
      this.container.querySelector('#goalType').value = goal.type;
      this.container.querySelector('#goalName').value = goal.name;
      this.container.querySelector('#goalDescription').value = goal.description || '';
      this.container.querySelector('#goalTargetValue').value = goal.targetValue;
      this.container.querySelector('#goalCurrentValue').value = goal.currentValue;
      this.container.querySelector('#goalTargetDate').value = goal.targetDate ? 
        new Date(goal.targetDate).toISOString().split('T')[0] : '';
    } else {
      // Clear form for new goal
      this.container.querySelector('#goalType').value = GOAL_TYPES.CUSTOM;
      this.container.querySelector('#goalName').value = '';
      this.container.querySelector('#goalDescription').value = '';
      this.container.querySelector('#goalTargetValue').value = '';
      this.container.querySelector('#goalCurrentValue').value = '';
      this.container.querySelector('#goalTargetDate').value = '';
    }

    formContainer.style.display = 'block';
  }

  hideGoalForm() {
    const formContainer = this.container.querySelector('#goalFormContainer');
    if (formContainer) {
      formContainer.style.display = 'none';
      this.editingGoal = null;
    }
  }

  handleSaveGoal() {
    // Collect form data
    const type = this.container.querySelector('#goalType').value;
    const name = this.container.querySelector('#goalName').value.trim();
    const description = this.container.querySelector('#goalDescription').value.trim();
    const targetValue = parseFloat(this.container.querySelector('#goalTargetValue').value);
    const currentValue = parseFloat(this.container.querySelector('#goalCurrentValue').value);
    const targetDate = this.container.querySelector('#goalTargetDate').value;

    // Validate form
    if (!name) {
      this.showError('Goal name is required');
      return;
    }
    if (isNaN(targetValue) || targetValue <= 0) {
      this.showError('Target value must be a positive number');
      return;
    }
    if (isNaN(currentValue) || currentValue < 0) {
      this.showError('Current value must be a non-negative number');
      return;
    }
    if (!targetDate) {
      this.showError('Target date is required');
      return;
    }

    try {
      if (this.editingGoal) {
        // Update existing goal
        const goalIndex = this.goals.findIndex(g => g.id === this.editingGoal.id);
        if (goalIndex !== -1) {
          const updatedGoal = this.goals[goalIndex];
          updatedGoal.name = name;
          updatedGoal.description = description;
          updatedGoal.targetValue = targetValue;
          updatedGoal.targetDate = new Date(targetDate);
          updatedGoal.updateProgress(currentValue);
          
          this.showSuccess('Goal updated successfully!');
        }
      } else {
        // Create new goal using factory methods
        let newGoal;
        switch (type) {
          case GOAL_TYPES.FTP:
            newGoal = TrainingGoal.createFTPGoal({
              name,
              description,
              targetValue,
              currentValue,
              targetDate: new Date(targetDate)
            });
            break;
          case GOAL_TYPES.VOLUME:
            newGoal = TrainingGoal.createVolumeGoal({
              name,
              description,
              targetValue,
              currentValue,
              targetDate: new Date(targetDate)
            });
            break;
          case GOAL_TYPES.EVENT:
            newGoal = TrainingGoal.createEventGoal({
              name,
              description,
              targetValue,
              currentValue,
              targetDate: new Date(targetDate)
            });
            break;
          case GOAL_TYPES.WEIGHT:
            newGoal = TrainingGoal.createWeightGoal({
              name,
              description,
              targetValue,
              currentValue,
              targetDate: new Date(targetDate)
            });
            break;
          default:
            newGoal = new TrainingGoal({
              type,
              name,
              description,
              targetValue,
              currentValue,
              targetDate: new Date(targetDate)
            });
        }

        this.goals.push(newGoal);
        this.showSuccess('Goal created successfully!');
      }

      this.hideGoalForm();
      this.refreshGoalsTab();

    } catch (error) {
      logger.error('Failed to save goal:', error);
      this.showError('Failed to save goal. Please try again.');
    }
  }

  handleEditGoal(goalId) {
    const goal = this.goals.find(g => g.id === goalId);
    if (goal) {
      this.showGoalForm(goal);
    }
  }

  handleCompleteGoal(goalId) {
    const goal = this.goals.find(g => g.id === goalId);
    if (goal) {
      goal.complete();
      this.showSuccess(`Goal "${goal.name}" marked as complete!`);
      this.refreshGoalsTab();
    }
  }

  handleDeleteGoal(goalId) {
    const goal = this.goals.find(g => g.id === goalId);
    if (goal && confirm(`Are you sure you want to delete the goal "${goal.name}"?`)) {
      const index = this.goals.findIndex(g => g.id === goalId);
      if (index !== -1) {
        this.goals.splice(index, 1);
        this.showSuccess('Goal deleted successfully!');
        this.refreshGoalsTab();
      }
    }
  }

  refreshGoalsTab() {
    const goalsPanel = this.container.querySelector('#goals-panel');
    if (goalsPanel && this.activeTab === 'goals') {
      goalsPanel.innerHTML = this.createGoalsTab();
      // Re-setup goals handlers for the refreshed content
      this.setupGoalsHandlers();
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

  async handlePhotoUpload(file) {
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.showError('Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        this.showError('Image file too large (maximum 5MB)');
        return;
      }

      this.setLoadingState(true, 'Uploading photo...');

      // Initialize profile service if needed
      if (!profileService.initialized) {
        await profileService.initialize();
      }

      // Upload photo using profile service
      await profileService.updateProfilePhoto(file);

      // Update local profile state
      const reader = new FileReader();
      reader.onload = e => {
        this.profile.profilePhoto = e.target.result;
        this.refreshGeneralTab();
      };
      reader.readAsDataURL(file);

      this.setLoadingState(false);
      this.showSuccess('Profile photo updated successfully!');

      logger.info('Profile photo uploaded successfully');
    } catch (error) {
      logger.error('Failed to upload profile photo:', error);
      this.setLoadingState(false);
      this.showError(`Failed to upload photo: ${error.message}`);
    }
  }

  handlePhotoRemove() {
    try {
      // Update local state
      this.profile.profilePhoto = null;

      // Refresh the UI to hide the photo and remove button
      this.refreshGeneralTab();

      // Note: Photo will be removed from service when profile is saved
      this.showSuccess(
        "Profile photo removed. Don't forget to save your changes."
      );

      logger.info('Profile photo removed from local state');
    } catch (error) {
      logger.error('Failed to remove profile photo:', error);
      this.showError('Failed to remove photo');
    }
  }

  refreshGeneralTab() {
    // Refresh only the General tab content
    const generalPanel = this.container.querySelector('#general-panel');
    if (generalPanel && this.activeTab === 'general') {
      generalPanel.innerHTML = this.createGeneralTab();
      // Re-setup form handlers for the refreshed content
      this.setupFormHandlers();
    }
  }

  startFTPTest() {
    // TODO: Implement FTP test functionality
    this.showSuccess('FTP Test functionality coming soon!');
  }

  async saveProfile() {
    try {
      // Collect form data
      const formData = this.collectFormData();

      // Validate profile data
      const validation = this.validateProfileData(formData.profile);

      if (!validation.isValid) {
        this.showValidationFeedback(validation.errors, validation.warnings);
        return;
      }

      // Show warnings but allow save to continue
      if (validation.warnings.length > 0) {
        this.showValidationFeedback([], validation.warnings);
      }

      this.setLoadingState(true, 'Saving profile...');

      // Update local state
      this.profile = { ...this.profile, ...formData.profile };
      this.preferences = { ...this.preferences, ...formData.preferences };

      // Initialize profile service if needed
      if (!profileService.initialized) {
        await profileService.initialize();
      }

      // Check if this is a new profile or an update
      const currentProfile = profileService.getCurrentProfile();

      if (currentProfile) {
        // Update existing profile
        await profileService.updateProfile(formData.profile);
        logger.info('Profile updated successfully');
      } else {
        // Create new profile
        const profileId = await profileService.createProfile(formData.profile);
        logger.info('New profile created with ID:', profileId);
        this.showSuccess(
          'Welcome! Your profile has been created successfully!'
        );
      }

      // Update preferences if they exist
      if (
        formData.preferences &&
        Object.keys(formData.preferences).length > 0
      ) {
        // Note: ProfileService may not have updatePreferences method, so we save as part of profile
        const profileUpdate = {
          ...formData.profile,
          preferences: formData.preferences,
        };

        if (currentProfile) {
          await profileService.updateProfile(profileUpdate);
        }
      }

      this.setLoadingState(false);

      // Clear validation feedback on successful save
      const existingFeedback = this.container.querySelectorAll(
        '.validation-feedback'
      );
      existingFeedback.forEach(el => el.remove());

      this.showSuccess(
        currentProfile
          ? 'Profile updated successfully!'
          : 'Profile created successfully!'
      );

      // Reload profile data to reflect any server-side changes
      await this.loadData();
    } catch (error) {
      logger.error('Failed to save profile:', error);
      this.setLoadingState(false);
      this.showError(`Failed to save profile: ${error.message}`);
    }
  }

  collectFormData() {
    const profile = {
      name:
        this.container.querySelector('#profileName')?.value?.trim() ||
        this.profile.name,
      email:
        this.container.querySelector('#profileEmail')?.value?.trim() ||
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
      profilePhoto: this.profile.profilePhoto || null,
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

  /**
   * Validate profile form data
   * @param {Object} profileData - Profile data to validate
   * @returns {Object} Validation result with isValid flag and errors array
   */
  validateProfileData(profileData) {
    const errors = [];
    const warnings = [];

    // Name validation
    if (!profileData.name || profileData.name.trim() === '') {
      errors.push('Name is required');
    } else if (profileData.name.length < 2) {
      errors.push('Name must be at least 2 characters long');
    } else if (profileData.name.length > 100) {
      errors.push('Name must be less than 100 characters');
    }

    // Email validation
    if (profileData.email && profileData.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(profileData.email)) {
        errors.push('Please enter a valid email address');
      }
    }

    // Birth year validation
    const currentYear = new Date().getFullYear();
    if (profileData.birthYear) {
      if (profileData.birthYear < 1920 || profileData.birthYear > currentYear) {
        errors.push(`Birth year must be between 1920 and ${currentYear}`);
      }
      const age = currentYear - profileData.birthYear;
      if (age < 10 || age > 100) {
        warnings.push('Age seems unusual, please verify');
      }
    }

    // FTP validation
    if (profileData.ftp) {
      if (profileData.ftp < 50 || profileData.ftp > 600) {
        errors.push('FTP must be between 50 and 600 watts');
      }
    } else {
      warnings.push('FTP is recommended for accurate training zones');
    }

    // Weight validation
    if (profileData.weight) {
      if (profileData.weight < 30 || profileData.weight > 200) {
        errors.push('Weight must be between 30 and 200 kg');
      }
    }

    // Height validation
    if (profileData.height) {
      if (profileData.height < 100 || profileData.height > 250) {
        errors.push('Height must be between 100 and 250 cm');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Show validation errors and warnings to the user
   * @param {Array} errors - Array of error messages
   * @param {Array} warnings - Array of warning messages
   */
  showValidationFeedback(errors = [], warnings = []) {
    // Remove existing feedback
    const existingFeedback = this.container.querySelectorAll(
      '.validation-feedback'
    );
    existingFeedback.forEach(el => el.remove());

    // Show errors
    if (errors.length > 0) {
      const errorContainer = document.createElement('div');
      errorContainer.className = 'validation-feedback error-feedback';
      errorContainer.innerHTML = `
        <div class="feedback-header">
          <i class="fas fa-exclamation-triangle"></i>
          <span>Please fix the following issues:</span>
        </div>
        <ul class="feedback-list">
          ${errors.map(error => `<li>${error}</li>`).join('')}
        </ul>
      `;

      const saveButton = this.container.querySelector('#saveProfileBtn');
      if (saveButton) {
        saveButton.parentNode.insertBefore(errorContainer, saveButton);
      }
    }

    // Show warnings
    if (warnings.length > 0) {
      const warningContainer = document.createElement('div');
      warningContainer.className = 'validation-feedback warning-feedback';
      warningContainer.innerHTML = `
        <div class="feedback-header">
          <i class="fas fa-exclamation-circle"></i>
          <span>Please review:</span>
        </div>
        <ul class="feedback-list">
          ${warnings.map(warning => `<li>${warning}</li>`).join('')}
        </ul>
      `;

      const saveButton = this.container.querySelector('#saveProfileBtn');
      if (saveButton) {
        saveButton.parentNode.insertBefore(warningContainer, saveButton);
      }
    }
  }

  /**
   * Clean up advanced components when page is destroyed
   */
  destroy() {
    console.log('ProfilePage: Cleaning up advanced components');

    if (this.ftpTestCalculator) {
      this.ftpTestCalculator.destroy();
      this.ftpTestCalculator = null;
    }

    if (this.trainingZones) {
      this.trainingZones.destroy();
      this.trainingZones = null;
    }

    if (this.ftpHistory) {
      this.ftpHistory.destroy();
      this.ftpHistory = null;
    }

    // Call parent cleanup if it exists
    if (super.destroy) {
      super.destroy();
    }
  }
}

export default ProfilePage;
