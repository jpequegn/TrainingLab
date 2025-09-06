/**
 * History Page for TrainingLab
 * View training history, activities, and progress tracking
 */

import { BasePage } from './BasePage.js';
import { createLogger } from '../utils/logger.js';
import { activityService } from '../services/activity-service.js';
import { profileService } from '../services/profile-service.js';
import { ActivityCalendar } from '../components/history/ActivityCalendar.js';
import { PerformanceTrends } from '../components/history/PerformanceTrends.js';

const logger = createLogger('HistoryPage');

export class HistoryPage extends BasePage {
  constructor(container) {
    super(container, {
      title: 'Training History',
      loadingText: 'Loading history...',
    });

    // History-specific state
    this.activities = [];
    this.filteredActivities = [];
    this.currentView = 'timeline'; // timeline, calendar, stats
    this.currentFilter = 'all';
    this.dateRange = 'month';
    this.selectedActivity = null;
    
    // Component instances
    this.activityCalendar = null;
    this.performanceTrends = null;
  }

  async loadData() {
    try {
      // Initialize activity service
      await activityService.initialize();
      
      // Load real training history data
      this.activities = await activityService.getActivities({
        limit: 100,
        sortBy: 'date',
        sortOrder: 'desc'
      });
      
      // Convert to plain objects for compatibility
      this.activities = this.activities.map(activity => ({
        id: activity.id,
        name: activity.name,
        type: activity.type,
        date: activity.date,
        duration: activity.duration,
        distance: activity.distance,
        avgPower: activity.avgPower,
        maxPower: activity.maxPower,
        normalizedPower: activity.normalizedPower,
        tss: activity.tss,
        intensityFactor: activity.intensityFactor,
        avgCadence: activity.cadence?.avg,
        avgSpeed: activity.speed?.avg,
        avgHeartRate: activity.heartRate?.avg,
        elevation: activity.elevation,
        calories: activity.calories,
        notes: activity.notes,
        completed: true, // All saved activities are considered completed
        source: activity.source
      }));
      
      this.filteredActivities = [...this.activities];

      logger.info(`History loaded with ${this.activities.length} activities`);
    } catch (error) {
      logger.error('Failed to load history data:', error);
      // Fall back to mock data if service fails
      this.activities = await this.loadMockActivities();
      this.filteredActivities = [...this.activities];
    }
  }

  async loadMockActivities() {
    // Mock activity data - fallback when service is unavailable
    const now = new Date();
    const activities = [];

    // Generate sample activities over the past 90 days
    for (let i = 0; i < 25; i++) {
      const daysAgo = Math.floor(Math.random() * 90);
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);

      const types = ['cycling', 'running', 'swimming', 'strength'];
      const type = types[Math.floor(Math.random() * types.length)];

      let activity = {
        id: `activity_${i + 1}`,
        name: this.generateActivityName(type),
        type: type,
        date: date.toISOString(),
        duration: 1800 + Math.random() * 5400, // 30-120 minutes
        completed: Math.random() > 0.1, // 90% completion rate
        notes: Math.random() > 0.7 ? this.generateNotes() : '',
      };

      // Add type-specific metrics
      switch (type) {
        case 'cycling':
          activity = {
            ...activity,
            distance: 15 + Math.random() * 50, // km
            avgPower: 180 + Math.random() * 100, // watts
            normalizedPower: activity.avgPower * (1 + Math.random() * 0.1),
            tss: 40 + Math.random() * 80,
            avgCadence: 85 + Math.random() * 15,
            avgSpeed: 25 + Math.random() * 15,
          };
          break;
        case 'running':
          activity = {
            ...activity,
            distance: 3 + Math.random() * 12, // km
            avgPace: 240 + Math.random() * 120, // seconds per km
            avgHeartRate: 140 + Math.random() * 40,
            elevation: Math.random() * 300,
            calories: 200 + Math.random() * 500,
          };
          break;
        case 'swimming':
          activity = {
            ...activity,
            distance: 1 + Math.random() * 3, // km
            strokes: 1200 + Math.random() * 800,
            avgPace: 90 + Math.random() * 30, // seconds per 100m
            laps: Math.floor(activity.distance * 20), // 50m laps
          };
          break;
        case 'strength':
          activity = {
            ...activity,
            exercises: 5 + Math.floor(Math.random() * 8),
            sets: 15 + Math.floor(Math.random() * 20),
            volume: 2000 + Math.random() * 5000, // kg lifted
            calories: 150 + Math.random() * 300,
          };
          break;
      }

      activities.push(activity);
    }

    return activities.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  generateActivityName(type) {
    const names = {
      cycling: [
        'Morning Ride',
        'Interval Training',
        'Recovery Spin',
        'Long Base Ride',
        'Hill Repeats',
        'Time Trial',
        'Group Ride',
      ],
      running: [
        'Easy Run',
        'Tempo Run',
        'Interval Session',
        'Long Run',
        'Recovery Jog',
        'Fartlek',
        'Track Workout',
      ],
      swimming: [
        'Pool Session',
        'Open Water',
        'Technique Work',
        'Endurance Set',
        'Sprint Intervals',
        'Recovery Swim',
      ],
      strength: [
        'Upper Body',
        'Lower Body',
        'Full Body',
        'Core Session',
        'Functional Training',
        'Power Training',
      ],
    };

    const typeNames = names[type] || ['Workout'];
    return typeNames[Math.floor(Math.random() * typeNames.length)];
  }

  generateNotes() {
    const notes = [
      'Felt strong throughout the session',
      'Legs felt heavy today',
      'Great weather conditions',
      'New personal best!',
      'Struggled with the intervals',
      'Perfect pacing strategy',
      'Need to work on cadence',
      'Excellent recovery session',
    ];

    return notes[Math.floor(Math.random() * notes.length)];
  }

  async render() {
    const content = `
      <div class="history-content">
        ${this.createHistoryHeader()}
        ${this.createViewToggle()}
        ${this.createFilterBar()}
        ${this.createMainContent()}
      </div>
    `;

    this.container.innerHTML = this.generatePageHTML(content, {
      pageClass: 'history-page',
      pageId: 'history',
    });
  }

  createHistoryHeader() {
    const totalActivities = this.activities.length;
    const completedActivities = this.activities.filter(a => a.completed).length;
    const completionRate =
      totalActivities > 0
        ? Math.round((completedActivities / totalActivities) * 100)
        : 0;

    return this.createPageHeader(
      'Training History',
      `${completedActivities} of ${totalActivities} activities completed (${completionRate}%)`,
      `
        <div class="header-actions">
          <button class="btn btn-outline" id="exportHistoryBtn">
            <i class="fas fa-download"></i>
            Export
          </button>
          <button class="btn btn-primary" id="addActivityBtn">
            <i class="fas fa-plus"></i>
            Add Activity
          </button>
        </div>
      `
    );
  }

  createViewToggle() {
    const views = [
      { id: 'timeline', label: 'Timeline', icon: 'fas fa-list' },
      { id: 'calendar', label: 'Calendar', icon: 'fas fa-calendar' },
      { id: 'stats', label: 'Statistics', icon: 'fas fa-chart-bar' },
    ];

    const viewsHTML = views
      .map(
        view => `
      <button class="view-toggle-btn ${view.id === this.currentView ? 'active' : ''}" 
              data-view="${view.id}">
        <i class="${view.icon}"></i>
        <span>${view.label}</span>
      </button>
    `
      )
      .join('');

    return `
      <div class="view-toggle">
        ${viewsHTML}
      </div>
    `;
  }

  createFilterBar() {
    return `
      <div class="filter-bar">
        <div class="date-range-section">
          <select id="dateRangeSelect" class="filter-select">
            <option value="week" ${this.dateRange === 'week' ? 'selected' : ''}>This Week</option>
            <option value="month" ${this.dateRange === 'month' ? 'selected' : ''}>This Month</option>
            <option value="quarter" ${this.dateRange === 'quarter' ? 'selected' : ''}>This Quarter</option>
            <option value="year" ${this.dateRange === 'year' ? 'selected' : ''}>This Year</option>
            <option value="all" ${this.dateRange === 'all' ? 'selected' : ''}>All Time</option>
          </select>
        </div>
        
        <div class="activity-filter-section">
          <select id="activityFilterSelect" class="filter-select">
            <option value="all">All Activities</option>
            <option value="cycling">Cycling</option>
            <option value="running">Running</option>
            <option value="swimming">Swimming</option>
            <option value="strength">Strength</option>
          </select>
          
          <select id="statusFilterSelect" class="filter-select">
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="incomplete">Incomplete</option>
          </select>
        </div>
      </div>
    `;
  }

  createMainContent() {
    switch (this.currentView) {
      case 'calendar':
        return this.createCalendarView();
      case 'stats':
        return this.createStatsView();
      case 'timeline':
      default:
        return this.createTimelineView();
    }
  }

  createTimelineView() {
    if (this.filteredActivities.length === 0) {
      return this.createEmptyState();
    }

    const activitiesHTML = this.filteredActivities
      .map(activity => this.createActivityCard(activity))
      .join('');

    return `
      <div class="timeline-view">
        <div class="activities-list">
          ${activitiesHTML}
        </div>
      </div>
    `;
  }

  createActivityCard(activity) {
    const date = new Date(activity.date);
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const duration = this.formatDuration(activity.duration);
    const typeIcon = this.getActivityTypeIcon(activity.type);
    const metrics = this.getActivityMetrics(activity);

    return `
      <div class="activity-card ${activity.completed ? 'completed' : 'incomplete'}" 
           data-activity-id="${activity.id}">
        <div class="activity-status">
          <div class="status-indicator ${activity.completed ? 'completed' : 'incomplete'}">
            <i class="fas ${activity.completed ? 'fa-check' : 'fa-clock'}"></i>
          </div>
        </div>
        
        <div class="activity-icon">
          <i class="${typeIcon}"></i>
        </div>
        
        <div class="activity-content">
          <div class="activity-header">
            <h3 class="activity-name">${activity.name}</h3>
            <div class="activity-type-badge">${activity.type}</div>
          </div>
          
          <div class="activity-datetime">
            <span class="activity-date">${formattedDate}</span>
            <span class="activity-time">${formattedTime}</span>
          </div>
          
          <div class="activity-metrics">
            <div class="metric">
              <i class="fas fa-clock"></i>
              <span>${duration}</span>
            </div>
            ${metrics}
          </div>
          
          ${
            activity.notes
              ? `
            <div class="activity-notes">
              <i class="fas fa-sticky-note"></i>
              <span>${activity.notes}</span>
            </div>
          `
              : ''
          }
        </div>
        
        <div class="activity-actions">
          <button class="btn btn-outline btn-sm" data-action="view">
            <i class="fas fa-eye"></i>
            View
          </button>
          <button class="btn btn-outline btn-sm" data-action="analyze">
            <i class="fas fa-chart-line"></i>
            Analyze
          </button>
        </div>
      </div>
    `;
  }

  createCalendarView() {
    return `
      <div class="calendar-view">
        <div id="activityCalendarContainer"></div>
      </div>
    `;
  }

  createStatsView() {
    const stats = this.calculateStats();

    return `
      <div class="stats-view">
        <div class="stats-summary">
          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-calendar-check"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">${stats.totalActivities}</div>
              <div class="stat-label">Total Activities</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-clock"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">${this.formatDuration(stats.totalTime)}</div>
              <div class="stat-label">Total Time</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-route"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">${stats.totalDistance.toFixed(1)} km</div>
              <div class="stat-label">Total Distance</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-fire"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">${Math.round(stats.totalTSS || 0)}</div>
              <div class="stat-label">Total TSS</div>
            </div>
          </div>
        </div>
        
        <div class="stats-breakdown">
          <div class="breakdown-section">
            <h3>Activity Types</h3>
            <div class="activity-type-stats">
              ${this.createActivityTypeStats(stats.byType)}
            </div>
          </div>
          
          <div class="breakdown-section" id="performanceTrendsContainer">
            <!-- Performance trends will be rendered here -->
          </div>
        </div>
      </div>
    `;
  }

  createActivityTypeStats(typeStats) {
    return Object.entries(typeStats)
      .map(
        ([type, stats]) => `
      <div class="type-stat-item">
        <div class="type-icon">
          <i class="${this.getActivityTypeIcon(type)}"></i>
        </div>
        <div class="type-info">
          <div class="type-name">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
          <div class="type-count">${stats.count} activities</div>
          <div class="type-time">${this.formatDuration(stats.totalTime)}</div>
        </div>
      </div>
    `
      )
      .join('');
  }

  createEmptyState() {
    return `
      <div class="empty-state">
        <div class="empty-icon">
          <i class="fas fa-history"></i>
        </div>
        <h3 class="empty-title">No activities found</h3>
        <p class="empty-description">Start tracking your training activities to see your progress here.</p>
        <button class="btn btn-primary" id="addFirstActivityBtn">
          <i class="fas fa-plus"></i>
          Add Your First Activity
        </button>
      </div>
    `;
  }

  async onInit() {
    this.setupViewToggle();
    this.setupFilters();
    this.setupActivityCards();
    this.setupActions();

    logger.info('History page initialized successfully');
  }

  setupViewToggle() {
    const viewButtons = this.container.querySelectorAll('.view-toggle-btn');

    viewButtons.forEach(button => {
      this.addEventListener(button, 'click', () => {
        const viewId = button.dataset.view;
        this.switchView(viewId);
      });
    });
  }

  switchView(viewId) {
    this.currentView = viewId;

    // Update button states
    const viewButtons = this.container.querySelectorAll('.view-toggle-btn');
    viewButtons.forEach(button => {
      button.classList.toggle('active', button.dataset.view === viewId);
    });

    // Update main content
    this.updateMainContent();
    
    // Update component instances when view changes
    if (this.currentView === 'calendar' && this.activityCalendar) {
      this.activityCalendar.setActivities(this.filteredActivities);
    } else if (this.currentView === 'stats' && this.performanceTrends) {
      this.performanceTrends.setActivities(this.filteredActivities);
    }
  }

  setupFilters() {
    const dateRangeSelect = this.container.querySelector('#dateRangeSelect');
    const activityFilterSelect = this.container.querySelector(
      '#activityFilterSelect'
    );
    const statusFilterSelect = this.container.querySelector(
      '#statusFilterSelect'
    );

    if (dateRangeSelect) {
      this.addEventListener(dateRangeSelect, 'change', event => {
        this.dateRange = event.target.value;
        this.applyFilters();
      });
    }

    if (activityFilterSelect) {
      this.addEventListener(activityFilterSelect, 'change', event => {
        this.currentFilter = event.target.value;
        this.applyFilters();
      });
    }

    if (statusFilterSelect) {
      this.addEventListener(statusFilterSelect, 'change', event => {
        this.statusFilter = event.target.value;
        this.applyFilters();
      });
    }
  }

  setupActivityCards() {
    const activitiesList = this.container.querySelector('.activities-list');
    if (activitiesList) {
      this.addEventListener(activitiesList, 'click', event => {
        const activityCard = event.target.closest('.activity-card');
        if (!activityCard) return;

        const { activityId } = activityCard.dataset;
        const action = event.target.closest('[data-action]')?.dataset.action;

        if (action) {
          this.handleActivityAction(activityId, action);
        }
      });
    }
  }

  setupActions() {
    const exportBtn = this.container.querySelector('#exportHistoryBtn');
    const addActivityBtn = this.container.querySelector('#addActivityBtn');

    if (exportBtn) {
      this.addEventListener(exportBtn, 'click', () => this.exportHistory());
    }

    if (addActivityBtn) {
      this.addEventListener(addActivityBtn, 'click', () => this.addActivity());
    }
  }

  applyFilters() {
    let filtered = [...this.activities];

    // Apply type filter
    if (this.currentFilter !== 'all') {
      filtered = filtered.filter(
        activity => activity.type === this.currentFilter
      );
    }

    // Apply status filter
    if (this.statusFilter && this.statusFilter !== 'all') {
      const isCompleted = this.statusFilter === 'completed';
      filtered = filtered.filter(
        activity => activity.completed === isCompleted
      );
    }

    // Apply date range filter
    if (this.dateRange !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();

      switch (this.dateRange) {
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          cutoffDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      filtered = filtered.filter(
        activity => new Date(activity.date) >= cutoffDate
      );
    }

    this.filteredActivities = filtered;
    this.updateMainContent();
    
    // Update component instances with new filtered data
    if (this.currentView === 'calendar' && this.activityCalendar) {
      this.activityCalendar.setActivities(this.filteredActivities);
    } else if (this.currentView === 'stats' && this.performanceTrends) {
      this.performanceTrends.setActivities(this.filteredActivities);
    }
  }

  updateMainContent() {
    const mainContentArea = this.container.querySelector(
      '.timeline-view, .calendar-view, .stats-view'
    );
    if (mainContentArea) {
      mainContentArea.outerHTML = this.createMainContent();
      this.setupActivityCards(); // Re-setup event listeners
      this.initializeViewComponents(); // Initialize view-specific components
    }
  }

  handleActivityAction(activityId, action) {
    const activity = this.activities.find(a => a.id === activityId);
    if (!activity) return;

    switch (action) {
      case 'view':
        this.viewActivity(activity);
        break;
      case 'analyze':
        this.analyzeActivity(activity);
        break;
    }
  }

  viewActivity(activity) {
    logger.info(`Viewing activity: ${activity.name}`);
    this.showSuccess(`Viewing "${activity.name}" - detailed view coming soon!`);
  }

  analyzeActivity(activity) {
    logger.info(`Analyzing activity: ${activity.name}`);
    if (window.router) {
      window.router.navigate(`/visualizer?activity=${activity.id}`);
    }
  }

  getActivityTypeIcon(type) {
    const icons = {
      cycling: 'fas fa-bicycle',
      running: 'fas fa-running',
      swimming: 'fas fa-swimmer',
      strength: 'fas fa-dumbbell',
    };

    return icons[type] || 'fas fa-dumbbell';
  }

  getActivityMetrics(activity) {
    switch (activity.type) {
      case 'cycling':
        return `
          <div class="metric">
            <i class="fas fa-route"></i>
            <span>${activity.distance?.toFixed(1)} km</span>
          </div>
          <div class="metric">
            <i class="fas fa-bolt"></i>
            <span>${Math.round(activity.avgPower || 0)}W</span>
          </div>
        `;
      case 'running':
        return `
          <div class="metric">
            <i class="fas fa-route"></i>
            <span>${activity.distance?.toFixed(1)} km</span>
          </div>
          <div class="metric">
            <i class="fas fa-tachometer-alt"></i>
            <span>${this.formatPace(activity.avgPace)}</span>
          </div>
        `;
      case 'swimming':
        return `
          <div class="metric">
            <i class="fas fa-route"></i>
            <span>${activity.distance?.toFixed(1)} km</span>
          </div>
          <div class="metric">
            <i class="fas fa-hand-paper"></i>
            <span>${activity.strokes || 0} strokes</span>
          </div>
        `;
      case 'strength':
        return `
          <div class="metric">
            <i class="fas fa-weight-hanging"></i>
            <span>${activity.exercises || 0} exercises</span>
          </div>
          <div class="metric">
            <i class="fas fa-fire"></i>
            <span>${Math.round(activity.calories || 0)} cal</span>
          </div>
        `;
      default:
        return '';
    }
  }

  calculateStats() {
    const completed = this.filteredActivities.filter(a => a.completed);

    const totalTime = completed.reduce(
      (sum, activity) => sum + activity.duration,
      0
    );
    const totalDistance = completed.reduce(
      (sum, activity) => sum + (activity.distance || 0),
      0
    );
    const totalTSS = completed.reduce(
      (sum, activity) => sum + (activity.tss || 0),
      0
    );
    const completionRate =
      this.filteredActivities.length > 0
        ? Math.round((completed.length / this.filteredActivities.length) * 100)
        : 0;

    const byType = {};
    completed.forEach(activity => {
      if (!byType[activity.type]) {
        byType[activity.type] = { count: 0, totalTime: 0, totalTSS: 0 };
      }
      byType[activity.type].count++;
      byType[activity.type].totalTime += activity.duration;
      byType[activity.type].totalTSS += activity.tss || 0;
    });

    return {
      totalActivities: completed.length,
      totalTime,
      totalDistance,
      totalTSS,
      completionRate,
      byType,
    };
  }

  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  formatPace(secondsPerKm) {
    if (!secondsPerKm) return '-';

    const minutes = Math.floor(secondsPerKm / 60);
    const seconds = Math.floor(secondsPerKm % 60);

    return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
  }

  async exportHistory() {
    try {
      logger.info('Exporting training history');
      
      const exportData = await activityService.exportActivities();
      
      // Create download link
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `training-history-${new Date().toISOString().split('T')[0]}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      this.showSuccess('Training history exported successfully!');
    } catch (error) {
      logger.error('Failed to export history:', error);
      this.showError('Failed to export training history');
    }
  }

  addActivity() {
    logger.info('Adding new activity');
    this.showAddActivityModal();
  }

  showSuccess(message) {
    const successElement = document.createElement('div');
    successElement.className = 'success-toast';
    successElement.innerHTML = `
      <i class="fas fa-check-circle"></i>
      <span>${message}</span>
    `;

    document.body.appendChild(successElement);

    this.setTimeout(() => {
      successElement.remove();
    }, 3000);
  }

  showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-toast';
    errorElement.innerHTML = `
      <i class="fas fa-exclamation-circle"></i>
      <span>${message}</span>
    `;

    document.body.appendChild(errorElement);

    this.setTimeout(() => {
      errorElement.remove();
    }, 3000);
  }

  showAddActivityModal() {
    // Create a simple modal for adding activities
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Add Activity</h3>
          <button class="modal-close" id="closeModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <form id="addActivityForm">
            <div class="form-group">
              <label for="activityName">Activity Name</label>
              <input type="text" id="activityName" required>
            </div>
            <div class="form-group">
              <label for="activityType">Type</label>
              <select id="activityType" required>
                <option value="workout">Workout</option>
                <option value="race">Race</option>
                <option value="test">Test</option>
                <option value="recovery">Recovery</option>
              </select>
            </div>
            <div class="form-group">
              <label for="activityDate">Date</label>
              <input type="datetime-local" id="activityDate" required>
            </div>
            <div class="form-group">
              <label for="activityDuration">Duration (minutes)</label>
              <input type="number" id="activityDuration" min="1" required>
            </div>
            <div class="form-group">
              <label for="activityTSS">TSS (optional)</label>
              <input type="number" id="activityTSS" min="0" max="1000">
            </div>
            <div class="form-group">
              <label for="activityNotes">Notes</label>
              <textarea id="activityNotes" rows="3"></textarea>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" id="cancelAdd">Cancel</button>
          <button type="button" class="btn btn-primary" id="saveActivity">Save Activity</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Set default date to now
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('activityDate').value = now.toISOString().slice(0, 16);

    // Add event listeners
    const closeModal = () => {
      document.body.removeChild(modal);
    };

    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('cancelAdd').addEventListener('click', closeModal);
    
    document.getElementById('saveActivity').addEventListener('click', async () => {
      await this.handleSaveActivity();
      closeModal();
    });

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  async handleSaveActivity() {
    try {
      const formData = {
        name: document.getElementById('activityName').value,
        type: document.getElementById('activityType').value,
        date: new Date(document.getElementById('activityDate').value).toISOString(),
        duration: parseInt(document.getElementById('activityDuration').value) * 60, // Convert to seconds
        tss: parseInt(document.getElementById('activityTSS').value) || 0,
        notes: document.getElementById('activityNotes').value
      };

      await activityService.saveActivity(formData);
      
      this.showSuccess('Activity added successfully!');
      
      // Reload data
      await this.loadData();
      this.render();
      this.initializeViewComponents();
    } catch (error) {
      logger.error('Failed to save activity:', error);
      this.showError('Failed to save activity');
    }
  }
  
  /**
   * Initialize view-specific components
   */
  initializeViewComponents() {
    if (this.currentView === 'calendar') {
      this.initializeCalendarView();
    } else if (this.currentView === 'stats') {
      this.initializeStatsView();
    }
  }
  
  /**
   * Initialize calendar view with ActivityCalendar component
   */
  initializeCalendarView() {
    const container = this.container.querySelector('#activityCalendarContainer');
    if (container) {
      // Destroy existing instance
      if (this.activityCalendar) {
        this.activityCalendar.destroy();
      }
      
      // Create new ActivityCalendar instance
      this.activityCalendar = new ActivityCalendar(container, {
        activities: this.filteredActivities,
        onActivityClick: (activity) => {
          this.viewActivity(activity);
        },
        onDateClick: (date, activities) => {
          if (activities.length > 0) {
            // Show activities for the selected date
            this.showActivitiesForDate(date, activities);
          }
        }
      });
    }
  }
  
  /**
   * Initialize stats view with PerformanceTrends component
   */
  initializeStatsView() {
    const container = this.container.querySelector('#performanceTrendsContainer');
    if (container) {
      // Destroy existing instance
      if (this.performanceTrends) {
        this.performanceTrends.destroy();
      }
      
      // Create new PerformanceTrends instance
      this.performanceTrends = new PerformanceTrends(container, {
        activities: this.filteredActivities
      });
    }
  }
  
  /**
   * Show activities for a specific date
   */
  showActivitiesForDate(date, activities) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Activities for ${new Date(date).toLocaleDateString()}</h3>
          <button class="modal-close" id="closeActivitiesModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="activities-list">
            ${activities.map(activity => this.createActivityCard(activity)).join('')}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners
    const closeModal = () => {
      document.body.removeChild(modal);
    };

    document.getElementById('closeActivitiesModal').addEventListener('click', closeModal);
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }
}

export default HistoryPage;
