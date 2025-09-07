/**
 * Advanced Performance Optimization Suite
 * Central integration point for all performance optimizations
 */

import { wasmLoader, powerCalculations } from './wasm/power-calculations.js';
import { workerManager } from './workers/worker-manager.js';
import { VirtualScroller } from './virtualization/virtual-scroller.js';
import { LazyLoader, initializeLazyLoader } from './lazy-loading/lazy-loader.js';
import { cdnOptimizer } from './cdn/cdn-optimizer.js';
import { QueryOptimizer } from './database/query-optimizer.js';
import { performanceOptimizer } from './performance-optimizer.js';
import { performanceMonitor } from '../services/storage/performance-monitor.js';

export class PerformanceSuite {
  constructor(options = {}) {
    this.options = {
      enableWasm: true,
      enableWorkers: true,
      enableVirtualization: true,
      enableLazyLoading: true,
      enableCDN: true,
      enableQueryOptimization: true,
      enablePerformanceMonitoring: true,
      autoOptimize: true,
      performanceTargets: {
        initialLoad: 2000, // 2 seconds
        workoutProcessing: 500, // 500ms
        listScrolling: 16, // 60fps
        chartRendering: 100, // 100ms
        backgroundTasks: 0 // No UI blocking
      },
      ...options
    };

    this.components = new Map();
    this.metrics = {
      initialized: false,
      componentsLoaded: 0,
      totalComponents: 0,
      performanceScore: 0,
      targets: { ...this.options.performanceTargets }
    };

    this.isInitialized = false;
  }

  /**
   * Initialize the complete performance suite
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log('🚀 Initializing Advanced Performance Suite...');
    const startTime = performance.now();

    try {
      // Initialize components in dependency order
      await this.initializeCore();
      await this.initializeOptimizations();
      await this.initializeMonitoring();
      
      // Setup auto-optimization
      if (this.options.autoOptimize) {
        this.setupAutoOptimization();
      }

      const initTime = performance.now() - startTime;
      this.metrics.initialized = true;
      this.metrics.initializationTime = initTime;

      console.log(`✅ Performance Suite initialized in ${initTime.toFixed(2)}ms`);
      console.log(`📊 Loaded ${this.metrics.componentsLoaded}/${this.metrics.totalComponents} components`);

      this.isInitialized = true;
      
      // Dispatch ready event
      document.dispatchEvent(new CustomEvent('performance-suite:ready', {
        detail: { suite: this, metrics: this.metrics }
      }));

    } catch (error) {
      console.error('❌ Performance Suite initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize core performance components
   */
  async initializeCore() {
    this.metrics.totalComponents = 6; // Update as components are added

    // 1. WebAssembly Module Loader
    if (this.options.enableWasm) {
      try {
        await powerCalculations.initialize();
        this.components.set('wasm', { 
          instance: powerCalculations, 
          type: 'computation',
          status: 'ready'
        });
        this.metrics.componentsLoaded++;
        console.log('✅ WebAssembly power calculations loaded');
      } catch (error) {
        console.warn('⚠️ WebAssembly initialization failed, using fallback:', error);
        this.components.set('wasm', { 
          instance: powerCalculations, 
          type: 'computation',
          status: 'fallback'
        });
      }
    }

    // 2. Web Worker Manager
    if (this.options.enableWorkers) {
      try {
        await workerManager.initialize();
        this.components.set('workers', { 
          instance: workerManager, 
          type: 'background',
          status: 'ready'
        });
        this.metrics.componentsLoaded++;
        console.log('✅ Web Worker system initialized');
      } catch (error) {
        console.warn('⚠️ Web Worker initialization failed:', error);
        this.components.set('workers', { 
          instance: workerManager, 
          type: 'background',
          status: 'error'
        });
      }
    }

    // 3. Lazy Loading System
    if (this.options.enableLazyLoading) {
      try {
        const lazyLoader = initializeLazyLoader({
          enablePreloading: true,
          preloadDistance: '200px',
          maxConcurrent: 3
        });
        this.components.set('lazyLoader', { 
          instance: lazyLoader, 
          type: 'ui',
          status: 'ready'
        });
        this.metrics.componentsLoaded++;
        console.log('✅ Lazy loading system initialized');
      } catch (error) {
        console.warn('⚠️ Lazy loading initialization failed:', error);
      }
    }

    // 4. CDN Optimizer
    if (this.options.enableCDN) {
      try {
        // CDN optimizer initializes synchronously
        this.components.set('cdn', { 
          instance: cdnOptimizer, 
          type: 'network',
          status: 'ready'
        });
        this.metrics.componentsLoaded++;
        console.log('✅ CDN optimization system ready');
      } catch (error) {
        console.warn('⚠️ CDN optimizer initialization failed:', error);
      }
    }
  }

  /**
   * Initialize optimization systems
   */
  async initializeOptimizations() {
    // Query Optimizer (requires storage service)
    if (this.options.enableQueryOptimization) {
      try {
        // Query optimizer will be initialized when storage service is available
        this.components.set('queryOptimizer', { 
          instance: null, // Will be set when storage is available
          type: 'database',
          status: 'pending'
        });
        console.log('✅ Query optimizer ready for integration');
      } catch (error) {
        console.warn('⚠️ Query optimizer setup failed:', error);
      }
    }

    // Performance Optimizer (existing)
    if (performanceOptimizer) {
      this.components.set('performanceOptimizer', { 
        instance: performanceOptimizer, 
        type: 'monitoring',
        status: 'ready'
      });
      this.metrics.componentsLoaded++;
      console.log('✅ Performance optimizer integrated');
    }
  }

  /**
   * Initialize monitoring systems
   */
  async initializeMonitoring() {
    if (this.options.enablePerformanceMonitoring) {
      try {
        await performanceMonitor.initialize();
        await performanceMonitor.startMonitoring({
          interval: 30000, // 30 seconds
          enableAlerts: true,
          enableOptimization: true
        });
        
        this.components.set('performanceMonitor', { 
          instance: performanceMonitor, 
          type: 'monitoring',
          status: 'ready'
        });
        this.metrics.componentsLoaded++;
        console.log('✅ Performance monitoring started');
      } catch (error) {
        console.warn('⚠️ Performance monitoring failed to start:', error);
      }
    }
  }

  /**
   * Setup auto-optimization based on performance metrics
   */
  setupAutoOptimization() {
    const optimizationInterval = setInterval(async () => {
      try {
        const metrics = await this.getPerformanceMetrics();
        const suggestions = this.analyzePerformance(metrics);
        
        if (suggestions.length > 0) {
          console.log('🔧 Auto-optimization suggestions:', suggestions);
          await this.applyOptimizations(suggestions);
        }
      } catch (error) {
        console.warn('Auto-optimization failed:', error);
      }
    }, 300000); // Every 5 minutes

    // Store interval for cleanup
    this.optimizationInterval = optimizationInterval;
  }

  /**
   * Create virtual scroller for large lists
   * @param {Element} container - Container element
   * @param {Object} options - Virtualization options
   * @returns {VirtualScroller} Virtual scroller instance
   */
  createVirtualScroller(container, options = {}) {
    if (!this.options.enableVirtualization) {
      console.warn('Virtualization is disabled');
      return null;
    }

    try {
      const scroller = new VirtualScroller(container, {
        itemHeight: 60,
        bufferSize: 5,
        overscan: 3,
        ...options
      });

      // Track scroller for cleanup
      if (!this.components.has('virtualScrollers')) {
        this.components.set('virtualScrollers', { 
          instances: [], 
          type: 'ui',
          status: 'ready'
        });
      }
      
      this.components.get('virtualScrollers').instances.push(scroller);
      
      return scroller;
    } catch (error) {
      console.error('Failed to create virtual scroller:', error);
      return null;
    }
  }

  /**
   * Initialize query optimizer with storage service
   * @param {Object} storageService - Storage service instance
   */
  initializeQueryOptimizer(storageService) {
    if (!this.options.enableQueryOptimization || !storageService) return;

    try {
      const queryOptimizer = new QueryOptimizer(storageService);
      
      this.components.set('queryOptimizer', { 
        instance: queryOptimizer, 
        type: 'database',
        status: 'ready'
      });
      
      console.log('✅ Query optimizer initialized with storage service');
      return queryOptimizer;
    } catch (error) {
      console.error('Failed to initialize query optimizer:', error);
      return null;
    }
  }

  /**
   * Process workout data using optimized calculations
   * @param {Object} workoutData - Workout data
   * @param {Object} options - Processing options
   */
  async processWorkout(workoutData, options = {}) {
    const wasmComponent = this.components.get('wasm');
    const workerComponent = this.components.get('workers');

    if (options.useWorker && workerComponent?.status === 'ready') {
      // Process in background worker
      try {
        return await workerComponent.instance.executeTask(
          'analytics',
          'processWorkout',
          workoutData,
          options
        );
      } catch (error) {
        console.warn('Worker processing failed, falling back to main thread:', error);
      }
    }

    // Process using WASM or fallback
    if (wasmComponent?.status === 'ready') {
      return await wasmComponent.instance.calculatePowerStats(workoutData.segments?.map(s => s.power) || []);
    }

    throw new Error('No processing method available');
  }

  /**
   * Load and optimize assets
   * @param {Array} assets - Array of asset paths
   * @param {Object} options - Loading options
   */
  async loadAssets(assets, options = {}) {
    const cdnComponent = this.components.get('cdn');
    const lazyComponent = this.components.get('lazyLoader');

    if (options.lazy && lazyComponent?.status === 'ready') {
      // Use lazy loading
      return assets.map(asset => {
        const element = document.querySelector(`[data-src="${asset}"]`);
        if (element) {
          lazyComponent.instance.observe(element, options);
        }
        return element;
      });
    }

    if (cdnComponent?.status === 'ready') {
      // Use CDN optimization
      return Promise.all(
        assets.map(asset => cdnComponent.instance.loadAsset(asset, options))
      );
    }

    // Fallback loading
    return Promise.all(
      assets.map(asset => fetch(asset).then(r => r.blob()))
    );
  }

  /**
   * Get comprehensive performance metrics
   */
  async getPerformanceMetrics() {
    const metrics = {
      suite: { ...this.metrics },
      components: {}
    };

    // Collect metrics from each component
    for (const [name, component] of this.components.entries()) {
      try {
        const instance = component.instance;
        if (instance && typeof instance.getMetrics === 'function') {
          metrics.components[name] = await instance.getMetrics();
        } else if (instance && typeof instance.getStatistics === 'function') {
          metrics.components[name] = await instance.getStatistics();
        } else if (instance && typeof instance.getSummary === 'function') {
          metrics.components[name] = await instance.getSummary();
        }
      } catch (error) {
        console.warn(`Failed to get metrics from ${name}:`, error);
        metrics.components[name] = { error: error.message };
      }
    }

    // Calculate overall performance score
    metrics.suite.performanceScore = this.calculatePerformanceScore(metrics);

    return metrics;
  }

  /**
   * Calculate overall performance score (0-100)
   */
  calculatePerformanceScore(metrics) {
    let score = 100;
    const penalties = [];

    // Check performance targets
    if (metrics.components.performanceOptimizer) {
      const perf = metrics.components.performanceOptimizer;
      
      if (perf.issues) {
        perf.issues.forEach(issue => {
          switch (issue.severity) {
            case 'high':
              score -= 20;
              penalties.push(`High severity: ${issue.type}`);
              break;
            case 'medium':
              score -= 10;
              penalties.push(`Medium severity: ${issue.type}`);
              break;
            case 'low':
              score -= 5;
              penalties.push(`Low severity: ${issue.type}`);
              break;
          }
        });
      }
    }

    // Check component health
    let healthyComponents = 0;
    let totalComponents = 0;
    
    for (const [name, component] of this.components.entries()) {
      totalComponents++;
      if (component.status === 'ready') {
        healthyComponents++;
      } else if (component.status === 'error') {
        score -= 15;
        penalties.push(`Component error: ${name}`);
      }
    }

    // Component health bonus
    const healthRatio = healthyComponents / totalComponents;
    score *= healthRatio;

    this.lastPerformancePenalties = penalties;
    return Math.max(0, Math.round(score));
  }

  /**
   * Analyze performance and suggest optimizations
   */
  analyzePerformance(metrics) {
    const suggestions = [];

    // Check cache hit rates
    if (metrics.components.queryOptimizer?.cacheStats?.hitRate < 50) {
      suggestions.push({
        type: 'cache',
        priority: 'medium',
        message: 'Low cache hit rate - consider optimizing query patterns',
        action: 'optimize_caching'
      });
    }

    // Check worker utilization
    if (metrics.components.workers?.activeTasks === 0 && this.options.enableWorkers) {
      suggestions.push({
        type: 'workers',
        priority: 'low',
        message: 'Workers are underutilized - consider offloading more tasks',
        action: 'increase_worker_usage'
      });
    }

    // Check CDN performance
    if (metrics.components.cdn?.successRate < 95) {
      suggestions.push({
        type: 'cdn',
        priority: 'high',
        message: 'CDN success rate is low - check network connectivity',
        action: 'check_cdn_health'
      });
    }

    // Check lazy loading effectiveness
    if (metrics.components.lazyLoader?.loadSuccessRate < 90) {
      suggestions.push({
        type: 'lazy_loading',
        priority: 'medium',
        message: 'Lazy loading failure rate is high - check image sources',
        action: 'fix_lazy_loading'
      });
    }

    return suggestions;
  }

  /**
   * Apply performance optimizations
   */
  async applyOptimizations(suggestions) {
    for (const suggestion of suggestions) {
      try {
        switch (suggestion.action) {
          case 'optimize_caching':
            await this.optimizeCaching();
            break;
          case 'increase_worker_usage':
            this.optimizeWorkerUsage();
            break;
          case 'check_cdn_health':
            await this.checkCDNHealth();
            break;
          case 'fix_lazy_loading':
            this.optimizeLazyLoading();
            break;
          default:
            console.warn(`Unknown optimization action: ${suggestion.action}`);
        }
        
        console.log(`✅ Applied optimization: ${suggestion.type}`);
      } catch (error) {
        console.error(`❌ Failed to apply optimization ${suggestion.type}:`, error);
      }
    }
  }

  /**
   * Optimization implementations
   */
  async optimizeCaching() {
    const queryOptimizer = this.components.get('queryOptimizer')?.instance;
    if (queryOptimizer) {
      // Increase cache TTL for frequently accessed queries
      queryOptimizer.defaultCacheTTL = 600000; // 10 minutes
    }
  }

  optimizeWorkerUsage() {
    // Enable automatic background processing for suitable tasks
    document.addEventListener('data-processing-needed', (event) => {
      const workerManager = this.components.get('workers')?.instance;
      if (workerManager) {
        workerManager.executeTask('analytics', 'processData', event.detail);
      }
    });
  }

  async checkCDNHealth() {
    const cdn = this.components.get('cdn')?.instance;
    if (cdn) {
      // Force CDN performance test
      await cdn.testCDNPerformance();
    }
  }

  optimizeLazyLoading() {
    const lazyLoader = this.components.get('lazyLoader')?.instance;
    if (lazyLoader) {
      // Reduce retry attempts for faster fallback
      lazyLoader.options.retryAttempts = 2;
      lazyLoader.options.retryDelay = 500;
    }
  }

  /**
   * Get component status summary
   */
  getComponentStatus() {
    const status = {};
    
    for (const [name, component] of this.components.entries()) {
      status[name] = {
        type: component.type,
        status: component.status,
        available: component.status === 'ready'
      };
    }
    
    return status;
  }

  /**
   * Destroy performance suite and clean up
   */
  destroy() {
    console.log('🧹 Destroying Performance Suite...');

    // Clear auto-optimization
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
    }

    // Destroy all components
    for (const [name, component] of this.components.entries()) {
      try {
        const instance = component.instance;
        
        if (instance && typeof instance.destroy === 'function') {
          instance.destroy();
        }
        
        if (name === 'virtualScrollers' && component.instances) {
          component.instances.forEach(scroller => {
            if (scroller.destroy) scroller.destroy();
          });
        }
      } catch (error) {
        console.warn(`Failed to destroy component ${name}:`, error);
      }
    }

    // Clear all data
    this.components.clear();
    this.isInitialized = false;

    console.log('✅ Performance Suite destroyed');
  }
}

// Export singleton instance
export const performanceSuite = new PerformanceSuite();

// Auto-initialize on load if enabled
if (typeof window !== 'undefined') {
  window.performanceSuite = performanceSuite;
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      performanceSuite.initialize();
    });
  } else {
    // DOM already ready
    setTimeout(() => performanceSuite.initialize(), 0);
  }
}