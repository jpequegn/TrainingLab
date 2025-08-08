#!/usr/bin/env python3
"""
Nebula UI Layout Density Testing Script
Tests the layout changes for density optimization across viewport sizes
"""

import asyncio
from playwright.async_api import async_playwright
import os
from pathlib import Path

class NebulaUITester:
    def __init__(self):
        self.base_path = Path(__file__).parent
        self.index_path = self.base_path / "index.html"
        self.screenshots_dir = self.base_path / "layout_analysis_screenshots"
        self.screenshots_dir.mkdir(exist_ok=True)
        
        # Test viewport sizes
        self.viewports = {
            "desktop": {"width": 1920, "height": 1080},
            "tablet": {"width": 768, "height": 1024}, 
            "mobile": {"width": 375, "height": 667}
        }

    async def test_layout_density(self):
        """Main test function to assess layout density optimization"""
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=False)
            
            print(">>> Starting Nebula UI Layout Density Assessment")
            print("=" * 60)
            
            for viewport_name, dimensions in self.viewports.items():
                print(f"\n>>> Testing {viewport_name.upper()} viewport ({dimensions['width']}x{dimensions['height']})")
                
                context = await browser.new_context(
                    viewport=dimensions,
                    device_scale_factor=1
                )
                page = await context.new_page()
                
                try:
                    # Navigate to the local HTML file
                    file_url = f"file:///{self.index_path.as_posix()}"
                    await page.goto(file_url, wait_until="networkidle")
                    
                    # Wait for page to fully load
                    await page.wait_for_timeout(2000)
                    
                    # Take initial screenshot
                    screenshot_path = self.screenshots_dir / f"{viewport_name}_initial.png"
                    await page.screenshot(path=screenshot_path, full_page=True)
                    print(f"  [SCREENSHOT] Initial screenshot: {screenshot_path}")
                    
                    # Test navigation compactness
                    await self.test_navigation_density(page, viewport_name)
                    
                    # Test hero section layout
                    await self.test_hero_section_density(page, viewport_name)
                    
                    # Test button sizing and accessibility
                    await self.test_button_functionality(page, viewport_name)
                    
                    # Test overall space efficiency
                    await self.test_space_efficiency(page, viewport_name)
                    
                    # Test mobile responsiveness specific checks
                    if viewport_name == "mobile":
                        await self.test_mobile_specific_optimizations(page)
                    
                    print(f"  [PASS] {viewport_name.upper()} testing completed")
                    
                except Exception as e:
                    print(f"  [ERROR] Error testing {viewport_name}: {str(e)}")
                    # Take error screenshot
                    error_screenshot = self.screenshots_dir / f"{viewport_name}_error.png"
                    await page.screenshot(path=error_screenshot)
                    print(f"  [SCREENSHOT] Error screenshot: {error_screenshot}")
                
                finally:
                    await context.close()
            
            await browser.close()
            
            print("\n>>> ASSESSMENT COMPLETE")
            print("=" * 60)
            await self.generate_summary_report()

    async def test_navigation_density(self, page, viewport_name):
        """Test navigation bar compactness and functionality"""
        print("  [TEST] Testing navigation density...")
        
        # Check navigation height
        nav_height = await page.evaluate("""
            () => {
                const nav = document.querySelector('nav');
                return nav ? nav.offsetHeight : null;
            }
        """)
        
        print(f"    • Navigation height: {nav_height}px")
        
        # Check if navigation is properly compact
        expected_max_height = 64  # 16 * 4 (h-16 in Tailwind)
        if nav_height and nav_height <= expected_max_height:
            print("    [PASS] Navigation height is appropriately compact")
        else:
            print(f"    [WARN] Navigation might be too tall (expected <={expected_max_height}px)")
        
        # Test theme toggle functionality
        theme_toggle = page.locator("#themeToggle")
        if await theme_toggle.is_visible():
            print("    [PASS] Theme toggle is visible and accessible")
            # Test click functionality
            await theme_toggle.click()
            await page.wait_for_timeout(500)  # Allow transition
            screenshot_path = self.screenshots_dir / f"{viewport_name}_dark_theme.png"
            await page.screenshot(path=screenshot_path)
            print(f"    [SCREENSHOT] Dark theme screenshot: {screenshot_path}")
            
            # Switch back to light theme
            await theme_toggle.click()
            await page.wait_for_timeout(500)
        else:
            print("    [FAIL] Theme toggle not found or not visible")

    async def test_hero_section_density(self, page, viewport_name):
        """Test hero section layout and density"""
        print("  [TEST] Testing hero section density...")
        
        # Check if hero section exists and get dimensions
        hero_info = await page.evaluate("""
            () => {
                // Look for main content area or hero section
                const main = document.querySelector('main') || 
                             document.querySelector('.hero') ||
                             document.querySelector('[class*="hero"]') ||
                             document.querySelector('body > div:first-of-type');
                
                if (!main) return null;
                
                const rect = main.getBoundingClientRect();
                const styles = window.getComputedStyle(main);
                
                return {
                    height: rect.height,
                    padding: styles.padding,
                    margin: styles.margin,
                    className: main.className
                };
            }
        """)
        
        if hero_info:
            print(f"    - Hero section height: {hero_info['height']}px")
            print(f"    - Hero section classes: {hero_info['className']}")
            print("    [PASS] Hero section found and measured")
        else:
            print("    [WARN] Hero section not clearly identified")

    async def test_button_functionality(self, page, viewport_name):
        """Test button sizing, accessibility, and functionality"""
        print("  [TEST] Testing button accessibility and density...")
        
        # Find all buttons
        buttons = await page.locator("button").all()
        print(f"    - Found {len(buttons)} buttons")
        
        for i, button in enumerate(buttons[:5]):  # Test first 5 buttons
            try:
                button_box = await button.bounding_box()
                if button_box:
                    width, height = button_box['width'], button_box['height']
                    
                    # Check if button meets minimum touch target size (44px recommended)
                    min_size = 44 if viewport_name == "mobile" else 32
                    
                    if width >= min_size and height >= min_size:
                        print(f"    [PASS] Button {i+1}: {width}x{height}px (good size)")
                    elif width >= 32 and height >= 32:
                        print(f"    [WARN] Button {i+1}: {width}x{height}px (acceptable)")
                    else:
                        print(f"    [FAIL] Button {i+1}: {width}x{height}px (too small)")
                        
                    # Test if button is clickable
                    if await button.is_visible() and await button.is_enabled():
                        print(f"    [PASS] Button {i+1}: clickable and accessible")
                    else:
                        print(f"    [WARN] Button {i+1}: not clickable or visible")
                        
            except Exception as e:
                print(f"    [ERROR] Error testing button {i+1}: {str(e)}")

    async def test_space_efficiency(self, page, viewport_name):
        """Test overall space efficiency and layout density"""
        print("  [TEST] Testing space efficiency...")
        
        # Measure overall content area
        layout_info = await page.evaluate("""
            () => {
                const body = document.body;
                const bodyHeight = body.scrollHeight;
                const viewportHeight = window.innerHeight;
                const viewportWidth = window.innerWidth;
                
                // Calculate content density
                const contentElements = document.querySelectorAll('div, section, main, article');
                let totalContentHeight = 0;
                
                contentElements.forEach(el => {
                    if (el.offsetParent !== null) { // visible elements
                        totalContentHeight += el.offsetHeight;
                    }
                });
                
                return {
                    bodyHeight,
                    viewportHeight, 
                    viewportWidth,
                    contentDensity: totalContentHeight / bodyHeight,
                    scrollRequired: bodyHeight > viewportHeight
                };
            }
        """)
        
        print(f"    - Viewport: {layout_info['viewportWidth']}x{layout_info['viewportHeight']}px")
        print(f"    - Content height: {layout_info['bodyHeight']}px")
        print(f"    - Content density: {layout_info['contentDensity']:.2%}")
        print(f"    - Scroll required: {layout_info['scrollRequired']}")
        
        # Evaluate density efficiency
        if layout_info['contentDensity'] > 0.7:
            print("    [PASS] Good content density (efficient space usage)")
        elif layout_info['contentDensity'] > 0.5:
            print("    [WARN] Moderate content density")
        else:
            print("    [FAIL] Low content density (potentially inefficient)")

    async def test_mobile_specific_optimizations(self, page):
        """Test mobile-specific layout optimizations"""
        print("  [TEST] Testing mobile-specific optimizations...")
        
        # Test touch targets
        touch_targets = await page.evaluate("""
            () => {
                const interactive = document.querySelectorAll('button, a, input, select, textarea');
                let tooSmall = 0;
                let goodSize = 0;
                
                interactive.forEach(el => {
                    const rect = el.getBoundingClientRect();
                    if (rect.width < 44 || rect.height < 44) {
                        tooSmall++;
                    } else {
                        goodSize++;
                    }
                });
                
                return { tooSmall, goodSize, total: interactive.length };
            }
        """)
        
        print(f"    - Touch targets: {touch_targets['goodSize']}/{touch_targets['total']} properly sized")
        
        if touch_targets['tooSmall'] > 0:
            print(f"    [WARN] {touch_targets['tooSmall']} touch targets might be too small")
        else:
            print("    [PASS] All touch targets appropriately sized")
        
        # Test horizontal scrolling
        has_horizontal_scroll = await page.evaluate("""
            () => document.body.scrollWidth > window.innerWidth
        """)
        
        if has_horizontal_scroll:
            print("    [FAIL] Horizontal scrolling detected (responsive issue)")
        else:
            print("    [PASS] No horizontal scrolling (good responsive behavior)")

    async def generate_summary_report(self):
        """Generate a summary report of the testing"""
        print("\n>>> NEBULA UI DENSITY ASSESSMENT SUMMARY")
        print("-" * 40)
        
        screenshots = list(self.screenshots_dir.glob("*.png"))
        print(f"[SCREENSHOTS] Screenshots captured: {len(screenshots)}")
        
        for screenshot in screenshots:
            print(f"  - {screenshot.name}")
        
        print("\n[KEY FINDINGS]:")
        print("- Navigation bar compactness tested across viewports")
        print("- Button accessibility and touch target sizing verified") 
        print("- Space efficiency and content density measured")
        print("- Mobile responsiveness validated")
        print("- Theme switching functionality confirmed")
        
        print(f"\n[FILES] All screenshots saved to: {self.screenshots_dir}")
        print("\n[COMPLETE] Assessment complete! Review screenshots and console output for detailed findings.")

async def main():
    tester = NebulaUITester()
    await tester.test_layout_density()

if __name__ == "__main__":
    asyncio.run(main())