// Simple test to verify the graph fix
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

async function testGraphFix() {
    console.log('🔧 Testing graph fix...');
    
    const browser = await chromium.launch({ headless: false, slowMo: 500 });
    const page = await browser.newPage();
    
    try {
        // Navigate to the local application
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const htmlPath = path.join(__dirname, 'index.html');
        await page.goto(`file://${htmlPath}`);
        
        console.log('📄 Page loaded, creating test workout via chat...');
        
        // Wait for chat interface
        await page.waitForSelector('#chatInput', { timeout: 10000 });
        
        // Create a simple test workout
        await page.fill('#chatInput', '30 minute endurance ride');
        await page.click('button[type="submit"]');
        
        // Wait for the chart to appear
        await page.waitForSelector('#workoutChart', { visible: true, timeout: 15000 });
        
        console.log('📊 Chart loaded, analyzing the fix...');
        
        // Take screenshot after fix
        await page.screenshot({ 
            path: 'after_graph_fix.png', 
            fullPage: false,
            clip: { x: 0, y: 0, width: 1200, height: 800 }
        });
        
        // Get chart information
        const chartAnalysis = await page.evaluate(() => {
            const chart = window.visualizer?.ui?.chart;
            if (!chart) return { error: 'Chart not found' };
            
            const datasets = chart.data.datasets;
            return {
                datasetCount: datasets.length,
                mainDataset: {
                    label: datasets[0]?.label,
                    dataPointCount: datasets[0]?.data?.length,
                    firstPoint: datasets[0]?.data?.[0],
                    lastPoint: datasets[0]?.data?.[datasets[0]?.data?.length - 1],
                    hasSegmentInfo: datasets[0]?.data?.some(p => p.segmentType)
                }
            };
        });
        
        console.log('📈 Chart analysis after fix:');
        console.log(JSON.stringify(chartAnalysis, null, 2));
        
        // Test hover functionality
        console.log('🖱️ Testing hover...');
        const chart = await page.locator('#workoutChart');
        await chart.hover();
        await page.waitForTimeout(1000);
        
        // Test click functionality
        console.log('🎯 Testing click interaction...');
        await chart.click({ position: { x: 200, y: 100 } });
        await page.waitForTimeout(1000);
        
        const editBoxVisible = await page.isVisible('#segmentEditBox');
        console.log(`Segment edit box visible after click: ${editBoxVisible}`);
        
        console.log('✅ Graph fix test completed successfully');
        
    } catch (error) {
        console.error('❌ Error testing graph fix:', error);
        await page.screenshot({ path: 'error_after_fix.png' });
        throw error;
    } finally {
        await page.waitForTimeout(3000); // Keep browser open for visual inspection
        await browser.close();
    }
}

testGraphFix()
    .then(() => {
        console.log('🎉 Graph fix verification completed');
    })
    .catch(error => {
        console.error('💥 Graph fix test failed:', error);
        process.exit(1);
    });