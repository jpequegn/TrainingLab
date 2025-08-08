// Direct Node.js script to test Nebula UI animations using Playwright
const { chromium } = require('playwright');

async function testNebulaAnimations() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    console.log('🚀 Starting Nebula UI Animation Performance Tests\n');
    
    try {
        // Navigate to the application
        console.log('📱 Connecting to http://localhost:3000...');
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
        console.log('✅ Page loaded successfully\n');

        // Test 1: Animation Duration Performance
        console.log('🎯 Test 1: Animation Duration Performance');
        const buttons = await page.$$('button, .btn, [role="button"]');
        
        if (buttons.length > 0) {
            for (let i = 0; i < Math.min(buttons.length, 3); i++) {
                const button = buttons[i];
                const buttonText = await button.textContent() || `Button ${i + 1}`;
                
                console.log(`  Testing: "${buttonText.trim()}"`);
                
                // Measure hover timing
                const startTime = Date.now();
                await button.hover();
                await page.waitForTimeout(200);
                const hoverTime = Date.now() - startTime;
                
                // Check for transform/transition properties
                const styles = await button.evaluate(el => ({
                    transition: getComputedStyle(el).transitionDuration,
                    transform: getComputedStyle(el).transform,
                    opacity: getComputedStyle(el).opacity
                }));
                
                console.log(`    Hover response: ${hoverTime}ms`);
                console.log(`    Transition duration: ${styles.transition}`);
                console.log(`    Transform: ${styles.transform}`);
                console.log(`    Opacity: ${styles.opacity}`);
                
                // Move away
                await page.mouse.move(0, 0);
                await page.waitForTimeout(100);
            }
        } else {
            console.log('  ⚠️ No buttons found');
        }

        // Test 2: Card Hover Animations
        console.log('\n🎯 Test 2: Card Hover Animations');
        const cards = await page.$$('.card, [class*="card"], .workout-card, [class*="workout"]');
        
        if (cards.length > 0) {
            for (let i = 0; i < Math.min(cards.length, 2); i++) {
                const card = cards[i];
                console.log(`  Testing Card ${i + 1}`);
                
                // Get initial state
                const initialState = await card.evaluate(el => ({
                    transform: getComputedStyle(el).transform,
                    opacity: getComputedStyle(el).opacity,
                    boxShadow: getComputedStyle(el).boxShadow
                }));
                
                console.log('    Initial state:', initialState);
                
                // Hover and check changes
                await card.hover();
                await page.waitForTimeout(200);
                
                const hoverState = await card.evaluate(el => ({
                    transform: getComputedStyle(el).transform,
                    opacity: getComputedStyle(el).opacity,
                    boxShadow: getComputedStyle(el).boxShadow
                }));
                
                console.log('    Hover state:', hoverState);
                
                // Check if subtle animation occurred
                const hasTransformChange = initialState.transform !== hoverState.transform;
                const hasOpacityChange = initialState.opacity !== hoverState.opacity;
                const hasShadowChange = initialState.boxShadow !== hoverState.boxShadow;
                
                console.log(`    Animation detected: ${hasTransformChange || hasOpacityChange || hasShadowChange ? '✅' : '❌'}`);
                
                await page.mouse.move(0, 0);
                await page.waitForTimeout(100);
            }
        } else {
            console.log('  ⚠️ No cards found');
        }

        // Test 3: Loading States
        console.log('\n🎯 Test 3: Loading State Performance');
        const loadingElements = await page.$$('.loading, [class*="loading"], .spinner, [class*="spinner"]');
        
        if (loadingElements.length > 0) {
            for (const loader of loadingElements) {
                const isVisible = await loader.isVisible();
                if (isVisible) {
                    const styles = await loader.evaluate(el => ({
                        opacity: getComputedStyle(el).opacity,
                        animationDuration: getComputedStyle(el).animationDuration,
                        animationName: getComputedStyle(el).animationName
                    }));
                    
                    console.log('  Loading element found:');
                    console.log('    Opacity:', styles.opacity);
                    console.log('    Animation duration:', styles.animationDuration);
                    console.log('    Animation name:', styles.animationName);
                    
                    // Check if opacity is around 0.85 (Nebula refinement)
                    const opacity = parseFloat(styles.opacity);
                    if (opacity >= 0.8 && opacity <= 0.9) {
                        console.log('    ✅ Nebula loading opacity refinement detected');
                    }
                }
            }
        } else {
            console.log('  ℹ️ No loading elements currently visible');
        }

        // Test 4: Reduced Motion Accessibility
        console.log('\n🎯 Test 4: Reduced Motion Accessibility');
        
        // Enable reduced motion
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.reload({ waitUntil: 'networkidle' });
        
        // Check for animations still running
        const elementsWithAnimations = await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('*'));
            return elements.filter(el => {
                const styles = getComputedStyle(el);
                return styles.animationName !== 'none' || 
                       styles.transitionDuration !== '0s';
            }).map(el => ({
                tagName: el.tagName,
                className: el.className,
                animationName: getComputedStyle(el).animationName,
                transitionDuration: getComputedStyle(el).transitionDuration
            }));
        });
        
        console.log(`  Elements with animations in reduced motion: ${elementsWithAnimations.length}`);
        if (elementsWithAnimations.length > 0) {
            console.log('  ⚠️ Some animations may still be active in reduced motion mode');
            elementsWithAnimations.slice(0, 3).forEach((el, i) => {
                console.log(`    ${i + 1}. ${el.tagName}.${el.className}: ${el.animationName}, ${el.transitionDuration}`);
            });
        } else {
            console.log('  ✅ All animations properly disabled in reduced motion mode');
        }

        // Reset reduced motion
        await page.emulateMedia({ reducedMotion: 'no-preference' });

        // Test 5: Performance Metrics
        console.log('\n🎯 Test 5: Performance Metrics');
        
        // Test rapid interactions for jank
        const testButtons = await page.$$('button');
        const testCards = await page.$$('.card, [class*="card"]');
        
        const interactionStart = Date.now();
        
        for (let i = 0; i < 5; i++) {
            if (testButtons[i]) {
                await testButtons[i].hover();
                await page.waitForTimeout(20);
            }
            if (testCards[i]) {
                await testCards[i].hover();
                await page.waitForTimeout(20);
            }
        }
        
        const interactionTime = Date.now() - interactionStart;
        console.log(`  Rapid interaction test completed in: ${interactionTime}ms`);
        console.log(`  ${interactionTime < 500 ? '✅' : '⚠️'} Performance ${interactionTime < 500 ? 'excellent' : 'needs attention'}`);

        // Test different viewport sizes
        console.log('\n🎯 Test 6: Viewport Responsiveness');
        const viewports = [
            { width: 1920, height: 1080, name: 'Desktop' },
            { width: 768, height: 1024, name: 'Tablet' },
            { width: 375, height: 667, name: 'Mobile' }
        ];
        
        for (const viewport of viewports) {
            console.log(`  Testing ${viewport.name} (${viewport.width}x${viewport.height})`);
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            await page.waitForTimeout(300);
            
            const button = await page.$('button');
            if (button) {
                await button.hover();
                const responsiveStyles = await button.evaluate(el => ({
                    transition: getComputedStyle(el).transitionDuration,
                    transform: getComputedStyle(el).transform
                }));
                
                console.log(`    Transition: ${responsiveStyles.transition}, Transform: ${responsiveStyles.transform !== 'none' ? 'Active' : 'None'}`);
            }
        }

        // Test 7: Overall Animation Quality Assessment
        console.log('\n🎯 Test 7: Overall Animation Quality Assessment');
        
        // Reset to standard desktop view
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.waitForTimeout(200);
        
        // Get overall page styles
        const pageAnimations = await page.evaluate(() => {
            const allElements = Array.from(document.querySelectorAll('*'));
            const animatedElements = allElements.filter(el => {
                const styles = getComputedStyle(el);
                return styles.transitionDuration !== '0s' || styles.animationName !== 'none';
            });
            
            return {
                totalElements: allElements.length,
                animatedElements: animatedElements.length,
                percentage: ((animatedElements.length / allElements.length) * 100).toFixed(1)
            };
        });
        
        console.log(`  Total elements: ${pageAnimations.totalElements}`);
        console.log(`  Elements with animations: ${pageAnimations.animatedElements}`);
        console.log(`  Animation coverage: ${pageAnimations.percentage}%`);
        
        // Check for Nebula-specific characteristics
        const nebulaCheck = await page.evaluate(() => {
            // Look for minimal, fast transitions
            const buttons = Array.from(document.querySelectorAll('button'));
            const cards = Array.from(document.querySelectorAll('.card, [class*="card"]'));
            
            const buttonTransitions = buttons.map(btn => {
                const duration = getComputedStyle(btn).transitionDuration;
                return parseFloat(duration) || 0;
            });
            
            const cardTransitions = cards.map(card => {
                const duration = getComputedStyle(card).transitionDuration;
                return parseFloat(duration) || 0;
            });
            
            const avgButtonDuration = buttonTransitions.length ? 
                buttonTransitions.reduce((a, b) => a + b, 0) / buttonTransitions.length : 0;
            const avgCardDuration = cardTransitions.length ? 
                cardTransitions.reduce((a, b) => a + b, 0) / cardTransitions.length : 0;
            
            return {
                avgButtonDuration: (avgButtonDuration * 1000).toFixed(0), // Convert to ms
                avgCardDuration: (avgCardDuration * 1000).toFixed(0),
                fastAnimations: avgButtonDuration <= 0.2 && avgCardDuration <= 0.3 // 200ms or less
            };
        });
        
        console.log(`  Average button transition: ${nebulaCheck.avgButtonDuration}ms`);
        console.log(`  Average card transition: ${nebulaCheck.avgCardDuration}ms`);
        console.log(`  Nebula "minimal and snappy" criteria: ${nebulaCheck.fastAnimations ? '✅ Met' : '❌ Not met'}`);
        
        console.log('\n📊 Final Assessment:');
        
        // Summary evaluation
        const evaluation = {
            animationTiming: nebulaCheck.fastAnimations ? 'EXCELLENT' : 'NEEDS WORK',
            accessibility: elementsWithAnimations.length === 0 ? 'EXCELLENT' : 'GOOD',
            performance: interactionTime < 500 ? 'EXCELLENT' : 'GOOD',
            responsiveness: 'GOOD', // Based on viewport tests
            nebulaCompliance: nebulaCheck.fastAnimations ? 'HIGH' : 'MEDIUM'
        };
        
        console.log('  Animation Timing:', evaluation.animationTiming);
        console.log('  Accessibility:', evaluation.accessibility);
        console.log('  Performance:', evaluation.performance);
        console.log('  Responsiveness:', evaluation.responsiveness);
        console.log('  Nebula UI Compliance:', evaluation.nebulaCompliance);
        
        const overallScore = Object.values(evaluation).filter(v => v === 'EXCELLENT').length;
        console.log(`\n🏆 Overall Score: ${overallScore}/5 categories rated EXCELLENT`);
        
        if (overallScore >= 4) {
            console.log('✅ Nebula UI animation refinements are highly successful!');
        } else if (overallScore >= 3) {
            console.log('✅ Nebula UI animation refinements are successful with minor improvements needed');
        } else {
            console.log('⚠️ Nebula UI animation refinements need additional work');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

// Run the tests
testNebulaAnimations().catch(console.error);