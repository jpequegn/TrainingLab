const { chromium } = require('playwright');

async function analyzeUI() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    console.log('=== UI Analysis Starting ===');
    
    const consoleMessages = [];
    page.on('console', msg => {
        consoleMessages.push({ type: msg.type(), text: msg.text() });
        if (msg.type() === 'error') {
            console.log('JS Error:', msg.text());
        }
    });
    
    try {
        await page.goto('http://localhost:53219', { 
            waitUntil: 'networkidle',
            timeout: 15000 
        });
        
        await page.waitForTimeout(2000);
        
        console.log('\n=== Element Analysis ===');
        const headerCount = await page.locator('h1, h2, h3').count();
        const buttonCount = await page.locator('button').count();
        const canvasCount = await page.locator('canvas').count();
        const svgCount = await page.locator('svg').count();
        const styleCount = await page.locator('link[rel="stylesheet"]').count();
        const scriptCount = await page.locator('script[src]').count();
        
        console.log('Headers:', headerCount);
        console.log('Buttons:', buttonCount);
        console.log('Canvas elements:', canvasCount);
        console.log('SVG elements:', svgCount);
        console.log('Stylesheets:', styleCount);
        console.log('Scripts:', scriptCount);
        
        const bodyText = await page.locator('body').textContent();
        console.log('Body text length:', bodyText ? bodyText.length : 0);
        
        const htmlContent = await page.content();
        console.log('HTML length:', htmlContent.length);
        
        await page.screenshot({ path: 'ui_analysis.png', fullPage: true });
        console.log('Screenshot saved');
        
        console.log('\nConsole errors:', consoleMessages.filter(m => m.type === 'error').length);
        
    } catch (error) {
        console.error('Analysis failed:', error.message);
    } finally {
        await browser.close();
    }
}

analyzeUI();
