import { chromium } from 'playwright';

async function testWorkoutUI() {
    console.log('🚀 Starting Zwift Workout Visualizer UI Test');
    
    const browser = await chromium.launch({ headless: false, slowMo: 1000 });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Listen for console messages and errors
    page.on('console', msg => {
        console.log(`📟 CONSOLE [${msg.type()}]: ${msg.text()}`);
    });
    
    page.on('pageerror', error => {
        console.error(`❌ PAGE ERROR: ${error.message}`);
    });
    
    try {
        console.log('🌐 Navigating to application...');
        await page.goto('http://localhost:53218', { waitUntil: 'networkidle' });
        
        // Wait for the page to load
        await page.waitForLoadState('domcontentloaded');
        
        console.log('📋 Checking initial page state...');
        
        // Check if upload section is visible
        const uploadSection = await page.locator('.upload-section').first();
        const isUploadVisible = await uploadSection.isVisible();
        console.log(`✅ Upload section visible: ${isUploadVisible}`);
        
        // Check if file input and sample button exist
        const fileInput = await page.locator('#fileInput').first();
        const sampleButton = await page.locator('#loadSample').first();
        const fileInputExists = await fileInput.count() > 0;
        const sampleButtonExists = await sampleButton.count() > 0;
        
        console.log(`📁 File input exists: ${fileInputExists}`);
        console.log(`🔘 Sample button exists: ${sampleButtonExists}`);
        
        if (sampleButtonExists) {
            const sampleButtonVisible = await sampleButton.isVisible();
            console.log(`🔘 Sample button visible: ${sampleButtonVisible}`);
        }
        
        // Check initial chart container state
        const chartContainer = await page.locator('.chart-container').first();
        const chartContainerExists = await chartContainer.count() > 0;
        const isChartContainerVisible = chartContainerExists ? await chartContainer.isVisible() : false;
        
        console.log(`📊 Chart container exists: ${chartContainerExists}`);
        console.log(`📊 Chart container initially visible: ${isChartContainerVisible}`);
        
        // Test sample workout loading
        console.log('🔄 Testing sample workout loading...');
        
        if (sampleButtonExists) {
            // Take screenshot before
            await page.screenshot({ path: 'before_sample_load.png', fullPage: true });
            
            // Click sample button
            console.log('🖱️ Clicking sample button...');
            await sampleButton.click();
            
            // Wait a moment for processing
            await page.waitForTimeout(3000);
            
            // Check if chart container becomes visible
            const chartVisibleAfterSample = await chartContainer.isVisible();
            console.log(`📊 Chart container visible after sample load: ${chartVisibleAfterSample}`);
            
            // Check for canvas element
            const workoutChart = await page.locator('#workoutChart').first();
            const chartExists = await workoutChart.count() > 0;
            const chartVisible = chartExists ? await workoutChart.isVisible() : false;
            
            console.log(`🎯 Canvas element exists: ${chartExists}`);
            console.log(`🎯 Canvas element visible: ${chartVisible}`);
            
            // Check for workout info display
            const workoutInfo = await page.locator('#workoutInfo').first();
            const workoutInfoVisible = await workoutInfo.isVisible();
            console.log(`ℹ️ Workout info visible: ${workoutInfoVisible}`);
            
            // Check for segment details
            const segmentDetails = await page.locator('#segmentDetails').first();
            const segmentDetailsVisible = await segmentDetails.isVisible();
            console.log(`📋 Segment details visible: ${segmentDetailsVisible}`);
            
            // Take screenshot after
            await page.screenshot({ path: 'after_sample_load.png', fullPage: true });
            
            // Check for any error messages or toast notifications
            const toastElement = await page.locator('#toastNotification').first();
            const toastVisible = await toastElement.isVisible();
            if (toastVisible) {
                const toastText = await toastElement.textContent();
                console.log(`📨 Toast message: "${toastText}"`);
            }
            
            // Check Chart.js loading
            const chartJsLoaded = await page.evaluate(() => {
                return typeof window.Chart !== 'undefined';
            });
            console.log(`📈 Chart.js loaded: ${chartJsLoaded}`);
            
            // Check if visualizer instance exists
            const visualizerExists = await page.evaluate(() => {
                return typeof window.visualizer !== 'undefined';
            });
            console.log(`🔧 Visualizer instance exists: ${visualizerExists}`);
            
            // Check for JavaScript errors in more detail
            const hasErrors = await page.evaluate(() => {
                // Check if there are any unhandled promise rejections or errors
                const errors = window.console && window.console.error ? 
                    window.console.error.toString().includes('error') : false;
                return errors;
            });
            console.log(`🐛 JavaScript errors detected: ${hasErrors}`);
            
            // Test chart canvas rendering
            if (chartExists && chartVisible) {
                const canvasData = await page.evaluate(() => {
                    const canvas = document.getElementById('workoutChart');
                    if (canvas) {
                        const ctx = canvas.getContext('2d');
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        // Check if canvas has any non-transparent pixels
                        let hasContent = false;
                        for (let i = 3; i < imageData.data.length; i += 4) {
                            if (imageData.data[i] > 0) { // Check alpha channel
                                hasContent = true;
                                break;
                            }
                        }
                        return {
                            width: canvas.width,
                            height: canvas.height,
                            hasContent: hasContent
                        };
                    }
                    return null;
                });
                
                if (canvasData) {
                    console.log(`🎨 Canvas dimensions: ${canvasData.width}x${canvasData.height}`);
                    console.log(`🎨 Canvas has rendered content: ${canvasData.hasContent}`);
                } else {
                    console.log('❌ Could not access canvas data');
                }
            }
            
            // Check network requests
            console.log('🌐 Monitoring network requests...');
            const responses = [];
            page.on('response', response => {
                if (response.url().includes('sample_workout.zwo')) {
                    responses.push({
                        url: response.url(),
                        status: response.status(),
                        ok: response.ok()
                    });
                    console.log(`📡 Sample workout request: ${response.status()} ${response.url()}`);
                }
            });
            
            // Wait a bit more to see if any delayed loading occurs
            console.log('⏱️ Waiting for potential delayed rendering...');
            await page.waitForTimeout(5000);
            
            // Final screenshot
            await page.screenshot({ path: 'final_state.png', fullPage: true });
            
            console.log('📊 Final UI state check:');
            console.log(`   Chart container visible: ${await chartContainer.isVisible()}`);
            console.log(`   Canvas visible: ${chartExists ? await workoutChart.isVisible() : 'N/A'}`);
            console.log(`   Workout info visible: ${await workoutInfo.isVisible()}`);
            console.log(`   Segment details visible: ${await segmentDetails.isVisible()}`);
        }
        
    } catch (error) {
        console.error('❌ Test failed with error:', error);
        await page.screenshot({ path: 'error_state.png', fullPage: true });
    } finally {
        console.log('🏁 Test completed. Closing browser...');
        await browser.close();
    }
}

// Run the test
testWorkoutUI().catch(console.error);