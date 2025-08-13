/**
 * Workout Chart Component
 * Reusable chart component with reactive data binding
 */

import { BaseComponent } from './base-component.js';
import { moduleLoader } from '../module-loader.js';

export class WorkoutChart extends BaseComponent {
  getDefaultOptions() {
    return {
      ...super.getDefaultOptions(),
      responsive: true,
      maintainAspectRatio: false,
      showPowerZones: true,
      enableInteraction: true,
      theme: 'light',
      exportable: true,
    };
  }

  initialize() {
    super.initialize();

    this.chartInstance = null;
    this.chartData = null;
    this.isLoading = false;

    // Create canvas if it doesn't exist
    if (!this.element.querySelector('canvas')) {
      const canvas = document.createElement('canvas');
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', 'Workout power profile visualization');
      canvas.setAttribute('tabindex', '0');
      this.element.appendChild(canvas);
    }

    this.canvas = this.element.querySelector('canvas');
  }

  setupEventListeners() {
    super.setupEventListeners();

    // Keyboard navigation
    this.canvas.addEventListener('keydown', this.handleKeydown.bind(this));

    // Resize handling
    window.addEventListener('resize', this.handleResize.bind(this));

    // Click handling for segment selection
    this.canvas.addEventListener('click', this.handleChartClick.bind(this));
  }

  setupStateBindings() {
    // Subscribe to workout data changes
    this.subscribe(
      'workout',
      workout => {
        if (workout) {
          this.updateChart(workout);
        } else {
          this.clearChart();
        }
      },
      { immediate: true }
    );

    // Subscribe to selected segment changes
    this.subscribe('selectedSegmentIndex', index => {
      this.highlightSegment(index);
    });

    // Subscribe to theme changes
    this.subscribe(
      'themeMode',
      theme => {
        this.updateTheme(theme);
      },
      { immediate: true }
    );

    // Subscribe to FTP changes
    this.subscribe('ftp', () => {
      const workout = stateManager.getState('workout');
      if (workout) {
        this.updateChart(workout);
      }
    });
  }

  async render() {
    // Load chart engine if not already loaded
    if (!this.chartInstance && !this.isLoading) {
      await this.initializeChart();
    }
  }

  async initializeChart() {
    try {
      this.isLoading = true;

      // Load chart engine
      const chartEngine = await moduleLoader.loadModule('chart-engine', {
        required: true,
        priority: 'high',
      });

      if (!chartEngine) {
        throw new Error('Failed to load chart engine');
      }

      // Initialize chart with default options
      const chartOptions = this.getChartOptions();

      this.chartInstance = new chartEngine.Chart(this.canvas.getContext('2d'), {
        type: 'line',
        data: this.getEmptyChartData(),
        options: chartOptions,
      });

      // Store chart instance in state for other components
      stateManager.dispatch('SET_CHART_INSTANCE', this.chartInstance);

      this.emit('chart:initialized');
    } catch (error) {
      console.error('Failed to initialize chart:', error);
      this.showError('Failed to load chart. Please refresh the page.');
    } finally {
      this.isLoading = false;
    }
  }

  getChartOptions() {
    const theme = stateManager.getState('themeMode') || 'light';
    const isDark = theme === 'dark';

    return {
      responsive: this.options.responsive,
      maintainAspectRatio: this.options.maintainAspectRatio,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        title: {
          display: true,
          text: 'Workout Power Profile',
          color: isDark ? '#ffffff' : '#374151',
        },
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: isDark ? '#ffffff' : '#374151',
          },
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            title: context => `Time: ${context[0].label}`,
            label: context => {
              const label = context.dataset.label || '';
              const value = context.parsed.y;

              if (label.includes('Power')) {
                return `${label}: ${Math.round(value)}%`;
              } else if (label.includes('Cadence')) {
                return `${label}: ${Math.round(value)} RPM`;
              }

              return `${label}: ${value}`;
            },
          },
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Time',
            color: isDark ? '#ffffff' : '#374151',
          },
          ticks: {
            color: isDark ? '#ffffff' : '#374151',
          },
          grid: {
            color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          },
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Power (%FTP)',
            color: isDark ? '#ffffff' : '#374151',
          },
          ticks: {
            color: isDark ? '#ffffff' : '#374151',
          },
          grid: {
            color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          },
          min: 0,
          max: 150,
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Cadence (RPM)',
            color: isDark ? '#ffffff' : '#374151',
          },
          ticks: {
            color: isDark ? '#ffffff' : '#374151',
          },
          grid: {
            drawOnChartArea: false,
          },
          min: 60,
          max: 120,
        },
      },
      animation: {
        duration: 750,
        easing: 'easeInOutQuart',
      },
      onClick: this.handleChartClick.bind(this),
    };
  }

  getEmptyChartData() {
    return {
      labels: [],
      datasets: [
        {
          label: 'Power (%FTP)',
          data: [],
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0,
          pointRadius: 0,
          pointHoverRadius: 6,
        },
        {
          label: 'Cadence (RPM)',
          data: [],
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 1,
          fill: false,
          tension: 0,
          pointRadius: 0,
          pointHoverRadius: 4,
          yAxisID: 'y1',
        },
      ],
    };
  }

  async updateChart(workoutData) {
    if (!this.chartInstance) {
      await this.initializeChart();
    }

    if (!this.chartInstance || !workoutData) return;

    try {
      // Load chart utilities for data preparation
      const chartUtils = await moduleLoader.loadModule('chart-engine');

      // Prepare chart data
      const chartData = this.prepareChartData(workoutData);

      // Update chart
      this.chartInstance.data = chartData;
      this.chartInstance.update('active');

      // Add power zones if enabled
      if (this.options.showPowerZones) {
        await this.addPowerZones();
      }

      this.emit('chart:updated', { workoutData });
    } catch (error) {
      console.error('Error updating chart:', error);
      this.showError('Failed to update chart');
    }
  }

  prepareChartData(workoutData) {
    const segments = workoutData.segments || [];
    const labels = [];
    const powerData = [];
    const cadenceData = [];
    let cumulativeTime = 0;

    segments.forEach(segment => {
      const duration = segment.duration || 60;
      const power = segment.power || 0;
      const cadence = segment.cadence || 90;

      // Add start point
      labels.push(this.formatTime(cumulativeTime));
      powerData.push(power);
      cadenceData.push(cadence);

      cumulativeTime += duration;

      // Add end point
      labels.push(this.formatTime(cumulativeTime));
      powerData.push(power);
      cadenceData.push(cadence);
    });

    return {
      labels,
      datasets: [
        {
          label: 'Power (%FTP)',
          data: powerData,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0,
          pointRadius: 0,
          pointHoverRadius: 6,
        },
        {
          label: 'Cadence (RPM)',
          data: cadenceData,
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 1,
          fill: false,
          tension: 0,
          pointRadius: 0,
          pointHoverRadius: 4,
          yAxisID: 'y1',
        },
      ],
    };
  }

  async addPowerZones() {
    try {
      const chartAnnotations =
        await moduleLoader.loadModule('chart-annotations');
      if (chartAnnotations && chartAnnotations.addPowerZones) {
        chartAnnotations.addPowerZones(this.canvas.id || 'workoutChart');
      }
    } catch (error) {
      console.warn('Power zones not available:', error);
    }
  }

  highlightSegment(segmentIndex) {
    if (!this.chartInstance) return;

    // Remove existing highlight
    if (this.chartInstance.options.plugins.annotation?.annotations?.highlight) {
      delete this.chartInstance.options.plugins.annotation.annotations
        .highlight;
    }

    if (segmentIndex !== null && segmentIndex >= 0) {
      const data = this.chartInstance.data.datasets[0].data;
      const labels = this.chartInstance.data.labels;

      const startIndex = segmentIndex * 2;
      const endIndex = startIndex + 1;

      if (startIndex < data.length && endIndex < data.length) {
        if (!this.chartInstance.options.plugins.annotation) {
          this.chartInstance.options.plugins.annotation = { annotations: {} };
        }

        this.chartInstance.options.plugins.annotation.annotations.highlight = {
          type: 'box',
          xMin: labels[startIndex],
          xMax: labels[endIndex],
          backgroundColor: 'rgba(255, 255, 0, 0.2)',
          borderColor: 'rgba(255, 255, 0, 0.8)',
          borderWidth: 2,
        };
      }
    }

    this.chartInstance.update('none');
    this.emit('segment:highlighted', { segmentIndex });
  }

  updateTheme(theme) {
    if (!this.chartInstance) return;

    const isDark = theme === 'dark';
    const textColor = isDark ? '#ffffff' : '#374151';
    const gridColor = isDark
      ? 'rgba(255, 255, 255, 0.1)'
      : 'rgba(0, 0, 0, 0.1)';

    // Update chart colors
    const options = this.chartInstance.options;

    options.plugins.title.color = textColor;
    options.plugins.legend.labels.color = textColor;

    options.scales.x.title.color = textColor;
    options.scales.x.ticks.color = textColor;
    options.scales.x.grid.color = gridColor;

    options.scales.y.title.color = textColor;
    options.scales.y.ticks.color = textColor;
    options.scales.y.grid.color = gridColor;

    options.scales.y1.title.color = textColor;
    options.scales.y1.ticks.color = textColor;

    this.chartInstance.update();
    this.emit('theme:updated', { theme });
  }

  clearChart() {
    if (!this.chartInstance) return;

    this.chartInstance.data = this.getEmptyChartData();
    this.chartInstance.update();
    this.emit('chart:cleared');
  }

  handleChartClick(event) {
    if (!this.options.enableInteraction || !this.chartInstance) return;

    const points = this.chartInstance.getElementsAtEventForMode(
      event,
      'nearest',
      { intersect: true },
      true
    );

    if (points.length > 0) {
      const point = points[0];
      const segmentIndex = Math.floor(point.index / 2);
      stateManager.dispatch('SELECT_SEGMENT', segmentIndex);
    }
  }

  handleKeydown(event) {
    if (!this.options.enableInteraction) return;

    const currentIndex = stateManager.getState('selectedSegmentIndex') || 0;
    const workout = stateManager.getState('workout');

    if (!workout?.segments) return;

    const maxIndex = workout.segments.length - 1;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        if (currentIndex > 0) {
          stateManager.dispatch('SELECT_SEGMENT', currentIndex - 1);
        }
        break;

      case 'ArrowRight':
        event.preventDefault();
        if (currentIndex < maxIndex) {
          stateManager.dispatch('SELECT_SEGMENT', currentIndex + 1);
        }
        break;

      case 'Home':
        event.preventDefault();
        stateManager.dispatch('SELECT_SEGMENT', 0);
        break;

      case 'End':
        event.preventDefault();
        stateManager.dispatch('SELECT_SEGMENT', maxIndex);
        break;
    }
  }

  handleResize() {
    if (this.chartInstance) {
      this.chartInstance.resize();
    }
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  showError(message) {
    this.element.innerHTML = `
            <div class="chart-error text-center py-8">
                <div class="text-red-500 text-lg mb-2">⚠️</div>
                <div class="text-gray-600">${message}</div>
            </div>
        `;
  }

  async exportChart(filename = 'workout-chart.png') {
    if (!this.chartInstance) return;

    try {
      const url = this.chartInstance.toBase64Image();
      const link = document.createElement('a');
      link.download = filename;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.emit('chart:exported', { filename });
    } catch (error) {
      console.error('Export failed:', error);
      this.showError('Failed to export chart');
    }
  }

  destroy() {
    // Remove event listeners
    window.removeEventListener('resize', this.handleResize.bind(this));

    // Destroy chart instance
    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }

    super.destroy();
  }
}

export default WorkoutChart;
