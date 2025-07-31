/**
 * Dynamic Module Loader with Code Splitting
 * Implements lazy loading for non-critical components and features
 */

export class ModuleLoader {
    constructor() {
        this.loadedModules = new Map();
        this.loadingPromises = new Map();
        this.dependencies = new Map();
        this.loadOrder = [];
        
        // Feature flags for conditional loading
        this.featureFlags = new Map([
            ['charts', true],
            ['export', true],
            ['comparison', false], // Load only when needed
            ['powerZones', false], // Load only when needed
            ['workoutGenerator', false], // Load only when needed
            ['themes', true],
            ['shortcuts', true]
        ]);
        
        this.setupCriticalPathOptimization();
    }

    /**
     * Load module dynamically
     */
    async loadModule(moduleName, options = {}) {
        const { 
            required = false, 
            priority = 'normal', 
            timeout = 10000,
            retries = 3 
        } = options;

        // Return cached module if already loaded
        if (this.loadedModules.has(moduleName)) {
            return this.loadedModules.get(moduleName);
        }

        // Return existing loading promise if already loading
        if (this.loadingPromises.has(moduleName)) {
            return this.loadingPromises.get(moduleName);
        }

        // Create loading promise
        const loadingPromise = this.createLoadingPromise(moduleName, {
            required,
            priority,
            timeout,
            retries
        });

        this.loadingPromises.set(moduleName, loadingPromise);

        try {
            const module = await loadingPromise;
            this.loadedModules.set(moduleName, module);
            this.loadingPromises.delete(moduleName);
            this.loadOrder.push(moduleName);
            
            // Notify module loaded
            this.notifyModuleLoaded(moduleName, module);
            
            return module;
        } catch (error) {
            this.loadingPromises.delete(moduleName);
            
            if (required) {
                throw new Error(`Failed to load required module: ${moduleName}. ${error.message}`);
            } else {
                console.warn(`Failed to load optional module: ${moduleName}`, error);
                return null;
            }
        }
    }

    /**
     * Create loading promise with timeout and retries
     */
    async createLoadingPromise(moduleName, options) {
        const { timeout, retries } = options;
        
        let lastError;
        
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const module = await Promise.race([
                    this.performModuleLoad(moduleName),
                    this.createTimeoutPromise(timeout, moduleName)
                ]);
                
                return module;
            } catch (error) {
                lastError = error;
                console.warn(`Module load attempt ${attempt + 1} failed for ${moduleName}:`, error);
                
                // Wait before retry (exponential backoff)
                if (attempt < retries - 1) {
                    await this.delay(Math.pow(2, attempt) * 1000);
                }
            }
        }
        
        throw lastError;
    }

    /**
     * Perform the actual module loading
     */
    async performModuleLoad(moduleName) {
        const moduleMap = {
            // Core modules (always loaded)
            'state-manager': () => import('./state-manager.js'),
            'reactive-ui': () => import('./reactive-ui.js'),
            'error-handler': () => import('./error-handler.js'),
            'loading-manager': () => import('./loading-manager.js'),
            
            // Feature modules (lazy loaded)
            'keyboard-navigation': () => import('./keyboard-navigation.js'),
            'mobile-enhancements': () => import('./mobile-enhancements.js'),
            'themes': () => import('./themes.js'),
            'shortcuts': () => import('./shortcuts.js'),
            
            // Chart modules (load when needed)
            'chart-engine': () => this.loadChartEngine(),
            'chart-annotations': () => this.loadChartAnnotations(),
            
            // Workflow modules
            'comparison': () => import('./comparison.js'),
            'power-zones': () => import('./power-zones.js'),
            'workout-generator': () => import('./workout-generator.js'),
            
            // UI component modules
            'ui-components': () => import('./components/ui.js'),
            'modern-ui': () => import('./modern-ui-upgrade.js'),
            
            // Export modules
            'exporter': () => import('./exporter.js'),
            'api': () => import('./api.js'),
            
            // Library modules
            'library': () => import('./library.js'),
            'storage': () => import('./storage.js'),
            
            // Parser modules
            'parser': () => import('./parser.js'),
            'workout': () => import('./workout.js')
        };

        const loader = moduleMap[moduleName];
        if (!loader) {
            throw new Error(`Unknown module: ${moduleName}`);
        }

        // Load dependencies first
        const deps = this.dependencies.get(moduleName);
        if (deps) {
            await Promise.all(deps.map(dep => this.loadModule(dep)));
        }

        return await loader();
    }

    /**
     * Load Chart.js and related chart modules
     */
    async loadChartEngine() {
        // Load Chart.js if not already available
        if (!window.Chart) {
            await this.loadScript('https://cdn.jsdelivr.net/npm/chart.js');
        }
        
        // Load chart annotation plugin if not available
        if (!window.Chart.plugins.getAll().find(p => p.id === 'annotation')) {
            await this.loadScript('https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation');
        }
        
        // Return chart utilities
        return {
            Chart: window.Chart,
            createWorkoutChart: (await import('./chart-utils.js')).createWorkoutChart,
            updateChartData: (await import('./chart-utils.js')).updateChartData
        };
    }

    /**
     * Load chart annotations module
     */
    async loadChartAnnotations() {
        await this.loadModule('chart-engine');
        return import('./chart-annotations.js');
    }

    /**
     * Load external script
     */
    loadScript(src) {
        return new Promise((resolve, reject) => {
            // Check if script already exists
            const existing = document.querySelector(`script[src="${src}"]`);
            if (existing) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Load multiple modules with priority
     */
    async loadModules(moduleList) {
        // Sort by priority
        const prioritized = moduleList.sort((a, b) => {
            const priorityOrder = { 'high': 0, 'normal': 1, 'low': 2 };
            return priorityOrder[a.priority || 'normal'] - priorityOrder[b.priority || 'normal'];
        });

        // Load high priority modules first (parallel)
        const highPriority = prioritized.filter(m => m.priority === 'high');
        const normalPriority = prioritized.filter(m => m.priority === 'normal' || !m.priority);
        const lowPriority = prioritized.filter(m => m.priority === 'low');

        const results = {};

        // Load high priority modules in parallel
        if (highPriority.length > 0) {
            const highResults = await Promise.allSettled(
                highPriority.map(async m => ({
                    name: m.name,
                    module: await this.loadModule(m.name, m)
                }))
            );
            
            highResults.forEach(result => {
                if (result.status === 'fulfilled') {
                    results[result.value.name] = result.value.module;
                }
            });
        }

        // Load normal priority modules
        for (const moduleConfig of normalPriority) {
            try {
                results[moduleConfig.name] = await this.loadModule(moduleConfig.name, moduleConfig);
            } catch (error) {
                if (moduleConfig.required) {
                    throw error;
                }
            }
        }

        // Load low priority modules (can be deferred)
        this.deferLowPriorityLoad(lowPriority);

        return results;
    }

    /**
     * Defer low priority module loading
     */
    deferLowPriorityLoad(modules) {
        // Use requestIdleCallback if available
        const scheduleLoad = window.requestIdleCallback || ((fn) => setTimeout(fn, 0));
        
        scheduleLoad(async () => {
            for (const moduleConfig of modules) {
                try {
                    await this.loadModule(moduleConfig.name, moduleConfig);
                } catch (error) {
                    console.warn(`Failed to load low priority module: ${moduleConfig.name}`, error);
                }
            }
        });
    }

    /**
     * Setup dependencies between modules
     */
    setupDependencies() {
        this.dependencies.set('reactive-ui', ['state-manager']);
        this.dependencies.set('keyboard-navigation', ['state-manager']);
        this.dependencies.set('mobile-enhancements', ['state-manager']);
        this.dependencies.set('chart-annotations', ['chart-engine']);
        this.dependencies.set('comparison', ['chart-engine', 'state-manager']);
        this.dependencies.set('power-zones', ['chart-engine']);
        this.dependencies.set('workout-generator', ['state-manager', 'parser']);
        this.dependencies.set('modern-ui', ['ui-components']);
    }

    /**
     * Critical path optimization
     */
    setupCriticalPathOptimization() {
        // Preload critical modules
        this.preloadCriticalModules();
        
        // Setup intersection observer for lazy loading
        this.setupIntersectionObserver();
        
        // Setup feature detection
        this.setupFeatureDetection();
    }

    /**
     * Preload critical modules
     */
    async preloadCriticalModules() {
        const criticalModules = [
            { name: 'state-manager', priority: 'high', required: true },
            { name: 'error-handler', priority: 'high', required: true },
            { name: 'loading-manager', priority: 'high', required: true }
        ];

        try {
            await this.loadModules(criticalModules);
        } catch (error) {
            console.error('Failed to load critical modules:', error);
            // Show fallback UI
            this.showFallbackUI();
        }
    }

    /**
     * Setup intersection observer for lazy loading
     */
    setupIntersectionObserver() {
        if (!window.IntersectionObserver) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    const moduleName = element.getAttribute('data-lazy-module');
                    
                    if (moduleName && !this.loadedModules.has(moduleName)) {
                        this.loadModule(moduleName, { priority: 'low' });
                        observer.unobserve(element);
                    }
                }
            });
        }, { threshold: 0.1 });

        // Observe elements with data-lazy-module attribute
        document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('[data-lazy-module]').forEach(el => {
                observer.observe(el);
            });
        });
    }

    /**
     * Setup feature detection for conditional loading
     */
    setupFeatureDetection() {
        // Touch device detection
        if ('ontouchstart' in window) {
            this.featureFlags.set('touch', true);
            this.loadModule('mobile-enhancements', { priority: 'normal' });
        }

        // Chart support detection
        if (document.getElementById('workoutChart')) {
            this.featureFlags.set('charts', true);
        }

        // Keyboard navigation detection
        document.addEventListener('keydown', () => {
            if (!this.loadedModules.has('keyboard-navigation')) {
                this.loadModule('keyboard-navigation', { priority: 'normal' });
            }
        }, { once: true });
    }

    /**
     * Create timeout promise
     */
    createTimeoutPromise(timeout, moduleName) {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Module loading timeout: ${moduleName}`));
            }, timeout);
        });
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Show fallback UI when critical modules fail
     */
    showFallbackUI() {
        document.body.innerHTML = `
            <div class="error-fallback" style="
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                font-family: system-ui, -apple-system, sans-serif;
                text-align: center;
                padding: 2rem;
            ">
                <div>
                    <h1 style="font-size: 2rem; margin-bottom: 1rem;">
                        🚴‍♂️ Zwift Workout Visualizer
                    </h1>
                    <p style="font-size: 1.2rem; margin-bottom: 2rem;">
                        Loading failed. Please refresh the page to try again.
                    </p>
                    <button onclick="window.location.reload()" style="
                        background: rgba(255,255,255,0.2);
                        border: 2px solid rgba(255,255,255,0.3);
                        color: white;
                        padding: 1rem 2rem;
                        border-radius: 0.5rem;
                        font-size: 1rem;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    " onmouseover="this.style.background='rgba(255,255,255,0.3)'"
                       onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                        Refresh Page
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Notify when module is loaded
     */
    notifyModuleLoaded(moduleName, module) {
        // Dispatch custom event
        const event = new CustomEvent('moduleLoaded', {
            detail: { moduleName, module }
        });
        document.dispatchEvent(event);

        // Update performance metrics
        if (window.stateManager) {
            const loadTime = performance.now();
            window.stateManager.setState(`moduleLoadTimes.${moduleName}`, loadTime);
        }
    }

    /**
     * Get loading statistics
     */
    getStats() {
        return {
            loaded: Array.from(this.loadedModules.keys()),
            loading: Array.from(this.loadingPromises.keys()),
            loadOrder: [...this.loadOrder],
            featureFlags: Object.fromEntries(this.featureFlags)
        };
    }

    /**
     * Unload module (for testing/cleanup)
     */
    unloadModule(moduleName) {
        this.loadedModules.delete(moduleName);
        const index = this.loadOrder.indexOf(moduleName);
        if (index > -1) {
            this.loadOrder.splice(index, 1);
        }
    }
}

// Export singleton instance
export const moduleLoader = new ModuleLoader();

// Initialize dependencies
moduleLoader.setupDependencies();