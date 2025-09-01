/**
 * TrainingPeaks OAuth2 Authentication Service
 * Handles TrainingPeaks OAuth2 flow with PKCE, token management, and authentication
 */

import { createLogger } from '../utils/logger.js';

const logger = createLogger('TrainingPeaksAuth');

// Constants
const OAUTH_STATE_EXPIRY_MS = 600000; // 10 minutes
const RANDOM_STATE_LENGTH = 32;
const CODE_VERIFIER_LENGTH = 128;
const HEX_RADIX = 16;
const PKCE_CODE_CHALLENGE_METHOD = 'S256';

class TrainingPeaksAuthService {
  constructor() {
    this.clientId = null;
    this.redirectUri = null;
    this.scope = [
      'read:athlete',
      'read:workouts',
      'write:workouts',
      'read:activities',
      'write:activities',
      'read:metrics',
    ];
    this.authState = new Map(); // Store auth state temporarily

    this.initializeConfig();
  }

  /**
   * Initialize configuration from environment or fallback
   */
  initializeConfig() {
    // These would typically come from environment variables
    // For now, we'll set them up to be configured via the backend
    this.baseUrl = 'https://www.trainingpeaks.com';
    this.apiBaseUrl = 'https://api.trainingpeaks.com';

    logger.info('TrainingPeaks Auth Service initialized');
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

    logger.info('TrainingPeaks configuration updated', {
      clientId: this.clientId,
    });
  }

  /**
   * Generate a cryptographically secure random state parameter
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
   * Generate code verifier for PKCE
   * @returns {string} Base64URL-encoded code verifier
   */
  generateCodeVerifier() {
    const array = new Uint8Array(CODE_VERIFIER_LENGTH);
    crypto.getRandomValues(array);

    // Convert to base64url
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Generate code challenge from code verifier using SHA256
   * @param {string} codeVerifier - Code verifier
   * @returns {Promise<string>} Base64URL-encoded code challenge
   */
  async generateCodeChallenge(codeVerifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);

    // Convert to base64url
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Generate authentication URL with PKCE
   * @param {string} userId - User identifier
   * @returns {Promise<string>} Authorization URL
   */
  async generateAuthUrl(userId) {
    if (!this.clientId || !this.redirectUri) {
      throw new Error('TrainingPeaks OAuth configuration not set');
    }

    const state = this.generateState();
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    const timestamp = Date.now();

    // Store auth state temporarily
    this.authState.set(state, {
      userId,
      codeVerifier,
      timestamp,
      expires: timestamp + OAUTH_STATE_EXPIRY_MS,
    });

    // Clean up expired states
    this.cleanupExpiredStates();

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: this.scope.join(' '),
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: PKCE_CODE_CHALLENGE_METHOD,
    });

    const authUrl = `${this.baseUrl}/oauth/authorize?${params.toString()}`;

    logger.info('Generated TrainingPeaks auth URL', {
      userId,
      state: `${state.substring(0, 8)}...`,
    });

    return authUrl;
  }

  /**
   * Validate OAuth callback and extract authorization code
   * @param {string} callbackUrl - Full callback URL with parameters
   * @returns {Object} Validation result
   */
  validateCallback(callbackUrl) {
    try {
      const url = new URL(callbackUrl);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');
      const errorDescription = url.searchParams.get('error_description');

      // Check for OAuth errors
      if (error) {
        logger.error('TrainingPeaks OAuth error', { error, errorDescription });
        return {
          success: false,
          error: error,
          errorDescription: errorDescription,
        };
      }

      // Validate required parameters
      if (!code || !state) {
        logger.error('Missing required OAuth parameters', {
          code: !!code,
          state: !!state,
        });
        return {
          success: false,
          error: 'invalid_request',
          errorDescription: 'Missing required parameters',
        };
      }

      // Validate state parameter
      const authData = this.authState.get(state);
      if (!authData) {
        logger.error('Invalid or expired OAuth state', {
          state: `${state.substring(0, 8)}...`,
        });
        return {
          success: false,
          error: 'invalid_state',
          errorDescription: 'Invalid or expired state parameter',
        };
      }

      // Check if state has expired
      if (Date.now() > authData.expires) {
        this.authState.delete(state);
        logger.error('Expired OAuth state', {
          state: `${state.substring(0, 8)}...`,
        });
        return {
          success: false,
          error: 'expired_state',
          errorDescription: 'Authentication state has expired',
        };
      }

      logger.info('Valid TrainingPeaks OAuth callback', {
        userId: authData.userId,
        state: `${state.substring(0, 8)}...`,
      });

      return {
        success: true,
        authorizationCode: code,
        state: state,
        userId: authData.userId,
        codeVerifier: authData.codeVerifier,
      };
    } catch (error) {
      logger.error('Error parsing OAuth callback URL', error);
      return {
        success: false,
        error: 'invalid_callback',
        errorDescription: 'Invalid callback URL format',
      };
    }
  }

  /**
   * Exchange authorization code for access tokens
   * @param {string} authorizationCode - Authorization code from callback
   * @param {string} state - State parameter for validation
   * @returns {Promise<Object>} Token exchange result
   */
  async exchangeCodeForTokens(authorizationCode, state) {
    try {
      const authData = this.authState.get(state);
      if (!authData) {
        throw new Error('Invalid auth state for token exchange');
      }

      const tokenEndpoint = `${this.apiBaseUrl}/oauth/token`;
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        code: authorizationCode,
        redirect_uri: this.redirectUri,
        code_verifier: authData.codeVerifier,
      });

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorData = await response.text();
        logger.error('Token exchange failed', {
          status: response.status,
          error: errorData,
        });
        throw new Error(
          `Token exchange failed: ${response.status} ${errorData}`
        );
      }

      const tokenData = await response.json();

      // Validate token response
      if (!tokenData.access_token) {
        throw new Error('Invalid token response: missing access_token');
      }

      // Calculate expiration time
      const expiresAt = Date.now() + tokenData.expires_in * 1000;

      const tokens = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenType: tokenData.token_type || 'bearer',
        expiresAt: expiresAt,
        scope: tokenData.scope || this.scope.join(' '),
      };

      // Clean up auth state
      this.authState.delete(state);

      logger.info('Successfully exchanged code for tokens', {
        userId: authData.userId,
        expiresAt: new Date(expiresAt).toISOString(),
      });

      return {
        success: true,
        tokens: tokens,
        userId: authData.userId,
      };
    } catch (error) {
      logger.error('Token exchange error', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Valid refresh token
   * @returns {Promise<Object>} Refresh result
   */
  async refreshAccessToken(refreshToken) {
    try {
      const tokenEndpoint = `${this.apiBaseUrl}/oauth/token`;
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        refresh_token: refreshToken,
      });

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorData = await response.text();
        logger.error('Token refresh failed', {
          status: response.status,
          error: errorData,
        });
        throw new Error(
          `Token refresh failed: ${response.status} ${errorData}`
        );
      }

      const tokenData = await response.json();

      // Calculate expiration time
      const expiresAt = Date.now() + tokenData.expires_in * 1000;

      const tokens = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || refreshToken, // Keep old refresh token if not provided
        tokenType: tokenData.token_type || 'bearer',
        expiresAt: expiresAt,
        scope: tokenData.scope,
      };

      logger.info('Successfully refreshed access token', {
        expiresAt: new Date(expiresAt).toISOString(),
      });

      return {
        success: true,
        tokens: tokens,
      };
    } catch (error) {
      logger.error('Token refresh error', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Revoke access token
   * @param {string} accessToken - Token to revoke
   * @returns {Promise<boolean>} Success status
   */
  async revokeToken(accessToken) {
    try {
      const revokeEndpoint = `${this.apiBaseUrl}/oauth/revoke`;

      const response = await fetch(revokeEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          token: accessToken,
          client_id: this.clientId,
        }).toString(),
      });

      if (!response.ok) {
        const errorData = await response.text();
        logger.error('Token revocation failed', {
          status: response.status,
          error: errorData,
        });
        return false;
      }

      logger.info('Successfully revoked access token');
      return true;
    } catch (error) {
      logger.error('Token revocation error', error);
      return false;
    }
  }

  /**
   * Check if token is expired or will expire soon
   * @param {Object} tokens - Token object with expiresAt
   * @param {number} bufferMs - Buffer time in milliseconds (default: 5 minutes)
   * @returns {boolean} True if token needs refresh
   */
  needsTokenRefresh(tokens, bufferMs = 300000) {
    if (!tokens || !tokens.expiresAt) {
      return true;
    }

    return Date.now() > tokens.expiresAt - bufferMs;
  }

  /**
   * Clean up expired authentication states
   * @private
   */
  cleanupExpiredStates() {
    const now = Date.now();
    for (const [state, authData] of this.authState.entries()) {
      if (now > authData.expires) {
        this.authState.delete(state);
      }
    }
  }

  /**
   * Get stored authentication state for testing/debugging
   * @returns {Map} Current auth state map
   */
  getAuthState() {
    this.cleanupExpiredStates();
    return new Map(this.authState);
  }

  /**
   * Clear all authentication state
   */
  clearAuthState() {
    this.authState.clear();
    logger.info('Cleared all authentication state');
  }
}

// Create and export singleton instance
export const trainingPeaksAuth = new TrainingPeaksAuthService();
export default trainingPeaksAuth;
