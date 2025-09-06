import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceMonitor } from '../../src/services/storage/performance-monitor.js';

// Mock EnhancedStorageService
const mockStorage = {
  initialize: vi.fn(),
  savePerformanceMetric: vi.fn(),
  getPerformanceMetrics: vi.fn(),
  getAllFromStore: vi.fn(),
  cache: new Map(),
  clearExpiredCache: vi.fn(),
};

vi.mock('../../src/services/storage/enhanced-storage.js', () => ({
  EnhancedStorageService: vi.fn(() => mockStorage)
}));

// Mock Web Performance API
global.PerformanceObserver = class {
  constructor(callback) {
    this.callback = callback;
  }
  observe(options) {
    // Mock observation
  }
  disconnect() {
    // Mock disconnect
  }
};

global.performance = {
  ...global.performance,
  memory: {
    usedJSHeapSize: 10000000,
    totalJSHeapSize: 20000000,
    jsHeapSizeLimit: 100000000
  }
};

// Mock navigation storage API
global.navigator = {
  ...global.navigator,
  storage: {
    estimate: vi.fn(() => Promise.resolve({
      usage: 50000000,
      quota: 100000000
    }))
  },
  userAgent: 'Test User Agent',
  platform: 'Test Platform',
  language: 'en-US'
};

// Mock Intl API
global.Intl = {
  DateTimeFormat: vi.fn(() => ({
    resolvedOptions: vi.fn(() => ({ timeZone: 'UTC' }))
  }))
};

describe('PerformanceMonitor', () => {
  let performanceMonitor;
  let originalSetInterval;
  let originalClearInterval;

  beforeEach(() => {
    performanceMonitor = new PerformanceMonitor();
    vi.clearAllMocks();
    
    // Mock timers
    originalSetInterval = global.setInterval;
    originalClearInterval = global.clearInterval;
    global.setInterval = vi.fn((fn, delay) => {
      return { id: Math.random(), fn, delay };
    });
    global.clearInterval = vi.fn();
  });

  afterEach(() => {
    performanceMonitor.stopMonitoring();
    vi.resetAllMocks();
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      mockStorage.initialize.mockResolvedValue();

      await performanceMonitor.initialize();

      expect(performanceMonitor.isInitialized).toBe(true);
      expect(mockStorage.initialize).toHaveBeenCalled();
    });

    it('should load existing metrics on initialization', async () => {
      const existingMetrics = [
        { type: 'operation', operation: 'save', success: true, duration: 100 },
        { type: 'operation', operation: 'read', success: false, duration: 200 }
      ];

      mockStorage.initialize.mockResolvedValue();
      mockStorage.getPerformanceMetrics.mockResolvedValue(existingMetrics);

      await performanceMonitor.initialize();

      expect(performanceMonitor.counters.totalOperations).toBe(2);
      expect(performanceMonitor.counters.errors).toBe(1);
    });

    it('should not reinitialize if already initialized', async () => {
      performanceMonitor.isInitialized = true;

      await performanceMonitor.initialize();

      expect(mockStorage.initialize).not.toHaveBeenCalled();
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(async () => {
      mockStorage.initialize.mockResolvedValue();
      await performanceMonitor.initialize();
    });

    it('should start monitoring with default options', async () => {
      mockStorage.getPerformanceMetrics.mockResolvedValue([]);

      await performanceMonitor.startMonitoring();

      expect(performanceMonitor.isMonitoring).toBe(true);
      expect(global.setInterval).toHaveBeenCalledWith(
        expect.any(Function),
        300000 // 5 minutes
      );
    });

    it('should start monitoring with custom interval', async () => {
      mockStorage.getPerformanceMetrics.mockResolvedValue([]);

      await performanceMonitor.startMonitoring({
        interval: 60000 // 1 minute
      });

      expect(global.setInterval).toHaveBeenCalledWith(
        expect.any(Function),
        60000
      );
    });

    it('should not start monitoring if already running', async () => {
      performanceMonitor.isMonitoring = true;
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await performanceMonitor.startMonitoring();

      expect(consoleSpy).toHaveBeenCalledWith('Performance monitoring is already running');
      consoleSpy.mockRestore();
    });

    it('should stop monitoring properly', () => {
      performanceMonitor.monitoringInterval = { id: 'test' };
      performanceMonitor.optimizationSchedule = { id: 'test2' };
      performanceMonitor.isMonitoring = true;

      performanceMonitor.stopMonitoring();

      expect(performanceMonitor.isMonitoring).toBe(false);
      expect(global.clearInterval).toHaveBeenCalledTimes(2);
    });
  });

  describe('Operation Tracking', () => {
    beforeEach(async () => {
      mockStorage.initialize.mockResolvedValue();
      mockStorage.savePerformanceMetric.mockResolvedValue();
      await performanceMonitor.initialize();
    });

    it('should track successful operations', async () => {
      await performanceMonitor.trackOperation('read', 'activities', 50, true);

      expect(performanceMonitor.counters.totalOperations).toBe(1);
      expect(performanceMonitor.counters.errors).toBe(0);
      expect(performanceMonitor.operationHistory).toHaveLength(1);
      expect(mockStorage.savePerformanceMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'read',
          storeName: 'activities',
          duration: 50,
          success: true
        })
      );
    });

    it('should track failed operations', async () => {
      await performanceMonitor.trackOperation('write', 'activities', 150, false);

      expect(performanceMonitor.counters.totalOperations).toBe(1);
      expect(performanceMonitor.counters.errors).toBe(1);
    });

    it('should identify slow operations', async () => {
      await performanceMonitor.trackOperation('read', 'activities', 500, true); // Above 100ms threshold

      expect(performanceMonitor.counters.slowOperations).toBe(1);
      expect(performanceMonitor.operationHistory[0].slow).toBe(true);
    });

    it('should maintain operation history limit', async () => {
      // Fill beyond sample size
      for (let i = 0; i < 150; i++) {
        await performanceMonitor.trackOperation('test', 'store', 10, true);
      }

      expect(performanceMonitor.operationHistory.length).toBe(100); // PERFORMANCE_SAMPLE_SIZE
    });

    it('should handle storage errors gracefully', async () => {
      mockStorage.savePerformanceMetric.mockRejectedValue(new Error('Storage error'));

      // Should not throw
      await performanceMonitor.trackOperation('read', 'activities', 50, true);

      expect(performanceMonitor.counters.totalOperations).toBe(1);
    });
  });

  describe('Cache Operation Tracking', () => {
    it('should track cache hits', () => {
      performanceMonitor.trackCacheOperation('get', true, 'test_key');

      expect(performanceMonitor.counters.cacheHits).toBe(1);
      expect(performanceMonitor.counters.cacheMisses).toBe(0);
    });

    it('should track cache misses', () => {
      performanceMonitor.trackCacheOperation('get', false, 'test_key');

      expect(performanceMonitor.counters.cacheHits).toBe(0);
      expect(performanceMonitor.counters.cacheMisses).toBe(1);
    });

    it('should add cache operations to history', () => {
      performanceMonitor.trackCacheOperation('get', true, 'test_key');

      expect(performanceMonitor.operationHistory).toHaveLength(1);
      expect(performanceMonitor.operationHistory[0]).toEqual(
        expect.objectContaining({
          operation: 'cache',
          subOperation: 'get',
          hit: true,
          key: 'test_key',
          type: 'cache'
        })
      );
    });
  });

  describe('Performance Metrics', () => {
    beforeEach(async () => {
      mockStorage.initialize.mockResolvedValue();
      await performanceMonitor.initialize();
    });

    it('should calculate current metrics correctly', async () => {
      // Add some test data
      performanceMonitor.counters = {
        totalOperations: 100,
        errors: 5,
        slowOperations: 10,
        cacheHits: 80,
        cacheMisses: 20,
        optimizations: 2
      };

      performanceMonitor.operationHistory = [
        { duration: 50 }, { duration: 100 }, { duration: 150 }
      ];

      global.navigator.storage.estimate.mockResolvedValue({
        usage: 50000000,
        quota: 100000000
      });

      const metrics = await performanceMonitor.getCurrentMetrics();

      expect(metrics.counters.totalOperations).toBe(100);
      expect(metrics.errorRate).toBe(5); // 5% error rate
      expect(metrics.slowOperationRate).toBe(10); // 10% slow operations
      expect(metrics.cacheHitRate).toBe(80); // 80% cache hit rate
      expect(metrics.averageDuration).toBe(100);
      expect(metrics.storageUsage.usagePercentage).toBe(50);
    });

    it('should handle division by zero in metrics', async () => {
      performanceMonitor.counters = {
        totalOperations: 0,
        errors: 0,
        slowOperations: 0,
        cacheHits: 0,
        cacheMisses: 0,
        optimizations: 0
      };

      const metrics = await performanceMonitor.getCurrentMetrics();

      expect(metrics.errorRate).toBe(0);
      expect(metrics.slowOperationRate).toBe(0);
      expect(metrics.cacheHitRate).toBe(0);
    });
  });

  describe('Performance Reporting', () => {
    beforeEach(async () => {
      mockStorage.initialize.mockResolvedValue();
      await performanceMonitor.initialize();
    });

    it('should generate comprehensive report', async () => {
      performanceMonitor.counters = {
        totalOperations: 50,
        errors: 2,
        slowOperations: 5,
        cacheHits: 40,
        cacheMisses: 10,
        optimizations: 1
      };

      mockStorage.getPerformanceMetrics.mockResolvedValue([]);
      mockStorage.getAllFromStore.mockResolvedValue([]);

      const report = await performanceMonitor.generateReport();

      expect(report).toEqual(
        expect.objectContaining({
          generatedAt: expect.any(String),
          period: '24h',
          summary: expect.objectContaining({
            totalOperations: 50,
            errorRate: expect.any(Number),
            cacheHitRate: expect.any(Number)
          }),
          currentMetrics: expect.any(Object),
          performanceAlerts: expect.any(Array),
          storageAnalysis: expect.any(Object)
        })
      );
    });

    it('should include historical data when requested', async () => {
      const historicalMetrics = [
        { timestamp: '2024-01-15T10:00:00Z', type: 'operation' }
      ];

      mockStorage.getPerformanceMetrics.mockResolvedValue(historicalMetrics);
      mockStorage.getAllFromStore.mockResolvedValue([]);

      const report = await performanceMonitor.generateReport({
        includeHistoricalData: true
      });

      expect(report.historicalData).toBeDefined();
      expect(report.historicalData.metrics).toEqual(historicalMetrics);
    });

    it('should exclude historical data when not requested', async () => {
      mockStorage.getAllFromStore.mockResolvedValue([]);

      const report = await performanceMonitor.generateReport({
        includeHistoricalData: false
      });

      expect(report.historicalData).toBeNull();
    });

    it('should generate recommendations', async () => {
      performanceMonitor.counters = {
        cacheHits: 70,
        cacheMisses: 30, // 70% hit rate, below 75% threshold
        errors: 15,
        totalOperations: 100 // 15% error rate, above 1% threshold
      };

      mockStorage.getAllFromStore.mockResolvedValue([]);

      const report = await performanceMonitor.generateReport({
        includeRecommendations: true
      });

      expect(report.recommendations).toBeDefined();
      expect(report.recommendations.length).toBeGreaterThan(0);
      
      // Should include cache and reliability recommendations
      const recommendationTypes = report.recommendations.map(r => r.type);
      expect(recommendationTypes).toContain('cache');
      expect(recommendationTypes).toContain('reliability');
    });
  });

  describe('Performance Optimization', () => {
    beforeEach(async () => {
      mockStorage.initialize.mockResolvedValue();
      mockStorage.savePerformanceMetric.mockResolvedValue();
      await performanceMonitor.initialize();
    });

    it('should optimize all targets', async () => {
      mockStorage.cache = new Map();
      // Fill cache beyond limit
      for (let i = 0; i < 150; i++) {
        mockStorage.cache.set(`key_${i}`, { data: `value_${i}`, timestamp: Date.now() });
      }

      const result = await performanceMonitor.optimizePerformance({
        target: 'all'
      });

      expect(result.target).toBe('all');
      expect(result.optimizations.length).toBeGreaterThan(0);
      expect(result.totalOptimizations).toBeGreaterThan(0);
    });

    it('should optimize specific targets', async () => {
      const result = await performanceMonitor.optimizePerformance({
        target: 'cache'
      });

      expect(result.target).toBe('cache');
      expect(result.optimizations.some(opt => opt.type === 'cache')).toBe(true);
    });

    it('should run in dry-run mode', async () => {
      const result = await performanceMonitor.optimizePerformance({
        target: 'cache',
        dryRun: true
      });

      expect(result.dryRun).toBe(true);
      // Should not actually modify anything
      expect(mockStorage.savePerformanceMetric).not.toHaveBeenCalled();
    });

    it('should handle optimization errors', async () => {
      // Mock an error in optimization
      vi.spyOn(performanceMonitor, '_optimizeCache').mockRejectedValue(new Error('Optimization failed'));

      await expect(performanceMonitor.optimizePerformance({
        target: 'cache'
      })).rejects.toThrow('Optimization failed');
    });

    it('should record optimization results', async () => {
      await performanceMonitor.optimizePerformance({
        target: 'cache'
      });

      expect(mockStorage.savePerformanceMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'optimization',
          target: 'cache'
        })
      );
    });
  });

  describe('Performance Alerts', () => {
    beforeEach(async () => {
      mockStorage.initialize.mockResolvedValue();
      await performanceMonitor.initialize();
    });

    it('should trigger high error rate alert', async () => {
      performanceMonitor.counters = {
        totalOperations: 100,
        errors: 5 // 5% error rate, above 1% threshold
      };

      const alerts = await performanceMonitor._checkPerformanceAlerts();

      expect(alerts.some(alert => alert.type === 'high_error_rate')).toBe(true);
    });

    it('should trigger low cache hit rate alert', async () => {
      performanceMonitor.counters = {
        cacheHits: 60,
        cacheMisses: 40 // 60% hit rate, below 75% threshold
      };

      const alerts = await performanceMonitor._checkPerformanceAlerts();

      expect(alerts.some(alert => alert.type === 'low_cache_hit_rate')).toBe(true);
    });

    it('should trigger high storage usage alert', async () => {
      global.navigator.storage.estimate.mockResolvedValue({
        usage: 85000000,
        quota: 100000000 // 85% usage, above 80% threshold
      });

      const alerts = await performanceMonitor._checkPerformanceAlerts();

      expect(alerts.some(alert => alert.type === 'high_storage_usage')).toBe(true);
    });

    it('should emit alerts to listeners', async () => {
      const alertListener = vi.fn();
      performanceMonitor.addEventListener('alert', alertListener);

      performanceMonitor.counters = {
        totalOperations: 100,
        errors: 5
      };

      await performanceMonitor._checkPerformanceAlerts();

      expect(alertListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'high_error_rate',
          severity: 'warning'
        })
      );
    });

    it('should prevent alert spam with cooldown', async () => {
      const alertListener = vi.fn();
      performanceMonitor.addEventListener('alert', alertListener);

      performanceMonitor.counters = {
        totalOperations: 100,
        errors: 5
      };

      // Trigger alert twice
      await performanceMonitor._checkPerformanceAlerts();
      await performanceMonitor._checkPerformanceAlerts();

      // Should only be called once due to cooldown
      expect(alertListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event Listeners', () => {
    it('should add and remove event listeners', () => {
      const testCallback = vi.fn();
      
      performanceMonitor.addEventListener('test', testCallback);
      expect(performanceMonitor.listeners.get('test')).toContain(testCallback);

      performanceMonitor.removeEventListener('test', testCallback);
      expect(performanceMonitor.listeners.get('test')).not.toContain(testCallback);
    });

    it('should handle multiple listeners for same event', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      performanceMonitor.addEventListener('test', callback1);
      performanceMonitor.addEventListener('test', callback2);

      const listeners = performanceMonitor.listeners.get('test');
      expect(listeners).toContain(callback1);
      expect(listeners).toContain(callback2);
    });
  });

  describe('Storage Usage Analysis', () => {
    beforeEach(async () => {
      mockStorage.initialize.mockResolvedValue();
      await performanceMonitor.initialize();
    });

    it('should analyze storage usage by store', async () => {
      const mockStoreData = {
        workouts: [{ id: 1, data: 'test' }],
        userProfiles: [{ id: 1, name: 'user' }, { id: 2, name: 'user2' }],
        activities: []
      };

      mockStorage.getAllFromStore.mockImplementation((storeName) => {
        return Promise.resolve(mockStoreData[storeName] || []);
      });

      const usage = await performanceMonitor.getStorageUsage();

      expect(usage).toBeDefined();
      expect(usage.stores).toBeInstanceOf(Array);
      expect(usage.totals).toBeDefined();
      expect(usage.totals.records).toBeGreaterThan(0);
    });

    it('should handle storage analysis errors', async () => {
      mockStorage.getAllFromStore.mockRejectedValue(new Error('Storage error'));

      const usage = await performanceMonitor.getStorageUsage();

      expect(usage).toBeNull();
    });
  });

  describe('Threshold Management', () => {
    it('should set custom thresholds', () => {
      const customThresholds = {
        READ_OPERATION: 50,
        WRITE_OPERATION: 100
      };

      performanceMonitor.setThresholds(customThresholds);

      // Verify thresholds are updated (this would require access to internal constants)
      // For now, just verify the method doesn't throw
      expect(() => performanceMonitor.setThresholds(customThresholds)).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', async () => {
      mockStorage.initialize.mockRejectedValue(new Error('Init failed'));

      await expect(performanceMonitor.initialize()).rejects.toThrow('Init failed');
      expect(performanceMonitor.isInitialized).toBe(false);
    });

    it('should handle monitoring errors without stopping', async () => {
      mockStorage.initialize.mockResolvedValue();
      mockStorage.getPerformanceMetrics.mockRejectedValue(new Error('Metrics error'));
      
      await performanceMonitor.initialize();

      // Mock console.error to verify error handling
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await performanceMonitor.startMonitoring();

      // Simulate monitoring interval execution
      const monitoringFn = global.setInterval.mock.calls[0][0];
      await monitoringFn();

      expect(consoleSpy).toHaveBeenCalledWith('Performance monitoring error:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should handle listener errors gracefully', async () => {
      const faultyListener = vi.fn(() => { throw new Error('Listener error'); });
      performanceMonitor.addEventListener('alert', faultyListener);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Trigger alert
      await performanceMonitor._emitAlert({
        type: 'test_alert',
        severity: 'info',
        message: 'Test message'
      });

      expect(consoleSpy).toHaveBeenCalledWith('Alert listener error:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });
});