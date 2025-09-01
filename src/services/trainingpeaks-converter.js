/**
 * TrainingPeaks Workout Converter Service
 * Handles bidirectional conversion between TrainingPeaks and TrainingLab workout formats
 */

import { createLogger } from '../utils/logger.js';
import { calculateWorkoutMetrics } from '../core/workout.js';
import { powerZoneManager } from '../core/power-zones.js';

const logger = createLogger('TrainingPeaksConverter');

// Constants
const DEFAULT_FTP = 250; // Fallback FTP value
const DEFAULT_CADENCE = 90; // Default cadence for power-based workouts
const TSS_MULTIPLIER = 100; // TSS calculation multiplier
const INTENSITY_FACTOR_DECIMAL = 100;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const PERCENT_MULTIPLIER = 100;
const ZONE_MAPPING_THRESHOLD = 0.05; // 5% threshold for zone matching

/**
 * TrainingPeaks Workout Converter
 * Provides bidirectional conversion between TrainingPeaks and TrainingLab workout formats
 */
export class TrainingPeaksConverter {
  constructor() {
    this.ftpDefault = DEFAULT_FTP;
  }

  /**
   * Convert TrainingPeaks workout to TrainingLab format
   * @param {Object} tpWorkout - TrainingPeaks workout object
   * @param {number} userFtp - User's current FTP
   * @returns {Object} TrainingLab workout format
   */
  convertTPWorkoutToTL(tpWorkout, userFtp = null) {
    try {
      const ftp = userFtp || this.ftpDefault;

      logger.info('Converting TrainingPeaks workout to TrainingLab format', {
        workoutId: tpWorkout.id,
        title: tpWorkout.title,
        ftp,
      });

      // Convert workout structure
      const segments = this.convertTPStructureToTLSegments(
        tpWorkout.structure,
        ftp
      );

      // Calculate metrics
      const duration = this.calculateTotalDuration(segments);
      const { tss, intensity, normalizedPower } = this.calculateWorkoutMetrics(
        segments,
        ftp
      );

      const tlWorkout = {
        // Core identification
        id: `tp_${tpWorkout.id}`,
        name: tpWorkout.title || 'TrainingPeaks Workout',
        description: this.buildWorkoutDescription(tpWorkout),

        // Workout structure
        segments: segments,

        // Metadata
        source: 'trainingpeaks',
        sourceId: tpWorkout.id,
        created: tpWorkout.createdDate || new Date().toISOString(),
        modified: tpWorkout.lastModified || new Date().toISOString(),

        // Training metrics
        duration: duration,
        tss: tss,
        intensityFactor: intensity,
        normalizedPower: normalizedPower,

        // TrainingPeaks specific data
        trainingPeaksData: {
          workoutType: tpWorkout.workoutType,
          tags: tpWorkout.tags || [],
          coachComments: tpWorkout.coachComments,
          athleteComments: tpWorkout.athleteComments,
          estimatedTSS: tpWorkout.estimatedTSS,
          estimatedIF: tpWorkout.estimatedIF,
          equipment: tpWorkout.equipment || [],
          assignedTo: tpWorkout.assignedTo,
          createdBy: tpWorkout.createdBy,
        },

        // Additional properties
        ftp: ftp,
        category: this.mapWorkoutTypeToCategory(tpWorkout.workoutType),
        difficulty: this.calculateWorkoutDifficulty(segments, tss),
      };

      logger.info('Successfully converted TrainingPeaks workout', {
        tlWorkoutId: tlWorkout.id,
        segmentCount: segments.length,
        duration: duration,
        tss: tss,
      });

      return tlWorkout;
    } catch (error) {
      logger.error('Failed to convert TrainingPeaks workout', error);
      throw new Error(`Workout conversion failed: ${error.message}`);
    }
  }

  /**
   * Convert TrainingLab workout to TrainingPeaks format
   * @param {Object} tlWorkout - TrainingLab workout object
   * @param {Object} options - Conversion options
   * @returns {Object} TrainingPeaks workout format
   */
  convertTLWorkoutToTP(tlWorkout, options = {}) {
    try {
      const {
        assignedTo = null,
        createdBy = null,
        includeMetadata = true,
      } = options;

      logger.info('Converting TrainingLab workout to TrainingPeaks format', {
        tlWorkoutId: tlWorkout.id,
        name: tlWorkout.name,
      });

      // Convert segments to TrainingPeaks structure
      const structure = this.convertTLSegmentsToTPStructure(
        tlWorkout.segments,
        tlWorkout.ftp
      );

      const tpWorkout = {
        // Core identification
        title: tlWorkout.name || 'TrainingLab Workout',
        description: this.buildTPDescription(tlWorkout),

        // Workout structure
        structure: structure,

        // Scheduling
        workoutDate:
          options.workoutDate || new Date().toISOString().split('T')[0],

        // Training metrics
        estimatedDuration:
          tlWorkout.duration || this.calculateStructureDuration(structure),
        estimatedTSS: tlWorkout.tss,
        estimatedIF: tlWorkout.intensityFactor,
        estimatedKJ: this.calculateEnergyExpenditure(
          tlWorkout.segments,
          tlWorkout.ftp
        ),

        // Workout classification
        workoutType: this.mapCategoryToWorkoutType(tlWorkout.category),

        // Assignment
        assignedTo: assignedTo,
        createdBy: createdBy,

        // Metadata (if included)
        ...(includeMetadata && {
          tags:
            tlWorkout.trainingPeaksData?.tags ||
            this.generateTagsFromWorkout(tlWorkout),
          coachComments: this.generateCoachComments(tlWorkout),
          equipment: tlWorkout.trainingPeaksData?.equipment || [],
        }),
      };

      logger.info('Successfully converted TrainingLab workout', {
        title: tpWorkout.title,
        estimatedTSS: tpWorkout.estimatedTSS,
        estimatedDuration: tpWorkout.estimatedDuration,
      });

      return tpWorkout;
    } catch (error) {
      logger.error('Failed to convert TrainingLab workout', error);
      throw new Error(`Workout conversion failed: ${error.message}`);
    }
  }

  /**
   * Convert TrainingPeaks workout structure to TrainingLab segments
   * @param {Object} tpStructure - TrainingPeaks structure
   * @param {number} ftp - User's FTP
   * @returns {Array} TrainingLab segments
   */
  convertTPStructureToTLSegments(tpStructure, ftp) {
    const segments = [];
    let currentTime = 0;

    // Process each phase of the workout
    const phases = [
      { name: 'warmup', steps: tpStructure.warmupSteps || [] },
      { name: 'main', steps: tpStructure.mainSetSteps || [] },
      { name: 'cooldown', steps: tpStructure.cooldownSteps || [] },
    ];

    phases.forEach(phase => {
      phase.steps.forEach((step, index) => {
        const segment = this.convertTPStepToTLSegment(
          step,
          currentTime,
          ftp,
          `${phase.name}-${index + 1}`
        );
        segments.push(segment);
        currentTime += segment.duration;
      });
    });

    return segments;
  }

  /**
   * Convert TrainingPeaks workout step to TrainingLab segment
   * @param {Object} tpStep - TrainingPeaks step
   * @param {number} startTime - Segment start time
   * @param {number} ftp - User's FTP
   * @param {string} segmentId - Segment identifier
   * @returns {Object} TrainingLab segment
   */
  convertTPStepToTLSegment(tpStep, startTime, ftp, segmentId) {
    const duration = this.convertDurationToSeconds(
      tpStep.duration,
      tpStep.durationType
    );
    const targets = tpStep.targets || {};
    const powerTarget = targets.power || {};

    // Calculate power values
    let minPower, maxPower, targetPower;

    if (powerTarget.min && powerTarget.max) {
      // Zone-based or range-based power
      minPower = this.convertPowerTarget(
        powerTarget.min,
        powerTarget.unit,
        ftp
      );
      maxPower = this.convertPowerTarget(
        powerTarget.max,
        powerTarget.unit,
        ftp
      );
      targetPower = (minPower + maxPower) / 2;
    } else if (powerTarget.target) {
      // Single target power
      targetPower = this.convertPowerTarget(
        powerTarget.target,
        powerTarget.unit,
        ftp
      );
      minPower = targetPower * 0.95; // 5% tolerance
      maxPower = targetPower * 1.05;
    } else {
      // Default to recovery power
      targetPower = ftp * 0.5;
      minPower = ftp * 0.4;
      maxPower = ftp * 0.6;
    }

    // Determine segment type
    const segmentType = this.mapTPStepTypeToTLType(
      tpStep.stepType,
      targetPower,
      ftp
    );

    return {
      id: segmentId,
      type: segmentType,
      duration: duration,
      startTime: startTime,
      endTime: startTime + duration,

      // Power targets (as percentage of FTP)
      power: targetPower / ftp,
      powerMin: minPower / ftp,
      powerMax: maxPower / ftp,

      // Additional targets
      cadence: this.extractCadenceTarget(targets.cadence) || DEFAULT_CADENCE,

      // Metadata
      description: tpStep.stepDescription || '',
      repetitions: tpStep.repetitions || 1,

      // TrainingPeaks specific
      trainingPeaksData: {
        stepId: tpStep.stepId,
        stepType: tpStep.stepType,
        durationType: tpStep.durationType,
        targets: tpStep.targets,
      },
    };
  }

  /**
   * Convert TrainingLab segments to TrainingPeaks structure
   * @param {Array} tlSegments - TrainingLab segments
   * @param {number} ftp - User's FTP
   * @returns {Object} TrainingPeaks structure
   */
  convertTLSegmentsToTPStructure(tlSegments, ftp) {
    const warmupSteps = [];
    const mainSetSteps = [];
    const cooldownSteps = [];

    tlSegments.forEach(segment => {
      const tpStep = this.convertTLSegmentToTPStep(segment, ftp);

      // Categorize based on segment type or position
      if (this.isWarmupSegment(segment) || segment.type === 'warmup') {
        warmupSteps.push(tpStep);
      } else if (
        this.isCooldownSegment(segment) ||
        segment.type === 'cooldown'
      ) {
        cooldownSteps.push(tpStep);
      } else {
        mainSetSteps.push(tpStep);
      }
    });

    return {
      warmupSteps,
      mainSetSteps,
      cooldownSteps,
      totalDuration: tlSegments.reduce((sum, seg) => sum + seg.duration, 0),
      totalDistance: null, // Not typically used for power-based workouts
      targetLoad: this.calculateTotalLoad(tlSegments, ftp),
    };
  }

  /**
   * Convert TrainingLab segment to TrainingPeaks step
   * @param {Object} tlSegment - TrainingLab segment
   * @param {number} ftp - User's FTP
   * @returns {Object} TrainingPeaks step
   */
  convertTLSegmentToTPStep(tlSegment, ftp) {
    const powerWatts = Math.round(tlSegment.power * ftp);
    const powerMinWatts = Math.round(
      (tlSegment.powerMin || tlSegment.power) * ftp
    );
    const powerMaxWatts = Math.round(
      (tlSegment.powerMax || tlSegment.power) * ftp
    );

    return {
      stepId: this.generateStepId(),
      stepType: this.mapTLTypeToTPStepType(tlSegment.type),
      duration: tlSegment.duration,
      durationType: 'time',

      targets: {
        power: {
          min: powerMinWatts,
          max: powerMaxWatts,
          target: powerWatts,
          unit: 'watts',
          zone: this.getPowerZone(tlSegment.power, ftp),
        },
        cadence: tlSegment.cadence
          ? {
              target: tlSegment.cadence,
              unit: 'rpm',
            }
          : null,
      },

      repetitions: tlSegment.repetitions || 1,
      stepDescription:
        tlSegment.description || this.generateStepDescription(tlSegment, ftp),
      startTime: tlSegment.startTime || 0,
      endTime: tlSegment.endTime || tlSegment.duration,
    };
  }

  // Helper Methods

  /**
   * Build workout description from TrainingPeaks data
   */
  buildWorkoutDescription(tpWorkout) {
    const parts = [];

    if (tpWorkout.description) {
      parts.push(tpWorkout.description);
    }

    if (tpWorkout.coachComments) {
      parts.push(`Coach Notes: ${tpWorkout.coachComments}`);
    }

    return parts.join('\n\n');
  }

  /**
   * Build TrainingPeaks description from TrainingLab data
   */
  buildTPDescription(tlWorkout) {
    const parts = [];

    parts.push(`Generated from TrainingLab workout: ${tlWorkout.name}`);

    if (tlWorkout.description) {
      parts.push(tlWorkout.description);
    }

    if (tlWorkout.tss) {
      parts.push(`Estimated TSS: ${Math.round(tlWorkout.tss)}`);
    }

    return parts.join('\n\n');
  }

  /**
   * Convert duration to seconds based on type
   */
  convertDurationToSeconds(duration, durationType) {
    switch (durationType) {
      case 'time':
        return duration;
      case 'distance':
        // Estimate time based on average speed (could be improved with more context)
        return duration * 2.4; // Rough estimate: 25 km/h average
      case 'calories':
        // Estimate time based on calorie burn rate
        return duration * 0.6; // Rough estimate: 100 cal/min
      default:
        return duration;
    }
  }

  /**
   * Convert power target based on unit
   */
  convertPowerTarget(value, unit, ftp) {
    switch (unit) {
      case 'percent_ftp':
        return (value / PERCENT_MULTIPLIER) * ftp;
      case 'watts':
        return value;
      case 'zone':
        return this.getZonePower(value, ftp);
      default:
        return value; // Assume watts if unit unknown
    }
  }

  /**
   * Extract cadence target from cadence object
   */
  extractCadenceTarget(cadenceTarget) {
    if (!cadenceTarget) return null;
    return cadenceTarget.target || cadenceTarget.min || cadenceTarget.max;
  }

  /**
   * Map TrainingPeaks step type to TrainingLab type
   */
  mapTPStepTypeToTLType(tpStepType, targetPower, ftp) {
    const intensity = targetPower / ftp;

    switch (tpStepType) {
      case 'warmup':
        return 'warmup';
      case 'cooldown':
        return 'cooldown';
      case 'rest':
        return 'rest';
      case 'interval':
        return intensity > 1.0 ? 'interval' : 'steady';
      case 'ramp':
        return 'ramp';
      case 'steady':
        return 'steady';
      default:
        // Determine type based on intensity
        if (intensity < 0.6) return 'rest';
        if (intensity < 0.8) return 'steady';
        if (intensity > 1.2) return 'interval';
        return 'steady';
    }
  }

  /**
   * Map TrainingLab type to TrainingPeaks step type
   */
  mapTLTypeToTPStepType(tlType) {
    const typeMap = {
      warmup: 'warmup',
      cooldown: 'cooldown',
      rest: 'rest',
      steady: 'steady',
      interval: 'interval',
      ramp: 'ramp',
    };

    return typeMap[tlType] || 'steady';
  }

  /**
   * Map workout type to category
   */
  mapWorkoutTypeToCategory(workoutType) {
    if (!workoutType) return 'endurance';

    const categoryMap = {
      endurance: 'endurance',
      tempo: 'tempo',
      threshold: 'threshold',
      vo2max: 'vo2max',
      anaerobic: 'anaerobic',
      recovery: 'recovery',
      test: 'test',
    };

    return categoryMap[workoutType.name?.toLowerCase()] || 'endurance';
  }

  /**
   * Map category to workout type
   */
  mapCategoryToWorkoutType(category) {
    return {
      id: 1,
      name: category || 'Endurance',
      category: 'endurance',
      color: '#4F46E5',
      description: `${category} workout from TrainingLab`,
    };
  }

  /**
   * Calculate workout metrics
   */
  calculateWorkoutMetrics(segments, ftp) {
    let weightedPower = 0;
    let totalTime = 0;

    segments.forEach(segment => {
      const segmentPower = segment.power * ftp;
      weightedPower += Math.pow(segmentPower, 4) * segment.duration;
      totalTime += segment.duration;
    });

    const normalizedPower = Math.pow(weightedPower / totalTime, 0.25);
    const intensity = normalizedPower / ftp;
    const tss =
      (totalTime / SECONDS_PER_MINUTE / MINUTES_PER_HOUR) *
      intensity *
      intensity *
      TSS_MULTIPLIER;

    return {
      normalizedPower: Math.round(normalizedPower),
      intensity:
        Math.round(intensity * INTENSITY_FACTOR_DECIMAL) /
        INTENSITY_FACTOR_DECIMAL,
      tss: Math.round(tss),
    };
  }

  /**
   * Calculate total duration of segments
   */
  calculateTotalDuration(segments) {
    return segments.reduce((total, segment) => total + segment.duration, 0);
  }

  /**
   * Calculate workout difficulty (1-10 scale)
   */
  calculateWorkoutDifficulty(segments, tss) {
    // Base difficulty on TSS and workout structure
    let difficulty = Math.min(10, Math.max(1, Math.round(tss / 10)));

    // Adjust based on intervals
    const intervals = segments.filter(seg => seg.type === 'interval');
    if (intervals.length > 0) {
      const maxPower = Math.max(...intervals.map(seg => seg.power));
      if (maxPower > 1.2) difficulty += 1;
      if (maxPower > 1.5) difficulty += 1;
    }

    return Math.min(10, difficulty);
  }

  /**
   * Check if segment is warmup
   */
  isWarmupSegment(segment) {
    return segment.startTime < 600 && segment.power < 0.7; // First 10 minutes, low power
  }

  /**
   * Check if segment is cooldown
   */
  isCooldownSegment(segment) {
    return segment.power < 0.6; // Low power segments
  }

  /**
   * Get power zone for given intensity
   */
  getPowerZone(intensity, ftp) {
    const zones = powerZoneManager.getZones();
    for (let i = 0; i < zones.length; i++) {
      if (intensity <= zones[i].max / ftp) {
        return i + 1;
      }
    }
    return zones.length;
  }

  /**
   * Get zone power for given zone number
   */
  getZonePower(zoneNumber, ftp) {
    const zones = powerZoneManager.getZones();
    const zone = zones[zoneNumber - 1];
    return zone ? (zone.min + zone.max) / 2 : ftp;
  }

  /**
   * Generate unique step ID
   */
  generateStepId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Generate step description
   */
  generateStepDescription(segment, ftp) {
    const powerWatts = Math.round(segment.power * ftp);
    const powerPercent = Math.round(segment.power * PERCENT_MULTIPLIER);
    return `${segment.type.toUpperCase()}: ${powerWatts}W (${powerPercent}% FTP) for ${Math.round(segment.duration / SECONDS_PER_MINUTE)}min`;
  }

  /**
   * Calculate structure duration
   */
  calculateStructureDuration(structure) {
    const allSteps = [
      ...(structure.warmupSteps || []),
      ...(structure.mainSetSteps || []),
      ...(structure.cooldownSteps || []),
    ];

    return allSteps.reduce((total, step) => total + step.duration, 0);
  }

  /**
   * Calculate energy expenditure
   */
  calculateEnergyExpenditure(segments, ftp) {
    // Rough calculation: 4 calories per kJ, based on power and duration
    let totalKJ = 0;
    segments.forEach(segment => {
      const powerWatts = segment.power * ftp;
      const durationHours =
        segment.duration / SECONDS_PER_MINUTE / MINUTES_PER_HOUR;
      totalKJ += powerWatts * durationHours * 3.6; // Convert to kJ
    });
    return Math.round(totalKJ);
  }

  /**
   * Calculate total load
   */
  calculateTotalLoad(segments, ftp) {
    const { tss } = this.calculateWorkoutMetrics(segments, ftp);
    return tss;
  }

  /**
   * Generate tags from workout
   */
  generateTagsFromWorkout(workout) {
    const tags = [];

    if (workout.category) {
      tags.push(workout.category);
    }

    if (workout.tss > 100) {
      tags.push('high-intensity');
    } else if (workout.tss < 50) {
      tags.push('recovery');
    }

    if (workout.difficulty >= 8) {
      tags.push('advanced');
    }

    tags.push('traininglab');

    return tags;
  }

  /**
   * Generate coach comments
   */
  generateCoachComments(workout) {
    const comments = [];

    comments.push(`Workout imported from TrainingLab: ${workout.name}`);

    if (workout.tss) {
      comments.push(`Target TSS: ${Math.round(workout.tss)}`);
    }

    if (workout.description) {
      comments.push(`Notes: ${workout.description}`);
    }

    return comments.join('\n\n');
  }
}

// Create and export singleton instance
export const trainingPeaksConverter = new TrainingPeaksConverter();
export default trainingPeaksConverter;
