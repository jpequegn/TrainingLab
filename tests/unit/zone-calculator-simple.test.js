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

describe('ZoneCalculator - Basic Tests', () => {
  const testFTP = 250;

  describe('Basic Zone Calculations', () => {
    it('should calculate zones with FTP and model', () => {
      const zones = ZoneCalculator.calculateZones(testFTP, 'coggan');
      
      expect(zones).toBeDefined();
      expect(zones.ftp).toBe(testFTP);
      expect(zones.model).toBe('coggan');
      expect(zones.zones).toBeDefined();
      expect(Object.keys(zones.zones)).toHaveLength(7);
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

    it('should calculate zones in watts', () => {
      const zones = ZoneCalculator.calculateZones(testFTP, 'coggan');
      
      expect(zones.zones.zone1.minWatts).toBe(0);
      expect(zones.zones.zone1.maxWatts).toBe(Math.round(testFTP * 0.55));
      expect(zones.zones.zone4.minWatts).toBe(Math.round(testFTP * 0.91));
      expect(zones.zones.zone4.maxWatts).toBe(Math.round(testFTP * 1.05));
    });

    it('should include model information', () => {
      const zones = ZoneCalculator.calculateZones(testFTP, 'coggan');
      
      expect(zones.modelInfo).toBeDefined();
      expect(zones.modelInfo.name).toBe('Coggan 7-Zone Model');
      expect(zones.modelInfo.description).toContain('zones');
    });

    it('should handle invalid FTP gracefully', () => {
      expect(() => ZoneCalculator.calculateZones(0, 'coggan')).toThrow('FTP must be a positive number');
      expect(() => ZoneCalculator.calculateZones(-50, 'coggan')).toThrow('FTP must be a positive number');
    });

    it('should handle invalid model gracefully', () => {
      expect(() => ZoneCalculator.calculateZones(testFTP, 'invalid-model')).toThrow('Unknown zone model');
    });

    it('should work with different FTP values', () => {
      const ftpValues = [100, 200, 300, 400];
      
      ftpValues.forEach(ftp => {
        const zones = ZoneCalculator.calculateZones(ftp, 'coggan');
        expect(zones.ftp).toBe(ftp);
        expect(zones.zones.zone4.maxWatts).toBe(Math.round(ftp * 1.05));
      });
    });
  });
});