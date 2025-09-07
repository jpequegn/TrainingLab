/**
 * Performance Trends Component
 * Displays training load trends, ATL/CTL/TSB charts, and performance analytics
 * Part of issue #111 - Training History & Analytics Page
 */

import { createLogger } from '../../utils/logger.js';
import { activityService } from '../../services/activity-service.js';
// TrainingLoadCalculator import removed - not currently used

const logger = createLogger('PerformanceTrends');

export class PerformanceTrends {
  constructor(container, options = {}) {
    this.container = container;
    this.activities = options.activities || [];
    this.dateRange = options.dateRange || 90; // days
    this.chartInstances = new Map();

    this.render();
  }

  /**
   * Set activities data and update trends
   */
  setActivities(activities) {
    this.activities = activities || [];
    this.updateTrends();
  }

  /**
   * Set date range and refresh data
   */
  setDateRange(days) {
    this.dateRange = days;
    this.updateTrends();
  }

  /**
   * Render the performance trends component
   */
  render() {
    if (!this.container) return;

    this.container.innerHTML = this.generateHTML();
    this.attachEventListeners();
    this.updateTrends();
  }

  /**
   * Generate component HTML
   */
  generateHTML() {
    return `
      <div class="performance-trends">
        ${this.generateHeaderHTML()}
        ${this.generateMetricCardsHTML()}
        ${this.generateChartsHTML()}
      </div>
    `;
  }

  /**
   * Generate header with date range selector
   */
  generateHeaderHTML() {
    return `
      <div class="trends-header">
        <div>
          <h3 class="text-lg font-semibold">Performance Trends</h3>
          <p class="text-sm text-muted-foreground">Training load analysis and fitness tracking</p>
        </div>
        <div class="date-range-selector">
          <label class="text-sm font-medium">Date Range:</label>
          <select id="dateRangeSelect" class="filter-select">
            <option value="30" ${this.dateRange === 30 ? 'selected' : ''}>Last 30 Days</option>
            <option value="60" ${this.dateRange === 60 ? 'selected' : ''}>Last 60 Days</option>
            <option value="90" ${this.dateRange === 90 ? 'selected' : ''}>Last 90 Days</option>
            <option value="180" ${this.dateRange === 180 ? 'selected' : ''}>Last 6 Months</option>
            <option value="365" ${this.dateRange === 365 ? 'selected' : ''}>Last Year</option>
          </select>
        </div>
      </div>
    `;
  }

  /**
   * Generate metric cards HTML
   */
  generateMetricCardsHTML() {
    return `
      <div class="trends-metrics">
        <div class="metric-card" id="atlMetric">
          <div class="metric-icon">
            <i class="fas fa-bolt"></i>
          </div>
          <div class="metric-content">
            <div class="metric-value">-</div>
            <div class="metric-label">ATL (Fatigue)</div>
            <div class="metric-description">7-day acute training load</div>
          </div>
        </div>
        
        <div class="metric-card" id="ctlMetric">
          <div class="metric-icon">
            <i class="fas fa-chart-line"></i>
          </div>
          <div class="metric-content">
            <div class="metric-value">-</div>
            <div class="metric-label">CTL (Fitness)</div>
            <div class="metric-description">42-day chronic training load</div>
          </div>
        </div>
        
        <div class="metric-card" id="tsbMetric">
          <div class="metric-icon">
            <i class="fas fa-balance-scale"></i>
          </div>
          <div class="metric-content">
            <div class="metric-value">-</div>
            <div class="metric-label">TSB (Form)</div>
            <div class="metric-description">Training stress balance</div>
          </div>
        </div>
        
        <div class="metric-card" id="weeklyTssMetric">
          <div class="metric-icon">
            <i class="fas fa-calendar-week"></i>
          </div>
          <div class="metric-content">
            <div class="metric-value">-</div>
            <div class="metric-label">Weekly TSS</div>
            <div class="metric-description">7-day training stress</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate charts HTML
   */
  generateChartsHTML() {
    return `
      <div class="trends-charts">
        <div class="chart-container">
          <div class="chart-header">
            <h4 class="chart-title">Training Load Progression</h4>
            <div class="chart-legend">
              <span class="legend-item">
                <span class="legend-color" style="background-color: #3b82f6;"></span>
                ATL (Fatigue)
              </span>
              <span class="legend-item">
                <span class="legend-color" style="background-color: #10b981;"></span>
                CTL (Fitness)
              </span>
              <span class="legend-item">
                <span class="legend-color" style="background-color: #f59e0b;"></span>
                TSB (Form)
              </span>
            </div>
          </div>
          <canvas id="trainingLoadChart" width="800" height="400"></canvas>
        </div>
        
        <div class="chart-container">
          <div class="chart-header">
            <h4 class="chart-title">Weekly TSS Distribution</h4>
          </div>
          <canvas id="weeklyTssChart" width="800" height="300"></canvas>
        </div>
        
        <div class="chart-container">
          <div class="chart-header">
            <h4 class="chart-title">Power Progression</h4>
          </div>
          <canvas id="powerProgressionChart" width="800" height="300"></canvas>
        </div>
      </div>
    `;
  }

  /**
   * Update trends data and refresh charts
   */
  async updateTrends() {
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - this.dateRange);

      // Get training load series
      const trainingLoadSeries = await activityService.getTrainingLoadSeries(
        startDate.toISOString(),
        endDate.toISOString()
      );

      // Filter activities for the date range
      const rangeActivities = this.activities.filter(activity => {
        const activityDate = new Date(activity.date);
        return activityDate >= startDate && activityDate <= endDate;
      });

      // Update metric cards
      this.updateMetricCards(trainingLoadSeries, rangeActivities);

      // Update charts
      this.updateCharts(trainingLoadSeries, rangeActivities);
    } catch (error) {
      logger.error('Failed to update performance trends:', error);
      this.showError('Failed to load performance data');
    }
  }

  /**
   * Update metric cards with latest data
   */
  updateMetricCards(trainingLoadSeries, activities) {
    const latestData = trainingLoadSeries[trainingLoadSeries.length - 1];

    if (!latestData) {
      return;
    }

    // Calculate weekly TSS
    const weeklyTSS = trainingLoadSeries
      .slice(-7)
      .reduce((sum, tl) => sum + tl.dailyTSS, 0);

    // Update ATL metric
    const atlMetric = this.container.querySelector('#atlMetric .metric-value');
    if (atlMetric) {
      atlMetric.textContent = Math.round(latestData.atl * 10) / 10;

      // Add trend indicator
      const atlTrend = this.calculateTrend(trainingLoadSeries, 'atl');
      this.updateMetricTrend(atlMetric.parentElement, atlTrend);
    }

    // Update CTL metric
    const ctlMetric = this.container.querySelector('#ctlMetric .metric-value');
    if (ctlMetric) {
      ctlMetric.textContent = Math.round(latestData.ctl * 10) / 10;

      const ctlTrend = this.calculateTrend(trainingLoadSeries, 'ctl');
      this.updateMetricTrend(ctlMetric.parentElement, ctlTrend);
    }

    // Update TSB metric with form analysis
    const tsbMetric = this.container.querySelector('#tsbMetric .metric-value');
    if (tsbMetric) {
      const tsb = Math.round(latestData.tsb * 10) / 10;
      tsbMetric.textContent = tsb;

      // Color code TSB based on form
      const form = latestData.calculateForm();
      const formAnalysis = latestData.getFormAnalysis();

      tsbMetric.style.color = this.getFormColor(form);

      // Update description with form
      const tsbDescription = this.container.querySelector(
        '#tsbMetric .metric-description'
      );
      if (tsbDescription) {
        tsbDescription.textContent = formAnalysis.description;
      }
    }

    // Update Weekly TSS
    const weeklyTssMetric = this.container.querySelector(
      '#weeklyTssMetric .metric-value'
    );
    if (weeklyTssMetric) {
      weeklyTssMetric.textContent = Math.round(weeklyTSS);

      const weeklyTrend = this.calculateWeeklyTSSTrend(trainingLoadSeries);
      this.updateMetricTrend(weeklyTssMetric.parentElement, weeklyTrend);
    }
  }

  /**
   * Calculate trend for a metric
   */
  calculateTrend(data, metric) {
    if (data.length < 14) return 0;

    const recent = data.slice(-7);
    const previous = data.slice(-14, -7);

    const recentAvg =
      recent.reduce((sum, item) => sum + item[metric], 0) / recent.length;
    const previousAvg =
      previous.reduce((sum, item) => sum + item[metric], 0) / previous.length;

    return ((recentAvg - previousAvg) / previousAvg) * 100;
  }

  /**
   * Calculate weekly TSS trend
   */
  calculateWeeklyTSSTrend(data) {
    if (data.length < 14) return 0;

    const thisWeek = data
      .slice(-7)
      .reduce((sum, item) => sum + item.dailyTSS, 0);
    const lastWeek = data
      .slice(-14, -7)
      .reduce((sum, item) => sum + item.dailyTSS, 0);

    if (lastWeek === 0) return 0;
    return ((thisWeek - lastWeek) / lastWeek) * 100;
  }

  /**
   * Update metric trend indicator
   */
  updateMetricTrend(metricElement, trend) {
    // Remove existing trend indicators
    const existingTrend = metricElement.querySelector('.metric-trend');
    if (existingTrend) {
      existingTrend.remove();
    }

    // Add trend indicator
    if (Math.abs(trend) > 1) {
      // Only show significant trends
      const trendElement = document.createElement('div');
      trendElement.className = 'metric-trend';

      const isPositive = trend > 0;
      const icon = isPositive ? 'fas fa-arrow-up' : 'fas fa-arrow-down';
      const color = isPositive ? 'text-green-500' : 'text-red-500';

      trendElement.innerHTML = `
        <i class="${icon} ${color}"></i>
        <span class="text-xs ${color}">${Math.abs(trend).toFixed(1)}%</span>
      `;

      metricElement.appendChild(trendElement);
    }
  }

  /**
   * Get color for training form
   */
  getFormColor(form) {
    const colors = {
      rested: '#10b981', // green
      fresh: '#84cc16', // lime
      neutral: '#3b82f6', // blue
      tired: '#f59e0b', // amber
      very_tired: '#ef4444', // red
    };

    return colors[form] || colors.neutral;
  }

  /**
   * Update charts
   */
  updateCharts(trainingLoadSeries, activities) {
    this.updateTrainingLoadChart(trainingLoadSeries);
    this.updateWeeklyTSSChart(trainingLoadSeries);
    this.updatePowerProgressionChart(activities);
  }

  /**
   * Update training load chart (ATL/CTL/TSB)
   */
  updateTrainingLoadChart(data) {
    const canvas = this.container.querySelector('#trainingLoadChart');
    if (!canvas || !window.Chart) return;

    // Destroy existing chart
    if (this.chartInstances.has('trainingLoad')) {
      this.chartInstances.get('trainingLoad').destroy();
    }

    const ctx = canvas.getContext('2d');

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(item => new Date(item.date).toLocaleDateString()),
        datasets: [
          {
            label: 'ATL (Fatigue)',
            data: data.map(item => item.atl),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: false,
            tension: 0.3,
          },
          {
            label: 'CTL (Fitness)',
            data: data.map(item => item.ctl),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: false,
            tension: 0.3,
          },
          {
            label: 'TSB (Form)',
            data: data.map(item => item.tsb),
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            fill: false,
            tension: 0.3,
            yAxisID: 'tsb',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index',
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Date',
            },
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'ATL / CTL',
            },
            position: 'left',
          },
          tsb: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'TSB',
            },
            grid: {
              drawOnChartArea: false,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              title: function (context) {
                return context[0].label;
              },
              afterBody: function (context) {
                const { dataIndex } = context[0];
                const item = data[dataIndex];
                return [
                  `Daily TSS: ${item.dailyTSS}`,
                  `Form: ${item.form || 'neutral'}`,
                ];
              },
            },
          },
        },
      },
    });

    this.chartInstances.set('trainingLoad', chart);
  }

  /**
   * Update weekly TSS chart
   */
  updateWeeklyTSSChart(data) {
    const canvas = this.container.querySelector('#weeklyTssChart');
    if (!canvas || !window.Chart) return;

    // Destroy existing chart
    if (this.chartInstances.has('weeklyTSS')) {
      this.chartInstances.get('weeklyTSS').destroy();
    }

    // Calculate weekly TSS data
    const weeklyData = [];
    for (let i = 6; i < data.length; i += 7) {
      const week = data.slice(Math.max(0, i - 6), i + 1);
      const weeklyTSS = week.reduce((sum, item) => sum + item.dailyTSS, 0);
      const weekLabel = new Date(
        week[week.length - 1].date
      ).toLocaleDateString();

      weeklyData.push({
        label: weekLabel,
        value: weeklyTSS,
      });
    }

    const ctx = canvas.getContext('2d');

    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: weeklyData.map(item => item.label),
        datasets: [
          {
            label: 'Weekly TSS',
            data: weeklyData.map(item => item.value),
            backgroundColor: 'rgba(59, 130, 246, 0.6)',
            borderColor: '#3b82f6',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Week',
            },
          },
          y: {
            title: {
              display: true,
              text: 'TSS',
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
        },
      },
    });

    this.chartInstances.set('weeklyTSS', chart);
  }

  /**
   * Update power progression chart
   */
  updatePowerProgressionChart(activities) {
    const canvas = this.container.querySelector('#powerProgressionChart');
    if (!canvas || !window.Chart) return;

    // Destroy existing chart
    if (this.chartInstances.has('powerProgression')) {
      this.chartInstances.get('powerProgression').destroy();
    }

    // Filter activities with power data
    const powerActivities = activities
      .filter(activity => activity.avgPower > 0)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (powerActivities.length === 0) {
      // Show empty chart message
      const ctx = canvas.getContext('2d');
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#666';
      ctx.fillText(
        'No power data available',
        canvas.width / 2,
        canvas.height / 2
      );
      return;
    }

    const ctx = canvas.getContext('2d');

    const chart = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Average Power',
            data: powerActivities.map(activity => ({
              x: new Date(activity.date),
              y: activity.avgPower,
            })),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.6)',
            showLine: true,
            tension: 0.3,
          },
          {
            label: 'Normalized Power',
            data: powerActivities
              .filter(activity => activity.normalizedPower > 0)
              .map(activity => ({
                x: new Date(activity.date),
                y: activity.normalizedPower,
              })),
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.6)',
            showLine: true,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'time',
            time: {
              displayFormats: {
                day: 'MMM DD',
                week: 'MMM DD',
                month: 'MMM',
              },
            },
            title: {
              display: true,
              text: 'Date',
            },
          },
          y: {
            title: {
              display: true,
              text: 'Power (W)',
            },
          },
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
          },
        },
      },
    });

    this.chartInstances.set('powerProgression', chart);
  }

  /**
   * Show error message
   */
  showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.innerHTML = `
      <i class="fas fa-exclamation-circle"></i>
      <span>${message}</span>
    `;

    // Replace content with error
    this.container.innerHTML = '';
    this.container.appendChild(errorElement);
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const dateRangeSelect = this.container.querySelector('#dateRangeSelect');
    if (dateRangeSelect) {
      dateRangeSelect.addEventListener('change', e => {
        this.setDateRange(parseInt(e.target.value));
      });
    }
  }

  /**
   * Destroy component and cleanup charts
   */
  destroy() {
    // Destroy all charts
    this.chartInstances.forEach(chart => {
      chart.destroy();
    });
    this.chartInstances.clear();

    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

export default PerformanceTrends;
