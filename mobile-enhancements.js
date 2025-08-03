/**
 * Mobile-specific enhancements and touch interactions
 */

export class MobileEnhancements {
    constructor() {
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
        this.minSwipeDistance = 50;
        this.maxVerticalDistance = 100;
        this.currentSegmentIndex = null;
        
        this.setupMobileOptimizations();
        this.setupTouchGestures();
        this.setupViewportHandling();
    }

    setupMobileOptimizations() {
        // Add mobile-specific CSS classes
        if (this.isMobile()) {
            document.body.classList.add('mobile-device');
            
            // Optimize for touch
            document.body.style.touchAction = 'manipulation';
            
            // Add mobile-specific meta tags if not present
            this.ensureViewportMeta();
            
            // Adjust UI for mobile
            this.optimizeMobileUI();
        }
    }

    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }

    ensureViewportMeta() {
        let viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
            viewport = document.createElement('meta');
            viewport.name = 'viewport';
            viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
            document.head.appendChild(viewport);
        }
    }

    optimizeMobileUI() {
        // Add mobile-specific styles
        const mobileStyles = document.createElement('style');
        mobileStyles.textContent = `
            .mobile-device {
                -webkit-text-size-adjust: 100%;
                -webkit-tap-highlight-color: transparent;
            }
            
            .mobile-device .chart-container {
                position: relative;
                touch-action: pan-x pan-y;
            }
            
            .mobile-device .chart-container::after {
                content: "Swipe left/right to navigate segments";
                position: absolute;
                bottom: 8px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                opacity: 0;
                transition: opacity 0.3s ease;
                pointer-events: none;
                z-index: 10;
            }
            
            .mobile-device .chart-container.show-touch-hint::after {
                opacity: 1;
            }
            
            .mobile-device .chat-panel {
                bottom: 0;
                top: auto;
                height: 60vh;
                transform: translateY(calc(100% - 60px));
                transition: transform 0.3s ease;
            }
            
            .mobile-device .chat-panel.expanded {
                transform: translateY(0);
            }
            
            .mobile-device .button-group {
                flex-direction: column;
                gap: 8px;
            }
            
            .mobile-device .button-group button {
                width: 100%;
                min-height: 44px;
            }
            
            .mobile-device .form-input {
                min-height: 44px;
                font-size: 16px; /* Prevents zoom on iOS */
            }
            
            @media (max-width: 768px) {
                .container {
                    padding-left: 16px;
                    padding-right: 16px;
                }
                
                .main-content {
                    padding-right: 0 !important;
                }
                
                .chat-panel {
                    width: 100% !important;
                    right: 0 !important;
                }
            }
        `;
        document.head.appendChild(mobileStyles);
    }

    setupTouchGestures() {
        const chartCanvas = document.getElementById('workoutChart');
        if (chartCanvas) {
            this.setupChartTouchGestures(chartCanvas);
        }

        // Setup general touch gestures
        document.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
        document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        document.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: true });
    }

    setupChartTouchGestures(canvas) {
        let isTouch = false;
        let startX = 0;
        let startY = 0;

        canvas.addEventListener('touchstart', (e) => {
            isTouch = true;
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            
            // Show touch hint
            const container = canvas.closest('.chart-container');
            if (container) {
                container.classList.add('show-touch-hint');
                setTimeout(() => {
                    container.classList.remove('show-touch-hint');
                }, 2000);
            }
        }, { passive: true });

        canvas.addEventListener('touchmove', (e) => {
            if (!isTouch) return;
            
            const touch = e.touches[0];
            const deltaX = touch.clientX - startX;
            const deltaY = Math.abs(touch.clientY - startY);
            
            // Prevent default if it's a horizontal swipe
            if (Math.abs(deltaX) > deltaY && Math.abs(deltaX) > 10) {
                e.preventDefault();
            }
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            if (!isTouch) return;
            isTouch = false;
            
            const touch = e.changedTouches[0];
            const deltaX = touch.clientX - startX;
            const deltaY = Math.abs(touch.clientY - startY);
            
            // Check if it's a horizontal swipe
            if (Math.abs(deltaX) > this.minSwipeDistance && deltaY < this.maxVerticalDistance) {
                const direction = deltaX > 0 ? 'right' : 'left';
                this.handleChartSwipe(direction);
                
                // Provide haptic feedback if available
                this.provideHapticFeedback();
            }
        }, { passive: true });
    }

    handleTouchStart(e) {
        if (e.touches.length === 1) {
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
        }
    }

    handleTouchMove(e) {
        // Handle pull-to-refresh prevention on certain elements
        const target = e.target;
        if (target.closest('.no-pull-refresh') && e.touches[0].clientY > this.touchStartY) {
            e.preventDefault();
        }
    }

    handleTouchEnd(e) {
        if (e.changedTouches.length === 1) {
            this.touchEndX = e.changedTouches[0].clientX;
            this.touchEndY = e.changedTouches[0].clientY;
            
            // Check for gestures
            this.handleGesture();
        }
    }

    handleGesture() {
        const deltaX = this.touchEndX - this.touchStartX;
        const deltaY = this.touchEndY - this.touchStartY;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        // Only process if it's a significant gesture
        if (absDeltaX < this.minSwipeDistance && absDeltaY < this.minSwipeDistance) {
            return;
        }

        // Determine gesture type
        if (absDeltaX > absDeltaY) {
            // Horizontal swipe
            const direction = deltaX > 0 ? 'right' : 'left';
            this.handleHorizontalSwipe(direction);
        } else {
            // Vertical swipe
            const direction = deltaY > 0 ? 'down' : 'up';
            this.handleVerticalSwipe(direction);
        }
    }

    handleChartSwipe(direction) {
        // Navigate chart segments
        if (window.app && window.app.workout && window.app.workout.workoutData.segments) {
            const segments = window.app.workout.workoutData.segments;
            let newIndex = this.currentSegmentIndex || 0;
            
            if (direction === 'left' && newIndex < segments.length - 1) {
                newIndex++;
            } else if (direction === 'right' && newIndex > 0) {
                newIndex--;
            }
            
            if (newIndex !== this.currentSegmentIndex) {
                this.currentSegmentIndex = newIndex;
                this.highlightSegment(newIndex);
                this.announceSegmentChange(newIndex, segments[newIndex]);
            }
        }
    }

    handleHorizontalSwipe(direction) {
        // Handle app-level horizontal swipes
        if (direction === 'left') {
            // Show chat panel or next view
            this.showChatPanel();
        } else if (direction === 'right') {
            // Hide chat panel or previous view
            this.hideChatPanel();
        }
    }

    handleVerticalSwipe(direction) {
        // Handle vertical swipes for scrolling or panel controls
        if (direction === 'up') {
            // Could expand bottom panels or show more info
            this.expandBottomPanel();
        } else if (direction === 'down') {
            // Could collapse panels or show less info
            this.collapseBottomPanel();
        }
    }

    showChatPanel() {
        const chatPanel = document.getElementById('chatPanel');
        if (chatPanel && this.isMobile()) {
            chatPanel.classList.add('expanded');
            this.announceAction('Chat panel opened');
        }
    }

    hideChatPanel() {
        const chatPanel = document.getElementById('chatPanel');
        if (chatPanel && this.isMobile()) {
            chatPanel.classList.remove('expanded');
            this.announceAction('Chat panel closed');
        }
    }

    expandBottomPanel() {
        const workoutInfo = document.getElementById('workoutInfo');
        if (workoutInfo && workoutInfo.style.display !== 'none') {
            workoutInfo.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    collapseBottomPanel() {
        // Scroll back to chart
        const chartContainer = document.querySelector('.chart-container');
        if (chartContainer) {
            chartContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    highlightSegment(index) {
        if (window.app && window.app.setSelectedSegmentIndex) {
            window.app.setSelectedSegmentIndex(index);
        }
    }

    announceSegmentChange(index, segment) {
        const message = `Segment ${index + 1}. Power: ${Math.round(segment.power || 0)}%. Duration: ${segment.duration || 0} seconds.`;
        this.announceAction(message);
        
        // Show visual feedback
        this.showSegmentToast(message);
    }

    showSegmentToast(message) {
        // Remove existing toast
        const existingToast = document.getElementById('segmentToast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.id = 'segmentToast';
        toast.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white px-4 py-2 rounded-lg text-sm font-medium z-50 transition-opacity duration-300';
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Auto-remove
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    toast.remove();
                }
            }, 300);
        }, 2000);
    }

    provideHapticFeedback() {
        // Provide haptic feedback if available
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }

    announceAction(message) {
        // Screen reader announcement
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            if (document.body.contains(announcement)) {
                document.body.removeChild(announcement);
            }
        }, 1000);
    }

    setupViewportHandling() {
        // Handle viewport changes (keyboard show/hide on mobile)
        const initialViewportHeight = window.innerHeight;
        
        window.addEventListener('resize', () => {
            const currentHeight = window.innerHeight;
            const heightDifference = initialViewportHeight - currentHeight;
            
            // If height decreased significantly, keyboard is probably open
            if (heightDifference > 150) {
                document.body.classList.add('keyboard-open');
            } else {
                document.body.classList.remove('keyboard-open');
            }
        });
        
        // Add styles for keyboard handling
        const keyboardStyles = document.createElement('style');
        keyboardStyles.textContent = `
            .keyboard-open .chat-panel {
                height: 40vh !important;
            }
            
            .keyboard-open .fixed-bottom {
                position: relative !important;
            }
        `;
        document.head.appendChild(keyboardStyles);
    }

    // Method to optimize button sizes for touch
    optimizeButtonSizes() {
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            const computedStyle = window.getComputedStyle(button);
            const height = parseInt(computedStyle.height);
            
            // Ensure minimum touch target size (44px recommended)
            if (height < 44) {
                button.style.minHeight = '44px';
                button.style.paddingTop = '8px';
                button.style.paddingBottom = '8px';
            }
        });
    }

    // Initialize mobile enhancements
    init() {
        if (this.isMobile()) {
            this.optimizeButtonSizes();
            
            // Add loading optimization for mobile
            document.addEventListener('DOMContentLoaded', () => {
                // Defer non-critical operations on mobile
                setTimeout(() => {
                    this.optimizeMobilePerformance();
                }, 1000);
            });
        }
    }

    optimizeMobilePerformance() {
        // Reduce animation complexity on low-end devices
        if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
            document.body.classList.add('reduced-motion');
            
            const reducedMotionStyles = document.createElement('style');
            reducedMotionStyles.textContent = `
                .reduced-motion * {
                    animation-duration: 0.01ms !important;
                    animation-iteration-count: 1 !important;
                    transition-duration: 0.01ms !important;
                }
            `;
            document.head.appendChild(reducedMotionStyles);
        }
    }
}

// Export singleton instance
export const mobileEnhancements = new MobileEnhancements();