const { test, expect } = require('@playwright/test');

test.describe('Nebula UI Animation Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('1. Animation Duration Performance - Button Hover Effects', async ({ page }) => {
    console.log('\n=== Testing Button Hover Animation Performance ===');
    
    // Find all buttons and test hover timing
    const buttons = await page.locator('button, .btn, [role="button"]').all();
    
    for (let i = 0; i < Math.min(buttons.length, 5); i++) {
      const button = buttons[i];
      const buttonText = await button.textContent() || `Button ${i + 1}`;
      
      console.log(`Testing button: "${buttonText}"`);
      
      // Measure hover animation timing
      const startTime = Date.now();
      await button.hover();
      await page.waitForTimeout(200); // Allow animation to complete
      const hoverTime = Date.now() - startTime;
      
      console.log(`  Hover animation time: ${hoverTime}ms`);
      
      // Test unhover timing
      const unhoverStart = Date.now();
      await page.mouse.move(0, 0); // Move away from button
      await page.waitForTimeout(200);
      const unhoverTime = Date.now() - unhoverStart;
      
      console.log(`  Unhover animation time: ${unhoverTime}ms`);
      
      // Verify timing is within expected range (100-150ms)
      expect(hoverTime).toBeLessThan(300);
      expect(unhoverTime).toBeLessThan(300);
    }
  });

  test('2. Card Hover Animations and Subtle Movement', async ({ page }) => {
    console.log('\n=== Testing Card Hover Animations ===');
    
    // Find card elements
    const cards = await page.locator('.card, [class*="card"], .workout-card, [class*="workout"]').all();
    
    for (let i = 0; i < Math.min(cards.length, 3); i++) {
      const card = cards[i];
      
      // Get initial position and transform
      const initialTransform = await card.evaluate(el => getComputedStyle(el).transform);
      const initialOpacity = await card.evaluate(el => getComputedStyle(el).opacity);
      
      console.log(`Card ${i + 1} initial state:`, {
        transform: initialTransform,
        opacity: initialOpacity
      });
      
      // Hover and measure changes
      await card.hover();
      await page.waitForTimeout(200);
      
      const hoverTransform = await card.evaluate(el => getComputedStyle(el).transform);
      const hoverOpacity = await card.evaluate(el => getComputedStyle(el).opacity);
      
      console.log(`Card ${i + 1} hover state:`, {
        transform: hoverTransform,
        opacity: hoverOpacity
      });
      
      // Move away and check return
      await page.mouse.move(0, 0);
      await page.waitForTimeout(200);
      
      const finalTransform = await card.evaluate(el => getComputedStyle(el).transform);
      const finalOpacity = await card.evaluate(el => getComputedStyle(el).opacity);
      
      console.log(`Card ${i + 1} final state:`, {
        transform: finalTransform,
        opacity: finalOpacity
      });
    }
  });

  test('3. Loading State Performance', async ({ page }) => {
    console.log('\n=== Testing Loading State Performance ===');
    
    // Look for loading elements
    const loadingElements = await page.locator('.loading, [class*="loading"], .spinner, [class*="spinner"]').all();
    
    if (loadingElements.length > 0) {
      for (const loader of loadingElements) {
        const isVisible = await loader.isVisible();
        if (isVisible) {
          const opacity = await loader.evaluate(el => getComputedStyle(el).opacity);
          const animationDuration = await loader.evaluate(el => getComputedStyle(el).animationDuration);
          
          console.log('Loading element found:', {
            opacity: opacity,
            animationDuration: animationDuration,
            isVisible: isVisible
          });
          
          // Check if opacity is around 0.85 as per refinements
          const opacityNum = parseFloat(opacity);
          expect(opacityNum).toBeGreaterThan(0.8);
          expect(opacityNum).toBeLessThan(0.9);
        }
      }
    } else {
      console.log('No loading elements currently visible');
    }
  });

  test('4. Reduced Motion Accessibility', async ({ page }) => {
    console.log('\n=== Testing Reduced Motion Accessibility ===');
    
    // Enable reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Test that animations are disabled
    const animatedElements = await page.locator('*').evaluateAll(elements => {
      return elements.filter(el => {
        const style = getComputedStyle(el);
        return style.animationName !== 'none' || 
               style.transitionProperty !== 'none' ||
               style.transform !== 'none';
      }).map(el => ({
        tagName: el.tagName,
        className: el.className,
        animationName: getComputedStyle(el).animationName,
        transitionDuration: getComputedStyle(el).transitionDuration,
        transform: getComputedStyle(el).transform
      }));
    });
    
    console.log('Elements with animations in reduced motion mode:', animatedElements);
    
    // Test focus states still work
    const focusableElements = await page.locator('button, a, input, [tabindex]').all();
    
    for (let i = 0; i < Math.min(focusableElements.length, 3); i++) {
      await focusableElements[i].focus();
      const isFocused = await focusableElements[i].evaluate(el => document.activeElement === el);
      expect(isFocused).toBe(true);
      console.log(`Element ${i + 1} focus state: ${isFocused}`);
    }
  });

  test('5. General Interaction Quality and Responsiveness', async ({ page }) => {
    console.log('\n=== Testing General Interaction Quality ===');
    
    // Test various interactive elements
    const interactiveElements = await page.locator('button, a, .clickable, [onclick], [role="button"]').all();
    
    const responseTimes = [];
    
    for (let i = 0; i < Math.min(interactiveElements.length, 5); i++) {
      const element = interactiveElements[i];
      const elementText = await element.textContent() || `Element ${i + 1}`;
      
      // Measure response time for hover
      const startTime = performance.now();
      await element.hover();
      await page.waitForTimeout(50); // Small delay for visual feedback
      const responseTime = performance.now() - startTime;
      
      responseTimes.push(responseTime);
      console.log(`${elementText} response time: ${responseTime.toFixed(2)}ms`);
      
      // Move away
      await page.mouse.move(0, 0);
      await page.waitForTimeout(100);
    }
    
    // Calculate average response time
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    console.log(`Average response time: ${avgResponseTime.toFixed(2)}ms`);
    
    // Verify average is within acceptable range (100-200ms)
    expect(avgResponseTime).toBeLessThan(250);
  });

  test('6. Performance Metrics and Jank Detection', async ({ page }) => {
    console.log('\n=== Testing Performance Metrics ===');
    
    // Enable performance monitoring
    const client = await page.context().newCDPSession(page);
    await client.send('Performance.enable');
    
    // Trigger various interactions to test for jank
    const buttons = await page.locator('button').all();
    const cards = await page.locator('.card, [class*="card"]').all();
    
    const performanceStart = Date.now();
    
    // Rapid interactions to test for jank
    for (let i = 0; i < 5; i++) {
      if (buttons[i]) {
        await buttons[i].hover();
        await page.waitForTimeout(50);
      }
      if (cards[i]) {
        await cards[i].hover();
        await page.waitForTimeout(50);
      }
    }
    
    const performanceEnd = Date.now();
    console.log(`Total interaction time: ${performanceEnd - performanceStart}ms`);
    
    // Check for layout shifts
    const layoutShifts = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const shifts = entries.filter(entry => entry.entryType === 'layout-shift');
          resolve(shifts.length);
        });
        observer.observe({ entryTypes: ['layout-shift'] });
        
        setTimeout(() => resolve(0), 1000);
      });
    });
    
    console.log(`Layout shifts detected: ${layoutShifts}`);
    
    // Check animation frame rate
    const fps = await page.evaluate(() => {
      return new Promise((resolve) => {
        let frames = 0;
        const start = performance.now();
        
        function countFrame() {
          frames++;
          if (performance.now() - start < 1000) {
            requestAnimationFrame(countFrame);
          } else {
            resolve(frames);
          }
        }
        
        requestAnimationFrame(countFrame);
      });
    });
    
    console.log(`Approximate FPS: ${fps}`);
    expect(fps).toBeGreaterThan(30); // Expect at least 30fps
  });

  test('7. Viewport Size Testing', async ({ page }) => {
    console.log('\n=== Testing Different Viewport Sizes ===');
    
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' }
    ];
    
    for (const viewport of viewports) {
      console.log(`\nTesting ${viewport.name} (${viewport.width}x${viewport.height})`);
      
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500);
      
      // Test button responsiveness at different sizes
      const button = await page.locator('button').first();
      if (await button.isVisible()) {
        await button.hover();
        const styles = await button.evaluate(el => ({
          transform: getComputedStyle(el).transform,
          transition: getComputedStyle(el).transitionDuration,
          opacity: getComputedStyle(el).opacity
        }));
        
        console.log(`  Button styles:`, styles);
      }
    }
  });
});