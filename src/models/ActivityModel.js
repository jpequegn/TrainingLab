/**
 * Activity Model
 * Comprehensive model for training activities with full metrics support
 * Supports TSS, power data, and various activity types as outlined in issue #111
 */

export class ActivityModel {
  constructor(data = {}) {
    // Core identification
    this.id = data.id || this.generateId();
    this.userId = data.userId || null;
    
    // Basic activity info
    this.name = data.name || '';
    this.date = data.date || new Date().toISOString();
    this.type = data.type || 'workout'; // workout, race, test, recovery
    this.source = data.source || 'manual'; // manual, file, strava, trainingpeaks
    
    // Duration and timing
    this.duration = data.duration || 0; // seconds
    this.movingTime = data.movingTime || data.duration || 0; // seconds
    this.elapsedTime = data.elapsedTime || data.duration || 0; // seconds
    
    // Training stress and intensity
    this.tss = data.tss || 0; // Training Stress Score
    this.intensityFactor = data.intensityFactor || data.if || 0; // Intensity Factor (0-2.0)
    this.normalizedPower = data.normalizedPower || data.np || 0; // Normalized Power (watts)
    
    // Power data
    this.avgPower = data.avgPower || 0; // Average power (watts)
    this.maxPower = data.maxPower || 0; // Maximum power (watts)
    this.weightedAvgPower = data.weightedAvgPower || this.normalizedPower; // Weighted average
    
    // Distance and location
    this.distance = data.distance || 0; // meters
    this.elevation = data.elevation || 0; // total elevation gain (meters)
    this.startLatLng = data.startLatLng || null; // [lat, lng]
    this.endLatLng = data.endLatLng || null; // [lat, lng]
    
    // Heart rate data
    this.heartRate = {
      avg: data.heartRate?.avg || data.avgHeartRate || 0,
      max: data.heartRate?.max || data.maxHeartRate || 0,
      min: data.heartRate?.min || 0,
      zones: data.heartRate?.zones || {} // time in each HR zone
    };
    
    // Power zones (time in each zone)
    this.powerZones = data.powerZones || data.zones || {
      z1: 0, // Active Recovery (<55% FTP)
      z2: 0, // Endurance (55-75% FTP)
      z3: 0, // Tempo (76-90% FTP)
      z4: 0, // Lactate Threshold (91-105% FTP)
      z5: 0, // VO2 Max (106-120% FTP)
      z6: 0, // Anaerobic Capacity (121-150% FTP)
      z7: 0  // Neuromuscular Power (>150% FTP)
    };
    
    // Additional metrics
    this.cadence = {
      avg: data.cadence?.avg || data.avgCadence || 0,
      max: data.cadence?.max || data.maxCadence || 0
    };
    
    this.speed = {
      avg: data.speed?.avg || data.avgSpeed || 0,
      max: data.speed?.max || data.maxSpeed || 0
    };
    
    this.temperature = data.temperature || null; // celsius
    this.calories = data.calories || 0;
    
    // Workout structure (for structured workouts)
    this.segments = data.segments || []; // workout segments
    this.intervals = data.intervals || []; // interval data
    
    // File and raw data
    this.filename = data.filename || null;
    this.rawData = data.rawData || null; // original file data
    this.compressed = data.compressed || false;
    
    // User notes and tags
    this.notes = data.notes || '';
    this.tags = data.tags || [];
    this.starred = data.starred || false;
    
    // Weather and conditions
    this.weather = data.weather || {
      temperature: null,
      humidity: null,
      windSpeed: null,
      conditions: null // sunny, cloudy, rain, etc.
    };
    
    // Equipment
    this.equipment = data.equipment || {
      bike: null,
      trainer: null,
      powerMeter: null
    };
    
    // Social and sharing
    this.privacy = data.privacy || 'private'; // private, public, friends
    this.shared = data.shared || false;
    
    // System metadata
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.version = data.version || 1;
  }

  /**
   * Generate unique activity ID
   */
  generateId() {
    return `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate TSS if not provided
   * TSS = (duration_hours × NP² × IF²) / (FTP² × 3600) × 100
   */
  calculateTSS(ftp = 250) {
    if (this.tss > 0) return this.tss;
    
    if (this.normalizedPower > 0 && this.duration > 0) {
      const durationHours = this.duration / 3600;
      const np = this.normalizedPower;
      const tss = (durationHours * Math.pow(np, 2)) / Math.pow(ftp, 2) * 100;
      return Math.round(tss);
    }
    
    // Fallback calculation based on average power
    if (this.avgPower > 0 && this.duration > 0) {
      const durationHours = this.duration / 3600;
      const estimatedIF = this.avgPower / ftp;
      const tss = durationHours * Math.pow(estimatedIF, 2) * 100;
      return Math.round(tss);
    }
    
    return 0;
  }

  /**
   * Calculate Intensity Factor (IF)
   * IF = NP / FTP
   */
  calculateIF(ftp = 250) {
    if (this.intensityFactor > 0) return this.intensityFactor;
    
    if (this.normalizedPower > 0) {
      return Math.round((this.normalizedPower / ftp) * 100) / 100;
    }
    
    if (this.avgPower > 0) {
      return Math.round((this.avgPower / ftp) * 100) / 100;
    }
    
    return 0;
  }

  /**
   * Calculate Normalized Power if not provided
   * Simplified calculation: NP ≈ avgPower * 1.05 for estimates
   */
  calculateNormalizedPower() {
    if (this.normalizedPower > 0) return this.normalizedPower;
    
    if (this.avgPower > 0) {
      // Simple estimation - in reality, NP requires 30-second rolling averages
      return Math.round(this.avgPower * 1.05);
    }
    
    return 0;
  }

  /**
   * Get activity summary for display
   */
  getSummary() {
    return {
      id: this.id,
      name: this.name,
      date: this.date,
      type: this.type,
      duration: this.duration,
      distance: this.distance,
      tss: this.tss,
      avgPower: this.avgPower,
      normalizedPower: this.normalizedPower,
      intensityFactor: this.intensityFactor
    };
  }

  /**
   * Get metrics for analytics
   */
  getMetrics(ftp = 250) {
    return {
      tss: this.calculateTSS(ftp),
      intensityFactor: this.calculateIF(ftp),
      normalizedPower: this.calculateNormalizedPower(),
      duration: this.duration,
      distance: this.distance,
      elevation: this.elevation,
      avgPower: this.avgPower,
      maxPower: this.maxPower,
      avgHeartRate: this.heartRate.avg,
      maxHeartRate: this.heartRate.max,
      avgCadence: this.cadence.avg,
      avgSpeed: this.speed.avg,
      calories: this.calories
    };
  }

  /**
   * Validate activity data
   */
  validate() {
    const errors = [];
    
    if (!this.date) {
      errors.push('Activity date is required');
    }
    
    if (!this.type) {
      errors.push('Activity type is required');
    }
    
    if (this.duration <= 0) {
      errors.push('Duration must be greater than 0');
    }
    
    if (this.tss < 0 || this.tss > 1000) {
      errors.push('TSS must be between 0 and 1000');
    }
    
    if (this.intensityFactor < 0 || this.intensityFactor > 2) {
      errors.push('Intensity Factor must be between 0 and 2.0');
    }
    
    return errors;
  }

  /**
   * Convert to JSON for storage
   */
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      name: this.name,
      date: this.date,
      type: this.type,
      source: this.source,
      duration: this.duration,
      movingTime: this.movingTime,
      elapsedTime: this.elapsedTime,
      tss: this.tss,
      intensityFactor: this.intensityFactor,
      normalizedPower: this.normalizedPower,
      avgPower: this.avgPower,
      maxPower: this.maxPower,
      weightedAvgPower: this.weightedAvgPower,
      distance: this.distance,
      elevation: this.elevation,
      startLatLng: this.startLatLng,
      endLatLng: this.endLatLng,
      heartRate: this.heartRate,
      powerZones: this.powerZones,
      cadence: this.cadence,
      speed: this.speed,
      temperature: this.temperature,
      calories: this.calories,
      segments: this.segments,
      intervals: this.intervals,
      filename: this.filename,
      rawData: this.rawData,
      compressed: this.compressed,
      notes: this.notes,
      tags: this.tags,
      starred: this.starred,
      weather: this.weather,
      equipment: this.equipment,
      privacy: this.privacy,
      shared: this.shared,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version
    };
  }

  /**
   * Create from JSON data
   */
  static fromJSON(data) {
    return new ActivityModel(data);
  }

  /**
   * Create from file data (FIT, TCX, GPX)
   */
  static fromFileData(fileData, filename) {
    // This would parse different file formats
    // For now, return a basic activity
    return new ActivityModel({
      name: filename?.replace(/\.[^/.]+$/, '') || 'Imported Activity',
      source: 'file',
      filename: filename,
      rawData: fileData,
      ...fileData
    });
  }

  /**
   * Get activity type icon
   */
  getTypeIcon() {
    const icons = {
      workout: 'fas fa-dumbbell',
      race: 'fas fa-trophy',
      test: 'fas fa-flask',
      recovery: 'fas fa-spa',
      cycling: 'fas fa-bicycle',
      running: 'fas fa-running',
      swimming: 'fas fa-swimmer'
    };
    
    return icons[this.type] || 'fas fa-dumbbell';
  }

  /**
   * Get formatted duration
   */
  getFormattedDuration() {
    const hours = Math.floor(this.duration / 3600);
    const minutes = Math.floor((this.duration % 3600) / 60);
    const seconds = this.duration % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Get formatted distance
   */
  getFormattedDistance(units = 'metric') {
    if (this.distance <= 0) return '0';
    
    if (units === 'imperial') {
      const miles = this.distance / 1609.34;
      return `${miles.toFixed(1)} mi`;
    } else {
      const km = this.distance / 1000;
      return `${km.toFixed(1)} km`;
    }
  }

  /**
   * Update activity data
   */
  update(data) {
    Object.assign(this, data);
    this.updatedAt = new Date().toISOString();
    this.version += 1;
  }
}

export default ActivityModel;