import { test, expect } from '@playwright/test';

test.describe('Basic Application Tests', () => {
  test('should load the main page', async ({ page }) => {
    await page.goto('/');

    // Check that the page loads
    await expect(page).toHaveTitle(/Zwift Workout/i);

    // Check that basic elements are present
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have file input visible', async ({ page }) => {
    await page.goto('/');

    // Check if file input exists
    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Check that interface adapts to mobile
    await expect(page.locator('body')).toBeVisible();

    // File input should still be visible on mobile
    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeVisible();
  });

  test('should have basic accessibility features', async ({ page }) => {
    await page.goto('/');

    // Test that file input can be focused directly
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.focus();
    await expect(fileInput).toBeFocused();

    // Check that file input has proper labeling or accessibility
    const hasAriaLabel = await fileInput.getAttribute('aria-label');
    const hasLabel = await page.locator('label').count();
    const hasTitle = await fileInput.getAttribute('title');

    // Should have some form of accessibility labeling
    expect(hasAriaLabel || hasLabel > 0 || hasTitle).toBeTruthy();
  });

  test('should handle basic interactions', async ({ page }) => {
    await page.goto('/');

    // Test that clicking doesn't cause errors
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.focus();
    await expect(fileInput).toBeFocused();

    // Test basic page functionality without uploads
    const pageTitle = await page.title();
    expect(pageTitle).toBeTruthy();
  });
});
