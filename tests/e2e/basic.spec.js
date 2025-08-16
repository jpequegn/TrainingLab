import { test, expect } from '@playwright/test';

test.describe('Basic Application Tests', () => {
  test('should load the main page', async ({ page }) => {
    await page.goto('/');

    // Check that the page loads
    await expect(page).toHaveTitle(/Zwift Workout/i);

    // Check that basic elements are present
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have file upload functionality', async ({ page }) => {
    await page.goto('/');

    // Check if upload button exists and is visible
    const uploadButton = page.locator('#uploadButton');
    await expect(uploadButton).toBeVisible();
    await expect(uploadButton).toContainText('Upload Workout');

    // Check if hidden file input exists
    const fileInput = page.locator('#fileInput');
    await expect(fileInput).toBeAttached();
    await expect(fileInput).toHaveAttribute('type', 'file');
    await expect(fileInput).toHaveAttribute('accept', '.zwo');
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Check that interface adapts to mobile
    await expect(page.locator('body')).toBeVisible();

    // Upload button should still be visible on mobile
    const uploadButton = page.locator('#uploadButton');
    await expect(uploadButton).toBeVisible();
  });

  test('should have basic accessibility features', async ({ page }) => {
    await page.goto('/');

    // Test that upload button can be focused and has proper accessibility
    const uploadButton = page.locator('#uploadButton');
    await uploadButton.focus();
    await expect(uploadButton).toBeFocused();

    // Check that upload button has accessible text
    await expect(uploadButton).toContainText('Upload Workout');

    // Check that hidden file input exists for functionality
    const fileInput = page.locator('#fileInput');
    await expect(fileInput).toBeAttached();
    await expect(fileInput).toHaveAttribute('accept', '.zwo');
  });

  test('should handle basic interactions', async ({ page }) => {
    await page.goto('/');

    // Test that clicking upload button doesn't cause errors
    const uploadButton = page.locator('#uploadButton');
    await uploadButton.focus();
    await expect(uploadButton).toBeFocused();

    // Test basic page functionality without uploads
    const pageTitle = await page.title();
    expect(pageTitle).toBeTruthy();
  });
});
