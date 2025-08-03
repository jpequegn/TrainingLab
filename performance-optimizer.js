/**
 * Advanced Performance Optimizer
 * Implements performance monitoring, optimization, and analytics
 */

import { stateManager } from './state-manager.js';

export class PerformanceOptimizer {
    constructor() {
        this.metrics = new Map();
        this.observers = new Map();
        this.optimizations = new Map();
        this.thresholds = {
            loadTime: 3000, // 3s
            renderTime: 16, // 60fps
            memoryUsage: 50 * 1024 * 1024, // 50MB
            bundleSize: 1024 * 1024, // 1MB
            imageSize: 500 * 1024 // 500KB
        };
        
        this.startTime = performance.now();
        this.setupPerformanceMonitoring();
        this.setupOptimizations();
    }
    
    /**
     * Setup comprehensive performance monitoring
     */
    setupPerformanceMonitoring() {
        // Navigation timing
        this.observeNavigationTiming();
        
        // Paint timing
        this.observePaintTiming();
        
        // Resource timing
        this.observeResourceTiming();
        
        // Memory usage
        this.observeMemoryUsage();
        
        // Core Web Vitals
        this.observeCoreWebVitals();
        
        // Custom metrics
        this.setupCustomMetrics();
        
        // Real-time monitoring
        this.startRealTimeMonitoring();
    }
    
    /**
     * Observe navigation timing
     */
    observeNavigationTiming() {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.recordMetric('navigation', {
                        type: entry.entryType,
                        loadStart: entry.loadEventStart,
                        loadEnd: entry.loadEventEnd,
                        domComplete: entry.domComplete,
                        domContentLoaded: entry.domContentLoadedEventEnd,
                        totalTime: entry.loadEventEnd - entry.loadEventStart
                    });
                }
            });
            
            observer.observe({ entryTypes: ['navigation'] });
            this.observers.set('navigation', observer);
        }
    }
    
    /**
     * Observe paint timing
     */
    observePaintTiming() {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.recordMetric('paint', {
                        name: entry.name,
                        startTime: entry.startTime,
                        duration: entry.duration
                    });
                    
                    if (entry.name === 'first-contentful-paint') {
                        this.analyzeFirstContentfulPaint(entry.startTime);
                    }
                }
            });
            
            observer.observe({ entryTypes: ['paint'] });
            this.observers.set('paint', observer);
        }
    }
    
    /**
     * Observe resource timing
     */
    observeResourceTiming() {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.recordMetric('resource', {
                        name: entry.name,
                        type: this.getResourceType(entry.name),
                        size: entry.transferSize || entry.encodedBodySize,
                        duration: entry.duration,
                        loadTime: entry.responseEnd - entry.requestStart
                    });
                    
                    this.analyzeResourcePerformance(entry);
                }
            });
            
            observer.observe({ entryTypes: ['resource'] });
            this.observers.set('resource', observer);
        }
    }
    
    /**
     * Observe memory usage
     */
    observeMemoryUsage() {
        if ('memory' in performance) {
            const checkMemory = () => {
                const memory = performance.memory;
                this.recordMetric('memory', {
                    used: memory.usedJSHeapSize,
                    total: memory.totalJSHeapSize,
                    limit: memory.jsHeapSizeLimit,
                    usage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
                });
                
                if (memory.usedJSHeapSize > this.thresholds.memoryUsage) {
                    this.suggestMemoryOptimization();
                }
            };
            
            checkMemory();
            setInterval(checkMemory, 10000); // Check every 10 seconds
        }
    }
    
    /**
     * Observe Core Web Vitals
     */
    observeCoreWebVitals() {
        // LCP (Largest Contentful Paint)
        this.observeLCP();
        
        // FID (First Input Delay)
        this.observeFID();
        
        // CLS (Cumulative Layout Shift)
        this.observeCLS();
    }
    
    observeLCP() {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                
                this.recordMetric('lcp', {
                    startTime: lastEntry.startTime,
                    size: lastEntry.size,
                    element: lastEntry.element?.tagName || 'unknown'
                });
                
                if (lastEntry.startTime > 2500) {
                    this.suggestLCPOptimization();
                }
            });
            
            observer.observe({ entryTypes: ['largest-contentful-paint'] });
            this.observers.set('lcp', observer);
        }
    }
    
    observeFID() {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.recordMetric('fid', {
                        delay: entry.processingStart - entry.startTime,
                        duration: entry.duration,
                        startTime: entry.startTime
                    });
                    
                    if (entry.processingStart - entry.startTime > 100) {
                        this.suggestFIDOptimization();
                    }
                }
            });
            
            observer.observe({ entryTypes: ['first-input'] });
            this.observers.set('fid', observer);
        }
    }
    
    observeCLS() {
        if ('PerformanceObserver' in window) {
            let clsValue = 0;
            
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                    }
                }
                
                this.recordMetric('cls', {
                    value: clsValue,
                    entries: list.getEntries().length
                });
                
                if (clsValue > 0.1) {
                    this.suggestCLSOptimization();
                }
            });
            
            observer.observe({ entryTypes: ['layout-shift'] });
            this.observers.set('cls', observer);
        }
    }
    
    /**
     * Setup custom application metrics
     */
    setupCustomMetrics() {
        // Chart rendering time
        this.measureChartPerformance();
        
        // File processing time
        this.measureFileProcessing();
        
        // State update performance
        this.measureStateUpdates();
        
        // Component lifecycle metrics
        this.measureComponentPerformance();
    }
    
    measureChartPerformance() {
        document.addEventListener('chart:initialized', () => {
            const initTime = performance.now() - this.startTime;
            this.recordMetric('chart-init', { duration: initTime });
        });
        
        document.addEventListener('chart:updated', (event) => {
            const updateStart = performance.now();
            
            // Measure update completion
            requestAnimationFrame(() => {
                const updateDuration = performance.now() - updateStart;
                this.recordMetric('chart-update', { duration: updateDuration });
            });
        });
    }
    
    measureFileProcessing() {
        // Hook into file upload process
        const originalFileReader = FileReader.prototype.readAsText;
        const self = this;
        
        FileReader.prototype.readAsText = function(...args) {
            const start = performance.now();
            
            this.addEventListener('load', () => {
                const duration = performance.now() - start;
                self.recordMetric('file-read', { duration, size: this.result.length });
            });
            
            return originalFileReader.apply(this, args);
        };
    }
    
    measureStateUpdates() {
        if (stateManager) {
            stateManager.addMiddleware((context) => {
                const start = performance.now();
                
                // Measure update time
                setTimeout(() => {
                    const duration = performance.now() - start;
                    this.recordMetric('state-update', {
                        path: context.path,
                        duration,
                        source: context.source
                    });
                }, 0);
                
                return true;
            });
        }
    }
    
    measureComponentPerformance() {
        // Hook into component lifecycle
        document.addEventListener('component:initialized', (event) => {
            this.recordMetric('component-init', {
                type: event.detail.component.constructor.name,
                duration: performance.now() - this.startTime
            });
        });
        
        document.addEventListener('component:destroy', (event) => {
            this.recordMetric('component-destroy', {
                type: event.detail.component.constructor.name
            });
        });
    }
    
    /**
     * Start real-time monitoring
     */
    startRealTimeMonitoring() {
        setInterval(() => {
            this.analyzePerformance();
            this.reportMetrics();
        }, 30000); // Every 30 seconds
    }
    
    /**
     * Record performance metric
     */
    recordMetric(type, data) {
        const timestamp = Date.now();
        
        if (!this.metrics.has(type)) {
            this.metrics.set(type, []);
        }
        
        this.metrics.get(type).push({
            ...data,
            timestamp
        });
        
        // Keep only last 100 entries per metric type
        const entries = this.metrics.get(type);
        if (entries.length > 100) {
            entries.shift();
        }
        
        // Update state manager with performance data
        if (stateManager) {
            stateManager.setState(`performanceMetrics.${type}`, data, { 
                silent: true, 
                source: 'performance-optimizer' 
            });
        }
    }
    
    /**
     * Analyze overall performance
     */
    analyzePerformance() {
        const analysis = {
            score: this.calculatePerformanceScore(),
            issues: this.identifyPerformanceIssues(),
            recommendations: this.generateRecommendations(),
            trends: this.analyzeTrends()
        };
        
        this.recordMetric('analysis', analysis);
        return analysis;
    }
    
    calculatePerformanceScore() {
        let score = 100;
        
        // Deduct points for slow metrics
        const lcp = this.getLatestMetric('lcp');
        if (lcp && lcp.startTime > 2500) {
            score -= 20;
        }
        
        const fid = this.getLatestMetric('fid');
        if (fid && fid.delay > 100) {
            score -= 15;
        }
        
        const cls = this.getLatestMetric('cls');
        if (cls && cls.value > 0.1) {
            score -= 15;
        }
        
        const memory = this.getLatestMetric('memory');
        if (memory && memory.usage > 80) {
            score -= 10;
        }
        
        return Math.max(0, score);
    }
    
    identifyPerformanceIssues() {
        const issues = [];
        
        // Check load time
        const navigation = this.getLatestMetric('navigation');
        if (navigation && navigation.totalTime > this.thresholds.loadTime) {
            issues.push({
                type: 'slow-load',
                severity: 'high',
                message: `Page load time (${navigation.totalTime}ms) exceeds threshold`,
                recommendation: 'Optimize bundle size and enable code splitting'
            });
        }
        
        // Check memory usage
        const memory = this.getLatestMetric('memory');
        if (memory && memory.used > this.thresholds.memoryUsage) {
            issues.push({
                type: 'high-memory',
                severity: 'medium',
                message: `Memory usage (${Math.round(memory.used / 1024 / 1024)}MB) is high`,
                recommendation: 'Review for memory leaks and optimize data structures'
            });
        }
        
        // Check resource sizes
        const resources = this.metrics.get('resource') || [];
        resources.forEach(resource => {
            if (resource.size > this.thresholds.bundleSize) {
                issues.push({
                    type: 'large-resource',
                    severity: 'medium',
                    message: `Large resource: ${resource.name} (${Math.round(resource.size / 1024)}KB)`,
                    recommendation: 'Compress or split large resources'
                });
            }
        });
        
        return issues;
    }
    
    generateRecommendations() {
        const recommendations = [];
        const issues = this.identifyPerformanceIssues();
        
        if (issues.some(issue => issue.type === 'slow-load')) {
            recommendations.push({
                priority: 'high',
                action: 'Enable code splitting and lazy loading',
                impact: 'Reduce initial bundle size by 30-50%'
            });
        }
        
        if (issues.some(issue => issue.type === 'high-memory')) {
            recommendations.push({
                priority: 'medium',
                action: 'Implement memory optimization techniques',
                impact: 'Reduce memory usage and prevent crashes'
            });
        }
        
        if (issues.some(issue => issue.type === 'large-resource')) {
            recommendations.push({
                priority: 'medium',
                action: 'Optimize resource loading and compression',
                impact: 'Faster page loads and reduced bandwidth usage'
            });
        }
        
        return recommendations;
    }
    
    analyzeTrends() {
        const trends = {};
        
        ['lcp', 'fid', 'cls', 'memory'].forEach(metric => {
            const entries = this.metrics.get(metric) || [];
            if (entries.length > 1) {
                const recent = entries.slice(-10);
                const values = recent.map(entry => this.getMetricValue(metric, entry));
                const trend = this.calculateTrend(values);
                
                trends[metric] = {
                    direction: trend > 0.1 ? 'worsening' : trend < -0.1 ? 'improving' : 'stable',
                    change: trend,
                    current: values[values.length - 1]
                };
            }
        });
        
        return trends;
    }
    
    getMetricValue(type, entry) {
        switch (type) {
        case 'lcp':
            return entry.startTime;
        case 'fid':
            return entry.delay;
        case 'cls':
            return entry.value;
        case 'memory':
            return entry.usage;
        default:
            return 0;
        }
    }
    
    calculateTrend(values) {
        if (values.length < 2) return 0;
        
        const first = values[0];
        const last = values[values.length - 1];
        
        return (last - first) / first;
    }
    
    /**
     * Setup performance optimizations
     */
    setupOptimizations() {
        // Image lazy loading
        this.setupImageLazyLoading();
        
        // Resource preloading
        this.setupResourcePreloading();
        
        // Memory cleanup
        this.setupMemoryCleanup();
        
        // Debounced operations
        this.setupDebouncedOperations();
        
        // Request optimization
        this.setupRequestOptimization();
    }
    
    setupImageLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                            imageObserver.unobserve(img);
                        }
                    }
                });
            });
            
            // Observe all images with data-src attribute
            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
            
            this.optimizations.set('image-lazy-loading', imageObserver);
        }
    }
    
    setupResourcePreloading() {
        const criticalResources = [
            '/chart-utils.js',
            '/state-manager.js',
            '/reactive-ui.js'
        ];
        
        criticalResources.forEach(resource => {
            const link = document.createElement('link');
            link.rel = 'modulepreload';
            link.href = resource;
            document.head.appendChild(link);
        });
    }
    
    setupMemoryCleanup() {
        // Cleanup interval for unused data
        setInterval(() => {
            this.cleanupMemory();
        }, 60000); // Every minute
        
        // Cleanup on page visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.cleanupMemory();
            }
        });
    }
    
    cleanupMemory() {
        // Clear old metric entries
        this.metrics.forEach((entries, type) => {
            if (entries.length > 50) {
                entries.splice(0, entries.length - 50);
            }
        });
        
        // Trigger garbage collection if available
        if (window.gc) {
            window.gc();
        }
    }
    
    setupDebouncedOperations() {
        // Debounce state updates
        if (stateManager) {
            const debouncedUpdates = new Map();
            
            stateManager.addMiddleware((context) => {
                const { path } = context;
                
                // Debounce frequent updates
                if (debouncedUpdates.has(path)) {
                    clearTimeout(debouncedUpdates.get(path));
                }
                
                debouncedUpdates.set(path, setTimeout(() => {
                    debouncedUpdates.delete(path);
                }, 100));
                
                return true;
            });
        }
    }
    
    setupRequestOptimization() {
        // Request deduplication
        const pendingRequests = new Map();
        
        const originalFetch = window.fetch;
        window.fetch = function(url, options = {}) {
            const key = `${options.method || 'GET'}:${url}`;
            
            if (pendingRequests.has(key)) {
                return pendingRequests.get(key);
            }
            
            const request = originalFetch(url, options).finally(() => {
                pendingRequests.delete(key);
            });
            
            pendingRequests.set(key, request);
            return request;
        };
    }
    
    /**
     * Performance suggestion methods
     */
    suggestMemoryOptimization() {
        console.warn('High memory usage detected. Consider:');
        console.warn('- Cleaning up unused event listeners');
        console.warn('- Reducing data retention');
        console.warn('- Using object pooling for frequent allocations');
    }
    
    suggestLCPOptimization() {
        console.warn('Slow LCP detected. Consider:');
        console.warn('- Optimizing critical resource loading');
        console.warn('- Using resource hints (preload, prefetch)');
        console.warn('- Reducing server response times');
    }
    
    suggestFIDOptimization() {
        console.warn('High FID detected. Consider:');
        console.warn('- Breaking up long tasks');
        console.warn('- Using web workers for heavy computations');
        console.warn('- Deferring non-critical JavaScript');
    }
    
    suggestCLSOptimization() {
        console.warn('High CLS detected. Consider:');
        console.warn('- Setting explicit dimensions for images and videos');
        console.warn('- Avoiding inserting content above existing content');
        console.warn('- Using CSS aspect-ratio for responsive elements');
    }
    
    analyzeFirstContentfulPaint(time) {
        if (time > 1800) {
            console.warn(`Slow FCP: ${time}ms. Consider optimizing critical rendering path.`);
        }
    }
    
    analyzeResourcePerformance(entry) {
        if (entry.duration > 1000) {
            console.warn(`Slow resource: ${entry.name} took ${entry.duration}ms to load`);
        }
        
        if (entry.transferSize > this.thresholds.bundleSize) {
            console.warn(`Large resource: ${entry.name} is ${Math.round(entry.transferSize / 1024)}KB`);
        }
    }
    
    /**
     * Utility methods
     */
    getResourceType(url) {
        const extension = url.split('.').pop().toLowerCase();
        const types = {
            'js': 'script',
            'css': 'stylesheet',
            'jpg': 'image',
            'jpeg': 'image',
            'png': 'image',
            'gif': 'image',
            'svg': 'image',
            'woff': 'font',
            'woff2': 'font',
            'ttf': 'font'
        };
        
        return types[extension] || 'other';
    }
    
    getLatestMetric(type) {
        const entries = this.metrics.get(type);
        return entries && entries.length > 0 ? entries[entries.length - 1] : null;
    }
    
    /**
     * Report performance metrics
     */
    reportMetrics() {
        const report = {
            timestamp: Date.now(),
            metrics: {},
            score: this.calculatePerformanceScore(),
            issues: this.identifyPerformanceIssues()
        };
        
        // Collect latest metrics
        this.metrics.forEach((entries, type) => {
            const latest = entries[entries.length - 1];
            if (latest) {
                report.metrics[type] = latest;
            }
        });
        
        // Send to analytics if available
        if (window.gtag) {
            window.gtag('event', 'performance_report', {
                custom_parameter: JSON.stringify(report)
            });
        }
        
        // Update state manager
        if (stateManager) {
            stateManager.setState('performanceReport', report, { 
                silent: true, 
                source: 'performance-optimizer' 
            });
        }
    }
    
    /**
     * Get performance summary
     */
    getSummary() {
        return {
            score: this.calculatePerformanceScore(),
            metrics: Object.fromEntries(
                Array.from(this.metrics.entries()).map(([type, entries]) => [
                    type,
                    entries[entries.length - 1]
                ])
            ),
            issues: this.identifyPerformanceIssues(),
            recommendations: this.generateRecommendations(),
            trends: this.analyzeTrends()
        };
    }
    
    /**
     * Cleanup and destroy
     */
    destroy() {
        // Disconnect all observers
        this.observers.forEach(observer => {
            observer.disconnect();
        });
        
        // Clear optimizations
        this.optimizations.forEach(optimization => {
            if (optimization && typeof optimization.disconnect === 'function') {
                optimization.disconnect();
            }
        });
        
        // Clear metrics
        this.metrics.clear();
        this.observers.clear();
        this.optimizations.clear();
    }
}

// Export singleton instance
export const performanceOptimizer = new PerformanceOptimizer();

// Make globally accessible for debugging
if (typeof window !== 'undefined') {
    window.performanceOptimizer = performanceOptimizer;
}