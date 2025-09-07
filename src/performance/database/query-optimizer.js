/**
 * Database Query Optimizer
 * Advanced indexing and query optimization for large datasets
 */

// Configuration constants
const PERFORMANCE_THRESHOLD = 0.01;
const BATCH_SIZE = 10;
const SLOW_QUERY_THRESHOLD_MS = 500;
const CACHE_HIT_RATIO_THRESHOLD = 0.1;
const MIN_QUERIES_FOR_ANALYSIS = 100;

export class QueryOptimizer {
  constructor(storage) {
    this.storage = storage;
    this.queryCache = new Map();
    this.queryStats = new Map();
    this.indexes = new Map();
    this.optimizationRules = new Map();
    this.batchQueue = new Map();
    this.compressionEnabled = true;

    this.setupOptimizationRules();
    this.initializeIndexes();

    // Performance tracking
    this.metrics = {
      totalQueries: 0,
      optimizedQueries: 0,
      cacheHits: 0,
      averageQueryTime: 0,
      slowQueries: 0,
      indexUsage: new Map(),
    };
  }

  /**
   * Initialize database indexes for common query patterns
   */
  async initializeIndexes() {
    const indexConfigs = [
      // Workout indexes
      {
        store: 'workouts',
        name: 'date_index',
        keyPath: 'date',
        unique: false,
        compound: false,
      },
      {
        store: 'workouts',
        name: 'type_date_index',
        keyPath: ['type', 'date'],
        unique: false,
        compound: true,
      },
      {
        store: 'workouts',
        name: 'user_date_index',
        keyPath: ['userId', 'date'],
        unique: false,
        compound: true,
      },
      {
        store: 'workouts',
        name: 'duration_index',
        keyPath: 'duration',
        unique: false,
        compound: false,
      },

      // Activity indexes
      {
        store: 'activities',
        name: 'timestamp_index',
        keyPath: 'timestamp',
        unique: false,
        compound: false,
      },
      {
        store: 'activities',
        name: 'user_timestamp_index',
        keyPath: ['userId', 'timestamp'],
        unique: false,
        compound: true,
      },

      // FTP History indexes
      {
        store: 'ftpHistory',
        name: 'user_date_index',
        keyPath: ['userId', 'date'],
        unique: false,
        compound: true,
      },

      // Training Metrics indexes
      {
        store: 'trainingMetrics',
        name: 'date_metric_index',
        keyPath: ['date', 'metricType'],
        unique: false,
        compound: true,
      },
    ];

    try {
      await this.createIndexes(indexConfigs);
      console.log('Database indexes initialized successfully');
    } catch (error) {
      console.error('Failed to initialize indexes:', error);
    }
  }

  /**
   * Create database indexes
   */
  async createIndexes(indexConfigs) {
    for (const config of indexConfigs) {
      try {
        await this.createIndex(config);
        this.indexes.set(`${config.store}_${config.name}`, config);
      } catch (error) {
        console.warn(`Failed to create index ${config.name}:`, error);
      }
    }
  }

  /**
   * Create single index
   */
  async createIndex(config) {
    // Note: IndexedDB indexes are created during database version upgrade
    // This would be implemented in the database upgrade handler
    // For now, we'll track the configuration for query optimization

    if (config.compound) {
      // Compound index optimization strategies
      this.optimizationRules.set(
        `${config.store}_compound_${config.keyPath.join('_')}`,
        {
          type: 'compound_index',
          store: config.store,
          keyPath: config.keyPath,
          optimize: this.optimizeCompoundQuery.bind(this),
        }
      );
    } else {
      // Single column index optimization
      this.optimizationRules.set(`${config.store}_single_${config.keyPath}`, {
        type: 'single_index',
        store: config.store,
        keyPath: config.keyPath,
        optimize: this.optimizeSingleQuery.bind(this),
      });
    }
  }

  /**
   * Setup query optimization rules
   */
  setupOptimizationRules() {
    // Range query optimization
    this.optimizationRules.set('range_optimization', {
      type: 'range',
      pattern: /WHERE.*BETWEEN|WHERE.*>=.*AND.*<=|WHERE.*>.*AND.*</i,
      optimize: this.optimizeRangeQuery.bind(this),
    });

    // Sort optimization
    this.optimizationRules.set('sort_optimization', {
      type: 'sort',
      pattern: /ORDER BY/i,
      optimize: this.optimizeSortQuery.bind(this),
    });

    // Limit optimization
    this.optimizationRules.set('limit_optimization', {
      type: 'limit',
      pattern: /LIMIT/i,
      optimize: this.optimizeLimitQuery.bind(this),
    });

    // Batch optimization
    this.optimizationRules.set('batch_optimization', {
      type: 'batch',
      optimize: this.optimizeBatchQuery.bind(this),
    });
  }

  /**
   * Optimize and execute query
   * @param {Object} queryConfig - Query configuration
   * @returns {Promise} Query results
   */
  async executeOptimizedQuery(queryConfig) {
    const startTime = performance.now();
    const queryId = this.generateQueryId(queryConfig);

    try {
      // Check cache first
      if (queryConfig.cache !== false) {
        const cached = this.getCachedResult(queryId);
        if (cached) {
          this.metrics.cacheHits++;
          return cached;
        }
      }

      // Optimize query
      const optimizedQuery = await this.optimizeQuery(queryConfig);

      // Execute query
      const result = await this.executeQuery(optimizedQuery);

      // Cache result if cacheable
      if (queryConfig.cache !== false && result.length < 1000) {
        this.cacheResult(queryId, result, queryConfig.cacheTTL);
      }

      // Update statistics
      const queryTime = performance.now() - startTime;
      this.updateQueryStats(queryConfig, queryTime, result.length);

      return result;
    } catch (error) {
      console.error('Query execution failed:', error);
      throw error;
    }
  }

  /**
   * Optimize query based on patterns and indexes
   */
  async optimizeQuery(queryConfig) {
    const optimized = { ...queryConfig };

    // Apply optimization rules
    for (const [ruleName, rule] of this.optimizationRules.entries()) {
      if (this.shouldApplyRule(queryConfig, rule)) {
        try {
          await rule.optimize(optimized);
          optimized.appliedOptimizations = optimized.appliedOptimizations || [];
          optimized.appliedOptimizations.push(ruleName);
        } catch (error) {
          console.warn(`Optimization rule ${ruleName} failed:`, error);
        }
      }
    }

    this.metrics.optimizedQueries++;
    return optimized;
  }

  /**
   * Execute query against storage
   */
  async executeQuery(queryConfig) {
    const { store, operation, filters, sort, limit, offset } = queryConfig;

    let results = [];

    switch (operation) {
      case 'getAll':
        results = await this.storage.getAllFromStore(store);
        break;

      case 'getByKey':
        const item = await this.storage.getFromStore(store, queryConfig.key);
        results = item ? [item] : [];
        break;

      case 'getByIndex':
        results = await this.getByIndex(
          store,
          queryConfig.index,
          queryConfig.indexValue
        );
        break;

      case 'getByRange':
        results = await this.getByRange(store, queryConfig.range);
        break;

      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }

    // Apply filters
    if (filters && filters.length > 0) {
      results = this.applyFilters(results, filters);
    }

    // Apply sorting
    if (sort) {
      results = this.applySort(results, sort);
    }

    // Apply pagination
    if (offset || limit) {
      const start = offset || 0;
      const end = limit ? start + limit : undefined;
      results = results.slice(start, end);
    }

    return results;
  }

  /**
   * Get records by index
   */
  async getByIndex(store, indexName, value) {
    // This would use the actual IndexedDB index in a real implementation
    const allRecords = await this.storage.getAllFromStore(store);
    const indexConfig = this.indexes.get(`${store}_${indexName}`);

    if (!indexConfig) {
      throw new Error(`Index ${indexName} not found for store ${store}`);
    }

    const { keyPath } = indexConfig;

    return allRecords.filter(record => {
      if (Array.isArray(keyPath)) {
        // Compound index
        return keyPath.every(
          (key, index) => this.getNestedValue(record, key) === value[index]
        );
      } else {
        // Single index
        return this.getNestedValue(record, keyPath) === value;
      }
    });
  }

  /**
   * Get records by range
   */
  async getByRange(store, range) {
    const allRecords = await this.storage.getAllFromStore(store);
    const {
      keyPath,
      lowerBound,
      upperBound,
      includeLower = true,
      includeUpper = true,
    } = range;

    return allRecords.filter(record => {
      const value = this.getNestedValue(record, keyPath);

      if (lowerBound !== undefined) {
        if (includeLower ? value < lowerBound : value <= lowerBound) {
          return false;
        }
      }

      if (upperBound !== undefined) {
        if (includeUpper ? value > upperBound : value >= upperBound) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Apply filters to results
   */
  applyFilters(results, filters) {
    return results.filter(record => {
      return filters.every(filter => {
        const value = this.getNestedValue(record, filter.field);

        switch (filter.operator) {
          case '=':
          case '==':
            return value === filter.value;
          case '===':
            return value === filter.value;
          case '!=':
            return value !== filter.value;
          case '!==':
            return value !== filter.value;
          case '>':
            return value > filter.value;
          case '>=':
            return value >= filter.value;
          case '<':
            return value < filter.value;
          case '<=':
            return value <= filter.value;
          case 'in':
            return Array.isArray(filter.value) && filter.value.includes(value);
          case 'contains':
            return typeof value === 'string' && value.includes(filter.value);
          case 'startsWith':
            return typeof value === 'string' && value.startsWith(filter.value);
          case 'endsWith':
            return typeof value === 'string' && value.endsWith(filter.value);
          default:
            console.warn(`Unsupported filter operator: ${filter.operator}`);
            return true;
        }
      });
    });
  }

  /**
   * Apply sorting to results
   */
  applySort(results, sort) {
    const { field, direction = 'asc', type = 'auto' } = sort;

    return results.sort((a, b) => {
      const valueA = this.getNestedValue(a, field);
      const valueB = this.getNestedValue(b, field);

      let comparison = 0;

      if (
        type === 'numeric' ||
        (type === 'auto' && typeof valueA === 'number')
      ) {
        comparison = valueA - valueB;
      } else if (
        type === 'date' ||
        (type === 'auto' && valueA instanceof Date)
      ) {
        comparison = valueA.getTime() - valueB.getTime();
      } else {
        comparison = String(valueA).localeCompare(String(valueB));
      }

      return direction === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * Get nested object value by path
   */
  getNestedValue(obj, path) {
    if (typeof path === 'string' && path.includes('.')) {
      return path.split('.').reduce((current, key) => current?.[key], obj);
    }
    return obj[path];
  }

  /**
   * Generate unique query ID for caching
   */
  generateQueryId(queryConfig) {
    const key = JSON.stringify({
      store: queryConfig.store,
      operation: queryConfig.operation,
      filters: queryConfig.filters,
      sort: queryConfig.sort,
      limit: queryConfig.limit,
      offset: queryConfig.offset,
    });

    return btoa(key).replace(/[/+=]/g, ''); // Base64 encode and clean
  }

  /**
   * Check if optimization rule should be applied
   */
  shouldApplyRule(queryConfig, rule) {
    switch (rule.type) {
      case 'compound_index':
      case 'single_index':
        return queryConfig.store === rule.store;
      case 'range':
        return (
          queryConfig.filters &&
          queryConfig.filters.some(f =>
            ['>', '>=', '<', '<='].includes(f.operator)
          )
        );
      case 'sort':
        return queryConfig.sort !== undefined;
      case 'limit':
        return queryConfig.limit !== undefined;
      case 'batch':
        return queryConfig.batch === true;
      default:
        return rule.pattern && rule.pattern.test(queryConfig.query || '');
    }
  }

  /**
   * Optimization rule implementations
   */
  async optimizeCompoundQuery(queryConfig) {
    // Use compound index for multi-column queries
    if (queryConfig.filters && queryConfig.filters.length > 1) {
      const indexKeys = queryConfig.filters.map(f => f.field);
      const matchingIndex = Array.from(this.indexes.values()).find(
        index =>
          index.compound &&
          index.store === queryConfig.store &&
          index.keyPath.every(key => indexKeys.includes(key))
      );

      if (matchingIndex) {
        queryConfig.useIndex = matchingIndex.name;
        queryConfig.indexValue = matchingIndex.keyPath.map(key => {
          const filter = queryConfig.filters.find(f => f.field === key);
          return filter ? filter.value : undefined;
        });
      }
    }
  }

  async optimizeSingleQuery(queryConfig) {
    // Use single column index
    if (queryConfig.filters && queryConfig.filters.length === 1) {
      const filter = queryConfig.filters[0];
      const matchingIndex = Array.from(this.indexes.values()).find(
        index =>
          !index.compound &&
          index.store === queryConfig.store &&
          index.keyPath === filter.field
      );

      if (matchingIndex) {
        queryConfig.useIndex = matchingIndex.name;
        queryConfig.indexValue = filter.value;
      }
    }
  }

  async optimizeRangeQuery(queryConfig) {
    // Convert filters to range query if possible
    const rangeFilters = queryConfig.filters?.filter(f =>
      ['>', '>=', '<', '<='].includes(f.operator)
    );

    if (rangeFilters && rangeFilters.length >= 2) {
      const fieldGroups = {};
      rangeFilters.forEach(filter => {
        if (!fieldGroups[filter.field]) {
          fieldGroups[filter.field] = {};
        }

        if (['>', '>='].includes(filter.operator)) {
          fieldGroups[filter.field].lower = {
            value: filter.value,
            inclusive: filter.operator === '>=',
          };
        } else {
          fieldGroups[filter.field].upper = {
            value: filter.value,
            inclusive: filter.operator === '<=',
          };
        }
      });

      // Find fields with both upper and lower bounds
      for (const [field, bounds] of Object.entries(fieldGroups)) {
        if (bounds.lower && bounds.upper) {
          queryConfig.operation = 'getByRange';
          queryConfig.range = {
            keyPath: field,
            lowerBound: bounds.lower.value,
            upperBound: bounds.upper.value,
            includeLower: bounds.lower.inclusive,
            includeUpper: bounds.upper.inclusive,
          };

          // Remove the range filters since they're now handled by the range query
          queryConfig.filters = queryConfig.filters.filter(
            f =>
              f.field !== field || !['>', '>=', '<', '<='].includes(f.operator)
          );

          break;
        }
      }
    }
  }

  async optimizeSortQuery(queryConfig) {
    // Use index for sorting if available
    const sortField = queryConfig.sort?.field;
    if (sortField) {
      const matchingIndex = Array.from(this.indexes.values()).find(
        index =>
          !index.compound &&
          index.store === queryConfig.store &&
          index.keyPath === sortField
      );

      if (matchingIndex) {
        queryConfig.sortOptimized = true;
        queryConfig.sortIndex = matchingIndex.name;
      }
    }
  }

  async optimizeLimitQuery(queryConfig) {
    // Early termination for limit queries
    if (queryConfig.limit && !queryConfig.sort) {
      queryConfig.earlyTermination = true;
    }
  }

  async optimizeBatchQuery(queryConfig) {
    // Batch multiple similar queries
    const batchKey = `${queryConfig.store}_${queryConfig.operation}`;

    if (!this.batchQueue.has(batchKey)) {
      this.batchQueue.set(batchKey, []);
    }

    this.batchQueue.get(batchKey).push(queryConfig);

    // Process batch if queue is full or after timeout
    if (this.batchQueue.get(batchKey).length >= BATCH_SIZE) {
      setTimeout(() => this.processBatch(batchKey), 0);
    }
  }

  /**
   * Process batched queries
   */
  async processBatch(batchKey) {
    const batch = this.batchQueue.get(batchKey) || [];
    if (batch.length === 0) return;

    this.batchQueue.set(batchKey, []);

    try {
      // Execute batched queries efficiently
      const results = await Promise.all(
        batch.map(query => this.executeQuery(query))
      );

      return results;
    } catch (error) {
      console.error('Batch processing failed:', error);
      throw error;
    }
  }

  /**
   * Cache query result
   */
  cacheResult(queryId, result, ttl = 300000) {
    // 5 minute default TTL
    this.queryCache.set(queryId, {
      result,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Get cached query result
   */
  getCachedResult(queryId) {
    const cached = this.queryCache.get(queryId);

    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.queryCache.delete(queryId);
      return null;
    }

    return cached.result;
  }

  /**
   * Update query statistics
   */
  updateQueryStats(queryConfig, queryTime, resultCount) {
    this.metrics.totalQueries++;

    // Update average query time
    this.metrics.averageQueryTime =
      (this.metrics.averageQueryTime * (this.metrics.totalQueries - 1) +
        queryTime) /
      this.metrics.totalQueries;

    // Track slow queries
    if (queryTime > 1000) {
      // 1 second threshold
      this.metrics.slowQueries++;
    }

    // Track index usage
    if (queryConfig.useIndex) {
      const indexKey = `${queryConfig.store}_${queryConfig.useIndex}`;
      const currentUsage = this.metrics.indexUsage.get(indexKey) || 0;
      this.metrics.indexUsage.set(indexKey, currentUsage + 1);
    }

    // Store detailed stats for this query type
    const queryType = `${queryConfig.store}_${queryConfig.operation}`;
    if (!this.queryStats.has(queryType)) {
      this.queryStats.set(queryType, {
        count: 0,
        totalTime: 0,
        averageTime: 0,
        totalResults: 0,
        averageResults: 0,
      });
    }

    const stats = this.queryStats.get(queryType);
    stats.count++;
    stats.totalTime += queryTime;
    stats.averageTime = stats.totalTime / stats.count;
    stats.totalResults += resultCount;
    stats.averageResults = stats.totalResults / stats.count;
  }

  /**
   * Get optimization statistics
   */
  getStatistics() {
    return {
      ...this.metrics,
      queryStats: Object.fromEntries(this.queryStats),
      cacheStats: {
        size: this.queryCache.size,
        hitRate:
          this.metrics.totalQueries > 0
            ? (this.metrics.cacheHits / this.metrics.totalQueries) * 100
            : 0,
      },
      indexStats: {
        total: this.indexes.size,
        usage: Object.fromEntries(this.metrics.indexUsage),
      },
      optimizationRate:
        this.metrics.totalQueries > 0
          ? (this.metrics.optimizedQueries / this.metrics.totalQueries) * 100
          : 0,
    };
  }

  /**
   * Clear query cache
   */
  clearCache() {
    this.queryCache.clear();
    console.log('Query cache cleared');
  }

  /**
   * Analyze query performance and suggest optimizations
   */
  analyzePerformance() {
    const analysis = {
      slowQueries: [],
      underutilizedIndexes: [],
      suggestions: [],
    };

    // Find slow query patterns
    for (const [queryType, stats] of this.queryStats.entries()) {
      if (stats.averageTime > SLOW_QUERY_THRESHOLD_MS) {
        analysis.slowQueries.push({
          queryType,
          averageTime: stats.averageTime,
          count: stats.count,
        });
      }
    }

    // Find underutilized indexes
    for (const [indexKey] of this.indexes.entries()) {
      const usage = this.metrics.indexUsage.get(indexKey) || 0;
      const usageRate = usage / this.metrics.totalQueries;

      if (
        usageRate < PERFORMANCE_THRESHOLD &&
        this.metrics.totalQueries > MIN_QUERIES_FOR_ANALYSIS
      ) {
        analysis.underutilizedIndexes.push({
          index: indexKey,
          usage,
          usageRate: usageRate * 100,
        });
      }
    }

    // Generate suggestions
    if (analysis.slowQueries.length > 0) {
      analysis.suggestions.push(
        'Consider adding indexes for slow query patterns'
      );
    }

    if (
      this.metrics.cacheHits / this.metrics.totalQueries <
      CACHE_HIT_RATIO_THRESHOLD
    ) {
      analysis.suggestions.push(
        'Low cache hit rate - consider increasing cache TTL or optimizing query patterns'
      );
    }

    if (analysis.underutilizedIndexes.length > 0) {
      analysis.suggestions.push(
        'Some indexes are rarely used - consider removing them to improve write performance'
      );
    }

    return analysis;
  }

  /**
   * Destroy query optimizer and clean up
   */
  destroy() {
    this.queryCache.clear();
    this.queryStats.clear();
    this.indexes.clear();
    this.optimizationRules.clear();
    this.batchQueue.clear();

    console.log('Query optimizer destroyed');
  }
}

/**
 * Helper functions for query building
 */
export const QueryBuilder = {
  /**
   * Build a simple query configuration
   */
  select(store) {
    return {
      store,
      operation: 'getAll',
      filters: [],
      sort: null,
      limit: null,
      offset: null,
      cache: true,
    };
  },

  /**
   * Add filter to query
   */
  where(query, field, operator, value) {
    query.filters.push({ field, operator, value });
    return query;
  },

  /**
   * Add sorting to query
   */
  orderBy(query, field, direction = 'asc', type = 'auto') {
    query.sort = { field, direction, type };
    return query;
  },

  /**
   * Add limit to query
   */
  limit(query, limit, offset = 0) {
    query.limit = limit;
    query.offset = offset;
    return query;
  },

  /**
   * Enable/disable caching
   */
  cache(query, enabled = true, ttl = 300000) {
    query.cache = enabled;
    query.cacheTTL = ttl;
    return query;
  },

  /**
   * Enable batch processing
   */
  batch(query, enabled = true) {
    query.batch = enabled;
    return query;
  },
};
