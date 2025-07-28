/**
 * WorkoutComparison Manager
 * Side-by-side workout comparison, visual overlay, and progression analysis
 * 
 * @class WorkoutComparison
 * @description Manages workout comparison interface and analysis tools
 */
import { workoutStorage } from './storage.js';
import { formatDuration } from './workout.js';

export class WorkoutComparison {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.selectedWorkouts = new Map(); // Map of workoutId -> workout data
        this.comparisonMode = 'sidebyside'; // 'sidebyside', 'overlay', 'metrics'
        this.isComparisonActive = false;
        
        // Chart instances for comparison
        this.comparisonCharts = new Map();
        
        // Bind methods
        this.handleWorkoutSelection = this.handleWorkoutSelection.bind(this);
        this.closeComparison = this.closeComparison.bind(this);
    }

    /**
     * Initialize comparison functionality
     */
    initialize() {
        this.createComparisonInterface();
        this.bindComparisonEvents();
    }

    /**
     * Create the comparison interface UI
     */
    createComparisonInterface() {
        // Create comparison panel (initially hidden)
        const comparisonPanel = document.createElement('div');
        comparisonPanel.id = 'comparisonPanel';
        comparisonPanel.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 hidden';
        
        comparisonPanel.innerHTML = `
            <div class="h-full flex flex-col">
                <!-- Comparison Header -->
                <div class="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                        <h2 class="text-xl font-semibold text-gray-900">Workout Comparison</h2>
                        <div class="flex space-x-2">
                            <button id="sideBySideMode" class="px-3 py-1 text-sm rounded-lg bg-blue-600 text-white">
                                Side by Side
                            </button>
                            <button id="overlayMode" class="px-3 py-1 text-sm rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300">
                                Overlay
                            </button>
                            <button id="metricsMode" class="px-3 py-1 text-sm rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300">
                                Metrics
                            </button>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span id="selectedCount" class="text-sm text-gray-600">0 workouts selected</span>
                        <button id="clearSelection" class="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">
                            Clear
                        </button>
                        <button id="closeComparison" class="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center">
                            ×
                        </button>
                    </div>
                </div>

                <!-- Comparison Content -->
                <div class="flex-1 overflow-hidden bg-gray-50">
                    <!-- Side by Side View -->
                    <div id="sideBySideView" class="h-full overflow-auto p-6">
                        <div id="sideBySideContent" class="grid gap-6">
                            <!-- Dynamic content based on selected workouts -->
                        </div>
                    </div>

                    <!-- Overlay View -->
                    <div id="overlayView" class="h-full overflow-auto p-6 hidden">
                        <div class="bg-white rounded-lg shadow-lg p-6">
                            <h3 class="text-lg font-semibold mb-4">Power Profile Overlay</h3>
                            <div class="mb-4">
                                <canvas id="overlayChart" class="w-full h-96"></canvas>
                            </div>
                            <div id="overlayLegend" class="flex flex-wrap gap-2">
                                <!-- Dynamic legend -->
                            </div>
                        </div>
                    </div>

                    <!-- Metrics View -->
                    <div id="metricsView" class="h-full overflow-auto p-6 hidden">
                        <div class="bg-white rounded-lg shadow-lg overflow-hidden">
                            <div class="px-6 py-4 border-b border-gray-200">
                                <h3 class="text-lg font-semibold">Detailed Comparison</h3>
                            </div>
                            <div class="overflow-x-auto">
                                <table id="metricsTable" class="w-full">
                                    <thead class="bg-gray-50">
                                        <tr>
                                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Metric
                                            </th>
                                            <!-- Dynamic workout columns -->
                                        </tr>
                                    </thead>
                                    <tbody id="metricsTableBody" class="bg-white divide-y divide-gray-200">
                                        <!-- Dynamic comparison rows -->
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Progression Analysis -->
                        <div class="mt-6 bg-white rounded-lg shadow-lg p-6">
                            <h3 class="text-lg font-semibold mb-4">Progression Analysis</h3>
                            <div id="progressionContent">
                                <!-- Dynamic progression analysis -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(comparisonPanel);

        // Add comparison toggle to library
        this.addComparisonControls();
    }

    /**
     * Add comparison controls to the library interface
     */
    addComparisonControls() {
        // Add selection checkboxes to workout cards (will be handled in library.js)
        const style = document.createElement('style');
        style.textContent = `
            .workout-card.comparison-mode {
                position: relative;
                cursor: pointer;
            }
            
            .workout-card.comparison-mode::before {
                content: '';
                position: absolute;
                top: 8px;
                left: 8px;
                width: 20px;
                height: 20px;
                border: 2px solid #d1d5db;
                border-radius: 3px;
                background: white;
                z-index: 10;
            }
            
            .workout-card.comparison-mode.selected::before {
                background: #3b82f6;
                border-color: #3b82f6;
                background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='m13.854 3.646-8 8-.708-.708 8-8z'/%3e%3cpath d='m5.354 7.146-3-3-.708.708 3 3z'/%3e%3c/svg%3e");
                background-size: 12px;
                background-position: center;
                background-repeat: no-repeat;
            }

            .comparison-toolbar {
                position: sticky;
                bottom: 0;
                background: linear-gradient(to top, #ffffff, rgba(255, 255, 255, 0.95));
                backdrop-filter: blur(10px);
                border-top: 1px solid #e5e7eb;
                padding: 12px 16px;
                transform: translateY(100%);
                transition: transform 0.3s ease-in-out;
                z-index: 20;
            }

            .comparison-toolbar.show {
                transform: translateY(0);
            }
        `;
        document.head.appendChild(style);

        // Add comparison toolbar to library panel
        const libraryPanel = document.getElementById('libraryPanel');
        if (libraryPanel) {
            const toolbar = document.createElement('div');
            toolbar.id = 'comparisonToolbar';
            toolbar.className = 'comparison-toolbar';
            toolbar.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <span id="comparisonCount" class="text-sm font-medium text-gray-700">0 selected</span>
                        <button id="enableComparison" class="text-sm text-blue-600 hover:text-blue-700" disabled>
                            Enable Comparison Mode
                        </button>
                    </div>
                    <div class="flex space-x-2">
                        <button id="compareSelected" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                            Compare Workouts
                        </button>
                        <button id="clearComparisonSelection" class="px-3 py-2 text-sm text-gray-600 hover:text-gray-800">
                            Clear
                        </button>
                    </div>
                </div>
            `;
            libraryPanel.appendChild(toolbar);
        }
    }

    /**
     * Bind comparison event listeners
     */
    bindComparisonEvents() {
        // Comparison mode buttons
        document.getElementById('sideBySideMode')?.addEventListener('click', () => {
            this.switchComparisonMode('sidebyside');
        });

        document.getElementById('overlayMode')?.addEventListener('click', () => {
            this.switchComparisonMode('overlay');
        });

        document.getElementById('metricsMode')?.addEventListener('click', () => {
            this.switchComparisonMode('metrics');
        });

        // Close comparison
        document.getElementById('closeComparison')?.addEventListener('click', this.closeComparison);

        // Clear selection
        document.getElementById('clearSelection')?.addEventListener('click', () => {
            this.clearSelection();
        });

        // Comparison toolbar events
        document.getElementById('enableComparison')?.addEventListener('click', () => {
            this.toggleComparisonMode();
        });

        document.getElementById('compareSelected')?.addEventListener('click', () => {
            this.startComparison();
        });

        document.getElementById('clearComparisonSelection')?.addEventListener('click', () => {
            this.clearSelection();
        });

        // Close comparison panel on backdrop click
        document.getElementById('comparisonPanel')?.addEventListener('click', (e) => {
            if (e.target.id === 'comparisonPanel') {
                this.closeComparison();
            }
        });
    }

    /**
     * Toggle comparison mode in library
     */
    toggleComparisonMode() {
        const libraryContent = document.getElementById('libraryContent');
        const enableBtn = document.getElementById('enableComparison');
        
        if (!libraryContent) return;

        const isComparisonMode = libraryContent.classList.contains('comparison-mode');
        
        if (isComparisonMode) {
            // Exit comparison mode
            libraryContent.classList.remove('comparison-mode');
            document.querySelectorAll('.workout-card').forEach(card => {
                card.classList.remove('comparison-mode', 'selected');
                card.removeEventListener('click', this.handleWorkoutSelection);
            });
            enableBtn.textContent = 'Enable Comparison Mode';
            this.hideComparisonToolbar();
            this.clearSelection();
        } else {
            // Enter comparison mode
            libraryContent.classList.add('comparison-mode');
            document.querySelectorAll('.workout-card').forEach(card => {
                card.classList.add('comparison-mode');
                card.addEventListener('click', this.handleWorkoutSelection);
            });
            enableBtn.textContent = 'Exit Comparison Mode';
            this.showComparisonToolbar();
        }
    }

    /**
     * Handle workout selection for comparison
     */
    async handleWorkoutSelection(event) {
        event.preventDefault();
        event.stopPropagation();

        const card = event.currentTarget;
        const workoutId = card.dataset.workoutId;
        
        if (!workoutId) return;

        const isSelected = card.classList.contains('selected');

        if (isSelected) {
            // Deselect workout
            card.classList.remove('selected');
            this.selectedWorkouts.delete(workoutId);
        } else {
            // Select workout (max 5 workouts)
            if (this.selectedWorkouts.size >= 5) {
                this.showToast('Maximum 5 workouts can be compared at once', 'warning');
                return;
            }

            card.classList.add('selected');
            
            try {
                const workout = await workoutStorage.getWorkout(workoutId);
                if (workout) {
                    this.selectedWorkouts.set(workoutId, workout);
                }
            } catch (error) {
                console.error('Error loading workout for comparison:', error);
                card.classList.remove('selected');
                this.showToast('Error loading workout', 'error');
                return;
            }
        }

        this.updateComparisonControls();
    }

    /**
     * Update comparison controls based on selection
     */
    updateComparisonControls() {
        const count = this.selectedWorkouts.size;
        const countElement = document.getElementById('comparisonCount');
        const compareBtn = document.getElementById('compareSelected');

        if (countElement) {
            countElement.textContent = `${count} selected`;
        }

        if (compareBtn) {
            compareBtn.disabled = count < 2;
        }

        // Show/hide toolbar based on selection
        if (count > 0) {
            this.showComparisonToolbar();
        } else {
            this.hideComparisonToolbar();
        }
    }

    /**
     * Show comparison toolbar
     */
    showComparisonToolbar() {
        const toolbar = document.getElementById('comparisonToolbar');
        if (toolbar) {
            toolbar.classList.add('show');
        }
    }

    /**
     * Hide comparison toolbar
     */
    hideComparisonToolbar() {
        const toolbar = document.getElementById('comparisonToolbar');
        if (toolbar) {
            toolbar.classList.remove('show');
        }
    }

    /**
     * Start comparison with selected workouts
     */
    startComparison() {
        if (this.selectedWorkouts.size < 2) {
            this.showToast('Select at least 2 workouts to compare', 'warning');
            return;
        }

        this.isComparisonActive = true;
        document.getElementById('comparisonPanel').classList.remove('hidden');
        this.updateSelectedCount();
        this.renderComparison();
    }

    /**
     * Switch comparison mode
     */
    switchComparisonMode(mode) {
        this.comparisonMode = mode;

        // Update mode buttons
        document.querySelectorAll('#comparisonPanel button[id$="Mode"]').forEach(btn => {
            btn.className = 'px-3 py-1 text-sm rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300';
        });

        const activeBtn = document.getElementById(`${mode.replace('sidebyside', 'sideBySide')}Mode`);
        if (activeBtn) {
            activeBtn.className = 'px-3 py-1 text-sm rounded-lg bg-blue-600 text-white';
        }

        // Show/hide views
        document.getElementById('sideBySideView').classList.toggle('hidden', mode !== 'sidebyside');
        document.getElementById('overlayView').classList.toggle('hidden', mode !== 'overlay');
        document.getElementById('metricsView').classList.toggle('hidden', mode !== 'metrics');

        this.renderComparison();
    }

    /**
     * Render comparison based on current mode
     */
    renderComparison() {
        if (!this.isComparisonActive || this.selectedWorkouts.size === 0) return;

        switch (this.comparisonMode) {
            case 'sidebyside':
                this.renderSideBySideComparison();
                break;
            case 'overlay':
                this.renderOverlayComparison();
                break;
            case 'metrics':
                this.renderMetricsComparison();
                break;
        }
    }

    /**
     * Render side-by-side comparison
     */
    renderSideBySideComparison() {
        const content = document.getElementById('sideBySideContent');
        if (!content) return;

        const workouts = Array.from(this.selectedWorkouts.values());
        
        content.className = `grid gap-6 grid-cols-${Math.min(workouts.length, 3)}`;
        content.innerHTML = '';

        workouts.forEach(workout => {
            const card = this.createWorkoutComparisonCard(workout);
            content.appendChild(card);
        });
    }

    /**
     * Create a workout comparison card
     */
    createWorkoutComparisonCard(workout) {
        const card = document.createElement('div');
        card.className = 'bg-white rounded-lg shadow-lg overflow-hidden';
        
        const difficultyStars = '★'.repeat(workout.difficulty) + '☆'.repeat(5 - workout.difficulty);
        const duration = formatDuration(workout.duration);

        card.innerHTML = `
            <div class="p-4 border-b border-gray-200">
                <h4 class="font-semibold text-gray-900 truncate">${this.escapeHtml(workout.name)}</h4>
                <p class="text-sm text-gray-600">${this.escapeHtml(workout.author)}</p>
            </div>
            
            <div class="p-4">
                <div class="grid grid-cols-2 gap-3 mb-4">
                    <div class="text-center">
                        <div class="text-lg font-semibold text-blue-600">${duration}</div>
                        <div class="text-xs text-gray-500">Duration</div>
                    </div>
                    <div class="text-center">
                        <div class="text-lg font-semibold text-orange-600">${workout.tss}</div>
                        <div class="text-xs text-gray-500">TSS</div>
                    </div>
                    <div class="text-center">
                        <div class="text-lg font-semibold text-green-600">${workout.averagePower}%</div>
                        <div class="text-xs text-gray-500">Avg Power</div>
                    </div>
                    <div class="text-center">
                        <div class="text-lg font-semibold text-red-600">${workout.maxPower}%</div>
                        <div class="text-xs text-gray-500">Max Power</div>
                    </div>
                </div>

                <div class="mb-3">
                    <div class="flex items-center justify-between text-sm">
                        <span class="bg-gray-100 px-2 py-1 rounded">${workout.category}</span>
                        <span class="text-yellow-600">${difficultyStars}</span>
                    </div>
                </div>

                <div class="mb-4">
                    <canvas id="comparisonChart${workout.id}" class="w-full h-32"></canvas>
                </div>

                <div class="flex justify-between">
                    <button class="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200" 
                            onclick="window.workoutComparison.loadWorkout('${workout.id}')">
                        Load Workout
                    </button>
                    <button class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                            onclick="window.workoutComparison.removeFromComparison('${workout.id}')">
                        Remove
                    </button>
                </div>
            </div>
        `;

        // Create mini chart for this workout
        setTimeout(() => {
            this.createMiniChart(workout);
        }, 100);

        return card;
    }

    /**
     * Create mini chart for workout comparison card
     */
    createMiniChart(workout) {
        const canvas = document.getElementById(`comparisonChart${workout.id}`);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const workoutData = workout.workoutData;

        if (!workoutData.segments || workoutData.segments.length === 0) return;

        // Prepare chart data
        const chartData = this.prepareChartData(workoutData);

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Power',
                    data: chartData.powerData,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        display: false
                    },
                    y: {
                        display: false,
                        min: 0,
                        max: 200
                    }
                },
                elements: {
                    point: {
                        radius: 0
                    }
                }
            }
        });

        this.comparisonCharts.set(workout.id, chart);
    }

    /**
     * Render overlay comparison
     */
    renderOverlayComparison() {
        const canvas = document.getElementById('overlayChart');
        const legend = document.getElementById('overlayLegend');
        
        if (!canvas || !legend) return;

        // Destroy existing chart
        if (this.overlayChart) {
            this.overlayChart.destroy();
        }

        const ctx = canvas.getContext('2d');
        const workouts = Array.from(this.selectedWorkouts.values());
        
        const colors = [
            '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
            '#ec4899', '#14b8a6', '#f97316'
        ];

        const datasets = workouts.map((workout, index) => {
            const chartData = this.prepareChartData(workout.workoutData);
            return {
                label: workout.name,
                data: chartData.powerData,
                borderColor: colors[index % colors.length],
                backgroundColor: `${colors[index % colors.length]}20`,
                borderWidth: 2,
                fill: false,
                tension: 0.1
            };
        });

        // Use the longest workout for labels
        const longestWorkout = workouts.reduce((longest, current) => 
            current.duration > longest.duration ? current : longest
        );
        const labels = this.prepareChartData(longestWorkout.workoutData).labels;

        this.overlayChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: (context) => {
                                const minutes = Math.floor(context[0].dataIndex / 60);
                                const seconds = context[0].dataIndex % 60;
                                return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                            },
                            label: (context) => {
                                return `${context.dataset.label}: ${context.parsed.y}% FTP`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Power (% FTP)'
                        },
                        min: 0,
                        max: 200
                    }
                }
            }
        });

        // Create legend
        legend.innerHTML = workouts.map((workout, index) => `
            <div class="flex items-center space-x-2">
                <div class="w-3 h-3 rounded-full" style="background-color: ${colors[index % colors.length]}"></div>
                <span class="text-sm">${this.escapeHtml(workout.name)}</span>
            </div>
        `).join('');
    }

    /**
     * Render metrics comparison table
     */
    renderMetricsComparison() {
        const table = document.getElementById('metricsTable');
        const tbody = document.getElementById('metricsTableBody');
        
        if (!table || !tbody) return;

        const workouts = Array.from(this.selectedWorkouts.values());
        
        // Update table header
        const thead = table.querySelector('thead tr');
        thead.innerHTML = `
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Metric
            </th>
            ${workouts.map(workout => `
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ${this.escapeHtml(workout.name)}
                </th>
            `).join('')}
        `;

        // Metrics to compare
        const metrics = [
            { key: 'duration', label: 'Duration', format: (value) => formatDuration(value) },
            { key: 'tss', label: 'TSS', format: (value) => value },
            { key: 'averagePower', label: 'Average Power', format: (value) => `${value}%` },
            { key: 'maxPower', label: 'Max Power', format: (value) => `${value}%` },
            { key: 'category', label: 'Category', format: (value) => value },
            { key: 'difficulty', label: 'Difficulty', format: (value) => '★'.repeat(value) + '☆'.repeat(5 - value) },
            { key: 'author', label: 'Author', format: (value) => value },
            { key: 'dateCreated', label: 'Date Created', format: (value) => new Date(value).toLocaleDateString() }
        ];

        tbody.innerHTML = metrics.map(metric => `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${metric.label}
                </td>
                ${workouts.map(workout => `
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${metric.format(workout[metric.key] || '-')}
                    </td>
                `).join('')}
            </tr>
        `).join('');

        // Render progression analysis
        this.renderProgressionAnalysis(workouts);
    }

    /**
     * Render progression analysis
     */
    renderProgressionAnalysis(workouts) {
        const content = document.getElementById('progressionContent');
        if (!content) return;

        // Sort workouts by date for progression analysis
        const sortedWorkouts = [...workouts].sort((a, b) => 
            new Date(a.dateCreated) - new Date(b.dateCreated)
        );

        if (sortedWorkouts.length < 2) {
            content.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <p>Need at least 2 workouts for progression analysis</p>
                </div>
            `;
            return;
        }

        // Calculate progression metrics
        const firstWorkout = sortedWorkouts[0];
        const lastWorkout = sortedWorkouts[sortedWorkouts.length - 1];
        
        const durationChange = lastWorkout.duration - firstWorkout.duration;
        const tssChange = lastWorkout.tss - firstWorkout.tss;
        const avgPowerChange = lastWorkout.averagePower - firstWorkout.averagePower;
        const maxPowerChange = lastWorkout.maxPower - firstWorkout.maxPower;

        const daysBetween = Math.ceil(
            (new Date(lastWorkout.dateCreated) - new Date(firstWorkout.dateCreated)) / (1000 * 60 * 60 * 24)
        );

        content.innerHTML = `
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div class="bg-blue-50 p-4 rounded-lg">
                    <div class="text-xs font-medium text-blue-600 uppercase">Duration Change</div>
                    <div class="text-lg font-bold text-blue-900">
                        ${durationChange >= 0 ? '+' : ''}${formatDuration(Math.abs(durationChange))}
                    </div>
                    <div class="text-xs text-blue-600">
                        ${durationChange >= 0 ? '↗️ Increased' : '↘️ Decreased'}
                    </div>
                </div>
                
                <div class="bg-orange-50 p-4 rounded-lg">
                    <div class="text-xs font-medium text-orange-600 uppercase">TSS Change</div>
                    <div class="text-lg font-bold text-orange-900">
                        ${tssChange >= 0 ? '+' : ''}${tssChange}
                    </div>
                    <div class="text-xs text-orange-600">
                        ${tssChange >= 0 ? '↗️ Increased' : '↘️ Decreased'}
                    </div>
                </div>
                
                <div class="bg-green-50 p-4 rounded-lg">
                    <div class="text-xs font-medium text-green-600 uppercase">Avg Power Change</div>
                    <div class="text-lg font-bold text-green-900">
                        ${avgPowerChange >= 0 ? '+' : ''}${avgPowerChange}%
                    </div>
                    <div class="text-xs text-green-600">
                        ${avgPowerChange >= 0 ? '↗️ Increased' : '↘️ Decreased'}
                    </div>
                </div>
                
                <div class="bg-purple-50 p-4 rounded-lg">
                    <div class="text-xs font-medium text-purple-600 uppercase">Max Power Change</div>
                    <div class="text-lg font-bold text-purple-900">
                        ${maxPowerChange >= 0 ? '+' : ''}${maxPowerChange}%
                    </div>
                    <div class="text-xs text-purple-600">
                        ${maxPowerChange >= 0 ? '↗️ Increased' : '↘️ Decreased'}
                    </div>
                </div>
            </div>

            <div class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-semibold mb-2">Analysis Summary</h4>
                <p class="text-sm text-gray-600 mb-2">
                    Comparing <strong>${firstWorkout.name}</strong> (${new Date(firstWorkout.dateCreated).toLocaleDateString()}) 
                    to <strong>${lastWorkout.name}</strong> (${new Date(lastWorkout.dateCreated).toLocaleDateString()})
                </p>
                <p class="text-sm text-gray-600">
                    <strong>Time period:</strong> ${daysBetween} days
                </p>
                <div class="mt-3">
                    ${this.generateProgressionInsights(sortedWorkouts)}
                </div>
            </div>
        `;
    }

    /**
     * Generate progression insights
     */
    generateProgressionInsights(workouts) {
        const insights = [];
        
        const categories = [...new Set(workouts.map(w => w.category))];
        if (categories.length > 1) {
            insights.push(`✨ Workout variety: ${categories.join(', ')}`);
        }

        const avgTSS = workouts.reduce((sum, w) => sum + w.tss, 0) / workouts.length;
        insights.push(`📊 Average TSS: ${Math.round(avgTSS)}`);

        const difficulties = workouts.map(w => w.difficulty);
        const avgDifficulty = difficulties.reduce((sum, d) => sum + d, 0) / difficulties.length;
        insights.push(`⭐ Average difficulty: ${avgDifficulty.toFixed(1)}/5`);

        return insights.map(insight => `<p class="text-sm text-gray-700">${insight}</p>`).join('');
    }

    /**
     * Prepare chart data from workout data
     */
    prepareChartData(workoutData) {
        if (!workoutData.segments || workoutData.segments.length === 0) {
            return { labels: [], powerData: [] };
        }

        const labels = [];
        const powerData = [];
        let currentTime = 0;

        workoutData.segments.forEach(segment => {
            const duration = segment.duration || 0;
            let power = 65; // Default power

            if (segment.power !== undefined) {
                power = segment.power * 100;
            } else if (segment.powerLow !== undefined && segment.powerHigh !== undefined) {
                power = ((segment.powerLow + segment.powerHigh) / 2) * 100;
            }

            // Add data points for this segment
            for (let i = 0; i < duration; i++) {
                const minutes = Math.floor(currentTime / 60);
                const seconds = currentTime % 60;
                labels.push(`${minutes}:${seconds.toString().padStart(2, '0')}`);
                powerData.push(Math.round(power));
                currentTime++;
            }
        });

        return { labels, powerData };
    }

    /**
     * Load a workout from comparison
     */
    async loadWorkout(workoutId) {
        try {
            const workout = this.selectedWorkouts.get(workoutId);
            if (!workout) return;

            this.visualizer.createWorkoutFromData(workout.workoutData);
            this.showToast(`Loaded "${workout.name}" from comparison`, 'success');
            this.closeComparison();
        } catch (error) {
            console.error('Error loading workout:', error);
            this.showToast('Failed to load workout', 'error');
        }
    }

    /**
     * Remove workout from comparison
     */
    removeFromComparison(workoutId) {
        this.selectedWorkouts.delete(workoutId);
        
        // Update UI
        const card = document.querySelector(`[data-workout-id="${workoutId}"]`);
        if (card) {
            card.classList.remove('selected');
        }

        this.updateSelectedCount();
        this.updateComparisonControls();

        if (this.selectedWorkouts.size < 2) {
            this.closeComparison();
        } else {
            this.renderComparison();
        }
    }

    /**
     * Clear all selected workouts
     */
    clearSelection() {
        // Clear selected workouts
        this.selectedWorkouts.clear();

        // Update UI
        document.querySelectorAll('.workout-card.selected').forEach(card => {
            card.classList.remove('selected');
        });

        this.updateSelectedCount();
        this.updateComparisonControls();
        
        if (this.isComparisonActive) {
            this.closeComparison();
        }
    }

    /**
     * Update selected count display
     */
    updateSelectedCount() {
        const count = this.selectedWorkouts.size;
        const countElement = document.getElementById('selectedCount');
        
        if (countElement) {
            countElement.textContent = `${count} workout${count !== 1 ? 's' : ''} selected`;
        }
    }

    /**
     * Close comparison panel
     */
    closeComparison() {
        this.isComparisonActive = false;
        document.getElementById('comparisonPanel').classList.add('hidden');

        // Destroy charts
        this.comparisonCharts.forEach(chart => chart.destroy());
        this.comparisonCharts.clear();

        if (this.overlayChart) {
            this.overlayChart.destroy();
            this.overlayChart = null;
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        if (this.visualizer && this.visualizer.ui && this.visualizer.ui.showToast) {
            this.visualizer.ui.showToast(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export for global access
window.WorkoutComparison = WorkoutComparison;