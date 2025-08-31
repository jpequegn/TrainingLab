/**
 * Workout Service
 * Business logic for workout management, parsing, and calculations
 */

import {
  Workout,
  WorkoutSegment,
  TrainingStressMetrics,
} from '../models/workout';

export class WorkoutService {
  /**
   * Calculate Training Stress Score (TSS) for a workout
   */
  static calculateTSS(workout: Workout): number {
    if (
      !workout.segments ||
      workout.segments.length === 0 ||
      workout.totalDuration === 0
    ) {
      return 0;
    }

    let totalWeightedPower = 0;
    let totalDuration = 0;

    workout.segments.forEach(segment => {
      if (segment.duration > 0) {
        let segmentPower: number;

        if (segment.power !== undefined) {
          segmentPower = segment.power;
        } else if (
          segment.powerLow !== undefined &&
          segment.powerHigh !== undefined
        ) {
          segmentPower = (segment.powerLow + segment.powerHigh) / 2;
        } else {
          segmentPower = 0.6; // default fallback
        }

        const weightedPower = Math.pow(segmentPower, 4) * segment.duration;
        totalWeightedPower += weightedPower;
        totalDuration += segment.duration;
      }
    });

    if (totalDuration === 0) return 0;

    // Calculate Normalized Power (4th root of weighted average of 4th powers)
    const normalizedPower = Math.pow(totalWeightedPower / totalDuration, 0.25);
    const intensityFactor = normalizedPower / 1.0; // FTP = 1.0 in our scale

    // TSS = (duration * NP * IF) / (FTP * 3600) * 100
    const tss =
      ((totalDuration * normalizedPower * intensityFactor) / (1.0 * 3600)) *
      100;

    return Math.round(tss);
  }

  /**
   * Calculate Intensity Factor (IF) for a workout
   */
  static calculateIF(workout: Workout): number {
    const normalizedPower = this.calculateNormalizedPower(workout);
    return normalizedPower / 1.0; // FTP = 1.0 in our percentage scale
  }

  /**
   * Calculate Normalized Power for a workout
   */
  static calculateNormalizedPower(workout: Workout): number {
    if (!workout.segments || workout.segments.length === 0) return 0;

    let totalWeightedPower = 0;
    let totalDuration = 0;

    workout.segments.forEach(segment => {
      if (segment.duration > 0) {
        let segmentPower =
          segment.power ||
          (segment.powerLow && segment.powerHigh
            ? (segment.powerLow + segment.powerHigh) / 2
            : 0.6);

        totalWeightedPower += Math.pow(segmentPower, 4) * segment.duration;
        totalDuration += segment.duration;
      }
    });

    return totalDuration > 0
      ? Math.pow(totalWeightedPower / totalDuration, 0.25)
      : 0;
  }

  /**
   * Get all training stress metrics for a workout
   */
  static getTrainingMetrics(workout: Workout): TrainingStressMetrics {
    const np = this.calculateNormalizedPower(workout);
    const if_value = this.calculateIF(workout);
    const tss = this.calculateTSS(workout);
    const avgPower = workout.avgPower || np;
    const vi = avgPower > 0 ? np / avgPower : 1;

    return {
      tss,
      if: if_value,
      np,
      vi,
    };
  }

  /**
   * Format duration in human-readable format
   */
  static formatDuration(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) return '0:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Validate workout data
   */
  static validateWorkout(workout: Workout): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!workout.metadata?.name) {
      errors.push('Workout name is required');
    }

    if (!workout.segments || workout.segments.length === 0) {
      errors.push('Workout must have at least one segment');
    }

    if (workout.totalDuration <= 0) {
      errors.push('Workout must have positive duration');
    }

    workout.segments?.forEach((segment, index) => {
      if (segment.duration <= 0) {
        errors.push(`Segment ${index + 1} must have positive duration`);
      }

      if (
        segment.power !== undefined &&
        (segment.power < 0 || segment.power > 5)
      ) {
        errors.push(
          `Segment ${index + 1} power must be between 0 and 5 (500% FTP)`
        );
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get dominant training zone for workout
   */
  static getDominantZone(workout: Workout): number {
    const zoneTime = new Array(8).fill(0); // 8 zones (0-7)

    workout.segments.forEach(segment => {
      const avgPower =
        segment.power ||
        (segment.powerLow && segment.powerHigh
          ? (segment.powerLow + segment.powerHigh) / 2
          : 0.6);

      let zone = 1; // Default to zone 1
      if (avgPower >= 1.5)
        zone = 7; // Neuromuscular
      else if (avgPower >= 1.2)
        zone = 6; // Anaerobic
      else if (avgPower >= 1.05)
        zone = 5; // VO2Max
      else if (avgPower >= 0.9)
        zone = 4; // Threshold
      else if (avgPower >= 0.75)
        zone = 3; // Tempo
      else if (avgPower >= 0.55)
        zone = 2; // Endurance
      else zone = 1; // Active Recovery

      zoneTime[zone] += segment.duration;
    });

    // Return zone with most time
    return zoneTime.indexOf(Math.max(...zoneTime));
  }
}
