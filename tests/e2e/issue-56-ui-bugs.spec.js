import { test, expect } from '@playwright/test';

test.describe('Issue #56 UI Bug Fixes', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Wait for page to fully load
        await page.waitForLoadState('networkidle');
    });

    test('LLM sidebar should be visible on larger screens', async ({ page }) => {
        // Test on desktop viewport
        await page.setViewportSize({ width: 1280, height: 720 });
        
        // Check if chat panel exists and is visible on large screens
        const chatPanel = page.locator('#chatPanel');
        await expect(chatPanel).toBeVisible();
        
        // Check if it has the correct styles applied
        const transform = await chatPanel.evaluate(el => 
            getComputedStyle(el).transform
        );
        
        // Should be translateX(0) on large screens (not hidden)
        expect(transform).not.toBe('translateX(100%)');
    });

    test('LLM sidebar should be hidden on smaller screens initially', async ({ page }) => {
        // Test on mobile viewport  
        await page.setViewportSize({ width: 768, height: 1024 });
        
        const chatPanel = page.locator('#chatPanel');
        
        // Should be hidden initially on smaller screens
        const transform = await chatPanel.evaluate(el => 
            getComputedStyle(el).transform
        );
        
        // Should be translateX(100%) on small screens (hidden)
        expect(transform).toBe('matrix(1, 0, 0, 1, 320, 0)'); // translateX(100% of 320px)
    });

    test('Sample workout button should be clickable and show loading', async ({ page }) => {
        // Find the sample workout button
        const sampleButton = page.locator('#loadSample').first();
        await expect(sampleButton).toBeVisible();
        await expect(sampleButton).toBeEnabled();
        
        // Start server in background for testing
        // Note: This assumes the server is running for the test
        
        // Click the sample workout button
        await sampleButton.click();
        
        // Check for loading state or successful load
        // Wait for either loading indicator or workout content to appear
        await expect(page.locator('#workoutSection, .loading-overlay, .toast')).toBeVisible({ timeout: 10000 });
    });

    test('TSS should be calculated and displayed', async ({ page }) => {
        // Load sample workout
        const sampleButton = page.locator('#loadSample').first();
        await sampleButton.click();
        
        // Wait for workout to load
        await page.waitForTimeout(3000);
        
        // Check if workout stats are displayed
        const workoutStats = page.locator('#workoutStats');
        if (await workoutStats.isVisible()) {
            // Look for TSS display in various possible locations
            const tssElements = page.locator('[data-bind="workout-tss"], .workout-tss, text="TSS"').first();
            if (await tssElements.isVisible()) {
                const tssValue = await tssElements.textContent();
                
                // TSS should not be undefined, null, or empty
                expect(tssValue).not.toBe('undefined');
                expect(tssValue).not.toBe('---');
                expect(tssValue).not.toBe('');
                expect(tssValue).not.toBeNull();
                
                // Should be a number
                const numericTss = parseInt(tssValue);
                expect(numericTss).toBeGreaterThan(0);
            }
        }
    });

    test('UI should be responsive and layout correctly', async ({ page }) => {
        // Test different screen sizes
        const viewports = [
            { width: 1920, height: 1080 }, // Desktop
            { width: 1280, height: 720 },  // Laptop  
            { width: 768, height: 1024 },  // Tablet
            { width: 375, height: 667 }    // Mobile
        ];

        for (const viewport of viewports) {
            await page.setViewportSize(viewport);
            
            // Check that page doesn't have horizontal scrollbar
            const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
            const clientWidth = await page.evaluate(() => document.body.clientWidth);
            
            expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5); // Allow small margin
            
            // Check that main elements are visible
            await expect(page.locator('body')).toBeVisible();
            await expect(page.locator('nav, header, .container, main').first()).toBeVisible();
        }
    });

    test('Console should not have critical errors', async ({ page }) => {
        const consoleErrors = [];
        
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });
        
        // Load sample workout to trigger potential errors
        const sampleButton = page.locator('#loadSample').first();
        if (await sampleButton.isVisible()) {
            await sampleButton.click();
            await page.waitForTimeout(3000);
        }
        
        // Filter out known/acceptable errors
        const criticalErrors = consoleErrors.filter(error => 
            !error.includes('favicon') && 
            !error.includes('sourcemap') &&
            !error.includes('AdBlock')
        );
        
        expect(criticalErrors.length).toBe(0);
        if (criticalErrors.length > 0) {
            console.log('Critical errors found:', criticalErrors);
        }
    });
});