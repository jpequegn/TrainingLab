/**
 * Goal Progress Service
 * Calculates and updates training goal progress based on workout data and metrics
 * Provides progress analytics and milestone tracking
 */

import { createLogger } from '../utils/logger.js';
import { TrainingGoal, GOAL_TYPES } from '../models/TrainingGoal.js';

const logger = createLogger('GoalProgressService');

export class GoalProgressService {
  constructor(profileService = null, storageService = null) {
    this.profileService = profileService;
    this.storageService = storageService;
    this.progressCalculators = new Map();
    this.milestoneCallbacks = new Map();
    
    this.setupProgressCalculators();
    logger.info('GoalProgressService initialized');
  }

  /**
   * Setup progress calculators for different goal types
   */
  setupProgressCalculators() {
    // FTP Goal Calculator
    this.progressCalculators.set(GOAL_TYPES.FTP, (goal, data) => {
      if (!data.ftp) return goal.currentValue;
      
      // Update current FTP value from profile or workout data
      const newCurrentValue = Math.max(goal.currentValue, data.ftp);
      return newCurrentValue;
    });

    // Volume Goal Calculator (weekly/monthly training hours)
    this.progressCalculators.set(GOAL_TYPES.VOLUME, (goal, data) => {
      if (!data.duration) return goal.currentValue;
      
      const currentDate = new Date();
      const goalStartDate = goal.createdDate;
      const targetDate = goal.targetDate;
      
      // Calculate accumulated training time based on goal period
      const periodType = this.determineVolumePeriod(goalStartDate, targetDate);
      const accumulatedHours = this.calculateAccumulatedVolume(goal, data, periodType);
      
      return accumulatedHours;
    });

    // Event Goal Calculator (based on completion date)
    this.progressCalculators.set(GOAL_TYPES.EVENT, (goal, data) => {
      const currentDate = new Date();
      const targetDate = new Date(goal.targetDate);
      const startDate = new Date(goal.createdDate);
      
      // Calculate progress based on time elapsed vs time remaining
      const totalTime = targetDate - startDate;
      const elapsedTime = currentDate - startDate;
      const timeProgress = Math.max(0, Math.min(100, (elapsedTime / totalTime) * 100));
      
      // Factor in readiness indicators from workout data
      if (data.readinessScore) {
        // Combine time progress with readiness score
        return (timeProgress * 0.6) + (data.readinessScore * 0.4);
      }
      
      return timeProgress;
    });

    // Weight Goal Calculator
    this.progressCalculators.set(GOAL_TYPES.WEIGHT, (goal, data) => {
      if (!data.weight) return goal.currentValue;
      
      // Use the most recent weight measurement
      return data.weight;
    });

    // Custom Goal Calculator (user-defined progress)
    this.progressCalculators.set(GOAL_TYPES.CUSTOM, (goal, data) => {
      // For custom goals, rely on manual progress updates
      // Can be extended based on custom calculation rules
      return data.customProgress || goal.currentValue;
    });

    logger.info('Progress calculators setup complete');
  }

  /**
   * Update goal progress based on new workout or profile data
   * @param {TrainingGoal} goal - The goal to update
   * @param {Object} data - New data (workout metrics, profile updates, etc.)
   * @returns {Object} Progress update result
   */
  async updateGoalProgress(goal, data) {
    try {
      if (!goal || goal.status === 'completed' || goal.status === 'paused') {
        return { updated: false, reason: 'Goal not eligible for update' };
      }

      const calculator = this.progressCalculators.get(goal.type);
      if (!calculator) {
        logger.warn(`No progress calculator found for goal type: ${goal.type}`);
        return { updated: false, reason: 'No calculator available' };
      }

      // Calculate new current value
      const newCurrentValue = calculator(goal, data);
      const previousValue = goal.currentValue;
      const previousProgress = goal.progress;

      // Update goal progress
      const updateResult = goal.updateProgress(newCurrentValue);
      
      if (updateResult.progressChanged) {
        // Check for milestone achievements
        const milestones = this.checkMilestones(goal, previousProgress, goal.progress);
        
        // Check for goal completion
        if (goal.status === 'completed' && goal.status !== 'completed') {
          milestones.push({
            type: 'completion',
            message: `Goal "${goal.name}" completed!`,
            timestamp: new Date()
          });
        }

        // Trigger milestone callbacks
        await this.processMilestones(goal, milestones);

        // Calculate progress analytics
        const analytics = this.calculateProgressAnalytics(goal, data);

        logger.info(`Goal progress updated: ${goal.name} (${previousProgress}% -> ${goal.progress}%)`);

        return {
          updated: true,
          previousValue,
          newValue: newCurrentValue,
          previousProgress,
          newProgress: goal.progress,
          milestones,
          analytics,
          goal
        };
      }

      return { updated: false, reason: 'No progress change' };

    } catch (error) {
      logger.error('Failed to update goal progress:', error);
      throw new Error(`Goal progress update failed: ${error.message}`);
    }
  }

  /**
   * Update progress for multiple goals based on workout data
   * @param {Array<TrainingGoal>} goals - Goals to update
   * @param {Object} workoutData - Workout metrics
   * @returns {Array} Update results for each goal
   */
  async updateGoalsFromWorkout(goals, workoutData) {
    const results = [];
    
    for (const goal of goals) {
      if (goal.status === 'active') {
        try {
          const result = await this.updateGoalProgress(goal, {
            ...workoutData,
            timestamp: new Date()
          });
          results.push({ goalId: goal.id, ...result });
        } catch (error) {
          logger.error(`Failed to update goal ${goal.id}:`, error);
          results.push({
            goalId: goal.id,
            updated: false,
            error: error.message
          });
        }
      }
    }

    return results;
  }

  /**
   * Update progress for multiple goals based on profile changes
   * @param {Array<TrainingGoal>} goals - Goals to update
   * @param {Object} profileData - Profile changes (FTP, weight, etc.)
   * @returns {Array} Update results for each goal
   */
  async updateGoalsFromProfile(goals, profileData) {
    const results = [];
    
    for (const goal of goals) {
      if (goal.status === 'active') {
        try {
          const result = await this.updateGoalProgress(goal, {
            ...profileData,
            timestamp: new Date()
          });
          results.push({ goalId: goal.id, ...result });
        } catch (error) {
          logger.error(`Failed to update goal ${goal.id}:`, error);
          results.push({
            goalId: goal.id,
            updated: false,
            error: error.message
          });
        }
      }
    }

    return results;
  }

  /**
   * Check for milestone achievements
   * @param {TrainingGoal} goal - The goal to check
   * @param {number} previousProgress - Previous progress percentage
   * @param {number} currentProgress - Current progress percentage
   * @returns {Array} Achieved milestones
   */
  checkMilestones(goal, previousProgress, currentProgress) {
    const milestones = [];
    const milestoneThresholds = [25, 50, 75, 90, 100];

    for (const threshold of milestoneThresholds) {
      if (previousProgress < threshold && currentProgress >= threshold) {
        milestones.push({
          type: 'progress',
          threshold,
          message: `${threshold}% progress achieved on goal "${goal.name}"`,
          timestamp: new Date(),
          goalId: goal.id
        });
      }
    }

    return milestones;
  }

  /**
   * Process and trigger milestone callbacks
   * @param {TrainingGoal} goal - The goal
   * @param {Array} milestones - Achieved milestones
   */
  async processMilestones(goal, milestones) {
    for (const milestone of milestones) {
      // Trigger registered callbacks
      const callbacks = this.milestoneCallbacks.get(milestone.type) || [];
      for (const callback of callbacks) {
        try {
          await callback(milestone, goal);
        } catch (error) {
          logger.error('Milestone callback failed:', error);
        }
      }

      // Log milestone achievement
      logger.info(`Milestone achieved: ${milestone.message}`);
    }
  }

  /**
   * Calculate progress analytics for a goal
   * @param {TrainingGoal} goal - The goal
   * @param {Object} data - Latest data
   * @returns {Object} Analytics data
   */
  calculateProgressAnalytics(goal, data) {
    const now = new Date();
    const startDate = new Date(goal.createdDate);
    const targetDate = new Date(goal.targetDate);
    
    // Time analytics
    const totalDuration = targetDate - startDate;
    const elapsedTime = now - startDate;
    const remainingTime = targetDate - now;
    const timeProgress = (elapsedTime / totalDuration) * 100;

    // Progress rate calculation
    const progressRate = goal.progress / Math.max(1, elapsedTime / (24 * 60 * 60 * 1000)); // Progress per day
    
    // Estimated completion date
    const remainingProgress = 100 - goal.progress;
    const estimatedDaysToComplete = remainingProgress / Math.max(0.1, progressRate);
    const estimatedCompletionDate = new Date(now.getTime() + (estimatedDaysToComplete * 24 * 60 * 60 * 1000));

    // Status assessment
    let status = 'on_track';
    if (goal.progress < timeProgress - 10) {
      status = 'behind_schedule';
    } else if (goal.progress > timeProgress + 10) {
      status = 'ahead_of_schedule';
    }

    return {
      timeProgress: Math.round(timeProgress * 10) / 10,
      progressRate: Math.round(progressRate * 100) / 100,
      estimatedCompletionDate,
      daysRemaining: Math.max(0, Math.ceil(remainingTime / (24 * 60 * 60 * 1000))),
      estimatedDaysToComplete: Math.ceil(estimatedDaysToComplete),
      status,
      onTrack: status === 'on_track',
      calculatedAt: now
    };
  }

  /**
   * Get comprehensive progress report for a goal
   * @param {TrainingGoal} goal - The goal
   * @returns {Object} Comprehensive progress report
   */
  getProgressReport(goal) {
    const analytics = this.calculateProgressAnalytics(goal, {});
    
    return {
      goal: {
        id: goal.id,
        name: goal.name,
        type: goal.type,
        status: goal.status
      },
      progress: {
        current: goal.progress,
        currentValue: goal.currentValue,
        targetValue: goal.targetValue,
        unit: goal.unit
      },
      timeline: {
        startDate: goal.createdDate,
        targetDate: goal.targetDate,
        estimatedCompletionDate: analytics.estimatedCompletionDate,
        daysRemaining: analytics.daysRemaining
      },
      analytics: {
        ...analytics,
        milestones: goal.milestones,
        progressHistory: goal.progressHistory
      }
    };
  }

  /**
   * Register a callback for milestone events
   * @param {string} milestoneType - Type of milestone (progress, completion, etc.)
   * @param {Function} callback - Callback function
   */
  registerMilestoneCallback(milestoneType, callback) {
    if (!this.milestoneCallbacks.has(milestoneType)) {
      this.milestoneCallbacks.set(milestoneType, []);
    }
    this.milestoneCallbacks.get(milestoneType).push(callback);
    logger.info(`Registered milestone callback for type: ${milestoneType}`);
  }

  /**
   * Determine volume period type (weekly, monthly, etc.)
   * @param {Date} startDate - Goal start date
   * @param {Date} endDate - Goal end date
   * @returns {string} Period type
   */
  determineVolumePeriod(startDate, endDate) {
    const duration = endDate - startDate;
    const weeks = duration / (7 * 24 * 60 * 60 * 1000);
    
    if (weeks <= 2) return 'weekly';
    if (weeks <= 8) return 'monthly';
    return 'yearly';
  }

  /**
   * Calculate accumulated volume for volume-based goals
   * @param {TrainingGoal} goal - Volume goal
   * @param {Object} data - Workout data
   * @param {string} periodType - Period type
   * @returns {number} Accumulated volume
   */
  calculateAccumulatedVolume(goal, data, periodType) {
    // This would integrate with workout history data
    // For now, return cumulative training time based on data.duration
    const currentAccumulation = goal.currentValue || 0;
    const sessionDuration = (data.duration || 0) / 60; // Convert to hours
    
    return currentAccumulation + sessionDuration;
  }

  /**
   * Bulk update multiple goals
   * @param {Array<TrainingGoal>} goals - Goals to update
   * @param {Object} data - Update data
   * @returns {Object} Bulk update results
   */
  async bulkUpdateGoals(goals, data) {
    const results = {
      updated: [],
      failed: [],
      milestones: [],
      summary: {
        total: goals.length,
        updated: 0,
        failed: 0,
        milestonesAchieved: 0
      }
    };

    for (const goal of goals) {
      try {
        const result = await this.updateGoalProgress(goal, data);
        
        if (result.updated) {
          results.updated.push(result);
          results.summary.updated++;
          
          if (result.milestones && result.milestones.length > 0) {
            results.milestones.push(...result.milestones);
            results.summary.milestonesAchieved += result.milestones.length;
          }
        }
      } catch (error) {
        results.failed.push({
          goalId: goal.id,
          error: error.message
        });
        results.summary.failed++;
      }
    }

    logger.info(`Bulk update complete: ${results.summary.updated} updated, ${results.summary.failed} failed`);
    return results;
  }
}

// Export singleton instance
export const goalProgressService = new GoalProgressService();

export default goalProgressService;