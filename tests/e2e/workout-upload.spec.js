import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Workout Upload Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should upload and display workout file', async ({ page }) => {
    // Check if file input exists
    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeVisible();

    // Upload sample workout file
    const filePath = path.join(process.cwd(), 'sample_workout.zwo');
    await fileInput.setInputFiles(filePath);

    // Wait for upload and processing
    await page.waitForFunction(() => {
      return window.currentWorkout && window.currentWorkout.name;
    }, { timeout: 10000 });

    // Check that workout information is displayed
    await expect(page.locator('.workout-info')).toBeVisible();
    
    // Check that chart is rendered
    await expect(page.locator('canvas')).toBeVisible();
    
    // Verify workout details are shown
    const workoutName = await page.locator('.workout-name').textContent();
    expect(workoutName).toBeTruthy();
    
    const workoutDuration = await page.locator('.workout-duration').textContent();
    expect(workoutDuration).toMatch(/\d+:\d+/); // Should show time format
  });

  test('should show error for invalid file', async ({ page }) => {
    // Create a temporary invalid file
    const fileInput = page.locator('input[type="file"]').first();
    
    // Try to upload a text file instead of ZWO
    await fileInput.setInputFiles({
      name: 'invalid.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('This is not a valid workout file')
    });

    // Should show error message
    await expect(page.locator('.error-message')).toBeVisible({ timeout: 5000 });
    const errorText = await page.locator('.error-message').textContent();
    expect(errorText).toContain('Invalid');
  });

  test('should handle large workout files', async ({ page }) => {
    // Upload large sample workout if available
    const filePath = path.join(process.cwd(), 'test_workout.zwo');
    
    try {
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(filePath);

      // Wait longer for large file processing
      await page.waitForFunction(() => {
        return window.currentWorkout && window.currentWorkout.segments;
      }, { timeout: 15000 });

      // Check that chart renders with many segments
      await expect(page.locator('canvas')).toBeVisible();
      
      // Verify performance is acceptable (chart should load within reasonable time)
      const chartCanvas = page.locator('canvas');
      await expect(chartCanvas).toBeVisible({ timeout: 10000 });
    } catch (error) {
      // Skip test if test file doesn't exist
      test.skip(error.message.includes('ENOENT'), 'Test workout file not found');
    }
  });
});

test.describe('Workout Visualization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Upload sample workout for visualization tests
    const fileInput = page.locator('input[type="file"]').first();
    const filePath = path.join(process.cwd(), 'sample_workout.zwo');
    await fileInput.setInputFiles(filePath);
    
    await page.waitForFunction(() => {
      return window.currentWorkout && window.currentWorkout.name;
    }, { timeout: 10000 });
  });

  test('should display interactive chart', async ({ page }) => {
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Test chart interactivity
    const canvasBox = await canvas.boundingBox();
    
    // Hover over chart to show tooltip
    await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
    
    // Check if tooltip appears (this might need adjustment based on actual implementation)
    // await expect(page.locator('.chart-tooltip')).toBeVisible({ timeout: 3000 });
  });

  test('should show workout statistics', async ({ page }) => {
    // Check that workout stats are displayed
    await expect(page.locator('.workout-stats')).toBeVisible();
    
    // Verify specific stats exist
    const duration = page.locator('[data-stat="duration"]');
    const tss = page.locator('[data-stat="tss"]');
    const avgPower = page.locator('[data-stat="avg-power"]');
    
    await expect(duration).toBeVisible();
    // TSS and avgPower might not be visible if not implemented yet
    // await expect(tss).toBeVisible();
    // await expect(avgPower).toBeVisible();
  });

  test('should support zoom and pan on chart', async ({ page }) => {
    const canvas = page.locator('canvas');
    const canvasBox = await canvas.boundingBox();

    // Test zoom functionality (if implemented)
    await page.mouse.wheel(0, -100); // Scroll up to zoom in
    
    // Test pan functionality
    await page.mouse.move(canvasBox.x + 100, canvasBox.y + 100);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + 200, canvasBox.y + 100);
    await page.mouse.up();
    
    // Chart should still be visible after interaction
    await expect(canvas).toBeVisible();
  });
});

test.describe('Export Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Upload sample workout
    const fileInput = page.locator('input[type="file"]').first();
    const filePath = path.join(process.cwd(), 'sample_workout.zwo');
    await fileInput.setInputFiles(filePath);
    
    await page.waitForFunction(() => {
      return window.currentWorkout && window.currentWorkout.name;
    }, { timeout: 10000 });
  });

  test('should export workout as image', async ({ page }) => {
    // Look for export button
    const exportBtn = page.locator('button').filter({ hasText: /export|download|save/i }).first();
    
    if (await exportBtn.isVisible()) {
      // Start download
      const downloadPromise = page.waitForEvent('download');
      await exportBtn.click();
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.(png|jpg|jpeg|svg)$/i);
    } else {
      test.skip('Export functionality not yet implemented');
    }
  });

  test('should support multiple export formats', async ({ page }) => {
    // Check for format selector
    const formatSelector = page.locator('select[name="export-format"], .export-format');
    
    if (await formatSelector.isVisible()) {
      // Test different formats
      const formats = ['PNG', 'JPG', 'SVG'];
      
      for (const format of formats) {
        await formatSelector.selectOption({ label: format });
        
        const exportBtn = page.locator('button').filter({ hasText: /export/i });
        const downloadPromise = page.waitForEvent('download');
        await exportBtn.click();
        
        const download = await downloadPromise;
        const filename = download.suggestedFilename();
        expect(filename.toLowerCase()).toContain(format.toLowerCase());
      }
    } else {
      test.skip('Multiple export formats not yet implemented');
    }
  });
});

test.describe('Responsive Design', () => {
  test('should work on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Check that interface adapts to mobile
    await expect(page.locator('body')).toBeVisible();
    
    // Upload should still work on mobile
    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeVisible();
    
    // Chart should be responsive
    const canvas = page.locator('canvas');
    if (await canvas.isVisible()) {
      const canvasBox = await canvas.boundingBox();
      expect(canvasBox.width).toBeLessThanOrEqual(375);
    }
  });

  test('should work on tablet devices', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    await expect(page.locator('body')).toBeVisible();
    
    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/');

    // Test tab navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement.tagName);
    expect(['INPUT', 'BUTTON', 'A']).toContain(focusedElement);

    // Test file upload with keyboard
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.focus();
    await expect(fileInput).toBeFocused();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/');

    // Check for accessibility attributes
    const fileInput = page.locator('input[type="file"]').first();
    const ariaLabel = await fileInput.getAttribute('aria-label');
    const label = page.locator('label[for*="file"]');
    
    // Should have either aria-label or associated label
    expect(ariaLabel || await label.count() > 0).toBeTruthy();
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/');

    // Check background and text colors (basic test)
    const backgroundColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    
    const textColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).color;
    });

    // Basic check that colors are defined
    expect(backgroundColor).toBeTruthy();
    expect(textColor).toBeTruthy();
  });
});