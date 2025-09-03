import { describe, it, expect, vi } from 'vitest';

// Mock powerZoneManager
const mockZoneModels = {
  coggan: {
    name: 'Coggan 7-Zone Model',
    description: 'Traditional power-based training zones',
    zones: {
      zone1: { min: 0.0, max: 0.55, name: 'Active Recovery', color: '#90EE90', description: 'Very easy spinning' },
      zone2: { min: 0.56, max: 0.75, name: 'Endurance', color: '#87CEEB', description: 'Aerobic base' },
      zone3: { min: 0.76, max: 0.9, name: 'Tempo', color: '#FFD700', description: 'Aerobic threshold' },
      zone4: { min: 0.91, max: 1.05, name: 'Lactate Threshold', color: '#FFA500', description: 'Sustainable for ~1 hour' },
      zone5: { min: 1.06, max: 1.2, name: 'VO2 Max', color: '#FF6347', description: 'Aerobic power' },
      zone6: { min: 1.21, max: 1.5, name: 'Anaerobic Capacity', color: '#FF4500', description: 'Anaerobic power' },
      zone7: { min: 1.51, max: 3.0, name: 'Neuromuscular Power', color: '#8B0000', description: 'Sprint power' },
    },
  },
};

vi.mock('../../src/core/power-zones.js', () => ({
  powerZoneManager: {
    getAvailableModels: vi.fn(() => mockZoneModels),
  },
}));

import { ZoneCalculator } from '../../src/services/zone-calculator.js';

// Test constants
const TEST_CONSTANTS = {
  FTP: 250,
  ZONE_COUNT: 7,
  DURATION_5_MIN: 300,
  DURATION_10_MIN: 600,
  DURATION_3_MIN: 180,
  DURATION_15_MIN: 900,
  DURATION_30_MIN: 1800,
  DURATION_1_HOUR: 3600,
  POWER_150: 150,
  POWER_200: 200,
  POWER_250: 250,
  POWER_300: 300,
  POWER_350: 350,
  POWER_100: 100,
  NEGATIVE_POWER: -50,
  NEGATIVE_DURATION: -100,
  TSS_100: 100
};

describe('ZoneCalculator', () => {
  const testFTP = TEST_CONSTANTS.FTP;

  describe('Zone Calculations', () => {
    it('should calculate Coggan 7-zone model correctly', () => {
      const zones = ZoneCalculator.calculateZones(testFTP, 'coggan');
      
      expect(zones).toBeDefined();
      expect(zones.ftp).toBe(testFTP);
      expect(zones.model).toBe('coggan');
      expect(zones.zones).toBeDefined();
      expect(Object.keys(zones.zones)).toHaveLength(TEST_CONSTANTS.ZONE_COUNT);
      
      // Check specific zones
      expect(zones.zones.zone1.min).toBe(0);
      expect(zones.zones.zone1.max).toBeCloseTo(0.55);
      expect(zones.zones.zone4.min).toBeCloseTo(0.91);
      expect(zones.zones.zone4.max).toBeCloseTo(1.05);
    });

    it('should calculate zones in watts correctly', () => {
      const zones = ZoneCalculator.calculateZones(testFTP, 'coggan');
      
      expect(zones.zones.zone1.minWatts).toBe(0);
      expect(zones.zones.zone1.maxWatts).toBe(Math.round(testFTP * 0.55));
      expect(zones.zones.zone4.minWatts).toBe(Math.round(testFTP * 0.91));
      expect(zones.zones.zone4.maxWatts).toBe(Math.round(testFTP * 1.05));
    });

    it('should include zone metadata', () => {
      const zones = ZoneCalculator.calculateZones(testFTP, 'coggan');
      
      Object.values(zones.zones).forEach(zone => {
        expect(zone).toHaveProperty('name');
        expect(zone).toHaveProperty('description');
        expect(zone).toHaveProperty('color');
        expect(zone).toHaveProperty('min');
        expect(zone).toHaveProperty('max');
      });
    });

    it('should calculate statistics correctly', () => {
      const zones = ZoneCalculator.calculateZones(testFTP, 'coggan');
      
      expect(Object.keys(zones.zones)).toHaveLength(TEST_CONSTANTS.ZONE_COUNT);
      expect(zones.zones.zone1.minWatts).toBe(0);
      expect(zones.zones.zone7.maxWatts).toBe(Math.round(testFTP * 3.0));
    });

    it('should include model information', () => {
      const zones = ZoneCalculator.calculateZones(testFTP, 'coggan');
      
      expect(zones.modelInfo).toBeDefined();
      expect(zones.modelInfo.name).toBe('Coggan 7-Zone Model');
      expect(zones.modelInfo.description).toContain('zones');
    });

    it('should handle different FTP values', () => {
      const ftpValues = [100, 200, 300, 400];
      
      ftpValues.forEach(ftp => {
        const zones = ZoneCalculator.calculateZones(ftp, 'coggan');
        expect(zones.ftp).toBe(ftp);
        expect(zones.zones.zone4.maxWatts).toBe(Math.round(ftp * 1.05));
      });
    });
  });

  describe('Zone for Power', () => {
    const {zones} = ZoneCalculator.calculateZones(testFTP, 'coggan');

    it('should identify correct zone for given power', () => {
      const testCases = [
        { power: 50, expectedZone: 'zone1' },
        { power: 150, expectedZone: 'zone2' },
        { power: 200, expectedZone: 'zone3' },
        { power: 250, expectedZone: 'zone4' },
        { power: 300, expectedZone: 'zone5' },
        { power: 350, expectedZone: 'zone6' },
        { power: 400, expectedZone: 'zone7' },
      ];
      
      testCases.forEach(({ power, expectedZone }) => {
        const zone = ZoneCalculator.getZoneForPower(power, testFTP, zones);
        expect(zone.id).toBe(expectedZone);
      });
    });

    it('should handle power at zone boundaries', () => {
      const zone2Max = Math.round(testFTP * 0.75);
      const zone2 = ZoneCalculator.getZoneForPower(zone2Max, testFTP, zones);
      const zone3 = ZoneCalculator.getZoneForPower(zone2Max + 1, testFTP, zones);
      
      expect(zone2.id).toBe('zone2');
      expect(zone3.id).toBe('zone3');
    });

    it('should handle power below Zone 1', () => {
      const zone = ZoneCalculator.getZoneForPower(0, testFTP, zones);
      expect(zone.id).toBe('zone1');
    });

    it('should handle power above Zone 7', () => {
      const zone = ZoneCalculator.getZoneForPower(1000, testFTP, zones);
      expect(zone.id).toBe('zone7');
    });

    it('should return null for invalid inputs', () => {
      expect(ZoneCalculator.getZoneForPower(-50, testFTP, zones)).toBeNull();
      expect(ZoneCalculator.getZoneForPower(200, null, zones)).toBeNull();
      expect(ZoneCalculator.getZoneForPower(200, testFTP, null)).toBeNull();
    });
  });

  describe('Zone Colors', () => {
    const {zones} = ZoneCalculator.calculateZones(testFTP, 'coggan');

    it('should return correct zone color for power', () => {
      const testCases = [
        { power: 50, expectedColor: zones.zone1.color },
        { power: 250, expectedColor: zones.zone4.color },
        { power: 400, expectedColor: zones.zone7.color },
      ];
      
      testCases.forEach(({ power, expectedColor }) => {
        const color = ZoneCalculator.getZoneColor(power, testFTP, zones);
        expect(color).toBe(expectedColor);
      });
    });

    it('should return default color for invalid inputs', () => {
      const defaultColor = '#cccccc';
      
      expect(ZoneCalculator.getZoneColor(-50, testFTP, zones)).toBe(defaultColor);
      expect(ZoneCalculator.getZoneColor(200, null, zones)).toBe(defaultColor);
      expect(ZoneCalculator.getZoneColor(200, testFTP, null)).toBe(defaultColor);
    });
  });

  describe('Time in Zones Calculation', () => {
    const {zones} = ZoneCalculator.calculateZones(testFTP, 'coggan');
    
    const sampleSegments = [
      { power: TEST_CONSTANTS.POWER_150, duration: TEST_CONSTANTS.DURATION_5_MIN }, // Zone 2, 5 minutes
      { power: TEST_CONSTANTS.POWER_250, duration: TEST_CONSTANTS.DURATION_10_MIN }, // Zone 4, 10 minutes
      { power: TEST_CONSTANTS.POWER_350, duration: TEST_CONSTANTS.DURATION_3_MIN }, // Zone 6, 3 minutes
      { power: TEST_CONSTANTS.POWER_100, duration: TEST_CONSTANTS.DURATION_15_MIN }, // Zone 1, 15 minutes
    ];

    it('should calculate time in zones correctly', () => {
      const timeInZones = ZoneCalculator.calculateTimeInZones(sampleSegments, testFTP, zones);
      
      expect(timeInZones).toBeDefined();
      expect(timeInZones.totalTime).toBe(TEST_CONSTANTS.DURATION_5_MIN + TEST_CONSTANTS.DURATION_10_MIN + TEST_CONSTANTS.DURATION_3_MIN + TEST_CONSTANTS.DURATION_15_MIN); // 33 minutes total
      
      // Check specific zone times
      expect(timeInZones.zoneTime.zone1).toBe(TEST_CONSTANTS.DURATION_15_MIN); // 15 minutes
      expect(timeInZones.zoneTime.zone2).toBe(TEST_CONSTANTS.DURATION_5_MIN); // 5 minutes
      expect(timeInZones.zoneTime.zone4).toBe(TEST_CONSTANTS.DURATION_10_MIN); // 10 minutes
      expect(timeInZones.zoneTime.zone6).toBe(TEST_CONSTANTS.DURATION_3_MIN); // 3 minutes
    });

    it('should calculate time percentages correctly', () => {
      const timeInZones = ZoneCalculator.calculateTimeInZones(sampleSegments, testFTP, zones);
      
      expect(timeInZones.zonePercentage.zone1).toBeCloseTo(45.45, 2); // 900/1980
      expect(timeInZones.zonePercentage.zone2).toBeCloseTo(15.15, 2); // 300/1980
      expect(timeInZones.zonePercentage.zone4).toBeCloseTo(30.30, 2); // 600/1980
      expect(timeInZones.zonePercentage.zone6).toBeCloseTo(9.09, 2); // 180/1980
    });

    it('should include zone distribution analysis', () => {
      const timeInZones = ZoneCalculator.calculateTimeInZones(sampleSegments, testFTP, zones);
      
      expect(timeInZones.analysis).toBeDefined();
      expect(timeInZones.analysis.dominantZone).toBe('zone1');
      expect(timeInZones.analysis.workoutType).toBeDefined();
      expect(timeInZones.analysis.intensityScore).toBeGreaterThan(0);
    });

    it('should handle empty segments', () => {
      const timeInZones = ZoneCalculator.calculateTimeInZones([], testFTP, zones);
      
      expect(timeInZones.totalTime).toBe(0);
      expect(Object.values(timeInZones.zoneTime).every(time => time === 0)).toBe(true);
    });

    it('should handle invalid segments', () => {
      const invalidSegments = [
        { power: TEST_CONSTANTS.NEGATIVE_POWER, duration: TEST_CONSTANTS.DURATION_5_MIN }, // Invalid power
        { power: TEST_CONSTANTS.POWER_250, duration: TEST_CONSTANTS.NEGATIVE_DURATION }, // Invalid duration
        { duration: TEST_CONSTANTS.DURATION_5_MIN }, // Missing power
        { power: TEST_CONSTANTS.POWER_250 }, // Missing duration
      ];
      
      const timeInZones = ZoneCalculator.calculateTimeInZones(invalidSegments, testFTP, zones);
      
      // Should handle gracefully and return valid structure
      expect(timeInZones).toBeDefined();
      expect(timeInZones.totalTime).toBe(0);
    });
  });

  describe('Zone Recommendations', () => {
    it('should provide zone-based training recommendations', () => {
      const recommendations = ZoneCalculator.getZoneRecommendations();
      
      expect(recommendations).toBeDefined();
      expect(Object.keys(recommendations)).toContain('endurance');
      expect(Object.keys(recommendations)).toContain('tempo');
      expect(Object.keys(recommendations)).toContain('threshold');
      expect(Object.keys(recommendations)).toContain('vo2max');
      expect(Object.keys(recommendations)).toContain('neuromuscular');
      
      // Check structure of each recommendation
      Object.values(recommendations).forEach(rec => {
        expect(rec).toHaveProperty('zones');
        expect(rec).toHaveProperty('description');
        expect(rec).toHaveProperty('duration');
        expect(rec).toHaveProperty('frequency');
        expect(rec).toHaveProperty('benefits');
      });
    });

    it('should include specific training zones for each workout type', () => {
      const recommendations = ZoneCalculator.getZoneRecommendations();
      
      expect(recommendations.endurance.zones).toEqual(['zone1', 'zone2']);
      expect(recommendations.tempo.zones).toEqual(['zone3']);
      expect(recommendations.threshold.zones).toEqual(['zone4']);
      expect(recommendations.vo2max.zones).toEqual(['zone5']);
    });
  });

  describe('Power Zone Models', () => {
    it('should support multiple zone models', () => {
      const availableModels = ZoneCalculator.getAvailableModels();
      
      expect(availableModels).toBeDefined();
      expect(availableModels).toContain('coggan');
      expect(Array.isArray(availableModels)).toBe(true);
    });

    it('should default to Coggan model for invalid model', () => {
      const zones = ZoneCalculator.calculateZones(testFTP, 'invalid-model');
      
      expect(zones.model).toBe('coggan');
      expect(Object.keys(zones.zones)).toHaveLength(TEST_CONSTANTS.ZONE_COUNT);
    });

    it('should provide model information', () => {
      const modelInfo = ZoneCalculator.getModelInfo('coggan');
      
      expect(modelInfo).toBeDefined();
      expect(modelInfo.name).toBe('Coggan 7-Zone Power Model');
      expect(modelInfo.description).toContain('zones');
      expect(modelInfo.source).toBe('Dr. Andrew Coggan');
    });
  });

  describe('Utility Functions', () => {
    it('should format zone display names correctly', () => {
      expect(ZoneCalculator.formatZoneName('zone1')).toBe('Zone 1');
      expect(ZoneCalculator.formatZoneName('zone4')).toBe('Zone 4');
      expect(ZoneCalculator.formatZoneName('invalid')).toBe('Unknown Zone');
    });

    it('should calculate zone width correctly', () => {
      const {zones} = ZoneCalculator.calculateZones(testFTP, 'coggan');
      
      const zone2Width = ZoneCalculator.getZoneWidth(zones.zone2, testFTP);
      const expectedWidth = Math.round(testFTP * 0.75) - Math.round(testFTP * 0.56);
      
      expect(zone2Width).toBe(expectedWidth);
    });

    it('should validate FTP values', () => {
      expect(ZoneCalculator.isValidFTP(TEST_CONSTANTS.FTP)).toBe(true);
      expect(ZoneCalculator.isValidFTP(TEST_CONSTANTS.POWER_100)).toBe(true);
      expect(ZoneCalculator.isValidFTP(500)).toBe(true);
      
      expect(ZoneCalculator.isValidFTP(0)).toBe(false);
      expect(ZoneCalculator.isValidFTP(TEST_CONSTANTS.NEGATIVE_POWER)).toBe(false);
      expect(ZoneCalculator.isValidFTP(1000)).toBe(false);
      expect(ZoneCalculator.isValidFTP(null)).toBe(false);
      expect(ZoneCalculator.isValidFTP(undefined)).toBe(false);
      expect(ZoneCalculator.isValidFTP('250')).toBe(false);
    });

    it('should calculate TSS correctly', () => {
      const segments = [
        { power: TEST_CONSTANTS.POWER_250, duration: TEST_CONSTANTS.DURATION_1_HOUR }, // 1 hour at FTP = 100 TSS
        { power: TEST_CONSTANTS.POWER_200, duration: TEST_CONSTANTS.DURATION_30_MIN }, // 30 minutes at 80% FTP
      ];
      
      const tss = ZoneCalculator.calculateTSS(segments, testFTP);
      
      // TSS = (time in hours * NP^4 * IF) / (FTP^4 * 3600) * 100
      // For the first segment: 1 * 250^4 * 1 / (250^4 * 3600) * 100 = 100
      // For the second segment: 0.5 * 200^4 * 0.8 / (250^4 * 3600) * 100 ≈ 20.48
      expect(tss).toBeCloseTo(120.5, 1);
    });

    it('should calculate normalized power correctly', () => {
      const segments = [
        { power: TEST_CONSTANTS.POWER_200, duration: TEST_CONSTANTS.DURATION_30_MIN },
        { power: TEST_CONSTANTS.POWER_300, duration: TEST_CONSTANTS.DURATION_30_MIN },
      ];
      
      const np = ZoneCalculator.calculateNormalizedPower(segments);
      
      // NP should be higher than average power due to variability
      const avgPower = (200 + 300) / 2; // 250W
      expect(np).toBeGreaterThan(avgPower);
      expect(np).toBeLessThan(300);
    });

    it('should calculate intensity factor correctly', () => {
      const segments = [{ power: TEST_CONSTANTS.POWER_250, duration: TEST_CONSTANTS.DURATION_1_HOUR }];
      
      const ifactor = ZoneCalculator.calculateIntensityFactor(segments, testFTP);
      
      expect(ifactor).toBeCloseTo(1.0, 2); // 250W / 250W FTP = 1.0
    });
  });

  describe('Error Handling', () => {
    it('should handle null or undefined FTP gracefully', () => {
      expect(() => ZoneCalculator.calculateZones(null, 'coggan')).not.toThrow();
      expect(() => ZoneCalculator.calculateZones(undefined, 'coggan')).not.toThrow();
      
      const zones = ZoneCalculator.calculateZones(null, 'coggan');
      expect(zones.ftp).toBe(0);
    });

    it('should handle invalid segment data gracefully', () => {
      const {zones} = ZoneCalculator.calculateZones(testFTP, 'coggan');
      
      const invalidSegments = [
        null,
        undefined,
        { invalid: 'data' },
        { power: 'invalid', duration: 300 },
      ];
      
      expect(() => ZoneCalculator.calculateTimeInZones(invalidSegments, testFTP, zones))
        .not.toThrow();
    });

    it('should return default values for edge cases', () => {
      expect(ZoneCalculator.getZoneForPower(0, 0, {})).toBeNull();
      expect(ZoneCalculator.calculateTSS([], testFTP)).toBe(0);
      expect(ZoneCalculator.calculateNormalizedPower([])).toBe(0);
    });
  });
});