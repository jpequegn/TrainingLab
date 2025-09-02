/**
 * Unit tests for ModelFactory and related utilities
 * Tests for profile creation, validation, and transformation utilities
 */

import {
  ModelFactory,
  ProfileValidator,
  ProfileTransformer,
} from '../ModelFactory.js';
import { UserProfileModel } from '../UserProfileModel.js';

describe('ModelFactory', () => {
  describe('createUserProfile', () => {
    test('should create empty profile with defaults', () => {
      const profile = ModelFactory.createUserProfile();

      expect(profile).toBeInstanceOf(UserProfileModel);
      expect(profile.ftp).toBe(250);
      expect(profile.weight).toBe(70);
      expect(profile.id).toBeDefined();
    });

    test('should create profile with provided data', () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        ftp: 275,
      };

      const profile = ModelFactory.createUserProfile(userData);

      expect(profile.name).toBe('Test User');
      expect(profile.email).toBe('test@example.com');
      expect(profile.ftp).toBe(275);
    });
  });

  describe('createDemoProfile', () => {
    test('should create demo profile with realistic data', () => {
      const profile = ModelFactory.createDemoProfile();

      expect(profile.id).toBe('demo_user_001');
      expect(profile.name).toBe('Alex Thompson');
      expect(profile.email).toBe('demo@traininglab.com');
      expect(profile.ftp).toBe(285);
      expect(profile.weight).toBe(72);
      expect(profile.ftpHistory).toHaveLength(2);
      expect(profile.hrv.score).toBe(45);
      expect(profile.recoveryStatus.status).toBe('ready');
      expect(profile.trainingLoad.ratio).toBe(1.09);
    });

    test('should create demo profile with valid dashboard metrics', () => {
      const profile = ModelFactory.createDemoProfile();
      const metrics = profile.getDashboardMetrics();

      expect(metrics.ftp.value).toBe(285);
      expect(metrics.weight.value).toBe(72);
      expect(metrics.hrv.value).toBe(45);
      expect(metrics.recovery.value).toBe(85);
    });
  });

  describe('fromStorage', () => {
    test('should create profile from valid storage data', () => {
      const storageData = {
        id: 'stored-user-123',
        name: 'Stored User',
        ftp: 260,
        weight: 68,
        created: new Date().toISOString(),
        lastActive: new Date().toISOString(),
      };

      const profile = ModelFactory.fromStorage(storageData);

      expect(profile).toBeInstanceOf(UserProfileModel);
      expect(profile.id).toBe('stored-user-123');
      expect(profile.name).toBe('Stored User');
      expect(profile.ftp).toBe(260);
    });

    test('should throw error for null storage data', () => {
      expect(() => {
        ModelFactory.fromStorage(null);
      }).toThrow('Storage data is required');
    });

    test('should throw error for invalid storage data', () => {
      const invalidData = { invalid: 'data' };

      // Mock UserProfileModel.fromJSON to throw error
      const originalFromJSON = UserProfileModel.fromJSON;
      UserProfileModel.fromJSON = jest.fn(() => {
        throw new Error('Invalid data');
      });

      expect(() => {
        ModelFactory.fromStorage(invalidData);
      }).toThrow('Invalid storage data format');

      // Restore original method
      UserProfileModel.fromJSON = originalFromJSON;
    });
  });

  describe('migrateLegacyProfile', () => {
    test('should migrate legacy profile data', () => {
      const legacyData = {
        userId: 'legacy-123',
        displayName: 'Legacy User',
        functionalThresholdPower: 270,
        bodyWeight: 75,
        created: '2024-01-01T00:00:00Z',
        preferences: { units: 'metric' },
      };

      const profile = ModelFactory.migrateLegacyProfile(legacyData);

      expect(profile.id).toBe('legacy-123');
      expect(profile.name).toBe('Legacy User');
      expect(profile.ftp).toBe(270);
      expect(profile.weight).toBe(75);
      expect(profile.preferences.units).toBe('metric');
    });

    test('should handle missing legacy data with defaults', () => {
      const legacyData = {};

      const profile = ModelFactory.migrateLegacyProfile(legacyData);

      expect(profile.id).toBeDefined();
      expect(profile.ftp).toBe(250); // default
      expect(profile.name).toBe('');
      expect(profile.email).toBeNull();
    });
  });
});

describe('ProfileValidator', () => {
  describe('validateFTP', () => {
    test('should validate correct FTP values', () => {
      const validation = ProfileValidator.validateFTP(250);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.warnings).toHaveLength(0);
    });

    test('should reject non-numeric FTP', () => {
      const validation = ProfileValidator.validateFTP('invalid');

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('FTP must be a number');
    });

    test('should reject FTP below minimum', () => {
      const validation = ProfileValidator.validateFTP(30);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('FTP cannot be less than 50 watts');
    });

    test('should reject FTP above maximum', () => {
      const validation = ProfileValidator.validateFTP(600);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('FTP cannot exceed 500 watts');
    });

    test('should warn for unusually low FTP', () => {
      const validation = ProfileValidator.validateFTP(80);

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('FTP seems low, please verify');
    });

    test('should warn for unusually high FTP', () => {
      const validation = ProfileValidator.validateFTP(450);

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('FTP seems high, please verify');
    });
  });

  describe('validateWeight', () => {
    test('should accept null weight', () => {
      const validation = ProfileValidator.validateWeight(null);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should validate normal weight', () => {
      const validation = ProfileValidator.validateWeight(70);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should reject non-numeric weight', () => {
      const validation = ProfileValidator.validateWeight('invalid');

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Weight must be a number');
    });

    test('should reject weight below minimum', () => {
      const validation = ProfileValidator.validateWeight(25);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Weight cannot be less than 30 kg');
    });

    test('should warn for low weight', () => {
      const validation = ProfileValidator.validateWeight(35);

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('Weight seems low, please verify');
    });

    test('should warn for high weight', () => {
      const validation = ProfileValidator.validateWeight(130);

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('Weight seems high, please verify');
    });
  });

  describe('validateHRV', () => {
    test('should validate normal HRV score', () => {
      const validation = ProfileValidator.validateHRV(45);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should reject non-numeric HRV', () => {
      const validation = ProfileValidator.validateHRV('invalid');

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('HRV score must be a number');
    });

    test('should warn for very low HRV', () => {
      const validation = ProfileValidator.validateHRV(5);

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('HRV score seems very low');
    });

    test('should warn for very high HRV', () => {
      const validation = ProfileValidator.validateHRV(150);

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('HRV score seems very high');
    });
  });

  describe('validateEmail', () => {
    test('should accept null email', () => {
      const validation = ProfileValidator.validateEmail(null);

      expect(validation.isValid).toBe(true);
    });

    test('should validate correct email', () => {
      const validation = ProfileValidator.validateEmail('test@example.com');

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should reject invalid email format', () => {
      const validation = ProfileValidator.validateEmail('invalid-email');

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid email format');
    });
  });

  describe('validateProfile', () => {
    let validProfile;

    beforeEach(() => {
      validProfile = new UserProfileModel({
        id: 'test-123',
        name: 'Test User',
        email: 'test@example.com',
        ftp: 250,
        weight: 70,
      });
      validProfile.hrv = { score: 45 };
    });

    test('should validate complete valid profile', () => {
      const validation = ProfileValidator.validateProfile(validProfile);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should reject non-UserProfileModel instance', () => {
      const validation = ProfileValidator.validateProfile({});

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid profile instance');
    });

    test('should accumulate multiple validation errors', () => {
      validProfile.id = '';
      validProfile.ftp = 0;
      validProfile.email = 'invalid-email';

      const validation = ProfileValidator.validateProfile(validProfile);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(1);
    });
  });
});

describe('ProfileTransformer', () => {
  describe('convertWeight', () => {
    test('should convert kg to lbs', () => {
      const result = ProfileTransformer.convertWeight(70, 'kg', 'lbs');

      expect(result).toBeCloseTo(154.3, 1);
    });

    test('should convert lbs to kg', () => {
      const result = ProfileTransformer.convertWeight(154, 'lbs', 'kg');

      expect(result).toBeCloseTo(69.9, 1);
    });

    test('should return same value for same units', () => {
      const result = ProfileTransformer.convertWeight(70, 'kg', 'kg');

      expect(result).toBe(70);
    });

    test('should throw error for unsupported conversion', () => {
      expect(() => {
        ProfileTransformer.convertWeight(70, 'kg', 'stone');
      }).toThrow('Unsupported conversion: kg to stone');
    });
  });

  describe('formatForDisplay', () => {
    let profile;

    beforeEach(() => {
      profile = new UserProfileModel({
        name: 'Test Athlete',
        ftp: 285,
        weight: 72,
      });
      profile.hrv = { score: 45 };
      profile.recoveryStatus = { score: 85 };
      profile.trainingLoad = { ratio: 1.09 };
      profile.recentTSS = { week: 485 };
    });

    test('should format profile for metric display', () => {
      const formatted = ProfileTransformer.formatForDisplay(profile, {
        units: 'metric',
      });

      expect(formatted.name).toBe('Test Athlete');
      expect(formatted.ftp).toBe('285W');
      expect(formatted.weight).toBe('72.0kg');
      expect(formatted.hrv).toBe('45ms');
      expect(formatted.recoveryScore).toBe('85%');
      expect(formatted.trainingLoadRatio).toBe('1.09');
      expect(formatted.weeklyTSS).toBe(485);
    });

    test('should format profile for imperial display', () => {
      const formatted = ProfileTransformer.formatForDisplay(profile, {
        units: 'imperial',
      });

      expect(formatted.weight).toContain('lbs');
      expect(parseFloat(formatted.weight)).toBeCloseTo(158.7, 0);
    });

    test('should handle null weight', () => {
      profile.weight = null;
      const formatted = ProfileTransformer.formatForDisplay(profile);

      expect(formatted.weight).toBe('Not set');
    });

    test('should handle missing name', () => {
      profile.name = null;
      const formatted = ProfileTransformer.formatForDisplay(profile);

      expect(formatted.name).toBe('Unknown Athlete');
    });

    test('should respect precision option', () => {
      const formatted = ProfileTransformer.formatForDisplay(profile, {
        precision: 2,
      });

      expect(formatted.weight).toBe('72.00kg');
    });
  });
});
