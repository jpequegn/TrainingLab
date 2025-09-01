/**
 * Strava API Service
 * Handles all Strava API interactions including activity fetching and data synchronization
 */

import { createLogger } from '../utils/logger.js';

const logger = createLogger('StravaAPI');

// Constants
const HTTP_STATUS_UNAUTHORIZED = 401;
const HTTP_STATUS_RATE_LIMITED = 429;
const MAX_ACTIVITIES_PER_PAGE = 200;
const RATE_LIMIT_SHORT_WINDOW_MS = 900000; // 15 minutes
const RATE_LIMIT_LONG_WINDOW_MS = 86400000; // 24 hours
const MINUTES_TO_MS = 60000;
const HOURS_TO_MS = 3600000;

class StravaAPIService {
  constructor() {
    this.baseUrl = 'https://www.strava.com/api/v3';
    this.rateLimits = {
      shortTerm: { limit: 600, window: RATE_LIMIT_SHORT_WINDOW_MS },
      longTerm: { limit: 30000, window: RATE_LIMIT_LONG_WINDOW_MS },
    };
    this.requestHistory = [];
  }

  /**
   * Make authenticated request to Strava API
   * @param {string} endpoint - API endpoint
   * @param {string} userId - User ID for token lookup
   * @param {Object} options - Request options
   * @returns {Promise<Object>} API response data
   */
  async makeAuthenticatedRequest(endpoint, userId, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      // Check rate limits before making request
      this.checkRateLimit();

      // Get user's access token from backend
      const tokenResponse = await fetch(`/api/strava/token/${userId}`);

      if (!tokenResponse.ok) {
        throw new Error('Unable to retrieve Strava access token');
      }

      const { access_token } = await tokenResponse.json();

      // Make the API request
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      // Track request for rate limiting
      this.trackRequest();

      // Handle rate limiting responses
      if (response.status === HTTP_STATUS_RATE_LIMITED) {
        const retryAfter = response.headers.get('Retry-After');
        logger.warn('Rate limited by Strava API', {
          endpoint,
          retryAfter,
          rateLimitInfo: this.getRateLimitInfo(),
        });
        throw new Error(`Rate limited. Retry after ${retryAfter} seconds`);
      }

      // Handle token expiry
      if (response.status === HTTP_STATUS_UNAUTHORIZED) {
        logger.warn('Strava token expired, attempting refresh', { userId });

        // Try to refresh the token
        const refreshResponse = await fetch(
          `/api/strava/refresh-token/${userId}`,
          {
            method: 'POST',
          }
        );

        if (refreshResponse.ok) {
          // Retry the original request with new token
          return this.makeAuthenticatedRequest(endpoint, userId, options);
        } else {
          throw new Error('Strava authentication expired and refresh failed');
        }
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Strava API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      logger.debug('Strava API request successful', {
        endpoint,
        dataSize: JSON.stringify(data).length,
      });

      return data;
    } catch (error) {
      logger.error('Strava API request failed', {
        endpoint,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get user's activities from Strava
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of activities
   */
  async getActivities(userId, options = {}) {
    const { before, after, page = 1, perPage = 30 } = options;

    const params = new URLSearchParams({
      page: page.toString(),
      per_page: Math.min(perPage, MAX_ACTIVITIES_PER_PAGE).toString(),
    });

    if (before) params.append('before', Math.floor(before / 1000).toString());
    if (after) params.append('after', Math.floor(after / 1000).toString());

    const endpoint = `/athlete/activities?${params.toString()}`;

    try {
      const activities = await this.makeAuthenticatedRequest(endpoint, userId);

      logger.info('Retrieved activities from Strava', {
        userId,
        count: activities.length,
        page,
        before,
        after,
      });

      return activities;
    } catch (error) {
      logger.error('Failed to get activities from Strava', {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get detailed activity information
   * @param {string} userId - User ID
   * @param {number} activityId - Strava activity ID
   * @param {boolean} includeAllEfforts - Include all segment efforts
   * @returns {Promise<Object>} Detailed activity data
   */
  async getDetailedActivity(userId, activityId, includeAllEfforts = false) {
    const endpoint = `/activities/${activityId}${includeAllEfforts ? '?include_all_efforts=true' : ''}`;

    try {
      const activity = await this.makeAuthenticatedRequest(endpoint, userId);

      logger.info('Retrieved detailed activity from Strava', {
        userId,
        activityId,
        hasEfforts: !!activity.segment_efforts?.length,
      });

      return activity;
    } catch (error) {
      logger.error('Failed to get detailed activity from Strava', {
        userId,
        activityId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get activity streams (power, heart rate, etc.)
   * @param {string} userId - User ID
   * @param {number} activityId - Strava activity ID
   * @param {Array} streamTypes - Types of streams to retrieve
   * @returns {Promise<Array>} Array of stream data
   */
  async getActivityStreams(
    userId,
    activityId,
    streamTypes = ['watts', 'heartrate', 'cadence', 'time']
  ) {
    const types = streamTypes.join(',');
    const endpoint = `/activities/${activityId}/streams?keys=${types}&key_by_type=true`;

    try {
      const streams = await this.makeAuthenticatedRequest(endpoint, userId);

      logger.info('Retrieved activity streams from Strava', {
        userId,
        activityId,
        streamTypes: Object.keys(streams || {}),
      });

      return streams;
    } catch (error) {
      logger.error('Failed to get activity streams from Strava', {
        userId,
        activityId,
        streamTypes,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get athlete profile information
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Athlete profile data
   */
  async getAthleteProfile(userId) {
    const endpoint = '/athlete';

    try {
      const profile = await this.makeAuthenticatedRequest(endpoint, userId);

      logger.info('Retrieved athlete profile from Strava', {
        userId,
        stravaId: profile.id,
        hasProfile: !!profile.firstname,
      });

      return profile;
    } catch (error) {
      logger.error('Failed to get athlete profile from Strava', {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get athlete statistics
   * @param {string} userId - User ID
   * @param {number} athleteId - Strava athlete ID (optional, defaults to authenticated athlete)
   * @returns {Promise<Object>} Athlete statistics
   */
  async getAthleteStats(userId, athleteId = null) {
    const endpoint = athleteId
      ? `/athletes/${athleteId}/stats`
      : '/athlete/stats';

    try {
      const stats = await this.makeAuthenticatedRequest(endpoint, userId);

      logger.info('Retrieved athlete stats from Strava', {
        userId,
        athleteId,
        hasStats: !!stats.recent_ride_totals,
      });

      return stats;
    } catch (error) {
      logger.error('Failed to get athlete stats from Strava', {
        userId,
        athleteId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Batch fetch all activities for historical import
   * @param {string} userId - User ID
   * @param {Date} afterDate - Only get activities after this date
   * @param {Function} progressCallback - Progress callback function
   * @returns {Promise<Array>} All activities
   */
  async getAllActivities(userId, afterDate = null, progressCallback = null) {
    const allActivities = [];
    let page = 1;
    const perPage = 200; // Maximum per page
    let hasMore = true;

    logger.info('Starting bulk activity import from Strava', {
      userId,
      afterDate,
      hasProgressCallback: !!progressCallback,
    });

    try {
      while (hasMore) {
        const options = {
          page,
          perPage,
        };

        if (afterDate) {
          options.after = afterDate.getTime();
        }

        const activities = await this.getActivities(userId, options);

        if (activities.length === 0) {
          hasMore = false;
        } else {
          allActivities.push(...activities);

          // Progress callback
          if (progressCallback) {
            progressCallback({
              page,
              count: activities.length,
              total: allActivities.length,
              hasMore: activities.length === perPage,
            });
          }

          // Check if we got less than the full page, indicating end
          if (activities.length < perPage) {
            hasMore = false;
          } else {
            page++;

            // Rate limiting delay between pages
            await this.rateLimitDelay();
          }
        }
      }

      logger.info('Completed bulk activity import from Strava', {
        userId,
        totalActivities: allActivities.length,
        pages: page,
      });

      return allActivities;
    } catch (error) {
      logger.error('Bulk activity import failed', {
        userId,
        page,
        activitiesImported: allActivities.length,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Check if we're hitting rate limits
   */
  checkRateLimit() {
    const now = Date.now();

    // Clean up old requests
    this.requestHistory = this.requestHistory.filter(
      timestamp => now - timestamp < this.rateLimits.longTerm.window
    );

    // Check short-term limit (15 minutes)
    const recentRequests = this.requestHistory.filter(
      timestamp => now - timestamp < this.rateLimits.shortTerm.window
    );

    if (recentRequests.length >= this.rateLimits.shortTerm.limit) {
      throw new Error(
        'Rate limit exceeded: too many requests in 15-minute window'
      );
    }

    // Check long-term limit (24 hours)
    if (this.requestHistory.length >= this.rateLimits.longTerm.limit) {
      throw new Error('Rate limit exceeded: daily request limit reached');
    }
  }

  /**
   * Track a request for rate limiting
   */
  trackRequest() {
    this.requestHistory.push(Date.now());
  }

  /**
   * Get current rate limit status
   * @returns {Object} Rate limit information
   */
  getRateLimitInfo() {
    const now = Date.now();

    const recentRequests = this.requestHistory.filter(
      timestamp => now - timestamp < this.rateLimits.shortTerm.window
    );

    return {
      shortTerm: {
        used: recentRequests.length,
        limit: this.rateLimits.shortTerm.limit,
        remaining: this.rateLimits.shortTerm.limit - recentRequests.length,
        windowMinutes: this.rateLimits.shortTerm.window / MINUTES_TO_MS,
      },
      longTerm: {
        used: this.requestHistory.length,
        limit: this.rateLimits.longTerm.limit,
        remaining: this.rateLimits.longTerm.limit - this.requestHistory.length,
        windowHours: this.rateLimits.longTerm.window / HOURS_TO_MS,
      },
    };
  }

  /**
   * Add delay between requests to avoid rate limiting
   * @param {number} delayMs - Delay in milliseconds
   */
  async rateLimitDelay(delayMs = 100) {
    return new Promise(resolve => {
      setTimeout(resolve, delayMs);
    });
  }

  /**
   * Validate activity data before processing
   * @param {Object} activity - Strava activity data
   * @returns {boolean} True if activity is valid
   */
  validateActivityData(activity) {
    if (!activity || typeof activity !== 'object') {
      return false;
    }

    // Required fields for basic activity
    const requiredFields = ['id', 'name', 'start_date', 'type'];

    for (const field of requiredFields) {
      if (!activity[field]) {
        logger.warn('Activity missing required field', {
          field,
          activityId: activity.id,
        });
        return false;
      }
    }

    // Check for valid activity type
    if (
      typeof activity.type !== 'string' ||
      activity.type.trim().length === 0
    ) {
      logger.warn('Invalid activity type', {
        activityId: activity.id,
        type: activity.type,
      });
      return false;
    }

    return true;
  }
}

// Export singleton instance
export const stravaAPI = new StravaAPIService();
