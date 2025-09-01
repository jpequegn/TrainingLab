/**
 * Strava OAuth2 Authentication Service
 * Handles Strava OAuth flow, token management, and authentication
 */

import { createLogger } from '../utils/logger.js';

const logger = createLogger('StravaAuth');

// Constants
const OAUTH_STATE_EXPIRY_MS = 600000; // 10 minutes
const RANDOM_STATE_LENGTH = 32;
const HEX_RADIX = 16;

class StravaAuthService {
  constructor() {
    this.clientId = null;
    this.redirectUri = null;
    this.scope = ['read', 'activity:read_all', 'profile:read_all'];
    this.authState = new Map(); // Store auth state temporarily

    this.initializeConfig();
  }

  /**
   * Initialize configuration from environment or fallback
   */
  initializeConfig() {
    // These would typically come from environment variables
    // For now, we'll set them up to be configured via the backend
    this.baseUrl = 'https://www.strava.com';
    this.apiBaseUrl = 'https://www.strava.com/api/v3';

    logger.info('Strava Auth Service initialized');
  }

  /**
   * Set configuration (called from backend with env vars)
   * @param {Object} config - Configuration object
   */
  setConfig(config) {
    this.clientId = config.clientId;
    this.redirectUri = config.redirectUri;

    if (config.scope) {
      this.scope = config.scope;
    }

    logger.info('Strava configuration updated', { clientId: this.clientId });
  }

  /**
   * Generate OAuth2 authorization URL
   * @param {string} userId - User ID for state tracking
   * @returns {Promise<string>} Authorization URL
   */
  async generateAuthUrl(userId) {
    if (!this.clientId || !this.redirectUri) {
      throw new Error('Strava OAuth configuration not initialized');
    }

    const state = this.generateState();
    const timestamp = Date.now();

    // Store state for verification
    this.authState.set(state, {
      userId,
      timestamp,
      expires: timestamp + OAUTH_STATE_EXPIRY_MS,
    });

    // Clean up expired states
    this.cleanupExpiredStates();

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      approval_prompt: 'auto',
      scope: this.scope.join(','),
      state: state,
    });

    const authUrl = `${this.baseUrl}/oauth/authorize?${params.toString()}`;

    logger.info('Generated Strava auth URL', { userId, state });

    return {
      url: authUrl,
      state: state,
    };
  }

  /**
   * Verify OAuth state parameter
   * @param {string} state - State parameter from callback
   * @returns {Object|null} User data if valid, null if invalid
   */
  verifyState(state) {
    const stateData = this.authState.get(state);

    if (!stateData) {
      logger.warn('Invalid or missing OAuth state', { state });
      return null;
    }

    if (Date.now() > stateData.expires) {
      logger.warn('Expired OAuth state', { state });
      this.authState.delete(state);
      return null;
    }

    // Remove used state
    this.authState.delete(state);

    return stateData;
  }

  /**
   * Exchange authorization code for tokens
   * @param {string} code - Authorization code from Strava
   * @param {string} state - State parameter for verification
   * @returns {Promise<Object>} Token data
   */
  async exchangeCodeForTokens(code, state) {
    const stateData = this.verifyState(state);

    if (!stateData) {
      throw new Error('Invalid or expired OAuth state');
    }

    try {
      // This request is typically made from the backend for security
      const response = await fetch('/api/strava/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          userId: stateData.userId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Token exchange failed: ${response.status}`
        );
      }

      const tokenData = await response.json();

      logger.info('Successfully exchanged code for tokens', {
        userId: stateData.userId,
        hasTokens: !!tokenData.access_token,
      });

      return {
        userId: stateData.userId,
        tokens: tokenData,
      };
    } catch (error) {
      logger.error('Token exchange failed', error);
      throw error;
    }
  }

  /**
   * Check if user has valid Strava tokens
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if user has valid tokens
   */
  async isAuthenticated(userId) {
    try {
      const response = await fetch(`/api/strava/auth-status/${userId}`);

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.authenticated || false;
    } catch (error) {
      logger.error('Error checking auth status', error);
      return false;
    }
  }

  /**
   * Get user's Strava connection status and profile info
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Connection status and profile data
   */
  async getConnectionStatus(userId) {
    try {
      const response = await fetch(`/api/strava/connection-status/${userId}`);

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      logger.error('Error getting connection status', error);
      return null;
    }
  }

  /**
   * Disconnect user's Strava account
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async disconnect(userId) {
    try {
      const response = await fetch(`/api/strava/disconnect/${userId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Disconnect failed: ${response.status}`
        );
      }

      logger.info('Successfully disconnected Strava account', { userId });
      return true;
    } catch (error) {
      logger.error('Error disconnecting Strava account', error);
      return false;
    }
  }

  /**
   * Refresh expired access token
   * @param {string} userId - User ID
   * @returns {Promise<Object>} New token data
   */
  async refreshToken(userId) {
    try {
      const response = await fetch(`/api/strava/refresh-token/${userId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Token refresh failed: ${response.status}`
        );
      }

      const tokenData = await response.json();

      logger.info('Successfully refreshed Strava token', { userId });

      return tokenData;
    } catch (error) {
      logger.error('Token refresh failed', error);
      throw error;
    }
  }

  /**
   * Generate secure random state for OAuth
   * @returns {string} Random state string
   */
  generateState() {
    const array = new Uint8Array(RANDOM_STATE_LENGTH);
    crypto.getRandomValues(array);
    return Array.from(array, byte =>
      byte.toString(HEX_RADIX).padStart(2, '0')
    ).join('');
  }

  /**
   * Clean up expired OAuth states
   */
  cleanupExpiredStates() {
    const now = Date.now();

    for (const [state, data] of this.authState.entries()) {
      if (now > data.expires) {
        this.authState.delete(state);
      }
    }
  }

  /**
   * Get OAuth scopes for display purposes
   * @returns {Array} Array of scope descriptions
   */
  getScopeDescriptions() {
    const scopeMap = {
      read: 'View public profile information',
      read_all: 'View all profile information',
      'profile:read_all': 'View detailed profile information',
      'profile:write': 'Update profile information',
      'activity:read': 'View public activities',
      'activity:read_all': 'View all activities (including private)',
      'activity:write': 'Create and modify activities',
    };

    return this.scope.map(scope => ({
      scope,
      description: scopeMap[scope] || scope,
    }));
  }

  /**
   * Handle OAuth callback from popup window
   * @param {string} code - Authorization code
   * @param {string} state - State parameter
   * @param {string} error - Error parameter if authorization failed
   * @returns {Promise<Object>} Result of token exchange
   */
  async handleOAuthCallback(code, state, error) {
    if (error) {
      logger.warn('OAuth authorization error', { error, state });
      throw new Error(`Authorization failed: ${error}`);
    }

    if (!code || !state) {
      throw new Error('Missing authorization code or state parameter');
    }

    return this.exchangeCodeForTokens(code, state);
  }

  /**
   * Validate OAuth callback parameters
   * @param {URLSearchParams} params - URL parameters from callback
   * @returns {Object} Validated parameters
   */
  validateCallbackParams(params) {
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');
    const errorDescription = params.get('error_description');

    if (error) {
      const message = errorDescription || error;
      logger.warn('OAuth callback error', { error, errorDescription });
      throw new Error(`Authorization failed: ${message}`);
    }

    if (!code || !state) {
      logger.warn('Missing OAuth callback parameters', {
        hasCode: !!code,
        hasState: !!state,
      });
      throw new Error('Invalid callback parameters');
    }

    return { code, state };
  }
}

// Export singleton instance
export const stravaAuth = new StravaAuthService();
