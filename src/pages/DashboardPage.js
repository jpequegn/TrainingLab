/**
 * Dashboard Page for TrainingLab
 * Main landing page with overview and quick actions
 */

import { BasePage } from './BasePage.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('DashboardPage');

export class DashboardPage extends BasePage {
  constructor(container) {
    super(container, {
      title: 'Dashboard',
      loadingText: 'Loading dashboard...',
    });

    // Dashboard-specific state
    this.stats = {
      totalWorkouts: 0,
      totalDistance: 0,
      totalTime: 0,
      weeklyGoal: 0,
    };
    this.recentActivities = [];
    this.quickActions = [];
  }

  async loadData() {
    try {
      // Simulate loading dashboard data
      await new Promise(resolve => {
        setTimeout(resolve, 500);
      });

      // Load user stats (mock data for now)
      this.stats = {
        totalWorkouts: 42,
        totalDistance: 1250.5,
        totalTime: 2820, // minutes
        weeklyGoal: 75, // percentage
      };

      // Load recent activities (mock data)
      this.recentActivities = [
        {
          id: 1,
          type: 'cycling',
          name: 'Morning Ride',
          date: new Date().toISOString(),
          duration: 45,
          distance: 18.5,
          power: 225,
        },
        {
          id: 2,
          type: 'running',
          name: 'Recovery Run',
          date: new Date(Date.now() - 86400000).toISOString(),
          duration: 30,
          distance: 5.2,
          pace: '5:45',
        },
        {
          id: 3,
          type: 'cycling',
          name: 'Interval Training',
          date: new Date(Date.now() - 172800000).toISOString(),
          duration: 60,
          distance: 25.8,
          power: 280,
        },
      ];

      // Define quick actions
      this.quickActions = [
        {
          id: 'upload-workout',
          title: 'Upload Workout',
          description: 'Upload and analyze a new workout file',
          icon: 'fas fa-upload',
          action: 'upload',
          primary: true,
        },
        {
          id: 'visualizer',
          title: 'Workout Visualizer',
          description: 'Analyze workout data and metrics',
          icon: 'fas fa-chart-line',
          action: 'navigate',
          route: '/visualizer',
        },
        {
          id: 'library',
          title: 'Workout Library',
          description: 'Browse saved workouts and plans',
          icon: 'fas fa-book',
          action: 'navigate',
          route: '/library',
        },
        {
          id: 'profile',
          title: 'Profile Settings',
          description: 'Update your athlete profile',
          icon: 'fas fa-user',
          action: 'navigate',
          route: '/profile',
        },
      ];

      logger.info('Dashboard data loaded successfully');
    } catch (error) {
      logger.error('Failed to load dashboard data:', error);
      throw error;
    }
  }

  async render() {
    const welcomeSection = this.createWelcomeSection();
    const statsSection = this.createStatsSection();
    const quickActionsSection = this.createQuickActionsSection();
    const recentActivitiesSection = this.createRecentActivitiesSection();

    const content = `
      ${welcomeSection}
      ${statsSection}
      <div class="dashboard-grid">
        <div class="dashboard-main">
          ${quickActionsSection}
        </div>
        <div class="dashboard-sidebar">
          ${recentActivitiesSection}
        </div>
      </div>
    `;

    this.container.innerHTML = this.generatePageHTML(content, {
      pageClass: 'dashboard-page',
      pageId: 'dashboard',
    });
  }

  createWelcomeSection() {
    const currentTime = new Date();
    const hour = currentTime.getHours();
    let greeting = 'Good morning';

    if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
    else if (hour >= 17) greeting = 'Good evening';

    const date = currentTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
      <section class="welcome-section">
        <div class="welcome-content">
          <h1 class="welcome-title">${greeting}, Athlete!</h1>
          <p class="welcome-date">${date}</p>
          <p class="welcome-message">Ready to track your training progress and achieve your goals?</p>
        </div>
        <div class="welcome-illustration">
          <i class="fas fa-dumbbell welcome-icon"></i>
        </div>
      </section>
    `;
  }

  createStatsSection() {
    const totalHours = Math.floor(this.stats.totalTime / 60);
    const totalMinutes = this.stats.totalTime % 60;

    return `
      <section class="stats-section">
        <h2 class="section-title">Your Progress</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-calendar-check"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">${this.stats.totalWorkouts}</div>
              <div class="stat-label">Total Workouts</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-route"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">${this.stats.totalDistance.toFixed(1)} km</div>
              <div class="stat-label">Total Distance</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-clock"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">${totalHours}h ${totalMinutes}m</div>
              <div class="stat-label">Total Time</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-target"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">${this.stats.weeklyGoal}%</div>
              <div class="stat-label">Weekly Goal</div>
              <div class="stat-progress">
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${this.stats.weeklyGoal}%"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  createQuickActionsSection() {
    const actionsHTML = this.quickActions
      .map(
        action => `
      <div class="quick-action-card ${action.primary ? 'quick-action-primary' : ''}" 
           data-action="${action.action}" 
           data-route="${action.route || ''}"
           data-id="${action.id}">
        <div class="quick-action-icon">
          <i class="${action.icon}"></i>
        </div>
        <div class="quick-action-content">
          <h3 class="quick-action-title">${action.title}</h3>
          <p class="quick-action-description">${action.description}</p>
        </div>
        <div class="quick-action-arrow">
          <i class="fas fa-chevron-right"></i>
        </div>
      </div>
    `
      )
      .join('');

    return `
      <section class="quick-actions-section">
        <h2 class="section-title">Quick Actions</h2>
        <div class="quick-actions-grid">
          ${actionsHTML}
        </div>
      </section>
    `;
  }

  createRecentActivitiesSection() {
    if (this.recentActivities.length === 0) {
      return `
        <section class="recent-activities-section">
          <h2 class="section-title">Recent Activities</h2>
          <div class="empty-activities">
            <i class="fas fa-running empty-icon"></i>
            <p class="empty-text">No recent activities found</p>
            <p class="empty-subtext">Upload your first workout to get started!</p>
          </div>
        </section>
      `;
    }

    const activitiesHTML = this.recentActivities
      .map(activity => {
        const date = new Date(activity.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
        const time = new Date(activity.date).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        });

        const iconMap = {
          cycling: 'fas fa-bicycle',
          running: 'fas fa-running',
          swimming: 'fas fa-swimmer',
        };

        const metricDisplay = activity.power
          ? `${activity.power}W avg`
          : activity.pace
            ? `${activity.pace} pace`
            : '';

        return `
        <div class="activity-item" data-id="${activity.id}">
          <div class="activity-icon">
            <i class="${iconMap[activity.type] || 'fas fa-dumbbell'}"></i>
          </div>
          <div class="activity-content">
            <h4 class="activity-name">${activity.name}</h4>
            <div class="activity-metrics">
              <span class="activity-duration">${activity.duration}min</span>
              <span class="activity-distance">${activity.distance}km</span>
              ${metricDisplay ? `<span class="activity-metric">${metricDisplay}</span>` : ''}
            </div>
            <div class="activity-date">${date} at ${time}</div>
          </div>
          <div class="activity-arrow">
            <i class="fas fa-chevron-right"></i>
          </div>
        </div>
      `;
      })
      .join('');

    return `
      <section class="recent-activities-section">
        <div class="section-header">
          <h2 class="section-title">Recent Activities</h2>
          <a href="#/history" class="section-link">View All</a>
        </div>
        <div class="activities-list">
          ${activitiesHTML}
        </div>
      </section>
    `;
  }

  async onInit() {
    this.setupQuickActions();
    this.setupActivityItems();
    logger.info('Dashboard initialized successfully');
  }

  setupQuickActions() {
    const actionCards = this.container.querySelectorAll('.quick-action-card');

    actionCards.forEach(card => {
      this.addEventListener(card, 'click', () => {
        const { action } = card.dataset;
        const { route } = card.dataset;
        const { id } = card.dataset;

        this.handleQuickAction(action, route, id);
      });

      // Add hover effect
      this.addEventListener(card, 'mouseenter', () => {
        card.style.transform = 'translateY(-2px)';
      });

      this.addEventListener(card, 'mouseleave', () => {
        card.style.transform = 'translateY(0)';
      });
    });
  }

  setupActivityItems() {
    const activityItems = this.container.querySelectorAll('.activity-item');

    activityItems.forEach(item => {
      this.addEventListener(item, 'click', () => {
        const activityId = item.dataset.id;
        this.viewActivity(activityId);
      });
    });
  }

  handleQuickAction(action, route, id) {
    logger.info(`Quick action triggered: ${id} (${action})`);

    switch (action) {
      case 'navigate':
        if (route && window.router) {
          window.router.navigate(route);
        }
        break;

      case 'upload':
        this.handleFileUpload();
        break;

      default:
        logger.warn(`Unknown action: ${action}`);
    }
  }

  handleFileUpload() {
    // Create file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.fit,.tcx,.gpx,.json';
    fileInput.style.display = 'none';

    this.addEventListener(fileInput, 'change', event => {
      const file = event.target.files[0];
      if (file) {
        logger.info(`File selected for upload: ${file.name}`);
        // TODO: Implement file upload logic
        this.showUploadSuccess(file.name);
      }
      document.body.removeChild(fileInput);
    });

    document.body.appendChild(fileInput);
    fileInput.click();
  }

  showUploadSuccess(filename) {
    // Create temporary success message
    const successMessage = document.createElement('div');
    successMessage.className = 'upload-success-message';
    successMessage.innerHTML = `
      <i class="fas fa-check-circle"></i>
      <span>File "${filename}" uploaded successfully!</span>
    `;

    this.container.appendChild(successMessage);

    this.setTimeout(() => {
      successMessage.remove();
    }, 3000);
  }

  viewActivity(activityId) {
    logger.info(`Viewing activity: ${activityId}`);
    // TODO: Implement activity detail view
    if (window.router) {
      window.router.navigate(`/visualizer?activity=${activityId}`);
    }
  }

  async refresh() {
    logger.info('Refreshing dashboard data');
    await super.refresh();
  }
}

export default DashboardPage;
