import { describe, it, expect } from 'vitest';
import {
  calculateTSS,
  formatDuration,
  calculateNormalizedPower,
  generateSteadyData,
  generateRampData,
} from '../../workout.js';
import { createMockWorkout } from '../utils/test-helpers.js';

describe('Workout utilities', () => {
  describe('calculateTSS', () => {
    it('should calculate TSS for a simple steady workout', () => {
      const workout = createMockWorkout({
        segments: [
          {
            type: 'SteadyState',
            duration: 3600, // 1 hour
            power: 1.0, // FTP
          },
        ],
        totalDuration: 3600,
      });

      const tss = calculateTSS(workout);
      expect(tss).toBe(100); // 1 hour at FTP = 100 TSS
    });

    it('should calculate TSS for workout with intervals', () => {
      const workout = createMockWorkout({
        segments: [
          {
            type: 'SteadyState',
            duration: 1800, // 30 minutes
            power: 0.7,
          },
          {
            type: 'SteadyState',
            duration: 1800, // 30 minutes
            power: 1.2,
          },
        ],
        totalDuration: 3600,
      });

      const tss = calculateTSS(workout);
      expect(tss).toBeGreaterThan(0);
      expect(typeof tss).toBe('number');
    });

    it('should handle workout with ramp segments', () => {
      const workout = createMockWorkout({
        segments: [
          {
            type: 'Warmup',
            duration: 1200,
            powerLow: 0.5,
            powerHigh: 0.8,
          },
        ],
        totalDuration: 1200,
      });

      const tss = calculateTSS(workout);
      expect(tss).toBeGreaterThan(0);
      expect(typeof tss).toBe('number');
    });

    it('should return 0 for empty workout', () => {
      const workout = createMockWorkout({
        segments: [],
        totalDuration: 0,
      });

      const tss = calculateTSS(workout);
      expect(tss).toBe(0);
    });

    it('should handle workout with nested interval arrays', () => {
      const workout = createMockWorkout({
        segments: [
          [
            { type: 'Interval (On)', duration: 30, power: 1.2 },
            { type: 'Interval (Off)', duration: 30, power: 0.4 },
            { type: 'Interval (On)', duration: 30, power: 1.2 },
            { type: 'Interval (Off)', duration: 30, power: 0.4 },
          ],
        ],
        totalDuration: 120,
      });

      const tss = calculateTSS(workout);
      expect(tss).toBeGreaterThan(0);
    });

    it('should handle segments with zero duration', () => {
      const workout = createMockWorkout({
        segments: [
          { type: 'SteadyState', duration: 0, power: 1.0 },
          { type: 'SteadyState', duration: 3600, power: 0.8 },
        ],
        totalDuration: 3600,
      });

      const tss = calculateTSS(workout);
      expect(tss).toBeGreaterThan(0);
    });

    it('should handle segments without power values', () => {
      const workout = createMockWorkout({
        segments: [
          { type: 'SteadyState', duration: 1800 }, // No power specified
        ],
        totalDuration: 1800,
      });

      const tss = calculateTSS(workout);
      expect(tss).toBeGreaterThan(0);
    });
  });

  describe('formatDuration', () => {
    it('should format seconds correctly', () => {
      expect(formatDuration(0)).toBe('0:00');
      expect(formatDuration(30)).toBe('0:30');
      expect(formatDuration(60)).toBe('1:00');
      expect(formatDuration(90)).toBe('1:30');
      expect(formatDuration(3600)).toBe('1:00:00');
      expect(formatDuration(3661)).toBe('1:01:01');
      expect(formatDuration(7323)).toBe('2:02:03');
    });

    it('should handle edge cases', () => {
      expect(formatDuration(-1)).toBe('0:00');
      expect(formatDuration(NaN)).toBe('0:00');
      expect(formatDuration(undefined)).toBe('0:00');
      expect(formatDuration(null)).toBe('0:00');
    });

    it('should handle large durations', () => {
      expect(formatDuration(36000)).toBe('10:00:00'); // 10 hours
      expect(formatDuration(359999)).toBe('99:59:59'); // Nearly 100 hours
    });

    it('should handle decimal seconds', () => {
      expect(formatDuration(60.7)).toBe('1:00'); // Should floor to whole seconds
      expect(formatDuration(90.9)).toBe('1:30');
    });
  });

  describe('calculateNormalizedPower', () => {
    it('should calculate normalized power for steady power', () => {
      const powerData = new Array(60).fill(250); // 1 minute at 250W
      const np = calculateNormalizedPower(powerData);
      expect(np).toBe(250);
    });

    it('should handle varying power data', () => {
      const powerData = [200, 300, 250, 400, 150, 300, 250];
      for (let i = 0; i < 30; i++) powerData.push(250); // Extend to 37 data points

      const np = calculateNormalizedPower(powerData);
      expect(np).toBeGreaterThan(0);
      expect(typeof np).toBe('number');
    });

    it('should fallback to average for short workouts', () => {
      const powerData = [200, 300, 250]; // Less than 30 data points
      const np = calculateNormalizedPower(powerData);
      expect(np).toBe(250); // Average of 200, 300, 250
    });

    it('should handle empty power data', () => {
      const powerData = [];
      const np = calculateNormalizedPower(powerData);
      expect(isNaN(np)).toBe(true); // Should return NaN for empty array
    });

    it('should handle single data point', () => {
      const powerData = [250];
      const np = calculateNormalizedPower(powerData);
      expect(np).toBe(250);
    });
  });

  describe('generateSteadyData', () => {
    it('should generate steady power data', () => {
      const segment = {
        startTime: 0,
        duration: 300,
        power: 0.8,
      };

      const powerData = generateSteadyData(segment);
      expect(Array.isArray(powerData)).toBe(true);
      expect(powerData.length).toBeGreaterThan(0);

      // All y values should be approximately the same (steady state)
      const firstValue = powerData[0].y;
      powerData.forEach(point => {
        expect(Math.abs(point.y - firstValue)).toBeLessThan(0.01);
        expect(point.y).toBe(80); // 0.8 * 100
        expect(typeof point.x).toBe('number');
      });
    });

    it('should handle zero duration', () => {
      const segment = {
        startTime: 0,
        duration: 0,
        power: 0.8,
      };

      const powerData = generateSteadyData(segment);
      expect(Array.isArray(powerData)).toBe(true);
      expect(powerData.length).toBe(2); // Minimum 2 points
    });

    it('should handle missing power value', () => {
      const segment = {
        startTime: 0,
        duration: 300,
      };

      const powerData = generateSteadyData(segment);
      expect(Array.isArray(powerData)).toBe(true);
      expect(powerData.length).toBeGreaterThan(0);
      expect(powerData[0]).toHaveProperty('x');
      expect(powerData[0]).toHaveProperty('y');
    });
  });

  describe('generateRampData', () => {
    it('should generate ramping power data', () => {
      const segment = {
        startTime: 0,
        duration: 300,
        powerLow: 0.5,
        powerHigh: 1.0,
      };

      const powerData = generateRampData(segment);
      expect(Array.isArray(powerData)).toBe(true);
      expect(powerData.length).toBeGreaterThan(0);

      // First value should be close to powerLow, last to powerHigh
      const firstValue = powerData[0];
      const lastValue = powerData[powerData.length - 1];

      expect(firstValue.y).toBeCloseTo(50, 1); // 0.5 * 100
      expect(lastValue.y).toBeCloseTo(100, 1); // 1.0 * 100
      expect(typeof firstValue.x).toBe('number');
      expect(typeof lastValue.x).toBe('number');
    });

    it('should handle zero duration', () => {
      const segment = {
        startTime: 0,
        duration: 0,
        powerLow: 0.5,
        powerHigh: 1.0,
      };

      const powerData = generateRampData(segment);
      expect(Array.isArray(powerData)).toBe(true);
      expect(powerData.length).toBe(2); // Minimum 2 points
    });

    it('should handle equal power values (flat ramp)', () => {
      const segment = {
        startTime: 0,
        duration: 300,
        powerLow: 0.7,
        powerHigh: 0.7,
      };

      const powerData = generateRampData(segment);
      expect(Array.isArray(powerData)).toBe(true);
      expect(powerData.length).toBeGreaterThan(0);

      // All y values should be approximately the same
      powerData.forEach(point => {
        expect(point.y).toBeCloseTo(70, 1); // 0.7 * 100
        expect(typeof point.x).toBe('number');
      });
    });

    it('should create descending ramp when powerLow > powerHigh', () => {
      const segment = {
        startTime: 0,
        duration: 300,
        powerLow: 1.0,
        powerHigh: 0.5,
      };

      const powerData = generateRampData(segment);
      expect(Array.isArray(powerData)).toBe(true);
      expect(powerData.length).toBeGreaterThan(0);

      const firstValue = powerData[0];
      const lastValue = powerData[powerData.length - 1];

      expect(firstValue.y).toBeCloseTo(100, 1); // 1.0 * 100
      expect(lastValue.y).toBeCloseTo(50, 1); // 0.5 * 100
      expect(firstValue.y).toBeGreaterThan(lastValue.y);
    });
  });
});
