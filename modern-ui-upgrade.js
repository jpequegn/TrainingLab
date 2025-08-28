/**
 * Modern UI Upgrade Script
 * Progressively enhances the existing UI with modern components
 */

export class ModernUIUpgrade {
  constructor() {
    this.isUpgraded = false;
    this.initializeUpgrade();
  }

  initializeUpgrade() {
    console.log('🔧 Initializing Modern UI Upgrade...', {
      readyState: document.readyState,
      bodyExists: !!document.body,
      elementsCount: document.querySelectorAll('*').length,
    });

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () =>
        this.performUpgrade()
      );
    } else {
      // Add a small delay to ensure all scripts are loaded
      setTimeout(() => this.performUpgrade(), 100);
    }
  }

  performUpgrade() {
    try {
      console.log('🎨 Starting Modern UI Upgrade...');

      // 1. Upgrade body and main containers
      this.upgradeLayout();

      // 2. Modernize cards and panels
      this.modernizeCards();

      // 3. Enhance buttons
      this.enhanceButtons();

      // 4. Upgrade form inputs
      this.upgradeInputs();

      // 5. Add modern metrics cards
      this.createModernMetrics();

      // 6. Enhance navigation
      this.modernizeNavigation();

      // 7. Add glass effects
      this.addGlassEffects();

      // 8. Setup animations
      this.setupAnimations();

      this.isUpgraded = true;
      console.log('✨ Modern UI Upgrade Complete!');
    } catch (error) {
      console.error('❌ Modern UI Upgrade Failed:', error);
      // Fallback: just add basic modern styling
      document.body.classList.add('modern-ui-fallback');
    }
  }

  upgradeLayout() {
    // Update body classes for modern look
    document.body.className =
      'min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 text-foreground';

    // Modernize the main container
    const container = document.querySelector('.container');
    if (container) {
      container.classList.add('max-w-7xl', 'mx-auto', 'space-y-8');
      container.classList.remove('pr-80'); // Remove chat panel margin
    }
  }

  modernizeCards() {
    console.log('🔄 Modernizing cards...');
    // Upgrade existing cards to modern design - fix selector syntax
    const cardSelectors = ['.bg-white', '[class*="bg-white"]'];
    cardSelectors.forEach(selector => {
      try {
        console.log(`  Checking selector: ${selector}`);
        const cards = document.querySelectorAll(selector);
        console.log(`  Found ${cards.length} cards`);
        cards.forEach(card => {
          if (!card.classList.contains('modern-upgraded')) {
            card.classList.add('modern-upgraded');
            // Remove problematic classes safely
            card.classList.remove('bg-white');
            // Handle the bg-white/95 class more carefully
            card.className = card.className.replace(/bg-white\/\d+/g, '');
            card.classList.add('card-modern', 'backdrop-blur-sm');

            // Add hover effects with transition
            card.style.transition = 'transform 0.2s ease-out';
            card.addEventListener('mouseenter', () => {
              card.style.transform = 'translateY(-2px)';
            });
            card.addEventListener('mouseleave', () => {
              card.style.transform = 'translateY(0)';
            });
          }
        });
      } catch (e) {
        console.warn('Selector error:', selector, e);
      }
    });

    // Modernize the chart container specifically
    const chartContainer = document.querySelector('.chart-container');
    if (chartContainer) {
      chartContainer.classList.add(
        'card-modern',
        'hover:shadow-xl',
        'transition-all',
        'duration-300'
      );
      chartContainer.style.display = 'block'; // Ensure it's visible
    }

    // Modernize workout info panel
    const workoutInfo = document.getElementById('workoutInfo');
    if (workoutInfo) {
      workoutInfo.classList.add('card-modern', 'overflow-hidden');
    }
  }

  enhanceButtons() {
    // Upgrade all buttons to modern style
    const buttons = document.querySelectorAll('button:not(.modern-enhanced)');
    buttons.forEach(button => {
      button.classList.add('modern-enhanced');

      // Determine button style based on existing classes
      if (
        button.classList.contains('bg-indigo-600') ||
        button.classList.contains('bg-gradient-to-r')
      ) {
        button.classList.add('btn-modern');
      } else if (button.classList.contains('bg-gray-300')) {
        button.classList.add('btn-secondary');
      } else {
        button.classList.add('btn-outline');
      }

      // Add focus ring
      button.classList.add('focus-ring');
    });

    // Special handling for specific buttons
    const undoBtn = document.getElementById('undoEditBtn');
    if (undoBtn) {
      undoBtn.classList.add(
        'btn-modern',
        'bg-yellow-500',
        'hover:bg-yellow-600'
      );
    }

    // Upload and sample buttons - fix selector and add safety checks
    const uploadSection = document.querySelector('[class*="bg-white"]');
    if (uploadSection) {
      const buttons = uploadSection.querySelectorAll('button, label');
      buttons.forEach(btn => {
        if (
          (btn.textContent && btn.textContent.includes('Upload')) ||
          (btn.textContent && btn.textContent.includes('file'))
        ) {
          btn.classList.add(
            'btn-modern',
            'hover:scale-105',
            'transform',
            'transition-transform'
          );
        }
        if (btn.textContent && btn.textContent.includes('Sample')) {
          btn.classList.add(
            'btn-outline',
            'hover:scale-105',
            'transform',
            'transition-transform'
          );
        }
      });
    }
  }

  upgradeInputs() {
    // Modernize all inputs
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      if (!input.classList.contains('modern-enhanced')) {
        input.classList.add('modern-enhanced', 'input-modern');

        // Add focus effects
        input.addEventListener('focus', () => {
          input.parentElement?.classList.add('ring-2', 'ring-primary/20');
        });
        input.addEventListener('blur', () => {
          input.parentElement?.classList.remove('ring-2', 'ring-primary/20');
        });
      }
    });

    // Special handling for range slider
    const scaleSlider = document.getElementById('scaleSlider');
    if (scaleSlider) {
      scaleSlider.classList.add('modern-range');
    }
  }

  createModernMetrics() {
    // Find the workout stats section and modernize it - fix selector syntax
    const statsContainer =
      document.querySelector('.grid.grid-cols-2') ||
      document.querySelector('[class*="grid-cols-2"]');
    if (statsContainer) {
      statsContainer.classList.add('gap-6');

      // Modernize each stat card
      const statCards = statsContainer.querySelectorAll(
        '.bg-gradient-to-br, [class*="gradient-to-br"]'
      );
      statCards.forEach((card, index) => {
        if (!card.classList.contains('metrics-modernized')) {
          card.classList.add(
            'metrics-modernized',
            'card-modern',
            'hover:scale-105',
            'transform',
            'transition-all',
            'duration-300'
          );

          // Add modern icons
          const iconMap = ['⏱️', '🔥', '👤', '🚴'];
          const icon = iconMap[index] || '📊';

          const iconEl = document.createElement('div');
          iconEl.className =
            'w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary text-lg mb-2';
          iconEl.textContent = icon;

          const title = card.querySelector('.text-xs');
          if (title && title.parentElement) {
            title.parentElement.insertBefore(iconEl, title);
          }
        }
      });
    }
  }

  modernizeNavigation() {
    // Add modern navigation if header exists
    const header = document.querySelector('header');
    if (header) {
      // Create modern nav bar
      const nav = document.createElement('nav');
      nav.className =
        'sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mb-8';
      nav.innerHTML = `
                <div class="container flex h-16 items-center justify-between px-4 mx-auto">
                    <div class="flex items-center space-x-4">
                        <div class="flex items-center space-x-2">
                            <div class="w-8 h-8 bg-gradient-to-r from-violet-500 to-purple-500 rounded-lg flex items-center justify-center">
                                <span class="text-white font-bold text-sm">ZW</span>
                            </div>
                            <h1 class="text-xl font-bold text-foreground">Workout Visualizer</h1>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button id="helpButton" class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 w-10">
                            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>
                    </div>
                </div>
            `;

      // Insert nav at the beginning of body
      document.body.insertBefore(nav, document.body.firstChild);

      // Connect help button to shortcuts
      const helpButton = nav.querySelector('#helpButton');
      if (helpButton && window.shortcutManager) {
        helpButton.addEventListener('click', () => {
          window.shortcutManager.toggleShortcutsHelp();
        });
      }
    }
  }

  addGlassEffects() {
    // Add glass morphism to specific elements
    const glassElements = [
      '.bg-gradient-to-br.from-purple-50',
      '.bg-gray-50.rounded-xl',
      '#chatPanel',
    ];

    glassElements.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        el.classList.add('glass-card');
      });
    });

    // Chat panel special handling
    const chatPanel = document.getElementById('chatPanel');
    if (chatPanel) {
      chatPanel.classList.add('glass-card', 'border-l', 'border-white/20');
    }
  }

  setupAnimations() {
    // Add scroll animations to cards
    const cards = document.querySelectorAll('.card-modern, .bg-gradient-to-br');
    cards.forEach((card, index) => {
      card.classList.add('animate-on-scroll');
      card.style.animationDelay = `${index * 100}ms`;
    });

    // Setup intersection observer for animations
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
      observer.observe(el);
    });

    // Add subtle parallax to header
    const header = document.querySelector('header');
    if (header) {
      window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;
        header.style.transform = `translateY(${rate}px)`;
      });
    }
  }

  // Method to create modern metric cards
  createMetricCard(title, value, change, icon, trend = 'neutral') {
    const trendColors = {
      up: 'text-green-600 dark:text-green-400',
      down: 'text-red-600 dark:text-red-400',
      neutral: 'text-gray-600 dark:text-gray-400',
    };

    const card = document.createElement('div');
    card.className =
      'card-modern p-6 hover:scale-105 transform transition-all duration-300';
    card.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="space-y-1">
                    <p class="text-sm font-medium text-muted-foreground">${title}</p>
                    <p class="text-2xl font-bold tracking-tight">${value}</p>
                    ${
                      change
                        ? `<p class="text-xs ${trendColors[trend]} flex items-center gap-1">
                        ${trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'} ${change}
                    </p>`
                        : ''
                    }
                </div>
                <div class="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary text-lg">
                    ${icon}
                </div>
            </div>
        `;
    return card;
  }

  // Method to show upgrade complete notification
  showUpgradeNotification() {
    const toast = document.getElementById('toastNotification');
    if (toast) {
      const span = toast.querySelector('span');
      if (span) {
        span.textContent = '✨ UI upgraded to modern design!';
        toast.classList.add('show');

        setTimeout(() => {
          toast.classList.remove('show');
        }, 3000);
      }
    }
  }
}

// Auto-initialize the upgrade with better timing
function initializeModernUI() {
  try {
    const upgrader = new ModernUIUpgrade();

    // Show notification after upgrade
    setTimeout(() => {
      upgrader.showUpgradeNotification();
    }, 1000);
  } catch (error) {
    console.error('Failed to initialize Modern UI:', error);
  }
}

// Multiple initialization strategies
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeModernUI);
} else if (document.readyState === 'interactive') {
  setTimeout(initializeModernUI, 100);
} else {
  initializeModernUI();
}

// Export for manual use
window.ModernUIUpgrade = ModernUIUpgrade;
