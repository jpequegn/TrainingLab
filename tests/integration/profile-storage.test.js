import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorkoutStorage } from '../../src/services/storage.js';

// Extended mock for profile functionality
const mockIDBRequest = (result = null, error = null) => ({
  result,
  error,
  onsuccess: null,
  onerror: null,
  onupgradeneeded: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
});

const mockIDBDatabase = {
  version: 2, // Updated version for profile support
  objectStoreNames: {
    contains: vi.fn((storeName) => ['workouts', 'collections', 'tags', 'userProfiles', 'ftpHistory'].includes(storeName)),
    length: 5,
    item: vi.fn((index) => ['workouts', 'collections', 'tags', 'userProfiles', 'ftpHistory'][index]),
  },
  createObjectStore: vi.fn((storeName, options) => ({
    name: storeName,
    keyPath: options?.keyPath,
    autoIncrement: options?.autoIncrement,
    createIndex: vi.fn(),
    index: vi.fn(() => ({
      get: vi.fn(() => mockIDBRequest()),
      getAll: vi.fn(() => mockIDBRequest([])),
    })),
  })),
  transaction: vi.fn((storeNames, mode = 'readonly') => ({
    mode,
    objectStore: vi.fn((storeName) => ({
      name: storeName,
      add: vi.fn(() => mockIDBRequest()),
      get: vi.fn(() => mockIDBRequest()),
      put: vi.fn(() => mockIDBRequest()),
      delete: vi.fn(() => mockIDBRequest()),
      getAll: vi.fn(() => mockIDBRequest([])),
      clear: vi.fn(() => mockIDBRequest()),
      index: vi.fn(() => ({
        get: vi.fn(() => mockIDBRequest()),
        getAll: vi.fn(() => mockIDBRequest([])),
      })),
    })),
    oncomplete: null,
    onerror: null,
  })),
  close: vi.fn(),
};

// Mock indexedDB with profile support
global.indexedDB = {
  open: vi.fn((dbName, version) => {
    const request = mockIDBRequest(mockIDBDatabase);
    setTimeout(() => {
      if (version > mockIDBDatabase.version) {
        const upgradeEvent = { 
          target: { result: mockIDBDatabase },
          oldVersion: mockIDBDatabase.version,
          newVersion: version,
        };
        if (request.onupgradeneeded) request.onupgradeneeded(upgradeEvent);
      }
      if (request.onsuccess) request.onsuccess({ target: { result: mockIDBDatabase } });
    }, 0);
    return request;
  }),
  deleteDatabase: vi.fn(() => mockIDBRequest()),
};

describe('Profile Storage Integration', () => {
  let storage;

  beforeEach(() => {
    storage = new WorkoutStorage();
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (storage.db) {
      storage.db.close();
    }
  });

  describe('Database Migration', () => {
    it('should upgrade database from version 1 to version 2', async () => {
      const createObjectStoreSpy = vi.spyOn(storage, 'createObjectStores');
      
      // Mock old database version
      const oldDb = { ...mockIDBDatabase, version: 1 };
      global.indexedDB.open = vi.fn(() => {
        const request = mockIDBRequest(mockIDBDatabase);
        setTimeout(() => {
          const upgradeEvent = { 
            target: { result: mockIDBDatabase },
            oldVersion: 1,
            newVersion: 2,
          };
          if (request.onupgradeneeded) request.onupgradeneeded(upgradeEvent);
          if (request.onsuccess) request.onsuccess({ target: { result: mockIDBDatabase } });
        }, 0);
        return request;
      });
      
      await storage.initialize();
      
      expect(global.indexedDB.open).toHaveBeenCalledWith('WorkoutLibraryDB', 2);
      expect(createObjectStoreSpy).toHaveBeenCalled();
    });

    it('should create profile object stores during upgrade', async () => {
      const db = mockIDBDatabase;
      
      storage.createObjectStores(db, 1, 2);
      
      expect(db.createObjectStore).toHaveBeenCalledWith('userProfiles', {
        keyPath: 'id',
        autoIncrement: false,
      });
      
      expect(db.createObjectStore).toHaveBeenCalledWith('ftpHistory', {
        keyPath: 'id',
        autoIncrement: false,
      });
    });

    it('should create appropriate indexes for profile stores', async () => {
      const mockStore = {
        createIndex: vi.fn(),
      };
      
      mockIDBDatabase.createObjectStore.mockReturnValue(mockStore);
      
      storage.createObjectStores(mockIDBDatabase, 1, 2);
      
      expect(mockStore.createIndex).toHaveBeenCalledWith('profileId', 'profileId', { unique: false });
      expect(mockStore.createIndex).toHaveBeenCalledWith('date', 'date', { unique: false });
    });
  });

  describe('User Profile Operations', () => {
    const sampleProfile = {
      id: 'profile-123',
      name: 'John Doe',
      email: 'john@example.com',
      ftp: 250,
      weight: 70,
      age: 30,
      gender: 'male',
      units: 'metric',
      photo: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    beforeEach(async () => {
      await storage.initialize();
    });

    it('should save user profile successfully', async () => {
      const mockTransaction = mockIDBDatabase.transaction();
      const mockStore = mockTransaction.objectStore();
      mockStore.put = vi.fn(() => {
        const request = mockIDBRequest(sampleProfile.id);
        setTimeout(() => request.onsuccess && request.onsuccess(), 0);
        return request;
      });

      const result = await storage.saveUserProfile(sampleProfile);

      expect(mockIDBDatabase.transaction).toHaveBeenCalledWith(['userProfiles'], 'readwrite');
      expect(mockStore.put).toHaveBeenCalledWith(sampleProfile);
      expect(result).toBe(sampleProfile.id);
    });

    it('should get user profile by ID', async () => {
      const mockTransaction = mockIDBDatabase.transaction();
      const mockStore = mockTransaction.objectStore();
      mockStore.get = vi.fn(() => {
        const request = mockIDBRequest(sampleProfile);
        setTimeout(() => request.onsuccess && request.onsuccess(), 0);
        return request;
      });

      const result = await storage.getUserProfile(sampleProfile.id);

      expect(mockStore.get).toHaveBeenCalledWith(sampleProfile.id);
      expect(result).toEqual(sampleProfile);
    });

    it('should get current user profile', async () => {
      const mockTransaction = mockIDBDatabase.transaction();
      const mockStore = mockTransaction.objectStore();
      mockStore.getAll = vi.fn(() => {
        const request = mockIDBRequest([sampleProfile]);
        setTimeout(() => request.onsuccess && request.onsuccess(), 0);
        return request;
      });

      const result = await storage.getCurrentUserProfile();

      expect(mockStore.getAll).toHaveBeenCalled();
      expect(result).toEqual(sampleProfile);
    });

    it('should update user profile', async () => {
      const updates = { ftp: 275, weight: 72 };
      const updatedProfile = { ...sampleProfile, ...updates };
      
      const mockTransaction = mockIDBDatabase.transaction();
      const mockStore = mockTransaction.objectStore();
      mockStore.get = vi.fn(() => {
        const request = mockIDBRequest(sampleProfile);
        setTimeout(() => request.onsuccess && request.onsuccess(), 0);
        return request;
      });
      mockStore.put = vi.fn(() => {
        const request = mockIDBRequest(sampleProfile.id);
        setTimeout(() => request.onsuccess && request.onsuccess(), 0);
        return request;
      });

      const result = await storage.updateUserProfile(sampleProfile.id, updates);

      expect(mockStore.get).toHaveBeenCalledWith(sampleProfile.id);
      expect(mockStore.put).toHaveBeenCalledWith(expect.objectContaining(updates));
      expect(result).toBe(sampleProfile.id);
    });

    it('should delete user profile', async () => {
      const mockTransaction = mockIDBDatabase.transaction();
      const mockStore = mockTransaction.objectStore();
      mockStore.delete = vi.fn(() => {
        const request = mockIDBRequest(undefined);
        setTimeout(() => request.onsuccess && request.onsuccess(), 0);
        return request;
      });

      const result = await storage.deleteUserProfile(sampleProfile.id);

      expect(mockStore.delete).toHaveBeenCalledWith(sampleProfile.id);
      expect(result).toBe(true);
    });

    it('should validate profile data before saving', async () => {
      const invalidProfile = { name: '', ftp: -50 }; // Invalid data

      await expect(storage.saveUserProfile(invalidProfile)).rejects.toThrow();
    });

    it('should handle profile not found gracefully', async () => {
      const mockTransaction = mockIDBDatabase.transaction();
      const mockStore = mockTransaction.objectStore();
      mockStore.get = vi.fn(() => {
        const request = mockIDBRequest(undefined);
        setTimeout(() => request.onsuccess && request.onsuccess(), 0);
        return request;
      });

      const result = await storage.getUserProfile('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('FTP History Operations', () => {
    const sampleFTPEntry = {
      id: 'ftp-123',
      profileId: 'profile-123',
      ftp: 275,
      previousFTP: 250,
      date: '2024-01-15T00:00:00.000Z',
      notes: 'Improved after training camp',
      testType: 'ramp',
      conditions: 'indoor',
    };

    beforeEach(async () => {
      await storage.initialize();
    });

    it('should add FTP history entry', async () => {
      const mockTransaction = mockIDBDatabase.transaction();
      const mockStore = mockTransaction.objectStore();
      mockStore.add = vi.fn(() => {
        const request = mockIDBRequest(sampleFTPEntry.id);
        setTimeout(() => request.onsuccess && request.onsuccess(), 0);
        return request;
      });

      const result = await storage.addFTPHistoryEntry('profile-123', sampleFTPEntry);

      expect(mockIDBDatabase.transaction).toHaveBeenCalledWith(['ftpHistory'], 'readwrite');
      expect(mockStore.add).toHaveBeenCalledWith(expect.objectContaining({
        profileId: 'profile-123',
        ftp: 275,
      }));
      expect(result).toBe(sampleFTPEntry.id);
    });

    it('should get FTP history for profile', async () => {
      const ftpHistory = [sampleFTPEntry];
      
      const mockTransaction = mockIDBDatabase.transaction();
      const mockStore = mockTransaction.objectStore();
      const mockIndex = mockStore.index();
      mockIndex.getAll = vi.fn(() => {
        const request = mockIDBRequest(ftpHistory);
        setTimeout(() => request.onsuccess && request.onsuccess(), 0);
        return request;
      });

      const result = await storage.getFTPHistory('profile-123');

      expect(mockStore.index).toHaveBeenCalledWith('profileId');
      expect(mockIndex.getAll).toHaveBeenCalledWith('profile-123');
      expect(result).toEqual(ftpHistory);
    });

    it('should get FTP history sorted by date', async () => {
      const ftpHistory = [
        { ...sampleFTPEntry, id: '1', date: '2024-01-01', ftp: 240 },
        { ...sampleFTPEntry, id: '2', date: '2024-01-15', ftp: 275 },
        { ...sampleFTPEntry, id: '3', date: '2024-01-10', ftp: 250 },
      ];
      
      const mockTransaction = mockIDBDatabase.transaction();
      const mockStore = mockTransaction.objectStore();
      const mockIndex = mockStore.index();
      mockIndex.getAll = vi.fn(() => {
        const request = mockIDBRequest(ftpHistory);
        setTimeout(() => request.onsuccess && request.onsuccess(), 0);
        return request;
      });

      const result = await storage.getFTPHistory('profile-123', { sortBy: 'date', order: 'desc' });

      expect(result[0].ftp).toBe(275); // Most recent first
      expect(result[2].ftp).toBe(240); // Oldest last
    });

    it('should get FTP history with limit', async () => {
      const ftpHistory = Array(10).fill().map((_, i) => ({
        ...sampleFTPEntry,
        id: `ftp-${i}`,
        ftp: 250 + i,
      }));
      
      const mockTransaction = mockIDBDatabase.transaction();
      const mockStore = mockTransaction.objectStore();
      const mockIndex = mockStore.index();
      mockIndex.getAll = vi.fn(() => {
        const request = mockIDBRequest(ftpHistory);
        setTimeout(() => request.onsuccess && request.onsuccess(), 0);
        return request;
      });

      const result = await storage.getFTPHistory('profile-123', { limit: 5 });

      expect(result).toHaveLength(5);
    });

    it('should delete FTP history entry', async () => {
      const mockTransaction = mockIDBDatabase.transaction();
      const mockStore = mockTransaction.objectStore();
      mockStore.delete = vi.fn(() => {
        const request = mockIDBRequest(undefined);
        setTimeout(() => request.onsuccess && request.onsuccess(), 0);
        return request;
      });

      const result = await storage.deleteFTPHistoryEntry('ftp-123');

      expect(mockStore.delete).toHaveBeenCalledWith('ftp-123');
      expect(result).toBe(true);
    });

    it('should validate FTP history entry before saving', async () => {
      const invalidEntry = { ftp: -50, profileId: '' }; // Invalid data

      await expect(storage.addFTPHistoryEntry('profile-123', invalidEntry)).rejects.toThrow();
    });

    it('should calculate FTP statistics', async () => {
      const ftpHistory = [
        { ftp: 240, date: '2024-01-01' },
        { ftp: 250, date: '2024-01-10' },
        { ftp: 275, date: '2024-01-15' },
      ];
      
      const mockTransaction = mockIDBDatabase.transaction();
      const mockStore = mockTransaction.objectStore();
      const mockIndex = mockStore.index();
      mockIndex.getAll = vi.fn(() => {
        const request = mockIDBRequest(ftpHistory);
        setTimeout(() => request.onsuccess && request.onsuccess(), 0);
        return request;
      });

      const stats = await storage.getFTPStatistics('profile-123');

      expect(stats.peak).toBe(275);
      expect(stats.current).toBe(275);
      expect(stats.average).toBeCloseTo(255, 0);
      expect(stats.totalGain).toBe(35);
      expect(stats.entries).toBe(3);
    });
  });

  describe('Data Integrity', () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it('should handle concurrent profile updates', async () => {
      const profile = {
        id: 'profile-123',
        name: 'John Doe',
        ftp: 250,
      };

      // Save initial profile
      const mockTransaction1 = mockIDBDatabase.transaction();
      const mockStore1 = mockTransaction1.objectStore();
      mockStore1.put = vi.fn(() => {
        const request = mockIDBRequest('profile-123');
        setTimeout(() => request.onsuccess && request.onsuccess(), 0);
        return request;
      });

      await storage.saveUserProfile(profile);

      // Simulate concurrent updates
      const update1Promise = storage.updateUserProfile('profile-123', { ftp: 275 });
      const update2Promise = storage.updateUserProfile('profile-123', { name: 'John Updated' });

      const [result1, result2] = await Promise.all([update1Promise, update2Promise]);

      expect(result1).toBe('profile-123');
      expect(result2).toBe('profile-123');
    });

    it('should maintain referential integrity between profile and FTP history', async () => {
      // Delete profile should handle related FTP history
      const mockTransaction = mockIDBDatabase.transaction();
      const mockStore = mockTransaction.objectStore();
      const mockIndex = mockStore.index();
      
      mockIndex.getAll = vi.fn(() => {
        const request = mockIDBRequest([
          { id: 'ftp-1', profileId: 'profile-123' },
          { id: 'ftp-2', profileId: 'profile-123' },
        ]);
        setTimeout(() => request.onsuccess && request.onsuccess(), 0);
        return request;
      });
      
      mockStore.delete = vi.fn(() => {
        const request = mockIDBRequest(undefined);
        setTimeout(() => request.onsuccess && request.onsuccess(), 0);
        return request;
      });

      await storage.deleteUserProfile('profile-123', { cascadeDelete: true });

      // Should delete profile and related FTP history
      expect(mockStore.delete).toHaveBeenCalledWith('profile-123');
      expect(mockStore.delete).toHaveBeenCalledWith('ftp-1');
      expect(mockStore.delete).toHaveBeenCalledWith('ftp-2');
    });

    it('should handle transaction failures gracefully', async () => {
      const mockTransaction = mockIDBDatabase.transaction();
      const mockStore = mockTransaction.objectStore();
      mockStore.put = vi.fn(() => {
        const request = mockIDBRequest(null, new Error('Transaction failed'));
        setTimeout(() => request.onerror && request.onerror(), 0);
        return request;
      });

      const profile = { id: 'test', name: 'Test' };

      await expect(storage.saveUserProfile(profile)).rejects.toThrow('Transaction failed');
    });

    it('should validate data relationships', async () => {
      // FTP history entry must reference valid profile
      const orphanedFTPEntry = {
        profileId: 'nonexistent-profile',
        ftp: 250,
        date: new Date().toISOString(),
      };

      await expect(storage.addFTPHistoryEntry('nonexistent-profile', orphanedFTPEntry))
        .rejects.toThrow('Profile not found');
    });
  });

  describe('Error Handling', () => {
    it('should handle database unavailable', async () => {
      global.indexedDB.open = vi.fn(() => {
        const request = mockIDBRequest(null, new Error('Database unavailable'));
        setTimeout(() => request.onerror && request.onerror(), 0);
        return request;
      });

      await expect(storage.initialize()).rejects.toThrow('Database unavailable');
    });

    it('should handle quota exceeded errors', async () => {
      await storage.initialize();

      const mockTransaction = mockIDBDatabase.transaction();
      const mockStore = mockTransaction.objectStore();
      mockStore.put = vi.fn(() => {
        const request = mockIDBRequest(null, new Error('QuotaExceededError'));
        setTimeout(() => request.onerror && request.onerror(), 0);
        return request;
      });

      const largeProfile = {
        id: 'large-profile',
        name: 'Large Profile',
        photo: `data:image/jpeg;base64,${  'x'.repeat(1000000)}`, // Large photo
      };

      await expect(storage.saveUserProfile(largeProfile)).rejects.toThrow('QuotaExceededError');
    });

    it('should handle corrupted profile data', async () => {
      await storage.initialize();

      const mockTransaction = mockIDBDatabase.transaction();
      const mockStore = mockTransaction.objectStore();
      mockStore.get = vi.fn(() => {
        const corruptedData = '{"corrupted": json}'; // Invalid JSON
        const request = mockIDBRequest(corruptedData);
        setTimeout(() => request.onsuccess && request.onsuccess(), 0);
        return request;
      });

      const result = await storage.getUserProfile('corrupted-profile');

      // Should handle gracefully and return null
      expect(result).toBeNull();
    });
  });

  describe('Performance', () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it('should handle large FTP history efficiently', async () => {
      const largeHistory = Array(1000).fill().map((_, i) => ({
        id: `ftp-${i}`,
        profileId: 'profile-123',
        ftp: 250 + Math.random() * 50,
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      }));

      const mockTransaction = mockIDBDatabase.transaction();
      const mockStore = mockTransaction.objectStore();
      const mockIndex = mockStore.index();
      mockIndex.getAll = vi.fn(() => {
        const request = mockIDBRequest(largeHistory);
        setTimeout(() => request.onsuccess && request.onsuccess(), 0);
        return request;
      });

      const startTime = performance.now();
      const result = await storage.getFTPHistory('profile-123', { limit: 50 });
      const endTime = performance.now();

      expect(result).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });

    it('should use indexes for efficient queries', async () => {
      const mockTransaction = mockIDBDatabase.transaction();
      const mockStore = mockTransaction.objectStore();
      const mockIndex = mockStore.index();

      await storage.getFTPHistory('profile-123');

      expect(mockStore.index).toHaveBeenCalledWith('profileId');
      expect(mockIndex.getAll).toHaveBeenCalledWith('profile-123');
    });
  });
});