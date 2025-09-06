/**
 * UserProfileModel.js
 * JavaScript implementation of user profile model for TrainingLab
 * Provides comprehensive user and athlete profile management with dashboard integration
 */

export class UserProfileModel {
  constructor(data = {}) {
    // Core user profile
    this.id = data.id || this._generateId();
    this.email = data.email || null;
    this.name = data.name || '';
    this.avatar = data.avatar || null;
    this.created = data.created ? new Date(data.created) : new Date();
    this.lastActive = data.lastActive ? new Date(data.lastActive) : new Date();

    // Athlete profile
    this.userId = this.id;
    this.ftp = data.ftp || 250; // Functional Threshold Power in watts
    this.ftpHistory = data.ftpHistory || [];
    this.weight = data.weight || 70; // kg
    this.height = data.height || null; // cm
    this.birthYear = data.birthYear || null;
    this.powerZones = data.powerZones || this._calculatePowerZones(this.ftp);
    this.hrZones = data.hrZones || null;
    this.preferences = data.preferences || this._getDefaultPreferences();
    this.goals = data.goals || [];

    // Extended fields for athlete dashboard
    this.hrv = data.hrv || {
      score: 45,
      trend: 'stable',
      lastUpdate: new Date(),
    };
    this.recoveryStatus = data.recoveryStatus || {
      status: 'ready',
      score: 85,
      factors: [],
    };
    this.trainingLoad = data.trainingLoad || {
      acute: 120,
      chronic: 110,
      ratio: 1.09,
    };
    this.recentTSS = data.recentTSS || { today: 0, week: 485, average: 69 };
    this.performanceMetrics = data.performanceMetrics || {
      vo2Max: 55,
      lactateThreshold: 4.2,
      efficiency: 0.23,
      peakPower: 1200,
    };

    // Training history summary
    this.trainingSummary = data.trainingSummary || {
      totalSessions: 0,
      totalHours: 0,
      averageTSS: 0,
      lastSession: null,
      weeklyVolume: 8.5,
    };
  }

  /**
   * Generate a unique ID for the user
   * @returns {string} Unique identifier
   */
  _generateId() {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate power zones based on FTP
   * @param {number} ftp - Functional Threshold Power
   * @returns {object} Power zones object
   */
  _calculatePowerZones(ftp) {
    return {
      ftp: ftp,
      zones: {
        active_recovery: { min: 0, max: Math.round(ftp * 0.55) },
        endurance: { min: Math.round(ftp * 0.55), max: Math.round(ftp * 0.75) },
        tempo: { min: Math.round(ftp * 0.75), max: Math.round(ftp * 0.9) },
        threshold: { min: Math.round(ftp * 0.9), max: Math.round(ftp * 1.05) },
        vo2max: { min: Math.round(ftp * 1.05), max: Math.round(ftp * 1.2) },
        anaerobic: { min: Math.round(ftp * 1.2), max: Math.round(ftp * 1.5) },
        neuromuscular: {
          min: Math.round(ftp * 1.5),
          max: Math.round(ftp * 2.0),
        },
      },
      updated: new Date(),
    };
  }

  /**
   * Get default user preferences
   * @returns {object} Default preferences object
   */
  _getDefaultPreferences() {
    return {
      units: 'metric',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: 'en',
      theme: 'light',
      autoFTPUpdate: true,
      weekStartsOn: 'monday',
      defaultWorkoutView: 'power',
    };
  }

  /**
   * Update FTP and recalculate power zones
   * @param {number} newFTP - New FTP value
   * @param {string} testType - Type of FTP test
   * @param {string} source - Source of the measurement
   */
  updateFTP(newFTP, testType = 'manual', source = 'TrainingLab') {
    const oldFTP = this.ftp;
    this.ftp = newFTP;

    // Add to FTP history
    this.ftpHistory.push({
      value: newFTP,
      date: new Date(),
      testType: testType,
      source: source,
    });

    // Recalculate power zones
    this.powerZones = this._calculatePowerZones(newFTP);
    this.lastActive = new Date();

    return {
      oldFTP: oldFTP,
      newFTP: newFTP,
      change: newFTP - oldFTP,
      percentChange: (((newFTP - oldFTP) / oldFTP) * 100).toFixed(1),
    };
  }

  /**
   * Update weight
   * @param {number} newWeight - New weight in kg
   */
  updateWeight(newWeight) {
    const oldWeight = this.weight;
    this.weight = newWeight;
    this.lastActive = new Date();

    return {
      oldWeight: oldWeight,
      newWeight: newWeight,
      change: newWeight - oldWeight,
    };
  }

  /**
   * Update HRV data
   * @param {number} score - HRV score
   * @param {string} trend - Trend direction ('up', 'down', 'stable')
   */
  updateHRV(score, trend = 'stable') {
    this.hrv = {
      score: score,
      trend: trend,
      lastUpdate: new Date(),
    };
    this.lastActive = new Date();
  }

  /**
   * Update recovery status
   * @param {string} status - Recovery status ('ready', 'maintenance', 'overreaching', 'recovery')
   * @param {number} score - Recovery score 0-100
   * @param {Array} factors - Factors affecting recovery
   */
  updateRecoveryStatus(status, score, factors = []) {
    this.recoveryStatus = {
      status: status,
      score: score,
      factors: factors,
      lastUpdate: new Date(),
    };
    this.lastActive = new Date();
  }

  /**
   * Update training load metrics
   * @param {number} acute - Acute Training Load (7-day)
   * @param {number} chronic - Chronic Training Load (42-day)
   */
  updateTrainingLoad(acute, chronic) {
    this.trainingLoad = {
      acute: acute,
      chronic: chronic,
      ratio: chronic > 0 ? acute / chronic : 1.0,
      lastUpdate: new Date(),
    };
    this.lastActive = new Date();
  }

  /**
   * Get dashboard metrics for the athlete dashboard
   * @returns {object} Dashboard metrics object
   */
  getDashboardMetrics() {
    const ftpChange = this.getFTPChange();
    const weightChange = this.getWeightChange();

    return {
      ftp: {
        value: this.ftp,
        unit: 'W',
        change: ftpChange.change,
        changeText: `${ftpChange.change >= 0 ? '+' : ''}${ftpChange.change}W from last test`,
        changeType: ftpChange.change >= 0 ? 'positive' : 'negative',
      },
      weight: {
        value: this.weight,
        unit: this.preferences.units === 'imperial' ? 'lbs' : 'kg',
        change: weightChange.change,
        changeText: `${weightChange.change >= 0 ? '+' : ''}${weightChange.change.toFixed(1)}kg this week`,
        changeType: weightChange.change <= 0 ? 'positive' : 'negative',
      },
      tss: {
        value: this.recentTSS.week,
        unit: 'TSS',
        change: this.recentTSS.week - this.recentTSS.average * 7,
        changeText: `${this.recentTSS.average}/day average`,
        changeType: 'neutral',
      },
      hrv: {
        value: this.hrv.score,
        unit: 'ms',
        trend: this.hrv.trend,
        changeText: `${this.hrv.trend} trend`,
        changeType:
          this.hrv.trend === 'up'
            ? 'positive'
            : this.hrv.trend === 'down'
              ? 'negative'
              : 'neutral',
      },
      trainingLoad: {
        value: this.trainingLoad.ratio.toFixed(2),
        unit: 'ATL/CTL',
        change: this.trainingLoad.ratio - 1.0,
        changeText: this._getTrainingLoadStatus(this.trainingLoad.ratio),
        changeType: this._getTrainingLoadType(this.trainingLoad.ratio),
      },
      recovery: {
        value: this.recoveryStatus.score,
        unit: '%',
        status: this.recoveryStatus.status,
        changeText: this._getRecoveryStatusText(this.recoveryStatus.status),
        changeType: this._getRecoveryStatusType(this.recoveryStatus.status),
      },
    };
  }

  /**
   * Get FTP change information
   * @returns {object} FTP change data
   */
  getFTPChange() {
    if (this.ftpHistory.length < 2) {
      return { change: 0, date: null };
    }

    const latest = this.ftpHistory[this.ftpHistory.length - 1];
    const previous = this.ftpHistory[this.ftpHistory.length - 2];

    return {
      change: latest.value - previous.value,
      date: previous.date,
      percentChange: (
        ((latest.value - previous.value) / previous.value) *
        100
      ).toFixed(1),
    };
  }

  /**
   * Get weight change information (mock implementation)
   * @returns {object} Weight change data
   */
  getWeightChange() {
    // Mock implementation - in real scenario would track weight history
    return { change: -0.2 }; // Assume slight weight loss
  }

  /**
   * Get training load status text
   * @param {number} ratio - ATL/CTL ratio
   * @returns {string} Status text
   */
  _getTrainingLoadStatus(ratio) {
    if (ratio < 0.8) return 'Detraining risk';
    if (ratio < 1.0) return 'Maintaining fitness';
    if (ratio < 1.3) return 'Building fitness';
    return 'Overreaching risk';
  }

  /**
   * Get training load type for UI styling
   * @param {number} ratio - ATL/CTL ratio
   * @returns {string} Type for styling
   */
  _getTrainingLoadType(ratio) {
    if (ratio < 0.8 || ratio > 1.3) return 'negative';
    if (ratio >= 1.0 && ratio <= 1.2) return 'positive';
    return 'neutral';
  }

  /**
   * Get recovery status text
   * @param {string} status - Recovery status
   * @returns {string} Status text
   */
  _getRecoveryStatusText(status) {
    const statusMap = {
      ready: 'Ready to train',
      maintenance: 'Light training',
      overreaching: 'Recovery needed',
      recovery: 'Rest day',
    };
    return statusMap[status] || status;
  }

  /**
   * Get recovery status type for UI styling
   * @param {string} status - Recovery status
   * @returns {string} Type for styling
   */
  _getRecoveryStatusType(status) {
    const typeMap = {
      ready: 'positive',
      maintenance: 'neutral',
      overreaching: 'negative',
      recovery: 'negative',
    };
    return typeMap[status] || 'neutral';
  }

  /**
   * Convert to JSON for storage
   * @returns {object} JSON representation
   */
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      avatar: this.avatar,
      created: this.created.toISOString(),
      lastActive: this.lastActive.toISOString(),
      userId: this.userId,
      ftp: this.ftp,
      ftpHistory: this.ftpHistory,
      weight: this.weight,
      height: this.height,
      birthYear: this.birthYear,
      powerZones: {
        ...this.powerZones,
        updated: this.powerZones.updated.toISOString(),
      },
      hrZones: this.hrZones,
      preferences: this.preferences,
      goals: this.goals,
      hrv: this.hrv,
      recoveryStatus: this.recoveryStatus,
      trainingLoad: this.trainingLoad,
      recentTSS: this.recentTSS,
      performanceMetrics: this.performanceMetrics,
      trainingSummary: this.trainingSummary,
    };
  }

  /**
   * Create instance from JSON data
   * @param {object} json - JSON data
   * @returns {UserProfileModel} Model instance
   */
  static fromJSON(json) {
    return new UserProfileModel(json);
  }

  /**
   * Validate user profile data
   * @returns {object} Validation result
   */
  validate() {
    const errors = [];
    const warnings = [];

    // Required fields
    if (!this.id) errors.push('User ID is required');
    if (!this.name || this.name.trim() === '')
      warnings.push('User name is recommended');

    // FTP validation
    if (!this.ftp || this.ftp < 50 || this.ftp > 500) {
      errors.push('FTP must be between 50 and 500 watts');
    }

    // Weight validation
    if (this.weight && (this.weight < 30 || this.weight > 200)) {
      warnings.push('Weight seems unusual, please verify');
    }

    // HRV validation
    if (this.hrv.score < 10 || this.hrv.score > 100) {
      warnings.push('HRV score seems unusual');
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
      warnings: warnings,
    };
  }
}
