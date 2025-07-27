/**
 * Modern UI Components Library
 * Inspired by shadcn/ui design patterns for vanilla JavaScript
 */

export class ModernUI {
    constructor() {
        this.initializeComponents();
    }

    initializeComponents() {
        this.setupAnimationObserver();
        this.enhanceButtons();
        this.createModernCards();
        this.setupGlassEffects();
    }

    // Animation observer for scroll-triggered animations
    setupAnimationObserver() {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate-in');
                    }
                });
            },
            { threshold: 0.1 }
        );

        // Observe all elements with animation classes
        document.querySelectorAll('.animate-on-scroll').forEach(el => {
            observer.observe(el);
        });
    }

    // Create modern button component
    static createButton({ variant = 'default', size = 'default', children, className = '', onClick, disabled = false }) {
        const baseClasses = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background';
        
        const variants = {
            default: 'bg-primary text-primary-foreground hover:bg-primary/90',
            destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
            outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
            secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
            ghost: 'hover:bg-accent hover:text-accent-foreground',
            link: 'underline-offset-4 hover:underline text-primary'
        };

        const sizes = {
            default: 'h-10 py-2 px-4',
            sm: 'h-9 px-3 rounded-md',
            lg: 'h-11 px-8 rounded-md',
            icon: 'h-10 w-10'
        };

        const button = document.createElement('button');
        button.className = `${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`;
        button.innerHTML = children;
        button.disabled = disabled;
        
        if (onClick) {
            button.addEventListener('click', onClick);
        }

        return button;
    }

    // Create modern card component
    static createCard({ children, className = '', gradient = false }) {
        const card = document.createElement('div');
        const baseClasses = gradient 
            ? 'rounded-lg border bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 text-card-foreground shadow-sm backdrop-blur-sm'
            : 'rounded-lg border bg-card text-card-foreground shadow-sm backdrop-blur-sm';
        
        card.className = `${baseClasses} ${className}`;
        card.innerHTML = children;
        return card;
    }

    // Create badge component
    static createBadge({ children, variant = 'default', className = '' }) {
        const baseClasses = 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';
        
        const variants = {
            default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
            secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
            destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
            outline: 'text-foreground border-border'
        };

        const badge = document.createElement('span');
        badge.className = `${baseClasses} ${variants[variant]} ${className}`;
        badge.innerHTML = children;
        return badge;
    }

    // Create progress component
    static createProgress({ value = 0, className = '' }) {
        const container = document.createElement('div');
        container.className = `relative h-4 w-full overflow-hidden rounded-full bg-secondary ${className}`;
        
        const progress = document.createElement('div');
        progress.className = 'h-full w-full flex-1 bg-primary transition-all duration-300 ease-in-out';
        progress.style.transform = `translateX(-${100 - value}%)`;
        
        container.appendChild(progress);
        return container;
    }

    // Create separator component
    static createSeparator({ orientation = 'horizontal', className = '' }) {
        const separator = document.createElement('div');
        const orientationClasses = orientation === 'horizontal' 
            ? 'h-[1px] w-full' 
            : 'h-full w-[1px]';
        
        separator.className = `shrink-0 bg-border ${orientationClasses} ${className}`;
        return separator;
    }

    // Create avatar component
    static createAvatar({ src, alt, fallback, size = 'default', className = '' }) {
        const sizes = {
            sm: 'h-8 w-8',
            default: 'h-10 w-10',
            lg: 'h-12 w-12'
        };

        const container = document.createElement('div');
        container.className = `relative flex ${sizes[size]} shrink-0 overflow-hidden rounded-full ${className}`;

        if (src) {
            const img = document.createElement('img');
            img.src = src;
            img.alt = alt || '';
            img.className = 'aspect-square h-full w-full object-cover';
            container.appendChild(img);
        } else {
            const fallbackEl = document.createElement('div');
            fallbackEl.className = 'flex h-full w-full items-center justify-center rounded-full bg-muted text-muted-foreground';
            fallbackEl.textContent = fallback || '?';
            container.appendChild(fallbackEl);
        }

        return container;
    }

    // Create tooltip component
    static createTooltip({ trigger, content, position = 'top' }) {
        const tooltip = document.createElement('div');
        tooltip.className = 'absolute z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95';
        tooltip.style.display = 'none';
        tooltip.textContent = content;

        const positions = {
            top: 'bottom-full left-1/2 -translate-x-1/2 -translate-y-2',
            bottom: 'top-full left-1/2 -translate-x-1/2 translate-y-2',
            left: 'right-full top-1/2 -translate-y-1/2 -translate-x-2',
            right: 'left-full top-1/2 -translate-y-1/2 translate-x-2'
        };

        tooltip.className += ` ${positions[position]}`;

        trigger.style.position = 'relative';
        trigger.appendChild(tooltip);

        trigger.addEventListener('mouseenter', () => {
            tooltip.style.display = 'block';
        });

        trigger.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });

        return tooltip;
    }

    // Enhance existing buttons with modern styling
    enhanceButtons() {
        document.querySelectorAll('button').forEach(button => {
            if (!button.classList.contains('modern-enhanced')) {
                button.classList.add('modern-enhanced');
                button.classList.add('transition-all', 'duration-200', 'transform', 'hover:scale-105', 'active:scale-95');
            }
        });
    }

    // Create modern card layouts
    createModernCards() {
        // This will be used to wrap existing content in modern cards
        const containers = document.querySelectorAll('.bg-white\\/95');
        containers.forEach(container => {
            if (!container.classList.contains('modern-card')) {
                container.classList.add('modern-card');
                container.classList.add('backdrop-blur-md', 'border', 'border-white/20', 'shadow-xl', 'transition-all', 'duration-300', 'hover:shadow-2xl');
            }
        });
    }

    // Setup glass morphism effects
    setupGlassEffects() {
        const glassElements = document.querySelectorAll('.glass-effect');
        glassElements.forEach(element => {
            element.classList.add(
                'backdrop-blur-md',
                'bg-white/10',
                'border',
                'border-white/20',
                'shadow-lg'
            );
        });
    }

    // Create modern metric card
    static createMetricCard({ title, value, change, icon, trend = 'neutral' }) {
        const trendColors = {
            up: 'text-green-600 dark:text-green-400',
            down: 'text-red-600 dark:text-red-400',
            neutral: 'text-gray-600 dark:text-gray-400'
        };

        return `
            <div class="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105">
                <div class="flex items-center justify-between">
                    <div class="space-y-1">
                        <p class="text-sm font-medium text-muted-foreground">${title}</p>
                        <p class="text-2xl font-bold tracking-tight">${value}</p>
                        ${change ? `<p class="text-xs ${trendColors[trend]} flex items-center gap-1">
                            ${trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'} ${change}
                        </p>` : ''}
                    </div>
                    <div class="rounded-full bg-primary/10 p-3 text-primary">
                        ${icon}
                    </div>
                </div>
                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 translate-x-[-100%] group-hover:translate-x-[100%] transform"></div>
            </div>
        `;
    }

    // Create modern navigation
    static createNavigation({ items }) {
        const nav = document.createElement('nav');
        nav.className = 'flex items-center space-x-1 p-1 bg-muted rounded-lg';

        items.forEach((item, index) => {
            const button = document.createElement('button');
            button.className = `flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                item.active 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            }`;
            button.innerHTML = `${item.icon || ''} ${item.label}`;
            
            if (item.onClick) {
                button.addEventListener('click', item.onClick);
            }

            nav.appendChild(button);
        });

        return nav;
    }
}

// Export for global use
window.ModernUI = ModernUI;