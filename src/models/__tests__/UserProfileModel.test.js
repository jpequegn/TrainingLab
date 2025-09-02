/**
 * Unit tests for UserProfileModel
 * Tests for user profile model functionality and data integrity
 */

import { UserProfileModel } from '../UserProfileModel.js';

// Mock Date for consistent testing
const mockDate = new Date('2024-01-15T10:00:00.000Z');
const originalDate = Date;

// Test suite for UserProfileModel
describe('UserProfileModel', () => {
  let userProfile;

  beforeEach(() => {
    // Mock Date constructor
    global.Date = jest.fn(() => mockDate);
    global.Date.now = jest.fn(() => mockDate.getTime());
    Object.assign(Date, originalDate);

    // Create fresh profile instance for each test
    userProfile = new UserProfileModel();
  });

  afterEach(() => {
    // Restore original Date
    global.Date = originalDate;
  });

  describe('Constructor and Initialization', () => {
    test('should create instance with default values', () => {
      expect(userProfile).toBeInstanceOf(UserProfileModel);
      expect(userProfile.id).toBeDefined();
      expect(userProfile.ftp).toBe(250);
      expect(userProfile.weight).toBe(70);
      expect(userProfile.created).toEqual(mockDate);
      expect(userProfile.lastActive).toEqual(mockDate);
    });

    test('should create instance with provided data', () => {
      const testData = {
        id: 'test-user-123',
        name: 'John Doe',
        email: 'john@example.com',
        ftp: 300,
        weight: 75,
      };

      const profile = new UserProfileModel(testData);

      expect(profile.id).toBe('test-user-123');
      expect(profile.name).toBe('John Doe');
      expect(profile.email).toBe('john@example.com');
      expect(profile.ftp).toBe(300);
      expect(profile.weight).toBe(75);
    });

    test('should generate unique IDs for different instances', () => {
      const profile1 = new UserProfileModel();
      const profile2 = new UserProfileModel();

      expect(profile1.id).toBeDefined();
      expect(profile2.id).toBeDefined();
      expect(profile1.id).not.toBe(profile2.id);
    });

    test('should calculate power zones correctly on initialization', () => {
      const profile = new UserProfileModel({ ftp: 250 });

      expect(profile.powerZones.ftp).toBe(250);
      expect(profile.powerZones.zones.active_recovery.max).toBe(138); // 250 * 0.55
      expect(profile.powerZones.zones.threshold.min).toBe(225); // 250 * 0.90
      expect(profile.powerZones.zones.threshold.max).toBe(263); // 250 * 1.05
    });
  });

  describe('FTP Management', () => {
    test('should update FTP and recalculate power zones', () => {
      const oldFTP = userProfile.ftp;
      const newFTP = 280;

      const result = userProfile.updateFTP(newFTP, 'ramp', 'Zwift');

      expect(userProfile.ftp).toBe(newFTP);
      expect(result.oldFTP).toBe(oldFTP);
      expect(result.newFTP).toBe(newFTP);
      expect(result.change).toBe(newFTP - oldFTP);
      expect(result.percentChange).toBe('12.0');

      // Check power zones updated
      expect(userProfile.powerZones.ftp).toBe(newFTP);
      expect(userProfile.powerZones.zones.threshold.min).toBe(252); // 280 * 0.90
    });

    test('should add FTP to history', () => {
      const initialHistoryLength = userProfile.ftpHistory.length;

      userProfile.updateFTP(275, 'manual', 'TrainingLab');

      expect(userProfile.ftpHistory).toHaveLength(initialHistoryLength + 1);

      const latestEntry =
        userProfile.ftpHistory[userProfile.ftpHistory.length - 1];
      expect(latestEntry.value).toBe(275);
      expect(latestEntry.testType).toBe('manual');
      expect(latestEntry.source).toBe('TrainingLab');
      expect(latestEntry.date).toEqual(mockDate);
    });

    test('should get FTP change information', () => {
      // Add some FTP history
      userProfile.ftpHistory = [
        {
          value: 250,
          date: new Date('2024-01-01'),
          testType: 'ramp',
          source: 'Zwift',
        },
        {
          value: 260,
          date: new Date('2024-01-10'),
          testType: 'ramp',
          source: 'TrainingLab',
        },
      ];

      const change = userProfile.getFTPChange();

      expect(change.change).toBe(10);
      expect(change.percentChange).toBe('4.0');
    });

    test('should handle empty FTP history', () => {
      userProfile.ftpHistory = [];

      const change = userProfile.getFTPChange();

      expect(change.change).toBe(0);
      expect(change.date).toBeNull();
    });
  });

  describe('Weight Management', () => {
    test('should update weight', () => {
      const oldWeight = userProfile.weight;
      const newWeight = 72.5;

      const result = userProfile.updateWeight(newWeight);

      expect(userProfile.weight).toBe(newWeight);
      expect(result.oldWeight).toBe(oldWeight);
      expect(result.newWeight).toBe(newWeight);
      expect(result.change).toBe(newWeight - oldWeight);
    });
  });

  describe('HRV Management', () => {
    test('should update HRV data', () => {
      userProfile.updateHRV(50, 'up');

      expect(userProfile.hrv.score).toBe(50);
      expect(userProfile.hrv.trend).toBe('up');
      expect(userProfile.hrv.lastUpdate).toEqual(mockDate);
    });

    test('should default to stable trend', () => {
      userProfile.updateHRV(45);

      expect(userProfile.hrv.trend).toBe('stable');
    });
  });

  describe('Recovery Status Management', () => {
    test('should update recovery status', () => {
      const factors = ['good_sleep', 'low_stress'];

      userProfile.updateRecoveryStatus('ready', 90, factors);

      expect(userProfile.recoveryStatus.status).toBe('ready');
      expect(userProfile.recoveryStatus.score).toBe(90);
      expect(userProfile.recoveryStatus.factors).toEqual(factors);
      expect(userProfile.recoveryStatus.lastUpdate).toEqual(mockDate);
    });
  });

  describe('Training Load Management', () => {
    test('should update training load and calculate ratio', () => {
      userProfile.updateTrainingLoad(120, 100);

      expect(userProfile.trainingLoad.acute).toBe(120);
      expect(userProfile.trainingLoad.chronic).toBe(100);
      expect(userProfile.trainingLoad.ratio).toBe(1.2);
      expect(userProfile.trainingLoad.lastUpdate).toEqual(mockDate);
    });

    test('should handle zero chronic load', () => {
      userProfile.updateTrainingLoad(120, 0);

      expect(userProfile.trainingLoad.ratio).toBe(1.0);
    });
  });

  describe('Dashboard Metrics', () => {
    beforeEach(() => {
      // Set up profile with test data
      userProfile.ftp = 285;
      userProfile.weight = 72;
      userProfile.ftpHistory = [
        {
          value: 280,
          date: new Date('2024-01-01'),
          testType: 'ramp',
          source: 'Zwift',
        },
        {
          value: 285,
          date: new Date('2024-01-10'),
          testType: 'ramp',
          source: 'TrainingLab',
        },
      ];
      userProfile.hrv = { score: 45, trend: 'up', lastUpdate: mockDate };
      userProfile.recoveryStatus = {
        status: 'ready',
        score: 85,
        factors: [],
        lastUpdate: mockDate,
      };
      userProfile.trainingLoad = {
        acute: 120,
        chronic: 110,
        ratio: 1.09,
        lastUpdate: mockDate,
      };
      userProfile.recentTSS = { today: 0, week: 485, average: 69 };
    });

    test('should return properly formatted dashboard metrics', () => {
      const metrics = userProfile.getDashboardMetrics();

      expect(metrics.ftp.value).toBe(285);
      expect(metrics.ftp.unit).toBe('W');
      expect(metrics.ftp.changeType).toBe('positive');

      expect(metrics.weight.value).toBe(72);
      expect(metrics.weight.unit).toBe('kg');

      expect(metrics.hrv.value).toBe(45);
      expect(metrics.hrv.changeType).toBe('positive');

      expect(metrics.recovery.value).toBe(85);
      expect(metrics.recovery.status).toBe('ready');

      expect(metrics.trainingLoad.value).toBe('1.09');
      expect(metrics.trainingLoad.unit).toBe('ATL/CTL');
    });

    test('should return correct training load status', () => {
      // Test different training load ratios
      userProfile.trainingLoad.ratio = 0.7;
      expect(userProfile._getTrainingLoadStatus(0.7)).toBe('Detraining risk');

      userProfile.trainingLoad.ratio = 0.9;
      expect(userProfile._getTrainingLoadStatus(0.9)).toBe(
        'Maintaining fitness'
      );

      userProfile.trainingLoad.ratio = 1.1;
      expect(userProfile._getTrainingLoadStatus(1.1)).toBe('Building fitness');

      userProfile.trainingLoad.ratio = 1.4;
      expect(userProfile._getTrainingLoadStatus(1.4)).toBe('Overreaching risk');
    });

    test('should return correct recovery status text', () => {
      expect(userProfile._getRecoveryStatusText('ready')).toBe(
        'Ready to train'
      );
      expect(userProfile._getRecoveryStatusText('maintenance')).toBe(
        'Light training'
      );
      expect(userProfile._getRecoveryStatusText('overreaching')).toBe(
        'Recovery needed'
      );
      expect(userProfile._getRecoveryStatusText('recovery')).toBe('Rest day');
    });
  });

  describe('Data Serialization', () => {
    test('should serialize to JSON correctly', () => {
      const json = userProfile.toJSON();

      expect(json).toHaveProperty('id', userProfile.id);
      expect(json).toHaveProperty('ftp', userProfile.ftp);
      expect(json).toHaveProperty('weight', userProfile.weight);
      expect(json).toHaveProperty('created');
      expect(json).toHaveProperty('lastActive');
      expect(json.created).toBe(mockDate.toISOString());
    });

    test('should create instance from JSON', () => {
      const originalJson = userProfile.toJSON();
      const newProfile = UserProfileModel.fromJSON(originalJson);

      expect(newProfile.id).toBe(userProfile.id);
      expect(newProfile.ftp).toBe(userProfile.ftp);
      expect(newProfile.weight).toBe(userProfile.weight);
      expect(newProfile.created).toEqual(userProfile.created);
    });
  });

  describe('Validation', () => {
    test('should validate valid profile', () => {
      const validation = userProfile.validate();

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should detect validation errors', () => {
      userProfile.id = '';
      userProfile.ftp = 0;

      const validation = userProfile.validate();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('User ID is required');
      expect(validation.errors).toContain(
        'FTP must be between 50 and 500 watts'
      );
    });

    test('should detect validation warnings', () => {
      userProfile.name = '';
      userProfile.weight = 200;
      userProfile.hrv.score = 5;

      const validation = userProfile.validate();

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('User name is recommended');
      expect(validation.warnings).toContain(
        'Weight seems unusual, please verify'
      );
      expect(validation.warnings).toContain('HRV score seems unusual');
    });
  });

  describe('Power Zone Calculations', () => {
    test('should calculate power zones correctly', () => {
      const zones = userProfile._calculatePowerZones(250);

      expect(zones.ftp).toBe(250);
      expect(zones.zones.active_recovery).toEqual({ min: 0, max: 138 });
      expect(zones.zones.endurance).toEqual({ min: 138, max: 188 });
      expect(zones.zones.tempo).toEqual({ min: 188, max: 225 });
      expect(zones.zones.threshold).toEqual({ min: 225, max: 263 });
      expect(zones.zones.vo2max).toEqual({ min: 263, max: 300 });
      expect(zones.zones.anaerobic).toEqual({ min: 300, max: 375 });
      expect(zones.zones.neuromuscular).toEqual({ min: 375, max: 500 });
    });

    test('should update power zones when FTP changes', () => {
      userProfile.updateFTP(300);

      expect(userProfile.powerZones.zones.threshold.min).toBe(270); // 300 * 0.9
      expect(userProfile.powerZones.zones.threshold.max).toBe(315); // 300 * 1.05
    });
  });

  describe('Edge Cases', () => {
    test('should handle null/undefined values gracefully', () => {
      const profile = new UserProfileModel({
        weight: null,
        email: null,
        hrZones: null,
      });

      expect(profile.weight).toBeNull();
      expect(profile.email).toBeNull();
      expect(profile.hrZones).toBeNull();

      const validation = profile.validate();
      expect(validation.isValid).toBe(true);
    });

    test('should handle empty arrays and objects', () => {
      const profile = new UserProfileModel({
        ftpHistory: [],
        goals: [],
      });

      expect(profile.ftpHistory).toEqual([]);
      expect(profile.goals).toEqual([]);
    });

    test('should update lastActive on profile changes', () => {
      const originalLastActive = userProfile.lastActive;

      // Small delay to ensure different timestamps
      setTimeout(() => {
        global.Date = jest.fn(() => new Date(mockDate.getTime() + 1000));

        userProfile.updateFTP(260);

        expect(userProfile.lastActive.getTime()).toBeGreaterThan(
          originalLastActive.getTime()
        );
      }, 1);
    });
  });
});
