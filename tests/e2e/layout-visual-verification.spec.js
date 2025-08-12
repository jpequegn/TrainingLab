import { test } from '@playwright/test';

test.describe('Layout Visual Verification', () => {
  test('should capture layout at different screen sizes', async ({ page }) => {
    // Test different screen sizes and capture screenshots
    const viewports = [
      { width: 1920, height: 1080, name: 'fullhd' },
      { width: 1366, height: 768, name: 'laptop' },
      { width: 1280, height: 720, name: 'default' },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await page.goto('http://localhost:8000');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Take full page screenshot
      await page.screenshot({
        path: `test-results/layout-${viewport.name}-${viewport.width}x${viewport.height}.png`,
        fullPage: true,
      });

      console.log(
        `Screenshot captured for ${viewport.name} (${viewport.width}x${viewport.height})`
      );
    }
  });

  test('should load sample workout and capture chart', async ({ page }) => {
    await page.goto('http://localhost:8000');
    await page.waitForLoadState('networkidle');

    // Click sample button
    const sampleButton = page.locator('button:has-text("Sample")');
    if ((await sampleButton.count()) > 0) {
      await sampleButton.click();
      await page.waitForTimeout(3000);

      // Take screenshot with chart loaded
      await page.screenshot({
        path: 'test-results/layout-with-chart.png',
        fullPage: true,
      });

      console.log('Screenshot captured with chart loaded');
    }
  });

  test('should measure layout dimensions', async ({ page }) => {
    await page.goto('http://localhost:8000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Get basic layout information without using eval()
    const viewport = page.viewportSize();
    console.log('Viewport:', viewport);

    // Check main container
    const mainContainer = page
      .locator('body > div:first-child, main, .container')
      .first();
    if ((await mainContainer.count()) > 0) {
      const containerBox = await mainContainer.boundingBox();
      console.log('Main container:', containerBox);
    }

    // Check upload section
    const uploadButton = page.locator('button:has-text("Upload")').first();
    if ((await uploadButton.count()) > 0) {
      const uploadBox = await uploadButton.boundingBox();
      console.log('Upload button:', uploadBox);
    }

    // Check file input
    const fileInput = page.locator('input[type="file"]').first();
    if ((await fileInput.count()) > 0) {
      const fileInputBox = await fileInput.boundingBox();
      console.log('File input:', fileInputBox);
    }

    // Check chat panel (assuming it's on the right side)
    const chatElements = page.locator(
      '[class*="chat"], [class*="panel"], [class*="sidebar"]'
    );
    if ((await chatElements.count()) > 0) {
      for (let i = 0; i < (await chatElements.count()); i++) {
        const chatBox = await chatElements.nth(i).boundingBox();
        if (chatBox && chatBox.width > 200) {
          console.log(`Chat/Panel element ${i}:`, chatBox);
        }
      }
    }
  });
});
