import {
  formatDuration,
  calculateWorkoutMetrics,
  calculatePowerCurve,
} from '../core/workout.js';
import { downloadFile, generateZWOContent } from '../utils/exporter.js';
import {
  fetchDirectory,
  fetchWorkoutFile,
  sendChatMessage,
  getZwiftWorkoutDirectory,
  saveAsWorkout,
  selectFolder,
} from '../services/api.js';
import { WorkoutGenerator } from '../core/workout-generator.js';
import { powerZoneManager } from '../core/power-zones.js';

/**
 * UI Manager Class
 * Handles all user interface interactions and updates for the workout visualizer
 *
 * @class UI
 * @description Manages UI components, event handling, and user interactions
 */
export class UI {
  constructor(visualizer) {
    if (!visualizer) {
      throw new Error('UI: Visualizer instance is required');
    }

    this.visualizer = visualizer;
    this.chart = null;
    this.workoutGenerator = new WorkoutGenerator(powerZoneManager);

    // Cache frequently accessed DOM elements
    this._domCache = new Map();

    // Initialize UI components
    this._initializeComponents();
  }

  /**
   * Initialize all UI components and event listeners
   * @private
   */
  _initializeComponents() {
    try {
      this.initializeEventListeners();
      this.setupUndoButton();
      this.renderDirectoryTree();
      this.setupPanelToggles();
      this.setupSegmentToggle();
      this.setupChatInterface();
    } catch (error) {
      console.error('UI: Failed to initialize components:', error);
      this.showToast(
        'Failed to initialize UI components. Some features may not work properly.'
      );
    }
  }

  /**
   * Initialize event listeners with error handling
   */
  initializeEventListeners() {
    const eventMappings = [
      {
        id: 'fileInput',
        event: 'change',
        handler: e => this.visualizer.handleFileUpload(e),
      },
      // { id: 'loadSample', event: 'click', handler: () => this.visualizer.loadSampleWorkout() }, // Handled by reactive-ui.js
      {
        id: 'exportERG',
        event: 'click',
        handler: () => this.visualizer.exportToERG(),
      },
      {
        id: 'exportMRC',
        event: 'click',
        handler: () => this.visualizer.exportToMRC(),
      },
      { id: 'ftpInput', event: 'input', handler: e => this._handleFTPInput(e) },
      {
        id: 'scaleSlider',
        event: 'input',
        handler: e => this.updateScaleValue(e.target.value),
      },
      {
        id: 'applyScale',
        event: 'click',
        handler: () => this.visualizer.applyScaling(),
      },
      {
        id: 'resetWorkout',
        event: 'click',
        handler: () => this.visualizer.resetWorkout(),
      },
      {
        id: 'exportModified',
        event: 'click',
        handler: () => this.visualizer.exportModifiedZWO(),
      },
      {
        id: 'deployWorkout',
        event: 'click',
        handler: () => this.visualizer.deployWorkout(),
      },
      {
        id: 'saveAsWorkout',
        event: 'click',
        handler: () => this.showSaveAsDialog(),
      },
    ];

    eventMappings.forEach(({ id, event, handler }) => {
      this._addEventListenerSafely(id, event, handler);
    });
  }

  /**
   * Safely add event listener with error handling
   * @private
   * @param {string} elementId - DOM element ID
   * @param {string} event - Event type
   * @param {Function} handler - Event handler function
   */
  _addEventListenerSafely(elementId, event, handler) {
    const element = this._getElement(elementId);
    if (element) {
      try {
        element.addEventListener(event, handler);
      } catch (error) {
        console.error(
          `UI: Failed to add ${event} listener to ${elementId}:`,
          error
        );
      }
    } else {
      console.warn(
        `UI: Element ${elementId} not found, skipping event listener`
      );
    }
  }

  /**
   * Get DOM element with caching
   * @private
   * @param {string} elementId - Element ID
   * @returns {HTMLElement|null} DOM element or null if not found
   */
  _getElement(elementId) {
    if (!this._domCache.has(elementId)) {
      const element = document.getElementById(elementId);
      this._domCache.set(elementId, element);
    }
    return this._domCache.get(elementId);
  }

  /**
   * Handle FTP input with validation
   * @private
   * @param {Event} e - Input event
   */
  _handleFTPInput(e) {
    const value = parseInt(e.target.value);
    const ftp = isNaN(value) || value <= 0 ? 250 : Math.min(value, 1000); // Cap at reasonable max

    if (ftp !== value) {
      e.target.value = ftp;
    }

    this.visualizer.updateFTP(ftp);
  }

  setupUndoButton() {
    const undoBtn = document.getElementById('undoEditBtn');
    if (!undoBtn) return;
    undoBtn.onclick = () => {
      this.visualizer.undoLastEdit();
    };
    this.updateUndoButton(0);
  }

  /**
   * Update undo button visibility and state
   * @param {number} stackLength - Length of undo stack
   */
  updateUndoButton(stackLength) {
    const undoBtn = this._getElement('undoEditBtn');
    if (!undoBtn) {
      console.warn('UI: Undo button not found');
      return;
    }

    const hasUndoActions = stackLength > 0;
    undoBtn.style.display = hasUndoActions ? 'block' : 'none';
    undoBtn.disabled = !hasUndoActions;
    undoBtn.title = hasUndoActions
      ? `Undo last edit (${stackLength} actions available)`
      : 'No actions to undo';
  }

  /**
   * Show toast notification with improved error handling
   * @param {string} msg - Message to display
   * @param {string} type - Toast type ('info', 'success', 'warning', 'error')
   * @param {number} duration - Duration in milliseconds (default: 3000)
   */
  showToast(msg, type = 'info', duration = 3000) {
    if (!msg || typeof msg !== 'string') {
      console.warn('UI: Invalid toast message:', msg);
      return;
    }

    try {
      let toast = this._getElement('toastNotification');
      if (!toast) {
        toast = this._createToastElement();
        this._domCache.set('toastNotification', toast);
      }

      // Clear previous classes and add new type
      toast.className = `toast-notification toast-${type}`;
      toast.textContent = msg;
      toast.classList.add('show');

      // Clear any existing timeout
      if (toast._hideTimeout) {
        clearTimeout(toast._hideTimeout);
      }

      // Set new timeout
      toast._hideTimeout = setTimeout(() => {
        toast.classList.remove('show');
        toast._hideTimeout = null;
      }, duration);
    } catch (error) {
      console.error('UI: Failed to show toast:', error);
      // Fallback to alert if toast fails
      if (type === 'error') {
        alert(`Error: ${msg}`);
      }
    }
  }

  /**
   * Create toast notification element
   * @private
   * @returns {HTMLElement} Toast element
   */
  _createToastElement() {
    const toast = document.createElement('div');
    toast.id = 'toastNotification';
    toast.className = 'toast-notification';
    document.body.appendChild(toast);
    return toast;
  }

  displayWorkoutInfo(workoutData, tss) {
    // Update workout details
    document.getElementById('workoutName').textContent = workoutData.name;
    document.getElementById('workoutDescription').textContent =
      workoutData.description;
    document.getElementById('workoutAuthor').textContent = workoutData.author;
    document.getElementById('workoutSport').textContent = workoutData.sportType;

    // Update chart header information
    const chartDuration = document.getElementById('chartDuration');
    const chartTSS = document.getElementById('chartTSS');
    if (chartDuration) {
      chartDuration.textContent = this.formatDuration(
        workoutData.totalDuration
      );
    }
    if (chartTSS) {
      chartTSS.textContent = `${tss} TSS`;
    }

    // Show the new panel structure with optimized layout
    const { body } = document;
    body.classList.add('workout-loaded');

    // Show the workout section (remove hidden class)
    const workoutSection = document.getElementById('workoutSection');
    if (workoutSection) {
      workoutSection.classList.remove('hidden');
    }

    // Show chart container first (top priority)
    const chartContainer = document.querySelector('.chart-container');
    if (chartContainer) {
      chartContainer.style.display = 'block';
    }

    // Show panels with staggered animation
    setTimeout(() => {
      const workoutStats = document.getElementById('workoutStats');
      if (workoutStats) {
        workoutStats.style.display = 'grid';
      }
    }, 100);

    setTimeout(() => {
      const workoutInfo = document.getElementById('workoutInfo');
      if (workoutInfo) {
        workoutInfo.classList.remove('hidden');
        workoutInfo.style.display = 'block';
      }
    }, 200);

    // Scroll to top to show the chart
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Calculate and display workout metrics in the stats cards
    this.displayWorkoutStats(workoutData, tss);

    // Update library save button state
    if (this.visualizer.library) {
      this.visualizer.library.updateSaveCurrentButton();
    }
  }

  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  }

  displayWorkoutStats(workoutData, tss) {
    const metrics = calculateWorkoutMetrics(workoutData);
    const powerCurve = calculatePowerCurve(workoutData);

    // Get the stats container
    const statsContainer = document.getElementById('workoutStats');
    if (!statsContainer) return;

    // Create summary cards
    const cards = [
      {
        title: 'Duration',
        value: formatDuration(workoutData.totalDuration),
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>`,
        change: null,
        trend: 'neutral',
      },
      {
        title: 'Training Stress',
        value: `${tss} TSS`,
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>`,
        change: null,
        trend: 'neutral',
      },
      {
        title: 'Average Power',
        value: `${metrics.avgPower}% FTP`,
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>`,
        change: null,
        trend: 'neutral',
      },
      {
        title: 'Intensity Factor',
        value: metrics.intensityFactor.toFixed(2),
        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>`,
        change: null,
        trend: 'neutral',
      },
    ];

    // Generate HTML for cards
    statsContainer.innerHTML = cards
      .map(card => this.createMetricCard(card))
      .join('');

    // Create additional analysis sections
    this.displayTimeInZones(metrics.timeInZones);
    this.displayPowerCurve(powerCurve);

    // Display new zone analytics
    this.displayZoneAnalytics(metrics);
  }

  createMetricCard({ title, value, icon, change, trend }) {
    const trendColors = {
      up: 'text-green-600 dark:text-green-400',
      down: 'text-red-600 dark:text-red-400',
      neutral: 'text-gray-600 dark:text-gray-400',
    };

    return `
            <div class="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105">
                <div class="flex items-center justify-between">
                    <div class="space-y-1">
                        <p class="text-sm font-medium text-muted-foreground">${title}</p>
                        <p class="text-2xl font-bold tracking-tight">${value}</p>
                        ${
                          change
                            ? `<p class="text-xs ${trendColors[trend]} flex items-center gap-1">
                            ${trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'} ${change}
                        </p>`
                            : ''
                        }
                    </div>
                    <div class="rounded-full bg-primary/10 p-3 text-primary">
                        ${icon}
                    </div>
                </div>
                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 translate-x-[-100%] group-hover:translate-x-[100%] transform"></div>
            </div>
        `;
  }

  displayTimeInZones(timeInZones) {
    // Find a place to display time in zones - let's add it after the chart
    const chartContainer = document.querySelector('.card-modern');
    if (!chartContainer) return;

    // Check if time in zones section already exists
    let timeInZonesSection = document.getElementById('timeInZonesSection');
    if (!timeInZonesSection) {
      timeInZonesSection = document.createElement('div');
      timeInZonesSection.id = 'timeInZonesSection';
      timeInZonesSection.className = 'card-modern p-6 mt-6';
      chartContainer.parentNode.insertBefore(
        timeInZonesSection,
        chartContainer.nextSibling
      );
    }

    const zoneColors = {
      'Zone 1': '#808080',
      'Zone 2': '#0000FF',
      'Zone 3': '#008000',
      'Zone 4': '#FFFF00',
      'Zone 5': '#FFA500',
      'Zone 6': '#FF0000',
      'Zone 7': '#800080',
    };

    const zonesHtml = Object.entries(timeInZones)
      .filter(([_, zone]) => zone.time > 0)
      .map(([zoneName, zone]) => {
        const percentage = zone.percentage.toFixed(1);
        const duration = formatDuration(zone.time);
        const color = zoneColors[zoneName];

        return `
                    <div class="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div class="flex items-center space-x-3">
                            <div class="w-4 h-4 rounded-full" style="background-color: ${color}"></div>
                            <span class="font-medium">${zoneName}</span>
                            <span class="text-sm text-muted-foreground">(${zone.min}-${zone.max}% FTP)</span>
                        </div>
                        <div class="text-right">
                            <div class="font-semibold">${duration}</div>
                            <div class="text-sm text-muted-foreground">${percentage}%</div>
                        </div>
                    </div>
                `;
      })
      .join('');

    timeInZonesSection.innerHTML = `
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h3 class="text-lg font-semibold text-foreground">Time in Power Zones</h3>
                    <p class="text-sm text-muted-foreground">Distribution of time across power zones</p>
                </div>
            </div>
            <div class="space-y-3">
                ${zonesHtml}
            </div>
        `;
  }

  displayPowerCurve(powerCurve) {
    // Find a place to display power curve - let's add it after time in zones
    const timeInZonesSection = document.getElementById('timeInZonesSection');
    if (!timeInZonesSection) return;

    // Check if power curve section already exists
    let powerCurveSection = document.getElementById('powerCurveSection');
    if (!powerCurveSection) {
      powerCurveSection = document.createElement('div');
      powerCurveSection.id = 'powerCurveSection';
      powerCurveSection.className = 'card-modern p-6 mt-6';
      timeInZonesSection.parentNode.insertBefore(
        powerCurveSection,
        timeInZonesSection.nextSibling
      );
    }

    const durations = [
      { key: 5, label: '5s' },
      { key: 10, label: '10s' },
      { key: 15, label: '15s' },
      { key: 20, label: '20s' },
      { key: 30, label: '30s' },
      { key: 60, label: '1min' },
      { key: 300, label: '5min' },
      { key: 600, label: '10min' },
      { key: 1200, label: '20min' },
      { key: 3600, label: '60min' },
    ];

    const curveHtml = durations
      .filter(d => powerCurve[d.key])
      .map(d => {
        const power = powerCurve[d.key];
        return `
                    <div class="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <span class="font-medium">${d.label}</span>
                        <span class="font-semibold text-primary">${power}% FTP</span>
                    </div>
                `;
      })
      .join('');

    powerCurveSection.innerHTML = `
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h3 class="text-lg font-semibold text-foreground">Power Curve Analysis</h3>
                    <p class="text-sm text-muted-foreground">Maximum sustained power for different durations</p>
                </div>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                ${curveHtml}
            </div>
        `;
  }

  initializeRangeSelection() {
    // Add range selection controls
    this.rangeSelectionEnabled = false;
    this.selectedRange = null;

    // Add range selection toggle to chart controls
    const chartContainer = document.querySelector('.card-modern');
    if (!chartContainer) return;

    const rangeControlsHtml = `
            <div id="rangeControls" class="flex items-center space-x-2 mt-4 p-3 bg-muted/30 rounded-lg">
                <button id="enableRangeSelection" class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Select Range
                </button>
                <button id="clearRangeSelection" class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3" disabled>
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                    Clear
                </button>
                <span id="rangeSelectionStatus" class="text-sm text-muted-foreground">Click and drag on chart to select time range</span>
            </div>
        `;

    // Add controls after the chart canvas
    const chartCanvas = chartContainer.querySelector('canvas');
    if (chartCanvas && chartCanvas.parentNode) {
      chartCanvas.parentNode.insertAdjacentHTML('afterend', rangeControlsHtml);
    }

    // Setup event listeners
    this.setupRangeSelectionEvents();
  }

  setupRangeSelectionEvents() {
    const enableBtn = document.getElementById('enableRangeSelection');
    const clearBtn = document.getElementById('clearRangeSelection');
    const statusSpan = document.getElementById('rangeSelectionStatus');

    if (enableBtn) {
      enableBtn.addEventListener('click', () => {
        this.rangeSelectionEnabled = !this.rangeSelectionEnabled;
        enableBtn.textContent = this.rangeSelectionEnabled
          ? 'Disable Range'
          : 'Select Range';
        enableBtn.className = this.rangeSelectionEnabled
          ? enableBtn.className.replace(
              'bg-primary text-primary-foreground hover:bg-primary/90',
              'bg-destructive text-destructive-foreground hover:bg-destructive/90'
            )
          : enableBtn.className.replace(
              'bg-destructive text-destructive-foreground hover:bg-destructive/90',
              'bg-primary text-primary-foreground hover:bg-primary/90'
            );

        if (statusSpan) {
          statusSpan.textContent = this.rangeSelectionEnabled
            ? 'Click and drag on chart to select time range'
            : 'Range selection disabled';
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearRangeSelection();
      });
    }
  }

  clearRangeSelection() {
    this.selectedRange = null;
    const clearBtn = document.getElementById('clearRangeSelection');
    const statusSpan = document.getElementById('rangeSelectionStatus');

    if (clearBtn) clearBtn.disabled = true;
    if (statusSpan) statusSpan.textContent = 'Range selection cleared';

    // Remove range metrics display
    const rangeMetricsSection = document.getElementById('rangeMetricsSection');
    if (rangeMetricsSection) {
      rangeMetricsSection.remove();
    }

    // Update chart to remove range highlighting
    if (this.chart) {
      this.updateChartRangeSelection(null);
    }
  }

  calculateRangeMetrics(startTime, endTime, workoutData) {
    if (!workoutData.segments || startTime >= endTime) {
      return null;
    }

    // Get all segments in the selected range
    const allSegments = [];
    workoutData.segments.forEach(segment => {
      if (Array.isArray(segment)) {
        allSegments.push(...segment);
      } else {
        allSegments.push(segment);
      }
    });

    // Filter segments that overlap with the selected range
    const rangeSegments = allSegments.filter(segment => {
      const segmentStart = segment.startTime;
      const segmentEnd = segment.startTime + segment.duration;
      return segmentStart < endTime && segmentEnd > startTime;
    });

    if (rangeSegments.length === 0) {
      return null;
    }

    // Calculate metrics for the range
    let totalPower = 0;
    let totalWeightedPower = 0;
    let totalDuration = 0;
    let maxPower = 0;

    rangeSegments.forEach(segment => {
      const segmentStart = Math.max(segment.startTime, startTime);
      const segmentEnd = Math.min(
        segment.startTime + segment.duration,
        endTime
      );
      const duration = segmentEnd - segmentStart;

      if (duration > 0) {
        let power;
        if (segment.power !== undefined) {
          power = segment.power * 100;
        } else if (
          segment.powerLow !== undefined &&
          segment.powerHigh !== undefined
        ) {
          power = ((segment.powerLow + segment.powerHigh) / 2) * 100;
        } else {
          power = 60;
        }

        totalPower += power * duration;
        totalWeightedPower += Math.pow(power / 100, 4) * duration;
        totalDuration += duration;
        maxPower = Math.max(maxPower, power);
      }
    });

    if (totalDuration === 0) {
      return null;
    }

    const avgPower = totalPower / totalDuration;
    const normalizedPower =
      Math.pow(totalWeightedPower / totalDuration, 0.25) * 100;
    const intensityFactor = normalizedPower / 100;

    return {
      duration: totalDuration,
      avgPower: Math.round(avgPower),
      normalizedPower: Math.round(normalizedPower),
      intensityFactor: Math.round(intensityFactor * 100) / 100,
      maxPower: Math.round(maxPower),
      startTime,
      endTime,
    };
  }

  displayRangeMetrics(rangeMetrics) {
    if (!rangeMetrics) return;

    // Remove existing range metrics
    const existingSection = document.getElementById('rangeMetricsSection');
    if (existingSection) {
      existingSection.remove();
    }

    // Find where to insert the range metrics
    const powerCurveSection = document.getElementById('powerCurveSection');
    if (!powerCurveSection) return;

    // Create range metrics section
    const rangeMetricsSection = document.createElement('div');
    rangeMetricsSection.id = 'rangeMetricsSection';
    rangeMetricsSection.className =
      'card-modern p-6 mt-6 border-l-4 border-l-primary';
    powerCurveSection.parentNode.insertBefore(
      rangeMetricsSection,
      powerCurveSection.nextSibling
    );

    const startTimeFormatted = formatDuration(rangeMetrics.startTime);
    const endTimeFormatted = formatDuration(rangeMetrics.endTime);
    const durationFormatted = formatDuration(rangeMetrics.duration);

    rangeMetricsSection.innerHTML = `
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h3 class="text-lg font-semibold text-foreground">Selected Range Analysis</h3>
                    <p class="text-sm text-muted-foreground">${startTimeFormatted} - ${endTimeFormatted} (${durationFormatted})</p>
                </div>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="p-4 rounded-lg bg-muted/50">
                    <div class="text-sm font-medium text-muted-foreground">Average Power</div>
                    <div class="text-xl font-bold text-primary">${rangeMetrics.avgPower}% FTP</div>
                </div>
                <div class="p-4 rounded-lg bg-muted/50">
                    <div class="text-sm font-medium text-muted-foreground">Normalized Power</div>
                    <div class="text-xl font-bold text-primary">${rangeMetrics.normalizedPower}% FTP</div>
                </div>
                <div class="p-4 rounded-lg bg-muted/50">
                    <div class="text-sm font-medium text-muted-foreground">Intensity Factor</div>
                    <div class="text-xl font-bold text-primary">${rangeMetrics.intensityFactor}</div>
                </div>
                <div class="p-4 rounded-lg bg-muted/50">
                    <div class="text-sm font-medium text-muted-foreground">Max Power</div>
                    <div class="text-xl font-bold text-primary">${rangeMetrics.maxPower}% FTP</div>
                </div>
            </div>
        `;
  }

  updateChartRangeSelection(range) {
    if (!this.chart) return;

    // Remove existing range annotation
    if (this.chart.options.plugins.annotation.annotations.rangeSelection) {
      delete this.chart.options.plugins.annotation.annotations.rangeSelection;
    }

    // Add new range annotation if range is provided
    if (range) {
      this.chart.options.plugins.annotation.annotations.rangeSelection = {
        type: 'box',
        xMin: range.startTime,
        xMax: range.endTime,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderColor: 'rgba(59, 130, 246, 0.8)',
        borderWidth: 2,
        label: {
          content: 'Selected Range',
          enabled: true,
          position: 'top',
        },
      };
    }

    this.chart.update('none');
  }

  /**
   * Create zone distribution pie chart
   * @param {Object} timeInZones - Time spent in each zone
   */
  createZoneDistributionChart(timeInZones) {
    const ctx = document.getElementById('zoneDistributionChart');
    if (!ctx) return;

    // Destroy existing chart
    if (this.zoneDistributionChart) {
      this.zoneDistributionChart.destroy();
    }

    const zones = powerZoneManager.getZones();
    const labels = [];
    const data = [];
    const colors = [];
    const borderColors = [];

    // Only show zones that have time
    for (const [zoneKey, zone] of Object.entries(zones)) {
      const zoneName = `Zone ${zoneKey.slice(-1)}`;
      const zoneData = timeInZones[zoneName];

      if (zoneData && zoneData.time > 0) {
        labels.push(zone.name);
        data.push(Math.round(zoneData.time));
        colors.push(`${zone.color}80`); // 50% opacity
        borderColors.push(zone.color);
      }
    }

    this.zoneDistributionChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: colors,
            borderColor: borderColors,
            borderWidth: 2,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true,
              font: {
                size: 12,
              },
            },
          },
          tooltip: {
            callbacks: {
              label: context => {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                const timeMinutes = Math.floor(context.parsed / 60);
                const timeSeconds = context.parsed % 60;
                return `${context.label}: ${timeMinutes}:${timeSeconds.toString().padStart(2, '0')} (${percentage}%)`;
              },
            },
          },
        },
      },
    });
  }

  /**
   * Create zone distribution bar chart
   * @param {Object} timeInZones - Time spent in each zone
   */
  createZoneBarChart(timeInZones) {
    const ctx = document.getElementById('zoneBarChart');
    if (!ctx) return;

    // Destroy existing chart
    if (this.zoneBarChart) {
      this.zoneBarChart.destroy();
    }

    const zones = powerZoneManager.getZones();
    const labels = [];
    const data = [];
    const colors = [];

    // Show all zones, including those with zero time
    for (const [zoneKey, zone] of Object.entries(zones)) {
      const zoneName = `Zone ${zoneKey.slice(-1)}`;
      const zoneData = timeInZones[zoneName];

      labels.push(`Z${zoneKey.slice(-1)}`);
      data.push(zoneData ? zoneData.percentage : 0);
      colors.push(zone.color);
    }

    this.zoneBarChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Time %',
            data: data,
            backgroundColor: colors.map(color => `${color}80`),
            borderColor: colors,
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: context => {
                const zoneName = Object.values(zones)[context.dataIndex].name;
                return `${zoneName}: ${context.parsed.y.toFixed(1)}%`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: function (value) {
                return `${value}%`;
              },
            },
          },
        },
      },
    });
  }

  /**
   * Display advanced analytics metrics
   * @param {Object} metrics - Workout metrics including difficulty score
   */
  displayAdvancedMetrics(metrics) {
    const container = document.getElementById('advancedMetrics');
    if (!container) return;

    const {
      normalizedPower,
      intensityFactor,
      variabilityIndex,
      difficultyScore,
    } = metrics;

    const metricsHTML = `
            <div class="text-center p-3 bg-card rounded-lg border">
                <div class="text-2xl font-bold text-primary">${normalizedPower}W</div>
                <div class="text-sm text-muted-foreground">Normalized Power</div>
            </div>
            <div class="text-center p-3 bg-card rounded-lg border">
                <div class="text-2xl font-bold text-primary">${intensityFactor}</div>
                <div class="text-sm text-muted-foreground">Intensity Factor</div>
            </div>
            <div class="text-center p-3 bg-card rounded-lg border">
                <div class="text-2xl font-bold text-primary">${variabilityIndex}</div>
                <div class="text-sm text-muted-foreground">Variability Index</div>
            </div>
            <div class="text-center p-3 bg-card rounded-lg border">
                <div class="text-2xl font-bold text-primary">${difficultyScore.score}</div>
                <div class="text-sm text-muted-foreground">Difficulty Score</div>
                <div class="text-xs text-muted-foreground mt-1">${difficultyScore.category}</div>
            </div>
        `;

    container.innerHTML = metricsHTML;
  }

  /**
   * Display zone analytics section with charts and metrics
   * @param {Object} metrics - Workout metrics
   */
  displayZoneAnalytics(metrics) {
    const zoneAnalytics = document.getElementById('zoneAnalytics');
    if (!zoneAnalytics) return;

    // Show the zone analytics section
    zoneAnalytics.classList.remove('hidden');

    // Create the charts and display metrics
    this.createZoneDistributionChart(metrics.timeInZones);
    this.createZoneBarChart(metrics.timeInZones);
    this.displayAdvancedMetrics(metrics);
  }

  createPowerZoneAnnotations(ftp) {
    // Use PowerZoneManager for consistent zone definitions and colors
    const zones = powerZoneManager.getZones();
    const annotations = {};

    for (const [, zone] of Object.entries(zones)) {
      const minPercent = zone.min * 100;
      const maxPercent = zone.max * 100;

      annotations[zone.name] = {
        type: 'box',
        yMin: minPercent,
        yMax: maxPercent,
        backgroundColor: `${zone.color}20`, // 20% opacity
        borderColor: `${zone.color}40`, // 40% opacity
        borderWidth: 1,
        label: {
          content: zone.name,
          enabled: true,
          position: 'start',
          color: '#333',
          font: {
            size: 10,
            weight: 'bold',
          },
        },
      };
    }

    return annotations;
  }

  /**
   * Get power zone for a given power percentage
   * @param {number} powerPercent - Power as percentage of FTP
   * @returns {Object|null} Zone object or null if not found
   */
  getPowerZoneForPercent(powerPercent) {
    const zones = powerZoneManager.getZones();
    for (const [, zone] of Object.entries(zones)) {
      const minPercent = zone.min * 100;
      const maxPercent = zone.max * 100;
      if (powerPercent >= minPercent && powerPercent <= maxPercent) {
        return zone;
      }
    }
    return null;
  }

  createChart(workoutData, ftp, selectedSegmentIndex, onSegmentClick) {
    const ctx = document.getElementById('workoutChart').getContext('2d');

    if (this.chart) {
      this.chart.destroy();
    }

    // Segment type colors (currently using power zones instead)
    // const colors = {
    //     'Warmup': '#FFA726',
    //     'Cooldown': '#66BB6A',
    //     'SteadyState': '#42A5F5',
    //     'Interval (On)': '#EF5350',
    //     'Interval (Off)': '#AB47BC',
    //     'Ramp': '#FF7043',
    //     'FreeRide': '#78909C'
    // };

    const allSegments = this.visualizer.workout.getAllSegments();
    allSegments.sort((a, b) => a.startTime - b.startTime);

    // Create a single continuous dataset for the entire workout
    const continuousWorkoutData = [];

    allSegments.forEach(segment => {
      segment.powerData.forEach((point, index) => {
        const powerZone = this.getPowerZoneForPercent(point.y);
        continuousWorkoutData.push({
          x: point.x,
          y: point.y,
          segmentType: segment.type,
          segmentIndex: allSegments.indexOf(segment),
          powerZone: powerZone,
        });
      });
    });

    // Sort by time to ensure continuity
    continuousWorkoutData.sort((a, b) => a.x - b.x);

    // Create the main workout profile dataset
    const datasets = [
      {
        label: 'Workout Profile',
        data: continuousWorkoutData,
        borderColor: '#2563eb', // Primary blue color
        backgroundColor: 'rgba(37, 99, 235, 0.1)', // Light blue fill
        borderWidth: 2,
        fill: 'origin', // Fill to zero baseline
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointBackgroundColor: context => {
          // Color points based on power zone
          if (
            context.dataIndex !== undefined &&
            continuousWorkoutData[context.dataIndex]
          ) {
            const { powerZone } = continuousWorkoutData[context.dataIndex];
            return powerZone ? powerZone.color : '#999';
          }
          return '#2563eb';
        },
        segment: {
          borderColor: context => {
            // Color line segments based on power zone
            const point = context.p1DataIndex;
            if (point !== undefined && continuousWorkoutData[point]) {
              const { powerZone } = continuousWorkoutData[point];
              return powerZone ? powerZone.color : '#2563eb';
            }
            return '#2563eb';
          },
        },
      },
    ];

    if (selectedSegmentIndex !== null && allSegments[selectedSegmentIndex]) {
      const seg = allSegments[selectedSegmentIndex];
      datasets.push({
        label: 'Selected',
        data: seg.powerData,
        borderColor: '#FFD600',
        backgroundColor: '#FFD60040',
        borderWidth: 3,
        fill: true,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 6,
        order: 100,
      });
      this.showSegmentEditForm(selectedSegmentIndex, seg);
    } else {
      const editBox = document.getElementById('segmentEditBox');
      if (editBox) editBox.style.display = 'none';
    }

    const hoverPowerBox = document.getElementById('hoverPowerBox');
    if (hoverPowerBox) hoverPowerBox.style.display = 'none';

    const annotations = this.createPowerZoneAnnotations(ftp);

    this.chart = new Chart(ctx, {
      type: 'line',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index',
        },
        plugins: {
          title: {
            display: true,
            text: 'Workout Power Profile',
            font: { size: 16, weight: 'bold' },
          },
          legend: {
            display: true,
            position: 'top',
            labels: {
              generateLabels: chart => {
                // Create custom legend showing power zones
                const usedZones = [
                  ...new Set(
                    continuousWorkoutData
                      .map(point => point.powerZone)
                      .filter(zone => zone !== null)
                  ),
                ];

                return usedZones.map(zone => ({
                  text: `${zone.name} (${(zone.min * 100).toFixed(0)}-${(zone.max * 100).toFixed(0)}%)`,
                  fillStyle: zone.color,
                  strokeStyle: zone.color,
                  lineWidth: 3,
                  hidden: false,
                }));
              },
            },
          },
          tooltip: {
            enabled: true,
            callbacks: {
              title: function (context) {
                const time = context[0].parsed.x;
                return `Time: ${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}`;
              },
              label: context => {
                const percent = context.parsed.y;
                const actual = Math.round((percent / 100) * ftp);
                const { dataIndex } = context;
                const dataPoint = continuousWorkoutData[dataIndex];
                const segmentType = dataPoint?.segmentType || 'Unknown';
                const powerZone = dataPoint?.powerZone;

                const lines = [
                  `${segmentType}: ${percent.toFixed(1)}% FTP (${actual} W)`,
                ];

                if (powerZone) {
                  lines.push(`Power Zone: ${powerZone.name}`);
                  lines.push(
                    `Zone Range: ${(powerZone.min * 100).toFixed(0)}-${(powerZone.max * 100).toFixed(0)}% FTP`
                  );
                }

                return lines;
              },
            },
            external: context => {
              const { tooltip } = context;
              if (!hoverPowerBox) return;
              if (
                tooltip &&
                tooltip.opacity > 0 &&
                tooltip.dataPoints &&
                tooltip.dataPoints.length > 0
              ) {
                const dp = tooltip.dataPoints[0];
                const percent = dp.parsed.y;
                const actual = Math.round((percent / 100) * ftp);
                hoverPowerBox.innerHTML = `<span>Hovered Power: <b>${percent.toFixed(1)}% FTP</b> = <b>${actual} W</b> (FTP: ${ftp} W)</span>`;
                hoverPowerBox.style.display = 'block';
              } else {
                hoverPowerBox.style.display = 'none';
              }
            },
          },
          annotation: {
            annotations: annotations,
          },
        },
        onClick: (event, elements, chart) => {
          // Handle range selection if enabled
          if (this.rangeSelectionEnabled) {
            const canvasPosition = Chart.helpers.getRelativePosition(
              event,
              chart
            );
            const dataX = chart.scales.x.getValueForPixel(canvasPosition.x);

            if (!this.rangeSelectionStart) {
              // Start range selection
              this.rangeSelectionStart = dataX;
              document.getElementById('rangeSelectionStatus').textContent =
                'Click to finish range selection';
            } else {
              // End range selection
              const startTime = Math.min(this.rangeSelectionStart, dataX);
              const endTime = Math.max(this.rangeSelectionStart, dataX);

              this.selectedRange = { startTime, endTime };
              this.rangeSelectionStart = null;

              // Calculate and display range metrics
              const rangeMetrics = this.calculateRangeMetrics(
                startTime,
                endTime,
                workoutData
              );
              if (rangeMetrics) {
                this.displayRangeMetrics(rangeMetrics);
                this.updateChartRangeSelection(this.selectedRange);

                const clearBtn = document.getElementById('clearRangeSelection');
                if (clearBtn) clearBtn.disabled = false;

                document.getElementById('rangeSelectionStatus').textContent =
                  `Range selected: ${formatDuration(startTime)} - ${formatDuration(endTime)}`;
              }
            }
            return;
          }

          // Normal segment selection
          const points = chart.getElementsAtEventForMode(
            event,
            'nearest',
            { intersect: false },
            true
          );
          if (points && points.length > 0) {
            const point = points[0];
            const dataIndex = point.index;

            // Get segment index from the clicked data point
            if (dataIndex !== undefined && continuousWorkoutData[dataIndex]) {
              const { segmentIndex } = continuousWorkoutData[dataIndex];
              onSegmentClick(segmentIndex);
            }
          } else {
            onSegmentClick(null);
          }
        },
        scales: {
          x: {
            type: 'linear',
            position: 'bottom',
            title: {
              display: true,
              text: 'Time (seconds)',
            },
            ticks: {
              callback: function (value) {
                const minutes = Math.floor(value / 60);
                const seconds = value % 60;
                return `${minutes}:${seconds.toString().padStart(2, '0')}`;
              },
            },
          },
          y: {
            title: {
              display: true,
              text: 'Power (% FTP)',
            },
            min: 0,
            max: Math.max(
              120,
              Math.max(...continuousWorkoutData.map(p => p.y)) + 10
            ),
            grid: {
              color: 'rgba(0, 0, 0, 0.1)',
              lineWidth: 1,
            },
          },
        },
      },
    });

    document.querySelector('.chart-container').style.display = 'block';

    // Initialize range selection functionality
    this.initializeRangeSelection();
  }

  displaySegmentDetails(workoutData) {
    const segmentList = document.getElementById('segmentList');
    segmentList.innerHTML = '';

    const allSegments = this.visualizer.workout.getAllSegments();

    allSegments.forEach((segment, index) => {
      const segmentDiv = document.createElement('div');
      segmentDiv.className = 'segment segment-item';

      let powerText = '';
      if (segment.power !== undefined) {
        powerText = `${(segment.power * 100).toFixed(1)}% FTP`;
      } else if (
        segment.powerLow !== undefined &&
        segment.powerHigh !== undefined
      ) {
        powerText = `${(segment.powerLow * 100).toFixed(1)}% - ${(segment.powerHigh * 100).toFixed(1)}% FTP`;
      }

      segmentDiv.innerHTML = `
                <div class="segment-header">
                    <span class="segment-type">${segment.type}</span>
                    <span class="segment-duration">${formatDuration(segment.duration)}</span>
                </div>
                <div class="segment-power">Power: ${powerText}</div>
            `;

      segmentList.appendChild(segmentDiv);
    });

    document.getElementById('segmentDetails').style.display = 'block';
  }

  updateScaleValue(value) {
    document.querySelector('.scale-value').textContent =
      parseFloat(value).toFixed(1);
  }

  showSegmentEditForm(segmentIndex, segment) {
    const editBox = document.getElementById('segmentEditBox');
    if (!editBox) return;
    let html = '<form id="segmentEditForm">';
    html += `<div><b>Edit Segment:</b> <span>${segment.type}</span></div><br/>`;
    html += `<div><label for="segEditDuration">Duration (sec):</label><input type="number" id="segEditDuration" value="${segment.duration}" min="1" max="7200" required></div>`;
    if (
      segment.type === 'SteadyState' ||
      segment.type === 'Interval (On)' ||
      segment.type === 'Interval (Off)' ||
      segment.type === 'FreeRide'
    ) {
      html += `<div><label for="segEditPower">Power (% FTP):</label><input type="number" id="segEditPower" value="${(segment.power * 100).toFixed(0)}" min="1" max="300" required></div>`;
    } else if (
      segment.type === 'Warmup' ||
      segment.type === 'Cooldown' ||
      segment.type === 'Ramp'
    ) {
      html += `<div><label for="segEditPowerLow">Power Low (% FTP):</label><input type="number" id="segEditPowerLow" value="${(segment.powerLow * 100).toFixed(0)}" min="1" max="300" required></div>`;
      html += `<div><label for="segEditPowerHigh">Power High (% FTP):</label><input type="number" id="segEditPowerHigh" value="${(segment.powerHigh * 100).toFixed(0)}" min="1" max="300" required></div>`;
    }
    html +=
      '<div id="segEditError" style="color:#c62828;font-weight:600;margin:8px 0 0 0;display:none;"></div>';
    html += `<div class="edit-btns">
            <button type="submit" class="apply-btn">Apply</button>
            <button type="button" class="cancel-btn" id="segEditCancel">Cancel</button>
        </div>`;
    html += '</form>';
    editBox.innerHTML = html;
    editBox.style.display = 'block';

    const form = document.getElementById('segmentEditForm');
    const cancelBtn = document.getElementById('segEditCancel');
    const errorDiv = document.getElementById('segEditError');

    let lastFocusedInput = null;
    const inputs = [
      'segEditDuration',
      'segEditPower',
      'segEditPowerLow',
      'segEditPowerHigh',
    ];
    inputs.forEach(inputId => {
      const input = document.getElementById(inputId);
      if (input) {
        input.addEventListener('focus', () => {
          lastFocusedInput = inputId;
        });
      }
    });

    form.onsubmit = e => {
      e.preventDefault();
      errorDiv.style.display = 'none';
      const newDuration = parseInt(
        document.getElementById('segEditDuration').value
      );
      if (isNaN(newDuration) || newDuration < 1 || newDuration > 7200) {
        errorDiv.textContent = 'Duration must be between 1 and 7200 seconds.';
        errorDiv.style.display = 'block';
        return;
      }

      let newPower, newPowerLow, newPowerHigh;

      if (
        segment.type === 'SteadyState' ||
        segment.type === 'Interval (On)' ||
        segment.type === 'Interval (Off)' ||
        segment.type === 'FreeRide'
      ) {
        newPower = parseInt(document.getElementById('segEditPower').value);
        if (isNaN(newPower) || newPower < 1 || newPower > 300) {
          errorDiv.textContent = 'Power must be between 1 and 300% FTP.';
          errorDiv.style.display = 'block';
          return;
        }
      } else if (
        segment.type === 'Warmup' ||
        segment.type === 'Cooldown' ||
        segment.type === 'Ramp'
      ) {
        newPowerLow = parseInt(
          document.getElementById('segEditPowerLow').value
        );
        newPowerHigh = parseInt(
          document.getElementById('segEditPowerHigh').value
        );
        if (
          isNaN(newPowerLow) ||
          isNaN(newPowerHigh) ||
          newPowerLow < 1 ||
          newPowerLow > 300 ||
          newPowerHigh < 1 ||
          newPowerHigh > 300
        ) {
          errorDiv.textContent = 'Power values must be between 1 and 300% FTP.';
          errorDiv.style.display = 'block';
          return;
        }
        if (newPowerLow > newPowerHigh) {
          errorDiv.textContent =
            'Power Low must be less than or equal to Power High.';
          errorDiv.style.display = 'block';
          return;
        }
      }
      this.visualizer.applySegmentEdit(
        segmentIndex,
        newDuration,
        newPower,
        newPowerLow,
        newPowerHigh
      );

      setTimeout(() => {
        if (lastFocusedInput) {
          const input = document.getElementById(lastFocusedInput);
          if (input) {
            input.focus();
            input.select();
          }
        }
      }, 100);
    };
    cancelBtn.onclick = e => {
      this.visualizer.setSelectedSegmentIndex(null);
      editBox.style.display = 'none';
      this.visualizer.createChart();
    };
  }

  async renderDirectoryTree() {
    const tree = document.getElementById('directoryTree');
    if (!tree) return; // Ensure the element exists
    tree.innerHTML = '';
    const items = await fetchDirectory();
    items.forEach(item => {
      tree.appendChild(this.createDirectoryItem(item));
    });
  }

  createDirectoryItem(item, parentPath = '') {
    const div = document.createElement('div');
    div.className = `directory-item${item.is_dir ? ' folder' : ' file'}`;
    div.textContent = item.name;
    div.dataset.path = item.path;
    if (item.is_dir) {
      div.addEventListener('click', async e => {
        e.stopPropagation();
        if (div.classList.contains('expanded')) {
          div.classList.remove('expanded');
          const children = div.querySelectorAll(':scope > .directory-children');
          children.forEach(child => child.remove());
        } else {
          div.classList.add('expanded');
          if (!div.querySelector('.directory-children')) {
            const childrenDiv = document.createElement('div');
            childrenDiv.className = 'directory-children';
            const children = await fetchDirectory(item.path);
            children.forEach(child => {
              childrenDiv.appendChild(
                this.createDirectoryItem(child, item.path)
              );
            });
            div.appendChild(childrenDiv);
          }
        }
      });
    } else if (item.name.toLowerCase().endsWith('.zwo')) {
      div.addEventListener('click', async e => {
        e.stopPropagation();
        document
          .querySelectorAll('.directory-item.selected')
          .forEach(el => el.classList.remove('selected'));
        div.classList.add('selected');
        try {
          const content = await fetchWorkoutFile(item.path);
          this.visualizer.parseAndVisualize(content);
        } catch (error) {
          console.error('Error loading workout from directory:', error);
          this.showToast('Error loading workout.');
        }
      });
    }
    return div;
  }

  setupPanelToggles() {
    const dirPanel = document.getElementById('directoryPanel');
    const dirToggle = document.getElementById('toggleDirectoryPanel');
    if (dirToggle) {
      dirToggle.addEventListener('click', e => {
        e.stopPropagation();
        dirPanel.classList.toggle('minimized');
        dirToggle.textContent = dirPanel.classList.contains('minimized')
          ? '>'
          : '<';
        dirToggle.title = dirPanel.classList.contains('minimized')
          ? 'Restore'
          : 'Minimize';
      });
    }

    const chatPanel = document.getElementById('chatPanel');
    const chatToggle = document.getElementById('toggleChatPanel');
    const container = document.querySelector('.container');

    if (chatToggle && chatPanel && container) {
      // Initialize container state based on chat panel visibility
      if (chatPanel.classList.contains('minimized')) {
        container.style.paddingRight = '3rem';
        container.classList.add('chat-closed');
      } else {
        container.style.paddingRight = '22rem';
        container.classList.add('chat-open');
      }

      chatToggle.addEventListener('click', e => {
        e.stopPropagation();
        chatPanel.classList.toggle('minimized');
        chatToggle.textContent = chatPanel.classList.contains('minimized')
          ? '<'
          : '>';
        chatToggle.title = chatPanel.classList.contains('minimized')
          ? 'Restore'
          : 'Minimize';

        // Adjust main content padding
        if (chatPanel.classList.contains('minimized')) {
          container.style.paddingRight = '3rem';
          container.classList.remove('chat-open');
          container.classList.add('chat-closed');
        } else {
          container.style.paddingRight = '22rem';
          container.classList.remove('chat-closed');
          container.classList.add('chat-open');
        }
      });
    }
  }

  setupSegmentToggle() {
    const segmentDetails = document.getElementById('segmentDetails');
    const toggleSegments = document.getElementById('toggleSegments');
    if (toggleSegments && segmentDetails) {
      toggleSegments.addEventListener('click', e => {
        e.stopPropagation();
        segmentDetails.classList.toggle('collapsed');
        toggleSegments.textContent = segmentDetails.classList.contains(
          'collapsed'
        )
          ? '+'
          : '−';
        toggleSegments.title = segmentDetails.classList.contains('collapsed')
          ? 'Expand'
          : 'Collapse';
      });
    }
  }

  setupChatInterface() {
    const chatForm = document.getElementById('chatForm');
    const llmToggle = document.getElementById('llmModeToggle');

    // Handle LLM mode toggle persistence
    if (llmToggle) {
      // Load saved preference
      llmToggle.checked = localStorage.getItem('useLLM') === 'true';

      // Save preference on change
      llmToggle.addEventListener('change', () => {
        localStorage.setItem('useLLM', llmToggle.checked);
      });
    }

    if (chatForm) {
      chatForm.addEventListener('submit', async e => {
        e.preventDefault();
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        if (!message) return;

        this.appendChatMessage(message, 'user');
        input.value = '';

        // Show thinking message
        this.appendChatMessage('🤔 Creating your workout...', 'llm thinking');

        // Check if LLM mode is enabled
        const llmToggle = document.getElementById('llmModeToggle');
        const useLLM = llmToggle && llmToggle.checked;

        if (useLLM) {
          // Use LLM generation
          this.generateWorkoutWithLLM(message);
        } else {
          // Generate workout locally
          setTimeout(() => {
            try {
              const workoutData =
                this.workoutGenerator.generateWorkout(message);
              this.removeLastChatMessage(); // Remove thinking message

              // Debug: Log workout structure
              console.log('Generated workout data:', workoutData);

              // Generate XML for debugging
              const xmlContent = generateZWOContent(workoutData);
              console.log('Generated XML:', xmlContent);

              // Create workout from generated data
              this.visualizer.createWorkoutFromData(workoutData);

              // Show success message with debug option
              const duration = Math.round(workoutData.totalDuration / 60);
              const successMsg = `✅ Created "${workoutData.name}" - ${duration} minutes, TSS: ${workoutData.tss}`;
              this.appendChatMessage(successMsg, 'llm');

              // Add debug button
              this.addDebugXMLButton(xmlContent, workoutData);
            } catch (error) {
              this.removeLastChatMessage();
              console.error('Error generating workout:', error);

              // Provide detailed error information
              let errorMessage = '❌ Workout creation failed: ';
              if (error.message.includes('complexIntervals')) {
                errorMessage +=
                  "Complex interval parsing error. Check your interval format (e.g., \"2 x 14' (4') as first 2' @ 105% then 12' at 100%\").";
              } else if (error.message.includes('duration')) {
                errorMessage +=
                  'Duration parsing error. Use formats like "45 minutes", "1 hour", or "90 min".';
              } else if (error.message.includes('power')) {
                errorMessage +=
                  'Power calculation error. Check percentage values are realistic (50-300%).';
              } else if (error.name === 'TypeError') {
                errorMessage += `Missing required data: ${error.message}. Try a simpler workout description.`;
              } else {
                errorMessage += `${error.message}. Try: "Create a 45-minute endurance ride" or "4x5 minute threshold intervals".`;
              }

              this.appendChatMessage(errorMessage, 'llm');

              // Add debug information
              this.appendChatMessage(
                '🔍 Debug: Check browser console (F12) for detailed error information.',
                'llm debug'
              );
            }
          }, 500); // Small delay to show thinking state
        }
      });
    }
  }

  async generateWorkoutWithLLM(message) {
    try {
      // Load instructions and create enhanced prompt
      const response = await fetch('WORKOUT_CREATION_INSTRUCTIONS.md');
      const instructions = await response.text();

      const enhancedPrompt = `${instructions}
            
Please create a workout based on this request: "${message}"

IMPORTANT: Return ONLY a valid JSON object that follows the exact structure shown in the instructions. Do not include any other text, explanations, or markdown formatting. The response should start with { and end with }.

The JSON should have this exact structure:
{
    "name": "workout name",
    "description": "description", 
    "author": "Workout Creator",
    "sportType": "bike",
    "totalDuration": duration_in_seconds,
    "segments": [array of segment objects],
    "tss": calculated_tss_value
}`;

      const llmResponse = await sendChatMessage(enhancedPrompt);
      this.removeLastChatMessage(); // Remove thinking message

      // Try to parse the LLM response as JSON
      let workoutData;
      try {
        // Extract JSON from response (in case LLM adds extra text)
        const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : llmResponse;
        workoutData = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('LLM returned invalid JSON:', llmResponse);
        throw new Error('LLM returned invalid JSON format');
      }

      // Debug: Log workout structure
      console.log('LLM Generated workout data:', workoutData);

      // Generate XML for debugging
      const xmlContent = generateZWOContent(workoutData);
      console.log('LLM Generated XML:', xmlContent);

      // Create workout from generated data
      this.visualizer.createWorkoutFromData(workoutData);

      // Show success message with debug option
      const duration = Math.round(workoutData.totalDuration / 60);
      const successMsg = `✅ Created "${workoutData.name}" (LLM) - ${duration} minutes, TSS: ${workoutData.tss}`;
      this.appendChatMessage(successMsg, 'llm');

      // Add debug button
      this.addDebugXMLButton(xmlContent, workoutData);
    } catch (error) {
      this.removeLastChatMessage();
      console.error('Error with LLM generation:', error);

      // Check if we have a detailed server-side error message
      let errorMessage = '❌ **LLM Generation Failed**\n\n';

      if (error.serverResponse && error.serverResponse.reply) {
        // Use the detailed diagnostic message from the server
        errorMessage = error.serverResponse.reply;
      } else if (error.message) {
        // Categorize client-side errors with enhanced diagnostics
        if (
          error.message.includes('fetch') ||
          error.message.includes('Failed to fetch')
        ) {
          errorMessage +=
            "**Connection Error**\n\nCannot connect to the LLM server.\n\n**Troubleshooting Steps:**\n1. Check if server is running: `python3 server.py`\n2. Verify server is accessible at http://localhost:53218\n3. Check for firewall or network issues\n4. Try using Local mode instead\n\n**Alternative:** Disable 'Use LLM' toggle for local generation";
        } else if (error.message.includes('timeout')) {
          errorMessage +=
            '**Timeout Error**\n\nThe LLM request took too long to complete.\n\n**Troubleshooting Steps:**\n1. Try a simpler workout description\n2. Check your internet connection\n3. Wait a moment and try again\n4. Use Local mode for faster generation\n\n**Technical Details:** Request timeout after waiting for server response';
        } else if (
          error.message.includes('JSON') ||
          error.message.includes('parse')
        ) {
          errorMessage += `**Response Format Error**\n\nThe LLM returned an invalid response format.\n\n**Troubleshooting Steps:**\n1. Try a different workout description\n2. Check the debug output for malformed data\n3. Restart the server to reset the LLM state\n4. Use Local mode as an alternative\n\n**Technical Details:** ${
            error.message
          }`;
        } else {
          errorMessage += `**Unexpected Error**\n\nAn unexpected error occurred during LLM communication.\n\n**Troubleshooting Steps:**\n1. Check the browser console (F12) for technical details\n2. Verify the server is running and configured correctly\n3. Try refreshing the page and submitting again\n4. Use Local mode as a fallback\n\n**Technical Details:** ${
            error.message
          }`;
        }
      } else {
        errorMessage +=
          '**Unknown Error**\n\nAn unknown error occurred.\n\n**Troubleshooting Steps:**\n1. Check browser console (F12) for details\n2. Verify server is running\n3. Try Local mode instead\n\n**Need Help?** Check server logs for more information';
      }

      this.appendChatMessage(errorMessage, 'llm error');

      // Fallback to local generation
      setTimeout(() => {
        try {
          const workoutData = this.workoutGenerator.generateWorkout(message);
          this.visualizer.createWorkoutFromData(workoutData);
          const duration = Math.round(workoutData.totalDuration / 60);
          const successMsg = `✅ Created "${workoutData.name}" (Local) - ${duration} minutes, TSS: ${workoutData.tss}`;
          this.appendChatMessage(successMsg, 'llm');
          const xmlContent = generateZWOContent(workoutData);
          this.addDebugXMLButton(xmlContent, workoutData);
        } catch (fallbackError) {
          console.error('Fallback generation also failed:', fallbackError);
          this.appendChatMessage(
            '❌ Both LLM and local generation failed. Please try a simpler request.',
            'llm'
          );
        }
      }, 500);
    }
  }

  appendChatMessage(text, sender) {
    const chatMessages = document.getElementById('chatMessages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${sender}`;
    msgDiv.textContent = text;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  removeLastChatMessage() {
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages.lastChild) {
      chatMessages.removeChild(chatMessages.lastChild);
    }
  }

  addDebugXMLButton(xmlContent, workoutData) {
    const chatMessages = document.getElementById('chatMessages');
    const debugDiv = document.createElement('div');
    debugDiv.className = 'chat-message llm debug';
    debugDiv.innerHTML = `
            <button id="showXmlBtn" class="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 mr-2">
                🔍 Show XML Debug
            </button>
            <button id="showStructureBtn" class="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600">
                📋 Show Workout Structure
            </button>
        `;
    chatMessages.appendChild(debugDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Add event listeners
    document.getElementById('showXmlBtn').addEventListener('click', () => {
      this.showXMLModal(xmlContent);
    });

    document
      .getElementById('showStructureBtn')
      .addEventListener('click', () => {
        this.showStructureModal(workoutData);
      });
  }

  showXMLModal(xmlContent) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className =
      'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    overlay.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-4xl max-h-96 overflow-auto m-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Generated XML Debug</h3>
                    <button id="closeXmlModal" class="text-gray-500 hover:text-gray-700 text-xl">&times;</button>
                </div>
                <div class="bg-gray-100 p-4 rounded text-xs font-mono overflow-auto max-h-64">
                    <pre>${this.escapeHtml(xmlContent)}</pre>
                </div>
                <div class="mt-4 text-right">
                    <button id="copyXmlBtn" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2">
                        Copy XML
                    </button>
                    <button id="downloadXmlBtn" class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
                        Download XML
                    </button>
                </div>
            </div>
        `;

    document.body.appendChild(overlay);

    // Add event listeners
    document.getElementById('closeXmlModal').addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    document.getElementById('copyXmlBtn').addEventListener('click', () => {
      navigator.clipboard.writeText(xmlContent);
      this.showToast('XML copied to clipboard');
    });

    document.getElementById('downloadXmlBtn').addEventListener('click', () => {
      downloadFile(xmlContent, 'debug_workout.zwo', 'application/xml');
      this.showToast('XML downloaded');
    });

    // Close on outside click
    overlay.addEventListener('click', e => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });
  }

  showStructureModal(workoutData) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className =
      'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    overlay.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-4xl max-h-96 overflow-auto m-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Workout Structure Debug</h3>
                    <button id="closeStructureModal" class="text-gray-500 hover:text-gray-700 text-xl">&times;</button>
                </div>
                <div class="bg-gray-100 p-4 rounded text-xs font-mono overflow-auto max-h-64">
                    <pre>${this.escapeHtml(JSON.stringify(workoutData, null, 2))}</pre>
                </div>
                <div class="mt-4 text-right">
                    <button id="copyStructureBtn" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                        Copy Structure
                    </button>
                </div>
            </div>
        `;

    document.body.appendChild(overlay);

    // Add event listeners
    document
      .getElementById('closeStructureModal')
      .addEventListener('click', () => {
        document.body.removeChild(overlay);
      });

    document
      .getElementById('copyStructureBtn')
      .addEventListener('click', () => {
        navigator.clipboard.writeText(JSON.stringify(workoutData, null, 2));
        this.showToast('Structure copied to clipboard');
      });

    // Close on outside click
    overlay.addEventListener('click', e => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });
  }

  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, m => {
      return map[m];
    });
  }

  async showSaveAsDialog() {
    if (!this.visualizer.workout) {
      this.showToast('Please load a workout first');
      return;
    }

    try {
      // Get the default Zwift directory
      const zwiftDirectory = await getZwiftWorkoutDirectory();

      // Create and show the save dialog
      const dialog = this.createSaveAsDialog(zwiftDirectory);
      document.body.appendChild(dialog);
    } catch (error) {
      console.error('Error showing save dialog:', error);
      this.showToast('Error opening save dialog');
    }
  }

  createSaveAsDialog(defaultDirectory) {
    const dialog = document.createElement('div');
    dialog.id = 'saveAsDialog';
    dialog.className =
      'fixed inset-0 bg-black/50 flex items-center justify-center z-50';

    const workoutName =
      this.visualizer.workout.workoutData.name || 'Custom Workout';
    const sanitizedName = workoutName
      .replace(/[^a-z0-9\s-]/gi, '')
      .replace(/\s+/g, '_');

    dialog.innerHTML = `
            <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
                <div class="flex items-center mb-4">
                    <svg class="w-6 h-6 text-emerald-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12"></path>
                    </svg>
                    <h3 class="text-xl font-semibold text-gray-800">Save Workout As</h3>
                </div>
                
                <div class="space-y-4">
                    <div>
                        <label for="saveAsFilename" class="block text-sm font-medium text-gray-700 mb-2">
                            Filename:
                        </label>
                        <input 
                            type="text" 
                            id="saveAsFilename" 
                            value="${sanitizedName}"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder="Enter filename (without .zwo)"
                        />
                        <p class="text-xs text-gray-500 mt-1">.zwo extension will be added automatically</p>
                    </div>
                    
                    <div>
                        <label for="saveAsDirectory" class="block text-sm font-medium text-gray-700 mb-2">
                            Save Location:
                        </label>
                        <div class="flex gap-2">
                            <input 
                                type="text" 
                                id="saveAsDirectory" 
                                value="${defaultDirectory || ''}"
                                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                placeholder="Choose directory path"
                            />
                            <button 
                                type="button"
                                id="browseFolder" 
                                class="px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-gray-700 font-medium transition-all duration-200 flex items-center"
                            >
                                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z"></path>
                                </svg>
                                Browse...
                            </button>
                        </div>
                        <p class="text-xs text-gray-500 mt-1">Click "Browse..." to select a folder or use the default Zwift workout directory</p>
                    </div>
                    
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div class="flex items-center">
                            <svg class="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <span class="text-xs text-blue-800">File will be saved as: <strong id="previewFilename">${sanitizedName}.zwo</strong></span>
                        </div>
                    </div>
                </div>
                
                <div class="flex gap-3 mt-6">
                    <button 
                        id="saveAsCancel" 
                        class="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium rounded-lg transition-all duration-200"
                    >
                        Cancel
                    </button>
                    <button 
                        id="saveAsConfirm" 
                        class="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-all duration-200"
                    >
                        Save Workout
                    </button>
                </div>
            </div>
        `;

    // Add event listeners
    const filenameInput = dialog.querySelector('#saveAsFilename');
    const previewFilename = dialog.querySelector('#previewFilename');

    filenameInput.addEventListener('input', e => {
      const sanitized = e.target.value
        .replace(/[^a-z0-9\s-]/gi, '')
        .replace(/\s+/g, '_');
      previewFilename.textContent = `${sanitized}.zwo`;
    });

    dialog.querySelector('#saveAsCancel').addEventListener('click', () => {
      document.body.removeChild(dialog);
    });

    dialog.querySelector('#saveAsConfirm').addEventListener('click', () => {
      this.handleSaveAsConfirm(dialog);
    });

    dialog.querySelector('#browseFolder').addEventListener('click', () => {
      this.handleBrowseFolder(dialog);
    });

    // Close on background click
    dialog.addEventListener('click', e => {
      if (e.target === dialog) {
        document.body.removeChild(dialog);
      }
    });

    return dialog;
  }

  async handleBrowseFolder(dialog) {
    try {
      const browseBtn = dialog.querySelector('#browseFolder');
      const directoryInput = dialog.querySelector('#saveAsDirectory');

      // Show loading state
      const originalText = browseBtn.innerHTML;
      browseBtn.innerHTML = `
                <svg class="w-4 h-4 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Loading...
            `;
      browseBtn.disabled = true;

      // Request folder selection from backend
      const selectedFolder = await selectFolder();

      // Restore button state
      browseBtn.innerHTML = originalText;
      browseBtn.disabled = false;

      if (selectedFolder) {
        directoryInput.value = selectedFolder;
        this.showToast('Folder selected successfully');
      }
    } catch (error) {
      console.error('Error browsing folders:', error);
      this.showToast('Error opening folder dialog');

      // Restore button state
      const browseBtn = dialog.querySelector('#browseFolder');
      if (browseBtn) {
        browseBtn.innerHTML = `
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z"></path>
                    </svg>
                    Browse...
                `;
        browseBtn.disabled = false;
      }
    }
  }

  async handleSaveAsConfirm(dialog) {
    const filename = dialog.querySelector('#saveAsFilename').value.trim();
    const directory = dialog.querySelector('#saveAsDirectory').value.trim();

    if (!filename) {
      this.showToast('Please enter a filename');
      return;
    }

    // Sanitize filename
    const sanitizedFilename = filename
      .replace(/[^a-z0-9\s-]/gi, '')
      .replace(/\s+/g, '_');
    const fullFilename = sanitizedFilename.endsWith('.zwo')
      ? sanitizedFilename
      : `${sanitizedFilename}.zwo`;

    try {
      // Show loading state
      const confirmBtn = dialog.querySelector('#saveAsConfirm');
      confirmBtn.textContent = 'Saving...';
      confirmBtn.disabled = true;

      // Generate ZWO content
      const zwoContent = generateZWOContent(
        this.visualizer.workout.workoutData
      );

      // Save the file
      const savedPath = await saveAsWorkout(
        fullFilename,
        zwoContent,
        directory
      );

      // Close dialog and show success message
      document.body.removeChild(dialog);
      this.showToast(`Workout saved successfully to: ${savedPath}`);
    } catch (error) {
      console.error('Error saving workout:', error);
      this.showToast(`Error saving workout: ${error.message}`);

      // Restore button state
      const confirmBtn = dialog.querySelector('#saveAsConfirm');
      if (confirmBtn) {
        confirmBtn.textContent = 'Save Workout';
        confirmBtn.disabled = false;
      }
    }
  }
}
