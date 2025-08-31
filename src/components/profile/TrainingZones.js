/**
 * Training Zones Component
 * Displays and manages user training zones based on FTP
 */

import { profileService } from '../../services/profile-service.js';
import { stateManager } from '../../services/state-manager.js';
import ZoneCalculator from '../../services/zone-calculator.js';

export class TrainingZones {
  constructor(container) {
    this.container = container;
    this.currentProfile = null;
    this.trainingZones = null;
    
    // Bind methods
    this.render = this.render.bind(this);
    this.updateZones = this.updateZones.bind(this);

    // Subscribe to profile changes
    this.unsubscribeProfile = stateManager.subscribe(
      'userProfile',
      this.handleProfileUpdate.bind(this),
      { immediate: true }
    );

    // Subscribe to FTP changes
    this.unsubscribeFTP = stateManager.subscribe(
      'ftp',
      this.handleFTPUpdate.bind(this)
    );
  }

  /**
   * Handle profile updates from state
   */
  handleProfileUpdate(profile) {
    this.currentProfile = profile;
    this.updateZones();
    this.render();
  }

  /**
   * Handle FTP updates
   */
  handleFTPUpdate(ftp) {
    if (ftp) {
      this.updateZones();
      this.render();
    }
  }

  /**
   * Update training zones based on current profile
   */
  updateZones() {
    try {
      this.trainingZones = profileService.getTrainingZones();
    } catch (error) {
      console.error('Failed to update training zones:', error);
      this.trainingZones = null;
    }
  }

  /**
   * Render the training zones component
   */
  render() {
    if (!this.container) return;

    if (!this.currentProfile?.ftp) {
      this.renderNoFTP();
      return;
    }

    this.container.innerHTML = `
      <div class="card-modern p-6">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h3 class="text-nebula-h3 font-semibold text-foreground">
              Training Zones
            </h3>
            <p class="text-nebula-small text-muted-foreground">
              Power zones based on your FTP of ${this.currentProfile.ftp}W
            </p>
          </div>
          <div class="flex items-center space-x-2">
            <button
              id="refreshZonesBtn"
              class="btn-modern btn-outline h-9 px-3"
              title="Refresh Zones"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
            </button>
          </div>
        </div>

        ${this.renderZoneModel()}
        ${this.renderZones()}
        ${this.renderZoneChart()}
        ${this.renderZoneStatistics()}
        ${this.renderTrainingRecommendations()}
      </div>
    `;

    this.attachEventListeners();
  }

  /**
   * Render no FTP message
   */
  renderNoFTP() {
    this.container.innerHTML = `
      <div class="card-modern p-6">
        <div class="text-center py-8">
          <div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
          </div>
          <h3 class="text-nebula-h3 font-semibold text-foreground mb-2">
            FTP Required
          </h3>
          <p class="text-nebula-body text-muted-foreground mb-4">
            Please set your FTP (Functional Threshold Power) in your profile to view training zones.
          </p>
          <button
            id="setFTPBtn"
            class="btn-modern h-10 px-6"
          >
            Set FTP
          </button>
        </div>
      </div>
    `;

    const setFTPBtn = document.getElementById('setFTPBtn');
    if (setFTPBtn) {
      setFTPBtn.addEventListener('click', () => {
        // Scroll to personal info form or trigger edit mode
        this.triggerFTPEdit();
      });
    }
  }

  /**
   * Render zone model information
   */
  renderZoneModel() {
    if (!this.trainingZones) return '';

    return `
      <div class="bg-muted/50 p-4 rounded-md mb-6">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="font-semibold text-foreground">${this.trainingZones.modelInfo?.name || 'Training Zone Model'}</h4>
            <p class="text-nebula-small text-muted-foreground">
              ${this.trainingZones.modelInfo?.description || 'Power-based training zones'}
            </p>
          </div>
          <div class="text-right">
            <div class="text-nebula-small text-muted-foreground">Current FTP</div>
            <div class="text-lg font-bold text-primary">${this.trainingZones.ftp}W</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render training zones list
   */
  renderZones() {
    if (!this.trainingZones?.zones) return '';

    const zones = Object.entries(this.trainingZones.zones).map(([zoneId, zone]) => {
      const wattsZone = this.trainingZones.zonesInWatts?.[zoneId] || zone;
      
      return `
        <div class="zone-item bg-white dark:bg-slate-800/50 p-4 rounded-md border border-border hover:shadow-md transition-shadow">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div
                class="w-4 h-4 rounded-sm border border-white/20"
                style="background-color: ${zone.color}"
              ></div>
              <div>
                <h4 class="font-semibold text-foreground">${zone.name}</h4>
                <p class="text-nebula-small text-muted-foreground">${zone.description}</p>
              </div>
            </div>
            <div class="text-right">
              <div class="font-mono font-semibold text-foreground">
                ${wattsZone.minWatts || Math.round(zone.min * this.trainingZones.ftp)}-${wattsZone.maxWatts || Math.round(zone.max * this.trainingZones.ftp)}W
              </div>
              <div class="text-nebula-small text-muted-foreground">
                ${Math.round(zone.min * 100)}-${Math.round(zone.max * 100)}% FTP
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="space-y-3 mb-6">
        <h4 class="text-nebula-h3 font-medium text-foreground mb-4">Power Zones</h4>
        ${zones}
      </div>
    `;
  }

  /**
   * Render zone visualization chart
   */
  renderZoneChart() {
    if (!this.trainingZones?.zones) return '';

    const zones = Object.entries(this.trainingZones.zones);
    const maxPower = Math.max(...zones.map(([, zone]) => zone.max)) * this.trainingZones.ftp;
    
    const zoneBarHTML = zones.map(([zoneId, zone], index) => {
      const widthPercent = ((zone.max - zone.min) / (zones[zones.length - 1][1].max - zones[0][1].min)) * 100;
      
      return `
        <div
          class="zone-bar h-8 flex items-center justify-center text-white text-xs font-medium cursor-help"
          style="
            background-color: ${zone.color};
            width: ${widthPercent}%;
            border-right: ${index < zones.length - 1 ? '1px solid rgba(255,255,255,0.3)' : 'none'};
          "
          title="${zone.name}: ${Math.round(zone.min * this.trainingZones.ftp)}-${Math.round(zone.max * this.trainingZones.ftp)}W"
        >
          Z${index + 1}
        </div>
      `;
    }).join('');

    return `
      <div class="mb-6">
        <h4 class="text-nebula-h3 font-medium text-foreground mb-4">Zone Visualization</h4>
        <div class="bg-muted/50 p-4 rounded-md">
          <div class="flex rounded overflow-hidden border border-border">
            ${zoneBarHTML}
          </div>
          <div class="flex justify-between mt-2 text-nebula-small text-muted-foreground">
            <span>0W</span>
            <span>${Math.round(maxPower)}W</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render zone statistics
   */
  renderZoneStatistics() {
    if (!this.trainingZones?.statistics) return '';

    const stats = this.trainingZones.statistics;

    return `
      <div class="mb-6">
        <h4 class="text-nebula-h3 font-medium text-foreground mb-4">Zone Statistics</h4>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-muted/50 p-4 rounded-md text-center">
            <div class="text-lg font-bold text-foreground">${stats.totalZones}</div>
            <div class="text-nebula-small text-muted-foreground">Total Zones</div>
          </div>
          <div class="bg-muted/50 p-4 rounded-md text-center">
            <div class="text-lg font-bold text-foreground">
              ${stats.wattsRange?.min}-${stats.wattsRange?.max}W
            </div>
            <div class="text-nebula-small text-muted-foreground">Power Range</div>
          </div>
          <div class="bg-muted/50 p-4 rounded-md text-center">
            <div class="text-lg font-bold text-foreground">${this.trainingZones.model}</div>
            <div class="text-nebula-small text-muted-foreground">Zone Model</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render training recommendations
   */
  renderTrainingRecommendations() {
    const recommendations = ZoneCalculator.getZoneRecommendations();
    
    return `
      <div>
        <h4 class="text-nebula-h3 font-medium text-foreground mb-4">Training Guidelines</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${Object.entries(recommendations).map(([key, rec]) => `
            <div class="bg-muted/50 p-4 rounded-md">
              <h5 class="font-semibold text-foreground capitalize mb-2">${key.replace(/([A-Z])/g, ' $1').trim()}</h5>
              <p class="text-nebula-small text-muted-foreground mb-2">${rec.description}</p>
              <div class="space-y-1 text-nebula-small">
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Duration:</span>
                  <span class="text-foreground">${rec.duration}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Frequency:</span>
                  <span class="text-foreground">${rec.frequency}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const refreshBtn = document.getElementById('refreshZonesBtn');
    
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.updateZones();
        this.render();
        
        // Show success message
        if (window.app?.ui?.showToast) {
          window.app.ui.showToast('Training zones refreshed!', 'success');
        }
      });
    }
  }

  /**
   * Trigger FTP edit in personal info form
   */
  triggerFTPEdit() {
    // Emit event for parent component to handle
    window.dispatchEvent(new CustomEvent('profile:editFTP', {
      detail: { component: this }
    }));
  }

  /**
   * Get zone for specific power value
   * @param {number} powerWatts - Power in watts
   * @returns {Object|null} Zone information
   */
  getZoneForPower(powerWatts) {
    if (!this.trainingZones) return null;
    
    return ZoneCalculator.getZoneForPower(
      powerWatts,
      this.trainingZones.ftp,
      this.trainingZones.zones
    );
  }

  /**
   * Get zone color for power value
   * @param {number} powerWatts - Power in watts
   * @returns {string} Zone color
   */
  getZoneColor(powerWatts) {
    if (!this.trainingZones) return '#cccccc';
    
    return ZoneCalculator.getZoneColor(
      powerWatts,
      this.trainingZones.ftp,
      this.trainingZones.zones
    );
  }

  /**
   * Calculate time in zones for workout
   * @param {Array} workoutSegments - Workout segments
   * @returns {Object} Time in zones analysis
   */
  calculateTimeInZones(workoutSegments) {
    if (!this.trainingZones) return null;
    
    return ZoneCalculator.calculateTimeInZones(
      workoutSegments,
      this.trainingZones.ftp,
      this.trainingZones.zones
    );
  }

  /**
   * Export zone data
   * @returns {Object} Zone export data
   */
  exportZoneData() {
    return {
      trainingZones: this.trainingZones,
      profile: {
        ftp: this.currentProfile?.ftp,
        name: this.currentProfile?.name,
      },
      exportDate: new Date().toISOString(),
    };
  }

  /**
   * Destroy the component
   */
  destroy() {
    if (this.unsubscribeProfile) {
      this.unsubscribeProfile();
    }
    if (this.unsubscribeFTP) {
      this.unsubscribeFTP();
    }
  }
}