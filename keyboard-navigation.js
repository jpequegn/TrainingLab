/**
 * Keyboard Navigation System
 * Provides comprehensive keyboard navigation for the entire application
 */

export class KeyboardNavigation {
    constructor() {
        this.focusableElements = [];
        this.currentFocusIndex = -1;
        this.chartNavigation = null;
        this.shortcuts = new Map();
        this.modalStack = [];
        
        this.setupKeyboardHandlers();
        this.defineShortcuts();
        this.updateFocusableElements();
    }

    setupKeyboardHandlers() {
        document.addEventListener('keydown', (event) => {
            this.handleKeyDown(event);
        });

        // Update focusable elements when DOM changes
        const observer = new MutationObserver(() => {
            this.updateFocusableElements();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['tabindex', 'disabled', 'hidden']
        });
    }

    defineShortcuts() {
        this.shortcuts.set('ctrl+o', () => this.triggerFileUpload());
        this.shortcuts.set('ctrl+s', () => this.triggerSampleLoad());
        this.shortcuts.set('escape', () => this.handleEscape());
        this.shortcuts.set('enter', () => this.handleEnter());
        this.shortcuts.set('space', () => this.handleSpace());
        this.shortcuts.set('arrowleft', () => this.navigateChart('left'));
        this.shortcuts.set('arrowright', () => this.navigateChart('right'));
        this.shortcuts.set('arrowup', () => this.navigateVertical('up'));
        this.shortcuts.set('arrowdown', () => this.navigateVertical('down'));
        this.shortcuts.set('tab', () => this.handleTab(event));
        this.shortcuts.set('shift+tab', () => this.handleShiftTab(event));
        this.shortcuts.set('home', () => this.navigateToFirst());
        this.shortcuts.set('end', () => this.navigateToLast());
        this.shortcuts.set('?', () => this.showKeyboardHelp());
        this.shortcuts.set('ctrl+z', () => this.triggerUndo());
        this.shortcuts.set('ctrl+e', () => this.toggleExportPanel());
    }

    handleKeyDown(event) {
        const key = this.getKeyString(event);
        
        // Check if we're in an input field (allow normal typing)
        if (this.isTypingContext(event.target)) {
            // Only handle escape and some shortcuts in input fields
            if (key === 'escape' || key.startsWith('ctrl+')) {
                if (this.shortcuts.has(key)) {
                    event.preventDefault();
                    this.shortcuts.get(key)(event);
                }
            }
            return;
        }

        // Handle all shortcuts when not typing
        if (this.shortcuts.has(key)) {
            event.preventDefault();
            this.shortcuts.get(key)(event);
        }
    }

    getKeyString(event) {
        let key = event.key.toLowerCase();
        if (event.ctrlKey) key = 'ctrl+' + key;
        if (event.shiftKey && key !== 'shift+tab') key = 'shift+' + key;
        if (event.altKey) key = 'alt+' + key;
        return key;
    }

    isTypingContext(element) {
        const typingElements = ['input', 'textarea', 'select'];
        return typingElements.includes(element.tagName.toLowerCase()) ||
               element.contentEditable === 'true' ||
               element.classList.contains('chat-input');
    }

    updateFocusableElements() {
        const selectors = [
            'button:not([disabled]):not([aria-hidden="true"])',
            'input:not([disabled]):not([type="hidden"])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            'a[href]:not([disabled])',
            '[tabindex]:not([tabindex="-1"]):not([disabled])',
            '.chart-segment[data-focusable="true"]'
        ];

        this.focusableElements = Array.from(document.querySelectorAll(selectors.join(', ')))
            .filter(el => this.isVisible(el))
            .sort((a, b) => {
                const aIndex = parseInt(a.getAttribute('tabindex')) || 0;
                const bIndex = parseInt(b.getAttribute('tabindex')) || 0;
                return aIndex - bIndex;
            });
    }

    isVisible(element) {
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               element.offsetParent !== null;
    }

    // Navigation methods
    triggerFileUpload() {
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.click();
            this.announceAction('File upload dialog opened');
        }
    }

    triggerSampleLoad() {
        const sampleBtn = document.getElementById('loadSample');
        if (sampleBtn && !sampleBtn.disabled) {
            sampleBtn.click();
            this.announceAction('Loading sample workout');
        }
    }

    handleEscape() {
        // Close modals in reverse order (most recent first)
        if (this.modalStack.length > 0) {
            const modal = this.modalStack.pop();
            if (modal && modal.parentNode) {
                const closeBtn = modal.querySelector('[data-dismiss="modal"], .close-btn, button[onclick*="remove"]');
                if (closeBtn) {
                    closeBtn.click();
                } else {
                    modal.remove();
                }
                this.announceAction('Modal closed');
                return;
            }
        }

        // Close any visible toasts
        const toasts = document.querySelectorAll('.error-toast, .toast-notification');
        if (toasts.length > 0) {
            toasts.forEach(toast => toast.remove());
            this.announceAction('Notifications dismissed');
            return;
        }

        // Clear chart selection
        if (this.chartNavigation && this.chartNavigation.selectedSegment !== null) {
            this.chartNavigation.clearSelection();
            this.announceAction('Chart selection cleared');
        }
    }

    handleEnter() {
        const focused = document.activeElement;
        if (focused && focused.tagName === 'BUTTON') {
            focused.click();
        } else if (this.chartNavigation && this.chartNavigation.selectedSegment !== null) {
            this.chartNavigation.activateSegment();
        }
    }

    handleSpace(event) {
        const focused = document.activeElement;
        if (focused && (focused.tagName === 'BUTTON' || focused.getAttribute('role') === 'button')) {
            event.preventDefault();
            focused.click();
        }
    }

    navigateChart(direction) {
        if (!this.chartNavigation) {
            this.initializeChartNavigation();
        }
        
        if (this.chartNavigation) {
            this.chartNavigation.navigate(direction);
        }
    }

    navigateVertical(direction) {
        if (this.isChartFocused()) {
            // In chart, vertical navigation changes intensity
            if (this.chartNavigation) {
                this.chartNavigation.adjustIntensity(direction);
            }
        } else {
            // Regular focus navigation
            const currentIndex = this.focusableElements.indexOf(document.activeElement);
            if (currentIndex >= 0) {
                const nextIndex = direction === 'up' ? 
                    Math.max(0, currentIndex - 1) : 
                    Math.min(this.focusableElements.length - 1, currentIndex + 1);
                
                this.focusableElements[nextIndex]?.focus();
            }
        }
    }

    navigateToFirst() {
        if (this.focusableElements.length > 0) {
            this.focusableElements[0].focus();
            this.announceAction('Focused first element');
        }
    }

    navigateToLast() {
        if (this.focusableElements.length > 0) {
            this.focusableElements[this.focusableElements.length - 1].focus();
            this.announceAction('Focused last element');
        }
    }

    isChartFocused() {
        const chart = document.getElementById('workoutChart');
        return chart && (document.activeElement === chart || chart.contains(document.activeElement));
    }

    initializeChartNavigation() {
        const chart = document.getElementById('workoutChart');
        if (chart && window.workoutChart) {
            this.chartNavigation = new ChartNavigation(window.workoutChart, chart);
        }
    }

    triggerUndo() {
        const undoBtn = document.getElementById('undoEditBtn');
        if (undoBtn && undoBtn.style.display !== 'none' && !undoBtn.disabled) {
            undoBtn.click();
            this.announceAction('Undo performed');
        }
    }

    toggleExportPanel() {
        const exportSection = document.querySelector('[data-section="export"]');
        if (exportSection) {
            exportSection.scrollIntoView({ behavior: 'smooth' });
            const firstExportBtn = exportSection.querySelector('button');
            if (firstExportBtn) {
                firstExportBtn.focus();
                this.announceAction('Export panel focused');
            }
        }
    }

    showKeyboardHelp() {
        this.createKeyboardHelpModal();
    }

    createKeyboardHelpModal() {
        // Remove existing help modal
        const existing = document.getElementById('keyboardHelpModal');
        if (existing) {
            existing.remove();
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'keyboardHelpModal';
        modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-96 overflow-hidden" role="dialog" aria-labelledby="helpTitle" aria-modal="true">
                <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h3 id="helpTitle" class="text-lg font-semibold text-gray-900 dark:text-white">Keyboard Shortcuts</h3>
                    <button class="close-help text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" aria-label="Close help">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <div class="p-4 overflow-y-auto max-h-80">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <h4 class="font-semibold mb-3 text-gray-900 dark:text-white">General</h4>
                            <div class="space-y-2">
                                <div class="flex justify-between">
                                    <span class="text-gray-600 dark:text-gray-300">Open file</span>
                                    <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl+O</kbd>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600 dark:text-gray-300">Load sample</span>
                                    <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl+S</kbd>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600 dark:text-gray-300">Undo</span>
                                    <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl+Z</kbd>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600 dark:text-gray-300">Show help</span>
                                    <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">?</kbd>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h4 class="font-semibold mb-3 text-gray-900 dark:text-white">Navigation</h4>
                            <div class="space-y-2">
                                <div class="flex justify-between">
                                    <span class="text-gray-600 dark:text-gray-300">Next/Previous</span>
                                    <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Tab/Shift+Tab</kbd>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600 dark:text-gray-300">Chart segments</span>
                                    <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">←/→</kbd>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600 dark:text-gray-300">First/Last</span>
                                    <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Home/End</kbd>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600 dark:text-gray-300">Close/Cancel</span>
                                    <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Esc</kbd>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.modalStack.push(modal);

        // Setup event listeners
        const closeBtn = modal.querySelector('.close-help');
        closeBtn.addEventListener('click', () => this.removeModal(modal));
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.removeModal(modal);
            }
        });

        // Focus the close button for keyboard navigation
        closeBtn.focus();
        this.announceAction('Keyboard shortcuts help opened');
    }

    removeModal(modal) {
        const index = this.modalStack.indexOf(modal);
        if (index > -1) {
            this.modalStack.splice(index, 1);
        }
        modal.remove();
        this.announceAction('Help modal closed');
    }

    // Screen reader announcements
    announceAction(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        // Remove after announcement
        setTimeout(() => {
            if (document.body.contains(announcement)) {
                document.body.removeChild(announcement);
            }
        }, 1000);
    }
}

/**
 * Chart-specific keyboard navigation
 */
class ChartNavigation {
    constructor(chartInstance, canvasElement) {
        this.chart = chartInstance;
        this.canvas = canvasElement;
        this.selectedSegment = null;
        this.segments = [];
        
        this.setupChartKeyboardSupport();
        this.updateSegments();
    }

    setupChartKeyboardSupport() {
        // Make canvas focusable
        this.canvas.setAttribute('tabindex', '0');
        this.canvas.setAttribute('role', 'application');
        this.canvas.setAttribute('aria-label', 'Workout power profile chart. Use arrow keys to navigate segments.');
    }

    updateSegments() {
        if (this.chart && this.chart.data && this.chart.data.datasets[0]) {
            this.segments = this.chart.data.datasets[0].data || [];
        }
    }

    navigate(direction) {
        if (this.segments.length === 0) {
            this.updateSegments();
            return;
        }

        if (this.selectedSegment === null) {
            this.selectedSegment = 0;
        } else {
            if (direction === 'left' && this.selectedSegment > 0) {
                this.selectedSegment--;
            } else if (direction === 'right' && this.selectedSegment < this.segments.length - 1) {
                this.selectedSegment++;
            }
        }

        this.highlightSegment();
        this.announceSegment();
    }

    highlightSegment() {
        // Trigger chart highlight if available
        if (window.app && window.app.setSelectedSegmentIndex) {
            window.app.setSelectedSegmentIndex(this.selectedSegment);
        }
    }

    announceSegment() {
        if (this.selectedSegment !== null && this.segments[this.selectedSegment]) {
            const segment = this.segments[this.selectedSegment];
            const message = `Segment ${this.selectedSegment + 1} of ${this.segments.length}. Power: ${Math.round(segment.y)}%. Duration: ${segment.duration || 'Unknown'} seconds.`;
            
            // Create announcement element
            const announcement = document.createElement('div');
            announcement.setAttribute('aria-live', 'assertive');
            announcement.className = 'sr-only';
            announcement.textContent = message;
            document.body.appendChild(announcement);
            
            setTimeout(() => {
                if (document.body.contains(announcement)) {
                    document.body.removeChild(announcement);
                }
            }, 1000);
        }
    }

    clearSelection() {
        this.selectedSegment = null;
        if (window.app && window.app.setSelectedSegmentIndex) {
            window.app.setSelectedSegmentIndex(null);
        }
    }

    activateSegment() {
        if (this.selectedSegment !== null) {
            // Trigger segment edit or details view
            const event = new CustomEvent('segmentActivated', {
                detail: { segmentIndex: this.selectedSegment }
            });
            this.canvas.dispatchEvent(event);
        }
    }
}

// Export singleton instance
export const keyboardNavigation = new KeyboardNavigation();