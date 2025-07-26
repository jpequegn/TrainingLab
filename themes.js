/**
 * Theme Management System
 * Handles light/dark mode switching and theme persistence
 */

export class ThemeManager {
    constructor() {
        this.currentTheme = this.getStoredTheme() || 'light';
        this.initializeTheme();
        this.createThemeToggle();
    }

    getStoredTheme() {
        return localStorage.getItem('wko-theme');
    }

    setStoredTheme(theme) {
        localStorage.setItem('wko-theme', theme);
    }

    initializeTheme() {
        this.applyTheme(this.currentTheme);
    }

    applyTheme(theme) {
        const root = document.documentElement;
        
        if (theme === 'dark') {
            root.classList.add('dark');
            this.applyDarkTheme();
        } else {
            root.classList.remove('dark');
            this.applyLightTheme();
        }
        
        this.currentTheme = theme;
        this.setStoredTheme(theme);
        this.updateToggleButton();
    }

    applyLightTheme() {
        const root = document.documentElement;
        root.style.setProperty('--bg-primary', 'linear-gradient(to bottom right, #4338ca, #7c3aed, #2563eb)');
        root.style.setProperty('--bg-card', 'rgba(255, 255, 255, 0.95)');
        root.style.setProperty('--bg-card-header', 'linear-gradient(to right, #4f46e5, #7c3aed)');
        root.style.setProperty('--text-primary', '#1f2937');
        root.style.setProperty('--text-secondary', '#6b7280');
        root.style.setProperty('--text-accent', '#4f46e5');
        root.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.2)');
        root.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.1)');
        root.style.setProperty('--chart-bg', '#f9fafb');
    }

    applyDarkTheme() {
        const root = document.documentElement;
        root.style.setProperty('--bg-primary', 'linear-gradient(to bottom right, #1e1b4b, #581c87, #1e3a8a)');
        root.style.setProperty('--bg-card', 'rgba(31, 41, 55, 0.95)');
        root.style.setProperty('--bg-card-header', 'linear-gradient(to right, #374151, #4b5563)');
        root.style.setProperty('--text-primary', '#f9fafb');
        root.style.setProperty('--text-secondary', '#d1d5db');
        root.style.setProperty('--text-accent', '#8b5cf6');
        root.style.setProperty('--border-color', 'rgba(75, 85, 99, 0.3)');
        root.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.3)');
        root.style.setProperty('--chart-bg', '#374151');
    }

    createThemeToggle() {
        // Find the header area to add the toggle
        const header = document.querySelector('header');
        if (!header) return;

        // Create toggle container
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'fixed top-4 right-4 z-50';
        
        // Create toggle button
        const toggleButton = document.createElement('button');
        toggleButton.id = 'themeToggle';
        toggleButton.className = 'w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all duration-200 border border-white/20';
        toggleButton.setAttribute('aria-label', 'Toggle theme');
        toggleButton.title = 'Toggle light/dark theme';
        
        toggleContainer.appendChild(toggleButton);
        document.body.appendChild(toggleContainer);

        // Add event listener
        toggleButton.addEventListener('click', () => {
            this.toggleTheme();
        });

        this.updateToggleButton();
    }

    updateToggleButton() {
        const button = document.getElementById('themeToggle');
        if (!button) return;

        const icon = this.currentTheme === 'dark' ? '☀️' : '🌙';
        button.innerHTML = `<span class="text-xl">${icon}</span>`;
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
    }

    getCurrentTheme() {
        return this.currentTheme;
    }
}

// Initialize theme manager when module loads
let themeManager;
document.addEventListener('DOMContentLoaded', () => {
    themeManager = new ThemeManager();
});

export { themeManager };