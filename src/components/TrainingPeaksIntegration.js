/**
 * TrainingPeaks Integration Component
 * Manages TrainingPeaks account connection, sync settings, and workout/activity management
 */

// TODO: Implement TrainingPeaks authentication service
// import { trainingPeaksAuth } from '../services/trainingpeaks-auth.js';
// TODO: Implement TrainingPeaks API service
// import { trainingPeaksAPI } from '../services/trainingpeaks-api.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('TrainingPeaksIntegration');

// Constants
const NOTIFICATION_TIMEOUT_MS = 5000;
const POPUP_CHECK_INTERVAL_MS = 1000;
const POST_CONNECTION_DELAY_MS = 1000;
// TODO: Add these constants when implementing sync functionality
// const SYNC_PROGRESS_UPDATE_INTERVAL_MS = 1000;
// const HOURS_PER_DAY = 24;
// const MINUTES_PER_HOUR = 60;
// const SECONDS_PER_MINUTE = 60;
// const DAYS_PER_WEEK = 7;
// const HTTP_STATUS_OK = 200;
// const HTTP_STATUS_UNAUTHORIZED = 401;

export class TrainingPeaksIntegration {
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
    this.handleImportPlanned = this.handleImportPlanned.bind(this);
    this.handleExportCompleted = this.handleExportCompleted.bind(this);
    this.updateConnectionStatus = this.updateConnectionStatus.bind(this);
    this.updateSyncProgress = this.updateSyncProgress.bind(this);

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
      logger.error('Failed to initialize TrainingPeaks integration', error);
      this.showNotification(
        'Failed to initialize TrainingPeaks integration',
        'error'
      );
    }
  }

  /**
   * Update connection status from backend
   */
  async updateConnectionStatus() {
    try {
      const response = await fetch(
        `/api/trainingpeaks/connection-status/${this.userId}`
      );

      if (response.ok) {
        this.connectionStatus = await response.json();
        this.isConnected = this.connectionStatus.connected;
      } else {
        this.isConnected = false;
        this.connectionStatus = { connected: false };
      }
    } catch (error) {
      logger.error('Failed to get connection status', error);
      this.isConnected = false;
      this.connectionStatus = { connected: false };
    }
  }

  /**
   * Render the integration component
   */
  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="trainingpeaks-integration p-6 bg-white rounded-lg shadow-lg">
        ${this.renderHeader()}
        ${this.isConnected ? this.renderConnectedState() : this.renderDisconnectedState()}
        ${this.renderSyncProgress()}
      </div>
    `;

    this.attachEventListeners();
  }

  /**
   * Render component header
   */
  renderHeader() {
    return `
      <div class="flex items-center mb-6">
        <div class="flex-shrink-0 mr-4">
          <img src="https://www.trainingpeaks.com/favicon-32x32.png" 
               alt="TrainingPeaks" 
               class="w-8 h-8"
               onerror="this.style.display='none'">
        </div>
        <div>
          <h3 class="text-xl font-semibold text-gray-900">TrainingPeaks Integration</h3>
          <p class="text-sm text-gray-600">Professional training platform integration with bidirectional sync</p>
        </div>
      </div>
    `;
  }

  /**
   * Render connected state UI
   */
  renderConnectedState() {
    const status = this.connectionStatus;
    const lastSync = status.lastSync
      ? new Date(status.lastSync).toLocaleString()
      : 'Never';

    return `
      <div class="connected-state">
        <!-- Connection Status -->
        <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
              </svg>
            </div>
            <div class="ml-3">
              <h4 class="text-sm font-medium text-green-800">Connected to TrainingPeaks</h4>
              <div class="mt-1 text-sm text-green-700">
                <p>Account: ${status.user ? `${status.user.firstName} ${status.user.lastName}` : 'Unknown'}</p>
                <p>Account Type: ${status.user ? status.user.accountType : 'Unknown'}</p>
                <p>Last sync: ${lastSync}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Sync Statistics -->
        ${this.renderSyncStats()}

        <!-- Sync Settings -->
        ${this.renderSyncSettings()}

        <!-- Action Buttons -->
        <div class="flex flex-wrap gap-3 mb-6">
          <button id="tp-sync-now" 
                  class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors ${this.syncInProgress ? 'opacity-50 cursor-not-allowed' : ''}"
                  ${this.syncInProgress ? 'disabled' : ''}>
            <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            ${this.syncInProgress ? 'Syncing...' : 'Sync Now'}
          </button>

          <button id="tp-import-planned" 
                  class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors ${this.syncInProgress ? 'opacity-50 cursor-not-allowed' : ''}"
                  ${this.syncInProgress ? 'disabled' : ''}>
            <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Import Planned Workouts
          </button>

          <button id="tp-export-completed" 
                  class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors ${this.syncInProgress ? 'opacity-50 cursor-not-allowed' : ''}"
                  ${this.syncInProgress ? 'disabled' : ''}>
            <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
            </svg>
            Export Completed Activities
          </button>

          <button id="tp-disconnect" 
                  class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
            <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"></path>
            </svg>
            Disconnect
          </button>
        </div>

        <!-- Recent Activity -->
        ${this.renderRecentActivity()}
      </div>
    `;
  }

  /**
   * Render sync statistics
   */
  renderSyncStats() {
    const stats = this.connectionStatus.stats || {};

    return `
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-gray-50 p-4 rounded-lg text-center">
          <div class="text-2xl font-bold text-blue-600">${stats.totalWorkouts || 0}</div>
          <div class="text-sm text-gray-600">Workouts</div>
        </div>
        <div class="bg-gray-50 p-4 rounded-lg text-center">
          <div class="text-2xl font-bold text-green-600">${stats.totalActivities || 0}</div>
          <div class="text-sm text-gray-600">Activities</div>
        </div>
        <div class="bg-gray-50 p-4 rounded-lg text-center">
          <div class="text-2xl font-bold text-purple-600">${stats.workoutsSynced || 0}</div>
          <div class="text-sm text-gray-600">Synced Workouts</div>
        </div>
        <div class="bg-gray-50 p-4 rounded-lg text-center">
          <div class="text-2xl font-bold text-indigo-600">${stats.activitiesSynced || 0}</div>
          <div class="text-sm text-gray-600">Synced Activities</div>
        </div>
      </div>
    `;
  }

  /**
   * Render sync settings
   */
  renderSyncSettings() {
    const settings = this.connectionStatus.settings || {};

    return `
      <div class="bg-gray-50 p-4 rounded-lg mb-6">
        <h4 class="font-medium text-gray-900 mb-4">Sync Settings</h4>
        <div class="space-y-3">
          <label class="flex items-center">
            <input type="checkbox" 
                   id="tp-auto-sync" 
                   class="h-4 w-4 text-blue-600 border-gray-300 rounded" 
                   ${settings.autoSync !== false ? 'checked' : ''}>
            <span class="ml-2 text-sm text-gray-700">Enable automatic synchronization</span>
          </label>
          
          <label class="flex items-center">
            <input type="checkbox" 
                   id="tp-sync-workouts" 
                   class="h-4 w-4 text-blue-600 border-gray-300 rounded" 
                   ${settings.syncWorkouts !== false ? 'checked' : ''}>
            <span class="ml-2 text-sm text-gray-700">Sync planned workouts (import from TrainingPeaks)</span>
          </label>
          
          <label class="flex items-center">
            <input type="checkbox" 
                   id="tp-sync-activities" 
                   class="h-4 w-4 text-blue-600 border-gray-300 rounded" 
                   ${settings.syncActivities !== false ? 'checked' : ''}>
            <span class="ml-2 text-sm text-gray-700">Sync completed activities (export to TrainingPeaks)</span>
          </label>
          
          <label class="flex items-center">
            <input type="checkbox" 
                   id="tp-sync-metrics" 
                   class="h-4 w-4 text-blue-600 border-gray-300 rounded" 
                   ${settings.syncMetrics !== false ? 'checked' : ''}>
            <span class="ml-2 text-sm text-gray-700">Sync training metrics (TSS, IF, NP)</span>
          </label>

          <label class="flex items-center">
            <input type="checkbox" 
                   id="tp-include-private" 
                   class="h-4 w-4 text-blue-600 border-gray-300 rounded" 
                   ${settings.includePrivate === true ? 'checked' : ''}>
            <span class="ml-2 text-sm text-gray-700">Include private workouts and activities</span>
          </label>
        </div>
        
        <button id="tp-save-settings" 
                class="mt-4 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm">
          Save Settings
        </button>
      </div>
    `;
  }

  /**
   * Render recent activity log
   */
  renderRecentActivity() {
    return `
      <div class="bg-gray-50 p-4 rounded-lg">
        <h4 class="font-medium text-gray-900 mb-3">Recent Sync Activity</h4>
        <div id="tp-activity-log" class="space-y-2 max-h-40 overflow-y-auto text-sm text-gray-600">
          <div class="flex justify-between">
            <span>Manual sync completed</span>
            <span class="text-xs text-gray-500">2 minutes ago</span>
          </div>
          <div class="flex justify-between">
            <span>Imported 3 planned workouts</span>
            <span class="text-xs text-gray-500">1 hour ago</span>
          </div>
          <div class="flex justify-between">
            <span>Exported 1 completed activity</span>
            <span class="text-xs text-gray-500">3 hours ago</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render disconnected state UI
   */
  renderDisconnectedState() {
    return `
      <div class="disconnected-state">
        <div class="text-center py-8">
          <div class="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
            </svg>
          </div>
          
          <h3 class="text-lg font-medium text-gray-900 mb-2">Connect to TrainingPeaks</h3>
          <p class="text-gray-600 mb-6 max-w-md mx-auto">
            Connect your TrainingPeaks account to import planned workouts, export completed activities, 
            and sync advanced training metrics including TSS, IF, and Performance Management Chart data.
          </p>

          <button id="tp-connect" 
                  class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
            <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
            </svg>
            Connect to TrainingPeaks
          </button>
        </div>

        <!-- Benefits Section -->
        <div class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-blue-50 p-4 rounded-lg">
            <h4 class="font-medium text-blue-900 mb-2">Import Planned Workouts</h4>
            <p class="text-sm text-blue-800">
              Automatically import structured workouts from your TrainingPeaks calendar with coaching notes,
              target zones, and detailed workout structure.
            </p>
          </div>
          
          <div class="bg-green-50 p-4 rounded-lg">
            <h4 class="font-medium text-green-900 mb-2">Export Completed Activities</h4>
            <p class="text-sm text-green-800">
              Push your completed TrainingLab workouts to TrainingPeaks with detailed power analysis,
              zone distribution, and training metrics.
            </p>
          </div>
          
          <div class="bg-purple-50 p-4 rounded-lg">
            <h4 class="font-medium text-purple-900 mb-2">Advanced Metrics Sync</h4>
            <p class="text-sm text-purple-800">
              Synchronize TSS, Intensity Factor, Normalized Power, and Performance Management Chart data
              between both platforms.
            </p>
          </div>
          
          <div class="bg-indigo-50 p-4 rounded-lg">
            <h4 class="font-medium text-indigo-900 mb-2">Coaching Workflow</h4>
            <p class="text-sm text-indigo-800">
              Seamless integration with coach-athlete workflows, workout modifications,
              and progress tracking across platforms.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render sync progress indicator
   */
  renderSyncProgress() {
    if (!this.syncInProgress && !this.importProgress) {
      return '';
    }

    return `
      <div id="tp-sync-progress" class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div class="flex items-center mb-2">
          <svg class="animate-spin h-4 w-4 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="text-sm font-medium text-blue-900">
            ${this.syncInProgress ? 'Syncing with TrainingPeaks...' : 'Processing...'}
          </span>
        </div>
        
        ${this.importProgress ? this.renderProgressBar() : ''}
        
        <div id="tp-progress-message" class="text-sm text-blue-700">
          ${this.getProgressMessage()}
        </div>
      </div>
    `;
  }

  /**
   * Render progress bar
   */
  renderProgressBar() {
    const progress = this.importProgress;
    const percentage =
      progress.total > 0
        ? Math.round((progress.processed / progress.total) * 100)
        : 0;

    return `
      <div class="w-full bg-blue-200 rounded-full h-2 mb-2">
        <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" 
             style="width: ${percentage}%"></div>
      </div>
      <div class="text-xs text-blue-600 mb-2">
        ${progress.processed} of ${progress.total} items processed (${percentage}%)
      </div>
    `;
  }

  /**
   * Get current progress message
   */
  getProgressMessage() {
    if (this.importProgress) {
      return `Processing ${this.importProgress.type || 'items'}...`;
    }

    if (this.syncInProgress) {
      return 'Synchronizing data with TrainingPeaks...';
    }

    return 'Initializing...';
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Connection button
    const connectBtn = document.getElementById('tp-connect');
    if (connectBtn) {
      connectBtn.addEventListener('click', this.handleConnect);
    }

    // Disconnect button
    const disconnectBtn = document.getElementById('tp-disconnect');
    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', this.handleDisconnect);
    }

    // Sync button
    const syncBtn = document.getElementById('tp-sync-now');
    if (syncBtn) {
      syncBtn.addEventListener('click', this.handleSync);
    }

    // Import planned workouts button
    const importBtn = document.getElementById('tp-import-planned');
    if (importBtn) {
      importBtn.addEventListener('click', this.handleImportPlanned);
    }

    // Export completed activities button
    const exportBtn = document.getElementById('tp-export-completed');
    if (exportBtn) {
      exportBtn.addEventListener('click', this.handleExportCompleted);
    }

    // Save settings button
    const saveSettingsBtn = document.getElementById('tp-save-settings');
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener(
        'click',
        this.handleSaveSettings.bind(this)
      );
    }

    // Settings checkboxes
    [
      'tp-auto-sync',
      'tp-sync-workouts',
      'tp-sync-activities',
      'tp-sync-metrics',
      'tp-include-private',
    ].forEach(id => {
      const checkbox = document.getElementById(id);
      if (checkbox) {
        checkbox.addEventListener(
          'change',
          this.handleSettingChange.bind(this)
        );
      }
    });
  }

  /**
   * Handle TrainingPeaks connection
   */
  async handleConnect() {
    try {
      this.showNotification('Connecting to TrainingPeaks...', 'info');

      // Generate auth URL
      const response = await fetch(
        `/api/trainingpeaks/auth-url/${this.userId}`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate authentication URL');
      }

      const { authUrl } = await response.json();

      // Open OAuth popup
      const popup = window.open(
        authUrl,
        'trainingpeaks-oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      // Monitor popup for completion
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          // Wait a moment then check connection status
          setTimeout(async () => {
            await this.updateConnectionStatus();
            this.render();

            if (this.isConnected) {
              this.showNotification(
                'Successfully connected to TrainingPeaks!',
                'success'
              );
            }
          }, POST_CONNECTION_DELAY_MS);
        }
      }, POPUP_CHECK_INTERVAL_MS);
    } catch (error) {
      logger.error('Connection failed', error);
      this.showNotification(`Connection failed: ${error.message}`, 'error');
    }
  }

  /**
   * Handle TrainingPeaks disconnection
   */
  async handleDisconnect() {
    if (
      !confirm(
        'Are you sure you want to disconnect from TrainingPeaks? This will stop all synchronization.'
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/trainingpeaks/disconnect/${this.userId}`,
        {
          method: 'POST',
        }
      );

      if (response.ok) {
        this.isConnected = false;
        this.connectionStatus = { connected: false };
        this.render();
        this.showNotification('Disconnected from TrainingPeaks', 'success');
      } else {
        throw new Error('Failed to disconnect');
      }
    } catch (error) {
      logger.error('Disconnection failed', error);
      this.showNotification(`Disconnection failed: ${error.message}`, 'error');
    }
  }

  /**
   * Handle manual sync
   */
  async handleSync() {
    if (this.syncInProgress) return;

    try {
      this.syncInProgress = true;
      this.render();

      const response = await fetch(`/api/trainingpeaks/sync/${this.userId}`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        this.showNotification(
          `Sync completed: ${result.workoutsSynced} workouts, ${result.activitiesSynced} activities`,
          'success'
        );
        await this.updateConnectionStatus();
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      logger.error('Sync failed', error);
      this.showNotification(`Sync failed: ${error.message}`, 'error');
    } finally {
      this.syncInProgress = false;
      this.render();
    }
  }

  /**
   * Handle import planned workouts
   */
  async handleImportPlanned() {
    if (this.syncInProgress) return;

    try {
      this.syncInProgress = true;
      this.importProgress = {
        processed: 0,
        total: 0,
        type: 'planned workouts',
      };
      this.render();

      // Start import process
      const response = await fetch(
        `/api/trainingpeaks/import-planned/${this.userId}`,
        {
          method: 'POST',
        }
      );

      if (
        response.ok &&
        response.headers.get('content-type')?.includes('text/plain')
      ) {
        // Handle Server-Sent Events response
        await this.handleSSEResponse(response);
      } else {
        throw new Error('Import failed to start');
      }
    } catch (error) {
      logger.error('Import planned workouts failed', error);
      this.showNotification(`Import failed: ${error.message}`, 'error');
    } finally {
      this.syncInProgress = false;
      this.importProgress = null;
      this.render();
    }
  }

  /**
   * Handle export completed activities
   */
  async handleExportCompleted() {
    if (this.syncInProgress) return;

    try {
      this.syncInProgress = true;
      this.importProgress = {
        processed: 0,
        total: 0,
        type: 'completed activities',
      };
      this.render();

      const response = await fetch(
        `/api/trainingpeaks/export-completed/${this.userId}`,
        {
          method: 'POST',
        }
      );

      if (
        response.ok &&
        response.headers.get('content-type')?.includes('text/plain')
      ) {
        // Handle Server-Sent Events response
        await this.handleSSEResponse(response);
      } else {
        throw new Error('Export failed to start');
      }
    } catch (error) {
      logger.error('Export completed activities failed', error);
      this.showNotification(`Export failed: ${error.message}`, 'error');
    } finally {
      this.syncInProgress = false;
      this.importProgress = null;
      this.render();
    }
  }

  /**
   * Handle Server-Sent Events response for progress tracking
   */
  async handleSSEResponse(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6)); // Remove 'data: ' prefix
              this.updateSyncProgress(data);
            } catch (parseError) {
              logger.warn('Failed to parse SSE data', parseError);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Update sync progress from SSE data
   */
  updateSyncProgress(data) {
    if (data.type === 'progress') {
      this.importProgress = {
        processed: data.processed,
        total: data.total,
        type: data.description || 'items',
      };

      // Update progress display
      const progressEl = document.getElementById('tp-sync-progress');
      if (progressEl) {
        progressEl.innerHTML = this.renderSyncProgress().replace(
          /<div[^>]*tp-sync-progress[^>]*>|<\/div>$/g,
          ''
        );
      }
    } else if (data.type === 'complete') {
      this.showNotification(
        data.message || 'Operation completed successfully',
        'success'
      );
    } else if (data.type === 'error') {
      this.showNotification(data.message || 'Operation failed', 'error');
    }
  }

  /**
   * Handle settings change
   */
  handleSettingChange() {
    // Settings are automatically saved when changed
    // Could implement debounced auto-save here
  }

  /**
   * Handle save settings
   */
  async handleSaveSettings() {
    try {
      const settings = {
        autoSync: document.getElementById('tp-auto-sync')?.checked || false,
        syncWorkouts:
          document.getElementById('tp-sync-workouts')?.checked || false,
        syncActivities:
          document.getElementById('tp-sync-activities')?.checked || false,
        syncMetrics:
          document.getElementById('tp-sync-metrics')?.checked || false,
        includePrivate:
          document.getElementById('tp-include-private')?.checked || false,
      };

      const response = await fetch(
        `/api/trainingpeaks/settings/${this.userId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(settings),
        }
      );

      if (response.ok) {
        this.showNotification('Settings saved successfully', 'success');
        await this.updateConnectionStatus();
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      logger.error('Save settings failed', error);
      this.showNotification(
        `Failed to save settings: ${error.message}`,
        'error'
      );
    }
  }

  /**
   * Show notification to user
   */
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-md ${
      type === 'success'
        ? 'bg-green-500 text-white'
        : type === 'error'
          ? 'bg-red-500 text-white'
          : type === 'warning'
            ? 'bg-yellow-500 text-white'
            : 'bg-blue-500 text-white'
    }`;

    notification.innerHTML = `
      <div class="flex items-center">
        <span class="flex-1">${message}</span>
        <button class="ml-4 text-white hover:text-gray-200" onclick="this.parentElement.parentElement.remove()">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `;

    document.body.appendChild(notification);

    // Auto-remove after timeout
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, NOTIFICATION_TIMEOUT_MS);
  }

  /**
   * Destroy the component and cleanup
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

export default TrainingPeaksIntegration;
