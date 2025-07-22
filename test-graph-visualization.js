// Playwright test to diagnose workout graph visualization issues
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

async function testGraphVisualization() {
    console.log('🔍 Starting graph visualization diagnostic...');
    
    const browser = await chromium.launch({ headless: false, slowMo: 1000 });
    const page = await browser.newPage();
    
    try {
        // Navigate to the local application
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const htmlPath = path.join(__dirname, 'index.html');
        await page.goto(`file://${htmlPath}`);
        
        console.log('📄 Page loaded, waiting for elements...');
        
        // Wait for the page to load
        await page.waitForLoadState('networkidle');
        
        // Create a test workout to visualize the issue
        console.log('🏋️ Creating test workout via chat interface...');
        
        // Try to interact with chat first, but fall back to loading sample if chat isn't available
        try {
            await page.waitForSelector('#chatInput', { timeout: 5000 });
            await page.fill('#chatInput', '4x5 minute threshold intervals');
            await page.click('button[type="submit"]');
            await page.waitForSelector('.chart-container', { visible: true, timeout: 10000 });
        } catch (error) {
            console.log('💡 Chat not available, loading sample workout instead...');
            await page.click('#loadSample');
            await page.waitForSelector('.chart-container', { visible: true, timeout: 10000 });
        }
        
        console.log('📊 Chart loaded, analyzing visualization...');
        
        // Take screenshot before analysis
        await page.screenshot({ 
            path: 'before_graph_fix.png', 
            fullPage: false,
            clip: { x: 0, y: 0, width: 1200, height: 800 }
        });
        
        // Get chart canvas for analysis
        const chartCanvas = await page.locator('#workoutChart');
        await chartCanvas.screenshot({ path: 'chart_before_fix.png' });
        
        // Analyze chart data structure
        const chartInfo = await page.evaluate(() => {
            const chart = window.visualizer?.ui?.chart;
            if (!chart) return { error: 'Chart not found' };
            
            const datasets = chart.data.datasets;
            const info = {
                datasetCount: datasets.length,
                datasets: datasets.map((dataset, i) => ({
                    label: dataset.label,
                    dataCount: dataset.data.length,
                    firstPoint: dataset.data[0],
                    lastPoint: dataset.data[dataset.data.length - 1],
                    fill: dataset.fill,
                    borderColor: dataset.borderColor,
                    backgroundColor: dataset.backgroundColor
                })),
                xAxisRange: {
                    min: chart.scales.x?.min,
                    max: chart.scales.x?.max
                },
                yAxisRange: {
                    min: chart.scales.y?.min, 
                    max: chart.scales.y?.max
                }
            };
            
            return info;
        });
        
        console.log('📈 Chart analysis results:');
        console.log(JSON.stringify(chartInfo, null, 2));
        
        // Check for overlapping issues
        const overlapAnalysis = await page.evaluate(() => {
            const chart = window.visualizer?.ui?.chart;
            if (!chart) return { error: 'Chart not found' };
            
            const datasets = chart.data.datasets;
            const issues = [];
            
            // Check for time overlaps between datasets
            for (let i = 0; i < datasets.length; i++) {
                for (let j = i + 1; j < datasets.length; j++) {
                    const ds1 = datasets[i];
                    const ds2 = datasets[j];
                    
                    // Check if datasets have overlapping time ranges
                    const ds1Times = ds1.data.map(p => p.x).sort((a, b) => a - b);
                    const ds2Times = ds2.data.map(p => p.x).sort((a, b) => a - b);
                    
                    const ds1Min = ds1Times[0];
                    const ds1Max = ds1Times[ds1Times.length - 1];
                    const ds2Min = ds2Times[0];
                    const ds2Max = ds2Times[ds2Times.length - 1];
                    
                    if ((ds1Min <= ds2Max && ds1Max >= ds2Min)) {
                        issues.push({
                            type: 'time_overlap',
                            datasets: [ds1.label, ds2.label],
                            ds1Range: [ds1Min, ds1Max],
                            ds2Range: [ds2Min, ds2Max]
                        });
                    }
                }
            }
            
            // Check for duplicate points at same time
            const allPoints = [];
            datasets.forEach((dataset, dsIndex) => {
                dataset.data.forEach(point => {
                    allPoints.push({
                        x: point.x,
                        y: point.y,
                        dataset: dataset.label,
                        dsIndex
                    });
                });
            });
            
            // Group by x coordinate to find duplicates
            const timeGroups = {};
            allPoints.forEach(point => {
                if (!timeGroups[point.x]) timeGroups[point.x] = [];
                timeGroups[point.x].push(point);
            });
            
            const duplicatePoints = Object.keys(timeGroups)
                .filter(time => timeGroups[time].length > 1)
                .map(time => ({
                    time: parseFloat(time),
                    points: timeGroups[time]
                }));
            
            return {
                overlapIssues: issues,
                duplicatePointsCount: duplicatePoints.length,
                duplicatePoints: duplicatePoints.slice(0, 5), // First 5 examples
                totalDataPoints: allPoints.length
            };
        });
        
        console.log('🔍 Overlap analysis:');
        console.log(JSON.stringify(overlapAnalysis, null, 2));
        
        // Test hover functionality
        console.log('🖱️ Testing hover functionality...');
        const chartElement = await page.locator('#workoutChart');
        await chartElement.hover();
        
        // Check if power box appears
        const powerBoxVisible = await page.isVisible('#hoverPowerBox');
        console.log(`Power box visible on hover: ${powerBoxVisible}`);
        
        // Try clicking on different parts of the chart
        console.log('🎯 Testing chart interaction...');
        const chartBounds = await chartElement.boundingBox();
        if (chartBounds) {
            // Click at 25%, 50%, and 75% of the chart width
            for (const percent of [0.25, 0.5, 0.75]) {
                const x = chartBounds.x + (chartBounds.width * percent);
                const y = chartBounds.y + (chartBounds.height * 0.5);
                
                await page.mouse.click(x, y);
                await page.waitForTimeout(500);
                
                // Check if segment edit box appears
                const editBoxVisible = await page.isVisible('#segmentEditBox');
                console.log(`Click at ${Math.round(percent * 100)}%: Edit box visible = ${editBoxVisible}`);
            }
        }
        
        console.log('✅ Graph diagnostic completed');
        
        return {
            chartInfo,
            overlapAnalysis,
            powerBoxVisible,
            screenshots: ['before_graph_fix.png', 'chart_before_fix.png']
        };
        
    } catch (error) {
        console.error('❌ Error during graph diagnostic:', error);
        await page.screenshot({ path: 'error_screenshot.png' });
        throw error;
    } finally {
        await browser.close();
    }
}

// Run the test
testGraphVisualization()
    .then(results => {
        console.log('🎉 Diagnostic complete. Results saved to files.');
        console.log('Screenshots taken:', results.screenshots);
    })
    .catch(error => {
        console.error('💥 Diagnostic failed:', error);
        process.exit(1);
    });