/**
 * Analytics Worker
 * Background processing for training analytics and metrics calculation
 */

// Import power calculations for worker context
// Note: In a real implementation, this would be a worker-compatible version
const PowerCalculations = {
  calculateTSS(powerData, duration, ftp, intensityFactor = null) {
    if (!powerData || !powerData.length || !ftp || duration <= 0) {
      return 0;
    }

    const normalizedPower = this.calculateNormalizedPower(powerData);
    const IF = intensityFactor || (normalizedPower / ftp);
    const durationHours = duration / 3600;
    const tss = (durationHours * normalizedPower * IF) / ftp * 100;
    
    return Math.round(tss * 10) / 10;
  },

  calculateNormalizedPower(powerData) {
    if (!powerData || powerData.length === 0) return 0;

    const rollingWindow = 30;
    const rollingAverages = [];
    
    for (let i = 0; i < powerData.length; i++) {
      const start = Math.max(0, i - rollingWindow + 1);
      const window = powerData.slice(start, i + 1);
      const average = window.reduce((sum, val) => sum + val, 0) / window.length;
      rollingAverages.push(average);
    }

    const fourthPowers = rollingAverages.map(avg => Math.pow(avg, 4));
    const avgFourthPower = fourthPowers.reduce((sum, val) => sum + val, 0) / fourthPowers.length;
    
    return Math.pow(avgFourthPower, 0.25);
  },

  calculatePowerStats(powerData) {
    if (!powerData || powerData.length === 0) {
      return { average: 0, max: 0, min: 0, normalizedPower: 0 };
    }

    const validPowers = powerData.filter(p => p > 0);
    if (validPowers.length === 0) {
      return { average: 0, max: 0, min: 0, normalizedPower: 0 };
    }

    const average = validPowers.reduce((sum, p) => sum + p, 0) / validPowers.length;
    const max = Math.max(...validPowers);
    const min = Math.min(...validPowers);
    const normalizedPower = this.calculateNormalizedPower(validPowers);

    return {
      average: Math.round(average),
      max,
      min,
      normalizedPower: Math.round(normalizedPower)
    };
  }
};

/**
 * Analytics processor functions
 */
const AnalyticsProcessor = {
  /**
   * Process workout analytics
   */
  async processWorkoutAnalytics(workoutData, options = {}) {
    const { ftp = 250, includeZones = true, includePowerCurve = true } = options;
    
    const results = {
      basic: {},
      zones: null,
      powerCurve: null,
      processing: {
        startTime: Date.now(),
        steps: 0,
        totalSteps: 3
      }
    };

    try {
      // Basic power statistics
      results.processing.steps = 1;
      postMessage({
        taskId: null, // Will be set by worker manager
        type: 'progress',
        progress: { step: 1, total: 3, message: 'Calculating basic statistics' }
      });

      const powerData = workoutData.segments?.map(s => s.power) || [];
      const duration = workoutData.duration || powerData.length;

      results.basic = {
        ...PowerCalculations.calculatePowerStats(powerData),
        tss: PowerCalculations.calculateTSS(powerData, duration, ftp),
        duration,
        totalWork: powerData.reduce((sum, p) => sum + p, 0) / 1000 // kJ
      };

      // Power zones analysis
      if (includeZones) {
        results.processing.steps = 2;
        postMessage({
          taskId: null,
          type: 'progress',
          progress: { step: 2, total: 3, message: 'Analyzing power zones' }
        });

        const zones = [
          { min: 0, max: ftp * 0.55, name: 'Recovery' },
          { min: ftp * 0.55, max: ftp * 0.75, name: 'Endurance' },
          { min: ftp * 0.75, max: ftp * 0.90, name: 'Tempo' },
          { min: ftp * 0.90, max: ftp * 1.05, name: 'Threshold' },
          { min: ftp * 1.05, max: ftp * 1.20, name: 'VO2Max' },
          { min: ftp * 1.20, max: Infinity, name: 'Neuromuscular' }
        ];

        results.zones = this.calculateZoneDistribution(powerData, zones);
      }

      // Power curve analysis
      if (includePowerCurve) {
        results.processing.steps = 3;
        postMessage({
          taskId: null,
          type: 'progress',
          progress: { step: 3, total: 3, message: 'Calculating power curve' }
        });

        const durations = [5, 10, 15, 20, 30, 60, 120, 300, 600, 1200, 1800, 3600];
        results.powerCurve = this.calculatePowerCurve(powerData, durations);
      }

      results.processing.endTime = Date.now();
      results.processing.duration = results.processing.endTime - results.processing.startTime;

      return results;

    } catch (error) {
      throw new Error(`Workout analytics processing failed: ${error.message}`);
    }
  },

  /**
   * Process batch analytics for multiple workouts
   */
  async processBatchAnalytics(workouts, options = {}) {
    const { batchSize = 10, ftp = 250 } = options;
    const results = [];
    const totalWorkouts = workouts.length;

    for (let i = 0; i < workouts.length; i += batchSize) {
      const batch = workouts.slice(i, i + batchSize);
      
      // Process batch
      const batchResults = await Promise.all(
        batch.map(async (workout, batchIndex) => {
          const globalIndex = i + batchIndex;
          
          // Report progress
          if (globalIndex % 5 === 0) {
            postMessage({
              taskId: null,
              type: 'progress',
              progress: {
                step: globalIndex + 1,
                total: totalWorkouts,
                message: `Processing workout ${globalIndex + 1}/${totalWorkouts}`
              }
            });
          }

          const result = await this.processWorkoutAnalytics(workout, {
            ftp,
            includeZones: false, // Optimize for batch processing
            includePowerCurve: false
          });

          // Add metadata
          return {
            id: workout.id || `workout-${globalIndex}`,
            name: workout.name,
            date: workout.date,
            analytics: result
          };
        })
      );

      results.push(...batchResults);

      // Yield control periodically
      if (i % 50 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    return {
      workouts: results,
      summary: this.calculateBatchSummary(results),
      processed: results.length,
      processingTime: Date.now()
    };
  },

  /**
   * Calculate training load progression
   */
  async calculateTrainingLoad(workouts, options = {}) {
    const { period = 7, ftp = 250 } = options; // 7-day rolling average
    
    if (!workouts || workouts.length === 0) {
      return { progression: [], current: 0, trend: 'stable' };
    }

    // Sort by date
    const sortedWorkouts = workouts.sort((a, b) => new Date(a.date) - new Date(b.date));
    const progression = [];
    
    for (let i = 0; i < sortedWorkouts.length; i++) {
      // Calculate rolling TSS average
      const windowStart = Math.max(0, i - period + 1);
      const window = sortedWorkouts.slice(windowStart, i + 1);
      
      const totalTSS = window.reduce((sum, workout) => {
        const powerData = workout.segments?.map(s => s.power) || [];
        const duration = workout.duration || powerData.length;
        return sum + PowerCalculations.calculateTSS(powerData, duration, ftp);
      }, 0);

      const avgTSS = totalTSS / window.length;
      
      progression.push({
        date: sortedWorkouts[i].date,
        tss: avgTSS,
        workoutCount: window.length,
        rollingAverage: avgTSS
      });

      // Report progress
      if (i % 10 === 0) {
        postMessage({
          taskId: null,
          type: 'progress',
          progress: {
            step: i + 1,
            total: sortedWorkouts.length,
            message: `Processing training load ${i + 1}/${sortedWorkouts.length}`
          }
        });
      }
    }

    // Calculate trend
    const recent = progression.slice(-14); // Last 2 weeks
    const trend = this.calculateTrend(recent);

    return {
      progression,
      current: progression[progression.length - 1]?.tss || 0,
      trend,
      period
    };
  },

  /**
   * Calculate performance trends
   */
  async calculatePerformanceTrends(workouts, options = {}) {
    const { metrics = ['power', 'tss', 'duration'], period = 30 } = options;
    const trends = {};

    for (const metric of metrics) {
      postMessage({
        taskId: null,
        type: 'progress',
        progress: {
          step: metrics.indexOf(metric) + 1,
          total: metrics.length,
          message: `Analyzing ${metric} trends`
        }
      });

      const values = workouts.map(workout => {
        switch (metric) {
          case 'power':
            const powerData = workout.segments?.map(s => s.power) || [];
            return PowerCalculations.calculatePowerStats(powerData).average;
          case 'tss':
            const pd = workout.segments?.map(s => s.power) || [];
            const duration = workout.duration || pd.length;
            return PowerCalculations.calculateTSS(pd, duration, options.ftp || 250);
          case 'duration':
            return workout.duration || 0;
          default:
            return 0;
        }
      });

      trends[metric] = {
        values,
        trend: this.calculateTrend(values.slice(-period)),
        average: values.reduce((sum, v) => sum + v, 0) / values.length,
        recent: values.slice(-7).reduce((sum, v) => sum + v, 0) / Math.min(7, values.length)
      };
    }

    return trends;
  },

  /**
   * Calculate zone distribution
   */
  calculateZoneDistribution(powerData, zones) {
    const zoneCounts = zones.map(() => 0);
    let totalPoints = 0;

    for (const power of powerData) {
      if (power > 0) {
        totalPoints++;
        
        for (let i = 0; i < zones.length; i++) {
          const zone = zones[i];
          if (power >= zone.min && power < zone.max) {
            zoneCounts[i]++;
            break;
          }
        }
      }
    }

    return zones.map((zone, index) => ({
      zone: zone.name,
      count: zoneCounts[index],
      percentage: totalPoints > 0 ? (zoneCounts[index] / totalPoints) * 100 : 0,
      time: zoneCounts[index] // Seconds
    }));
  },

  /**
   * Calculate power curve
   */
  calculatePowerCurve(powerData, durations) {
    const results = [];

    for (const duration of durations) {
      if (duration > powerData.length) continue;

      let maxPower = 0;
      
      for (let i = 0; i <= powerData.length - duration; i++) {
        const window = powerData.slice(i, i + duration);
        const avgPower = window.reduce((sum, val) => sum + val, 0) / window.length;
        maxPower = Math.max(maxPower, avgPower);
      }

      results.push({
        duration,
        power: Math.round(maxPower)
      });
    }

    return results;
  },

  /**
   * Calculate trend from values
   */
  calculateTrend(values) {
    if (values.length < 2) return 'stable';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;

    const change = (secondAvg - firstAvg) / firstAvg;

    if (change > 0.05) return 'improving';
    if (change < -0.05) return 'declining';
    return 'stable';
  },

  /**
   * Calculate batch summary statistics
   */
  calculateBatchSummary(results) {
    const analytics = results.map(r => r.analytics.basic);
    
    return {
      count: results.length,
      averageTSS: analytics.reduce((sum, a) => sum + a.tss, 0) / analytics.length,
      averagePower: analytics.reduce((sum, a) => sum + a.average, 0) / analytics.length,
      totalDuration: analytics.reduce((sum, a) => sum + a.duration, 0),
      totalWork: analytics.reduce((sum, a) => sum + a.totalWork, 0)
    };
  }
};

/**
 * Worker message handler
 */
self.onmessage = async function(event) {
  const { taskId, operation, data, options } = event.data;

  try {
    let result;

    switch (operation) {
      case 'processWorkout':
        result = await AnalyticsProcessor.processWorkoutAnalytics(data, options);
        break;

      case 'processBatch':
        result = await AnalyticsProcessor.processBatchAnalytics(data, options);
        break;

      case 'calculateTrainingLoad':
        result = await AnalyticsProcessor.calculateTrainingLoad(data, options);
        break;

      case 'calculateTrends':
        result = await AnalyticsProcessor.calculatePerformanceTrends(data, options);
        break;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    // Send success response
    self.postMessage({
      taskId,
      type: 'success',
      result
    });

  } catch (error) {
    // Send error response
    self.postMessage({
      taskId,
      type: 'error',
      error: error.message
    });
  }
};