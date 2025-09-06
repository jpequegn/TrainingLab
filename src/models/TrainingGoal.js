/**
 * TrainingGoal Model
 *
 * Represents different types of training goals with progress tracking
 * and validation capabilities.
 *
 * Supported Goal Types:
 * - ftp: FTP improvement goals (current FTP → target FTP by date)
 * - volume: Training volume goals (weekly/monthly hours or TSS targets)
 * - event: Event preparation goals (race/event specific targets)
 * - weight: Weight management goals (current → target weight)
 * - custom: User-defined custom goals
 */

// Goal type definitions and validation rules
export const GOAL_TYPES = {
  FTP: 'ftp',
  VOLUME: 'volume',
  EVENT: 'event',
  WEIGHT: 'weight',
  CUSTOM: 'custom',
};

export const GOAL_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  PAUSED: 'paused',
  EXPIRED: 'expired',
};

export const VOLUME_TYPES = {
  WEEKLY_HOURS: 'weekly_hours',
  MONTHLY_HOURS: 'monthly_hours',
  WEEKLY_TSS: 'weekly_tss',
  MONTHLY_TSS: 'monthly_tss',
};

export class TrainingGoal {
  constructor(data = {}) {
    // Core properties
    this.id = data.id || this._generateId();
    this.type = data.type || GOAL_TYPES.CUSTOM;
    this.title = data.title || '';
    this.description = data.description || '';
    this.status = data.status || GOAL_STATUS.ACTIVE;

    // Date tracking
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.startDate = data.startDate ? new Date(data.startDate) : new Date();
    this.targetDate = data.targetDate
      ? new Date(data.targetDate)
      : this._getDefaultTargetDate();
    this.completedAt = data.completedAt ? new Date(data.completedAt) : null;

    // Goal-specific properties
    this.currentValue = data.currentValue || 0;
    this.targetValue = data.targetValue || 0;
    this.unit = data.unit || '';

    // Progress tracking
    this.progress = data.progress || 0; // Percentage (0-100)
    this.milestones = data.milestones || [];

    // Type-specific configuration
    this.config = data.config || this._getDefaultConfig();

    // Metadata
    this.priority = data.priority || 'medium'; // low, medium, high
    this.isPublic = data.isPublic !== undefined ? data.isPublic : false;
    this.tags = data.tags || [];

    // Validation
    this._validate();
  }

  /**
   * Generate a unique ID for the goal
   * @private
   * @returns {string} Unique goal ID
   */
  _generateId() {
    return `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get default target date (3 months from now)
   * @private
   * @returns {Date} Default target date
   */
  _getDefaultTargetDate() {
    const date = new Date();
    date.setMonth(date.getMonth() + 3);
    return date;
  }

  /**
   * Get default configuration based on goal type
   * @private
   * @returns {Object} Default configuration
   */
  _getDefaultConfig() {
    switch (this.type) {
      case GOAL_TYPES.FTP:
        return {
          startingFTP: this.currentValue,
          targetFTP: this.targetValue,
          testProtocol: '20min', // 20min, 8min, ramp
          autoUpdate: true,
        };

      case GOAL_TYPES.VOLUME:
        return {
          volumeType: VOLUME_TYPES.WEEKLY_HOURS,
          trackingPeriod: 'weekly', // weekly, monthly
          includeRest: false,
          minIntensity: null,
        };

      case GOAL_TYPES.EVENT:
        return {
          eventName: '',
          eventType: 'race', // race, century, gran_fondo
          eventDistance: 0,
          targetPower: this.targetValue,
          targetTime: null,
          preparationWeeks: 12,
        };

      case GOAL_TYPES.WEIGHT:
        return {
          startingWeight: this.currentValue,
          targetWeight: this.targetValue,
          targetRate: 0.5, // kg per week
          trackingFrequency: 'weekly',
        };

      default:
        return {
          customMetrics: {},
          trackingMethod: 'manual',
        };
    }
  }

  /**
   * Validate goal data
   * @private
   * @throws {Error} If validation fails
   */
  _validate() {
    // Required fields
    if (!this.title.trim()) {
      throw new Error('Goal title is required');
    }

    if (!Object.values(GOAL_TYPES).includes(this.type)) {
      throw new Error(`Invalid goal type: ${this.type}`);
    }

    if (!Object.values(GOAL_STATUS).includes(this.status)) {
      throw new Error(`Invalid goal status: ${this.status}`);
    }

    // Date validation
    if (this.targetDate <= this.startDate) {
      throw new Error('Target date must be after start date');
    }

    // Type-specific validation
    this._validateTypeSpecific();
  }

  /**
   * Validate type-specific properties
   * @private
   * @throws {Error} If validation fails
   */
  _validateTypeSpecific() {
    switch (this.type) {
      case GOAL_TYPES.FTP:
        if (this.targetValue <= 0 || this.targetValue > 600) {
          throw new Error('Target FTP must be between 1 and 600 watts');
        }
        break;

      case GOAL_TYPES.VOLUME:
        if (this.targetValue <= 0 || this.targetValue > 50) {
          throw new Error(
            'Target volume must be between 1 and 50 hours per week'
          );
        }
        break;

      case GOAL_TYPES.WEIGHT:
        if (this.targetValue <= 30 || this.targetValue > 200) {
          throw new Error('Target weight must be between 30 and 200 kg');
        }
        break;

      case GOAL_TYPES.EVENT:
        if (!this.config.eventName || this.config.eventName.trim() === '') {
          throw new Error('Event name is required for event goals');
        }
        break;
    }
  }

  /**
   * Update goal progress
   * @param {number} newValue - New current value
   * @param {Date} timestamp - Optional timestamp for the update
   * @returns {Object} Progress update result
   */
  updateProgress(newValue, timestamp = new Date()) {
    const oldValue = this.currentValue;
    const oldProgress = this.progress;

    this.currentValue = newValue;
    this.progress = this._calculateProgress();

    // Check if goal is completed
    if (this.progress >= 100 && this.status === GOAL_STATUS.ACTIVE) {
      this.status = GOAL_STATUS.COMPLETED;
      this.completedAt = timestamp;
    }

    // Add milestone if significant progress made
    this._checkMilestones(oldProgress, this.progress, timestamp);

    return {
      previousValue: oldValue,
      currentValue: this.currentValue,
      previousProgress: oldProgress,
      currentProgress: this.progress,
      progressChange: this.progress - oldProgress,
      completed: this.status === GOAL_STATUS.COMPLETED,
      timestamp: timestamp,
    };
  }

  /**
   * Calculate progress percentage based on goal type
   * @private
   * @returns {number} Progress percentage (0-100)
   */
  _calculateProgress() {
    if (this.targetValue === 0) return 0;

    switch (this.type) {
      case GOAL_TYPES.FTP:
      case GOAL_TYPES.WEIGHT:
        // For FTP and weight, progress is based on distance covered
        const startValue =
          this.config.startingFTP || this.config.startingWeight || 0;
        const totalChange = this.targetValue - startValue;
        const currentChange = this.currentValue - startValue;
        return totalChange === 0
          ? 100
          : Math.max(0, Math.min(100, (currentChange / totalChange) * 100));

      case GOAL_TYPES.VOLUME:
        // For volume, progress is current vs target
        return Math.min(100, (this.currentValue / this.targetValue) * 100);

      case GOAL_TYPES.EVENT:
        // For events, progress is based on time until event and preparation
        const now = new Date();
        const totalTime = this.targetDate.getTime() - this.startDate.getTime();
        const elapsedTime = now.getTime() - this.startDate.getTime();
        const timeProgress =
          totalTime === 0
            ? 100
            : Math.min(100, (elapsedTime / totalTime) * 100);

        // Combine time progress with performance progress
        const performanceProgress =
          this.targetValue === 0
            ? 0
            : Math.min(100, (this.currentValue / this.targetValue) * 100);

        return Math.max(timeProgress * 0.3 + performanceProgress * 0.7, 0);

      default:
        return this.targetValue === 0
          ? 0
          : Math.min(100, (this.currentValue / this.targetValue) * 100);
    }
  }

  /**
   * Check and add milestones for significant progress
   * @private
   * @param {number} oldProgress - Previous progress
   * @param {number} newProgress - New progress
   * @param {Date} timestamp - Timestamp of the update
   */
  _checkMilestones(oldProgress, newProgress, timestamp) {
    const milestoneThresholds = [25, 50, 75, 90, 100];

    for (const threshold of milestoneThresholds) {
      if (oldProgress < threshold && newProgress >= threshold) {
        this.milestones.push({
          id: `milestone_${threshold}_${Date.now()}`,
          threshold: threshold,
          timestamp: timestamp.toISOString(),
          value: this.currentValue,
          description: this._getMilestoneDescription(threshold),
        });
      }
    }
  }

  /**
   * Get milestone description
   * @private
   * @param {number} threshold - Milestone threshold
   * @returns {string} Milestone description
   */
  _getMilestoneDescription(threshold) {
    if (threshold === 100) return 'Goal completed!';
    if (threshold >= 90) return 'Almost there!';
    if (threshold >= 75) return 'Great progress!';
    if (threshold >= 50) return 'Halfway there!';
    if (threshold >= 25) return 'Good start!';
    return 'Progress made!';
  }

  /**
   * Get time remaining until target date
   * @returns {Object} Time remaining breakdown
   */
  getTimeRemaining() {
    const now = new Date();
    const timeDiff = this.targetDate.getTime() - now.getTime();

    if (timeDiff <= 0) {
      return {
        expired: true,
        days: 0,
        weeks: 0,
        months: 0,
        totalDays: 0,
      };
    }

    const totalDays = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(totalDays / 7);
    const months = Math.floor(totalDays / 30);
    const days = totalDays % 7;

    return {
      expired: false,
      days: days,
      weeks: weeks,
      months: months,
      totalDays: totalDays,
    };
  }

  /**
   * Get estimated completion date based on current progress rate
   * @returns {Date|null} Estimated completion date or null if not enough data
   */
  getEstimatedCompletionDate() {
    if (this.milestones.length < 2) return null;

    // Calculate progress rate based on recent milestones
    const recent = this.milestones.slice(-2);
    const timeDiff =
      new Date(recent[1].timestamp).getTime() -
      new Date(recent[0].timestamp).getTime();
    const progressDiff = recent[1].threshold - recent[0].threshold;

    if (progressDiff <= 0) return null;

    const progressRate = progressDiff / timeDiff; // progress per millisecond
    const remainingProgress = 100 - this.progress;
    const estimatedTime = remainingProgress / progressRate;

    const estimatedDate = new Date(Date.now() + estimatedTime);
    return estimatedDate;
  }

  /**
   * Check if goal is on track based on time elapsed vs progress made
   * @returns {Object} On-track analysis
   */
  isOnTrack() {
    const timeRemaining = this.getTimeRemaining();
    if (timeRemaining.expired) {
      return {
        onTrack: false,
        status: 'expired',
        message: 'Goal deadline has passed',
        recommendation:
          'Consider extending the deadline or adjusting the target',
      };
    }

    // Calculate expected progress based on time elapsed
    const totalTime = this.targetDate.getTime() - this.startDate.getTime();
    const elapsedTime = Date.now() - this.startDate.getTime();
    const expectedProgress = (elapsedTime / totalTime) * 100;

    const progressDifference = this.progress - expectedProgress;

    if (progressDifference >= 10) {
      return {
        onTrack: true,
        status: 'ahead',
        message: 'Ahead of schedule!',
        progressDifference: Math.round(progressDifference),
        recommendation: 'Great work! Consider setting a more ambitious target',
      };
    } else if (progressDifference >= -5) {
      return {
        onTrack: true,
        status: 'on_track',
        message: 'On track to meet goal',
        progressDifference: Math.round(progressDifference),
        recommendation: 'Keep up the current pace',
      };
    } else if (progressDifference >= -15) {
      return {
        onTrack: false,
        status: 'behind',
        message: 'Slightly behind schedule',
        progressDifference: Math.round(Math.abs(progressDifference)),
        recommendation: 'Consider increasing training frequency or intensity',
      };
    } else {
      return {
        onTrack: false,
        status: 'significantly_behind',
        message: 'Significantly behind schedule',
        progressDifference: Math.round(Math.abs(progressDifference)),
        recommendation: 'Consider adjusting goal target or extending deadline',
      };
    }
  }

  /**
   * Get goal-specific display information
   * @returns {Object} Display information
   */
  getDisplayInfo() {
    const timeRemaining = this.getTimeRemaining();
    const onTrack = this.isOnTrack();

    return {
      title: this.title,
      type: this.type,
      status: this.status,
      priority: this.priority,
      progress: Math.round(this.progress),
      currentValue: this.currentValue,
      targetValue: this.targetValue,
      unit: this.unit,
      timeRemaining: timeRemaining,
      onTrack: onTrack,
      milestones: this.milestones.length,
      daysActive: Math.floor(
        (Date.now() - this.startDate.getTime()) / (1000 * 60 * 60 * 24)
      ),
      formattedDates: {
        created: this.createdAt.toLocaleDateString(),
        start: this.startDate.toLocaleDateString(),
        target: this.targetDate.toLocaleDateString(),
        completed: this.completedAt
          ? this.completedAt.toLocaleDateString()
          : null,
      },
    };
  }

  /**
   * Convert goal to JSON format for storage
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      title: this.title,
      description: this.description,
      status: this.status,
      createdAt: this.createdAt.toISOString(),
      startDate: this.startDate.toISOString(),
      targetDate: this.targetDate.toISOString(),
      completedAt: this.completedAt ? this.completedAt.toISOString() : null,
      currentValue: this.currentValue,
      targetValue: this.targetValue,
      unit: this.unit,
      progress: this.progress,
      milestones: this.milestones,
      config: this.config,
      priority: this.priority,
      isPublic: this.isPublic,
      tags: this.tags,
    };
  }

  /**
   * Create TrainingGoal from JSON data
   * @param {Object} json - JSON data
   * @returns {TrainingGoal} New TrainingGoal instance
   */
  static fromJSON(json) {
    return new TrainingGoal(json);
  }

  /**
   * Create a new FTP goal
   * @param {Object} options - FTP goal options
   * @returns {TrainingGoal} New FTP goal
   */
  static createFTPGoal(options = {}) {
    return new TrainingGoal({
      type: GOAL_TYPES.FTP,
      title: options.title || 'FTP Improvement Goal',
      description: options.description || 'Improve functional threshold power',
      currentValue: options.currentFTP || 200,
      targetValue: options.targetFTP || 250,
      unit: 'watts',
      startDate: options.startDate,
      targetDate: options.targetDate,
      config: {
        startingFTP: options.currentFTP || 200,
        targetFTP: options.targetFTP || 250,
        testProtocol: options.testProtocol || '20min',
        autoUpdate:
          options.autoUpdate !== undefined ? options.autoUpdate : true,
      },
    });
  }

  /**
   * Create a new volume goal
   * @param {Object} options - Volume goal options
   * @returns {TrainingGoal} New volume goal
   */
  static createVolumeGoal(options = {}) {
    return new TrainingGoal({
      type: GOAL_TYPES.VOLUME,
      title: options.title || 'Training Volume Goal',
      description: options.description || 'Achieve consistent training volume',
      currentValue: options.currentVolume || 0,
      targetValue: options.targetVolume || 8,
      unit: options.unit || 'hours/week',
      startDate: options.startDate,
      targetDate: options.targetDate,
      config: {
        volumeType: options.volumeType || VOLUME_TYPES.WEEKLY_HOURS,
        trackingPeriod: options.trackingPeriod || 'weekly',
        includeRest: options.includeRest || false,
        minIntensity: options.minIntensity || null,
      },
    });
  }

  /**
   * Create a new event goal
   * @param {Object} options - Event goal options
   * @returns {TrainingGoal} New event goal
   */
  static createEventGoal(options = {}) {
    return new TrainingGoal({
      type: GOAL_TYPES.EVENT,
      title: options.title || 'Event Preparation',
      description: options.description || 'Prepare for upcoming event',
      currentValue: options.currentPower || 0,
      targetValue: options.targetPower || 250,
      unit: 'watts',
      startDate: options.startDate,
      targetDate: options.eventDate,
      config: {
        eventName: options.eventName || '',
        eventType: options.eventType || 'race',
        eventDistance: options.eventDistance || 0,
        targetPower: options.targetPower || 250,
        targetTime: options.targetTime || null,
        preparationWeeks: options.preparationWeeks || 12,
      },
    });
  }
}
