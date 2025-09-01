import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { profileService } from '../../src/services/profile-service.js';
import { stateManager } from '../../src/services/state-manager.js';

// Mock storage
const mockStorage = {
  initialize: vi.fn().mockResolvedValue(),
  saveUserProfile: vi.fn().mockResolvedValue('profile-123'),
  getUserProfile: vi.fn().mockResolvedValue(null),
  addFTPHistoryEntry: vi.fn().mockResolvedValue('ftp-123'),
  getFTPHistory: vi.fn().mockResolvedValue([]),
  updateUserProfile: vi.fn().mockResolvedValue('profile-123'),
  deleteUserProfile: vi.fn().mockResolvedValue(true),
};

vi.mock('../../src/services/storage.js', () => ({
  WorkoutStorage: vi.fn().mockImplementation(() => mockStorage),
}));

// Mock state manager
vi.mock('../../src/services/state-manager.js', () => ({
  stateManager: {
    dispatch: vi.fn(),
    getState: vi.fn(),
    setState: vi.fn(),
  },
}));

describe('ProfileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    profileService.currentProfile = null;
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(profileService.initialize()).resolves.toBeUndefined();
      expect(profileService.storage.initialize).toHaveBeenCalled();
    });

    it('should load existing profile on initialization', async () => {
      const existingProfile = {
        id: 'profile-123',
        name: 'John Doe',
        email: 'john@example.com',
        ftp: 250,
        weight: 70,
        age: 30,
      };
      
      profileService.storage.getUserProfile.mockResolvedValue(existingProfile);
      
      await profileService.initialize();
      
      expect(profileService.currentProfile).toEqual(existingProfile);
      expect(stateManager.dispatch).toHaveBeenCalledWith('LOAD_USER_PROFILE', existingProfile);
    });
  });

  describe('Profile CRUD Operations', () => {
    const validProfileData = {
      name: 'John Doe',
      email: 'john@example.com',
      ftp: 250,
      weight: 70,
      age: 30,
      gender: 'male',
      units: 'metric',
    };

    it('should create a new profile successfully', async () => {
      profileService.storage.saveUserProfile.mockResolvedValue('profile-123');
      
      const result = await profileService.createProfile(validProfileData);
      
      expect(result).toBe('profile-123');
      expect(profileService.storage.saveUserProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          ...validProfileData,
          id: expect.any(String),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        })
      );
      expect(stateManager.dispatch).toHaveBeenCalledWith('CREATE_USER_PROFILE', expect.any(Object));
    });

    it('should validate profile data before creation', async () => {
      const invalidProfile = {
        name: '', // Invalid empty name
        ftp: -50, // Invalid negative FTP
      };

      await expect(profileService.createProfile(invalidProfile)).rejects.toThrow();
    });

    it('should update profile successfully', async () => {
      profileService.currentProfile = { id: 'profile-123', ...validProfileData };
      const updates = { ftp: 275, weight: 72 };
      
      profileService.storage.updateUserProfile.mockResolvedValue('profile-123');
      
      const result = await profileService.updateProfile('profile-123', updates);
      
      expect(result).toBe('profile-123');
      expect(profileService.storage.updateUserProfile).toHaveBeenCalledWith(
        'profile-123',
        expect.objectContaining({
          ...updates,
          updatedAt: expect.any(String),
        })
      );
    });

    it('should get profile by ID', async () => {
      const profile = { id: 'profile-123', ...validProfileData };
      profileService.storage.getUserProfile.mockResolvedValue(profile);
      
      const result = await profileService.getProfile('profile-123');
      
      expect(result).toEqual(profile);
      expect(profileService.storage.getUserProfile).toHaveBeenCalledWith('profile-123');
    });

    it('should delete profile successfully', async () => {
      profileService.storage.deleteUserProfile.mockResolvedValue(true);
      
      const result = await profileService.deleteProfile('profile-123');
      
      expect(result).toBe(true);
      expect(profileService.storage.deleteUserProfile).toHaveBeenCalledWith('profile-123');
      expect(stateManager.dispatch).toHaveBeenCalledWith('DELETE_USER_PROFILE', 'profile-123');
    });
  });

  describe('FTP Management', () => {
    beforeEach(() => {
      profileService.currentProfile = {
        id: 'profile-123',
        name: 'John Doe',
        ftp: 250,
      };
    });

    it('should update FTP successfully', async () => {
      const newFTP = 275;
      const notes = 'Improved after training camp';
      
      profileService.storage.addFTPHistoryEntry.mockResolvedValue('ftp-entry-123');
      profileService.storage.updateUserProfile.mockResolvedValue('profile-123');
      
      await profileService.updateFTP(newFTP, notes);
      
      expect(profileService.storage.addFTPHistoryEntry).toHaveBeenCalledWith(
        'profile-123',
        expect.objectContaining({
          ftp: newFTP,
          previousFTP: 250,
          notes,
          date: expect.any(String),
        })
      );
      expect(profileService.currentProfile.ftp).toBe(newFTP);
    });

    it('should validate FTP values', async () => {
      await expect(profileService.updateFTP(-50)).rejects.toThrow('Invalid FTP value');
      await expect(profileService.updateFTP(0)).rejects.toThrow('Invalid FTP value');
      await expect(profileService.updateFTP(1000)).rejects.toThrow('Invalid FTP value');
    });

    it('should get FTP history', async () => {
      const history = [
        { id: '1', ftp: 250, date: '2024-01-01' },
        { id: '2', ftp: 275, date: '2024-02-01' },
      ];
      
      profileService.storage.getFTPHistory.mockResolvedValue(history);
      
      const result = await profileService.getFTPHistory('profile-123');
      
      expect(result).toEqual(history);
      expect(profileService.storage.getFTPHistory).toHaveBeenCalledWith('profile-123');
    });
  });

  describe('Training Zones', () => {
    beforeEach(() => {
      profileService.currentProfile = {
        id: 'profile-123',
        name: 'John Doe',
        ftp: 250,
      };
    });

    it('should calculate training zones correctly', () => {
      const zones = profileService.getTrainingZones();
      
      expect(zones).toBeDefined();
      expect(zones.ftp).toBe(250);
      expect(zones.zones).toBeDefined();
      expect(zones.zonesInWatts).toBeDefined();
      expect(zones.statistics).toBeDefined();
    });

    it('should return null when no profile exists', () => {
      profileService.currentProfile = null;
      
      const zones = profileService.getTrainingZones();
      
      expect(zones).toBeNull();
    });

    it('should return null when profile has no FTP', () => {
      profileService.currentProfile = {
        id: 'profile-123',
        name: 'John Doe',
        // No FTP
      };
      
      const zones = profileService.getTrainingZones();
      
      expect(zones).toBeNull();
    });
  });

  describe('Profile Photo Management', () => {
    it('should save profile photo successfully', async () => {
      const photoData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABA...';
      
      profileService.currentProfile = { id: 'profile-123', name: 'John Doe' };
      profileService.storage.updateUserProfile.mockResolvedValue('profile-123');
      
      await profileService.saveProfilePhoto('profile-123', photoData);
      
      expect(profileService.storage.updateUserProfile).toHaveBeenCalledWith(
        'profile-123',
        expect.objectContaining({
          photo: photoData,
          updatedAt: expect.any(String),
        })
      );
    });

    it('should validate photo data format', async () => {
      const invalidPhoto = 'not-a-base64-image';
      
      await expect(profileService.saveProfilePhoto('profile-123', invalidPhoto))
        .rejects.toThrow('Invalid photo format');
    });

    it('should remove profile photo successfully', async () => {
      profileService.currentProfile = { id: 'profile-123', name: 'John Doe', photo: 'data:...' };
      profileService.storage.updateUserProfile.mockResolvedValue('profile-123');
      
      await profileService.removeProfilePhoto('profile-123');
      
      expect(profileService.storage.updateUserProfile).toHaveBeenCalledWith(
        'profile-123',
        expect.objectContaining({
          photo: null,
          updatedAt: expect.any(String),
        })
      );
    });
  });

  describe('Data Export/Import', () => {
    const sampleProfile = {
      id: 'profile-123',
      name: 'John Doe',
      email: 'john@example.com',
      ftp: 250,
      weight: 70,
      age: 30,
    };

    it('should export profile data successfully', async () => {
      profileService.currentProfile = sampleProfile;
      
      const ftpHistory = [
        { id: '1', ftp: 240, date: '2024-01-01' },
        { id: '2', ftp: 250, date: '2024-02-01' },
      ];
      
      profileService.storage.getFTPHistory.mockResolvedValue(ftpHistory);
      
      const exportData = await profileService.exportProfileData('profile-123');
      
      expect(exportData).toEqual({
        profile: sampleProfile,
        ftpHistory,
        exportDate: expect.any(String),
        version: '1.0',
      });
    });

    it('should import profile data successfully', async () => {
      const importData = {
        profile: sampleProfile,
        ftpHistory: [
          { ftp: 240, date: '2024-01-01' },
          { ftp: 250, date: '2024-02-01' },
        ],
        version: '1.0',
      };
      
      profileService.storage.saveUserProfile.mockResolvedValue('profile-123');
      profileService.storage.addFTPHistoryEntry.mockResolvedValue('ftp-entry-123');
      
      const result = await profileService.importProfileData(importData);
      
      expect(result).toBe('profile-123');
      expect(profileService.storage.saveUserProfile).toHaveBeenCalled();
      expect(profileService.storage.addFTPHistoryEntry).toHaveBeenCalledTimes(2);
    });

    it('should validate import data format', async () => {
      const invalidImportData = { invalid: 'data' };
      
      await expect(profileService.importProfileData(invalidImportData))
        .rejects.toThrow('Invalid import data format');
    });
  });

  describe('Validation', () => {
    it('should validate profile data correctly', () => {
      const validProfile = {
        name: 'John Doe',
        email: 'john@example.com',
        ftp: 250,
        weight: 70,
        age: 30,
      };
      
      expect(() => profileService.validateProfileData(validProfile)).not.toThrow();
    });

    it('should reject invalid profile data', () => {
      const invalidProfiles = [
        { name: '', email: 'john@example.com' }, // Empty name
        { name: 'John', email: 'invalid-email' }, // Invalid email
        { name: 'John', ftp: -50 }, // Negative FTP
        { name: 'John', weight: 0 }, // Zero weight
        { name: 'John', age: 200 }, // Invalid age
      ];
      
      invalidProfiles.forEach(profile => {
        expect(() => profileService.validateProfileData(profile)).toThrow();
      });
    });

    it('should validate FTP values correctly', () => {
      expect(() => profileService.validateFTP(250)).not.toThrow();
      expect(() => profileService.validateFTP(-50)).toThrow();
      expect(() => profileService.validateFTP(0)).toThrow();
      expect(() => profileService.validateFTP(1000)).toThrow();
    });

    it('should validate email format correctly', () => {
      const validEmails = [
        'user@example.com',
        'test.email@domain.co.uk',
        'user+tag@domain.org',
      ];
      
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@.com',
      ];
      
      validEmails.forEach(email => {
        expect(() => profileService.validateEmail(email)).not.toThrow();
      });
      
      invalidEmails.forEach(email => {
        expect(() => profileService.validateEmail(email)).toThrow();
      });
    });
  });

  describe('Power to Weight Ratio', () => {
    it('should calculate power to weight ratio correctly', () => {
      const profile = {
        ftp: 250,
        weight: 70,
      };
      
      const ratio = profileService.calculatePowerToWeightRatio(profile);
      
      expect(ratio).toBeCloseTo(3.57, 2);
    });

    it('should handle missing weight', () => {
      const profile = { ftp: 250 };
      
      const ratio = profileService.calculatePowerToWeightRatio(profile);
      
      expect(ratio).toBeNull();
    });

    it('should handle missing FTP', () => {
      const profile = { weight: 70 };
      
      const ratio = profileService.calculatePowerToWeightRatio(profile);
      
      expect(ratio).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      const error = new Error('Storage error');
      profileService.storage.saveUserProfile.mockRejectedValue(error);
      
      await expect(profileService.createProfile({ name: 'John' }))
        .rejects.toThrow('Storage error');
    });

    it('should handle missing profile ID', async () => {
      await expect(profileService.updateProfile(null, {}))
        .rejects.toThrow('Profile ID is required');
      
      await expect(profileService.updateProfile('', {}))
        .rejects.toThrow('Profile ID is required');
    });

    it('should handle profile not found', async () => {
      profileService.storage.getUserProfile.mockResolvedValue(null);
      
      const result = await profileService.getProfile('nonexistent');
      
      expect(result).toBeNull();
    });
  });
});