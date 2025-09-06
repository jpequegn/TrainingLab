/**
 * Profile Service
 * Handles business logic for user profile management
 */

import { enhancedStorage } from './storage/enhanced-storage.js';
import { performanceMonitor } from './storage/performance-monitor.js';
import { stateManager } from './state-manager.js';
import { powerZoneManager } from '../core/power-zones.js';
import { UserProfileModel } from '../models/UserProfileModel.js';

export class ProfileService {
  constructor() {
    this.currentProfileId = null;
    this.initialized = false;
    this.currentUserModel = null; // UserProfileModel instance
  }

  /**
   * Initialize the profile service
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Initialize storage
      await enhancedStorage.initialize();
      
      // Initialize performance monitoring
      await performanceMonitor.initialize();
      await performanceMonitor.startMonitoring({
        enableAlerts: true,
        enableOptimization: true
      });

      // Load saved profile ID from preferences
      const preferences = JSON.parse(
        localStorage.getItem('workout-visualizer-preferences') || '{}'
      );

      if (preferences.profileId) {
        await this.loadProfile(preferences.profileId);
      } else {
        // Try to load the primary profile
        const primaryProfile = await enhancedStorage.getPrimaryUserProfile();
        if (primaryProfile) {
          await this.loadProfile(primaryProfile.id);
        }
      }

      this.initialized = true;
      console.log('Profile service initialized');
    } catch (error) {
      console.error('Failed to initialize profile service:', error);
      stateManager.dispatch('SET_PROFILE_ERROR', {
        type: 'INITIALIZATION_ERROR',
        message: 'Failed to initialize profile system',
        error,
      });
    }
  }

  /**
   * Create a new user profile
   * @param {Object} profileData - Profile data
   * @returns {Promise<string>} Profile ID
   */
  async createProfile(profileData) {
    try {
      stateManager.dispatch('SET_PROFILE_LOADING', true);

      // Create UserProfileModel instance for validation and data enhancement
      const userModel = new UserProfileModel(profileData);
      const validation = userModel.validate();

      if (!validation.isValid) {
        throw new Error(
          `Profile validation failed: ${validation.errors.join(', ')}`
        );
      }

      // Use model's enhanced data for storage
      const enhancedProfileData = userModel.toJSON();

      // Save to storage
      const profileId =
        await enhancedStorage.saveUserProfile(enhancedProfileData);

      // Store the model instance
      this.currentUserModel = userModel;
      this.currentUserModel.id = profileId;

      // Update power zones if FTP provided
      if (profileData.ftp) {
        powerZoneManager.setFTP(profileData.ftp);
      }

      // Load the new profile
      await this.loadProfile(profileId);

      // Add initial FTP history entry if FTP provided
      if (profileData.ftp) {
        await this.addFTPEntry(profileData.ftp, new Date(), 'profile_creation');
      }

      stateManager.dispatch('SET_PROFILE_LOADING', false);
      console.log('Profile created successfully:', profileId);

      return profileId;
    } catch (error) {
      stateManager.dispatch('SET_PROFILE_LOADING', false);
      stateManager.dispatch('SET_PROFILE_ERROR', {
        type: 'PROFILE_CREATION_ERROR',
        message: 'Failed to create profile',
        error,
      });
      throw error;
    }
  }

  /**
   * Load an existing profile
   * @param {string} profileId - Profile ID
   * @returns {Promise<void>}
   */
  async loadProfile(profileId) {
    try {
      stateManager.dispatch('SET_PROFILE_LOADING', true);

      const profile = await enhancedStorage.getUserProfile(profileId);
      if (!profile) {
        throw new Error('Profile not found');
      }

      // Load FTP history
      const ftpHistory = await enhancedStorage.getFTPHistory(profileId);

      // Create UserProfileModel instance with enhanced data
      const modelData = {
        ...profile,
        ftpHistory: ftpHistory,
        // Add dashboard-specific data if not present
        hrv: profile.hrv || {
          score: 45,
          trend: 'stable',
          lastUpdate: new Date(),
        },
        recoveryStatus: profile.recoveryStatus || {
          status: 'ready',
          score: 85,
          factors: [],
        },
        trainingLoad: profile.trainingLoad || {
          acute: 120,
          chronic: 110,
          ratio: 1.09,
        },
        recentTSS: profile.recentTSS || { today: 0, week: 485, average: 69 },
      };

      this.currentUserModel = new UserProfileModel(modelData);

      // Update state with both original and model data
      stateManager.dispatch('LOAD_USER_PROFILE', profile);
      stateManager.dispatch('LOAD_FTP_HISTORY', ftpHistory);

      // Also store the model instance in state for dashboard access
      stateManager.dispatch('SET_USER_PROFILE_MODEL', this.currentUserModel);

      // Update power zone manager
      if (profile.ftp) {
        powerZoneManager.setFTP(profile.ftp);
      }

      // Update zone model if specified
      if (profile.preferences?.displayOptions?.zoneModel) {
        powerZoneManager.setZoneModel(
          profile.preferences.displayOptions.zoneModel
        );
      }

      this.currentProfileId = profileId;
      stateManager.dispatch('SET_PROFILE_LOADING', false);

      console.log('Profile loaded successfully:', profile.name);
    } catch (error) {
      stateManager.dispatch('SET_PROFILE_LOADING', false);
      stateManager.dispatch('SET_PROFILE_ERROR', {
        type: 'PROFILE_LOAD_ERROR',
        message: 'Failed to load profile',
        error,
      });
      throw error;
    }
  }

  /**
   * Update the current user profile
   * @param {Object} updates - Profile updates
   * @returns {Promise<void>}
   */
  async updateProfile(updates) {
    try {
      if (!this.currentProfileId) {
        throw new Error('No profile loaded');
      }

      stateManager.dispatch('SET_PROFILE_LOADING', true);

      const currentProfile = stateManager.getState('userProfile');
      const updatedProfile = {
        ...currentProfile,
        ...updates,
        id: this.currentProfileId, // Ensure ID is preserved
      };

      // Validate the updated profile
      this.validateProfileData(updatedProfile);

      // Check if FTP changed
      const ftpChanged =
        updates.ftp !== undefined && updates.ftp !== currentProfile.ftp;

      // Update UserProfileModel if it exists
      if (this.currentUserModel) {
        // Update model properties
        Object.assign(this.currentUserModel, updates);

        // Use model's updateFTP method if FTP changed
        if (ftpChanged) {
          this.currentUserModel.updateFTP(
            updates.ftp,
            'manual_update',
            'TrainingLab'
          );
        }

        // Update weight using model method if weight changed
        if (
          updates.weight !== undefined &&
          updates.weight !== currentProfile.weight
        ) {
          this.currentUserModel.updateWeight(updates.weight);
        }

        // Update model's lastActive
        this.currentUserModel.lastActive = new Date();

        // Save model data to storage
        await enhancedStorage.saveUserProfile(this.currentUserModel.toJSON());

        // Update state with model data
        stateManager.dispatch('UPDATE_USER_PROFILE', updates);
        stateManager.dispatch('SET_USER_PROFILE_MODEL', this.currentUserModel);
      } else {
        // Fallback to original behavior
        await enhancedStorage.saveUserProfile(updatedProfile);
        stateManager.dispatch('UPDATE_USER_PROFILE', updates);
      }

      // Update power zone manager if FTP or zone model changed
      if (updates.ftp !== undefined) {
        powerZoneManager.setFTP(updates.ftp);
      }

      if (updates.preferences?.displayOptions?.zoneModel) {
        powerZoneManager.setZoneModel(
          updates.preferences.displayOptions.zoneModel
        );
      }

      // Add FTP history entry if FTP changed (only if not using model)
      if (ftpChanged && !this.currentUserModel) {
        await this.addFTPEntry(updates.ftp, new Date(), 'manual_update');
      }

      stateManager.dispatch('SET_PROFILE_LOADING', false);
      console.log('Profile updated successfully');
    } catch (error) {
      stateManager.dispatch('SET_PROFILE_LOADING', false);
      stateManager.dispatch('SET_PROFILE_ERROR', {
        type: 'PROFILE_UPDATE_ERROR',
        message: 'Failed to update profile',
        error,
      });
      throw error;
    }
  }

  /**
   * Add an FTP history entry
   * @param {number} ftpValue - FTP value in watts
   * @param {Date} date - Test date
   * @param {string} source - Source of FTP data
   * @returns {Promise<void>}
   */
  async addFTPEntry(ftpValue, date = new Date(), source = 'manual') {
    try {
      if (!this.currentProfileId) {
        throw new Error('No profile loaded');
      }

      const entryId = await enhancedStorage.addFTPHistoryEntry(
        this.currentProfileId,
        ftpValue,
        date,
        source
      );

      // Add to state
      const newEntry = {
        id: entryId,
        profileId: this.currentProfileId,
        ftpValue: Math.round(ftpValue),
        date: date.toISOString(),
        source,
        dateCreated: new Date().toISOString(),
      };

      stateManager.dispatch('ADD_FTP_HISTORY_ENTRY', newEntry);

      console.log('FTP history entry added:', ftpValue);
    } catch (error) {
      console.error('Failed to add FTP history entry:', error);
      throw error;
    }
  }

  /**
   * Get current user profile
   * @returns {Object|null} Current profile or null
   */
  getCurrentProfile() {
    return stateManager.getState('userProfile');
  }

  /**
   * Get current UserProfileModel instance
   * @returns {UserProfileModel|null} Current model instance or null
   */
  getCurrentProfileModel() {
    return this.currentUserModel;
  }

  /**
   * Get dashboard metrics from UserProfileModel
   * @returns {Object|null} Dashboard metrics or null
   */
  getDashboardMetrics() {
    return this.currentUserModel
      ? this.currentUserModel.getDashboardMetrics()
      : null;
  }

  /**
   * Get FTP history for current profile
   * @returns {Array} FTP history entries
   */
  getFTPHistory() {
    return stateManager.getState('ftpHistory') || [];
  }

  /**
   * Calculate training zones based on current FTP
   * @returns {Object} Training zones
   */
  getTrainingZones() {
    const profile = this.getCurrentProfile();
    if (!profile?.ftp) {
      return powerZoneManager.getZones();
    }

    // Ensure power zone manager has current FTP
    if (powerZoneManager.getFTP() !== profile.ftp) {
      powerZoneManager.setFTP(profile.ftp);
    }

    const zones = powerZoneManager.getZones();
    const zonesInWatts = powerZoneManager.getZonesInWatts();

    return {
      zones,
      zonesInWatts,
      ftp: profile.ftp,
      model: powerZoneManager.getZoneModel(),
      statistics: powerZoneManager.getZoneStatistics(),
    };
  }

  /**
   * Export current profile data
   * @returns {Promise<Object>} Profile export data
   */
  async exportProfile() {
    try {
      if (!this.currentProfileId) {
        throw new Error('No profile loaded');
      }

      return await enhancedStorage.exportUserProfile(this.currentProfileId);
    } catch (error) {
      console.error('Failed to export profile:', error);
      throw error;
    }
  }

  /**
   * Import profile data
   * @param {Object} profileData - Profile data to import
   * @returns {Promise<string>} Imported profile ID
   */
  async importProfile(profileData) {
    try {
      stateManager.dispatch('SET_PROFILE_LOADING', true);

      const profileId = await enhancedStorage.importUserProfile(profileData);
      await this.loadProfile(profileId);

      stateManager.dispatch('SET_PROFILE_LOADING', false);
      return profileId;
    } catch (error) {
      stateManager.dispatch('SET_PROFILE_LOADING', false);
      stateManager.dispatch('SET_PROFILE_ERROR', {
        type: 'PROFILE_IMPORT_ERROR',
        message: 'Failed to import profile',
        error,
      });
      throw error;
    }
  }

  /**
   * Delete the current profile
   * @returns {Promise<void>}
   */
  async deleteProfile() {
    try {
      if (!this.currentProfileId) {
        throw new Error('No profile loaded');
      }

      stateManager.dispatch('SET_PROFILE_LOADING', true);

      await enhancedStorage.deleteUserProfile(this.currentProfileId);

      // Clear state
      stateManager.dispatch('CLEAR_USER_PROFILE');

      this.currentProfileId = null;
      stateManager.dispatch('SET_PROFILE_LOADING', false);

      console.log('Profile deleted successfully');
    } catch (error) {
      stateManager.dispatch('SET_PROFILE_LOADING', false);
      stateManager.dispatch('SET_PROFILE_ERROR', {
        type: 'PROFILE_DELETE_ERROR',
        message: 'Failed to delete profile',
        error,
      });
      throw error;
    }
  }

  /**
   * Update profile photo
   * @param {File} file - Image file
   * @returns {Promise<void>}
   */
  async updateProfilePhoto(file) {
    try {
      if (!file) {
        throw new Error('No file provided');
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image');
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('Image file too large (max 5MB)');
      }

      // Convert to base64
      const base64 = await this.fileToBase64(file);

      // Update profile
      await this.updateProfile({
        profilePhoto: base64,
      });

      console.log('Profile photo updated');
    } catch (error) {
      console.error('Failed to update profile photo:', error);
      throw error;
    }
  }

  /**
   * Validate profile data
   * @private
   * @param {Object} profileData - Profile data to validate
   * @throws {Error} If validation fails
   */
  validateProfileData(profileData) {
    if (profileData.email && !this.isValidEmail(profileData.email)) {
      throw new Error('Invalid email address');
    }

    if (profileData.ftp && (profileData.ftp < 50 || profileData.ftp > 600)) {
      throw new Error('FTP must be between 50 and 600 watts');
    }

    if (
      profileData.weight &&
      (profileData.weight < 30 || profileData.weight > 200)
    ) {
      throw new Error('Weight must be between 30 and 200 kg');
    }

    if (profileData.age && (profileData.age < 10 || profileData.age > 100)) {
      throw new Error('Age must be between 10 and 100 years');
    }
  }

  /**
   * Validate email address
   * @private
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Convert file to base64
   * @private
   * @param {File} file - File to convert
   * @returns {Promise<string>} Base64 string
   */
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Get profile loading state
   * @returns {boolean} True if loading
   */
  isLoading() {
    return stateManager.getState('profileLoading') || false;
  }

  /**
   * Get profile error
   * @returns {Object|null} Error object or null
   */
  getError() {
    return stateManager.getState('profileError');
  }

  /**
   * Clear profile error
   */
  clearError() {
    stateManager.dispatch('SET_PROFILE_ERROR', null);
  }

  // === TRAINING GOALS MANAGEMENT ===

  /**
   * Save a training goal
   * @param {Object} goalData - Goal data
   * @returns {Promise<string>} Goal ID
   */
  async saveTrainingGoal(goalData) {
    try {
      if (!this.currentProfileId) {
        throw new Error('No profile loaded');
      }

      // Add user ID to goal data
      const goalWithUserId = {
        ...goalData,
        userId: this.currentProfileId,
      };

      const goalId = await enhancedStorage.saveTrainingGoal(goalWithUserId);
      
      // Update state if needed
      stateManager.dispatch('ADD_TRAINING_GOAL', { ...goalWithUserId, id: goalId });

      console.log('Training goal saved:', goalId);
      return goalId;
    } catch (error) {
      console.error('Failed to save training goal:', error);
      throw error;
    }
  }

  /**
   * Get training goals for the current profile
   * @param {Object} filter - Optional filter
   * @returns {Promise<Array>} Training goals
   */
  async getTrainingGoals(filter = {}) {
    try {
      if (!this.currentProfileId) {
        return [];
      }

      const goals = await enhancedStorage.getTrainingGoals({
        userId: this.currentProfileId,
        ...filter,
      });

      return goals;
    } catch (error) {
      console.error('Failed to get training goals:', error);
      throw error;
    }
  }

  /**
   * Get active training goals for the current profile
   * @returns {Promise<Array>} Active goals
   */
  async getActiveTrainingGoals() {
    return await this.getTrainingGoals({ status: 'active' });
  }

  /**
   * Get completed training goals for the current profile
   * @returns {Promise<Array>} Completed goals
   */
  async getCompletedTrainingGoals() {
    return await this.getTrainingGoals({ status: 'completed' });
  }

  /**
   * Update a training goal
   * @param {string} goalId - Goal ID
   * @param {Object} updates - Goal updates
   * @returns {Promise<void>}
   */
  async updateTrainingGoal(goalId, updates) {
    try {
      await enhancedStorage.updateTrainingGoal(goalId, updates);
      
      // Update state if needed
      stateManager.dispatch('UPDATE_TRAINING_GOAL', { id: goalId, ...updates });

      console.log('Training goal updated:', goalId);
    } catch (error) {
      console.error('Failed to update training goal:', error);
      throw error;
    }
  }

  /**
   * Delete a training goal
   * @param {string} goalId - Goal ID
   * @returns {Promise<void>}
   */
  async deleteTrainingGoal(goalId) {
    try {
      await enhancedStorage.deleteTrainingGoal(goalId);
      
      // Update state if needed
      stateManager.dispatch('REMOVE_TRAINING_GOAL', goalId);

      console.log('Training goal deleted:', goalId);
    } catch (error) {
      console.error('Failed to delete training goal:', error);
      throw error;
    }
  }

  /**
   * Update goal progress based on workout or profile data
   * @param {string} goalId - Goal ID
   * @param {Object} progressData - Progress data
   * @returns {Promise<void>}
   */
  async updateGoalProgress(goalId, progressData) {
    try {
      const goal = await enhancedStorage.getTrainingGoal(goalId);
      if (!goal) {
        throw new Error('Goal not found');
      }

      // Calculate new progress based on goal type and progress data
      let updatedGoal = { ...goal };
      
      // Update progress based on goal type
      switch (goal.type) {
        case 'ftp':
          if (progressData.ftp) {
            updatedGoal.currentValue = Math.max(goal.currentValue || goal.initialValue || 0, progressData.ftp);
            updatedGoal.progress = Math.min(100, ((updatedGoal.currentValue - (goal.initialValue || 0)) / (goal.targetValue - (goal.initialValue || 0))) * 100);
          }
          break;
        case 'weight':
          if (progressData.weight) {
            updatedGoal.currentValue = progressData.weight;
            // For weight goals, calculate progress differently based on goal direction
            const initialWeight = goal.initialValue || goal.currentValue || progressData.weight;
            const targetWeight = goal.targetValue;
            const currentWeight = progressData.weight;
            
            if (targetWeight > initialWeight) {
              // Weight gain goal
              updatedGoal.progress = Math.min(100, ((currentWeight - initialWeight) / (targetWeight - initialWeight)) * 100);
            } else {
              // Weight loss goal
              updatedGoal.progress = Math.min(100, ((initialWeight - currentWeight) / (initialWeight - targetWeight)) * 100);
            }
          }
          break;
        case 'volume':
          if (progressData.duration) {
            // Add duration to accumulated volume (convert minutes to hours)
            updatedGoal.currentValue = (goal.currentValue || 0) + (progressData.duration / 60);
            updatedGoal.progress = Math.min(100, (updatedGoal.currentValue / goal.targetValue) * 100);
          }
          break;
        case 'custom':
          if (progressData.customProgress !== undefined) {
            updatedGoal.progress = Math.min(100, Math.max(0, progressData.customProgress));
          }
          break;
      }

      // Check if goal is completed
      if (updatedGoal.progress >= 100 && goal.status === 'active') {
        updatedGoal.status = 'completed';
        updatedGoal.completedDate = new Date().toISOString();
      }

      // Update the goal
      await this.updateTrainingGoal(goalId, updatedGoal);

      return updatedGoal;
    } catch (error) {
      console.error('Failed to update goal progress:', error);
      throw error;
    }
  }

  /**
   * Get user preferences from localStorage
   * @returns {Object} Preferences object
   */
  getPreferences() {
    try {
      const preferences = JSON.parse(
        localStorage.getItem('workout-visualizer-preferences') || '{}'
      );

      // Return default preferences merged with stored ones
      return {
        theme: 'light',
        units: 'metric',
        powerDisplay: 'watts',
        profileId: null,
        ...preferences,
      };
    } catch (error) {
      console.warn('Failed to load preferences, using defaults:', error);
      return {
        theme: 'light',
        units: 'metric',
        powerDisplay: 'watts',
        profileId: null,
      };
    }
  }

  /**
   * Save user preferences to localStorage
   * @param {Object} preferences - Preferences to save
   */
  savePreferences(preferences) {
    try {
      const currentPrefs = this.getPreferences();
      const updatedPrefs = { ...currentPrefs, ...preferences };
      localStorage.setItem(
        'workout-visualizer-preferences',
        JSON.stringify(updatedPrefs)
      );
      return true;
    } catch (error) {
      console.error('Failed to save preferences:', error);
      return false;
    }
  }
}

// Create singleton instance
export const profileService = new ProfileService();

// Make globally accessible for debugging
if (typeof window !== 'undefined') {
  window.profileService = profileService;
}
