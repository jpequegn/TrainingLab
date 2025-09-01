/**
 * Strava Data Mapping Service
 * Converts Strava activity data to TrainingLab format and calculates training metrics
 */

import { createLogger } from '../utils/logger.js';

const logger = createLogger('StravaMapper');

// Constants
const SECONDS_PER_HOUR = 3600;
const AVG_POWER_ADJUSTMENT_FACTOR = 0.85;
const POWER_EXPONENT = 4;
const POWER_ROOT_EXPONENT = 0.25;
const SUFFER_SCORE_MODERATE = 50;
const SUFFER_SCORE_HARD = 100;
const SUFFER_SCORE_VERY_HARD = 150;
const KM_H_TO_MS_CONVERSION = 3.6;
const RPE_EASY = 2;
const RPE_MODERATE = 3;
const RPE_HARD = 4;
const RPE_VERY_HARD = 5;
const DURATION_EASY_HOURS = 1;
const DURATION_MODERATE_HOURS = 2;
const DURATION_HARD_HOURS = 3;

export class StravaDataMapper {
  constructor() {
    // TrainingLab activity type mappings
    this.activityTypeMap = {
      // Cycling
      Ride: 'cycling',
      VirtualRide: 'cycling',
      EBikeRide: 'cycling',
      Handcycle: 'cycling',

      // Running
      Run: 'running',
      VirtualRun: 'running',
      TrailRun: 'running',

      // Other sports
      Swim: 'swimming',
      Hike: 'hiking',
      Walk: 'walking',
      WeightTraining: 'strength',
      Crossfit: 'strength',
      Yoga: 'flexibility',
      Workout: 'other',

      // Default fallback
      default: 'other',
    };

    // Power zone thresholds (as percentages of FTP)
    this.powerZones = {
      active_recovery: { min: 0, max: 0.55 }, // Zone 1: <55% FTP
      endurance: { min: 0.55, max: 0.75 }, // Zone 2: 55-75% FTP
      tempo: { min: 0.75, max: 0.9 }, // Zone 3: 75-90% FTP
      threshold: { min: 0.9, max: 1.05 }, // Zone 4: 90-105% FTP
      vo2max: { min: 1.05, max: 1.2 }, // Zone 5: 105-120% FTP
      anaerobic: { min: 1.2, max: 1.5 }, // Zone 6: 120-150% FTP
      neuromuscular: { min: 1.5, max: 10 }, // Zone 7: >150% FTP
    };
  }

  /**
   * Convert Strava activity to TrainingLab WorkoutSession format
   * @param {Object} stravaActivity - Strava activity data
   * @param {number} userFtp - User's FTP for calculations
   * @param {Object} streams - Optional activity streams data
   * @returns {Object} TrainingLab WorkoutSession
   */
  mapActivityToWorkoutSession(stravaActivity, userFtp = null, streams = null) {
    try {
      const mappedActivity = {
        id: this.generateTrainingLabId(stravaActivity.id),
        workoutId: null, // Strava activities don't have associated workout templates
        userId: null, // Will be set by the calling service

        // Dates and timing
        plannedDate: new Date(stravaActivity.start_date),
        completedDate: new Date(stravaActivity.start_date),
        duration: stravaActivity.elapsed_time, // in seconds
        status: 'completed',

        // Basic activity info
        name: stravaActivity.name,
        type: this.mapActivityType(stravaActivity.type),
        source: 'strava',
        externalId: stravaActivity.id.toString(),

        // Planned metrics (null for Strava activities as they're already completed)
        planned: {
          tss: null,
          duration: null,
          avgPower: null,
        },

        // Actual performance metrics
        actual: this.mapPerformanceMetrics(stravaActivity, userFtp, streams),

        // Additional metadata
        metadata: {
          stravaData: {
            distance: stravaActivity.distance, // meters
            totalElevationGain: stravaActivity.total_elevation_gain,
            averageSpeed: stravaActivity.average_speed, // m/s
            maxSpeed: stravaActivity.max_speed,
            trainer: stravaActivity.trainer,
            commute: stravaActivity.commute,
            manual: stravaActivity.manual,
            private: stravaActivity.private,
            achievementCount: stravaActivity.achievement_count,
            kudosCount: stravaActivity.kudos_count,
            location: {
              startLatLng: stravaActivity.start_latlng,
              endLatLng: stravaActivity.end_latlng,
              timezone: stravaActivity.timezone,
            },
            gear: stravaActivity.gear_id,
            sufferScore: stravaActivity.suffer_score,
          },
        },

        // Notes and rating
        notes: stravaActivity.description || null,
        rating: this.estimatePerceivedExertion(stravaActivity),

        // Timestamps
        created: new Date(),
        lastUpdated: new Date(),
        syncedAt: new Date(),
      };

      logger.debug('Mapped Strava activity to WorkoutSession', {
        stravaId: stravaActivity.id,
        trainingLabId: mappedActivity.id,
        type: mappedActivity.type,
        duration: mappedActivity.duration,
        hasPowerData: !!mappedActivity.actual.avgPower,
      });

      return mappedActivity;
    } catch (error) {
      logger.error('Failed to map Strava activity', {
        stravaId: stravaActivity.id,
        error: error.message,
      });
      throw new Error(
        `Failed to map activity ${stravaActivity.id}: ${error.message}`
      );
    }
  }

  /**
   * Map Strava activity type to TrainingLab category
   * @param {string} stravaType - Strava activity type
   * @returns {string} TrainingLab activity type
   */
  mapActivityType(stravaType) {
    return this.activityTypeMap[stravaType] || this.activityTypeMap.default;
  }

  /**
   * Map Strava performance data to TrainingLab actual metrics
   * @param {Object} stravaActivity - Strava activity data
   * @param {number} userFtp - User's FTP
   * @param {Object} streams - Activity streams data
   * @returns {Object} TrainingLab actual metrics
   */
  mapPerformanceMetrics(stravaActivity, userFtp, streams = null) {
    const metrics = {
      // Basic power metrics
      avgPower: stravaActivity.average_watts || null,
      maxPower: stravaActivity.max_watts || null,
      normalizedPower: stravaActivity.weighted_average_watts || null,

      // Heart rate metrics
      avgHeartRate: stravaActivity.average_heartrate || null,
      maxHeartRate: stravaActivity.max_heartrate || null,

      // Cadence metrics (if available)
      avgCadence: null, // Not available in summary data
      maxCadence: null,

      // Energy
      kilojoules: stravaActivity.kilojoules || null,
      calories: stravaActivity.calories || null,

      // Distance and speed
      distance: stravaActivity.distance, // meters
      averageSpeed: stravaActivity.average_speed, // m/s
      maxSpeed: stravaActivity.max_speed,

      // Elevation
      totalElevationGain: stravaActivity.total_elevation_gain,

      // Time data
      movingTime: stravaActivity.moving_time,
      elapsedTime: stravaActivity.elapsed_time,

      // Quality flags
      hasValidPowerData: !!stravaActivity.device_watts,
      hasValidHRData: !!stravaActivity.has_heartrate,

      // Will be calculated if we have power data and FTP
      intensityFactor: null,
      variabilityIndex: null,
      tss: null,

      // Stream data (if provided)
      powerData: null,
      heartRateData: null,
      cadenceData: null,
      altitudeData: null,
      velocityData: null,

      // Zone analysis (will be calculated if we have power data and FTP)
      powerZoneDistribution: null,
    };

    // Add stream data if available
    if (streams) {
      this.addStreamData(metrics, streams);
    }

    // Calculate advanced metrics if we have the necessary data
    if (userFtp && metrics.avgPower) {
      this.calculateAdvancedPowerMetrics(metrics, userFtp);
    }

    // Calculate TSS
    if (metrics.normalizedPower && userFtp) {
      metrics.tss = this.calculateTSS(
        metrics.normalizedPower,
        userFtp,
        stravaActivity.moving_time
      );
    } else if (metrics.avgPower && userFtp) {
      // Fallback to average power if normalized power not available
      metrics.tss = this.calculateTSS(
        metrics.avgPower,
        userFtp,
        stravaActivity.moving_time,
        true // use average power
      );
    }

    return metrics;
  }

  /**
   * Add stream data to metrics
   * @param {Object} metrics - Metrics object to update
   * @param {Object} streams - Stream data from Strava
   */
  addStreamData(metrics, streams) {
    if (streams.watts && streams.watts.data) {
      metrics.powerData = streams.watts.data;

      // Recalculate power metrics from stream data
      if (metrics.powerData.length > 0) {
        metrics.avgPower = this.calculateAverage(
          metrics.powerData.filter(p => p > 0)
        );
        metrics.maxPower = Math.max(...metrics.powerData);
        metrics.normalizedPower = this.calculateNormalizedPower(
          metrics.powerData
        );
      }
    }

    if (streams.heartrate && streams.heartrate.data) {
      metrics.heartRateData = streams.heartrate.data;

      if (metrics.heartRateData.length > 0) {
        metrics.avgHeartRate = this.calculateAverage(
          metrics.heartRateData.filter(hr => hr > 0)
        );
        metrics.maxHeartRate = Math.max(...metrics.heartRateData);
      }
    }

    if (streams.cadence && streams.cadence.data) {
      metrics.cadenceData = streams.cadence.data;

      if (metrics.cadenceData.length > 0) {
        metrics.avgCadence = this.calculateAverage(
          metrics.cadenceData.filter(c => c > 0)
        );
        metrics.maxCadence = Math.max(...metrics.cadenceData);
      }
    }

    if (streams.altitude && streams.altitude.data) {
      metrics.altitudeData = streams.altitude.data;
    }

    if (streams.velocity_smooth && streams.velocity_smooth.data) {
      metrics.velocityData = streams.velocity_smooth.data;
    }
  }

  /**
   * Calculate advanced power metrics
   * @param {Object} metrics - Metrics object to update
   * @param {number} ftp - User's FTP
   */
  calculateAdvancedPowerMetrics(metrics, ftp) {
    // Intensity Factor (IF)
    if (metrics.normalizedPower) {
      metrics.intensityFactor = metrics.normalizedPower / ftp;
    } else if (metrics.avgPower) {
      metrics.intensityFactor = metrics.avgPower / ftp;
    }

    // Variability Index (VI)
    if (metrics.normalizedPower && metrics.avgPower) {
      metrics.variabilityIndex = metrics.normalizedPower / metrics.avgPower;
    }

    // Power zone distribution (if we have power stream data)
    if (metrics.powerData && ftp) {
      metrics.powerZoneDistribution = this.calculatePowerZoneDistribution(
        metrics.powerData,
        ftp
      );
    }
  }

  /**
   * Calculate Training Stress Score (TSS)
   * @param {number} power - Normalized power or average power
   * @param {number} ftp - User's FTP
   * @param {number} duration - Duration in seconds
   * @param {boolean} useAvgPower - Whether using average power instead of NP
   * @returns {number} TSS value
   */
  calculateTSS(power, ftp, duration, useAvgPower = false) {
    if (!power || !ftp || !duration) return null;

    const intensityFactor = power / ftp;
    const durationHours = duration / SECONDS_PER_HOUR;

    // Adjust calculation if using average power instead of normalized power
    const adjustmentFactor = useAvgPower ? AVG_POWER_ADJUSTMENT_FACTOR : 1;

    return Math.round(
      intensityFactor * intensityFactor * durationHours * 100 * adjustmentFactor
    );
  }

  /**
   * Calculate normalized power from power stream data
   * @param {Array} powerData - Array of power values
   * @returns {number} Normalized power
   */
  calculateNormalizedPower(powerData) {
    if (!powerData || powerData.length === 0) return null;

    // Rolling 30-second average calculation
    const rollingAverages = [];
    const windowSize = 30;

    for (let i = 0; i <= powerData.length - windowSize; i++) {
      const window = powerData.slice(i, i + windowSize);
      const avg = this.calculateAverage(window);
      rollingAverages.push(avg);
    }

    // Raise each average to the 4th power
    const fourthPowers = rollingAverages.map(avg =>
      Math.pow(avg, POWER_EXPONENT)
    );

    // Take the average of the 4th powers
    const avgFourthPower = this.calculateAverage(fourthPowers);

    // Take the 4th root
    return Math.pow(avgFourthPower, POWER_ROOT_EXPONENT);
  }

  /**
   * Calculate power zone distribution
   * @param {Array} powerData - Array of power values
   * @param {number} ftp - User's FTP
   * @returns {Object} Zone distribution in seconds
   */
  calculatePowerZoneDistribution(powerData, ftp) {
    const distribution = {};

    // Initialize zones
    Object.keys(this.powerZones).forEach(zone => {
      distribution[zone] = 0;
    });

    // Count time in each zone
    powerData.forEach(power => {
      if (power <= 0) return;

      const powerRatio = power / ftp;

      for (const [zoneName, zone] of Object.entries(this.powerZones)) {
        if (powerRatio >= zone.min && powerRatio < zone.max) {
          distribution[zoneName]++;
          break;
        }
      }
    });

    return distribution;
  }

  /**
   * Calculate average from array of numbers
   * @param {Array} values - Array of numbers
   * @returns {number} Average value
   */
  calculateAverage(values) {
    if (!values || values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Generate TrainingLab ID from Strava ID
   * @param {number} stravaId - Strava activity ID
   * @returns {string} TrainingLab activity ID
   */
  generateTrainingLabId(stravaId) {
    return `strava_${stravaId}`;
  }

  /**
   * Estimate perceived exertion from Strava data
   * @param {Object} stravaActivity - Strava activity data
   * @returns {number|null} RPE estimate (1-5 scale)
   */
  estimatePerceivedExertion(stravaActivity) {
    // Use Strava's suffer score if available
    if (stravaActivity.suffer_score) {
      // Strava suffer score is roughly 0-200+, map to 1-5 RPE scale
      if (stravaActivity.suffer_score < SUFFER_SCORE_MODERATE) return RPE_EASY;
      if (stravaActivity.suffer_score < SUFFER_SCORE_HARD) return RPE_MODERATE;
      if (stravaActivity.suffer_score < SUFFER_SCORE_VERY_HARD) return RPE_HARD;
      return RPE_VERY_HARD;
    }

    // Fallback estimation based on activity type and duration
    const durationHours = stravaActivity.elapsed_time / SECONDS_PER_HOUR;

    if (durationHours < DURATION_EASY_HOURS) return RPE_EASY;
    if (durationHours < DURATION_MODERATE_HOURS) return RPE_MODERATE;
    if (durationHours < DURATION_HARD_HOURS) return RPE_HARD;
    return RPE_VERY_HARD;
  }

  /**
   * Validate mapped activity data
   * @param {Object} mappedActivity - Mapped TrainingLab activity
   * @returns {boolean} True if valid
   */
  validateMappedActivity(mappedActivity) {
    const requiredFields = [
      'id',
      'completedDate',
      'duration',
      'type',
      'status',
    ];

    for (const field of requiredFields) {
      if (!mappedActivity[field]) {
        logger.warn('Mapped activity missing required field', {
          field,
          id: mappedActivity.id,
        });
        return false;
      }
    }

    if (mappedActivity.duration <= 0) {
      logger.warn('Invalid activity duration', {
        id: mappedActivity.id,
        duration: mappedActivity.duration,
      });
      return false;
    }

    return true;
  }

  /**
   * Create activity summary for display
   * @param {Object} mappedActivity - Mapped TrainingLab activity
   * @returns {Object} Activity summary
   */
  createActivitySummary(mappedActivity) {
    const actual = mappedActivity.actual || {};

    return {
      id: mappedActivity.id,
      name: mappedActivity.name,
      type: mappedActivity.type,
      date: mappedActivity.completedDate,
      duration: mappedActivity.duration,

      // Key metrics
      distance: actual.distance
        ? `${(actual.distance / 1000).toFixed(1)} km`
        : null,
      avgPower: actual.avgPower ? `${Math.round(actual.avgPower)} W` : null,
      avgSpeed: actual.averageSpeed
        ? `${(actual.averageSpeed * KM_H_TO_MS_CONVERSION).toFixed(1)} km/h`
        : null,
      avgHeartRate: actual.avgHeartRate
        ? `${Math.round(actual.avgHeartRate)} bpm`
        : null,
      tss: actual.tss ? Math.round(actual.tss) : null,

      // Quality flags
      hasPowerData: actual.hasValidPowerData,
      hasHRData: actual.hasValidHRData,

      // Source
      source: 'strava',
      externalId: mappedActivity.externalId,
    };
  }
}

// Export singleton instance
export const stravaMapper = new StravaDataMapper();
