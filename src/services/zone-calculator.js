/**
 * Zone Calculator Utility
 * Training zone calculations and utilities
 */

import { powerZoneManager } from '../core/power-zones.js';

export class ZoneCalculator {
  /**
   * Calculate training zones based on FTP
   * @param {number} ftp - Functional Threshold Power
   * @param {string} model - Zone model ('coggan', 'polarized', 'custom')
   * @returns {Object} Zone data
   */
  static calculateZones(ftp, model = 'coggan') {
    if (!ftp || ftp <= 0) {
      throw new Error('FTP must be a positive number');
    }

    const zones = {};
    const zoneModel = powerZoneManager.getAvailableModels()[model];
    
    if (!zoneModel) {
      throw new Error(`Unknown zone model: ${model}`);
    }

    // Calculate zones in both percentage and watts
    Object.entries(zoneModel.zones).forEach(([zoneId, zone]) => {
      zones[zoneId] = {
        ...zone,
        minWatts: Math.round(zone.min * ftp),
        maxWatts: Math.round(zone.max * ftp),
        minPercent: Math.round(zone.min * 100),
        maxPercent: Math.round(zone.max * 100),
      };
    });

    return {
      ftp,
      model,
      zones,
      modelInfo: {
        name: zoneModel.name,
        description: zoneModel.description,
      },
    };
  }

  /**
   * Get zone for a given power value
   * @param {number} powerWatts - Power in watts
   * @param {number} ftp - FTP value
   * @param {Object} zones - Zone configuration
   * @returns {Object|null} Zone information
   */
  static getZoneForPower(powerWatts, ftp, zones) {
    const powerPercent = powerWatts / ftp;
    
    for (const [zoneId, zone] of Object.entries(zones)) {
      if (powerPercent >= zone.min && powerPercent <= zone.max) {
        return {
          id: zoneId,
          ...zone,
          currentPower: powerWatts,
          currentPercent: Math.round(powerPercent * 100),
        };
      }
    }
    
    return null;
  }

  /**
   * Calculate time in zones for workout data
   * @param {Array} workoutSegments - Workout segments
   * @param {number} ftp - FTP value
   * @param {Object} zones - Zone configuration
   * @returns {Object} Time in zones
   */
  static calculateTimeInZones(workoutSegments, ftp, zones) {
    const timeInZones = {};
    let totalTime = 0;

    // Initialize zone times
    Object.keys(zones).forEach(zoneId => {
      timeInZones[zoneId] = 0;
    });

    // Calculate time in each zone
    workoutSegments.forEach(segment => {
      const duration = segment.duration || 0;
      totalTime += duration;

      // Get average power for segment
      let avgPower = 65; // Default
      if (segment.power !== undefined) {
        avgPower = segment.power * 100; // Convert to percentage
      } else if (segment.powerLow !== undefined && segment.powerHigh !== undefined) {
        avgPower = ((segment.powerLow + segment.powerHigh) / 2) * 100;
      }

      // Convert percentage to watts
      const avgWatts = (avgPower / 100) * ftp;
      
      // Find matching zone
      const zone = this.getZoneForPower(avgWatts, ftp, zones);
      if (zone) {
        timeInZones[zone.id] += duration;
      }
    });

    // Convert to percentages and minutes
    const result = {
      totalTime: totalTime,
      zones: {},
    };

    Object.entries(timeInZones).forEach(([zoneId, timeInSeconds]) => {
      const zone = zones[zoneId];
      result.zones[zoneId] = {
        ...zone,
        timeSeconds: timeInSeconds,
        timeMinutes: Math.round(timeInSeconds / 60),
        percentage: totalTime > 0 ? Math.round((timeInSeconds / totalTime) * 100) : 0,
      };
    });

    return result;
  }

  /**
   * Calculate Training Stress Score (TSS)
   * @param {Array} workoutSegments - Workout segments
   * @param {number} ftp - FTP value
   * @returns {number} TSS value
   */
  static calculateTSS(workoutSegments, ftp) {
    let totalStress = 0;
    let totalTime = 0;

    workoutSegments.forEach(segment => {
      const duration = segment.duration || 0;
      totalTime += duration;

      // Get average power for segment
      let avgPower = 65; // Default percentage
      if (segment.power !== undefined) {
        avgPower = segment.power * 100;
      } else if (segment.powerLow !== undefined && segment.powerHigh !== undefined) {
        avgPower = ((segment.powerLow + segment.powerHigh) / 2) * 100;
      }

      // Calculate normalized power factor (simplified)
      const intensityFactor = avgPower / 100;
      const stress = Math.pow(intensityFactor, 4) * (duration / 3600); // Duration in hours
      totalStress += stress;
    });

    return Math.round(totalStress * 100);
  }

  /**
   * Calculate Intensity Factor (IF)
   * @param {Array} workoutSegments - Workout segments  
   * @param {number} ftp - FTP value
   * @returns {number} IF value
   */
  static calculateIF(workoutSegments, ftp) {
    if (!workoutSegments || workoutSegments.length === 0) {
      return 0;
    }

    let totalPowerTime = 0;
    let totalTime = 0;

    workoutSegments.forEach(segment => {
      const duration = segment.duration || 0;
      totalTime += duration;

      // Get average power for segment
      let avgPower = 65; // Default percentage
      if (segment.power !== undefined) {
        avgPower = segment.power * 100;
      } else if (segment.powerLow !== undefined && segment.powerHigh !== undefined) {
        avgPower = ((segment.powerLow + segment.powerHigh) / 2) * 100;
      }

      totalPowerTime += (avgPower / 100) * duration;
    });

    return totalTime > 0 ? totalPowerTime / totalTime : 0;
  }

  /**
   * Get zone color for power value
   * @param {number} powerWatts - Power in watts
   * @param {number} ftp - FTP value  
   * @param {Object} zones - Zone configuration
   * @returns {string} Zone color
   */
  static getZoneColor(powerWatts, ftp, zones) {
    const zone = this.getZoneForPower(powerWatts, ftp, zones);
    return zone ? zone.color : '#cccccc';
  }

  /**
   * Format zone range for display
   * @param {Object} zone - Zone object
   * @param {boolean} showWatts - Show watts instead of percentage
   * @returns {string} Formatted range
   */
  static formatZoneRange(zone, showWatts = false) {
    if (showWatts) {
      return `${zone.minWatts}-${zone.maxWatts}W`;
    } else {
      return `${zone.minPercent}-${zone.maxPercent}%`;
    }
  }

  /**
   * Get zone recommendations for different training goals
   * @returns {Object} Zone recommendations
   */
  static getZoneRecommendations() {
    return {
      recovery: {
        zones: ['zone1'],
        description: 'Easy spinning for active recovery',
        duration: '30-90 minutes',
        frequency: 'As needed between hard sessions',
      },
      endurance: {
        zones: ['zone2'],
        description: 'Aerobic base building',
        duration: '1-6 hours',
        frequency: '3-5 times per week',
      },
      tempo: {
        zones: ['zone3'],
        description: 'Aerobic threshold development',
        duration: '20-60 minutes',
        frequency: '1-2 times per week',
      },
      threshold: {
        zones: ['zone4'],
        description: 'Lactate threshold training',
        duration: '8-40 minutes (intervals)',
        frequency: '1-2 times per week',
      },
      vo2max: {
        zones: ['zone5'],
        description: 'VO2 max development',
        duration: '3-8 minutes (intervals)',
        frequency: '1-2 times per week',
      },
      anaerobic: {
        zones: ['zone6'],
        description: 'Anaerobic power development',
        duration: '30 seconds - 3 minutes',
        frequency: '1-2 times per week',
      },
      neuromuscular: {
        zones: ['zone7'],
        description: 'Sprint power and neuromuscular development',
        duration: '5-15 seconds',
        frequency: '1-2 times per week',
      },
    };
  }

  /**
   * Validate FTP against performance indicators
   * @param {number} ftp - FTP to validate
   * @param {Object} profile - User profile data
   * @returns {Object} Validation result
   */
  static validateFTP(ftp, profile) {
    const warnings = [];
    const suggestions = [];

    // Weight-based power-to-weight validation
    if (profile.weight) {
      const powerToWeight = ftp / profile.weight;
      
      if (powerToWeight < 2.0) {
        warnings.push('Low power-to-weight ratio. Consider base fitness development.');
      } else if (powerToWeight > 6.0) {
        warnings.push('Very high power-to-weight ratio. Please verify FTP accuracy.');
      }

      // Age-based recommendations
      if (profile.age) {
        const expectedFTPRange = this.getExpectedFTPRange(profile.age, profile.weight);
        if (ftp < expectedFTPRange.min) {
          suggestions.push(`FTP seems low for age ${profile.age}. Consider retesting.`);
        } else if (ftp > expectedFTPRange.max) {
          suggestions.push(`FTP seems high for age ${profile.age}. Verify test conditions.`);
        }
      }
    }

    // General FTP validation
    if (ftp < 100) {
      warnings.push('FTP below 100W is unusual. Consider a proper FTP test.');
    } else if (ftp > 500) {
      warnings.push('FTP above 500W is exceptional. Please verify accuracy.');
    }

    return {
      isValid: warnings.length === 0,
      warnings,
      suggestions,
      powerToWeight: profile.weight ? Math.round((ftp / profile.weight) * 10) / 10 : null,
    };
  }

  /**
   * Get expected FTP range based on age and weight
   * @private
   * @param {number} age - Age in years
   * @param {number} weight - Weight in kg
   * @returns {Object} Expected FTP range
   */
  static getExpectedFTPRange(age, weight) {
    // Simplified age-based power estimates (watts/kg)
    let basePowerToWeight;
    
    if (age < 25) {
      basePowerToWeight = 3.0;
    } else if (age < 35) {
      basePowerToWeight = 2.8;
    } else if (age < 45) {
      basePowerToWeight = 2.6;
    } else if (age < 55) {
      basePowerToWeight = 2.4;
    } else {
      basePowerToWeight = 2.2;
    }

    const baseFTP = basePowerToWeight * weight;
    
    return {
      min: Math.round(baseFTP * 0.7),
      max: Math.round(baseFTP * 1.5),
      expected: Math.round(baseFTP),
    };
  }

  /**
   * Generate training plan recommendations based on current FTP and goals
   * @param {number} ftp - Current FTP
   * @param {string} goal - Training goal
   * @param {number} weeklyHours - Available training hours per week
   * @returns {Object} Training plan recommendations
   */
  static generateTrainingRecommendations(ftp, goal = 'general', weeklyHours = 6) {
    const recommendations = this.getZoneRecommendations();
    const plans = {
      recovery: {
        name: 'Recovery Week',
        zones: { zone1: 80, zone2: 20 },
        intensity: 'Low',
        focus: 'Active recovery and preparation',
      },
      base: {
        name: 'Base Building',
        zones: { zone1: 20, zone2: 70, zone3: 10 },
        intensity: 'Low-Moderate',
        focus: 'Aerobic capacity development',
      },
      build: {
        name: 'Build Phase',  
        zones: { zone2: 50, zone3: 25, zone4: 20, zone5: 5 },
        intensity: 'Moderate-High',
        focus: 'Threshold and aerobic power',
      },
      peak: {
        name: 'Peak Phase',
        zones: { zone2: 40, zone4: 30, zone5: 20, zone6: 10 },
        intensity: 'High',
        focus: 'Race-specific power development',
      },
    };

    const selectedPlan = plans[goal] || plans.general;
    
    return {
      plan: selectedPlan,
      weeklyStructure: this.generateWeeklyStructure(selectedPlan, weeklyHours),
      expectedFTPGain: this.estimateFTPGain(goal, weeklyHours),
    };
  }

  /**
   * Generate weekly training structure
   * @private
   * @param {Object} plan - Training plan
   * @param {number} weeklyHours - Available hours per week
   * @returns {Array} Weekly training structure
   */
  static generateWeeklyStructure(plan, weeklyHours) {
    const sessions = [];
    const hoursPerSession = weeklyHours / 4; // Assume 4 sessions per week
    
    // This is a simplified structure - real implementation would be more sophisticated
    sessions.push({
      day: 'Monday',
      type: 'Recovery',
      duration: Math.max(30, hoursPerSession * 0.8),
      zones: { zone1: 100 },
    });
    
    sessions.push({
      day: 'Wednesday', 
      type: 'Intervals',
      duration: hoursPerSession,
      zones: plan.zones,
    });
    
    sessions.push({
      day: 'Friday',
      type: 'Tempo',
      duration: hoursPerSession,
      zones: { zone2: 70, zone3: 30 },
    });
    
    sessions.push({
      day: 'Sunday',
      type: 'Long Ride',
      duration: hoursPerSession * 1.5,
      zones: { zone2: 80, zone3: 20 },
    });
    
    return sessions;
  }

  /**
   * Estimate FTP gain based on training plan
   * @private
   * @param {string} goal - Training goal
   * @param {number} weeklyHours - Hours per week
   * @returns {Object} FTP gain estimation
   */
  static estimateFTPGain(goal, weeklyHours) {
    const baseGain = Math.min(weeklyHours / 6, 1.5); // Max 1.5x multiplier
    const goalMultipliers = {
      recovery: 0,
      base: 0.05,
      build: 0.08,
      peak: 0.03,
    };
    
    const multiplier = goalMultipliers[goal] || 0.05;
    const expectedGain = Math.round(baseGain * multiplier * 100); // Percentage gain
    
    return {
      percentage: expectedGain,
      description: `Expected ${expectedGain}% FTP improvement over 4-6 weeks`,
      factors: [
        'Individual response varies significantly',
        'Consistent training is key',
        'Adequate recovery is essential',
        'Nutrition and sleep affect gains',
      ],
    };
  }
}

// Export for use in other modules
export default ZoneCalculator;