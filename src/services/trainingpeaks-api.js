/**
 * TrainingPeaks API Client Service
 * Handles TrainingPeaks API requests, rate limiting, and data operations
 */

import { createLogger } from '../utils/logger.js';
import { trainingPeaksAuth } from './trainingpeaks-auth.js';

const logger = createLogger('TrainingPeaksAPI');

// Constants
const API_BASE_URL = 'https://api.trainingpeaks.com/v1';
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE_MS = 1000;
const REQUEST_TIMEOUT_MS = 30000;
const RATE_LIMIT_REQUESTS = 1000; // requests per hour
const RATE_LIMIT_WINDOW_MS = 3600000; // 1 hour
const HTTP_STATUS_OK = 200;
const HTTP_STATUS_UNAUTHORIZED = 401;
const HTTP_STATUS_FORBIDDEN = 403;
const HTTP_STATUS_NOT_FOUND = 404;
const HTTP_STATUS_RATE_LIMITED = 429;
const HTTP_STATUS_SERVER_ERROR = 500;

class TrainingPeaksAPIService {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.requestQueue = [];
    this.requestCount = 0;
    this.rateLimitResetTime = Date.now() + RATE_LIMIT_WINDOW_MS;
    this.isProcessingQueue = false;

    // Initialize rate limiting
    this.initializeRateLimiting();
  }

  /**
   * Initialize rate limiting system
   */
  initializeRateLimiting() {
    // Reset rate limit counter every hour
    setInterval(() => {
      this.requestCount = 0;
      this.rateLimitResetTime = Date.now() + RATE_LIMIT_WINDOW_MS;
      logger.info('Rate limit counter reset');
    }, RATE_LIMIT_WINDOW_MS);

    logger.info('TrainingPeaks API Service initialized');
  }

  /**
   * Check if we're within rate limits
   */
  checkRateLimit() {
    if (this.requestCount >= RATE_LIMIT_REQUESTS) {
      const waitTime = this.rateLimitResetTime - Date.now();
      if (waitTime > 0) {
        throw new Error(
          `Rate limit exceeded. Reset in ${Math.ceil(waitTime / 60000)} minutes`
        );
      }
    }
  }

  /**
   * Make authenticated API request with rate limiting and retry logic
   * @param {string} endpoint - API endpoint (without base URL)
   * @param {string} userId - User ID for token lookup
   * @param {Object} options - Request options
   * @returns {Promise<Object>} API response data
   */
  async makeAuthenticatedRequest(endpoint, userId, options = {}) {
    this.checkRateLimit();

    const {
      method = 'GET',
      headers = {},
      body = null,
      params = {},
      retries = MAX_RETRIES,
    } = options;

    try {
      // Get user's access token
      const tokenResponse = await fetch(`/api/trainingpeaks/token/${userId}`);
      if (!tokenResponse.ok) {
        throw new Error('Failed to retrieve access token');
      }

      const { accessToken } = await tokenResponse.json();
      if (!accessToken) {
        throw new Error('No access token available');
      }

      // Build request URL
      const url = new URL(`${this.baseUrl}${endpoint}`);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          url.searchParams.append(key, value);
        }
      });

      // Prepare request options
      const requestOptions = {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'TrainingLab/1.0',
          ...headers,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      };

      if (body) {
        requestOptions.body =
          typeof body === 'string' ? body : JSON.stringify(body);
      }

      logger.debug('Making TrainingPeaks API request', {
        endpoint,
        method,
        userId: `${userId.substring(0, 8)}...`,
      });

      // Increment rate limit counter
      this.requestCount++;

      const response = await fetch(url.toString(), requestOptions);

      // Handle different response statuses
      if (response.status === HTTP_STATUS_UNAUTHORIZED) {
        // Try to refresh token and retry
        logger.info('Access token expired, attempting refresh', { userId });
        const refreshSuccess = await this.refreshUserToken(userId);

        if (refreshSuccess && retries > 0) {
          // Retry with new token
          return await this.makeAuthenticatedRequest(endpoint, userId, {
            ...options,
            retries: retries - 1,
          });
        } else {
          throw new Error(
            'Authentication failed - please reconnect to TrainingPeaks'
          );
        }
      }

      if (response.status === HTTP_STATUS_RATE_LIMITED) {
        // Handle API rate limiting
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter
          ? parseInt(retryAfter) * 1000
          : RETRY_DELAY_BASE_MS;

        if (retries > 0) {
          logger.warn('API rate limited, waiting before retry', {
            waitTime,
            retries,
          });
          await this.delay(waitTime);
          return await this.makeAuthenticatedRequest(endpoint, userId, {
            ...options,
            retries: retries - 1,
          });
        } else {
          throw new Error('API rate limit exceeded');
        }
      }

      if (response.status >= HTTP_STATUS_SERVER_ERROR && retries > 0) {
        // Retry server errors with exponential backoff
        const delay = RETRY_DELAY_BASE_MS * Math.pow(2, MAX_RETRIES - retries);
        logger.warn('Server error, retrying with backoff', {
          status: response.status,
          delay,
          retries,
        });
        await this.delay(delay);
        return await this.makeAuthenticatedRequest(endpoint, userId, {
          ...options,
          retries: retries - 1,
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('API request failed', {
          endpoint,
          status: response.status,
          error: errorText,
        });
        throw new Error(`API request failed: ${response.status} ${errorText}`);
      }

      // Update rate limit info from headers
      this.updateRateLimitFromHeaders(response.headers);

      // Parse response
      const responseData = await response.json();

      logger.debug('API request successful', {
        endpoint,
        status: response.status,
      });

      return responseData;
    } catch (error) {
      logger.error('API request error', { endpoint, error: error.message });
      throw error;
    }
  }

  /**
   * Update rate limit counters from response headers
   * @param {Headers} headers - Response headers
   */
  updateRateLimitFromHeaders(headers) {
    const remaining = headers.get('X-RateLimit-Remaining');
    const reset = headers.get('X-RateLimit-Reset');

    if (remaining !== null) {
      this.requestCount = RATE_LIMIT_REQUESTS - parseInt(remaining);
    }

    if (reset !== null) {
      this.rateLimitResetTime = parseInt(reset) * 1000;
    }
  }

  /**
   * Refresh user's access token
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async refreshUserToken(userId) {
    try {
      const response = await fetch(
        `/api/trainingpeaks/refresh-token/${userId}`,
        {
          method: 'POST',
        }
      );

      return response.ok;
    } catch (error) {
      logger.error('Token refresh failed', { userId, error: error.message });
      return false;
    }
  }

  /**
   * Get user profile information
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User profile data
   */
  async getUserProfile(userId) {
    return await this.makeAuthenticatedRequest('/athlete', userId);
  }

  /**
   * Get workouts for date range
   * @param {string} userId - User ID
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} Array of workouts
   */
  async getWorkouts(userId, startDate, endDate, options = {}) {
    const params = {
      startDate,
      endDate,
      limit: options.limit || 50,
      offset: options.offset || 0,
      includeStructure: options.includeStructure || true,
    };

    return await this.makeAuthenticatedRequest('/workouts', userId, { params });
  }

  /**
   * Get specific workout by ID
   * @param {string} userId - User ID
   * @param {number} workoutId - Workout ID
   * @returns {Promise<Object>} Workout data
   */
  async getWorkout(userId, workoutId) {
    return await this.makeAuthenticatedRequest(
      `/workouts/${workoutId}`,
      userId
    );
  }

  /**
   * Create new workout
   * @param {string} userId - User ID
   * @param {Object} workoutData - Workout data
   * @returns {Promise<Object>} Created workout
   */
  async createWorkout(userId, workoutData) {
    return await this.makeAuthenticatedRequest('/workouts', userId, {
      method: 'POST',
      body: workoutData,
    });
  }

  /**
   * Update existing workout
   * @param {string} userId - User ID
   * @param {number} workoutId - Workout ID
   * @param {Object} workoutData - Updated workout data
   * @returns {Promise<Object>} Updated workout
   */
  async updateWorkout(userId, workoutId, workoutData) {
    return await this.makeAuthenticatedRequest(
      `/workouts/${workoutId}`,
      userId,
      {
        method: 'PUT',
        body: workoutData,
      }
    );
  }

  /**
   * Delete workout
   * @param {string} userId - User ID
   * @param {number} workoutId - Workout ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteWorkout(userId, workoutId) {
    try {
      await this.makeAuthenticatedRequest(`/workouts/${workoutId}`, userId, {
        method: 'DELETE',
      });
      return true;
    } catch (error) {
      logger.error('Failed to delete workout', {
        userId,
        workoutId,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Get activities for date range
   * @param {string} userId - User ID
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} Array of activities
   */
  async getActivities(userId, startDate, endDate, options = {}) {
    const params = {
      startDate,
      endDate,
      limit: options.limit || 50,
      offset: options.offset || 0,
      includeStreams: options.includeStreams || false,
    };

    return await this.makeAuthenticatedRequest('/activities', userId, {
      params,
    });
  }

  /**
   * Get specific activity by ID
   * @param {string} userId - User ID
   * @param {number} activityId - Activity ID
   * @param {boolean} includeStreams - Include detailed stream data
   * @returns {Promise<Object>} Activity data
   */
  async getActivity(userId, activityId, includeStreams = false) {
    const params = { includeStreams };
    return await this.makeAuthenticatedRequest(
      `/activities/${activityId}`,
      userId,
      { params }
    );
  }

  /**
   * Upload activity file
   * @param {string} userId - User ID
   * @param {File|Blob} file - Activity file
   * @param {Object} metadata - Activity metadata
   * @returns {Promise<Object>} Upload result
   */
  async uploadActivity(userId, file, metadata = {}) {
    const formData = new FormData();
    formData.append('file', file);

    // Add metadata
    Object.entries(metadata).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, value);
      }
    });

    return await this.makeAuthenticatedRequest('/activities/upload', userId, {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type, let browser set it with boundary for FormData
      },
    });
  }

  /**
   * Get performance metrics for date range
   * @param {string} userId - User ID
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Object>} Performance metrics
   */
  async getPerformanceMetrics(userId, startDate, endDate) {
    const params = { startDate, endDate };
    return await this.makeAuthenticatedRequest('/metrics/performance', userId, {
      params,
    });
  }

  /**
   * Get training stress scores (TSS) for date range
   * @param {string} userId - User ID
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Array>} TSS data
   */
  async getTSSData(userId, startDate, endDate) {
    const params = { startDate, endDate };
    return await this.makeAuthenticatedRequest('/metrics/tss', userId, {
      params,
    });
  }

  /**
   * Get power curve data
   * @param {string} userId - User ID
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Object>} Power curve data
   */
  async getPowerCurve(userId, startDate, endDate) {
    const params = { startDate, endDate };
    return await this.makeAuthenticatedRequest('/metrics/power-curve', userId, {
      params,
    });
  }

  /**
   * Get athlete's training zones
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Training zones
   */
  async getTrainingZones(userId) {
    return await this.makeAuthenticatedRequest('/athlete/zones', userId);
  }

  /**
   * Update training zones
   * @param {string} userId - User ID
   * @param {Object} zonesData - Zones configuration
   * @returns {Promise<Object>} Updated zones
   */
  async updateTrainingZones(userId, zonesData) {
    return await this.makeAuthenticatedRequest('/athlete/zones', userId, {
      method: 'PUT',
      body: zonesData,
    });
  }

  /**
   * Get all activities with pagination support
   * @param {string} userId - User ID
   * @param {Object} options - Options for pagination and filtering
   * @returns {Promise<Array>} All activities
   */
  async getAllActivities(userId, options = {}) {
    const {
      startDate,
      endDate,
      pageSize = 100,
      maxPages = 50,
      onProgress = null,
    } = options;

    const allActivities = [];
    let page = 0;
    let hasMoreData = true;

    while (hasMoreData && page < maxPages) {
      try {
        const activities = await this.getActivities(
          userId,
          startDate,
          endDate,
          {
            limit: pageSize,
            offset: page * pageSize,
          }
        );

        if (!activities || activities.length === 0) {
          hasMoreData = false;
          break;
        }

        allActivities.push(...activities);
        page++;

        // Call progress callback if provided
        if (onProgress) {
          onProgress({
            page,
            totalFetched: allActivities.length,
            lastBatch: activities.length,
          });
        }

        // Be respectful of rate limits
        if (activities.length === pageSize) {
          await this.delay(100); // Small delay between pages
        } else {
          hasMoreData = false; // Last page was partial
        }
      } catch (error) {
        logger.error('Error fetching activities page', {
          page,
          error: error.message,
        });
        if (error.message.includes('Rate limit')) {
          // If rate limited, return what we have so far
          break;
        }
        throw error;
      }
    }

    logger.info('Fetched all activities', {
      totalActivities: allActivities.length,
      pages: page,
    });

    return allActivities;
  }

  /**
   * Delay execution for specified milliseconds
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  async delay(ms) {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }

  /**
   * Get current rate limit status
   * @returns {Object} Rate limit information
   */
  getRateLimitStatus() {
    return {
      requestCount: this.requestCount,
      requestLimit: RATE_LIMIT_REQUESTS,
      remaining: Math.max(0, RATE_LIMIT_REQUESTS - this.requestCount),
      resetTime: this.rateLimitResetTime,
      resetIn: Math.max(0, this.rateLimitResetTime - Date.now()),
    };
  }

  /**
   * Reset rate limit counters (for testing)
   */
  resetRateLimit() {
    this.requestCount = 0;
    this.rateLimitResetTime = Date.now() + RATE_LIMIT_WINDOW_MS;
    logger.info('Rate limit manually reset');
  }
}

// Create and export singleton instance
export const trainingPeaksAPI = new TrainingPeaksAPIService();
export default trainingPeaksAPI;
