/**
 * CDN Optimizer
 * Intelligent static asset delivery optimization with multiple CDN support
 */

export class CDNOptimizer {
  constructor(options = {}) {
    this.options = {
      primaryCDN: 'auto',
      fallbackCDNs: [],
      enableGeoLocation: true,
      enablePerformanceMonitoring: true,
      cacheStrategy: 'adaptive',
      preloadCritical: true,
      optimizeImages: true,
      useWebP: true,
      useAVIF: false,
      responsiveImages: true,
      compressionLevel: 'balanced',
      maxRetries: 3,
      timeout: 10000,
      ...options
    };

    this.cdnProviders = new Map();
    this.assetCache = new Map();
    this.performanceMetrics = new Map();
    this.geoLocation = null;
    this.activeRequests = new Map();
    this.failedHosts = new Set();
    this.preferredCDN = null;

    this.initializeCDNProviders();
    this.detectGeoLocation();
    this.setupPerformanceMonitoring();
  }

  /**
   * Initialize CDN provider configurations
   */
  initializeCDNProviders() {
    // Popular CDN configurations
    const providers = {
      cloudflare: {
        name: 'Cloudflare',
        baseUrl: 'https://cdnjs.cloudflare.com',
        features: ['webp', 'compression', 'gzip', 'brotli'],
        regions: ['global'],
        performance: { latency: 0, reliability: 100 }
      },
      jsdelivr: {
        name: 'jsDelivr',
        baseUrl: 'https://cdn.jsdelivr.net',
        features: ['webp', 'compression', 'gzip'],
        regions: ['global'],
        performance: { latency: 0, reliability: 100 }
      },
      unpkg: {
        name: 'UNPKG',
        baseUrl: 'https://unpkg.com',
        features: ['compression', 'gzip'],
        regions: ['global'],
        performance: { latency: 0, reliability: 100 }
      },
      custom: {
        name: 'Custom CDN',
        baseUrl: this.options.customCDN || '',
        features: ['webp', 'compression', 'gzip', 'brotli'],
        regions: ['global'],
        performance: { latency: 0, reliability: 100 }
      }
    };

    // Register configured providers
    for (const [key, config] of Object.entries(providers)) {
      if (key === 'custom' && !this.options.customCDN) continue;
      this.cdnProviders.set(key, config);
    }

    // Set primary CDN
    if (this.options.primaryCDN === 'auto') {
      this.selectOptimalCDN();
    } else {
      this.preferredCDN = this.options.primaryCDN;
    }
  }

  /**
   * Detect user's geographic location for CDN optimization
   */
  async detectGeoLocation() {
    if (!this.options.enableGeoLocation) return;

    try {
      // Try to get location from browser API
      if (navigator.geolocation) {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
            maximumAge: 3600000 // 1 hour cache
          });
        });

        this.geoLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
      }

      // Fallback to IP-based location
      if (!this.geoLocation) {
        const response = await fetch('https://ipapi.co/json/', { timeout: 3000 });
        const data = await response.json();
        
        this.geoLocation = {
          country: data.country_code,
          region: data.region,
          city: data.city,
          latitude: data.latitude,
          longitude: data.longitude
        };
      }

    } catch (error) {
      console.warn('Failed to detect geo location:', error);
    }
  }

  /**
   * Setup performance monitoring for CDN selection
   */
  setupPerformanceMonitoring() {
    if (!this.options.enablePerformanceMonitoring) return;

    // Monitor connection quality
    if ('connection' in navigator) {
      this.connectionInfo = navigator.connection;
    }

    // Periodic CDN performance testing
    setInterval(() => {
      this.testCDNPerformance();
    }, 300000); // Every 5 minutes
  }

  /**
   * Get optimized asset URL
   * @param {string} assetPath - Asset path
   * @param {Object} options - Optimization options
   * @returns {string} Optimized URL
   */
  getAssetUrl(assetPath, options = {}) {
    const config = {
      format: 'auto',
      quality: 'auto',
      width: null,
      height: null,
      dpr: window.devicePixelRatio || 1,
      compression: this.options.compressionLevel,
      ...options
    };

    // Build optimized URL
    const cdn = this.getOptimalCDN();
    const baseUrl = this.cdnProviders.get(cdn)?.baseUrl || '';
    
    if (!baseUrl) {
      return assetPath; // Fallback to original path
    }

    let url = `${baseUrl}${assetPath}`;
    
    // Add optimization parameters
    if (this.options.optimizeImages && this.isImageAsset(assetPath)) {
      url = this.optimizeImageUrl(url, config);
    }

    return url;
  }

  /**
   * Load asset with CDN optimization and fallback
   * @param {string} assetPath - Asset path
   * @param {Object} options - Load options
   * @returns {Promise} Load promise
   */
  async loadAsset(assetPath, options = {}) {
    const config = {
      type: this.detectAssetType(assetPath),
      priority: 'normal',
      timeout: this.options.timeout,
      retries: this.options.maxRetries,
      ...options
    };

    const cacheKey = `${assetPath}|${JSON.stringify(config)}`;
    
    // Check cache first
    if (this.assetCache.has(cacheKey)) {
      return this.assetCache.get(cacheKey);
    }

    // Check active requests to prevent duplicates
    if (this.activeRequests.has(cacheKey)) {
      return this.activeRequests.get(cacheKey);
    }

    // Create load promise
    const loadPromise = this.performAssetLoad(assetPath, config);
    this.activeRequests.set(cacheKey, loadPromise);

    try {
      const result = await loadPromise;
      this.assetCache.set(cacheKey, result);
      return result;
    } finally {
      this.activeRequests.delete(cacheKey);
    }
  }

  /**
   * Perform asset loading with CDN fallback
   * @private
   */
  async performAssetLoad(assetPath, config) {
    const cdns = this.getCDNFallbackChain();
    let lastError = null;

    for (const cdn of cdns) {
      if (this.failedHosts.has(cdn)) continue;

      try {
        const url = this.buildAssetUrl(assetPath, cdn, config);
        const result = await this.fetchAsset(url, config);
        
        // Update performance metrics
        this.updateCDNMetrics(cdn, true, result.loadTime);
        
        return {
          url,
          data: result.data,
          cdn,
          loadTime: result.loadTime,
          fromCache: false
        };

      } catch (error) {
        lastError = error;
        this.updateCDNMetrics(cdn, false);
        
        // Mark host as temporarily failed
        this.failedHosts.add(cdn);
        setTimeout(() => {
          this.failedHosts.delete(cdn);
        }, 60000); // Retry after 1 minute
      }
    }

    throw lastError || new Error('All CDN sources failed');
  }

  /**
   * Fetch asset from URL
   * @private
   */
  async fetchAsset(url, config) {
    const startTime = performance.now();
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Asset load timeout'));
      }, config.timeout);

      switch (config.type) {
        case 'image':
          this.fetchImage(url).then(data => {
            clearTimeout(timeoutId);
            resolve({
              data,
              loadTime: performance.now() - startTime
            });
          }).catch(error => {
            clearTimeout(timeoutId);
            reject(error);
          });
          break;

        case 'script':
          this.fetchScript(url).then(data => {
            clearTimeout(timeoutId);
            resolve({
              data,
              loadTime: performance.now() - startTime
            });
          }).catch(error => {
            clearTimeout(timeoutId);
            reject(error);
          });
          break;

        case 'style':
          this.fetchStylesheet(url).then(data => {
            clearTimeout(timeoutId);
            resolve({
              data,
              loadTime: performance.now() - startTime
            });
          }).catch(error => {
            clearTimeout(timeoutId);
            reject(error);
          });
          break;

        default:
          fetch(url).then(response => {
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }
            return response.blob();
          }).then(data => {
            clearTimeout(timeoutId);
            resolve({
              data,
              loadTime: performance.now() - startTime
            });
          }).catch(error => {
            clearTimeout(timeoutId);
            reject(error);
          });
      }
    });
  }

  /**
   * Fetch image with loading optimization
   * @private
   */
  fetchImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        resolve({
          element: img,
          width: img.naturalWidth,
          height: img.naturalHeight,
          url
        });
      };

      img.onerror = () => {
        reject(new Error('Image load failed'));
      };

      // Enable CORS if needed
      img.crossOrigin = 'anonymous';
      img.src = url;
    });
  }

  /**
   * Fetch script with execution
   * @private
   */
  fetchScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      
      script.onload = () => {
        resolve({ element: script, url });
        document.head.removeChild(script);
      };

      script.onerror = () => {
        reject(new Error('Script load failed'));
        if (script.parentNode) {
          document.head.removeChild(script);
        }
      };

      script.src = url;
      script.async = true;
      document.head.appendChild(script);
    });
  }

  /**
   * Fetch stylesheet
   * @private
   */
  fetchStylesheet(url) {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      
      link.onload = () => {
        resolve({ element: link, url });
      };

      link.onerror = () => {
        reject(new Error('Stylesheet load failed'));
        if (link.parentNode) {
          document.head.removeChild(link);
        }
      };

      link.rel = 'stylesheet';
      link.href = url;
      document.head.appendChild(link);
    });
  }

  /**
   * Preload critical assets
   * @param {Array} assets - Array of asset paths
   * @param {Object} options - Preload options
   */
  async preloadCriticalAssets(assets, options = {}) {
    if (!this.options.preloadCritical) return;

    const config = {
      priority: 'high',
      parallel: true,
      maxConcurrent: 6,
      ...options
    };

    const preloadPromises = assets.map(async (asset) => {
      try {
        const linkElement = document.createElement('link');
        linkElement.rel = 'preload';
        linkElement.href = this.getAssetUrl(asset);
        
        // Set appropriate 'as' attribute
        const type = this.detectAssetType(asset);
        switch (type) {
          case 'script':
            linkElement.as = 'script';
            break;
          case 'style':
            linkElement.as = 'style';
            break;
          case 'image':
            linkElement.as = 'image';
            break;
          default:
            linkElement.as = 'fetch';
            linkElement.crossOrigin = 'anonymous';
        }

        document.head.appendChild(linkElement);
        
        // Also load into cache
        return this.loadAsset(asset, { priority: 'high' });
        
      } catch (error) {
        console.warn(`Failed to preload asset ${asset}:`, error);
      }
    });

    if (config.parallel) {
      await Promise.allSettled(preloadPromises);
    } else {
      // Sequential loading
      for (const promise of preloadPromises) {
        await promise;
      }
    }
  }

  /**
   * Get optimal CDN based on performance metrics
   */
  getOptimalCDN() {
    if (this.preferredCDN && this.cdnProviders.has(this.preferredCDN)) {
      return this.preferredCDN;
    }

    // Select best performing CDN
    let bestCDN = 'cloudflare'; // Default
    let bestScore = -1;

    for (const [cdn, metrics] of this.performanceMetrics.entries()) {
      const score = this.calculateCDNScore(metrics);
      if (score > bestScore) {
        bestScore = score;
        bestCDN = cdn;
      }
    }

    return bestCDN;
  }

  /**
   * Get CDN fallback chain
   */
  getCDNFallbackChain() {
    const primary = this.getOptimalCDN();
    const fallbacks = this.options.fallbackCDNs.filter(cdn => cdn !== primary);
    const available = Array.from(this.cdnProviders.keys());
    
    return [primary, ...fallbacks, ...available].filter(
      (cdn, index, arr) => arr.indexOf(cdn) === index && this.cdnProviders.has(cdn)
    );
  }

  /**
   * Calculate CDN performance score
   * @private
   */
  calculateCDNScore(metrics) {
    const { latency = 1000, reliability = 0, requestCount = 0 } = metrics;
    
    if (requestCount === 0) return 0;
    
    // Lower latency and higher reliability = higher score
    const latencyScore = Math.max(0, 1000 - latency) / 1000;
    const reliabilityScore = reliability / 100;
    
    return (latencyScore * 0.6 + reliabilityScore * 0.4) * 100;
  }

  /**
   * Test CDN performance
   * @private
   */
  async testCDNPerformance() {
    const testAsset = '/ping'; // Small test asset
    
    for (const [cdn] of this.cdnProviders.entries()) {
      try {
        const startTime = performance.now();
        const response = await fetch(this.buildAssetUrl(testAsset, cdn, {}), {
          method: 'HEAD',
          cache: 'no-cache'
        });
        
        const latency = performance.now() - startTime;
        const success = response.ok;
        
        this.updateCDNMetrics(cdn, success, latency);
        
      } catch (error) {
        this.updateCDNMetrics(cdn, false, 10000); // Penalty for failure
      }
    }
  }

  /**
   * Update CDN performance metrics
   * @private
   */
  updateCDNMetrics(cdn, success, latency = 0) {
    if (!this.performanceMetrics.has(cdn)) {
      this.performanceMetrics.set(cdn, {
        latency: 0,
        reliability: 100,
        requestCount: 0,
        successCount: 0
      });
    }

    const metrics = this.performanceMetrics.get(cdn);
    metrics.requestCount++;
    
    if (success) {
      metrics.successCount++;
      // Moving average for latency
      metrics.latency = (metrics.latency * 0.8) + (latency * 0.2);
    }
    
    metrics.reliability = (metrics.successCount / metrics.requestCount) * 100;
  }

  /**
   * Build asset URL for specific CDN
   * @private
   */
  buildAssetUrl(assetPath, cdn, config) {
    const provider = this.cdnProviders.get(cdn);
    if (!provider) return assetPath;

    let url = `${provider.baseUrl}${assetPath}`;
    
    if (this.options.optimizeImages && this.isImageAsset(assetPath)) {
      url = this.optimizeImageUrl(url, config);
    }

    return url;
  }

  /**
   * Optimize image URL with format and quality parameters
   * @private
   */
  optimizeImageUrl(url, config) {
    const params = new URLSearchParams();
    
    // Format optimization
    if (config.format === 'auto') {
      if (this.options.useAVIF && this.supportsFormat('avif')) {
        params.set('format', 'avif');
      } else if (this.options.useWebP && this.supportsFormat('webp')) {
        params.set('format', 'webp');
      }
    } else if (config.format) {
      params.set('format', config.format);
    }

    // Quality optimization
    if (config.quality === 'auto') {
      const quality = this.getOptimalQuality();
      params.set('quality', quality.toString());
    } else if (config.quality) {
      params.set('quality', config.quality.toString());
    }

    // Responsive images
    if (this.options.responsiveImages) {
      if (config.width) params.set('width', config.width.toString());
      if (config.height) params.set('height', config.height.toString());
      if (config.dpr > 1) params.set('dpr', config.dpr.toString());
    }

    // Compression
    if (config.compression) {
      params.set('compression', config.compression);
    }

    return params.toString() ? `${url}?${params.toString()}` : url;
  }

  /**
   * Check if browser supports image format
   * @private
   */
  supportsFormat(format) {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    try {
      const dataUrl = canvas.toDataURL(`image/${format}`);
      return dataUrl.indexOf(`data:image/${format}`) === 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get optimal image quality based on connection
   * @private
   */
  getOptimalQuality() {
    if (this.connectionInfo) {
      switch (this.connectionInfo.effectiveType) {
        case 'slow-2g':
        case '2g':
          return 60;
        case '3g':
          return 75;
        case '4g':
        default:
          return 85;
      }
    }
    return 80; // Default quality
  }

  /**
   * Detect asset type from file extension
   * @private
   */
  detectAssetType(assetPath) {
    const extension = assetPath.split('.').pop().toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'webp', 'avif', 'svg'].includes(extension)) {
      return 'image';
    }
    if (['js', 'mjs'].includes(extension)) {
      return 'script';
    }
    if (['css'].includes(extension)) {
      return 'style';
    }
    if (['woff', 'woff2', 'ttf', 'otf'].includes(extension)) {
      return 'font';
    }
    
    return 'other';
  }

  /**
   * Check if asset is an image
   * @private
   */
  isImageAsset(assetPath) {
    return this.detectAssetType(assetPath) === 'image';
  }

  /**
   * Select optimal CDN based on geo location and performance
   * @private
   */
  selectOptimalCDN() {
    // Default selection logic - can be enhanced with geo-specific rules
    this.preferredCDN = 'cloudflare';
    
    if (this.geoLocation) {
      // Example geo-specific CDN selection
      if (this.geoLocation.country === 'CN') {
        this.preferredCDN = 'custom'; // Use China-friendly CDN
      }
    }
  }

  /**
   * Get CDN optimization statistics
   */
  getStatistics() {
    const totalRequests = Array.from(this.performanceMetrics.values())
      .reduce((sum, metrics) => sum + metrics.requestCount, 0);
    
    const totalSuccessful = Array.from(this.performanceMetrics.values())
      .reduce((sum, metrics) => sum + metrics.successCount, 0);

    return {
      preferredCDN: this.preferredCDN,
      totalRequests,
      successRate: totalRequests > 0 ? (totalSuccessful / totalRequests) * 100 : 0,
      cacheSize: this.assetCache.size,
      activeRequests: this.activeRequests.size,
      failedHosts: Array.from(this.failedHosts),
      cdnMetrics: Object.fromEntries(this.performanceMetrics),
      geoLocation: this.geoLocation
    };
  }

  /**
   * Clear asset cache
   */
  clearCache() {
    this.assetCache.clear();
    console.log('CDN asset cache cleared');
  }

  /**
   * Destroy CDN optimizer and clean up
   */
  destroy() {
    this.assetCache.clear();
    this.activeRequests.clear();
    this.performanceMetrics.clear();
    this.failedHosts.clear();
    
    console.log('CDN optimizer destroyed');
  }
}

// Export singleton instance
export const cdnOptimizer = new CDNOptimizer();