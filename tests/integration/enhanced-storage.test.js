import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EnhancedStorageService } from '../../src/services/storage/enhanced-storage.js';

// Mock IndexedDB for testing
const mockIDBRequest = (result = null, error = null) => ({
  result,
  error,
  onsuccess: null,
  onerror: null,
  onupgradeneeded: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
});

const mockIDBTransaction = {
  objectStore: vi.fn(() => mockIDBObjectStore),
  oncomplete: null,
  onerror: null,
  onabort: null,
};

const mockIDBObjectStore = {
  add: vi.fn(() => mockIDBRequest()),
  put: vi.fn(() => mockIDBRequest()),
  get: vi.fn(() => mockIDBRequest()),
  getAll: vi.fn(() => mockIDBRequest([])),
  delete: vi.fn(() => mockIDBRequest()),
  clear: vi.fn(() => mockIDBRequest()),
  count: vi.fn(() => mockIDBRequest(0)),
  getKey: vi.fn(() => mockIDBRequest()),
  index: vi.fn(() => ({
    get: vi.fn(() => mockIDBRequest()),
    getAll: vi.fn(() => mockIDBRequest([])),
    count: vi.fn(() => mockIDBRequest(0)),
  })),
  createIndex: vi.fn(),
};

const mockIDBDatabase = {
  version: 3,
  objectStoreNames: {
    contains: vi.fn((storeName) => [
      'workouts', 'collections', 'tags', 'userProfiles', 'ftpHistory',
      'activities', 'trainingMetrics', 'syncState', 'appSettings', 
      'backupMetadata', 'performanceMetrics'
    ].includes(storeName)),
    length: 11,
    item: vi.fn((index) => [
      'workouts', 'collections', 'tags', 'userProfiles', 'ftpHistory',
      'activities', 'trainingMetrics', 'syncState', 'appSettings', 
      'backupMetadata', 'performanceMetrics'
    ][index]),
  },
  transaction: vi.fn(() => mockIDBTransaction),
  createObjectStore: vi.fn((storeName, options) => ({
    ...mockIDBObjectStore,
    name: storeName,
    keyPath: options?.keyPath,
    autoIncrement: options?.autoIncrement,
  })),
  deleteObjectStore: vi.fn(),
  close: vi.fn(),
};

// Mock IndexedDB API
global.indexedDB = {
  open: vi.fn(() => {
    const request = mockIDBRequest(mockIDBDatabase);
    setTimeout(() => {
      if (request.onsuccess) request.onsuccess({ target: { result: mockIDBDatabase } });
    }, 0);
    return request;
  }),
  deleteDatabase: vi.fn(() => mockIDBRequest()),
  databases: vi.fn(() => Promise.resolve([])),
};

describe('EnhancedStorageService', () => {
  let storage;

  beforeEach(() => {
    storage = new EnhancedStorageService();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (storage.db) {
      storage.db.close();
    }
    vi.resetAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with correct database schema', async () => {
      await storage.initialize();
      
      expect(storage.db).toBe(mockIDBDatabase);
      expect(storage.isInitialized).toBe(true);
      expect(storage.dbVersion).toBe(3);
    });

    it('should handle initialization errors gracefully', async () => {
      global.indexedDB.open = vi.fn(() => {
        const request = mockIDBRequest(null, new Error('Database error'));
        setTimeout(() => {
          if (request.onerror) request.onerror({ target: { error: new Error('Database error') } });
        }, 0);
        return request;
      });

      await expect(storage.initialize()).rejects.toThrow('Database error');
    });

    it('should not reinitialize if already initialized', async () => {
      await storage.initialize();
      const openSpy = vi.spyOn(global.indexedDB, 'open');
      
      await storage.initialize();
      
      expect(openSpy).toHaveBeenCalledTimes(0);
    });
  });

  describe('Activity Management', () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it('should save activity with proper validation and caching', async () => {
      const activity = {
        id: 'act_123',
        date: '2024-01-15',
        type: 'cycling',
        duration: 3600,
        tss: 85,
        userId: 'user_1',
        data: { power: [200, 250, 300] }
      };

      mockIDBObjectStore.put.mockReturnValueOnce({
        ...mockIDBRequest(),
        onsuccess: null
      });

      const result = await storage.saveActivity(activity);
      
      expect(result).toBe('act_123');
      expect(mockIDBTransaction.objectStore).toHaveBeenCalledWith('activities');
      expect(mockIDBObjectStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          ...activity,
          createdAt: expect.any(String),
          modifiedAt: expect.any(String)
        })
      );

      // Check caching
      const cacheKey = `activity_${activity.id}`;
      expect(storage.cache.has(cacheKey)).toBe(true);
    });

    it('should compress large activity data', async () => {
      const largeActivity = {
        id: 'act_large',
        date: '2024-01-15',
        type: 'cycling',
        duration: 3600,
        data: {
          power: Array(5000).fill(250), // Large data array
          heartRate: Array(5000).fill(150),
          cadence: Array(5000).fill(90)
        }
      };

      await storage.saveActivity(largeActivity);
      
      expect(mockIDBObjectStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          compressed: true,
          compressedData: expect.any(String)
        })
      );
    });

    it('should retrieve activity with cache hit', async () => {
      const activityId = 'act_123';
      const cachedActivity = { id: activityId, type: 'cycling' };
      
      // Add to cache
      storage.cache.set(`activity_${activityId}`, {
        data: cachedActivity,
        timestamp: Date.now()
      });

      const result = await storage.getActivity(activityId);
      
      expect(result).toEqual(cachedActivity);
      expect(mockIDBObjectStore.get).not.toHaveBeenCalled();
    });

    it('should retrieve activity from database on cache miss', async () => {
      const activityId = 'act_456';
      const dbActivity = { id: activityId, type: 'running' };
      
      mockIDBObjectStore.get.mockReturnValueOnce({
        ...mockIDBRequest(dbActivity),
        onsuccess: null
      });

      const result = await storage.getActivity(activityId);
      
      expect(result).toEqual(dbActivity);
      expect(mockIDBObjectStore.get).toHaveBeenCalledWith(activityId);
      
      // Should cache the result
      const cacheKey = `activity_${activityId}`;
      expect(storage.cache.has(cacheKey)).toBe(true);
    });

    it('should get filtered activities with proper filtering', async () => {
      const activities = [
        { id: 'act1', type: 'cycling', date: '2024-01-15', userId: 'user1' },
        { id: 'act2', type: 'running', date: '2024-01-16', userId: 'user1' },
        { id: 'act3', type: 'cycling', date: '2024-01-17', userId: 'user2' }
      ];

      mockIDBObjectStore.getAll.mockReturnValueOnce({
        ...mockIDBRequest(activities),
        onsuccess: null
      });

      const filter = { type: 'cycling', userId: 'user1' };
      const result = await storage.getActivities(filter);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(activities[0]);
    });

    it('should delete activity and clear cache', async () => {
      const activityId = 'act_delete';
      
      // Add to cache first
      storage.cache.set(`activity_${activityId}`, {
        data: { id: activityId },
        timestamp: Date.now()
      });

      mockIDBObjectStore.delete.mockReturnValueOnce({
        ...mockIDBRequest(),
        onsuccess: null
      });

      await storage.deleteActivity(activityId);
      
      expect(mockIDBObjectStore.delete).toHaveBeenCalledWith(activityId);
      expect(storage.cache.has(`activity_${activityId}`)).toBe(false);
    });
  });

  describe('Performance Tracking', () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it('should track operation performance', async () => {
      const operation = 'saveActivity';
      const storeName = 'activities';
      const duration = 150;

      await storage.trackPerformance(operation, storeName, duration);
      
      expect(mockIDBObjectStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          operation,
          storeName,
          duration,
          timestamp: expect.any(String)
        })
      );
    });

    it('should identify slow operations', async () => {
      const slowOperation = 'bulkSave';
      const duration = 2000; // 2 seconds

      await storage.trackPerformance(slowOperation, 'activities', duration);
      
      expect(mockIDBObjectStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: slowOperation,
          duration,
          slow: true
        })
      );
    });
  });

  describe('Cache Management', () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it('should respect cache size limits', async () => {
      // Fill cache beyond limit
      for (let i = 0; i < storage.MAX_CACHE_SIZE + 10; i++) {
        storage.cache.set(`test_${i}`, {
          data: { id: i },
          timestamp: Date.now()
        });
      }

      // Trigger cache cleanup
      storage.clearExpiredCache();
      
      expect(storage.cache.size).toBeLessThanOrEqual(storage.MAX_CACHE_SIZE);
    });

    it('should clear expired cache entries', async () => {
      const expiredTime = Date.now() - (storage.CACHE_TIMEOUT + 1000);
      const validTime = Date.now();

      storage.cache.set('expired_key', {
        data: { id: 'expired' },
        timestamp: expiredTime
      });

      storage.cache.set('valid_key', {
        data: { id: 'valid' },
        timestamp: validTime
      });

      storage.clearExpiredCache();

      expect(storage.cache.has('expired_key')).toBe(false);
      expect(storage.cache.has('valid_key')).toBe(true);
    });
  });

  describe('Backup Support Methods', () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it('should get all user profiles for backup', async () => {
      const profiles = [
        { id: 'profile1', name: 'User 1' },
        { id: 'profile2', name: 'User 2' }
      ];

      mockIDBObjectStore.getAll.mockReturnValueOnce({
        ...mockIDBRequest(profiles),
        onsuccess: null
      });

      const result = await storage.getAllUserProfiles();
      
      expect(result).toEqual(profiles);
      expect(mockIDBTransaction.objectStore).toHaveBeenCalledWith('userProfiles');
    });

    it('should check record existence', async () => {
      const recordId = 'test_record';
      
      mockIDBObjectStore.getKey.mockReturnValueOnce({
        ...mockIDBRequest(recordId),
        onsuccess: null
      });

      const exists = await storage.recordExists('activities', recordId);
      
      expect(exists).toBe(true);
      expect(mockIDBObjectStore.getKey).toHaveBeenCalledWith(recordId);
    });

    it('should save record to specific store', async () => {
      const record = { id: 'test_123', data: 'test data' };
      
      mockIDBObjectStore.put.mockReturnValueOnce({
        ...mockIDBRequest(),
        onsuccess: null
      });

      await storage.saveToStore('testStore', record);
      
      expect(mockIDBTransaction.objectStore).toHaveBeenCalledWith('testStore');
      expect(mockIDBObjectStore.put).toHaveBeenCalledWith(record);
    });
  });

  describe('Sync State Management', () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it('should save sync state', async () => {
      const syncState = {
        source: 'strava',
        lastSync: '2024-01-15T10:00:00Z',
        status: 'completed'
      };

      mockIDBObjectStore.put.mockReturnValueOnce({
        ...mockIDBRequest(),
        onsuccess: null
      });

      await storage.saveSyncState(syncState);
      
      expect(mockIDBObjectStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          ...syncState,
          id: expect.stringContaining('sync_'),
          timestamp: expect.any(String)
        })
      );
    });

    it('should get sync state by source', async () => {
      const source = 'strava';
      const syncStates = [
        { id: 'sync1', source: 'strava', status: 'completed' },
        { id: 'sync2', source: 'garmin', status: 'pending' }
      ];

      mockIDBObjectStore.getAll.mockReturnValueOnce({
        ...mockIDBRequest(syncStates),
        onsuccess: null
      });

      const result = await storage.getSyncState(source);
      
      expect(result).toEqual([syncStates[0]]);
    });
  });

  describe('Training Metrics', () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it('should save training metrics', async () => {
      const metrics = {
        userId: 'user123',
        date: '2024-01-15',
        tss: 95,
        if: 0.85,
        np: 250
      };

      mockIDBObjectStore.put.mockReturnValueOnce({
        ...mockIDBRequest(),
        onsuccess: null
      });

      await storage.saveTrainingMetrics(metrics);
      
      expect(mockIDBObjectStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          ...metrics,
          id: expect.stringContaining('metrics_'),
          timestamp: expect.any(String)
        })
      );
    });

    it('should get training metrics with date filtering', async () => {
      const userId = 'user123';
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      
      const allMetrics = [
        { id: 'm1', userId, date: '2024-01-15', tss: 95 },
        { id: 'm2', userId, date: '2024-02-01', tss: 87 },
        { id: 'm3', userId: 'other', date: '2024-01-20', tss: 102 }
      ];

      mockIDBObjectStore.getAll.mockReturnValueOnce({
        ...mockIDBRequest(allMetrics),
        onsuccess: null
      });

      const result = await storage.getTrainingMetrics(userId, { startDate, endDate });
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(allMetrics[0]);
    });
  });

  describe('App Settings', () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it('should save app settings', async () => {
      const settings = {
        theme: 'dark',
        units: 'metric',
        language: 'en'
      };

      mockIDBObjectStore.put.mockReturnValueOnce({
        ...mockIDBRequest(),
        onsuccess: null
      });

      await storage.saveAppSettings(settings);
      
      expect(mockIDBObjectStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          ...settings,
          id: expect.stringContaining('settings_'),
          timestamp: expect.any(String)
        })
      );
    });

    it('should get app settings', async () => {
      const settings = [
        { id: 'settings_1', theme: 'dark', units: 'metric' }
      ];

      mockIDBObjectStore.getAll.mockReturnValueOnce({
        ...mockIDBRequest(settings),
        onsuccess: null
      });

      const result = await storage.getAppSettings();
      
      expect(result).toEqual(settings[0]);
    });
  });

  describe('Performance Metrics', () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it('should save performance metrics', async () => {
      const metric = {
        type: 'operation',
        operation: 'saveActivity',
        duration: 120,
        success: true
      };

      mockIDBObjectStore.put.mockReturnValueOnce({
        ...mockIDBRequest(),
        onsuccess: null
      });

      await storage.savePerformanceMetric(metric);
      
      expect(mockIDBObjectStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          ...metric,
          id: expect.stringContaining('metric_'),
          timestamp: expect.any(String)
        })
      );
    });

    it('should get filtered performance metrics', async () => {
      const allMetrics = [
        { id: 'm1', type: 'operation', operation: 'save', timestamp: '2024-01-15T10:00:00Z' },
        { id: 'm2', type: 'system', operation: 'load', timestamp: '2024-01-16T10:00:00Z' },
        { id: 'm3', type: 'operation', operation: 'delete', timestamp: '2024-01-17T10:00:00Z' }
      ];

      mockIDBObjectStore.getAll.mockReturnValueOnce({
        ...mockIDBRequest(allMetrics),
        onsuccess: null
      });

      const options = {
        type: 'operation',
        startDate: '2024-01-14T00:00:00Z',
        endDate: '2024-01-16T23:59:59Z',
        limit: 10
      };

      const result = await storage.getPerformanceMetrics(options);
      
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('operation');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it('should handle database transaction errors', async () => {
      mockIDBObjectStore.put.mockReturnValueOnce({
        ...mockIDBRequest(null, new Error('Transaction failed')),
        onsuccess: null,
        onerror: null
      });

      const activity = { id: 'test', type: 'cycling' };
      
      await expect(storage.saveActivity(activity)).rejects.toThrow('Transaction failed');
    });

    it('should handle missing records gracefully', async () => {
      mockIDBObjectStore.get.mockReturnValueOnce({
        ...mockIDBRequest(undefined),
        onsuccess: null
      });

      const result = await storage.getActivity('nonexistent');
      
      expect(result).toBeNull();
    });

    it('should handle cache errors gracefully', async () => {
      // Mock cache to throw error
      storage.cache = {
        get: vi.fn(() => { throw new Error('Cache error'); }),
        set: vi.fn(),
        has: vi.fn(() => false),
        delete: vi.fn(),
        clear: vi.fn(),
        size: 0
      };

      mockIDBObjectStore.get.mockReturnValueOnce({
        ...mockIDBRequest({ id: 'test', type: 'cycling' }),
        onsuccess: null
      });

      // Should fall back to database
      const result = await storage.getActivity('test');
      
      expect(result).toEqual({ id: 'test', type: 'cycling' });
      expect(mockIDBObjectStore.get).toHaveBeenCalled();
    });
  });
});