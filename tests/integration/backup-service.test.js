import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BackupService } from '../../src/services/storage/backup-service.js';

// Mock EnhancedStorageService
const mockStorage = {
  initialize: vi.fn(),
  getAllUserProfiles: vi.fn(),
  getAllActivities: vi.fn(),
  getAllWorkouts: vi.fn(),
  getAllFTPHistory: vi.fn(),
  getAllFromStore: vi.fn(),
  recordExists: vi.fn(),
  saveToStore: vi.fn(),
  getAllBackupMetadata: vi.fn(),
  saveBackupMetadata: vi.fn(),
  getUserProfile: vi.fn(),
  getActivity: vi.fn(),
  saveUserProfile: vi.fn(),
  saveActivity: vi.fn(),
};

vi.mock('../../src/services/storage/enhanced-storage.js', () => ({
  EnhancedStorageService: vi.fn(() => mockStorage)
}));

// Mock File API
global.FileReader = class {
  constructor() {
    this.readAsText = vi.fn((file) => {
      setTimeout(() => {
        this.result = file.content || '{}';
        this.onload();
      }, 0);
    });
  }
};

global.Blob = class {
  constructor(parts, options) {
    this.parts = parts;
    this.type = options?.type || '';
    this.size = parts.join('').length;
  }
};

// Mock crypto API
global.crypto = {
  subtle: {
    digest: vi.fn(() => Promise.resolve(new ArrayBuffer(32)))
  }
};

// Mock navigation storage API
global.navigator = {
  ...global.navigator,
  storage: {
    estimate: vi.fn(() => Promise.resolve({
      usage: 1000000,
      quota: 10000000
    }))
  }
};

describe('BackupService', () => {
  let backupService;

  beforeEach(() => {
    backupService = new BackupService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      mockStorage.initialize.mockResolvedValueOnce();
      
      await backupService.initialize();
      
      expect(backupService.isInitialized).toBe(true);
      expect(mockStorage.initialize).toHaveBeenCalled();
    });

    it('should not reinitialize if already initialized', async () => {
      backupService.isInitialized = true;
      
      await backupService.initialize();
      
      expect(mockStorage.initialize).not.toHaveBeenCalled();
    });
  });

  describe('Full Backup Creation', () => {
    beforeEach(async () => {
      mockStorage.initialize.mockResolvedValue();
      await backupService.initialize();
    });

    it('should create a complete backup with all stores', async () => {
      const mockData = {
        userProfiles: [{ id: 'user1', name: 'Test User' }],
        activities: [{ id: 'act1', type: 'cycling', date: '2024-01-15' }],
        workouts: [{ id: 'workout1', name: 'Test Workout' }],
        ftpHistory: [{ id: 'ftp1', ftpValue: 250, date: '2024-01-15' }]
      };

      mockStorage.getAllFromStore.mockImplementation((storeName) => {
        return Promise.resolve(mockData[storeName] || []);
      });

      const progressCallback = vi.fn();
      const backupBlob = await backupService.createFullBackup({
        onProgress: progressCallback
      });

      expect(backupBlob).toBeInstanceOf(Blob);
      expect(backupBlob.type).toBe('application/gzip');
      expect(progressCallback).toHaveBeenCalled();
    });

    it('should create uncompressed backup when requested', async () => {
      mockStorage.getAllFromStore.mockResolvedValue([]);

      const backupBlob = await backupService.createFullBackup({
        compress: false
      });

      expect(backupBlob.type).toBe('application/json');
    });

    it('should include settings when specified', async () => {
      mockStorage.getAllFromStore.mockResolvedValue([]);

      await backupService.createFullBackup({
        includeSettings: true
      });

      expect(mockStorage.getAllFromStore).toHaveBeenCalledWith('appSettings');
    });

    it('should exclude performance metrics by default', async () => {
      mockStorage.getAllFromStore.mockResolvedValue([]);

      await backupService.createFullBackup({
        includeMetrics: false
      });

      expect(mockStorage.getAllFromStore).not.toHaveBeenCalledWith('performanceMetrics');
    });

    it('should backup only specified stores', async () => {
      const specificStores = ['userProfiles', 'activities'];
      mockStorage.getAllFromStore.mockResolvedValue([]);

      await backupService.createFullBackup({
        stores: specificStores
      });

      specificStores.forEach(store => {
        expect(mockStorage.getAllFromStore).toHaveBeenCalledWith(store);
      });

      expect(mockStorage.getAllFromStore).not.toHaveBeenCalledWith('workouts');
    });

    it('should handle backup size limits', async () => {
      // Mock very large data
      const largeData = Array(1000000).fill({ id: 'large', data: 'x'.repeat(1000) });
      mockStorage.getAllFromStore.mockResolvedValue(largeData);

      await expect(backupService.createFullBackup()).rejects.toThrow(/exceeds maximum limit/);
    });

    it('should record backup creation metadata', async () => {
      mockStorage.getAllFromStore.mockResolvedValue([]);
      
      await backupService.createFullBackup();
      
      expect(mockStorage.saveBackupMetadata).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringContaining('backup_'),
          timestamp: expect.any(String),
          userAgent: expect.any(String)
        })
      );
    });
  });

  describe('Backup Restoration', () => {
    beforeEach(async () => {
      mockStorage.initialize.mockResolvedValue();
      await backupService.initialize();
    });

    it('should restore from valid backup file', async () => {
      const backupData = {
        version: '1.0.0',
        formatVersion: '2024.1',
        stores: {
          userProfiles: {
            data: [{ id: 'user1', name: 'Test User' }]
          },
          activities: {
            data: [{ id: 'act1', type: 'cycling' }]
          }
        },
        checksum: 'valid_checksum'
      };

      // Mock checksum calculation
      global.crypto.subtle.digest = vi.fn(() => {
        const hash = new Uint8Array([1, 2, 3, 4]);
        return Promise.resolve(hash.buffer);
      });

      const backupFile = {
        content: JSON.stringify(backupData)
      };

      mockStorage.recordExists.mockResolvedValue(false);
      mockStorage.saveToStore.mockResolvedValue();

      const result = await backupService.restoreFromBackup(backupFile);

      expect(result.restored).toContain('userProfiles');
      expect(result.restored).toContain('activities');
      expect(result.totalRecords).toBe(2);
      expect(mockStorage.saveToStore).toHaveBeenCalledTimes(2);
    });

    it('should handle compressed backup files', async () => {
      const compressedData = {
        compressed: true,
        data: btoa(JSON.stringify({
          version: '1.0.0',
          stores: {
            userProfiles: { data: [{ id: 'user1' }] }
          }
        }))
      };

      const backupFile = {
        content: JSON.stringify(compressedData)
      };

      mockStorage.recordExists.mockResolvedValue(false);
      mockStorage.saveToStore.mockResolvedValue();

      const result = await backupService.restoreFromBackup(backupFile);

      expect(result.restored).toContain('userProfiles');
    });

    it('should validate data integrity with checksums', async () => {
      const backupData = {
        version: '1.0.0',
        stores: { userProfiles: { data: [] } },
        checksum: 'invalid_checksum'
      };

      const backupFile = {
        content: JSON.stringify(backupData)
      };

      await expect(backupService.restoreFromBackup(backupFile, {
        validateIntegrity: true
      })).rejects.toThrow(/integrity check failed/);
    });

    it('should skip overwrite when disabled', async () => {
      const backupData = {
        version: '1.0.0',
        stores: {
          userProfiles: {
            data: [{ id: 'existing_user', name: 'Updated Name' }]
          }
        }
      };

      const backupFile = {
        content: JSON.stringify(backupData)
      };

      mockStorage.recordExists.mockResolvedValue(true); // Record exists
      
      const result = await backupService.restoreFromBackup(backupFile, {
        overwrite: false
      });

      expect(result.totalRecords).toBe(0);
      expect(mockStorage.saveToStore).not.toHaveBeenCalled();
    });

    it('should restore only specified stores', async () => {
      const backupData = {
        version: '1.0.0',
        stores: {
          userProfiles: { data: [{ id: 'user1' }] },
          activities: { data: [{ id: 'act1' }] },
          workouts: { data: [{ id: 'workout1' }] }
        }
      };

      const backupFile = {
        content: JSON.stringify(backupData)
      };

      mockStorage.recordExists.mockResolvedValue(false);
      mockStorage.saveToStore.mockResolvedValue();

      const result = await backupService.restoreFromBackup(backupFile, {
        stores: ['userProfiles', 'activities']
      });

      expect(result.restored).toContain('userProfiles');
      expect(result.restored).toContain('activities');
      expect(result.restored).not.toContain('workouts');
    });

    it('should handle restore errors gracefully', async () => {
      const backupData = {
        version: '1.0.0',
        stores: {
          userProfiles: { data: [{ id: 'user1' }] },
          activities: { data: [{ id: 'act1' }] }
        }
      };

      const backupFile = {
        content: JSON.stringify(backupData)
      };

      mockStorage.recordExists.mockResolvedValue(false);
      mockStorage.saveToStore
        .mockResolvedValueOnce() // userProfiles succeeds
        .mockRejectedValueOnce(new Error('Save failed')); // activities fails

      const result = await backupService.restoreFromBackup(backupFile);

      expect(result.restored).toContain('userProfiles');
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].store).toBe('activities');
    });

    it('should record restore operation', async () => {
      const backupData = {
        version: '1.0.0',
        metadata: { id: 'backup_123' },
        stores: {}
      };

      const backupFile = {
        content: JSON.stringify(backupData)
      };

      await backupService.restoreFromBackup(backupFile);

      expect(mockStorage.saveBackupMetadata).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'restore',
          sourceBackup: 'backup_123'
        })
      );
    });
  });

  describe('Data Type Export/Import', () => {
    beforeEach(async () => {
      mockStorage.initialize.mockResolvedValue();
      await backupService.initialize();
    });

    it('should export user profiles', async () => {
      const profiles = [
        { id: 'user1', name: 'User One' },
        { id: 'user2', name: 'User Two' }
      ];

      mockStorage.getAllUserProfiles.mockResolvedValue(profiles);

      const result = await backupService.exportDataType('userProfiles');

      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.filename).toMatch(/traininglab-profiles-\d+\.json/);
    });

    it('should export activities with compression', async () => {
      const activities = [
        { id: 'act1', type: 'cycling', date: '2024-01-15' }
      ];

      mockStorage.getAllActivities.mockResolvedValue(activities);

      const result = await backupService.exportDataType('activities', {
        compress: true
      });

      expect(result.blob.type).toBe('application/gzip');
    });

    it('should import user profiles', async () => {
      const importData = {
        type: 'userProfiles',
        version: '1.0.0',
        data: [
          { id: 'user1', name: 'Imported User' }
        ]
      };

      const importFile = {
        content: JSON.stringify(importData)
      };

      mockStorage.recordExists.mockResolvedValue(false);
      mockStorage.saveUserProfile.mockResolvedValue();

      const result = await backupService.importDataType(importFile, 'userProfiles');

      expect(result.importedCount).toBe(1);
      expect(result.dataType).toBe('userProfiles');
      expect(mockStorage.saveUserProfile).toHaveBeenCalledWith(importData.data[0]);
    });

    it('should validate import data structure', async () => {
      const invalidData = {
        type: 'userProfiles',
        data: [
          { id: 'user1' } // Missing required 'name' field
        ]
      };

      const importFile = {
        content: JSON.stringify(invalidData)
      };

      await expect(backupService.importDataType(importFile, 'userProfiles', {
        validate: true
      })).rejects.toThrow(/missing required fields/);
    });

    it('should handle data type mismatch', async () => {
      const mismatchData = {
        type: 'activities',
        data: []
      };

      const importFile = {
        content: JSON.stringify(mismatchData)
      };

      await expect(backupService.importDataType(importFile, 'userProfiles'))
        .rejects.toThrow(/Data type mismatch/);
    });

    it('should handle import errors per record', async () => {
      const importData = {
        type: 'userProfiles',
        data: [
          { id: 'user1', name: 'User One' },
          { id: 'user2', name: 'User Two' }
        ]
      };

      const importFile = {
        content: JSON.stringify(importData)
      };

      mockStorage.recordExists.mockResolvedValue(false);
      mockStorage.saveUserProfile
        .mockResolvedValueOnce() // First succeeds
        .mockRejectedValueOnce(new Error('Save failed')); // Second fails

      const result = await backupService.importDataType(importFile, 'userProfiles');

      expect(result.importedCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].id).toBe('user2');
    });
  });

  describe('Backup History', () => {
    beforeEach(async () => {
      mockStorage.initialize.mockResolvedValue();
      await backupService.initialize();
    });

    it('should get backup history', async () => {
      const backupMetadata = [
        {
          id: 'backup1',
          timestamp: '2024-01-15T10:00:00Z',
          size: 1000000,
          compressed: true,
          storeCount: 5
        },
        {
          id: 'backup2',
          timestamp: '2024-01-14T10:00:00Z',
          size: 800000,
          compressed: false,
          storeCount: 3
        }
      ];

      mockStorage.getAllBackupMetadata.mockResolvedValue(backupMetadata);

      const result = await backupService.getBackupHistory();

      expect(result.totalBackups).toBe(2);
      expect(result.lastBackup).toBe('2024-01-14T10:00:00Z');
      expect(result.backups).toHaveLength(2);
    });

    it('should handle empty backup history', async () => {
      mockStorage.getAllBackupMetadata.mockResolvedValue([]);

      const result = await backupService.getBackupHistory();

      expect(result.totalBackups).toBe(0);
      expect(result.lastBackup).toBeNull();
      expect(result.backups).toEqual([]);
    });
  });

  describe('Progress Tracking', () => {
    beforeEach(async () => {
      mockStorage.initialize.mockResolvedValue();
      await backupService.initialize();
    });

    it('should track backup progress', async () => {
      const progressCallback = vi.fn();
      
      mockStorage.getAllFromStore.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve([]), 10);
        });
      });

      await backupService.createFullBackup({
        stores: ['userProfiles', 'activities'],
        onProgress: progressCallback
      });

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          completed: expect.any(Number),
          total: 2,
          percentage: expect.any(Number),
          message: expect.any(String)
        })
      );
    });

    it('should track restore progress', async () => {
      const progressCallback = vi.fn();
      
      const backupData = {
        version: '1.0.0',
        stores: {
          userProfiles: { data: [{ id: 'user1' }] },
          activities: { data: [{ id: 'act1' }] }
        }
      };

      const backupFile = {
        content: JSON.stringify(backupData)
      };

      mockStorage.recordExists.mockResolvedValue(false);
      mockStorage.saveToStore.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve(), 10);
        });
      });

      await backupService.restoreFromBackup(backupFile, {
        onProgress: progressCallback
      });

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          completed: expect.any(Number),
          total: 2,
          percentage: expect.any(Number)
        })
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      mockStorage.initialize.mockResolvedValue();
      await backupService.initialize();
    });

    it('should handle storage initialization errors', async () => {
      const errorService = new BackupService();
      mockStorage.initialize.mockRejectedValue(new Error('Storage init failed'));

      await expect(errorService.initialize()).rejects.toThrow('Storage init failed');
    });

    it('should handle invalid backup files', async () => {
      const invalidFile = {
        content: 'invalid json'
      };

      await expect(backupService.restoreFromBackup(invalidFile))
        .rejects.toThrow(/Invalid backup file format/);
    });

    it('should handle unsupported data types', async () => {
      await expect(backupService.exportDataType('unsupportedType'))
        .rejects.toThrow(/Unsupported data type/);
    });

    it('should handle file reading errors', async () => {
      global.FileReader = class {
        constructor() {
          this.readAsText = vi.fn((file) => {
            setTimeout(() => {
              this.onerror(new Error('File read error'));
            }, 0);
          });
        }
      };

      const backupFile = { content: '{}' };
      
      await expect(backupService.restoreFromBackup(backupFile))
        .rejects.toThrow(/Failed to read backup file/);
    });

    it('should continue backup on store errors', async () => {
      mockStorage.getAllFromStore
        .mockRejectedValueOnce(new Error('Store error'))
        .mockResolvedValueOnce([{ id: 'data' }]);

      // Should not throw, but continue with other stores
      const result = await backupService.createFullBackup({
        stores: ['failingStore', 'workingStore']
      });

      expect(result).toBeInstanceOf(Blob);
    });
  });
});