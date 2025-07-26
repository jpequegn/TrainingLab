/**
 * Power Zones Management System
 * Provides custom power zone configuration and management
 * 
 * @class PowerZoneManager
 * @description Manages custom power zones with FTP-based calculations,
 * user-defined zones, and integration with workout generation
 */

export class PowerZoneManager {
    // Default FTP-based power zones (Coggan model)
    static DEFAULT_ZONES = {
        zone1: { min: 0.00, max: 0.55, name: 'Active Recovery', color: '#90EE90', description: 'Very easy spinning, recovery rides' },
        zone2: { min: 0.56, max: 0.75, name: 'Endurance', color: '#87CEEB', description: 'Aerobic base training, sustainable pace' },
        zone3: { min: 0.76, max: 0.90, name: 'Tempo', color: '#FFD700', description: 'Aerobic threshold, comfortably hard' },
        zone4: { min: 0.91, max: 1.05, name: 'Lactate Threshold', color: '#FFA500', description: 'Sustainable for ~1 hour' },
        zone5: { min: 1.06, max: 1.20, name: 'VO2 Max', color: '#FF6347', description: 'Aerobic power, 5-8 minute efforts' },
        zone6: { min: 1.21, max: 1.50, name: 'Anaerobic Capacity', color: '#FF4500', description: 'Anaerobic power, 30s-3min efforts' },
        zone7: { min: 1.51, max: 3.00, name: 'Neuromuscular Power', color: '#8B0000', description: 'Sprint power, <30 seconds' }
    };

    // Alternative zone models
    static ZONE_MODELS = {
        coggan: {
            name: 'Coggan 7-Zone Model',
            description: 'Traditional power-based training zones',
            zones: PowerZoneManager.DEFAULT_ZONES
        },
        polarized: {
            name: 'Polarized 3-Zone Model',
            description: 'Simplified training zones for polarized training',
            zones: {
                zone1: { min: 0.00, max: 0.75, name: 'Easy', color: '#90EE90', description: 'Aerobic base, conversational pace' },
                zone2: { min: 0.76, max: 0.95, name: 'Moderate', color: '#FFD700', description: 'Tempo to threshold efforts' },
                zone3: { min: 0.96, max: 3.00, name: 'Hard', color: '#FF4500', description: 'High intensity intervals' }
            }
        },
        custom: {
            name: 'Custom Zones',
            description: 'User-defined power zones',
            zones: {}
        }
    };

    constructor() {
        this.currentModel = 'coggan';
        this.ftp = this._loadFTP();
        this.zones = this._loadZones();
        this.wattsMode = this._loadWattsMode();
        this._validateZones();
    }

    /**
     * Load FTP from localStorage
     * @private
     * @returns {number} FTP value in watts
     */
    _loadFTP() {
        const stored = localStorage.getItem('userFTP');
        return stored ? parseInt(stored) : 250; // Default 250W FTP
    }

    /**
     * Load power zones from localStorage
     * @private
     * @returns {Object} Power zones configuration
     */
    _loadZones() {
        const stored = localStorage.getItem('powerZones');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                return parsed;
            } catch (error) {
                console.warn('Failed to parse stored power zones, using defaults:', error);
            }
        }
        return { ...PowerZoneManager.DEFAULT_ZONES };
    }

    /**
     * Load watts display mode preference
     * @private
     * @returns {boolean} True if watts mode enabled
     */
    _loadWattsMode() {
        const stored = localStorage.getItem('powerZonesWattsMode');
        return stored === 'true';
    }

    /**
     * Set FTP value
     * @param {number} ftp - FTP in watts
     * @throws {Error} If FTP is invalid
     */
    setFTP(ftp) {
        if (!ftp || typeof ftp !== 'number' || ftp <= 0 || ftp > 600) {
            throw new Error('FTP must be a positive number between 1-600 watts');
        }
        
        this.ftp = ftp;
        localStorage.setItem('userFTP', ftp.toString());
        this._notifyZoneChange();
    }

    /**
     * Get current FTP
     * @returns {number} FTP in watts
     */
    getFTP() {
        return this.ftp;
    }

    /**
     * Set watts display mode
     * @param {boolean} enabled - Enable watts mode
     */
    setWattsMode(enabled) {
        this.wattsMode = enabled;
        localStorage.setItem('powerZonesWattsMode', enabled.toString());
        this._notifyZoneChange();
    }

    /**
     * Get watts display mode
     * @returns {boolean} True if watts mode enabled
     */
    getWattsMode() {
        return this.wattsMode;
    }

    /**
     * Switch to predefined zone model
     * @param {string} modelName - Zone model name
     * @throws {Error} If model is invalid
     */
    setZoneModel(modelName) {
        if (!PowerZoneManager.ZONE_MODELS[modelName]) {
            throw new Error(`Invalid zone model: ${modelName}`);
        }
        
        this.currentModel = modelName;
        this.zones = { ...PowerZoneManager.ZONE_MODELS[modelName].zones };
        this._saveZones();
        this._notifyZoneChange();
    }

    /**
     * Get current zone model name
     * @returns {string} Current zone model
     */
    getZoneModel() {
        return this.currentModel;
    }

    /**
     * Get available zone models
     * @returns {Object} Available zone models
     */
    getAvailableModels() {
        return PowerZoneManager.ZONE_MODELS;
    }

    /**
     * Create custom zone
     * @param {string} zoneId - Zone identifier
     * @param {Object} zoneConfig - Zone configuration
     * @param {number} zoneConfig.min - Minimum power (% FTP)
     * @param {number} zoneConfig.max - Maximum power (% FTP)
     * @param {string} zoneConfig.name - Zone name
     * @param {string} zoneConfig.color - Zone color
     * @param {string} zoneConfig.description - Zone description
     * @throws {Error} If zone configuration is invalid
     */
    createZone(zoneId, zoneConfig) {
        this._validateZoneConfig(zoneConfig);
        
        if (this.currentModel !== 'custom') {
            this.currentModel = 'custom';
        }
        
        this.zones[zoneId] = { ...zoneConfig };
        this._saveZones();
        this._validateZones();
        this._notifyZoneChange();
    }

    /**
     * Update existing zone
     * @param {string} zoneId - Zone identifier
     * @param {Object} zoneConfig - Updated zone configuration
     * @throws {Error} If zone doesn't exist or config is invalid
     */
    updateZone(zoneId, zoneConfig) {
        if (!this.zones[zoneId]) {
            throw new Error(`Zone ${zoneId} does not exist`);
        }
        
        this._validateZoneConfig(zoneConfig);
        this.zones[zoneId] = { ...zoneConfig };
        this._saveZones();
        this._validateZones();
        this._notifyZoneChange();
    }

    /**
     * Delete zone
     * @param {string} zoneId - Zone identifier
     * @throws {Error} If zone doesn't exist
     */
    deleteZone(zoneId) {
        if (!this.zones[zoneId]) {
            throw new Error(`Zone ${zoneId} does not exist`);
        }
        
        delete this.zones[zoneId];
        this._saveZones();
        this._notifyZoneChange();
    }

    /**
     * Get all zones
     * @returns {Object} Current power zones
     */
    getZones() {
        return { ...this.zones };
    }

    /**
     * Get zone by power percentage
     * @param {number} powerPercent - Power as percentage of FTP
     * @returns {Object|null} Zone configuration or null if not found
     */
    getZoneByPower(powerPercent) {
        for (const [zoneId, zone] of Object.entries(this.zones)) {
            if (powerPercent >= zone.min && powerPercent <= zone.max) {
                return { id: zoneId, ...zone };
            }
        }
        return null;
    }

    /**
     * Get zone by watts
     * @param {number} watts - Power in watts
     * @returns {Object|null} Zone configuration or null if not found
     */
    getZoneByWatts(watts) {
        const powerPercent = watts / this.ftp;
        return this.getZoneByPower(powerPercent);
    }

    /**
     * Convert power percentage to watts
     * @param {number} powerPercent - Power as percentage of FTP
     * @returns {number} Power in watts
     */
    percentToWatts(powerPercent) {
        return Math.round(powerPercent * this.ftp);
    }

    /**
     * Convert watts to power percentage
     * @param {number} watts - Power in watts
     * @returns {number} Power as percentage of FTP
     */
    wattsToPercent(watts) {
        return watts / this.ftp;
    }

    /**
     * Get zone ranges in watts
     * @returns {Object} Zones with watt ranges
     */
    getZonesInWatts() {
        const wattsZones = {};
        for (const [zoneId, zone] of Object.entries(this.zones)) {
            wattsZones[zoneId] = {
                ...zone,
                minWatts: this.percentToWatts(zone.min),
                maxWatts: this.percentToWatts(zone.max)
            };
        }
        return wattsZones;
    }

    /**
     * Export zones configuration
     * @returns {Object} Exportable zones configuration
     */
    exportZones() {
        return {
            ftp: this.ftp,
            model: this.currentModel,
            zones: this.zones,
            wattsMode: this.wattsMode,
            exportDate: new Date().toISOString()
        };
    }

    /**
     * Import zones configuration
     * @param {Object} config - Zones configuration to import
     * @throws {Error} If configuration is invalid
     */
    importZones(config) {
        if (!config.zones || typeof config.zones !== 'object') {
            throw new Error('Invalid zones configuration');
        }
        
        // Validate imported zones
        for (const [zoneId, zone] of Object.entries(config.zones)) {
            this._validateZoneConfig(zone);
        }
        
        this.ftp = config.ftp || this.ftp;
        this.currentModel = config.model || 'custom';
        this.zones = { ...config.zones };
        this.wattsMode = config.wattsMode !== undefined ? config.wattsMode : this.wattsMode;
        
        this._saveZones();
        localStorage.setItem('userFTP', this.ftp.toString());
        localStorage.setItem('powerZonesWattsMode', this.wattsMode.toString());
        this._validateZones();
        this._notifyZoneChange();
    }

    /**
     * Reset to default zones
     */
    resetToDefaults() {
        this.currentModel = 'coggan';
        this.zones = { ...PowerZoneManager.DEFAULT_ZONES };
        this._saveZones();
        this._notifyZoneChange();
    }

    /**
     * Validate zone configuration
     * @private
     * @param {Object} zoneConfig - Zone configuration to validate
     * @throws {Error} If configuration is invalid
     */
    _validateZoneConfig(zoneConfig) {
        const required = ['min', 'max', 'name', 'color', 'description'];
        for (const field of required) {
            if (!(field in zoneConfig)) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
        
        if (typeof zoneConfig.min !== 'number' || zoneConfig.min < 0) {
            throw new Error('Zone minimum must be a non-negative number');
        }
        
        if (typeof zoneConfig.max !== 'number' || zoneConfig.max <= zoneConfig.min) {
            throw new Error('Zone maximum must be greater than minimum');
        }
        
        if (zoneConfig.max > 5.0) {
            console.warn('Zone maximum is very high (>500% FTP). This may be intentional for neuromuscular power zones.');
        }
        
        if (typeof zoneConfig.name !== 'string' || zoneConfig.name.trim().length === 0) {
            throw new Error('Zone name must be a non-empty string');
        }
        
        if (typeof zoneConfig.color !== 'string' || !zoneConfig.color.match(/^#[0-9A-Fa-f]{6}$/)) {
            throw new Error('Zone color must be a valid hex color code');
        }
    }

    /**
     * Validate all zones for overlaps and gaps
     * @private
     */
    _validateZones() {
        const zoneList = Object.entries(this.zones)
            .map(([id, zone]) => ({ id, ...zone }))
            .sort((a, b) => a.min - b.min);
        
        // Check for overlaps
        for (let i = 1; i < zoneList.length; i++) {
            const current = zoneList[i];
            const previous = zoneList[i - 1];
            
            if (current.min <= previous.max) {
                console.warn(`Zone overlap detected: ${previous.name} (${previous.max}) overlaps with ${current.name} (${current.min})`);
            }
        }
        
        // Check for gaps
        for (let i = 1; i < zoneList.length; i++) {
            const current = zoneList[i];
            const previous = zoneList[i - 1];
            
            if (current.min > previous.max + 0.01) { // Allow small gaps for rounding
                console.warn(`Zone gap detected between ${previous.name} (${previous.max}) and ${current.name} (${current.min})`);
            }
        }
    }

    /**
     * Save zones to localStorage
     * @private
     */
    _saveZones() {
        try {
            localStorage.setItem('powerZones', JSON.stringify(this.zones));
            localStorage.setItem('powerZoneModel', this.currentModel);
        } catch (error) {
            console.error('Failed to save power zones:', error);
        }
    }

    /**
     * Notify of zone changes
     * @private
     */
    _notifyZoneChange() {
        // Dispatch custom event for UI updates
        window.dispatchEvent(new CustomEvent('powerZonesChanged', {
            detail: {
                ftp: this.ftp,
                zones: this.zones,
                model: this.currentModel,
                wattsMode: this.wattsMode
            }
        }));
    }

    /**
     * Get zone statistics
     * @returns {Object} Zone statistics
     */
    getZoneStatistics() {
        const zoneList = Object.entries(this.zones).map(([id, zone]) => ({ id, ...zone }));
        const sortedZones = zoneList.sort((a, b) => a.min - b.min);
        
        return {
            totalZones: zoneList.length,
            powerRange: {
                min: Math.min(...zoneList.map(z => z.min)),
                max: Math.max(...zoneList.map(z => z.max))
            },
            wattsRange: {
                min: this.percentToWatts(Math.min(...zoneList.map(z => z.min))),
                max: this.percentToWatts(Math.max(...zoneList.map(z => z.max)))
            },
            sortedZones
        };
    }

    /**
     * Get zone color palette
     * @returns {Array} Array of zone colors
     */
    getZoneColors() {
        return Object.values(this.zones).map(zone => zone.color);
    }
}

// Create singleton instance
export const powerZoneManager = new PowerZoneManager();

// Export for use in other modules
window.powerZoneManager = powerZoneManager;