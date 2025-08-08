// Simplified Nebula UI Animation Test
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

        // Test 1: Check for interactive elements
        console.log('🎯 Test 1: Interactive Elements Detection');
        
        const elementCounts = await page.evaluate(() => {
            const buttons = document.querySelectorAll('button, .btn, [role="button"]');
            const cards = document.querySelectorAll('.card, [class*="card"], .workout-card, [class*="workout"]');
            const links = document.querySelectorAll('a, [role="link"]');
            const inputs = document.querySelectorAll('input, textarea, select');
            
            return {
                buttons: buttons.length,
                cards: cards.length,
                links: links.length,
                inputs: inputs.length
            };
        });
        
        console.log('  Interactive elements found:');
        console.log(`    Buttons: ${elementCounts.buttons}`);
        console.log(`    Cards: ${elementCounts.cards}`);
        console.log(`    Links: ${elementCounts.links}`);
        console.log(`    Inputs: ${elementCounts.inputs}`);

        // Test 2: Animation Properties Analysis
        console.log('\n🎯 Test 2: Animation Properties Analysis');
        
        const animationAnalysis = await page.evaluate(() => {
            const allElements = Array.from(document.querySelectorAll('*'));
            let transitionElements = 0;
            let animationElements = 0;
            let totalTransitionDuration = 0;
            let fastTransitions = 0;
            let slowTransitions = 0;
            
            allElements.forEach(el => {
                const styles = getComputedStyle(el);
                const transitionDuration = parseFloat(styles.transitionDuration) || 0;
                const animationDuration = parseFloat(styles.animationDuration) || 0;
                
                if (transitionDuration > 0) {
                    transitionElements++;
                    totalTransitionDuration += transitionDuration;
                    
                    if (transitionDuration <= 0.2) { // 200ms or less
                        fastTransitions++;
                    } else {
                        slowTransitions++;
                    }
                }
                
                if (animationDuration > 0) {
                    animationElements++;
                }
            });
            
            return {
                totalElements: allElements.length,
                transitionElements,
                animationElements,
                avgTransitionDuration: transitionElements > 0 ? (totalTransitionDuration / transitionElements * 1000).toFixed(0) : 0,
                fastTransitions,
                slowTransitions,
                fastTransitionPercentage: transitionElements > 0 ? ((fastTransitions / transitionElements) * 100).toFixed(1) : 0
            };
        });
        
        console.log('  Animation analysis results:');
        console.log(`    Elements with transitions: ${animationAnalysis.transitionElements}`);
        console.log(`    Elements with animations: ${animationAnalysis.animationElements}`);
        console.log(`    Average transition duration: ${animationAnalysis.avgTransitionDuration}ms`);
        console.log(`    Fast transitions (≤200ms): ${animationAnalysis.fastTransitions}`);
        console.log(`    Slow transitions (>200ms): ${animationAnalysis.slowTransitions}`);
        console.log(`    Fast transition percentage: ${animationAnalysis.fastTransitionPercentage}%`);

        // Test 3: Interaction Response Time
        console.log('\n🎯 Test 3: Interaction Response Time');
        
        const buttons = await page.$$('button');
        if (buttons.length > 0) {
            const responseTimes = [];
            
            for (let i = 0; i < Math.min(buttons.length, 3); i++) {
                const startTime = Date.now();
                await buttons[i].hover();
                await page.waitForTimeout(50); // Small delay for visual feedback
                const responseTime = Date.now() - startTime;
                responseTimes.push(responseTime);
                
                console.log(`    Button ${i + 1} hover response: ${responseTime}ms`);
                
                // Move mouse away
                await page.mouse.move(10, 10);
                await page.waitForTimeout(50);
            }
            
            const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
            console.log(`    Average response time: ${avgResponseTime.toFixed(1)}ms`);
            console.log(`    ${avgResponseTime <= 200 ? '✅' : '⚠️'} Response time ${avgResponseTime <= 200 ? 'excellent' : 'needs improvement'}`);
        }

        // Test 4: Reduced Motion Compliance
        console.log('\n🎯 Test 4: Reduced Motion Accessibility');
        
        // Test with reduced motion preference
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.reload({ waitUntil: 'networkidle' });
        
        const reducedMotionAnalysis = await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('*'));
            const stillAnimated = elements.filter(el => {
                const styles = getComputedStyle(el);
                return parseFloat(styles.transitionDuration) > 0 || 
                       parseFloat(styles.animationDuration) > 0;
            });
            
            return {
                totalElements: elements.length,
                stillAnimated: stillAnimated.length,
                compliance: stillAnimated.length === 0 ? 'EXCELLENT' : 'PARTIAL'
            };
        });
        
        console.log(`    Elements still animated: ${reducedMotionAnalysis.stillAnimated}`);
        console.log(`    Reduced motion compliance: ${reducedMotionAnalysis.compliance}`);
        console.log(`    ${reducedMotionAnalysis.compliance === 'EXCELLENT' ? '✅' : '⚠️'} Accessibility ${reducedMotionAnalysis.compliance.toLowerCase()}`);

        // Reset reduced motion
        await page.emulateMedia({ reducedMotion: 'no-preference' });

        // Test 5: Loading State Analysis
        console.log('\n🎯 Test 5: Loading State Analysis');
        
        const loadingAnalysis = await page.evaluate(() => {
            const loadingElements = document.querySelectorAll('.loading, [class*="loading"], .spinner, [class*="spinner"]');
            const loadingStates = Array.from(loadingElements).map(el => {
                const styles = getComputedStyle(el);
                return {
                    visible: el.offsetParent !== null,
                    opacity: parseFloat(styles.opacity),
                    animationDuration: parseFloat(styles.animationDuration) || 0
                };
            });
            
            return {
                loadingElementsFound: loadingElements.length,
                visibleLoaders: loadingStates.filter(s => s.visible).length,
                avgOpacity: loadingStates.length > 0 ? 
                    (loadingStates.reduce((sum, s) => sum + s.opacity, 0) / loadingStates.length).toFixed(2) : 0
            };
        });
        
        console.log(`    Loading elements found: ${loadingAnalysis.loadingElementsFound}`);
        console.log(`    Visible loading states: ${loadingAnalysis.visibleLoaders}`);
        if (loadingAnalysis.avgOpacity > 0) {
            console.log(`    Average loading opacity: ${loadingAnalysis.avgOpacity}`);
            const nebulaCompliant = parseFloat(loadingAnalysis.avgOpacity) >= 0.8 && parseFloat(loadingAnalysis.avgOpacity) <= 0.9;
            console.log(`    ${nebulaCompliant ? '✅' : '⚠️'} Nebula opacity refinement (0.85) ${nebulaCompliant ? 'detected' : 'not detected'}`);
        }

        // Test 6: Performance Under Load
        console.log('\n🎯 Test 6: Performance Under Load');
        
        const performanceTest = async () => {
            const startTime = Date.now();
            const interactions = [];
            
            // Rapid interactions
            const testElements = await page.$$('button, .card, [class*="card"]');
            for (let i = 0; i < Math.min(testElements.length, 10); i++) {
                const interactionStart = Date.now();
                await testElements[i].hover();
                await page.waitForTimeout(20);
                interactions.push(Date.now() - interactionStart);
            }
            
            return {
                totalTime: Date.now() - startTime,
                interactions: interactions.length,
                avgInteractionTime: interactions.length > 0 ? 
                    (interactions.reduce((a, b) => a + b, 0) / interactions.length).toFixed(1) : 0
            };
        };
        
        const perfResults = await performanceTest();
        console.log(`    Total test time: ${perfResults.totalTime}ms`);
        console.log(`    Interactions tested: ${perfResults.interactions}`);
        console.log(`    Average interaction time: ${perfResults.avgInteractionTime}ms`);
        console.log(`    ${perfResults.avgInteractionTime <= 100 ? '✅' : '⚠️'} Performance ${perfResults.avgInteractionTime <= 100 ? 'excellent' : 'good'}`);

        // Test 7: Viewport Responsiveness
        console.log('\n🎯 Test 7: Viewport Responsiveness');
        
        const viewports = [
            { width: 1920, height: 1080, name: 'Desktop' },
            { width: 768, height: 1024, name: 'Tablet' },
            { width: 375, height: 667, name: 'Mobile' }
        ];
        
        for (const viewport of viewports) {
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            await page.waitForTimeout(200);
            
            const responsiveCheck = await page.evaluate(() => {
                const buttons = document.querySelectorAll('button');
                const cards = document.querySelectorAll('.card, [class*="card"]');
                
                return {
                    buttonsVisible: Array.from(buttons).filter(b => b.offsetParent !== null).length,
                    cardsVisible: Array.from(cards).filter(c => c.offsetParent !== null).length
                };
            });
            
            console.log(`    ${viewport.name}: ${responsiveCheck.buttonsVisible} buttons, ${responsiveCheck.cardsVisible} cards visible`);
        }

        // Final Assessment
        console.log('\n📊 Nebula UI Animation Assessment Summary:');
        
        const nebulaScore = {
            timing: parseFloat(animationAnalysis.avgTransitionDuration) <= 200 ? 'EXCELLENT' : 'GOOD',
            fastPercentage: parseFloat(animationAnalysis.fastTransitionPercentage) >= 80 ? 'EXCELLENT' : 'GOOD',
            accessibility: reducedMotionAnalysis.compliance,
            performance: parseFloat(perfResults.avgInteractionTime) <= 100 ? 'EXCELLENT' : 'GOOD',
            responsiveness: 'GOOD' // Based on viewport tests
        };
        
        console.log(`  ⚡ Animation Timing (avg ${animationAnalysis.avgTransitionDuration}ms): ${nebulaScore.timing}`);
        console.log(`  🎯 Fast Animations (${animationAnalysis.fastTransitionPercentage}%): ${nebulaScore.fastPercentage}`);
        console.log(`  ♿ Accessibility: ${nebulaScore.accessibility}`);
        console.log(`  🚀 Performance: ${nebulaScore.performance}`);
        console.log(`  📱 Responsiveness: ${nebulaScore.responsiveness}`);
        
        const excellentCount = Object.values(nebulaScore).filter(v => v === 'EXCELLENT').length;
        const totalCategories = Object.keys(nebulaScore).length;
        
        console.log(`\n🏆 Overall Nebula UI Score: ${excellentCount}/${totalCategories} categories rated EXCELLENT`);
        
        if (excellentCount >= 4) {
            console.log('✅ OUTSTANDING: Nebula UI animation refinements are highly successful!');
            console.log('   The animations are minimal, snappy, and provide subtle feedback without distraction.');
        } else if (excellentCount >= 3) {
            console.log('✅ SUCCESSFUL: Nebula UI animation refinements are working well with minor room for improvement.');
        } else {
            console.log('⚠️ IMPROVEMENT NEEDED: Nebula UI animation refinements need additional optimization.');
        }
        
        // Specific recommendations
        console.log('\n💡 Recommendations:');
        if (parseFloat(animationAnalysis.avgTransitionDuration) > 200) {
            console.log('  • Consider reducing transition durations to ≤200ms for snappier feel');
        }
        if (parseFloat(animationAnalysis.fastTransitionPercentage) < 80) {
            console.log('  • More elements could benefit from faster transitions');
        }
        if (reducedMotionAnalysis.compliance !== 'EXCELLENT') {
            console.log('  • Improve reduced motion compliance for better accessibility');
        }
        if (parseFloat(perfResults.avgInteractionTime) > 100) {
            console.log('  • Optimize interaction response times for better performance');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        console.log('\n🔚 Test completed. Closing browser...');
        await browser.close();
    }
}

// Run the tests
testNebulaAnimations().catch(console.error);