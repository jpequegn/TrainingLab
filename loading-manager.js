/**
 * Loading Manager - Handles all loading states and progress indicators
 */

export class LoadingManager {
    constructor() {
        this.loadingSteps = [
            'Reading file...',
            'Parsing workout data...',
            'Processing segments...',
            'Calculating metrics...',
            'Rendering visualization...'
        ];
        this.currentStep = 0;
        this.isLoading = false;
    }

    /**
     * Show loading overlay with progress
     */
    showLoading(message = 'Loading...') {
        this.isLoading = true;
        this.currentStep = 0;
        
        // Remove any existing loading overlay
        this.hideLoading();
        
        const overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4">
                <div class="text-center">
                    <div class="loading-spinner mx-auto mb-4"></div>
                    <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-2" id="loadingMessage">${message}</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-300 mb-4" id="loadingStep"></p>
                    <div class="progress-container">
                        <div class="progress-bar progress-indeterminate" id="progressBar"></div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        return overlay;
    }

    /**
     * Update loading progress with specific step
     */
    updateProgress(stepIndex, customMessage = null) {
        if (!this.isLoading) return;
        
        this.currentStep = stepIndex;
        const progress = ((stepIndex + 1) / this.loadingSteps.length) * 100;
        
        const messageEl = document.getElementById('loadingMessage');
        const stepEl = document.getElementById('loadingStep');
        const progressBar = document.getElementById('progressBar');
        
        if (messageEl && customMessage) {
            messageEl.textContent = customMessage;
        }
        
        if (stepEl && this.loadingSteps[stepIndex]) {
            stepEl.textContent = this.loadingSteps[stepIndex];
        }
        
        if (progressBar) {
            progressBar.classList.remove('progress-indeterminate');
            progressBar.style.width = `${progress}%`;
        }
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('fade-out');
            setTimeout(() => {
                overlay.remove();
                document.body.style.overflow = '';
            }, 300);
        }
        this.isLoading = false;
    }

    /**
     * Show skeleton loader for workout content
     */
    showWorkoutSkeleton(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="workout-skeleton">
                <!-- Header Skeleton -->
                <div class="skeleton skeleton-header"></div>
                
                <!-- Stats Skeleton -->
                <div class="skeleton-stats">
                    <div class="skeleton skeleton-stat"></div>
                    <div class="skeleton skeleton-stat"></div>
                    <div class="skeleton skeleton-stat"></div>
                    <div class="skeleton skeleton-stat"></div>
                </div>
                
                <!-- Chart Skeleton -->
                <div class="skeleton skeleton-chart"></div>
                
                <!-- Additional Content Skeleton -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="skeleton h-32 rounded-lg"></div>
                    <div class="skeleton h-32 rounded-lg"></div>
                </div>
            </div>
        `;
    }

    /**
     * Show loading state for buttons
     */
    setButtonLoading(buttonId, loading = true) {
        const button = document.getElementById(buttonId);
        if (!button) return;

        if (loading) {
            button.disabled = true;
            button.classList.add('opacity-75', 'cursor-not-allowed');
            
            // Store original content
            if (!button.dataset.originalContent) {
                button.dataset.originalContent = button.innerHTML;
            }
            
            button.innerHTML = `
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
            `;
        } else {
            button.disabled = false;
            button.classList.remove('opacity-75', 'cursor-not-allowed');
            
            if (button.dataset.originalContent) {
                button.innerHTML = button.dataset.originalContent;
            }
        }
    }

    /**
     * Create a loading state for file input
     */
    createFileLoadingState() {
        return new Promise((resolve) => {
            const overlay = this.showLoading('Preparing to load workout...');
            
            // Simulate preparation time
            setTimeout(() => {
                this.updateProgress(0);
                resolve();
            }, 500);
        });
    }

    /**
     * Simulate progressive loading for better UX
     */
    async simulateProgressiveLoading(steps = this.loadingSteps) {
        for (let i = 0; i < steps.length; i++) {
            this.updateProgress(i);
            // Add small delay for visual feedback
            await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));
        }
    }
}

// Utility function to delay execution (useful for smooth transitions)
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Export singleton instance
export const loadingManager = new LoadingManager();