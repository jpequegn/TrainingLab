/**
 * Component System Index
 * Central export point for all reusable components
 */

// Base component system
export { 
    BaseComponent, 
    ComponentFactory, 
    componentFactory, 
    Component, 
    componentUtils 
} from './base-component.js';

// UI Components
export { default as WorkoutChart } from './workout-chart.js';
export { default as SegmentEditor } from './segment-editor.js';
export { default as WorkoutPanel } from './workout-panel.js';

/**
 * Auto-initialize components on DOM ready
 */
export function initializeComponents(container = document) {
    return componentFactory.autoInitialize(container);
}

/**
 * Component registry for manual registration
 */
export const components = {
    'base-component': BaseComponent,
    'workout-chart': WorkoutChart,
    'segment-editor': SegmentEditor,
    'workout-panel': WorkoutPanel
};

/**
 * Register all components with the factory
 */
Object.entries(components).forEach(([name, ComponentClass]) => {
    componentFactory.register(name, ComponentClass);
});

/**
 * Utility to create component instances
 */
export function createComponent(type, element, options = {}) {
    return componentFactory.create(type, element, options);
}

/**
 * Utility to get component instance from element
 */
export function getComponent(element) {
    return componentFactory.getInstance(element);
}

/**
 * Initialize the component system
 */
export function initializeComponentSystem() {
    // Auto-initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initializeComponents();
        });
    } else {
        initializeComponents();
    }
    
    // Handle dynamic content
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // Check if the added node or its children have component attributes
                    const componentsToInit = node.querySelectorAll 
                        ? [node, ...node.querySelectorAll('[data-component-type]')]
                        : [node];
                    
                    componentsToInit.forEach((element) => {
                        if (element.hasAttribute && element.hasAttribute('data-component-type')) {
                            const componentType = element.getAttribute('data-component-type');
                            const optionsAttr = element.getAttribute('data-component-options');
                            
                            let options = {};
                            if (optionsAttr) {
                                try {
                                    options = JSON.parse(optionsAttr);
                                } catch (error) {
                                    console.warn('Invalid component options:', optionsAttr);
                                }
                            }
                            
                            try {
                                componentFactory.create(componentType, element, options);
                            } catch (error) {
                                console.error(`Failed to create dynamic component ${componentType}:`, error);
                            }
                        }
                    });
                }
            });
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('Component system initialized');
    return observer;
}

// Auto-start the component system
if (typeof window !== 'undefined') {
    initializeComponentSystem();
}