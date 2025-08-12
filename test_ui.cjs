const { chromium } = require('playwright');

async function testUI() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Testing UI...');

  try {
    console.log('Navigating to http://localhost:53219');
    await page.goto('http://localhost:53219', { timeout: 10000 });

    const title = await page.title();
    console.log('Page title:', title);

    const html = await page.content();
    console.log('HTML length:', html.length);

    await page.screenshot({ path: 'ui_test.png' });
    console.log('Screenshot saved');
  } catch (error) {
    console.error('Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testUI();
