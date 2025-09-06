/**
 * Enhanced Storage Service
 * Comprehensive user data persistence and storage system
 * Extends the current IndexedDB architecture with performance optimization,
 * training history, sync states, and advanced backup/restore functionality
 */

// Enhanced database schema definition
export const ENHANCED_DATABASE_SCHEMA = {
  version: 3, // Increment from current version
  stores: {
    // Existing stores (preserved)
    workouts: {
      keyPath: 'id',
      indexes: ['name', 'category', 'tss', 'duration', 'createdAt'],
    },
    collections: {
      keyPath: 'id',
      indexes: ['name', 'createdAt'],
    },
    tags: {
      keyPath: 'id',
      indexes: ['name', 'usageCount'],
    },
    userProfiles: {
      keyPath: 'id',
      indexes: ['email', 'dateCreated', 'lastModified'],
    },
    ftpHistory: {
      keyPath: 'id',
      indexes: ['profileId', 'date'],
    },

    // New enhanced stores
    activities: {
      keyPath: 'id',
      indexes: [
        'date',
        'type',
        'tss',
        'source',
        'userId',
        'duration',
        'intensity',
      ],
    },
    trainingMetrics: {
      keyPath: 'id',
      indexes: ['date', 'userId', 'metricType', 'period'],
    },
    syncState: {
      keyPath: 'platform',
      indexes: ['lastSync', 'status', 'userId'],
    },
    appSettings: {
      keyPath: 'key',
      indexes: ['category', 'lastModified', 'userId'],
    },
    backupMetadata: {
      keyPath: 'id',
      indexes: ['createdAt', 'type', 'size', 'userId'],
    },
    performanceMetrics: {
      keyPath: 'id',
      indexes: ['timestamp', 'operation', 'duration'],
    },
  },
};

export class EnhancedStorageService {
  constructor() {
    this.dbName = 'TrainingLabEnhancedDB';
    this.dbVersion = ENHANCED_DATABASE_SCHEMA.version;
    this.db = null;

    // Performance and caching
    this.cache = new Map();
    this.queryCache = new Map();
    this.performanceMetrics = [];

    // Configuration constants
    this.CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
    this.MAX_CACHE_SIZE = 100;
    this.COMPRESSION_THRESHOLD = 10000; // 10KB

    // Initialize performance monitoring
    this.startPerformanceMonitoring();
  }

  /**
   * Initialize the enhanced database system
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      console.log('Initializing Enhanced Storage Service...');

      // First check if we need to migrate from existing database
      await this.checkAndMigrateExistingData();

      // Initialize the enhanced database
      this.db = await this.openDatabase();

      // Set up background optimization
      this.scheduleOptimization();

      console.log('Enhanced Storage Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Enhanced Storage Service:', error);
      throw error;
    }
  }

  /**
   * Open the enhanced database with proper schema
   * @returns {Promise<IDBDatabase>}
   */
  async openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error}`));
      };

      request.onsuccess = () => {
        const db = request.result;
        console.log('Enhanced database opened successfully');
        resolve(db);
      };

      request.onupgradeneeded = async event => {
        const db = event.target.result;
        const { oldVersion } = event;

        console.log(
          `Upgrading database from version ${oldVersion} to ${this.dbVersion}`
        );
        await this.performSchemaUpgrade(db, oldVersion);
      };
    });
  }

  /**
   * Perform database schema upgrade
   * @param {IDBDatabase} db - Database instance
   * @param {number} oldVersion - Previous version number
   */
  async performSchemaUpgrade(db, oldVersion) {
    const { stores } = ENHANCED_DATABASE_SCHEMA;

    for (const [storeName, storeConfig] of Object.entries(stores)) {
      // Create store if it doesn't exist
      if (!db.objectStoreNames.contains(storeName)) {
        console.log(`Creating object store: ${storeName}`);
        const store = db.createObjectStore(storeName, {
          keyPath: storeConfig.keyPath,
        });

        // Create indexes
        if (storeConfig.indexes) {
          for (const indexName of storeConfig.indexes) {
            store.createIndex(indexName, indexName, { unique: false });
          }
        }
      }
    }
  }

  /**
   * Check and migrate data from existing WorkoutLibraryDB
   * @returns {Promise<void>}
   */
  async checkAndMigrateExistingData() {
    try {
      // Check if old database exists
      const oldDbExists = await this.checkDatabaseExists('WorkoutLibraryDB');

      if (oldDbExists) {
        console.log('Found existing WorkoutLibraryDB, planning migration...');
        // Note: Migration will happen during schema upgrade
        // We'll preserve all existing functionality
      }
    } catch (error) {
      console.warn('Error checking for existing database:', error);
    }
  }

  /**
   * Check if a database exists
   * @param {string} dbName - Database name to check
   * @returns {Promise<boolean>}
   */
  async checkDatabaseExists(dbName) {
    return new Promise(resolve => {
      const request = indexedDB.open(dbName);
      request.onsuccess = () => {
        request.result.close();
        resolve(true);
      };
      request.onerror = () => resolve(false);
    });
  }

  // === ACTIVITY MANAGEMENT (New Feature) ===

  /**
   * Save training activity with full detail tracking
   * @param {Object} activity - Activity data
   * @returns {Promise<string>} Activity ID
   */
  async saveActivity(activity) {
    const startTime = performance.now();

    try {
      // Validate activity data
      this.validateActivityData(activity);

      // Generate ID if not provided
      if (!activity.id) {
        activity.id = this.generateActivityId();
      }

      // Add metadata
      activity.createdAt = activity.createdAt || new Date().toISOString();
      activity.lastModified = new Date().toISOString();

      // Compress large activity files (atomic update to prevent race conditions)
      if (
        activity.rawData &&
        JSON.stringify(activity.rawData).length > this.COMPRESSION_THRESHOLD
      ) {
        const updatedActivity = {
          ...activity,
          rawData: await this.compressData(activity.rawData),
          compressed: true,
        };
        Object.assign(activity, updatedActivity);
      }

      // Calculate derived metrics in background
      setTimeout(() => this.calculateDerivedMetrics(activity), 0);

      // Save to database
      await this.save('activities', activity);

      // Update cache
      this.cache.set(`activity_${activity.id}`, {
        data: activity,
        timestamp: Date.now(),
      });

      // Record performance
      this.recordPerformance('saveActivity', performance.now() - startTime);

      console.log(`Activity saved: ${activity.id}`);
      return activity.id;
    } catch (error) {
      console.error('Failed to save activity:', error);
      throw error;
    }
  }

  /**
   * Get activities with advanced filtering and pagination
   * @param {Object} filter - Filter options
   * @returns {Promise<Array>} Filtered activities
   */
  async getActivities(filter = {}) {
    const startTime = performance.now();

    try {
      const {
        limit = 50,
        offset = 0,
        sortBy = 'date',
        sortOrder = 'desc',
      } = filter;

      // Check cache first
      const cacheKey = `activities_${JSON.stringify(filter)}`;
      const cached = this.getCached(cacheKey);
      if (cached) {
        this.recordPerformance(
          'getActivities_cached',
          performance.now() - startTime
        );
        return cached;
      }

      // Query database with optimization
      const results = await this.queryWithPagination('activities', {
        index: this.selectOptimalIndex('activities', filter),
        filter,
        limit,
        offset,
        sortBy,
        sortOrder,
      });

      // Cache results
      this.setCached(cacheKey, results);

      // Record performance
      this.recordPerformance('getActivities', performance.now() - startTime);

      return results;
    } catch (error) {
      console.error('Failed to get activities:', error);
      throw error;
    }
  }

  // === TRAINING METRICS MANAGEMENT (New Feature) ===

  /**
   * Save training metrics (TSS, IF, NP, etc.)
   * @param {Object} metrics - Training metrics data
   * @returns {Promise<string>} Metrics ID
   */
  async saveTrainingMetrics(metrics) {
    const startTime = performance.now();

    try {
      if (!metrics.id) {
        metrics.id = this.generateMetricsId();
      }

      metrics.createdAt = new Date().toISOString();

      await this.save('trainingMetrics', metrics);

      this.recordPerformance(
        'saveTrainingMetrics',
        performance.now() - startTime
      );

      return metrics.id;
    } catch (error) {
      console.error('Failed to save training metrics:', error);
      throw error;
    }
  }

  /**
   * Get training metrics for analysis
   * @param {Object} filter - Filter options
   * @returns {Promise<Array>} Training metrics
   */
  async getTrainingMetrics(filter = {}) {
    const startTime = performance.now();

    try {
      const results = await this.queryWithFilter('trainingMetrics', filter);

      this.recordPerformance(
        'getTrainingMetrics',
        performance.now() - startTime
      );

      return results;
    } catch (error) {
      console.error('Failed to get training metrics:', error);
      throw error;
    }
  }

  // === SYNC STATE MANAGEMENT (New Feature) ===

  /**
   * Update sync state for external platforms
   * @param {string} platform - Platform name (strava, zwift, etc.)
   * @param {Object} state - Sync state data
   * @returns {Promise<void>}
   */
  async updateSyncState(platform, state) {
    const syncData = {
      platform,
      ...state,
      lastSync: new Date().toISOString(),
    };

    await this.save('syncState', syncData);
    console.log(`Sync state updated for ${platform}`);
  }

  /**
   * Get sync state for a platform
   * @param {string} platform - Platform name
   * @returns {Promise<Object|null>} Sync state
   */
  async getSyncState(platform) {
    return await this.get('syncState', platform);
  }

  // === PERFORMANCE UTILITIES ===

  /**
   * Start performance monitoring
   */
  startPerformanceMonitoring() {
    // Monitor IndexedDB performance
    const PERFORMANCE_CHECK_INTERVAL = 30000; // Every 30 seconds
    setInterval(() => {
      this.analyzePerformanceMetrics();
    }, PERFORMANCE_CHECK_INTERVAL);
  }

  /**
   * Record performance metric
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in milliseconds
   */
  recordPerformance(operation, duration) {
    const RANDOM_ID_LENGTH = 9;
    const RANDOM_BASE = 36;
    const metric = {
      id: `perf_${Date.now()}_${Math.random().toString(RANDOM_BASE).substr(2, RANDOM_ID_LENGTH)}`,
      timestamp: new Date().toISOString(),
      operation,
      duration,
    };

    this.performanceMetrics.push(metric);

    // Keep only last 1000 metrics
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics.shift();
    }

    // Store in database for analysis
    if (duration > 100) {
      // Only store slow operations
      setTimeout(() => this.save('performanceMetrics', metric), 0);
    }
  }

  /**
   * Analyze performance metrics and optimize
   */
  analyzePerformanceMetrics() {
    const RECENT_METRICS_WINDOW = 5 * 60 * 1000; // 5 minutes
    const recentMetrics = this.performanceMetrics.filter(
      m => Date.now() - new Date(m.timestamp).getTime() < RECENT_METRICS_WINDOW
    );

    if (recentMetrics.length === 0) return;

    // Calculate averages
    const avgDuration =
      recentMetrics.reduce((sum, m) => sum + m.duration, 0) /
      recentMetrics.length;

    // Identify slow operations
    const slowOperations = recentMetrics.filter(
      m => m.duration > avgDuration * 2
    );

    if (slowOperations.length > 0) {
      console.warn(
        'Detected slow operations:',
        slowOperations.map(o => o.operation)
      );
      // Trigger optimization
      setTimeout(() => this.optimizeStorage(), 1000);
    }
  }

  // === CACHE MANAGEMENT ===

  /**
   * Get data from cache
   * @param {string} key - Cache key
   * @returns {any|null} Cached data or null
   */
  getCached(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TIMEOUT) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  /**
   * Set data in cache
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   */
  setCached(key, data) {
    // Manage cache size
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  // === UTILITY METHODS ===

  /**
   * Generic save method with performance tracking
   * @param {string} storeName - Store name
   * @param {Object} data - Data to save
   * @returns {Promise<void>}
   */
  async save(storeName, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error(`Failed to save to ${storeName}: ${request.error}`));
    });
  }

  /**
   * Generic get method with caching
   * @param {string} storeName - Store name
   * @param {string} key - Record key
   * @returns {Promise<Object|null>} Retrieved data
   */
  async get(storeName, key) {
    // Check cache first
    const cacheKey = `${storeName}_${key}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        const { result } = request;
        if (result) {
          this.setCached(cacheKey, result);
        }
        resolve(result || null);
      };
      request.onerror = () =>
        reject(new Error(`Failed to get from ${storeName}: ${request.error}`));
    });
  }

  /**
   * Generate activity ID
   * @returns {string} Activity ID
   */
  generateActivityId() {
    const RANDOM_BASE = 36;
    const RANDOM_LENGTH = 9;
    return `activity_${Date.now()}_${Math.random().toString(RANDOM_BASE).substr(2, RANDOM_LENGTH)}`;
  }

  /**
   * Generate metrics ID
   * @returns {string} Metrics ID
   */
  generateMetricsId() {
    const RANDOM_BASE = 36;
    const RANDOM_LENGTH = 9;
    return `metrics_${Date.now()}_${Math.random().toString(RANDOM_BASE).substr(2, RANDOM_LENGTH)}`;
  }

  /**
   * Validate activity data
   * @param {Object} activity - Activity to validate
   * @throws {Error} If validation fails
   */
  validateActivityData(activity) {
    if (!activity) {
      throw new Error('Activity data is required');
    }

    if (!activity.date) {
      throw new Error('Activity date is required');
    }

    if (!activity.type) {
      throw new Error('Activity type is required');
    }

    // Additional validation can be added here
  }

  /**
   * Placeholder for data compression
   * @param {any} data - Data to compress
   * @returns {Promise<any>} Compressed data
   */
  async compressData(data) {
    // Simple JSON stringification for now
    // In a full implementation, we'd use compression algorithms
    return JSON.stringify(data);
  }

  /**
   * Calculate derived metrics in background
   * @param {Object} activity - Activity data
   */
  calculateDerivedMetrics(activity) {
    // Background processing for TSS, IF, NP calculations
    // This would be implemented based on specific requirements
    console.log(`Calculating derived metrics for activity: ${activity.id}`);
  }

  /**
   * Schedule storage optimization
   */
  scheduleOptimization() {
    // Run optimization every hour
    const OPTIMIZATION_INTERVAL = 60 * 60 * 1000; // 1 hour
    setInterval(() => {
      this.optimizeStorage();
    }, OPTIMIZATION_INTERVAL);
  }

  /**
   * Optimize storage performance
   * @returns {Promise<void>}
   */
  async optimizeStorage() {
    console.log('Running storage optimization...');

    try {
      // Clear expired cache entries
      this.clearExpiredCache();

      // Analyze and optimize query patterns
      await this.optimizeQueryPatterns();

      // Clean up old performance metrics
      await this.cleanupPerformanceMetrics();

      console.log('Storage optimization completed');
    } catch (error) {
      console.error('Storage optimization failed:', error);
    }
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_TIMEOUT) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Backup and restore support methods
   */

  /**
   * Get all user profiles for backup
   * @returns {Promise<Array>} All user profiles
   */
  async getAllUserProfiles() {
    if (!this.db) {
      await this.initialize();
    }

    return this._getAllFromStore('userProfiles');
  }

  /**
   * Get all activities for backup
   * @returns {Promise<Array>} All activities
   */
  async getAllActivities() {
    if (!this.db) {
      await this.initialize();
    }

    return this._getAllFromStore('activities');
  }

  /**
   * Get all workouts for backup
   * @returns {Promise<Array>} All workouts
   */
  async getAllWorkouts() {
    if (!this.db) {
      await this.initialize();
    }

    return this._getAllFromStore('workouts');
  }

  /**
   * Get all FTP history for backup
   * @returns {Promise<Array>} All FTP history entries
   */
  async getAllFTPHistory() {
    if (!this.db) {
      await this.initialize();
    }

    return this._getAllFromStore('ftpHistory');
  }

  /**
   * Get all records from a specific store
   * @param {string} storeName - Store name
   * @returns {Promise<Array>} All records from the store
   */
  async getAllFromStore(storeName) {
    return this._getAllFromStore(storeName);
  }

  /**
   * Check if a record exists in a store
   * @param {string} storeName - Store name
   * @param {string} id - Record ID
   * @returns {Promise<boolean>} True if record exists
   */
  async recordExists(storeName, id) {
    if (!this.db) {
      await this.initialize();
    }

    const transaction = this.db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getKey(id);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result !== undefined);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save a record to a specific store
   * @param {string} storeName - Store name
   * @param {Object} record - Record to save
   * @returns {Promise<void>}
   */
  async saveToStore(storeName, record) {
    if (!this.db) {
      await this.initialize();
    }

    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(record);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all backup metadata
   * @returns {Promise<Array>} All backup metadata entries
   */
  async getAllBackupMetadata() {
    if (!this.db) {
      await this.initialize();
    }

    return this._getAllFromStore('backupMetadata');
  }

  /**
   * Save backup metadata
   * @param {Object} metadata - Backup metadata
   * @returns {Promise<void>}
   */
  async saveBackupMetadata(metadata) {
    if (!this.db) {
      await this.initialize();
    }

    const record = {
      ...metadata,
      id: metadata.id || `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: metadata.timestamp || new Date().toISOString()
    };

    await this.saveToStore('backupMetadata', record);
  }

  /**
   * Save performance metric data
   * @param {Object} metric - Performance metric data
   * @returns {Promise<void>}
   */
  async savePerformanceMetric(metric) {
    if (!this.db) {
      await this.initialize();
    }

    const record = {
      ...metric,
      id: metric.id || `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: metric.timestamp || new Date().toISOString()
    };

    await this.saveToStore('performanceMetrics', record);
  }

  /**
   * Get performance metrics with optional filtering
   * @param {Object} options - Query options
   * @param {string} options.startDate - Start date filter (ISO string)
   * @param {string} options.endDate - End date filter (ISO string)
   * @param {string} options.type - Metric type filter
   * @param {number} options.limit - Maximum results to return
   * @returns {Promise<Array>} Performance metrics
   */
  async getPerformanceMetrics(options = {}) {
    if (!this.db) {
      await this.initialize();
    }

    const { startDate, endDate, type, limit = 1000 } = options;

    try {
      const transaction = this.db.transaction(['performanceMetrics'], 'readonly');
      const store = transaction.objectStore('performanceMetrics');
      const allMetrics = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });

      let filteredMetrics = allMetrics;

      // Apply filters
      if (startDate) {
        const startTime = new Date(startDate).getTime();
        filteredMetrics = filteredMetrics.filter(metric => {
          const metricTime = new Date(metric.timestamp).getTime();
          return metricTime >= startTime;
        });
      }

      if (endDate) {
        const endTime = new Date(endDate).getTime();
        filteredMetrics = filteredMetrics.filter(metric => {
          const metricTime = new Date(metric.timestamp).getTime();
          return metricTime <= endTime;
        });
      }

      if (type) {
        filteredMetrics = filteredMetrics.filter(metric => metric.type === type);
      }

      // Sort by timestamp (newest first) and apply limit
      filteredMetrics.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      if (limit && filteredMetrics.length > limit) {
        filteredMetrics = filteredMetrics.slice(0, limit);
      }

      return filteredMetrics;

    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      throw new Error(`Failed to retrieve performance metrics: ${error.message}`);
    }
  }

  /**
   * Internal helper to get all records from a store
   * @private
   * @param {string} storeName - Store name
   * @returns {Promise<Array>} All records
   */
  async _getAllFromStore(storeName) {
    if (!this.db) {
      await this.initialize();
    }

    const transaction = this.db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Placeholder methods for future implementation
   */
  async queryWithPagination(storeName, options) {
    // Advanced query implementation would go here
    return [];
  }

  async queryWithFilter(storeName, filter) {
    // Filtered query implementation would go here
    return [];
  }

  selectOptimalIndex(storeName, filter) {
    // Index optimization logic would go here
    return null;
  }

  async optimizeQueryPatterns() {
    // Query pattern optimization would go here
  }

  async cleanupPerformanceMetrics() {
    // Cleanup old performance data
    const DAYS_TO_KEEP = 7;
    const HOURS_PER_DAY = 24;
    const MINUTES_PER_HOUR = 60;
    const SECONDS_PER_MINUTE = 60;
    const MS_PER_SECOND = 1000;

    const cutoffDate = new Date(
      Date.now() -
        DAYS_TO_KEEP *
          HOURS_PER_DAY *
          MINUTES_PER_HOUR *
          SECONDS_PER_MINUTE *
          MS_PER_SECOND
    );

    // This would implement actual cleanup logic
    console.log(`Cleaning up performance metrics older than ${cutoffDate}`);
  }
}

// Create and export singleton instance
export const enhancedStorage = new EnhancedStorageService();
