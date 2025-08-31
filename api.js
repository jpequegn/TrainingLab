/**
 * API utilities for workout management and server communication
 * Provides consistent error handling and response processing
 */

import { createLogger } from './utils/logger.js';

const logger = createLogger('API');

// API configuration
const API_CONFIG = {
  timeout: 30000, // 30 seconds
  retries: 3,
  retryDelay: 1000, // 1 second
};

/**
 * Enhanced fetch with timeout and error handling
 * @param {string} url - Request URL
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} Response object
 */
async function enhancedFetch(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${API_CONFIG.timeout}ms`);
    }
    throw error;
  }
}

/**
 * Fetch directory contents with error handling
 * @param {string} path - Directory path
 * @returns {Promise<Array>} Array of directory items
 */
export async function fetchDirectory(path = '') {
  try {
    const url = `/workouts${path ? `/${  encodeURIComponent(path)}` : ''}`;
    const response = await enhancedFetch(url);

    if (!response.ok) {
      console.warn(
        `Failed to fetch directory ${path}: ${response.status} ${response.statusText}`
      );
      return [];
    }

    const data = await response.json();
    return Array.isArray(data.items) ? data.items : [];
  } catch (error) {
    console.error('Error fetching directory:', error);
    return [];
  }
}

/**
 * Fetch workout file content
 * @param {string} filePath - Path to workout file
 * @returns {Promise<string>} Workout file content
 * @throws {Error} If file cannot be fetched
 */
export async function fetchWorkoutFile(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('Invalid file path provided');
  }

  try {
    const url = `/workout?file=${encodeURIComponent(filePath)}`;
    const response = await enhancedFetch(url);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `Failed to fetch workout file (${response.status}): ${errorText}`
      );
    }

    const data = await response.json();
    if (!data.content) {
      throw new Error('Workout file content is empty or invalid');
    }

    return data.content;
  } catch (error) {
    console.error(`Error fetching workout file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Deploy workout to Zwift directory
 * @param {string} workoutName - Name of the workout
 * @param {string} zwoContent - ZWO file content
 * @returns {Promise<string>} Path to deployed workout
 * @throws {Error} If deployment fails
 */
export async function deployWorkout(workoutName, zwoContent) {
  if (!workoutName || typeof workoutName !== 'string') {
    throw new Error('Invalid workout name provided');
  }

  if (!zwoContent || typeof zwoContent !== 'string') {
    throw new Error('Invalid workout content provided');
  }

  try {
    const response = await enhancedFetch('/deploy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: workoutName.trim(),
        content: zwoContent,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `Deployment failed (${response.status})`);
    }

    if (result.success && result.path) {
      return result.path;
    } else {
      throw new Error(result.error || 'Deployment failed: No path returned');
    }
  } catch (error) {
    console.error('Error deploying workout:', error);
    throw error;
  }
}

/**
 * Send chat message to LLM with enhanced error handling
 * @param {string} message - Message to send
 * @returns {Promise<string>} LLM response
 * @throws {Error} If request fails or LLM returns error
 */
export async function sendChatMessage(message) {
  if (!message || typeof message !== 'string') {
    throw new Error('Invalid message provided');
  }

  const trimmedMessage = message.trim();
  if (trimmedMessage.length === 0) {
    throw new Error('Message cannot be empty');
  }

  if (trimmedMessage.length > 10000) {
    throw new Error('Message too long (maximum 10,000 characters)');
  }

  try {
    const response = await enhancedFetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: trimmedMessage }),
    });

    if (!response.ok) {
      // Handle HTTP errors (500, 404, etc.)
      const errorData = await response.json().catch((parseError) => {
        logger.warn('Failed to parse error response JSON', parseError);
        return {};
      });
      const error = new Error(
        `Server error (${response.status}): ${response.statusText}`
      );
      error.serverResponse = errorData;
      error.status = response.status;
      throw error;
    }

    const data = await response.json();

    if (!data.reply) {
      throw new Error('No reply received from server');
    }

    // Check if the server returned an error message in the reply
    if (data.reply.includes('❌')) {
      // This is a server-side diagnostic message
      const error = new Error('Server-side LLM error');
      error.serverResponse = data;
      throw error;
    }

    return data.reply;
  } catch (error) {
    // Network or parsing errors
    if (error.serverResponse) {
      // Re-throw server errors with diagnostic info
      throw error;
    } else {
      // Handle network or other client-side errors
      const enhancedError = new Error(error.message || 'Network error');
      enhancedError.originalError = error;
      throw enhancedError;
    }
  }
}

/**
 * Get Zwift workout directory path
 * @returns {Promise<string|null>} Directory path or null if not available
 */
export async function getZwiftWorkoutDirectory() {
  try {
    const response = await enhancedFetch('/zwift-directory');

    if (!response.ok) {
      console.warn(
        `Failed to get Zwift directory: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const data = await response.json();
    return data.success && data.directory ? data.directory : null;
  } catch (error) {
    console.error('Error getting Zwift directory:', error);
    return null;
  }
}

/**
 * Save workout with custom filename and directory
 * @param {string} filename - Desired filename
 * @param {string} zwoContent - ZWO file content
 * @param {string} directory - Target directory
 * @returns {Promise<string>} Path to saved workout
 * @throws {Error} If save operation fails
 */
export async function saveAsWorkout(filename, zwoContent, directory) {
  if (!filename || typeof filename !== 'string') {
    throw new Error('Invalid filename provided');
  }

  if (!zwoContent || typeof zwoContent !== 'string') {
    throw new Error('Invalid workout content provided');
  }

  try {
    const response = await enhancedFetch('/save-as', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: filename.trim(),
        content: zwoContent,
        directory: directory || '',
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `Save failed (${response.status})`);
    }

    if (result.success && result.path) {
      return result.path;
    } else {
      throw new Error(result.error || 'Save failed: No path returned');
    }
  } catch (error) {
    console.error('Error saving workout:', error);
    throw error;
  }
}

/**
 * Open folder selection dialog
 * @returns {Promise<string|null>} Selected folder path or null if cancelled
 */
export async function selectFolder() {
  try {
    const response = await enhancedFetch('/select-folder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(
        `Failed to select folder: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const data = await response.json();
    return data.success && data.folderPath ? data.folderPath : null;
  } catch (error) {
    console.error('Error selecting folder:', error);
    return null;
  }
}

/**
 * Get MCP server status
 * @returns {Promise<Object>} Server status data
 * @throws {Error} If request fails
 */
export async function getMCPStatus() {
  try {
    const response = await enhancedFetch('/mcp/status');

    if (!response.ok) {
      const errorData = await response.json().catch((parseError) => {
        logger.warn('Failed to parse error response JSON', parseError);
        return {};
      });
      throw new Error(
        errorData.error || `Failed to get MCP status (${response.status})`
      );
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting MCP status:', error);
    throw error;
  }
}

/**
 * Control MCP server (start/stop/restart)
 * @param {string} action - Action to perform ('start', 'stop', 'restart')
 * @param {string} serverId - ID of the server to control
 * @returns {Promise<Object>} Operation result
 * @throws {Error} If operation fails
 */
export async function controlMCPServer(action, serverId) {
  if (!['start', 'stop', 'restart'].includes(action)) {
    throw new Error('Invalid action. Must be start, stop, or restart');
  }

  if (!serverId || typeof serverId !== 'string') {
    throw new Error('Invalid server ID provided');
  }

  try {
    const response = await enhancedFetch(`/mcp/${action}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ server_id: serverId }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error || `Failed to ${action} server (${response.status})`
      );
    }

    return result;
  } catch (error) {
    console.error(`Error ${action}ing MCP server ${serverId}:`, error);
    throw error;
  }
}
