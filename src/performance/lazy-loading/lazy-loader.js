/**
 * Advanced Lazy Loading System
 * Progressive content loading with Intersection Observer and intelligent preloading
 */

export class LazyLoader {
  constructor(options = {}) {
    this.options = {
      rootMargin: '50px',
      threshold: 0.1,
      enablePreloading: true,
      preloadDistance: '200px',
      maxConcurrent: 3,
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 10000,
      placeholderClass: 'lazy-loading',
      loadedClass: 'lazy-loaded',
      errorClass: 'lazy-error',
      ...options
    };

    this.observers = new Map();
    this.loadQueue = [];
    this.activeLoads = new Set();
    this.loadedElements = new WeakSet();
    this.failedElements = new WeakSet();
    this.loadCache = new Map();
    this.metrics = {
      totalElements: 0,
      loadedElements: 0,
      failedElements: 0,
      cacheHits: 0,
      averageLoadTime: 0,
      totalLoadTime: 0
    };

    this.initializeObservers();
  }

  /**
   * Initialize Intersection Observers
   */
  initializeObservers() {
    if (typeof IntersectionObserver === 'undefined') {
      console.warn('IntersectionObserver not supported, using fallback');
      this.useFallback = true;
      return;
    }

    // Main observer for lazy loading
    this.mainObserver = new IntersectionObserver(
      this.handleIntersection.bind(this),
      {
        rootMargin: this.options.rootMargin,
        threshold: this.options.threshold
      }
    );

    // Preload observer for intelligent prefetching
    if (this.options.enablePreloading) {
      this.preloadObserver = new IntersectionObserver(
        this.handlePreloadIntersection.bind(this),
        {
          rootMargin: this.options.preloadDistance,
          threshold: 0
        }
      );
    }

    this.observers.set('main', this.mainObserver);
    if (this.preloadObserver) {
      this.observers.set('preload', this.preloadObserver);
    }
  }

  /**
   * Observe element for lazy loading
   * @param {Element} element - Element to observe
   * @param {Object} config - Loading configuration
   */
  observe(element, config = {}) {
    if (!element || this.loadedElements.has(element)) return;

    const loadConfig = {
      type: 'image',
      src: null,
      srcset: null,
      sizes: null,
      loader: null,
      placeholder: null,
      onLoad: null,
      onError: null,
      onProgress: null,
      priority: 'normal',
      ...config
    };

    // Store configuration on element
    element._lazyConfig = loadConfig;
    element._lazyId = this.generateId();

    // Detect configuration from element attributes
    this.detectElementConfig(element, loadConfig);

    // Set up placeholder if specified
    if (loadConfig.placeholder) {
      this.setPlaceholder(element, loadConfig.placeholder);
    }

    // Add loading class
    element.classList.add(this.options.placeholderClass);

    // Track metrics
    this.metrics.totalElements++;

    if (this.useFallback) {
      // Fallback for browsers without IntersectionObserver
      this.loadElement(element);
    } else {
      // Use observers for modern browsers
      this.mainObserver.observe(element);
      
      if (this.preloadObserver && loadConfig.priority !== 'low') {
        this.preloadObserver.observe(element);
      }
    }
  }

  /**
   * Detect configuration from element attributes
   */
  detectElementConfig(element, config) {
    // Image elements
    if (element.tagName === 'IMG') {
      config.type = 'image';
      config.src = config.src || element.dataset.src || element.dataset.lazySrc;
      config.srcset = config.srcset || element.dataset.srcset || element.dataset.lazySrcset;
      config.sizes = config.sizes || element.dataset.sizes || element.dataset.lazySizes;
    }
    
    // Background images
    else if (element.dataset.backgroundImage || element.dataset.lazyBackground) {
      config.type = 'background';
      config.src = config.src || element.dataset.backgroundImage || element.dataset.lazyBackground;
    }
    
    // Video elements
    else if (element.tagName === 'VIDEO') {
      config.type = 'video';
      config.src = config.src || element.dataset.src || element.dataset.lazySrc;
    }
    
    // Custom loader elements
    else if (element.dataset.loader) {
      config.type = 'custom';
      config.loader = config.loader || element.dataset.loader;
    }

    // Priority detection
    if (element.dataset.priority) {
      config.priority = element.dataset.priority;
    }

    // Placeholder detection
    if (element.dataset.placeholder) {
      config.placeholder = element.dataset.placeholder;
    }
  }

  /**
   * Handle intersection for main observer
   */
  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target;
        this.mainObserver.unobserve(element);
        
        if (this.preloadObserver) {
          this.preloadObserver.unobserve(element);
        }
        
        this.queueLoad(element);
      }
    });
  }

  /**
   * Handle intersection for preload observer
   */
  handlePreloadIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target;
        const config = element._lazyConfig;
        
        if (config && config.priority === 'high') {
          this.preloadObserver.unobserve(element);
          this.preloadElement(element);
        }
      }
    });
  }

  /**
   * Queue element for loading with priority handling
   */
  queueLoad(element) {
    const config = element._lazyConfig;
    if (!config) return;

    const loadItem = {
      element,
      config,
      priority: this.getPriorityValue(config.priority),
      timestamp: Date.now()
    };

    // Insert based on priority
    const insertIndex = this.loadQueue.findIndex(item => 
      item.priority > loadItem.priority
    );

    if (insertIndex === -1) {
      this.loadQueue.push(loadItem);
    } else {
      this.loadQueue.splice(insertIndex, 0, loadItem);
    }

    this.processLoadQueue();
  }

  /**
   * Process load queue with concurrency control
   */
  processLoadQueue() {
    while (this.loadQueue.length > 0 && this.activeLoads.size < this.options.maxConcurrent) {
      const loadItem = this.loadQueue.shift();
      this.loadElement(loadItem.element);
    }
  }

  /**
   * Load element content
   */
  async loadElement(element) {
    if (this.loadedElements.has(element) || this.activeLoads.has(element)) {
      return;
    }

    const config = element._lazyConfig;
    if (!config) return;

    this.activeLoads.add(element);
    const startTime = performance.now();

    try {
      // Check cache first
      const cacheKey = this.getCacheKey(config);
      if (this.loadCache.has(cacheKey)) {
        const cachedData = this.loadCache.get(cacheKey);
        await this.applyLoadedContent(element, cachedData, config);
        this.metrics.cacheHits++;
        return;
      }

      // Load content based on type
      let loadedData;
      switch (config.type) {
        case 'image':
          loadedData = await this.loadImage(config, element);
          break;
        case 'background':
          loadedData = await this.loadBackgroundImage(config, element);
          break;
        case 'video':
          loadedData = await this.loadVideo(config, element);
          break;
        case 'custom':
          loadedData = await this.loadCustom(config, element);
          break;
        default:
          throw new Error(`Unsupported load type: ${config.type}`);
      }

      // Cache successful loads
      if (loadedData && cacheKey) {
        this.loadCache.set(cacheKey, loadedData);
      }

      // Apply loaded content
      await this.applyLoadedContent(element, loadedData, config);
      
      // Update metrics
      const loadTime = performance.now() - startTime;
      this.metrics.loadedElements++;
      this.metrics.totalLoadTime += loadTime;
      this.metrics.averageLoadTime = this.metrics.totalLoadTime / this.metrics.loadedElements;

    } catch (error) {
      console.warn('Failed to load element:', error);
      this.handleLoadError(element, error);
      
      this.metrics.failedElements++;
    } finally {
      this.activeLoads.delete(element);
      this.processLoadQueue();
    }
  }

  /**
   * Load image with retry logic
   */
  loadImage(config, element) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      const timeoutId = setTimeout(() => {
        reject(new Error('Image load timeout'));
      }, this.options.timeout);

      img.onload = () => {
        clearTimeout(timeoutId);
        resolve({
          type: 'image',
          src: img.src,
          width: img.naturalWidth,
          height: img.naturalHeight,
          element: img
        });
      };

      img.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error('Image load failed'));
      };

      // Set responsive attributes
      if (config.srcset) {
        img.srcset = config.srcset;
      }
      if (config.sizes) {
        img.sizes = config.sizes;
      }

      img.src = config.src;
    });
  }

  /**
   * Load background image
   */
  loadBackgroundImage(config, element) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      const timeoutId = setTimeout(() => {
        reject(new Error('Background image load timeout'));
      }, this.options.timeout);

      img.onload = () => {
        clearTimeout(timeoutId);
        resolve({
          type: 'background',
          src: config.src,
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      };

      img.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error('Background image load failed'));
      };

      img.src = config.src;
    });
  }

  /**
   * Load video element
   */
  loadVideo(config, element) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      
      const timeoutId = setTimeout(() => {
        reject(new Error('Video load timeout'));
      }, this.options.timeout);

      video.onloadeddata = () => {
        clearTimeout(timeoutId);
        resolve({
          type: 'video',
          src: config.src,
          width: video.videoWidth,
          height: video.videoHeight,
          element: video
        });
      };

      video.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error('Video load failed'));
      };

      video.src = config.src;
      video.load();
    });
  }

  /**
   * Load custom content with loader function
   */
  async loadCustom(config, element) {
    if (typeof config.loader !== 'function') {
      throw new Error('Custom loader must be a function');
    }

    const result = await config.loader(element, config);
    
    return {
      type: 'custom',
      data: result
    };
  }

  /**
   * Apply loaded content to element
   */
  async applyLoadedContent(element, data, config) {
    switch (data.type) {
      case 'image':
        if (element.tagName === 'IMG') {
          element.src = data.src;
          if (config.srcset) element.srcset = config.srcset;
          if (config.sizes) element.sizes = config.sizes;
        } else {
          element.appendChild(data.element);
        }
        break;

      case 'background':
        element.style.backgroundImage = `url("${data.src}")`;
        break;

      case 'video':
        if (element.tagName === 'VIDEO') {
          element.src = data.src;
          element.load();
        } else {
          element.appendChild(data.element);
        }
        break;

      case 'custom':
        // Custom loader handles application
        break;
    }

    // Mark as loaded
    this.loadedElements.add(element);
    element.classList.remove(this.options.placeholderClass);
    element.classList.add(this.options.loadedClass);

    // Call success callback
    if (config.onLoad) {
      config.onLoad(element, data);
    }

    // Animate in if requested
    if (config.fadeIn) {
      this.animateIn(element);
    }
  }

  /**
   * Handle load error
   */
  handleLoadError(element, error) {
    this.failedElements.add(element);
    element.classList.remove(this.options.placeholderClass);
    element.classList.add(this.options.errorClass);

    const config = element._lazyConfig;
    if (config && config.onError) {
      config.onError(element, error);
    }

    // Retry if attempts remaining
    if (config && config.retryCount < this.options.retryAttempts) {
      config.retryCount = (config.retryCount || 0) + 1;
      
      setTimeout(() => {
        element.classList.remove(this.options.errorClass);
        element.classList.add(this.options.placeholderClass);
        this.failedElements.delete(element);
        this.queueLoad(element);
      }, this.options.retryDelay * config.retryCount);
    }
  }

  /**
   * Preload element content without applying
   */
  async preloadElement(element) {
    const config = element._lazyConfig;
    if (!config) return;

    try {
      const cacheKey = this.getCacheKey(config);
      if (this.loadCache.has(cacheKey)) {
        return; // Already cached
      }

      // Load and cache content
      let loadedData;
      switch (config.type) {
        case 'image':
          loadedData = await this.loadImage(config, element);
          break;
        case 'background':
          loadedData = await this.loadBackgroundImage(config, element);
          break;
        default:
          return; // Skip preloading for other types
      }

      if (loadedData && cacheKey) {
        this.loadCache.set(cacheKey, loadedData);
      }

    } catch (error) {
      console.warn('Preload failed:', error);
    }
  }

  /**
   * Set placeholder content
   */
  setPlaceholder(element, placeholder) {
    if (typeof placeholder === 'string') {
      if (placeholder.startsWith('data:') || placeholder.startsWith('http')) {
        // Placeholder image
        if (element.tagName === 'IMG') {
          element.src = placeholder;
        } else {
          element.style.backgroundImage = `url("${placeholder}")`;
        }
      } else {
        // Placeholder text or HTML
        element.innerHTML = placeholder;
      }
    } else if (placeholder instanceof Element) {
      element.appendChild(placeholder);
    }
  }

  /**
   * Animate element in after loading
   */
  animateIn(element) {
    element.style.opacity = '0';
    element.style.transition = 'opacity 0.3s ease-in-out';
    
    requestAnimationFrame(() => {
      element.style.opacity = '1';
      
      // Clean up transition after animation
      setTimeout(() => {
        element.style.transition = '';
      }, 300);
    });
  }

  /**
   * Generate cache key for loaded content
   */
  getCacheKey(config) {
    if (!config.src) return null;
    
    const parts = [config.src];
    if (config.srcset) parts.push(config.srcset);
    if (config.sizes) parts.push(config.sizes);
    
    return parts.join('|');
  }

  /**
   * Get priority value for sorting
   */
  getPriorityValue(priority) {
    switch (priority) {
      case 'high': return 1;
      case 'normal': return 2;
      case 'low': return 3;
      default: return 2;
    }
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `lazy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Unobserve element
   */
  unobserve(element) {
    this.mainObserver?.unobserve(element);
    this.preloadObserver?.unobserve(element);
    
    // Remove from active loads and queue
    this.activeLoads.delete(element);
    this.loadQueue = this.loadQueue.filter(item => item.element !== element);
  }

  /**
   * Get loading metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      loadQueue: this.loadQueue.length,
      activeLoads: this.activeLoads.size,
      cacheSize: this.loadCache.size,
      loadSuccessRate: this.metrics.totalElements > 0 
        ? (this.metrics.loadedElements / this.metrics.totalElements) * 100 
        : 0
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.loadCache.clear();
  }

  /**
   * Destroy lazy loader and clean up
   */
  destroy() {
    // Disconnect observers
    for (const observer of this.observers.values()) {
      observer.disconnect();
    }

    // Clear all data structures
    this.observers.clear();
    this.loadQueue.length = 0;
    this.activeLoads.clear();
    this.loadCache.clear();

    console.log('Lazy loader destroyed');
  }
}

/**
 * Global lazy loader instance
 */
let globalLazyLoader = null;

/**
 * Initialize global lazy loader
 */
export function initializeLazyLoader(options = {}) {
  if (globalLazyLoader) {
    globalLazyLoader.destroy();
  }
  
  globalLazyLoader = new LazyLoader(options);
  return globalLazyLoader;
}

/**
 * Get global lazy loader instance
 */
export function getLazyLoader() {
  if (!globalLazyLoader) {
    globalLazyLoader = new LazyLoader();
  }
  return globalLazyLoader;
}

/**
 * Convenience function for lazy loading images
 */
export function lazyLoad(selector, options = {}) {
  const loader = getLazyLoader();
  const elements = document.querySelectorAll(selector);
  
  elements.forEach(element => {
    loader.observe(element, options);
  });
  
  return elements.length;
}