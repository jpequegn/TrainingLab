/**
 * Performance Suite Tests
 * Basic tests for the advanced performance optimization suite
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PerformanceSuite } from '../../src/performance/performance-suite.js';
import { powerCalculations } from '../../src/performance/wasm/power-calculations.js';
import { workerManager } from '../../src/performance/workers/worker-manager.js';

// Mock dependencies
vi.mock('../../src/performance/wasm/power-calculations.js', () => ({
  powerCalculations: {
    initialize: vi.fn().mockResolvedValue(true),
    calculatePowerStats: vi.fn().mockResolvedValue({
      average: 200,
      max: 400,
      min: 100,
      normalizedPower: 220
    }),
    getPerformanceInfo: vi.fn().mockReturnValue({
      loaded: true,
      moduleType: 'fallback',
      wasmSupported: false
    })
  }
}));

vi.mock('../../src/performance/workers/worker-manager.js', () => ({
  workerManager: {
    initialize: vi.fn().mockResolvedValue(true),
    executeTask: vi.fn().mockResolvedValue({ result: 'processed' }),
    getStatistics: vi.fn().mockReturnValue({
      supported: true,
      totalWorkers: 4,
      activeTasks: 0,
      queuedTasks: 0
    })
  }
}));

// Mock browser APIs
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

global.performance = {
  now: vi.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 10000000,
    totalJSHeapSize: 20000000,
    jsHeapSizeLimit: 100000000
  }
};

global.Worker = vi.fn().mockImplementation(() => ({
  postMessage: vi.fn(),
  terminate: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
}));

describe('PerformanceSuite', () => {
  let performanceSuite;

  beforeEach(() => {
    performanceSuite = new PerformanceSuite({
      enableWasm: true,
      enableWorkers: true,
      enableVirtualization: true,
      enableLazyLoading: true,
      enableCDN: true,
      enableQueryOptimization: true,
      autoOptimize: false // Disable for testing
    });
  });

  afterEach(() => {
    if (performanceSuite && performanceSuite.isInitialized) {
      performanceSuite.destroy();
    }
  });

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      expect(performanceSuite).toBeDefined();
      expect(performanceSuite.options.enableWasm).toBe(true);
      expect(performanceSuite.options.enableWorkers).toBe(true);
      expect(performanceSuite.isInitialized).toBe(false);
    });

    it('should initialize all components', async () => {
      await performanceSuite.initialize();
      
      expect(performanceSuite.isInitialized).toBe(true);
      expect(performanceSuite.metrics.initialized).toBe(true);
      expect(performanceSuite.metrics.componentsLoaded).toBeGreaterThan(0);
      expect(powerCalculations.initialize).toHaveBeenCalled();
      expect(workerManager.initialize).toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', async () => {
      // Mock initialization failure
      powerCalculations.initialize.mockRejectedValueOnce(new Error('WASM failed'));
      
      await expect(performanceSuite.initialize()).rejects.toThrow();
      expect(performanceSuite.isInitialized).toBe(false);
    });
  });

  describe('Component Management', () => {
    beforeEach(async () => {
      await performanceSuite.initialize();
    });

    it('should track component status', () => {
      const status = performanceSuite.getComponentStatus();
      
      expect(status).toBeDefined();
      expect(status.wasm).toBeDefined();
      expect(status.wasm.type).toBe('computation');
      expect(status.workers).toBeDefined();
      expect(status.workers.type).toBe('background');
    });

    it('should get performance metrics from all components', async () => {
      const metrics = await performanceSuite.getPerformanceMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.suite).toBeDefined();
      expect(metrics.components).toBeDefined();
      expect(metrics.suite.performanceScore).toBeGreaterThanOrEqual(0);
      expect(metrics.suite.performanceScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Workout Processing', () => {
    beforeEach(async () => {
      await performanceSuite.initialize();
    });

    it('should process workout data using WASM', async () => {
      const workoutData = {
        segments: [
          { power: 200, duration: 300 },
          { power: 250, duration: 600 },
          { power: 180, duration: 300 }
        ]
      };

      const result = await performanceSuite.processWorkout(workoutData);
      
      expect(result).toBeDefined();
      expect(result.average).toBe(200);
      expect(powerCalculations.calculatePowerStats).toHaveBeenCalled();
    });

    it('should fallback to worker processing when specified', async () => {
      const workoutData = {
        segments: [
          { power: 200, duration: 300 }
        ]
      };

      await performanceSuite.processWorkout(workoutData, { useWorker: true });
      
      expect(workerManager.executeTask).toHaveBeenCalledWith(
        'analytics',
        'processWorkout',
        workoutData,
        { useWorker: true }
      );
    });
  });

  describe('Virtual Scrolling', () => {
    beforeEach(async () => {
      await performanceSuite.initialize();
    });

    it('should create virtual scroller', () => {
      const container = document.createElement('div');
      const scroller = performanceSuite.createVirtualScroller(container, {
        itemHeight: 50,
        renderItem: (item) => `<div>${item.name}</div>`
      });

      expect(scroller).toBeDefined();
      expect(scroller.constructor.name).toBe('VirtualScroller');
    });

    it('should return null when virtualization is disabled', () => {
      performanceSuite.options.enableVirtualization = false;
      
      const container = document.createElement('div');
      const scroller = performanceSuite.createVirtualScroller(container);

      expect(scroller).toBeNull();
    });
  });

  describe('Performance Analysis', () => {
    beforeEach(async () => {
      await performanceSuite.initialize();
    });

    it('should calculate performance score', async () => {
      const metrics = await performanceSuite.getPerformanceMetrics();
      const score = performanceSuite.calculatePerformanceScore(metrics);
      
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should analyze performance and suggest optimizations', async () => {
      const metrics = await performanceSuite.getPerformanceMetrics();
      const suggestions = performanceSuite.analyzePerformance(metrics);
      
      expect(Array.isArray(suggestions)).toBe(true);
      
      // Check suggestion structure if any exist
      if (suggestions.length > 0) {
        expect(suggestions[0]).toHaveProperty('type');
        expect(suggestions[0]).toHaveProperty('priority');
        expect(suggestions[0]).toHaveProperty('message');
        expect(suggestions[0]).toHaveProperty('action');
      }
    });
  });

  describe('Asset Loading', () => {
    beforeEach(async () => {
      await performanceSuite.initialize();
    });

    it('should load assets with CDN optimization', async () => {
      // Mock fetch for asset loading
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob())
      });

      const assets = ['/image1.jpg', '/image2.png'];
      const results = await performanceSuite.loadAssets(assets);
      
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(2);
    });
  });

  describe('Cleanup', () => {
    it('should destroy all components properly', async () => {
      await performanceSuite.initialize();
      
      expect(performanceSuite.isInitialized).toBe(true);
      
      performanceSuite.destroy();
      
      expect(performanceSuite.isInitialized).toBe(false);
      expect(performanceSuite.components.size).toBe(0);
    });
  });
});

describe('Performance Suite Integration', () => {
  it('should emit ready event after initialization', (done) => {
    const performanceSuite = new PerformanceSuite({ autoOptimize: false });
    
    document.addEventListener('performance-suite:ready', (event) => {
      expect(event.detail.suite).toBe(performanceSuite);
      expect(event.detail.metrics).toBeDefined();
      performanceSuite.destroy();
      done();
    });
    
    performanceSuite.initialize();
  });

  it('should handle component failures gracefully', async () => {
    // Mock component failure
    powerCalculations.initialize.mockRejectedValueOnce(new Error('Component failure'));
    
    const performanceSuite = new PerformanceSuite({ autoOptimize: false });
    
    await expect(performanceSuite.initialize()).rejects.toThrow('Component failure');
    
    // Should still be able to clean up
    expect(() => performanceSuite.destroy()).not.toThrow();
  });
});