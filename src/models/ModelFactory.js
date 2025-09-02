/**
 * ModelFactory.js
 * Factory and utility functions for user profile model management
 */

import { UserProfileModel } from './UserProfileModel.js';

export class ModelFactory {
  /**
   * Create a new user profile with default values
   * @param {object} userData - Initial user data
   * @returns {UserProfileModel} New user profile instance
   */
  static createUserProfile(userData = {}) {
    return new UserProfileModel(userData);
  }

  /**
   * Create a demo/sample user profile for testing
   * @returns {UserProfileModel} Demo user profile
   */
  static createDemoProfile() {
    const demoData = {
      id: 'demo_user_001',
      email: 'demo@traininglab.com',
      name: 'Alex Thompson',
      avatar: null,
      ftp: 285,
      weight: 72,
      ftpHistory: [
        {
          value: 280,
          date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          testType: 'ramp',
          source: 'Zwift',
        },
        {
          value: 285,
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          testType: 'ramp',
          source: 'TrainingLab',
        },
      ],
      hrv: {
        score: 45,
        trend: 'up',
        lastUpdate: new Date(),
      },
      recoveryStatus: {
        status: 'ready',
        score: 85,
        factors: ['good_sleep', 'low_stress'],
        lastUpdate: new Date(),
      },
      trainingLoad: {
        acute: 120,
        chronic: 110,
        ratio: 1.09,
        lastUpdate: new Date(),
      },
      recentTSS: {
        today: 0,
        week: 485,
        average: 69,
      },
      performanceMetrics: {
        vo2Max: 55,
        lactateThreshold: 4.2,
        efficiency: 0.23,
        peakPower: 1200,
      },
      trainingSummary: {
        totalSessions: 156,
        totalHours: 285.5,
        averageTSS: 69,
        lastSession: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        weeklyVolume: 8.5,
      },
      preferences: {
        units: 'metric',
        timezone: 'America/New_York',
        language: 'en',
        theme: 'light',
        autoFTPUpdate: true,
        weekStartsOn: 'monday',
        defaultWorkoutView: 'power',
      },
    };

    return new UserProfileModel(demoData);
  }

  /**
   * Create user profile from storage data
   * @param {object} storageData - Data from IndexedDB or localStorage
   * @returns {UserProfileModel} User profile instance
   */
  static fromStorage(storageData) {
    if (!storageData) {
      throw new Error('Storage data is required');
    }

    try {
      return UserProfileModel.fromJSON(storageData);
    } catch (error) {
      console.error('Error creating user profile from storage:', error);
      throw new Error('Invalid storage data format');
    }
  }

  /**
   * Migrate legacy profile data to new format
   * @param {object} legacyData - Legacy profile data
   * @returns {UserProfileModel} Migrated user profile
   */
  static migrateLegacyProfile(legacyData) {
    const migratedData = {
      id: legacyData.id || legacyData.userId || ModelFactory._generateId(),
      email: legacyData.email || null,
      name: legacyData.name || legacyData.displayName || '',
      avatar: legacyData.avatar || legacyData.photo || null,
      created: legacyData.created ? new Date(legacyData.created) : new Date(),
      lastActive: legacyData.lastActive
        ? new Date(legacyData.lastActive)
        : new Date(),
      ftp: legacyData.ftp || legacyData.functionalThresholdPower || 250,
      weight: legacyData.weight || legacyData.bodyWeight || null,
      ftpHistory: legacyData.ftpHistory || [],
      preferences: legacyData.preferences || {},
      goals: legacyData.goals || [],
    };

    return new UserProfileModel(migratedData);
  }

  /**
   * Generate a unique ID
   * @returns {string} Unique identifier
   */
  static _generateId() {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Profile validation utilities
 */
export class ProfileValidator {
  /**
   * Validate FTP value
   * @param {number} ftp - FTP value to validate
   * @returns {object} Validation result
   */
  static validateFTP(ftp) {
    const errors = [];
    const warnings = [];

    if (typeof ftp !== 'number' || isNaN(ftp)) {
      errors.push('FTP must be a number');
      return { isValid: false, errors, warnings };
    }

    if (ftp < 50) {
      errors.push('FTP cannot be less than 50 watts');
    } else if (ftp < 100) {
      warnings.push('FTP seems low, please verify');
    }

    if (ftp > 500) {
      errors.push('FTP cannot exceed 500 watts');
    } else if (ftp > 400) {
      warnings.push('FTP seems high, please verify');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate weight value
   * @param {number} weight - Weight value to validate (in kg)
   * @returns {object} Validation result
   */
  static validateWeight(weight) {
    const errors = [];
    const warnings = [];

    if (weight === null || weight === undefined) {
      return { isValid: true, errors, warnings }; // Weight is optional
    }

    if (typeof weight !== 'number' || isNaN(weight)) {
      errors.push('Weight must be a number');
      return { isValid: false, errors, warnings };
    }

    if (weight < 30) {
      errors.push('Weight cannot be less than 30 kg');
    } else if (weight < 40) {
      warnings.push('Weight seems low, please verify');
    }

    if (weight > 200) {
      errors.push('Weight cannot exceed 200 kg');
    } else if (weight > 120) {
      warnings.push('Weight seems high, please verify');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate HRV score
   * @param {number} hrvScore - HRV score to validate
   * @returns {object} Validation result
   */
  static validateHRV(hrvScore) {
    const errors = [];
    const warnings = [];

    if (typeof hrvScore !== 'number' || isNaN(hrvScore)) {
      errors.push('HRV score must be a number');
      return { isValid: false, errors, warnings };
    }

    if (hrvScore < 10) {
      warnings.push('HRV score seems very low');
    }

    if (hrvScore > 100) {
      warnings.push('HRV score seems very high');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {object} Validation result
   */
  static validateEmail(email) {
    const errors = [];
    const warnings = [];

    if (!email) {
      return { isValid: true, errors, warnings }; // Email is optional
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Invalid email format');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate complete user profile
   * @param {UserProfileModel} profile - Profile to validate
   * @returns {object} Validation result
   */
  static validateProfile(profile) {
    if (!(profile instanceof UserProfileModel)) {
      return {
        isValid: false,
        errors: ['Invalid profile instance'],
        warnings: [],
      };
    }

    const allErrors = [];
    const allWarnings = [];

    // Validate individual components
    const ftpValidation = this.validateFTP(profile.ftp);
    allErrors.push(...ftpValidation.errors);
    allWarnings.push(...ftpValidation.warnings);

    const weightValidation = this.validateWeight(profile.weight);
    allErrors.push(...weightValidation.errors);
    allWarnings.push(...weightValidation.warnings);

    const hrvValidation = this.validateHRV(profile.hrv.score);
    allErrors.push(...hrvValidation.errors);
    allWarnings.push(...hrvValidation.warnings);

    const emailValidation = this.validateEmail(profile.email);
    allErrors.push(...emailValidation.errors);
    allWarnings.push(...emailValidation.warnings);

    // Additional profile-level validations
    if (!profile.id) {
      allErrors.push('Profile ID is required');
    }

    if (!profile.name || profile.name.trim() === '') {
      allWarnings.push('Profile name is recommended');
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    };
  }
}

/**
 * Profile data transformation utilities
 */
export class ProfileTransformer {
  /**
   * Convert weight between metric and imperial units
   * @param {number} weight - Weight value
   * @param {string} fromUnit - Source unit ('kg' or 'lbs')
   * @param {string} toUnit - Target unit ('kg' or 'lbs')
   * @returns {number} Converted weight
   */
  static convertWeight(weight, fromUnit, toUnit) {
    if (fromUnit === toUnit) return weight;

    if (fromUnit === 'kg' && toUnit === 'lbs') {
      return Math.round(weight * 2.20462 * 10) / 10;
    }

    if (fromUnit === 'lbs' && toUnit === 'kg') {
      return Math.round((weight / 2.20462) * 10) / 10;
    }

    throw new Error(`Unsupported conversion: ${fromUnit} to ${toUnit}`);
  }

  /**
   * Format profile data for display
   * @param {UserProfileModel} profile - Profile to format
   * @param {object} options - Formatting options
   * @returns {object} Formatted profile data
   */
  static formatForDisplay(profile, options = {}) {
    const { units = 'metric', precision = 1 } = options;

    const weightValue =
      units === 'imperial'
        ? this.convertWeight(profile.weight, 'kg', 'lbs')
        : profile.weight;

    const weightUnit = units === 'imperial' ? 'lbs' : 'kg';

    return {
      name: profile.name || 'Unknown Athlete',
      ftp: `${profile.ftp}W`,
      weight: profile.weight
        ? `${weightValue.toFixed(precision)}${weightUnit}`
        : 'Not set',
      hrv: `${profile.hrv.score}ms`,
      recoveryScore: `${profile.recoveryStatus.score}%`,
      trainingLoadRatio: profile.trainingLoad.ratio.toFixed(2),
      weeklyTSS: profile.recentTSS.week,
    };
  }
}
