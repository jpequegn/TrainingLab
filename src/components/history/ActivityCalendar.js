/**
 * Activity Calendar Component
 * Calendar view for training activities with TSS indicators and activity type visualization
 * Part of issue #111 - Training History & Analytics Page
 */

// Logging removed to eliminate unused variable warning

export class ActivityCalendar {
  constructor(container, options = {}) {
    this.container = container;
    this.activities = options.activities || [];
    this.onActivityClick = options.onActivityClick || null;
    this.onDateClick = options.onDateClick || null;

    this.currentDate = new Date();
    this.currentMonth = this.currentDate.getMonth();
    this.currentYear = this.currentDate.getFullYear();

    this.render();
    this.attachEventListeners();
  }

  /**
   * Set activities data and refresh calendar
   */
  setActivities(activities) {
    this.activities = activities || [];
    this.render();
  }

  /**
   * Render the calendar
   */
  render() {
    if (!this.container) return;

    const calendarHTML = this.generateCalendarHTML();
    this.container.innerHTML = calendarHTML;
    this.attachEventListeners();
  }

  /**
   * Generate complete calendar HTML
   */
  generateCalendarHTML() {
    return `
      <div class="activity-calendar">
        ${this.generateCalendarHeader()}
        ${this.generateCalendarGrid()}
      </div>
    `;
  }

  /**
   * Generate calendar header with navigation
   */
  generateCalendarHeader() {
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    const currentMonthName = monthNames[this.currentMonth];

    return `
      <div class="calendar-header">
        <div class="calendar-nav">
          <button class="calendar-nav-btn" data-action="prev-month">
            <i class="fas fa-chevron-left"></i>
          </button>
          <h3 class="calendar-title">${currentMonthName} ${this.currentYear}</h3>
          <button class="calendar-nav-btn" data-action="next-month">
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
        <div class="calendar-legend">
          <div class="legend-item">
            <div class="legend-dot" style="background-color: #10b981;"></div>
            <span>Low TSS (0-50)</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background-color: #f59e0b;"></div>
            <span>Medium TSS (51-100)</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background-color: #ef4444;"></div>
            <span>High TSS (100+)</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate calendar grid
   */
  generateCalendarGrid() {
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const startDate = new Date(firstDay);

    // Start from Sunday of the week containing the first day
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const weeks = [];
    let currentWeek = [];

    // Generate 6 weeks to ensure complete calendar view
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      currentWeek.push(date);

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    const weekDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return `
      <div class="calendar-grid">
        <!-- Week day headers -->
        <div class="calendar-weekdays">
          ${weekDayNames.map(day => `<div class="calendar-weekday">${day}</div>`).join('')}
        </div>
        
        <!-- Calendar weeks -->
        <div class="calendar-weeks">
          ${weeks.map(week => this.generateWeekHTML(week)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Generate HTML for a week
   */
  generateWeekHTML(week) {
    return `
      <div class="calendar-week">
        ${week.map(date => this.generateDayHTML(date)).join('')}
      </div>
    `;
  }

  /**
   * Generate HTML for a single day
   */
  generateDayHTML(date) {
    const dayActivities = this.getActivitiesForDate(date);
    const isCurrentMonth = date.getMonth() === this.currentMonth;
    const isToday = this.isToday(date);
    const dateStr = date.toISOString().split('T')[0];

    const totalTSS = dayActivities.reduce(
      (sum, activity) => sum + (activity.tss || 0),
      0
    );

    let dayClasses = 'calendar-day';
    if (!isCurrentMonth) dayClasses += ' other-month';
    if (isToday) dayClasses += ' today';
    if (dayActivities.length > 0) dayClasses += ' has-activities';

    const tssColor = this.getTSSColor(totalTSS);

    return `
      <div class="${dayClasses}" data-date="${dateStr}">
        <div class="day-number">${date.getDate()}</div>
        ${this.generateDayActivitiesHTML(dayActivities, totalTSS, tssColor)}
      </div>
    `;
  }

  /**
   * Generate HTML for activities in a day
   */
  generateDayActivitiesHTML(activities, totalTSS, tssColor) {
    if (activities.length === 0) return '';

    return `
      <div class="day-activities">
        ${
          totalTSS > 0
            ? `
          <div class="day-tss" style="background-color: ${tssColor};">
            ${Math.round(totalTSS)}
          </div>
        `
            : ''
        }
        <div class="day-activity-indicators">
          ${activities
            .slice(0, 3)
            .map(
              activity => `
            <div class="activity-indicator" 
                 data-activity-id="${activity.id}"
                 title="${activity.name} (${activity.type})">
              <i class="${this.getActivityTypeIcon(activity.type)}"></i>
            </div>
          `
            )
            .join('')}
          ${
            activities.length > 3
              ? `
            <div class="activity-indicator more-indicator" title="${activities.length - 3} more activities">
              +${activities.length - 3}
            </div>
          `
              : ''
          }
        </div>
      </div>
    `;
  }

  /**
   * Get activities for a specific date
   */
  getActivitiesForDate(date) {
    const dateStr = date.toISOString().split('T')[0];
    return this.activities.filter(activity => {
      const activityDate = new Date(activity.date).toISOString().split('T')[0];
      return activityDate === dateStr;
    });
  }

  /**
   * Check if a date is today
   */
  isToday(date) {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  /**
   * Get TSS color based on value
   */
  getTSSColor(tss) {
    if (tss === 0) return '#e5e7eb'; // gray-200
    if (tss <= 50) return '#10b981'; // green-500
    if (tss <= 100) return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  }

  /**
   * Get activity type icon
   */
  getActivityTypeIcon(type) {
    const icons = {
      workout: 'fas fa-dumbbell',
      race: 'fas fa-trophy',
      test: 'fas fa-flask',
      recovery: 'fas fa-spa',
      cycling: 'fas fa-bicycle',
      running: 'fas fa-running',
      swimming: 'fas fa-swimmer',
    };

    return icons[type] || 'fas fa-dumbbell';
  }

  /**
   * Navigate to previous month
   */
  previousMonth() {
    this.currentMonth -= 1;
    if (this.currentMonth < 0) {
      this.currentMonth = 11;
      this.currentYear -= 1;
    }
    this.render();
  }

  /**
   * Navigate to next month
   */
  nextMonth() {
    this.currentMonth += 1;
    if (this.currentMonth > 11) {
      this.currentMonth = 0;
      this.currentYear += 1;
    }
    this.render();
  }

  /**
   * Go to today's date
   */
  goToToday() {
    const today = new Date();
    this.currentMonth = today.getMonth();
    this.currentYear = today.getFullYear();
    this.render();
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    if (!this.container) return;

    // Navigation buttons
    const prevBtn = this.container.querySelector('[data-action="prev-month"]');
    const nextBtn = this.container.querySelector('[data-action="next-month"]');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.previousMonth());
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.nextMonth());
    }

    // Day clicks
    const dayElements = this.container.querySelectorAll('.calendar-day');
    dayElements.forEach(dayEl => {
      dayEl.addEventListener('click', e => {
        const { date } = dayEl.dataset;
        const activities = this.getActivitiesForDate(new Date(date));

        if (this.onDateClick) {
          this.onDateClick(date, activities);
        }
      });
    });

    // Activity indicator clicks
    const activityIndicators = this.container.querySelectorAll(
      '.activity-indicator[data-activity-id]'
    );
    activityIndicators.forEach(indicator => {
      indicator.addEventListener('click', e => {
        e.stopPropagation(); // Prevent day click

        const { activityId } = indicator.dataset;
        const activity = this.activities.find(a => a.id === activityId);

        if (this.onActivityClick && activity) {
          this.onActivityClick(activity);
        }
      });
    });
  }

  /**
   * Set current month and year
   */
  setMonth(year, month) {
    this.currentYear = year;
    this.currentMonth = month;
    this.render();
  }

  /**
   * Get current month and year
   */
  getCurrentMonth() {
    return {
      year: this.currentYear,
      month: this.currentMonth,
    };
  }

  /**
   * Destroy the component
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

export default ActivityCalendar;
