/**
 * Activity Service
 * Comprehensive service for managing training activities, training load calculation,
 * and performance analytics as outlined in issue #111
 */

import { ActivityModel } from '../models/ActivityModel.js';
import { TrainingLoadModel, TrainingLoadCalculator } from '../models/TrainingLoadModel.js';
import { enhancedStorage } from './storage/enhanced-storage.js';
import { profileService } from './profile-service.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('ActivityService');

export class ActivityService {
  constructor() {
    this.initialized = false;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Initialize the activity service
   */
  async initialize() {
    try {
      logger.info('Initializing Activity Service...');
      
      // Initialize enhanced storage
      if (!enhancedStorage.db) {
        await enhancedStorage.initialize();
      }
      
      // Initialize profile service if needed
      if (!profileService.initialized) {
        await profileService.initialize();
      }
      
      this.initialized = true;
      logger.info('Activity Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Activity Service:', error);
      throw error;
    }
  }

  /**
   * Save a new activity
   */
  async saveActivity(activityData) {
    if (!this.initialized) await this.initialize();
    
    try {
      // Create activity model
      const activity = new ActivityModel(activityData);
      
      // Get user profile for TSS calculations
      const profile = await profileService.getCurrentProfile();
      const ftp = profile?.ftp || 250;
      
      // Calculate missing metrics
      if (!activity.tss) {
        activity.tss = activity.calculateTSS(ftp);
      }
      
      if (!activity.intensityFactor) {
        activity.intensityFactor = activity.calculateIF(ftp);
      }
      
      if (!activity.normalizedPower) {
        activity.normalizedPower = activity.calculateNormalizedPower();
      }
      
      // Validate activity
      const errors = activity.validate();
      if (errors.length > 0) {
        throw new Error(`Activity validation failed: ${errors.join(', ')}`);
      }
      
      // Save to storage
      const activityId = await enhancedStorage.saveActivity(activity.toJSON());
      
      // Update training load
      await this.updateTrainingLoad(activity.date, activity.userId);
      
      // Clear cache
      this.clearCache();
      
      logger.info(`Activity saved: ${activity.name} (${activityId})`);
      return activityId;
    } catch (error) {
      logger.error('Failed to save activity:', error);
      throw error;
    }
  }

  /**
   * Get activity by ID
   */
  async getActivity(activityId) {
    if (!this.initialized) await this.initialize();
    
    try {
      // Check cache first
      const cached = this.getFromCache(`activity_${activityId}`);
      if (cached) return cached;
      
      const activityData = await enhancedStorage.get('activities', activityId);
      if (!activityData) return null;
      
      const activity = ActivityModel.fromJSON(activityData);
      
      // Cache the result
      this.setCache(`activity_${activityId}`, activity);
      
      return activity;
    } catch (error) {
      logger.error('Failed to get activity:', error);
      throw error;
    }
  }

  /**
   * Get activities with filtering and pagination
   */
  async getActivities(filter = {}) {
    if (!this.initialized) await this.initialize();
    
    try {
      // Add user filter if not specified
      const profile = await profileService.getCurrentProfile();
      if (profile && !filter.userId) {
        filter.userId = profile.id;
      }
      
      const activitiesData = await enhancedStorage.getActivities(filter);
      
      return activitiesData.map(data => ActivityModel.fromJSON(data));
    } catch (error) {
      logger.error('Failed to get activities:', error);
      throw error;
    }
  }

  /**
   * Update an activity
   */
  async updateActivity(activityId, updates) {
    if (!this.initialized) await this.initialize();
    
    try {
      const existingActivity = await this.getActivity(activityId);
      if (!existingActivity) {
        throw new Error('Activity not found');
      }
      
      // Update the activity
      existingActivity.update(updates);
      
      // Recalculate metrics if power data changed
      if (updates.avgPower || updates.normalizedPower || updates.duration) {
        const profile = await profileService.getCurrentProfile();
        const ftp = profile?.ftp || 250;
        
        existingActivity.tss = existingActivity.calculateTSS(ftp);
        existingActivity.intensityFactor = existingActivity.calculateIF(ftp);
      }
      
      // Validate updated activity
      const errors = existingActivity.validate();
      if (errors.length > 0) {
        throw new Error(`Activity validation failed: ${errors.join(', ')}`);
      }
      
      // Save to storage
      await enhancedStorage.saveActivity(existingActivity.toJSON());
      
      // Update training load for the date
      await this.updateTrainingLoad(existingActivity.date, existingActivity.userId);
      
      // Clear cache
      this.clearCache();
      
      logger.info(`Activity updated: ${activityId}`);
    } catch (error) {
      logger.error('Failed to update activity:', error);
      throw error;
    }
  }

  /**
   * Delete an activity
   */
  async deleteActivity(activityId) {
    if (!this.initialized) await this.initialize();
    
    try {
      const activity = await this.getActivity(activityId);
      if (!activity) {
        throw new Error('Activity not found');
      }
      
      // Delete from storage
      await enhancedStorage.deleteFromStore('activities', activityId);
      
      // Update training load for the date
      await this.updateTrainingLoad(activity.date, activity.userId);
      
      // Clear cache
      this.clearCache();
      
      logger.info(`Activity deleted: ${activityId}`);
    } catch (error) {
      logger.error('Failed to delete activity:', error);
      throw error;
    }
  }

  /**
   * Import activity from file data
   */
  async importActivityFromFile(fileData, filename) {
    try {
      // Create activity from file data
      const activity = ActivityModel.fromFileData(fileData, filename);
      
      // Set user ID
      const profile = await profileService.getCurrentProfile();
      if (profile) {
        activity.userId = profile.id;
      }
      
      // Save the activity
      return await this.saveActivity(activity.toJSON());
    } catch (error) {
      logger.error('Failed to import activity from file:', error);
      throw error;
    }
  }

  /**
   * Get activities for a specific date range
   */
  async getActivitiesInDateRange(startDate, endDate, userId = null) {
    if (!this.initialized) await this.initialize();
    
    try {
      const profile = await profileService.getCurrentProfile();
      const effectiveUserId = userId || profile?.id;
      
      const filter = {
        userId: effectiveUserId,
        startDate: startDate,
        endDate: endDate,
        limit: 1000, // Large limit for date ranges
        sortBy: 'date',
        sortOrder: 'asc'
      };
      
      return await this.getActivities(filter);
    } catch (error) {
      logger.error('Failed to get activities in date range:', error);
      throw error;
    }
  }

  /**
   * Calculate and update training load for a specific date
   */
  async updateTrainingLoad(date, userId = null) {
    if (!this.initialized) await this.initialize();
    
    try {
      const profile = await profileService.getCurrentProfile();
      const effectiveUserId = userId || profile?.id;
      
      const dateStr = new Date(date).toISOString().split('T')[0];
      
      // Get activities for the date
      const startDate = `${dateStr}T00:00:00.000Z`;
      const endDate = `${dateStr}T23:59:59.999Z`;
      
      const activities = await this.getActivitiesInDateRange(
        startDate, endDate, effectiveUserId
      );
      
      // Calculate daily TSS
      const dailyTSS = activities.reduce((sum, activity) => sum + (activity.tss || 0), 0);
      
      // Get previous training load (day before)
      const previousDate = new Date(date);
      previousDate.setDate(previousDate.getDate() - 1);
      const previousTrainingLoad = await this.getTrainingLoad(
        previousDate.toISOString().split('T')[0], effectiveUserId
      );
      
      // Create or update training load
      const trainingLoad = new TrainingLoadModel({
        userId: effectiveUserId,
        date: dateStr,
        dailyTSS: dailyTSS
      });
      
      // Calculate ATL, CTL, TSB
      trainingLoad.updateWithActivity({ tss: dailyTSS }, previousTrainingLoad);
      
      // Calculate additional metrics
      const weeklyActivities = await this.getActivitiesInDateRange(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        new Date(date).toISOString(),
        effectiveUserId
      );
      
      trainingLoad.weeklyTSS = weeklyActivities.reduce(
        (sum, activity) => sum + (activity.tss || 0), 0
      );
      
      // Analyze patterns and generate recommendations
      trainingLoad.analyzeTrainingPatterns();
      
      // Save training load
      await enhancedStorage.saveTrainingMetrics(trainingLoad.toJSON());
      
      logger.info(`Training load updated for ${dateStr}: TSS=${dailyTSS}, ATL=${trainingLoad.atl.toFixed(1)}, CTL=${trainingLoad.ctl.toFixed(1)}`);
    } catch (error) {
      logger.error('Failed to update training load:', error);
      throw error;
    }
  }

  /**
   * Get training load for a specific date
   */
  async getTrainingLoad(date, userId = null) {
    if (!this.initialized) await this.initialize();
    
    try {
      const profile = await profileService.getCurrentProfile();
      const effectiveUserId = userId || profile?.id;
      
      const dateStr = new Date(date).toISOString().split('T')[0];
      
      const trainingMetrics = await enhancedStorage.getTrainingMetrics({
        userId: effectiveUserId,
        date: dateStr
      });
      
      if (trainingMetrics.length === 0) return null;
      
      return TrainingLoadModel.fromJSON(trainingMetrics[0]);
    } catch (error) {
      logger.error('Failed to get training load:', error);
      throw error;
    }
  }

  /**
   * Get training load series for chart data
   */
  async getTrainingLoadSeries(startDate, endDate, userId = null) {
    if (!this.initialized) await this.initialize();
    
    try {
      const profile = await profileService.getCurrentProfile();
      const effectiveUserId = userId || profile?.id;
      
      // Get all activities in the date range
      const activities = await this.getActivitiesInDateRange(startDate, endDate, effectiveUserId);
      
      // Calculate training load series
      const trainingLoadSeries = TrainingLoadCalculator.calculateTrainingLoadSeries(
        activities.map(a => a.toJSON()), startDate, endDate
      );
      
      return trainingLoadSeries;
    } catch (error) {
      logger.error('Failed to get training load series:', error);
      throw error;
    }
  }

  /**
   * Get performance trends
   */
  async getPerformanceTrends(startDate, endDate, userId = null) {
    if (!this.initialized) await this.initialize();
    
    try {
      const trainingLoadSeries = await this.getTrainingLoadSeries(startDate, endDate, userId);
      const trends = TrainingLoadCalculator.calculatePerformanceTrends(trainingLoadSeries);
      
      return trends;
    } catch (error) {
      logger.error('Failed to get performance trends:', error);
      throw error;
    }
  }

  /**
   * Get activity statistics
   */
  async getActivityStats(userId = null) {
    if (!this.initialized) await this.initialize();
    
    try {
      const profile = await profileService.getCurrentProfile();
      const effectiveUserId = userId || profile?.id;
      
      const activities = await this.getActivities({ userId: effectiveUserId, limit: 1000 });
      
      const stats = {
        totalActivities: activities.length,
        totalDuration: activities.reduce((sum, a) => sum + a.duration, 0),
        totalDistance: activities.reduce((sum, a) => sum + (a.distance || 0), 0),
        totalTSS: activities.reduce((sum, a) => sum + (a.tss || 0), 0),
        avgTSS: 0,
        avgDuration: 0,
        avgDistance: 0,
        byType: {},
        recentActivities: activities.slice(0, 10)
      };
      
      if (activities.length > 0) {
        stats.avgTSS = stats.totalTSS / activities.length;
        stats.avgDuration = stats.totalDuration / activities.length;
        stats.avgDistance = stats.totalDistance / activities.length;
      }
      
      // Group by activity type
      activities.forEach(activity => {
        const type = activity.type || 'workout';
        if (!stats.byType[type]) {
          stats.byType[type] = {
            count: 0,
            totalDuration: 0,
            totalDistance: 0,
            totalTSS: 0
          };
        }
        
        stats.byType[type].count++;
        stats.byType[type].totalDuration += activity.duration;
        stats.byType[type].totalDistance += activity.distance || 0;
        stats.byType[type].totalTSS += activity.tss || 0;
      });
      
      return stats;
    } catch (error) {
      logger.error('Failed to get activity stats:', error);
      throw error;
    }
  }

  /**
   * Export activities to JSON
   */
  async exportActivities(userId = null) {
    if (!this.initialized) await this.initialize();
    
    try {
      const profile = await profileService.getCurrentProfile();
      const effectiveUserId = userId || profile?.id;
      
      const activities = await this.getActivities({ userId: effectiveUserId, limit: 10000 });
      const trainingLoadSeries = await this.getTrainingLoadSeries(
        activities[activities.length - 1]?.date || new Date().toISOString(),
        new Date().toISOString(),
        effectiveUserId
      );
      
      return {
        exportDate: new Date().toISOString(),
        userId: effectiveUserId,
        activities: activities.map(a => a.toJSON()),
        trainingLoad: trainingLoadSeries.map(tl => tl.toJSON()),
        stats: await this.getActivityStats(effectiveUserId)
      };
    } catch (error) {
      logger.error('Failed to export activities:', error);
      throw error;
    }
  }

  /**
   * Import activities from JSON
   */
  async importActivities(exportData) {
    if (!this.initialized) await this.initialize();
    
    try {
      const { activities, trainingLoad } = exportData;
      
      // Import activities
      for (const activityData of activities) {
        try {
          await this.saveActivity(activityData);
        } catch (error) {
          logger.warn(`Failed to import activity ${activityData.id}:`, error);
        }
      }
      
      // Import training load data if available
      if (trainingLoad && trainingLoad.length > 0) {
        for (const tlData of trainingLoad) {
          try {
            await enhancedStorage.saveTrainingMetrics(tlData);
          } catch (error) {
            logger.warn(`Failed to import training load for ${tlData.date}:`, error);
          }
        }
      }
      
      // Clear cache
      this.clearCache();
      
      logger.info(`Imported ${activities.length} activities and ${trainingLoad?.length || 0} training load entries`);
    } catch (error) {
      logger.error('Failed to import activities:', error);
      throw error;
    }
  }

  /**
   * Cache management
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      cacheSize: this.cache.size,
      storageConnected: !!enhancedStorage.db
    };
  }
}

// Create singleton instance
export const activityService = new ActivityService();

// Make globally accessible for debugging
if (typeof window !== 'undefined') {
  window.activityService = activityService;
}

export default activityService;