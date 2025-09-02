/**
 * Profile Page Component
 * Main profile management page that orchestrates all profile components
 */

import { PersonalInfoForm } from './PersonalInfoForm.js';
import { TrainingZones } from './TrainingZones.js';
import { FTPHistory } from './FTPHistory.js';
import { UserPreferences } from './UserPreferences.js';
import { profileService } from '../../services/profile-service.js';
import { stateManager } from '../../services/state-manager.js';

export class ProfilePage {
  constructor(container) {
    this.container = container;
    this.activeTab = 'personal';
    this.components = {
      personalForm: null,
      trainingZones: null,
      ftpHistory: null,
      userPreferences: null,
    };
    this.currentProfile = null;
    this.currentProfileModel = null; // UserProfileModel instance

    // Bind methods
    this.render = this.render.bind(this);
    this.handleTabChange = this.handleTabChange.bind(this);
    this.initializeProfile = this.initializeProfile.bind(this);

    // Subscribe to profile changes
    this.unsubscribeProfile = stateManager.subscribe(
      'userProfile',
      this.handleProfileUpdate.bind(this),
      { immediate: true }
    );

    // Subscribe to UserProfileModel changes
    this.unsubscribeProfileModel = stateManager.subscribe(
      'userProfileModel',
      this.handleProfileModelUpdate.bind(this),
      { immediate: true }
    );

    // Listen for profile-related events
    this.attachGlobalEventListeners();
  }

  /**
   * Handle profile updates from state
   */
  handleProfileUpdate(profile) {
    this.currentProfile = profile;
    this.render();
  }

  /**
   * Handle UserProfileModel updates from state
   */
  handleProfileModelUpdate(profileModel) {
    this.currentProfileModel = profileModel;
    this.render();
  }

  /**
   * Get the active profile data (prioritize model over basic profile)
   */
  getActiveProfileData() {
    if (this.currentProfileModel) {
      // Use UserProfileModel data which is richer
      return {
        id: this.currentProfileModel.id,
        name: this.currentProfileModel.name,
        email: this.currentProfileModel.email,
        ftp: this.currentProfileModel.ftp,
        weight: this.currentProfileModel.weight,
        preferences: this.currentProfileModel.preferences,
        profilePhoto: this.currentProfileModel.avatar,
        ftpHistory: this.currentProfileModel.ftpHistory,
        // Add dashboard-specific data
        hrv: this.currentProfileModel.hrv,
        recoveryStatus: this.currentProfileModel.recoveryStatus,
        trainingLoad: this.currentProfileModel.trainingLoad,
        dashboardMetrics: this.currentProfileModel.getDashboardMetrics(),
      };
    }
    return this.currentProfile;
  }

  /**
   * Initialize profile service
   */
  async initializeProfile() {
    try {
      if (!profileService.initialized) {
        await profileService.initialize();
      }
    } catch (error) {
      console.error('Failed to initialize profile service:', error);
    }
  }

  /**
   * Render the profile page
   */
  render() {
    if (!this.container) return;

    const profileData = this.getActiveProfileData();

    this.container.innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        ${this.renderHeader(profileData)}
        
        <div class="container mx-auto px-4 py-8 max-w-6xl">
          ${profileData ? this.renderTabbedInterface() : this.renderWelcome()}
        </div>
      </div>
    `;

    // Initialize components after DOM is ready
    setTimeout(() => {
      this.initializeComponents();
    }, 100);
  }

  /**
   * Render page header
   */
  renderHeader(profileData = null) {
    return `
      <header class="bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-border sticky top-0 z-10">
        <div class="container mx-auto px-4 py-4 max-w-6xl">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <button
                id="backToAppBtn"
                class="btn-modern btn-outline h-10 px-4"
                title="Back to Workout Visualizer"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                </svg>
                Back
              </button>
              <div>
                <h1 class="text-nebula-h1 font-bold text-foreground">
                  User Profile
                </h1>
                <p class="text-nebula-small text-muted-foreground">
                  Manage your training profile and preferences
                </p>
              </div>
            </div>

            ${
              profileData
                ? `
              <div class="flex items-center space-x-4">
                <div class="text-right">
                  <div class="font-semibold text-foreground">
                    ${profileData.name || 'Profile'}
                  </div>
                  <div class="text-nebula-small text-muted-foreground">
                    FTP: ${profileData.ftp || 250}W
                  </div>
                </div>
                <div class="w-10 h-10 bg-muted rounded-full overflow-hidden flex items-center justify-center">
                  ${
                    profileData.profilePhoto
                      ? `
                    <img
                      src="${profileData.profilePhoto}"
                      alt="Profile"
                      class="w-full h-full object-cover"
                    />
                  `
                      : `
                    <svg class="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                  `
                  }
                </div>
              </div>
            `
                : ''
            }
          </div>
        </div>
      </header>
    `;
  }

  /**
   * Render welcome screen for new users
   */
  renderWelcome() {
    return `
      <div class="max-w-2xl mx-auto">
        <div class="card-modern p-8 text-center">
          <div class="w-24 h-24 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
          </div>
          
          <h2 class="text-nebula-h1 font-bold text-foreground mb-4">
            Welcome to TrainingLab
          </h2>
          
          <p class="text-nebula-body text-muted-foreground mb-8">
            Create your training profile to personalize your experience with training zones, 
            FTP tracking, and performance analytics tailored to your fitness level.
          </p>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div class="text-left p-4 bg-muted/50 rounded-md">
              <div class="flex items-center mb-2">
                <svg class="w-5 h-5 text-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
                <h3 class="font-semibold text-foreground">Training Zones</h3>
              </div>
              <p class="text-nebula-small text-muted-foreground">
                Automatically calculated power zones based on your FTP for effective training
              </p>
            </div>

            <div class="text-left p-4 bg-muted/50 rounded-md">
              <div class="flex items-center mb-2">
                <svg class="w-5 h-5 text-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                </svg>
                <h3 class="font-semibold text-foreground">FTP Tracking</h3>
              </div>
              <p class="text-nebula-small text-muted-foreground">
                Track your Functional Threshold Power over time and monitor progress
              </p>
            </div>

            <div class="text-left p-4 bg-muted/50 rounded-md">
              <div class="flex items-center mb-2">
                <svg class="w-5 h-5 text-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"></path>
                </svg>
                <h3 class="font-semibold text-foreground">Preferences</h3>
              </div>
              <p class="text-nebula-small text-muted-foreground">
                Customize units, themes, and display options for your workflow
              </p>
            </div>

            <div class="text-left p-4 bg-muted/50 rounded-md">
              <div class="flex items-center mb-2">
                <svg class="w-5 h-5 text-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                </svg>
                <h3 class="font-semibold text-foreground">Data Privacy</h3>
              </div>
              <p class="text-nebula-small text-muted-foreground">
                Your data stays private and secure with full export/import control
              </p>
            </div>
          </div>

          <div id="welcomePersonalForm"></div>
        </div>
      </div>
    `;
  }

  /**
   * Render tabbed interface for existing users
   */
  renderTabbedInterface() {
    const tabs = [
      {
        id: 'personal',
        label: 'Personal Info',
        icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>`,
      },
      {
        id: 'zones',
        label: 'Training Zones',
        icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>`,
      },
      {
        id: 'ftp',
        label: 'FTP History',
        icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>`,
      },
      {
        id: 'preferences',
        label: 'Preferences',
        icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>`,
      },
    ];

    return `
      <!-- Tab Navigation -->
      <div class="mb-8">
        <nav class="flex space-x-1 bg-muted/50 p-1 rounded-lg">
          ${tabs
            .map(
              tab => `
            <button
              data-tab="${tab.id}"
              class="tab-button flex items-center space-x-2 px-4 py-3 rounded-md text-nebula-small font-medium transition-colors ${
                this.activeTab === tab.id
                  ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-slate-800/50'
              }"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                ${tab.icon}
              </svg>
              <span>${tab.label}</span>
            </button>
          `
            )
            .join('')}
        </nav>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        <div id="tab-personal" class="tab-panel ${this.activeTab === 'personal' ? 'active' : 'hidden'}">
          <div id="personalInfoContainer"></div>
        </div>

        <div id="tab-zones" class="tab-panel ${this.activeTab === 'zones' ? 'active' : 'hidden'}">
          <div id="trainingZonesContainer"></div>
        </div>

        <div id="tab-ftp" class="tab-panel ${this.activeTab === 'ftp' ? 'active' : 'hidden'}">
          <div id="ftpHistoryContainer"></div>
        </div>

        <div id="tab-preferences" class="tab-panel ${this.activeTab === 'preferences' ? 'active' : 'hidden'}">
          <div id="userPreferencesContainer"></div>
        </div>
      </div>
    `;
  }

  /**
   * Initialize all components
   */
  initializeComponents() {
    this.destroyComponents();

    const profileData = this.getActiveProfileData();

    if (!profileData) {
      // Initialize welcome form
      const welcomeContainer = document.getElementById('welcomePersonalForm');
      if (welcomeContainer) {
        this.components.personalForm = new PersonalInfoForm(welcomeContainer);
      }
      return;
    }

    // Initialize tabbed components
    const containers = {
      personalInfoContainer: PersonalInfoForm,
      trainingZonesContainer: TrainingZones,
      ftpHistoryContainer: FTPHistory,
      userPreferencesContainer: UserPreferences,
    };

    Object.entries(containers).forEach(([containerId, ComponentClass]) => {
      const container = document.getElementById(containerId);
      if (container) {
        const componentKey = containerId
          .replace('Container', '')
          .replace('Info', '');
        this.components[componentKey] = new ComponentClass(container);
      }
    });

    // Attach tab event listeners
    this.attachTabEventListeners();
  }

  /**
   * Destroy all components
   */
  destroyComponents() {
    Object.values(this.components).forEach(component => {
      if (component?.destroy) {
        component.destroy();
      }
    });

    this.components = {
      personalForm: null,
      trainingZones: null,
      ftpHistory: null,
      userPreferences: null,
    };
  }

  /**
   * Attach tab event listeners
   */
  attachTabEventListeners() {
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
      button.addEventListener('click', this.handleTabChange);
    });

    // Back button
    const backBtn = document.getElementById('backToAppBtn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        // Navigate back to main app
        this.navigateBack();
      });
    }
  }

  /**
   * Handle tab change
   */
  handleTabChange(event) {
    const tabId = event.currentTarget.getAttribute('data-tab');
    if (tabId && tabId !== this.activeTab) {
      this.activeTab = tabId;

      // Update tab buttons
      document.querySelectorAll('.tab-button').forEach(btn => {
        const isActive = btn.getAttribute('data-tab') === tabId;
        btn.className = `tab-button flex items-center space-x-2 px-4 py-3 rounded-md text-nebula-small font-medium transition-colors ${
          isActive
            ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-slate-800/50'
        }`;
      });

      // Update tab panels
      document.querySelectorAll('.tab-panel').forEach(panel => {
        const isActive = panel.id === `tab-${tabId}`;
        panel.className = `tab-panel ${isActive ? 'active' : 'hidden'}`;
      });
    }
  }

  /**
   * Navigate back to main app
   */
  navigateBack() {
    // Hide profile page and show main app
    if (this.container) {
      this.container.style.display = 'none';
    }

    // Show main app sections
    const sections = ['workoutSection', 'heroSection'];
    sections.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.style.display = 'block';
      }
    });

    // Emit event for other parts of the app
    window.dispatchEvent(new CustomEvent('profile:closed'));
  }

  /**
   * Show profile page
   */
  show() {
    if (this.container) {
      this.container.style.display = 'block';
    }

    // Initialize profile service
    this.initializeProfile();

    // Hide main app sections
    const sections = ['workoutSection', 'heroSection'];
    sections.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.style.display = 'none';
      }
    });

    // Emit event for other parts of the app
    window.dispatchEvent(new CustomEvent('profile:opened'));
  }

  /**
   * Hide profile page
   */
  hide() {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  /**
   * Attach global event listeners
   */
  attachGlobalEventListeners() {
    // Listen for FTP edit requests from training zones
    window.addEventListener('profile:editFTP', () => {
      this.activeTab = 'personal';
      this.render();
    });

    // Listen for tab change requests
    window.addEventListener('profile:switchTab', event => {
      if (event.detail?.tab) {
        this.activeTab = event.detail.tab;
        this.render();
      }
    });
  }

  /**
   * Get current active component
   */
  getActiveComponent() {
    const componentMap = {
      personal: this.components.personalForm,
      zones: this.components.trainingZones,
      ftp: this.components.ftpHistory,
      preferences: this.components.userPreferences,
    };

    return componentMap[this.activeTab];
  }

  /**
   * Switch to specific tab
   */
  switchToTab(tabId) {
    if (['personal', 'zones', 'ftp', 'preferences'].includes(tabId)) {
      this.activeTab = tabId;
      this.render();
    }
  }

  /**
   * Refresh current tab
   */
  refresh() {
    this.render();
  }

  /**
   * Destroy the profile page
   */
  destroy() {
    this.destroyComponents();

    if (this.unsubscribeProfile) {
      this.unsubscribeProfile();
    }

    if (this.unsubscribeProfileModel) {
      this.unsubscribeProfileModel();
    }
  }
}
