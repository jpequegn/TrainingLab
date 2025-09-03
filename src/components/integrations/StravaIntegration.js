/**
 * Strava Integration Component
 * Manages Strava account connection, sync settings, and activity import
 */

import { stravaAuth } from '../../services/strava-auth.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('StravaIntegration');

// Constants
const NOTIFICATION_TIMEOUT_MS = 5000;
const POPUP_CHECK_INTERVAL_MS = 1000;
const POST_CONNECTION_DELAY_MS = 1000;
const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const DAYS_PER_WEEK = 7;
const SSE_DATA_PREFIX_LENGTH = 6; // "data: ".length

export class StravaIntegration {
  constructor(container, userId) {
    this.container = container;
    this.userId = userId;
    this.isConnected = false;
    this.connectionStatus = null;
    this.syncInProgress = false;
    this.importProgress = null;

    // Bind methods
    this.render = this.render.bind(this);
    this.handleConnect = this.handleConnect.bind(this);
    this.handleDisconnect = this.handleDisconnect.bind(this);
    this.handleSync = this.handleSync.bind(this);
    this.handleImportHistorical = this.handleImportHistorical.bind(this);
    this.updateConnectionStatus = this.updateConnectionStatus.bind(this);
    this.updateImportProgress = this.updateImportProgress.bind(this);

    // Initialize component
    this.initialize();
  }

  /**
   * Initialize the component
   */
  async initialize() {
    try {
      await this.updateConnectionStatus();
      this.render();
    } catch (error) {
      logger.error('Failed to initialize Strava integration', error);
      this.renderError('Failed to initialize Strava integration');
    }
  }

  /**
   * Update connection status from backend
   */
  async updateConnectionStatus() {
    try {
      this.connectionStatus = await stravaAuth.getConnectionStatus(this.userId);
      this.isConnected = this.connectionStatus?.connected || false;

      logger.info('Updated Strava connection status', {
        userId: this.userId,
        connected: this.isConnected,
      });
    } catch (error) {
      logger.error('Failed to get connection status', error);
      this.connectionStatus = null;
      this.isConnected = false;
    }
  }

  /**
   * Render the component
   */
  render() {
    if (!this.container) {
      logger.error('No container provided for Strava integration');
      return;
    }

    this.container.innerHTML = this.generateHTML();
    this.attachEventListeners();
  }

  /**
   * Generate HTML for the component
   * @returns {string} HTML string
   */
  generateHTML() {
    if (this.isConnected) {
      return this.generateConnectedHTML();
    } else {
      return this.generateDisconnectedHTML();
    }
  }

  /**
   * Generate HTML for connected state
   * @returns {string} HTML string
   */
  generateConnectedHTML() {
    return `
      <div class="strava-integration connected">
        ${this.generateStravaHeaderHTML(true)}
        ${this.generateProfileSectionHTML()}
        ${this.generateSyncStatusHTML()}
        ${this.generateSyncControlsHTML()}
        ${this.generateSyncSettingsHTML()}
        ${this.generateDisconnectSectionHTML()}
      </div>
    `;
  }

  /**
   * Generate Strava header HTML
   * @param {boolean} isConnected - Connection status
   * @returns {string} HTML string
   */
  generateStravaHeaderHTML(isConnected) {
    const statusClass = isConnected ? 'connected' : 'disconnected';
    const statusText = isConnected ? 'Connected' : 'Not Connected';
    
    return `
      <div class="strava-header">
        <div class="strava-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#FC4C02">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.064L15.387 17.944z"/>
            <path d="M8.613 6.056L13.499 16.94h2.089L10.538 0H8.448L3.613 11.056h3.064L8.613 6.056z"/>
          </svg>
          <span>Strava</span>
        </div>
        <div class="connection-status ${statusClass}">
          <span class="status-indicator"></span>
          ${statusText}
        </div>
      </div>
    `;
  }

  /**
   * Generate profile section HTML
   * @returns {string} HTML string
   */
  generateProfileSectionHTML() {
    const profile = this.connectionStatus?.profile || {};
    const stats = this.connectionStatus?.stats || {};

    const avatarHTML = profile.profile_medium
      ? `<img src="${profile.profile_medium}" alt="${profile.firstname} ${profile.lastname}" />`
      : '<div class="avatar-placeholder"></div>';

    const locationHTML = `${profile.city || ''}${profile.city && profile.state ? ', ' : ''}${profile.state || ''}`;

    const statsHTML = stats.recent_ride_totals
      ? `<div class="profile-stats">
          <span>${Math.round((stats.recent_ride_totals.distance || 0) / 1000)}km recent</span>
          <span>${stats.all_ride_totals ? Math.round(stats.all_ride_totals.count || 0) : 0} total rides</span>
        </div>`
      : '';

    return `
      <div class="strava-profile">
        <div class="profile-info">
          <div class="profile-avatar">${avatarHTML}</div>
          <div class="profile-details">
            <h3>${profile.firstname || ''} ${profile.lastname || ''}</h3>
            <p class="profile-location">${locationHTML}</p>
            ${statsHTML}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate sync status HTML
   * @returns {string} HTML string
   */
  generateSyncStatusHTML() {
    const lastSync = this.connectionStatus?.lastSync;
    const totalActivities = this.connectionStatus?.totalActivities || 0;

    return `
      <div class="sync-status">
        <div class="sync-info">
          <div class="sync-stat">
            <span class="stat-value">${totalActivities}</span>
            <span class="stat-label">Activities Synced</span>
          </div>
          <div class="sync-stat">
            <span class="stat-value">${lastSync ? this.formatLastSync(lastSync) : 'Never'}</span>
            <span class="stat-label">Last Sync</span>
          </div>
        </div>
        ${this.syncInProgress ? this.generateSyncProgressHTML() : ''}
        ${this.importProgress ? this.generateImportProgressHTML() : ''}
      </div>
    `;
  }

  /**
   * Generate sync controls HTML
   * @returns {string} HTML string
   */
  generateSyncControlsHTML() {
    return `
      <div class="sync-controls">
        <button type="button" class="btn btn-primary sync-now" ${this.syncInProgress ? 'disabled' : ''}>
          ${this.syncInProgress ? 'Syncing...' : 'Sync Now'}
        </button>
        <button type="button" class="btn btn-secondary import-historical" ${this.syncInProgress || this.importProgress ? 'disabled' : ''}>
          Import Historical Activities
        </button>
      </div>
    `;
  }

  /**
   * Generate sync settings HTML
   * @returns {string} HTML string
   */
  generateSyncSettingsHTML() {
    const settings = this.connectionStatus?.settings || {};

    return `
      <div class="sync-settings">
        <h4>Sync Settings</h4>
        <div class="setting-group">
          <label class="checkbox-label">
            <input type="checkbox" id="autoSync" ${settings.autoSync ? 'checked' : ''}>
            <span class="checkmark"></span>
            Automatically sync new activities
          </label>
        </div>
        <div class="setting-group">
          <label class="checkbox-label">
            <input type="checkbox" id="excludePrivate" ${settings.excludePrivate ? 'checked' : ''}>
            <span class="checkmark"></span>
            Exclude private activities
          </label>
        </div>
        <div class="setting-group">
          <label class="checkbox-label">
            <input type="checkbox" id="excludeCommute" ${settings.excludeCommute ? 'checked' : ''}>
            <span class="checkmark"></span>
            Exclude commute activities
          </label>
        </div>
      </div>
    `;
  }

  /**
   * Generate disconnect section HTML
   * @returns {string} HTML string
   */
  generateDisconnectSectionHTML() {
    return `
      <div class="disconnect-section">
        <button type="button" class="btn btn-danger btn-small disconnect">
          Disconnect Strava Account
        </button>
        <p class="disconnect-note">
          Disconnecting will stop syncing new activities but won't delete already imported data.
        </p>
      </div>
    `;
  }

  /**
   * Generate HTML for disconnected state
   * @returns {string} HTML string
   */
  generateDisconnectedHTML() {
    return `
      <div class="strava-integration disconnected">
        ${this.generateStravaHeaderHTML(false)}

        <div class="connection-benefits">
          <h3>Connect your Strava account to:</h3>
          <ul class="benefits-list">
            <li>
              <span class="benefit-icon">📊</span>
              Import all your historical training activities automatically
            </li>
            <li>
              <span class="benefit-icon">🔄</span>
              Keep your TrainingLab data in sync with new Strava activities
            </li>
            <li>
              <span class="benefit-icon">⚡</span>
              Get detailed power analysis and training metrics
            </li>
            <li>
              <span class="benefit-icon">📈</span>
              Track your fitness progress over time with comprehensive analytics
            </li>
            <li>
              <span class="benefit-icon">🎯</span>
              Create personalized training plans based on your activity history
            </li>
          </ul>
        </div>

        <div class="oauth-permissions">
          <h4>TrainingLab will request access to:</h4>
          <ul class="permissions-list">
            <li>View your public profile information</li>
            <li>Read your activity data (including private activities)</li>
            <li>Access detailed activity streams (power, heart rate, cadence)</li>
          </ul>
          <p class="privacy-note">
            Your Strava data is kept secure and is only used to enhance your TrainingLab experience.
          </p>
        </div>

        <div class="connect-section">
          <button type="button" class="btn btn-primary btn-large connect-strava">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.064L15.387 17.944z"/>
              <path d="M8.613 6.056L13.499 16.94h2.089L10.538 0H8.448L3.613 11.056h3.064L8.613 6.056z"/>
            </svg>
            Connect with Strava
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Generate sync progress HTML
   * @returns {string} HTML string
   */
  generateSyncProgressHTML() {
    return `
      <div class="sync-progress">
        <div class="progress-header">
          <span>Syncing activities...</span>
          <span class="progress-spinner"></span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: 0%"></div>
        </div>
      </div>
    `;
  }

  /**
   * Generate import progress HTML
   * @returns {string} HTML string
   */
  generateImportProgressHTML() {
    const { page, total, hasMore } = this.importProgress;
    const percentage = hasMore ? 0 : 100; // We don't know total until complete

    return `
      <div class="import-progress">
        <div class="progress-header">
          <span>Importing historical activities...</span>
          <span>${total} activities imported</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${percentage}%"></div>
        </div>
        <p class="progress-note">Page ${page} • This may take a few minutes for large activity histories</p>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Connect button
    const connectBtn = this.container.querySelector('.connect-strava');
    if (connectBtn) {
      connectBtn.addEventListener('click', this.handleConnect);
    }

    // Disconnect button
    const disconnectBtn = this.container.querySelector('.disconnect');
    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', this.handleDisconnect);
    }

    // Sync buttons
    const syncBtn = this.container.querySelector('.sync-now');
    if (syncBtn) {
      syncBtn.addEventListener('click', this.handleSync);
    }

    const importBtn = this.container.querySelector('.import-historical');
    if (importBtn) {
      importBtn.addEventListener('click', this.handleImportHistorical);
    }

    // Settings checkboxes
    const settingCheckboxes = this.container.querySelectorAll(
      '.sync-settings input[type="checkbox"]'
    );
    settingCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', this.handleSettingChange.bind(this));
    });
  }

  /**
   * Handle Strava connection
   */
  async handleConnect() {
    try {
      logger.info('Initiating Strava connection', { userId: this.userId });

      const { url } = await stravaAuth.generateAuthUrl(this.userId);

      // Open OAuth popup
      const popup = window.open(
        url,
        'strava-auth',
        'width=600,height=700,scrollbars=yes,resizable=yes,centerscreen=yes'
      );

      // Listen for popup completion
      const checkClosed = setInterval(async () => {
        if (popup.closed) {
          clearInterval(checkClosed);

          // Check if connection was successful
          setTimeout(async () => {
            await this.updateConnectionStatus();
            this.render();

            if (this.isConnected) {
              this.showNotification(
                'Successfully connected to Strava!',
                'success'
              );
            }
          }, POST_CONNECTION_DELAY_MS);
        }
      }, POPUP_CHECK_INTERVAL_MS);
    } catch (error) {
      logger.error('Failed to initiate Strava connection', error);
      this.showNotification(
        'Failed to connect to Strava. Please try again.',
        'error'
      );
    }
  }

  /**
   * Handle Strava disconnection
   */
  async handleDisconnect() {
    if (
      !confirm(
        'Are you sure you want to disconnect your Strava account? This will stop syncing new activities.'
      )
    ) {
      return;
    }

    try {
      logger.info('Disconnecting Strava account', { userId: this.userId });

      const success = await stravaAuth.disconnect(this.userId);

      if (success) {
        this.isConnected = false;
        this.connectionStatus = null;
        this.render();
        this.showNotification('Successfully disconnected from Strava', 'info');
      } else {
        throw new Error('Disconnect failed');
      }
    } catch (error) {
      logger.error('Failed to disconnect Strava account', error);
      this.showNotification(
        'Failed to disconnect from Strava. Please try again.',
        'error'
      );
    }
  }

  /**
   * Handle manual sync
   */
  async handleSync() {
    if (this.syncInProgress) {
      return;
    }

    try {
      this.syncInProgress = true;
      this.render();

      logger.info('Starting manual Strava sync', { userId: this.userId });

      const response = await fetch(`/api/strava/sync/${this.userId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      const result = await response.json();

      logger.info('Manual Strava sync completed', {
        userId: this.userId,
        newActivities: result.newActivities || 0,
      });

      await this.updateConnectionStatus();

      this.showNotification(
        `Sync completed! ${result.newActivities || 0} new activities imported.`,
        'success'
      );
    } catch (error) {
      logger.error('Manual Strava sync failed', error);
      this.showNotification('Sync failed. Please try again.', 'error');
    } finally {
      this.syncInProgress = false;
      this.render();
    }
  }

  /**
   * Handle historical import
   */
  async handleImportHistorical() {
    if (this.importProgress || this.syncInProgress) {
      return;
    }

    const confirmed = confirm(
      'This will import all your historical Strava activities. ' +
        'This process may take several minutes depending on your activity history. Continue?'
    );

    if (!confirmed) {
      return;
    }

    try {
      this.importProgress = { page: 1, total: 0, hasMore: true };
      this.render();

      logger.info('Starting historical import', { userId: this.userId });

      const response = await fetch(
        `/api/strava/import-historical/${this.userId}`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        throw new Error(`Import failed: ${response.status}`);
      }

      // Stream the response to get progress updates
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(SSE_DATA_PREFIX_LENGTH));
              this.updateImportProgress(data);
            } catch (e) {
              // Ignore parsing errors
            }
          }
        }
      }

      await this.updateConnectionStatus();
      this.showNotification(
        'Historical import completed successfully!',
        'success'
      );
    } catch (error) {
      logger.error('Historical import failed', error);
      this.showNotification(
        'Historical import failed. Please try again.',
        'error'
      );
    } finally {
      this.importProgress = null;
      this.render();
    }
  }

  /**
   * Update import progress
   * @param {Object} progressData - Progress data
   */
  updateImportProgress(progressData) {
    this.importProgress = progressData;

    // Update progress display
    const progressElement = this.container.querySelector('.import-progress');
    if (progressElement && progressData) {
      const totalElement = progressElement.querySelector(
        '.progress-header span:last-child'
      );
      const pageElement = progressElement.querySelector('.progress-note');

      if (totalElement) {
        totalElement.textContent = `${progressData.total} activities imported`;
      }

      if (pageElement) {
        pageElement.textContent = `Page ${progressData.page} • This may take a few minutes for large activity histories`;
      }
    }
  }

  /**
   * Handle setting changes
   * @param {Event} event - Change event
   */
  async handleSettingChange(event) {
    const setting = event.target.id;
    const value = event.target.checked;
    const checkbox = event.target;

    try {
      const response = await fetch(`/api/strava/settings/${this.userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [setting]: value,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update setting: ${response.status}`);
      }

      logger.info('Updated Strava setting', {
        userId: this.userId,
        setting,
        value,
      });
    } catch (error) {
      logger.error('Failed to update Strava setting', error);

      // Revert checkbox state without race condition
      checkbox.checked = !value;

      this.showNotification(
        'Failed to update setting. Please try again.',
        'error'
      );
    }
  }

  /**
   * Format last sync time for display
   * @param {string|Date} lastSync - Last sync timestamp
   * @returns {string} Formatted time string
   */
  formatLastSync(lastSync) {
    const date = new Date(lastSync);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(
      diffMs / (1000 * SECONDS_PER_MINUTE * MINUTES_PER_HOUR)
    );
    const diffDays = Math.floor(diffHours / HOURS_PER_DAY);

    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < HOURS_PER_DAY) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < DAYS_PER_WEEK) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  /**
   * Show notification to user
   * @param {string} message - Notification message
   * @param {string} type - Notification type (success, error, info, warning)
   */
  showNotification(message, type = 'info') {
    // This would integrate with a global notification system
    console.log(`[${type.toUpperCase()}] ${message}`);

    // For now, just create a simple toast notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, NOTIFICATION_TIMEOUT_MS);
  }

  /**
   * Render error state
   * @param {string} message - Error message
   */
  renderError(message) {
    this.container.innerHTML = `
      <div class="strava-integration error">
        <div class="error-message">
          <p>❌ ${message}</p>
          <button type="button" class="btn btn-secondary" onclick="location.reload()">
            Retry
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Destroy component and clean up
   */
  destroy() {
    // Remove event listeners and clean up
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
