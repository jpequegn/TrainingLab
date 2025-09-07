/**
 * High-Performance Power Calculations Module
 * WebAssembly-accelerated power analysis and metrics computation
 */

import { wasmLoader } from './wasm-loader.js';

/**
 * JavaScript fallback implementations for power calculations
 */
const PowerCalculationsFallback = {
  /**
   * Calculate Training Stress Score (TSS)
   * @param {Array} powerData - Array of power values in watts
   * @param {number} duration - Duration in seconds
   * @param {number} ftp - Functional Threshold Power
   * @param {number} intensityFactor - Intensity Factor (IF)
   * @returns {number} TSS value
   */
  calculateTSS(powerData, duration, ftp, intensityFactor = null) {
    if (!powerData || !powerData.length || !ftp || duration <= 0) {
      return 0;
    }

    // Calculate Normalized Power (NP) if not provided
    const normalizedPower = this.calculateNormalizedPower(powerData);
    
    // Calculate Intensity Factor if not provided
    const IF = intensityFactor || (normalizedPower / ftp);
    
    // TSS = (duration in hours × NP × IF) / (FTP × 3600) × 100
    const durationHours = duration / 3600;
    const tss = (durationHours * normalizedPower * IF) / ftp * 100;
    
    return Math.round(tss * 10) / 10; // Round to 1 decimal place
  },

  /**
   * Calculate Normalized Power (NP)
   * @param {Array} powerData - Array of power values
   * @returns {number} Normalized Power
   */
  calculateNormalizedPower(powerData) {
    if (!powerData || powerData.length === 0) return 0;

    // 30-second rolling average
    const rollingWindow = 30;
    const rollingAverages = [];
    
    for (let i = 0; i < powerData.length; i++) {
      const start = Math.max(0, i - rollingWindow + 1);
      const window = powerData.slice(start, i + 1);
      const average = window.reduce((sum, val) => sum + val, 0) / window.length;
      rollingAverages.push(average);
    }

    // Raise each 30s average to 4th power
    const fourthPowers = rollingAverages.map(avg => Math.pow(avg, 4));
    
    // Average of 4th powers
    const avgFourthPower = fourthPowers.reduce((sum, val) => sum + val, 0) / fourthPowers.length;
    
    // Take 4th root
    return Math.pow(avgFourthPower, 0.25);
  },

  /**
   * Calculate power curve data points
   * @param {Array} powerData - Power data array
   * @param {Array} durations - Target durations in seconds
   * @returns {Array} Power curve data points
   */
  calculatePowerCurve(powerData, durations = [5, 10, 15, 20, 30, 60, 120, 300, 600, 1200, 1800, 3600]) {
    if (!powerData || powerData.length === 0) return [];

    const results = [];

    for (const duration of durations) {
      if (duration > powerData.length) continue;

      let maxPower = 0;
      
      // Find maximum average power for this duration
      for (let i = 0; i <= powerData.length - duration; i++) {
        const window = powerData.slice(i, i + duration);
        const avgPower = window.reduce((sum, val) => sum + val, 0) / window.length;
        maxPower = Math.max(maxPower, avgPower);
      }

      results.push({
        duration,
        power: Math.round(maxPower),
        label: this.formatDuration(duration)
      });
    }

    return results;
  },

  /**
   * Calculate power distribution across zones
   * @param {Array} powerData - Power data array
   * @param {Array} zones - Power zones [{ min, max, name }]
   * @returns {Array} Zone distribution data
   */
  calculateZoneDistribution(powerData, zones) {
    if (!powerData || !zones) return [];

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
      time: zoneCounts[index] // Assuming 1 second intervals
    }));
  },

  /**
   * Calculate power statistics
   * @param {Array} powerData - Power data array
   * @returns {Object} Power statistics
   */
  calculatePowerStats(powerData) {
    if (!powerData || powerData.length === 0) {
      return {
        average: 0,
        max: 0,
        min: 0,
        normalizedPower: 0,
        variabilityIndex: 0,
        totalWork: 0
      };
    }

    const validPowers = powerData.filter(p => p > 0);
    
    if (validPowers.length === 0) {
      return {
        average: 0,
        max: 0,
        min: 0,
        normalizedPower: 0,
        variabilityIndex: 0,
        totalWork: 0
      };
    }

    const average = validPowers.reduce((sum, p) => sum + p, 0) / validPowers.length;
    const max = Math.max(...validPowers);
    const min = Math.min(...validPowers);
    const normalizedPower = this.calculateNormalizedPower(validPowers);
    const variabilityIndex = normalizedPower > 0 ? normalizedPower / average : 0;
    const totalWork = validPowers.reduce((sum, p) => sum + p, 0); // kJ if 1s intervals

    return {
      average: Math.round(average),
      max,
      min,
      normalizedPower: Math.round(normalizedPower),
      variabilityIndex: Math.round(variabilityIndex * 100) / 100,
      totalWork: Math.round(totalWork / 1000 * 10) / 10 // Convert to kJ
    };
  },

  /**
   * Calculate Critical Power model
   * @param {Array} powerCurveData - Power curve data points
   * @returns {Object} Critical Power model parameters
   */
  calculateCriticalPower(powerCurveData) {
    if (!powerCurveData || powerCurveData.length < 3) {
      return { cp: 0, wPrime: 0, rSquared: 0 };
    }

    // Use 2-parameter model: Power = CP + W'/Duration
    // Transform to linear form: Power × Duration = CP × Duration + W'
    const x = []; // Duration
    const y = []; // Power × Duration

    for (const point of powerCurveData) {
      if (point.duration > 0 && point.power > 0) {
        x.push(point.duration);
        y.push(point.power * point.duration);
      }
    }

    if (x.length < 3) return { cp: 0, wPrime: 0, rSquared: 0 };

    // Linear regression
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const cp = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const wPrime = (sumY - cp * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const totalSS = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const residualSS = x.reduce((sum, xi, i) => {
      const predicted = cp * xi + wPrime;
      return sum + Math.pow(y[i] - predicted, 2);
    }, 0);
    const rSquared = 1 - (residualSS / totalSS);

    return {
      cp: Math.round(cp),
      wPrime: Math.round(wPrime),
      rSquared: Math.round(rSquared * 1000) / 1000
    };
  },

  /**
   * Format duration for display
   * @param {number} seconds - Duration in seconds
   * @returns {string} Formatted duration
   */
  formatDuration(seconds) {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    return `${Math.floor(seconds / 3600)}h${Math.floor((seconds % 3600) / 60)}m`;
  },

  /**
   * Batch process large datasets
   * @param {Array} powerDataSets - Array of power data arrays
   * @param {Function} processor - Processing function
   * @param {number} batchSize - Batch size for processing
   * @returns {Promise<Array>} Processed results
   */
  async batchProcess(powerDataSets, processor, batchSize = 10) {
    const results = [];
    
    for (let i = 0; i < powerDataSets.length; i += batchSize) {
      const batch = powerDataSets.slice(i, i + batchSize);
      
      // Process batch
      const batchResults = await Promise.all(
        batch.map(async (data, index) => {
          const result = processor(data, i + index);
          
          // Yield control back to main thread
          if ((i + index) % 100 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
          
          return result;
        })
      );
      
      results.push(...batchResults);
    }
    
    return results;
  }
};

/**
 * High-Performance Power Calculations class
 */
export class PowerCalculations {
  constructor() {
    this.module = null;
    this.isLoaded = false;
    this.loadPromise = null;
  }

  /**
   * Initialize power calculations module
   */
  async initialize() {
    if (this.isLoaded) return;
    
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this.loadModule();
    await this.loadPromise;
  }

  /**
   * Load the WASM module with fallback
   * @private
   */
  async loadModule() {
    try {
      // In production, this would load actual WASM file
      const wasmPath = '/assets/wasm/power-calculations.wasm';
      
      this.module = await wasmLoader.loadModule(
        'power-calculations',
        wasmPath,
        PowerCalculationsFallback
      );

      this.isLoaded = true;
      console.log(`Power calculations loaded: ${this.module.type} mode`);
      
    } catch (error) {
      console.warn('Failed to load power calculations module:', error);
      this.module = await wasmLoader.loadModule(
        'power-calculations',
        null,
        PowerCalculationsFallback
      );
      this.isLoaded = true;
    }
  }

  /**
   * Calculate TSS with performance optimization
   */
  async calculateTSS(powerData, duration, ftp, intensityFactor = null) {
    await this.initialize();
    return this.module.exports.calculateTSS(powerData, duration, ftp, intensityFactor);
  }

  /**
   * Calculate Normalized Power with performance optimization
   */
  async calculateNormalizedPower(powerData) {
    await this.initialize();
    return this.module.exports.calculateNormalizedPower(powerData);
  }

  /**
   * Calculate power curve with performance optimization
   */
  async calculatePowerCurve(powerData, durations) {
    await this.initialize();
    return this.module.exports.calculatePowerCurve(powerData, durations);
  }

  /**
   * Calculate zone distribution with performance optimization
   */
  async calculateZoneDistribution(powerData, zones) {
    await this.initialize();
    return this.module.exports.calculateZoneDistribution(powerData, zones);
  }

  /**
   * Calculate power statistics with performance optimization
   */
  async calculatePowerStats(powerData) {
    await this.initialize();
    return this.module.exports.calculatePowerStats(powerData);
  }

  /**
   * Calculate Critical Power model
   */
  async calculateCriticalPower(powerCurveData) {
    await this.initialize();
    return this.module.exports.calculateCriticalPower(powerCurveData);
  }

  /**
   * Batch process multiple datasets
   */
  async batchProcess(powerDataSets, processor, batchSize = 10) {
    await this.initialize();
    return this.module.exports.batchProcess(powerDataSets, processor, batchSize);
  }

  /**
   * Get performance information
   */
  getPerformanceInfo() {
    return {
      loaded: this.isLoaded,
      moduleType: this.module?.type,
      wasmSupported: wasmLoader.isSupported
    };
  }

  /**
   * Clean up and destroy module
   */
  destroy() {
    if (this.module) {
      wasmLoader.unloadModule('power-calculations');
      this.module = null;
      this.isLoaded = false;
      this.loadPromise = null;
    }
  }
}

// Export singleton instance
export const powerCalculations = new PowerCalculations();