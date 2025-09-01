/**
 * User Preferences Component
 * Manages user preferences and settings
 */

import { profileService } from '../../services/profile-service.js';
import { stateManager } from '../../services/state-manager.js';
import { powerZoneManager } from '../../core/power-zones.js';

export class UserPreferences {
  constructor(container) {
    this.container = container;
    this.currentProfile = null;
    
    // Bind methods
    this.render = this.render.bind(this);
    this.handlePreferenceChange = this.handlePreferenceChange.bind(this);
    this.handleExport = this.handleExport.bind(this);
    this.handleImport = this.handleImport.bind(this);
    this.handleDataPrivacy = this.handleDataPrivacy.bind(this);

    // Subscribe to profile changes
    this.unsubscribeProfile = stateManager.subscribe(
      'userProfile',
      this.handleProfileUpdate.bind(this),
      { immediate: true }
    );
  }

  /**
   * Handle profile updates from state
   */
  handleProfileUpdate(profile) {
    this.currentProfile = profile;
    this.render();
  }

  /**
   * Render the user preferences component
   */
  render() {
    if (!this.container) return;

    if (!this.currentProfile) {
      this.renderNoProfile();
      return;
    }

    this.container.innerHTML = `
      <div class="space-y-6">
        ${this.renderDisplayPreferences()}
        ${this.renderUnitsAndFormat()}
        ${this.renderNotificationSettings()}
        ${this.renderDataPrivacy()}
        ${this.renderDataManagement()}
      </div>
    `;

    this.attachEventListeners();
  }

  /**
   * Render no profile message
   */
  renderNoProfile() {
    this.container.innerHTML = `
      <div class="card-modern p-6">
        <div class="text-center py-8">
          <div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          </div>
          <h3 class="text-nebula-h3 font-semibold text-foreground mb-2">
            Profile Required
          </h3>
          <p class="text-nebula-body text-muted-foreground">
            Please create a profile to access preferences.
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Render display preferences section
   */
  renderDisplayPreferences() {
    const prefs = this.currentProfile.preferences || {};
    const displayOptions = prefs.displayOptions || {};
    const availableModels = powerZoneManager.getAvailableModels();

    return `
      <div class="card-modern p-6">
        <h3 class="text-nebula-h3 font-semibold text-foreground mb-6">
          Display Preferences
        </h3>
        
        <div class="space-y-6">
          <!-- Theme Selection -->
          <div>
            <label class="block text-nebula-small font-medium text-foreground mb-3">
              Theme
            </label>
            <div class="grid grid-cols-3 gap-3">
              <div class="relative">
                <input
                  type="radio"
                  id="theme-light"
                  name="theme"
                  value="light"
                  ${(prefs.theme || 'light') === 'light' ? 'checked' : ''}
                  class="sr-only peer"
                />
                <label
                  for="theme-light"
                  class="flex items-center justify-center p-3 bg-white border-2 border-border rounded-md cursor-pointer peer-checked:border-primary peer-checked:bg-primary/5 hover:border-primary/50 transition-colors"
                >
                  <div class="text-center">
                    <svg class="w-5 h-5 mx-auto mb-1 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"></path>
                    </svg>
                    <div class="text-nebula-small font-medium">Light</div>
                  </div>
                </label>
              </div>
              <div class="relative">
                <input
                  type="radio"
                  id="theme-dark"
                  name="theme"
                  value="dark"
                  ${prefs.theme === 'dark' ? 'checked' : ''}
                  class="sr-only peer"
                />
                <label
                  for="theme-dark"
                  class="flex items-center justify-center p-3 bg-slate-800 border-2 border-border rounded-md cursor-pointer peer-checked:border-primary peer-checked:bg-primary/5 hover:border-primary/50 transition-colors"
                >
                  <div class="text-center text-white">
                    <svg class="w-5 h-5 mx-auto mb-1 text-slate-300" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
                    </svg>
                    <div class="text-nebula-small font-medium">Dark</div>
                  </div>
                </label>
              </div>
              <div class="relative">
                <input
                  type="radio"
                  id="theme-auto"
                  name="theme"
                  value="auto"
                  ${prefs.theme === 'auto' ? 'checked' : ''}
                  class="sr-only peer"
                />
                <label
                  for="theme-auto"
                  class="flex items-center justify-center p-3 bg-gradient-to-br from-yellow-100 to-slate-800 border-2 border-border rounded-md cursor-pointer peer-checked:border-primary peer-checked:bg-primary/5 hover:border-primary/50 transition-colors"
                >
                  <div class="text-center">
                    <svg class="w-5 h-5 mx-auto mb-1 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                    </svg>
                    <div class="text-nebula-small font-medium text-slate-600">Auto</div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <!-- Power Display -->
          <div class="flex items-center justify-between">
            <div>
              <label for="showPowerInWatts" class="text-nebula-small font-medium text-foreground">
                Show Power in Watts
              </label>
              <p class="text-nebula-small text-muted-foreground">
                Display power values in watts instead of percentage
              </p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="showPowerInWatts"
                name="showPowerInWatts"
                ${displayOptions.showPowerInWatts !== false ? 'checked' : ''}
                class="sr-only peer"
              />
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <!-- Chart Type -->
          <div>
            <label for="chartType" class="block text-nebula-small font-medium text-foreground mb-2">
              Chart Type
            </label>
            <select
              id="chartType"
              name="chartType"
              class="input-modern w-full"
            >
              <option value="line" ${displayOptions.chartType === 'line' ? 'selected' : ''}>
                Line Chart
              </option>
              <option value="area" ${displayOptions.chartType === 'area' ? 'selected' : ''}>
                Area Chart
              </option>
              <option value="bar" ${displayOptions.chartType === 'bar' ? 'selected' : ''}>
                Bar Chart
              </option>
            </select>
          </div>

          <!-- Zone Model -->
          <div>
            <label for="zoneModel" class="block text-nebula-small font-medium text-foreground mb-2">
              Training Zone Model
            </label>
            <select
              id="zoneModel"
              name="zoneModel"
              class="input-modern w-full"
            >
              ${Object.entries(availableModels).map(([key, model]) => `
                <option value="${key}" ${(displayOptions.zoneModel || 'coggan') === key ? 'selected' : ''}>
                  ${model.name}
                </option>
              `).join('')}
            </select>
            <p class="text-nebula-small text-muted-foreground mt-2">
              Choose the training zone model that matches your training methodology
            </p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render units and format section
   */
  renderUnitsAndFormat() {
    const prefs = this.currentProfile.preferences || {};

    return `
      <div class="card-modern p-6">
        <h3 class="text-nebula-h3 font-semibold text-foreground mb-6">
          Units & Format
        </h3>
        
        <div class="space-y-6">
          <!-- Measurement Units -->
          <div>
            <label class="block text-nebula-small font-medium text-foreground mb-3">
              Measurement Units
            </label>
            <div class="grid grid-cols-2 gap-3">
              <div class="relative">
                <input
                  type="radio"
                  id="units-metric"
                  name="units"
                  value="metric"
                  ${(this.currentProfile.units || 'metric') === 'metric' ? 'checked' : ''}
                  class="sr-only peer"
                />
                <label
                  for="units-metric"
                  class="block p-4 border-2 border-border rounded-md cursor-pointer peer-checked:border-primary peer-checked:bg-primary/5 hover:border-primary/50 transition-colors"
                >
                  <div class="font-medium text-foreground">Metric</div>
                  <div class="text-nebula-small text-muted-foreground">
                    kg, km, °C, meters
                  </div>
                </label>
              </div>
              <div class="relative">
                <input
                  type="radio"
                  id="units-imperial"
                  name="units"
                  value="imperial"
                  ${this.currentProfile.units === 'imperial' ? 'checked' : ''}
                  class="sr-only peer"
                />
                <label
                  for="units-imperial"
                  class="block p-4 border-2 border-border rounded-md cursor-pointer peer-checked:border-primary peer-checked:bg-primary/5 hover:border-primary/50 transition-colors"
                >
                  <div class="font-medium text-foreground">Imperial</div>
                  <div class="text-nebula-small text-muted-foreground">
                    lbs, miles, °F, feet
                  </div>
                </label>
              </div>
            </div>
          </div>

          <!-- Date Format -->
          <div>
            <label for="dateFormat" class="block text-nebula-small font-medium text-foreground mb-2">
              Date Format
            </label>
            <select
              id="dateFormat"
              name="dateFormat"
              class="input-modern w-full"
            >
              <option value="US" ${(prefs.dateFormat || 'US') === 'US' ? 'selected' : ''}>
                MM/DD/YYYY (US)
              </option>
              <option value="EU" ${prefs.dateFormat === 'EU' ? 'selected' : ''}>
                DD/MM/YYYY (European)
              </option>
              <option value="ISO" ${prefs.dateFormat === 'ISO' ? 'selected' : ''}>
                YYYY-MM-DD (ISO)
              </option>
            </select>
          </div>

          <!-- Time Format -->
          <div>
            <label for="timeFormat" class="block text-nebula-small font-medium text-foreground mb-2">
              Time Format
            </label>
            <select
              id="timeFormat"
              name="timeFormat"
              class="input-modern w-full"
            >
              <option value="12h" ${(prefs.timeFormat || '12h') === '12h' ? 'selected' : ''}>
                12 Hour (AM/PM)
              </option>
              <option value="24h" ${prefs.timeFormat === '24h' ? 'selected' : ''}>
                24 Hour
              </option>
            </select>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render notification settings section
   */
  renderNotificationSettings() {
    const prefs = this.currentProfile.preferences || {};

    return `
      <div class="card-modern p-6">
        <h3 class="text-nebula-h3 font-semibold text-foreground mb-6">
          Notifications
        </h3>
        
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <label for="notifications" class="text-nebula-small font-medium text-foreground">
                Enable Notifications
              </label>
              <p class="text-nebula-small text-muted-foreground">
                Receive notifications for FTP tests and training reminders
              </p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="notifications"
                name="notifications"
                ${prefs.notifications !== false ? 'checked' : ''}
                class="sr-only peer"
              />
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div class="flex items-center justify-between">
            <div>
              <label for="ftpTestReminders" class="text-nebula-small font-medium text-foreground">
                FTP Test Reminders
              </label>
              <p class="text-nebula-small text-muted-foreground">
                Remind me to test FTP every 6-8 weeks
              </p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="ftpTestReminders"
                name="ftpTestReminders"
                ${(prefs.ftpTestReminders !== false && prefs.notifications !== false) ? 'checked' : ''}
                class="sr-only peer"
              />
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div class="flex items-center justify-between">
            <div>
              <label for="trainingReminders" class="text-nebula-small font-medium text-foreground">
                Training Reminders
              </label>
              <p class="text-nebula-small text-muted-foreground">
                Remind me about planned training sessions
              </p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="trainingReminders"
                name="trainingReminders"
                ${(prefs.trainingReminders && prefs.notifications !== false) ? 'checked' : ''}
                class="sr-only peer"
              />
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render data privacy section
   */
  renderDataPrivacy() {
    const prefs = this.currentProfile.preferences || {};

    return `
      <div class="card-modern p-6">
        <h3 class="text-nebula-h3 font-semibold text-foreground mb-6">
          Data Privacy
        </h3>
        
        <div class="space-y-6">
          <!-- Privacy Level -->
          <div>
            <label class="block text-nebula-small font-medium text-foreground mb-3">
              Data Privacy Level
            </label>
            <div class="space-y-3">
              <div class="relative">
                <input
                  type="radio"
                  id="privacy-private"
                  name="dataPrivacy"
                  value="private"
                  ${(prefs.dataPrivacy || 'private') === 'private' ? 'checked' : ''}
                  class="sr-only peer"
                />
                <label
                  for="privacy-private"
                  class="block p-4 border-2 border-border rounded-md cursor-pointer peer-checked:border-primary peer-checked:bg-primary/5 hover:border-primary/50 transition-colors"
                >
                  <div class="flex items-start space-x-3">
                    <svg class="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                    <div>
                      <div class="font-medium text-foreground">Private</div>
                      <div class="text-nebula-small text-muted-foreground">
                        Data stored locally only, no sharing
                      </div>
                    </div>
                  </div>
                </label>
              </div>
              <div class="relative">
                <input
                  type="radio"
                  id="privacy-anonymous"
                  name="dataPrivacy"
                  value="anonymous"
                  ${prefs.dataPrivacy === 'anonymous' ? 'checked' : ''}
                  class="sr-only peer"
                />
                <label
                  for="privacy-anonymous"
                  class="block p-4 border-2 border-border rounded-md cursor-pointer peer-checked:border-primary peer-checked:bg-primary/5 hover:border-primary/50 transition-colors"
                >
                  <div class="flex items-start space-x-3">
                    <svg class="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <div>
                      <div class="font-medium text-foreground">Anonymous Sharing</div>
                      <div class="text-nebula-small text-muted-foreground">
                        Anonymous usage data for app improvement
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <!-- Auto-delete -->
          <div class="flex items-center justify-between">
            <div>
              <label for="autoDeleteOldData" class="text-nebula-small font-medium text-foreground">
                Auto-delete Old Data
              </label>
              <p class="text-nebula-small text-muted-foreground">
                Automatically delete data older than 2 years
              </p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="autoDeleteOldData"
                name="autoDeleteOldData"
                ${prefs.autoDeleteOldData ? 'checked' : ''}
                class="sr-only peer"
              />
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render data management section
   */
  renderDataManagement() {
    return `
      <div class="card-modern p-6">
        <h3 class="text-nebula-h3 font-semibold text-foreground mb-6">
          Data Management
        </h3>
        
        <div class="space-y-4">
          <!-- Export Data -->
          <div class="flex items-center justify-between py-3 border-b border-border">
            <div>
              <div class="text-nebula-small font-medium text-foreground">
                Export Profile Data
              </div>
              <p class="text-nebula-small text-muted-foreground">
                Download all your profile data as JSON
              </p>
            </div>
            <button
              id="exportDataBtn"
              class="btn-modern btn-outline h-9 px-4"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              Export
            </button>
          </div>

          <!-- Import Data -->
          <div class="flex items-center justify-between py-3 border-b border-border">
            <div>
              <div class="text-nebula-small font-medium text-foreground">
                Import Profile Data
              </div>
              <p class="text-nebula-small text-muted-foreground">
                Import profile data from JSON file
              </p>
            </div>
            <div>
              <input
                type="file"
                id="importFileInput"
                accept=".json"
                class="hidden"
              />
              <button
                id="importDataBtn"
                class="btn-modern btn-outline h-9 px-4"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
                Import
              </button>
            </div>
          </div>

          <!-- Delete Profile -->
          <div class="flex items-center justify-between py-3">
            <div>
              <div class="text-nebula-small font-medium text-destructive">
                Delete Profile
              </div>
              <p class="text-nebula-small text-muted-foreground">
                Permanently delete your profile and all data
              </p>
            </div>
            <button
              id="deleteProfileBtn"
              class="btn-modern bg-destructive text-destructive-foreground hover:bg-destructive/90 h-9 px-4"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Preference change listeners
    const preferenceInputs = this.container.querySelectorAll('input[type="radio"], input[type="checkbox"], select');
    preferenceInputs.forEach(input => {
      input.addEventListener('change', this.handlePreferenceChange);
    });

    // Data management buttons
    const exportBtn = document.getElementById('exportDataBtn');
    const importBtn = document.getElementById('importDataBtn');
    const importInput = document.getElementById('importFileInput');
    const deleteBtn = document.getElementById('deleteProfileBtn');

    if (exportBtn) {
      exportBtn.addEventListener('click', this.handleExport);
    }

    if (importBtn) {
      importBtn.addEventListener('click', () => {
        importInput?.click();
      });
    }

    if (importInput) {
      importInput.addEventListener('change', this.handleImport);
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', this.handleDeleteProfile);
    }
  }

  /**
   * Handle preference changes
   */
  async handlePreferenceChange(event) {
    const { name, value, type, checked } = event.target;
    
    try {
      const updateData = {};
      
      if (name === 'units') {
        // Direct profile property
        updateData.units = value;
      } else if (name === 'theme') {
        // Update preferences and apply theme immediately
        updateData.preferences = {
          ...this.currentProfile.preferences,
          theme: value,
        };
        
        // Apply theme immediately
        document.documentElement.classList.toggle('dark', value === 'dark');
        
        // Handle auto theme
        if (value === 'auto') {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          document.documentElement.classList.toggle('dark', prefersDark);
        }
        
      } else {
        // Other preferences
        const currentPrefs = this.currentProfile.preferences || {};
        const displayOptions = currentPrefs.displayOptions || {};
        
        if (['showPowerInWatts', 'chartType', 'zoneModel'].includes(name)) {
          updateData.preferences = {
            ...currentPrefs,
            displayOptions: {
              ...displayOptions,
              [name]: type === 'checkbox' ? checked : value,
            },
          };
        } else {
          updateData.preferences = {
            ...currentPrefs,
            [name]: type === 'checkbox' ? checked : value,
          };
        }
      }

      await profileService.updateProfile(updateData);
      
      // Show success message
      this.showSuccessMessage('Preferences updated successfully!');

    } catch (error) {
      console.error('Failed to update preferences:', error);
      this.showErrorMessage(`Failed to update preferences: ${  error.message}`);
    }
  }

  /**
   * Handle data export
   */
  async handleExport() {
    try {
      const profileData = await profileService.exportProfile();
      
      // Create download link
      const blob = new Blob([JSON.stringify(profileData, null, 2)], {
        type: 'application/json',
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `training-profile-${new Date().toISOString().split('T')[0]}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      this.showSuccessMessage('Profile data exported successfully!');
      
    } catch (error) {
      console.error('Failed to export profile:', error);
      this.showErrorMessage(`Failed to export profile data: ${  error.message}`);
    }
  }

  /**
   * Handle data import
   */
  async handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const profileData = JSON.parse(text);
      
      if (!confirm('This will replace your current profile. Are you sure?')) {
        return;
      }

      await profileService.importProfile(profileData);
      this.showSuccessMessage('Profile data imported successfully!');
      
    } catch (error) {
      console.error('Failed to import profile:', error);
      this.showErrorMessage(`Failed to import profile data: ${  error.message}`);
    }
  }

  /**
   * Handle profile deletion
   */
  async handleDeleteProfile() {
    const confirmText = 'DELETE';
    const userInput = prompt(
      `This will permanently delete your profile and all data. This action cannot be undone.\n\nType "${confirmText}" to confirm:`
    );
    
    if (userInput !== confirmText) {
      return;
    }

    try {
      await profileService.deleteProfile();
      this.showSuccessMessage('Profile deleted successfully');
      
      // Redirect or refresh after deletion
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Failed to delete profile:', error);
      this.showErrorMessage(`Failed to delete profile: ${  error.message}`);
    }
  }

  /**
   * Show success message
   */
  showSuccessMessage(message) {
    if (window.app?.ui?.showToast) {
      window.app.ui.showToast(message, 'success');
    } else {
      alert(message);
    }
  }

  /**
   * Show error message
   */
  showErrorMessage(message) {
    if (window.app?.ui?.showToast) {
      window.app.ui.showToast(message, 'error');
    } else {
      alert(message);
    }
  }

  /**
   * Destroy the component
   */
  destroy() {
    if (this.unsubscribeProfile) {
      this.unsubscribeProfile();
    }
  }
}