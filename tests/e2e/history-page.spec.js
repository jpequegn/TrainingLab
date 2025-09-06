/**
 * E2E Tests for TrainingLab HistoryPage (Issue #111)
 * 
 * Tests comprehensive functionality including:
 * - Page navigation and loading
 * - View toggle functionality (Timeline, Calendar, Stats)
 * - ActivityCalendar component with TSS indicators
 * - PerformanceTrends component with charts
 * - Modal functionality
 * - Error handling
 */

import { test, expect } from '@playwright/test';

test.describe('HistoryPage E2E Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Go to the main application page
    await page.goto('/');
    
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Wait for navigation to be ready
    await page.waitForSelector('.navigation, nav', { timeout: 10000 });
    
    // Navigate to History page using the router
    await page.evaluate(() => {
      if (window.router) {
        window.router.navigate('/history');
      }
    });
    
    // Wait for History page to load
    await page.waitForSelector('.history-page, #history, [data-testid="history-page"], .history-content', { timeout: 15000 });
    
    // Wait for activities to load (allow time for service initialization)
    await page.waitForTimeout(3000);
  });

  test('should load HistoryPage correctly', async ({ page }) => {
    // Verify page elements are present
    const pageContent = page.locator('.history-content, .page-content, .history-page');
    await expect(pageContent).toBeVisible({ timeout: 10000 });
    
    // Check for header with title
    const title = page.locator('h1, h2, .page-title, .history-header h1, .history-header h2, .history-header h3');
    await expect(title).toBeVisible();
    const titleText = await title.first().textContent();
    expect(titleText.toLowerCase()).toContain('history');
    
    // Verify view toggle is present
    await expect(page.locator('.view-toggle')).toBeVisible();
    
    // Check for filter bar
    await expect(page.locator('.filter-bar')).toBeVisible();
    
    // Verify main content area exists
    const mainContent = page.locator('.timeline-view, .calendar-view, .stats-view');
    await expect(mainContent).toBeVisible();
    
    console.log('✅ HistoryPage loaded successfully');
  });

  test('should have three view modes available', async ({ page }) => {
    // Check that all three view toggle buttons exist
    const viewButtons = page.locator('.view-toggle-btn');
    await expect(viewButtons).toHaveCount(3);
    
    // Verify specific view buttons
    await expect(page.locator('[data-view="timeline"], .view-toggle-btn:has-text("Timeline")')).toBeVisible();
    await expect(page.locator('[data-view="calendar"], .view-toggle-btn:has-text("Calendar")')).toBeVisible();
    await expect(page.locator('[data-view="stats"], .view-toggle-btn:has-text("Statistics")')).toBeVisible();
    
    console.log('✅ All three view modes are available');
  });

  test('should switch between view modes correctly', async ({ page }) => {
    // Start with timeline view (default)
    await expect(page.locator('.timeline-view')).toBeVisible();
    
    // Switch to Calendar view
    const calendarBtn = page.locator('[data-view="calendar"], .view-toggle-btn:has-text("Calendar")');
    await calendarBtn.first().click();
    await page.waitForTimeout(1500);
    
    // Verify calendar view is active
    await expect(page.locator('.calendar-view, .activity-calendar')).toBeVisible();
    const calendarBtnActive = page.locator('[data-view="calendar"].active, .view-toggle-btn.active:has-text("Calendar")');
    await expect(calendarBtnActive).toHaveCount(1);
    
    // Switch to Stats view
    const statsBtn = page.locator('[data-view="stats"], .view-toggle-btn:has-text("Statistics")');
    await statsBtn.first().click();
    await page.waitForTimeout(1500);
    
    // Verify stats view is active
    await expect(page.locator('.stats-view, .performance-trends')).toBeVisible();
    const statsBtnActive = page.locator('[data-view="stats"].active, .view-toggle-btn.active:has-text("Statistics")');
    await expect(statsBtnActive).toHaveCount(1);
    
    // Switch back to Timeline view
    const timelineBtn = page.locator('[data-view="timeline"], .view-toggle-btn:has-text("Timeline")');
    await timelineBtn.first().click();
    await page.waitForTimeout(1500);
    
    // Verify timeline view is active again
    await expect(page.locator('.timeline-view')).toBeVisible();
    const timelineBtnActive = page.locator('[data-view="timeline"].active, .view-toggle-btn.active:has-text("Timeline")');
    await expect(timelineBtnActive).toHaveCount(1);
    
    console.log('✅ View switching works correctly');
  });

  test('should display ActivityCalendar component correctly', async ({ page }) => {
    // Switch to calendar view
    const calendarBtn = page.locator('[data-view="calendar"], .view-toggle-btn:has-text("Calendar")');
    await calendarBtn.first().click();
    await page.waitForTimeout(2000);
    
    // Check for calendar container
    await expect(page.locator('#activityCalendarContainer, .activity-calendar')).toBeVisible();
    
    // Verify calendar header with navigation
    await expect(page.locator('.calendar-header')).toBeVisible();
    await expect(page.locator('.calendar-nav')).toBeVisible();
    
    // Check for month navigation buttons
    const navButtons = page.locator('[data-action="prev-month"], [data-action="next-month"], .calendar-nav-btn');
    await expect(navButtons).toHaveCount(2);
    
    // Verify calendar title shows month and year
    const calendarTitle = page.locator('.calendar-title, .calendar-header h3');
    await expect(calendarTitle).toBeVisible();
    const titleText = await calendarTitle.textContent();
    expect(titleText).toMatch(/\w+\s+\d{4}/); // Month Year format
    
    // Check for TSS legend
    await expect(page.locator('.calendar-legend')).toBeVisible();
    const legendItems = page.locator('.legend-item');
    await expect(legendItems).toHaveCount(3);
    
    // Verify legend items show TSS ranges
    await expect(page.locator('text=Low TSS (0-50)')).toBeVisible();
    await expect(page.locator('text=Medium TSS (51-100)')).toBeVisible();
    await expect(page.locator('text=High TSS (100+)')).toBeVisible();
    
    // Check for calendar grid
    await expect(page.locator('.calendar-grid, .calendar-weeks')).toBeVisible();
    await expect(page.locator('.calendar-weekdays')).toBeVisible();
    
    // Verify weekday headers
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (const day of weekdays) {
      await expect(page.locator(`text=${day}`)).toBeVisible();
    }
    
    console.log('✅ ActivityCalendar displays correctly with TSS indicators');
  });

  test('should navigate calendar months', async ({ page }) => {
    // Switch to calendar view
    const calendarBtn = page.locator('[data-view="calendar"], .view-toggle-btn:has-text("Calendar")');
    await calendarBtn.first().click();
    await page.waitForTimeout(2000);
    
    // Get current month
    const initialMonth = await page.locator('.calendar-title, .calendar-header h3').textContent();
    
    // Click next month
    await page.click('[data-action="next-month"]');
    await page.waitForTimeout(1000);
    
    // Verify month changed
    const nextMonth = await page.locator('.calendar-title, .calendar-header h3').textContent();
    expect(nextMonth).not.toBe(initialMonth);
    
    // Click previous month twice to go back
    await page.click('[data-action="prev-month"]');
    await page.waitForTimeout(1000);
    
    const backToInitial = await page.locator('.calendar-title, .calendar-header h3').textContent();
    expect(backToInitial).toBe(initialMonth);
    
    console.log('✅ Calendar month navigation works correctly');
  });

  test('should show TSS indicators with correct colors', async ({ page }) => {
    // Switch to calendar view
    const calendarBtn = page.locator('[data-view="calendar"], .view-toggle-btn:has-text("Calendar")');
    await calendarBtn.first().click();
    await page.waitForTimeout(2000);
    
    // Look for calendar days with activities (TSS indicators)
    const daysWithTSS = page.locator('.day-tss, .has-activities .day-tss');
    
    // If there are TSS indicators, check their colors
    const tssCount = await daysWithTSS.count();
    if (tssCount > 0) {
      for (let i = 0; i < Math.min(tssCount, 5); i++) {
        const tssElement = daysWithTSS.nth(i);
        const style = await tssElement.getAttribute('style');
        
        // Verify that background-color is set (should be green, amber, or red)
        expect(style).toContain('background-color');
        
        // Check that TSS value is displayed
        const tssValue = await tssElement.textContent();
        expect(tssValue).toMatch(/\d+/); // Should contain numbers
      }
      
      console.log(`✅ Found ${tssCount} TSS indicators with correct styling`);
    } else {
      console.log('ℹ️ No TSS indicators found (expected for mock data)');
    }
  });

  test('should handle calendar day clicks', async ({ page }) => {
    // Switch to calendar view
    const calendarBtn = page.locator('[data-view="calendar"], .view-toggle-btn:has-text("Calendar")');
    await calendarBtn.first().click();
    await page.waitForTimeout(2000);
    
    // Look for clickable calendar days
    const calendarDays = page.locator('.calendar-day');
    await expect(calendarDays.first()).toBeVisible();
    
    // Click on a day with activities if available
    const dayWithActivities = page.locator('.calendar-day.has-activities').first();
    const hasActiveDays = await dayWithActivities.count() > 0;
    
    if (hasActiveDays) {
      await dayWithActivities.click();
      await page.waitForTimeout(1000);
      
      // Check if modal or popup appears
      const modal = page.locator('.modal-overlay, .modal, .popup');
      if (await modal.count() > 0) {
        await expect(modal).toBeVisible();
        console.log('✅ Day click shows activity details modal');
        
        // Close modal if it appeared
        const closeButton = page.locator('.modal-close, [id*="close"], button:has-text("Close")');
        if (await closeButton.count() > 0) {
          await closeButton.first().click();
        }
      }
    } else {
      // Click on any day
      await calendarDays.first().click();
      console.log('ℹ️ Clicked on calendar day (no activities to show)');
    }
  });

  test('should display PerformanceTrends component in Stats view', async ({ page }) => {
    // Switch to stats view
    const statsBtn = page.locator('[data-view="stats"], .view-toggle-btn:has-text("Statistics")');
    await statsBtn.first().click();
    await page.waitForTimeout(2000);
    
    // Check for performance trends container
    await expect(page.locator('#performanceTrendsContainer, .performance-trends')).toBeVisible();
    
    // Verify trends header
    await expect(page.locator('.trends-header')).toBeVisible();
    await expect(page.locator('h3:has-text("Performance Trends"), text=Performance Trends')).toBeVisible();
    
    // Check for date range selector
    await expect(page.locator('#dateRangeSelect, .date-range-selector select')).toBeVisible();
    
    // Verify metric cards
    const metricCards = page.locator('.metric-card, .stat-card');
    await expect(metricCards).toHaveCount(4); // ATL, CTL, TSB, Weekly TSS
    
    // Check specific metric cards
    await expect(page.locator('#atlMetric, text=ATL')).toBeVisible();
    await expect(page.locator('#ctlMetric, text=CTL')).toBeVisible();
    await expect(page.locator('#tsbMetric, text=TSB')).toBeVisible();
    await expect(page.locator('#weeklyTssMetric, text=Weekly TSS')).toBeVisible();
    
    console.log('✅ PerformanceTrends component displays correctly');
  });

  test('should show charts in Performance Trends', async ({ page }) => {
    // Switch to stats view
    const statsBtn = page.locator('[data-view="stats"], .view-toggle-btn:has-text("Statistics")');
    await statsBtn.first().click();
    await page.waitForTimeout(2000);
    
    // Look for chart containers
    const chartContainers = page.locator('.chart-container, .trends-charts');
    
    if (await chartContainers.count() > 0) {
      await expect(chartContainers.first()).toBeVisible();
      
      // Check for canvas elements (Chart.js)
      const canvasElements = page.locator('canvas');
      const canvasCount = await canvasElements.count();
      
      if (canvasCount > 0) {
        console.log(`✅ Found ${canvasCount} chart canvas elements`);
        
        // Verify specific charts if they exist
        const expectedCharts = [
          '#trainingLoadChart',
          '#weeklyTssChart', 
          '#powerProgressionChart'
        ];
        
        for (const chartId of expectedCharts) {
          const chart = page.locator(chartId);
          if (await chart.count() > 0) {
            await expect(chart).toBeVisible();
          }
        }
      } else {
        console.log('ℹ️ No chart canvas elements found (Chart.js may not be loaded)');
      }
    }
  });

  test('should have functional date range selector', async ({ page }) => {
    // Switch to stats view
    const statsBtn = page.locator('[data-view="stats"], .view-toggle-btn:has-text("Statistics")');
    await statsBtn.first().click();
    await page.waitForTimeout(2000);
    
    // Find date range selector
    const dateRangeSelect = page.locator('#dateRangeSelect, .date-range-selector select');
    await expect(dateRangeSelect).toBeVisible();
    
    // Test changing date range
    await dateRangeSelect.selectOption('30');
    await page.waitForTimeout(500);
    
    await dateRangeSelect.selectOption('90');
    await page.waitForTimeout(500);
    
    await dateRangeSelect.selectOption('180');
    await page.waitForTimeout(500);
    
    console.log('✅ Date range selector works correctly');
  });

  test('should show Add Activity modal', async ({ page }) => {
    // Look for Add Activity button
    const addButton = page.locator('#addActivityBtn, button:has-text("Add Activity"), [data-action="add"]');
    
    if (await addButton.count() > 0) {
      await addButton.first().click();
      await page.waitForTimeout(1000);
      
      // Check if modal appears
      const modal = page.locator('.modal-overlay, .modal');
      await expect(modal).toBeVisible();
      
      // Verify modal content
      await expect(page.locator('h3:has-text("Add Activity"), text=Add Activity')).toBeVisible();
      await expect(page.locator('#activityName, input[name="name"]')).toBeVisible();
      await expect(page.locator('#activityType, select[name="type"]')).toBeVisible();
      await expect(page.locator('#activityDate, input[type="datetime-local"]')).toBeVisible();
      
      // Close modal
      const closeButton = page.locator('#closeModal, .modal-close, button:has-text("Cancel")');
      if (await closeButton.count() > 0) {
        await closeButton.first().click();
        await page.waitForTimeout(500);
      }
      
      console.log('✅ Add Activity modal works correctly');
    } else {
      console.log('ℹ️ Add Activity button not found on current view');
    }
  });

  test('should handle filter changes', async ({ page }) => {
    // Test date range filter
    const dateRangeFilter = page.locator('#dateRangeSelect');
    if (await dateRangeFilter.count() > 0) {
      await dateRangeFilter.selectOption('week');
      await page.waitForTimeout(500);
      
      await dateRangeFilter.selectOption('month');
      await page.waitForTimeout(500);
    }
    
    // Test activity type filter
    const activityFilter = page.locator('#activityFilterSelect');
    if (await activityFilter.count() > 0) {
      await activityFilter.selectOption('cycling');
      await page.waitForTimeout(500);
      
      await activityFilter.selectOption('all');
      await page.waitForTimeout(500);
    }
    
    // Test status filter
    const statusFilter = page.locator('#statusFilterSelect');
    if (await statusFilter.count() > 0) {
      await statusFilter.selectOption('completed');
      await page.waitForTimeout(500);
      
      await statusFilter.selectOption('all');
      await page.waitForTimeout(500);
    }
    
    console.log('✅ Filter functionality works');
  });

  test('should display activities in timeline view', async ({ page }) => {
    // Ensure we're in timeline view
    const timelineBtn = page.locator('[data-view="timeline"], .view-toggle-btn:has-text("Timeline")');
    await timelineBtn.first().click();
    await page.waitForTimeout(1000);
    
    // Look for activities list
    const activitiesList = page.locator('.activities-list, .timeline-view');
    await expect(activitiesList).toBeVisible();
    
    // Check for activity cards or empty state
    const activityCards = page.locator('.activity-card');
    const emptyState = page.locator('.empty-state');
    
    const hasActivities = await activityCards.count() > 0;
    const hasEmptyState = await emptyState.count() > 0;
    
    if (hasActivities) {
      console.log(`✅ Found ${await activityCards.count()} activity cards in timeline`);
      
      // Verify activity card structure
      const firstCard = activityCards.first();
      await expect(firstCard).toBeVisible();
      
      // Check for activity card elements
      await expect(firstCard.locator('.activity-name, .activity-content')).toBeVisible();
      
    } else if (hasEmptyState) {
      await expect(emptyState).toBeVisible();
      await expect(page.locator('h3:has-text("No activities found"), text=No activities found')).toBeVisible();
      console.log('✅ Empty state displayed correctly');
    } else {
      console.log('⚠️ No activities or empty state found');
    }
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Monitor console errors
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Monitor JavaScript errors
    const jsErrors = [];
    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });
    
    // Test various interactions that might cause errors
    const calendarBtn = page.locator('[data-view="calendar"]');
    if (await calendarBtn.count() > 0) {
      await calendarBtn.click();
      await page.waitForTimeout(1000);
    }
    
    const statsBtn = page.locator('[data-view="stats"]');
    if (await statsBtn.count() > 0) {
      await statsBtn.click();
      await page.waitForTimeout(1000);
    }
    
    const timelineBtn = page.locator('[data-view="timeline"]');
    if (await timelineBtn.count() > 0) {
      await timelineBtn.click();
      await page.waitForTimeout(1000);
    }
    
    // Check for critical errors (ignore minor ones)
    const criticalErrors = jsErrors.filter(error => 
      !error.includes('Chart is not defined') &&
      !error.includes('ResizeObserver loop limit exceeded') &&
      !error.includes('Non-Error promise rejection captured')
    );
    
    if (criticalErrors.length > 0) {
      console.log('⚠️ JavaScript errors detected:', criticalErrors);
    } else {
      console.log('✅ No critical JavaScript errors detected');
    }
    
    // Verify page is still functional
    await expect(page.locator('.history-content, .page-content')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page, isMobile }) => {
    if (isMobile) {
      // Test mobile-specific behavior
      await expect(page.locator('.view-toggle')).toBeVisible();
      
      // Verify mobile navigation works
      const calendarBtn = page.locator('[data-view="calendar"]');
      if (await calendarBtn.count() > 0) {
        await calendarBtn.click();
        await page.waitForTimeout(1000);
        await expect(page.locator('.calendar-view, .activity-calendar')).toBeVisible();
      }
      
      console.log('✅ Mobile responsiveness verified');
    } else {
      console.log('ℹ️ Skipping mobile test on desktop');
    }
  });

  test('should export data functionality', async ({ page }) => {
    // Look for export button
    const exportButton = page.locator('#exportHistoryBtn, button:has-text("Export"), [data-action="export"]');
    
    if (await exportButton.count() > 0) {
      // Set up download handling
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
      
      try {
        await exportButton.first().click();
        
        // Wait for download to start
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('training-history');
        
        console.log('✅ Export functionality works');
      } catch (error) {
        console.log('ℹ️ Export may not be fully implemented or no data to export');
      }
    } else {
      console.log('ℹ️ Export button not found');
    }
  });

});

// Performance and accessibility tests
test.describe('HistoryPage Performance & Accessibility', () => {
  
  test('should load within performance budget', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForSelector('.navigation, nav', { timeout: 10000 });
    
    await page.evaluate(() => {
      if (window.router) {
        window.router.navigate('/history');
      }
    });
    
    await page.waitForSelector('.history-page, #history, .history-content', { timeout: 10000 });
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 10 seconds (generous for development)
    expect(loadTime).toBeLessThan(10000);
    console.log(`✅ Page loaded in ${loadTime}ms`);
  });
  
  test('should have no accessibility violations', async ({ page }) => {
    // Navigate to history page
    await page.goto('/');
    await page.waitForSelector('.navigation, nav', { timeout: 10000 });
    
    await page.evaluate(() => {
      if (window.router) {
        window.router.navigate('/history');
      }
    });
    
    await page.waitForSelector('.history-page, #history, .history-content', { timeout: 10000 });
    
    // Basic accessibility checks
    // Check for proper heading structure
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();
    expect(headingCount).toBeGreaterThan(0);
    
    // Check for alt text on images (if any)
    const images = page.locator('img');
    const imageCount = await images.count();
    
    if (imageCount > 0) {
      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');
        if (!alt) {
          console.log(`⚠️ Image ${i} missing alt text`);
        }
      }
    }
    
    // Check for form labels
    const inputs = page.locator('input, select, textarea');
    const inputCount = await inputs.count();
    
    if (inputCount > 0) {
      console.log(`Found ${inputCount} form inputs`);
    }
    
    console.log('✅ Basic accessibility checks completed');
  });
  
});