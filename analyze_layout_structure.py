#!/usr/bin/env python3
"""
Enhanced DOM structure analysis and visual inspection for layout centering.
Creates screenshots and analyzes CSS for centering improvements.
"""

import asyncio
import os
from datetime import datetime
from playwright.async_api import async_playwright, Page

class LayoutStructureAnalyzer:
    def __init__(self):
        self.base_url = "http://localhost:8000"
        self.screenshots_dir = "layout_analysis_screenshots"
        os.makedirs(self.screenshots_dir, exist_ok=True)
    
    async def capture_layout_analysis(self, page: Page):
        """Capture comprehensive layout analysis with screenshots and DOM inspection"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        print("\n=== DOM STRUCTURE ANALYSIS ===")
        
        # Get main page structure
        page_structure = await page.evaluate("""
            () => {
                const getElementInfo = (element) => {
                    if (!element) return null;
                    const rect = element.getBoundingClientRect();
                    const styles = window.getComputedStyle(element);
                    return {
                        tagName: element.tagName,
                        id: element.id,
                        className: element.className,
                        rect: {
                            x: rect.x,
                            y: rect.y,
                            width: rect.width,
                            height: rect.height
                        },
                        styles: {
                            display: styles.display,
                            position: styles.position,
                            margin: styles.margin,
                            padding: styles.padding,
                            textAlign: styles.textAlign,
                            justifyContent: styles.justifyContent,
                            alignItems: styles.alignItems,
                            flexDirection: styles.flexDirection,
                            gridTemplateColumns: styles.gridTemplateColumns,
                            maxWidth: styles.maxWidth,
                            width: styles.width
                        }
                    };
                };
                
                const body = document.body;
                const main = document.querySelector('main') || document.querySelector('#root') || document.querySelector('.app');
                const containers = Array.from(document.querySelectorAll('.container, .content, .main-content, [class*="container"], [class*="content"]'));
                
                return {
                    viewport: {
                        width: window.innerWidth,
                        height: window.innerHeight
                    },
                    body: getElementInfo(body),
                    main: getElementInfo(main),
                    containers: containers.map(getElementInfo).filter(info => info !== null)
                };
            }
        """)
        
        print("Body Element:")
        if page_structure['body']:
            body = page_structure['body']
            print(f"  Tag: {body['tagName']}, Class: {body['className']}")
            print(f"  Size: {body['rect']['width']}x{body['rect']['height']}")
            print(f"  Display: {body['styles']['display']}")
            print(f"  Text Align: {body['styles']['textAlign']}")
            print(f"  Justify Content: {body['styles']['justifyContent']}")
        
        print("\nMain Container:")
        if page_structure['main']:
            main = page_structure['main']
            print(f"  Tag: {main['tagName']}, ID: {main['id']}, Class: {main['className']}")
            print(f"  Position: x={main['rect']['x']}, y={main['rect']['y']}")
            print(f"  Size: {main['rect']['width']}x{main['rect']['height']}")
            print(f"  Viewport Center X: {page_structure['viewport']['width']/2}")
            print(f"  Element Center X: {main['rect']['x'] + main['rect']['width']/2}")
            print(f"  Offset from center: {abs((main['rect']['x'] + main['rect']['width']/2) - (page_structure['viewport']['width']/2)):.1f}px")
            print(f"  Max Width: {main['styles']['maxWidth']}")
            print(f"  Width: {main['styles']['width']}")
        
        print(f"\nFound {len(page_structure['containers'])} container elements:")
        for i, container in enumerate(page_structure['containers'][:5]):  # Show first 5
            if container:
                print(f"  Container {i+1}: {container['tagName']}.{container['className']}")
                print(f"    Position: x={container['rect']['x']}, Size: {container['rect']['width']}x{container['rect']['height']}")
                print(f"    Center offset: {abs((container['rect']['x'] + container['rect']['width']/2) - (page_structure['viewport']['width']/2)):.1f}px")
        
        # Capture full page screenshot
        await page.screenshot(path=f"{self.screenshots_dir}/full_page_{timestamp}.png", full_page=True)
        print(f"\nScreenshot saved: {self.screenshots_dir}/full_page_{timestamp}.png")
        
        # Capture viewport screenshot  
        await page.screenshot(path=f"{self.screenshots_dir}/viewport_{timestamp}.png")
        print(f"Screenshot saved: {self.screenshots_dir}/viewport_{timestamp}.png")
        
        return page_structure
    
    async def analyze_specific_elements(self, page: Page):
        """Analyze specific elements that should be centered"""
        print("\n=== SPECIFIC ELEMENT ANALYSIS ===")
        
        # Chart analysis
        chart_info = await page.evaluate("""
            () => {
                const chart = document.querySelector('.chart-container, canvas, #chart');
                if (!chart) return null;
                
                const rect = chart.getBoundingClientRect();
                const parent = chart.parentElement;
                const parentRect = parent ? parent.getBoundingClientRect() : null;
                
                return {
                    chart: {
                        rect: rect,
                        tagName: chart.tagName,
                        className: chart.className
                    },
                    parent: parentRect ? {
                        rect: parentRect,
                        tagName: parent.tagName,
                        className: parent.className
                    } : null,
                    viewport: {
                        width: window.innerWidth,
                        height: window.innerHeight
                    }
                };
            }
        """)
        
        if chart_info and chart_info['chart']:
            chart = chart_info['chart']
            viewport_center = chart_info['viewport']['width'] / 2
            chart_center = chart['rect']['x'] + (chart['rect']['width'] / 2)
            
            print(f"Chart Element ({chart['tagName']}.{chart['className']}):")
            print(f"  Position: x={chart['rect']['x']:.1f}, y={chart['rect']['y']:.1f}")
            print(f"  Size: {chart['rect']['width']:.1f}x{chart['rect']['height']:.1f}")
            print(f"  Chart center: {chart_center:.1f}px")
            print(f"  Viewport center: {viewport_center:.1f}px")
            print(f"  Centering offset: {abs(chart_center - viewport_center):.1f}px")
            
            if chart_info['parent']:
                parent = chart_info['parent']
                parent_center = parent['rect']['x'] + (parent['rect']['width'] / 2)
                print(f"  Parent center: {parent_center:.1f}px")
                print(f"  Parent centering offset: {abs(parent_center - viewport_center):.1f}px")
        
        # Look for any input areas or chat interfaces
        input_info = await page.evaluate("""
            () => {
                const inputs = document.querySelectorAll('input[type="text"], textarea, .input-area, [class*="input"]');
                const viewport_width = window.innerWidth;
                
                return Array.from(inputs).map(input => {
                    const rect = input.getBoundingClientRect();
                    if (rect.width === 0 || rect.height === 0) return null;
                    
                    return {
                        tagName: input.tagName,
                        type: input.type,
                        className: input.className,
                        placeholder: input.placeholder,
                        rect: rect,
                        centerOffset: Math.abs((rect.x + rect.width/2) - (viewport_width/2))
                    };
                }).filter(info => info !== null);
            }
        """)
        
        if input_info and len(input_info) > 0:
            print(f"\nFound {len(input_info)} input elements:")
            for i, input_elem in enumerate(input_info):
                print(f"  Input {i+1}: {input_elem['tagName']} ({input_elem['type']})")
                print(f"    Class: {input_elem['className']}")
                print(f"    Placeholder: {input_elem['placeholder']}")
                print(f"    Size: {input_elem['rect']['width']:.1f}x{input_elem['rect']['height']:.1f}")
                print(f"    Center offset: {input_elem['centerOffset']:.1f}px")
        else:
            print("\nNo visible input elements found")
        
        return {"chart": chart_info, "inputs": input_info}
    
    async def analyze_css_centering_techniques(self, page: Page):
        """Analyze CSS centering techniques currently in use"""
        print("\n=== CSS CENTERING ANALYSIS ===")
        
        centering_analysis = await page.evaluate("""
            () => {
                const centering_techniques = [];
                
                // Check all elements for centering CSS
                const elements = document.querySelectorAll('*');
                const techniques_found = new Set();
                
                elements.forEach(element => {
                    const styles = window.getComputedStyle(element);
                    const rect = element.getBoundingClientRect();
                    
                    // Skip tiny or hidden elements
                    if (rect.width < 10 || rect.height < 10) return;
                    
                    let technique_info = {
                        selector: element.tagName.toLowerCase() + (element.className && typeof element.className === 'string' ? '.' + element.className.split(' ')[0] : ''),
                        techniques: []
                    };
                    
                    // Flexbox centering
                    if (styles.display === 'flex') {
                        if (styles.justifyContent === 'center') {
                            technique_info.techniques.push('flex justify-content: center');
                            techniques_found.add('flexbox-horizontal');
                        }
                        if (styles.alignItems === 'center') {
                            technique_info.techniques.push('flex align-items: center');
                            techniques_found.add('flexbox-vertical');
                        }
                    }
                    
                    // Text alignment
                    if (styles.textAlign === 'center') {
                        technique_info.techniques.push('text-align: center');
                        techniques_found.add('text-align');
                    }
                    
                    // Grid centering
                    if (styles.display === 'grid') {
                        if (styles.justifyItems === 'center' || styles.justifyContent === 'center') {
                            technique_info.techniques.push('grid centering');
                            techniques_found.add('grid');
                        }
                    }
                    
                    // Margin auto
                    if (styles.marginLeft === 'auto' && styles.marginRight === 'auto') {
                        technique_info.techniques.push('margin: auto');
                        techniques_found.add('margin-auto');
                    }
                    
                    // Block centering with max-width
                    if (styles.maxWidth && styles.maxWidth !== 'none' && 
                        (styles.marginLeft === 'auto' || styles.marginRight === 'auto')) {
                        technique_info.techniques.push(`max-width: ${styles.maxWidth} + margin auto`);
                        techniques_found.add('max-width-centered');
                    }
                    
                    if (technique_info.techniques.length > 0) {
                        centering_techniques.push(technique_info);
                    }
                });
                
                return {
                    techniques_summary: Array.from(techniques_found),
                    detailed_elements: centering_techniques.slice(0, 10) // First 10 elements with centering
                };
            }
        """)
        
        print("Centering Techniques Found:")
        for technique in centering_analysis['techniques_summary']:
            print(f"  - {technique}")
        
        print(f"\nElements Using Centering (showing first 10 of {len(centering_analysis['detailed_elements'])}):")
        for elem in centering_analysis['detailed_elements']:
            print(f"  {elem['selector']}: {', '.join(elem['techniques'])}")
        
        return centering_analysis
    
    async def generate_centering_recommendations(self, page_structure, element_analysis, css_analysis):
        """Generate specific recommendations for improving centering"""
        print("\n=== CENTERING RECOMMENDATIONS ===")
        
        recommendations = []
        
        # Analyze main content centering
        if page_structure['main']:
            main = page_structure['main']
            viewport_width = page_structure['viewport']['width']
            main_center = main['rect']['x'] + (main['rect']['width'] / 2)
            viewport_center = viewport_width / 2
            offset = abs(main_center - viewport_center)
            
            if offset > 20:  # Not well centered
                recommendations.append({
                    "priority": "HIGH",
                    "issue": f"Main content is offset by {offset:.1f}px from center",
                    "solution": "Apply CSS: max-width + margin: 0 auto to main container",
                    "css": f"""
                    main, .main-content, #root {{
                        max-width: 1200px;
                        margin: 0 auto;
                        width: 100%;
                    }}"""
                })
        
        # Chart centering recommendations
        if element_analysis['chart'] and element_analysis['chart']['chart']:
            chart = element_analysis['chart']['chart']
            chart_center = chart['rect']['x'] + (chart['rect']['width'] / 2)
            viewport_center = element_analysis['chart']['viewport']['width'] / 2
            offset = abs(chart_center - viewport_center)
            
            if offset > 30:
                recommendations.append({
                    "priority": "MEDIUM", 
                    "issue": f"Chart is offset by {offset:.1f}px from center",
                    "solution": "Center chart container with flexbox",
                    "css": """
                    .chart-container {
                        display: flex;
                        justify-content: center;
                        width: 100%;
                    }"""
                })
        
        # Input/textbox recommendations
        if element_analysis['inputs']:
            for input_elem in element_analysis['inputs']:
                if input_elem['centerOffset'] > 40:
                    recommendations.append({
                        "priority": "LOW",
                        "issue": f"Input element offset by {input_elem['centerOffset']:.1f}px",
                        "solution": "Center input container",
                        "css": """
                        .input-container, .chat-input {
                            display: flex;
                            justify-content: center;
                            width: 100%;
                        }"""
                    })
        
        # General layout recommendations
        if 'flexbox-horizontal' not in css_analysis['techniques_summary']:
            recommendations.append({
                "priority": "HIGH",
                "issue": "No flexbox horizontal centering detected",
                "solution": "Add flexbox centering to main layout",
                "css": """
                body {
                    display: flex;
                    justify-content: center;
                    min-height: 100vh;
                }
                
                .app, main {
                    width: 100%;
                    max-width: 1200px;
                }"""
            })
        
        # Output recommendations
        for i, rec in enumerate(recommendations, 1):
            print(f"{i}. [{rec['priority']}] {rec['issue']}")
            print(f"   Solution: {rec['solution']}")
            print(f"   CSS: {rec['css'].strip()}")
            print()
        
        return recommendations
    
    async def run_comprehensive_analysis(self):
        """Run comprehensive layout structure analysis"""
        print("Starting Comprehensive Layout Structure Analysis")
        print("=" * 60)
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=False)
            context = await browser.new_context(
                viewport={"width": 1366, "height": 768}
            )
            page = await context.new_page()
            
            try:
                # Navigate to the application
                await page.goto(self.base_url, wait_until="networkidle")
                await page.wait_for_load_state("domcontentloaded")
                
                # Perform comprehensive analysis
                page_structure = await self.capture_layout_analysis(page)
                element_analysis = await self.analyze_specific_elements(page)
                css_analysis = await self.analyze_css_centering_techniques(page)
                recommendations = await self.generate_centering_recommendations(
                    page_structure, element_analysis, css_analysis
                )
                
                print("\n" + "=" * 60)
                print("ANALYSIS COMPLETE")
                print(f"Screenshots saved to: {self.screenshots_dir}/")
                print(f"Total recommendations: {len(recommendations)}")
                
                # Keep browser open for manual inspection
                print("\nKeeping browser open for 10 seconds for visual verification...")
                await page.wait_for_timeout(10000)
                
            finally:
                await browser.close()

async def main():
    analyzer = LayoutStructureAnalyzer()
    await analyzer.run_comprehensive_analysis()

if __name__ == "__main__":
    print("Layout Structure Analyzer - Enhanced DOM and CSS Analysis")
    asyncio.run(main())