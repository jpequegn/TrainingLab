/**
 * WorkoutLibrary Manager
 * UI and business logic for the workout library system
 * 
 * @class WorkoutLibrary
 * @description Manages the workout library interface and interactions
 */
import { workoutStorage } from './storage.js';
import { formatDuration } from './workout.js';
import { WorkoutComparison } from './comparison.js';

export class WorkoutLibrary {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.isInitialized = false;
        this.currentView = 'library'; // 'library', 'collections', 'search'
        this.currentFilters = {};
        this.searchQuery = '';
        
        // UI state
        this.selectedWorkouts = new Set();
        this.sortBy = 'dateModified';
        this.sortOrder = 'desc';
        
        // Initialize comparison functionality
        this.comparison = new WorkoutComparison(visualizer);
        
        // Initialize storage
        this.initializeStorage();
    }

    /**
     * Initialize the storage system
     */
    async initializeStorage() {
        try {
            await workoutStorage.initialize();
            this.isInitialized = true;
            console.log('Workout library initialized successfully');
            
            // Setup library UI if main application is ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setupLibraryUI());
            } else {
                this.setupLibraryUI();
            }
        } catch (error) {
            console.error('Failed to initialize workout library:', error);
            this.showToast('Failed to initialize workout library', 'error');
        }
    }

    /**
     * Setup the library UI components
     */
    setupLibraryUI() {
        this.createLibraryInterface();
        this.bindLibraryEvents();
        this.refreshLibraryView();
        
        // Initialize comparison functionality
        this.comparison.initialize();
        
        // Set global reference for comparison access
        window.workoutComparison = this.comparison;
    }

    /**
     * Create the main library interface
     */
    createLibraryInterface() {
        const container = document.querySelector('.container');
        if (!container) return;

        // Create library panel (initially hidden)
        const libraryPanel = document.createElement('div');
        libraryPanel.id = 'libraryPanel';
        libraryPanel.className = 'fixed left-0 top-0 h-full w-80 bg-white/95 backdrop-blur-sm shadow-2xl border-r border-white/20 z-30 transform -translate-x-full transition-transform duration-300';
        
        libraryPanel.innerHTML = `
            <div class="flex flex-col h-full">
                <!-- Library Header -->
                <div class="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-3 text-white flex items-center justify-between">
                    <div class="flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                        </svg>
                        <h3 class="font-semibold">Workout Library</h3>
                    </div>
                    <button id="toggleLibraryPanel" class="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center font-bold transition-all duration-200" title="Close">
                        ×
                    </button>
                </div>

                <!-- Library Navigation -->
                <div class="px-4 py-3 border-b border-gray-200">
                    <div class="flex space-x-1 bg-gray-100 rounded-lg p-1">
                        <button id="viewAllWorkouts" class="flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 bg-white text-gray-900 shadow-sm" data-view="library">
                            All Workouts
                        </button>
                        <button id="viewCollections" class="flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 text-gray-600 hover:text-gray-900" data-view="collections">
                            Collections
                        </button>
                    </div>
                </div>

                <!-- Search and Filters -->
                <div class="px-4 py-3 border-b border-gray-200 space-y-3">
                    <!-- Search -->
                    <div class="relative">
                        <input 
                            id="librarySearch" 
                            type="text" 
                            placeholder="Search workouts..." 
                            class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                        />
                        <svg class="w-4 h-4 absolute left-2.5 top-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>

                    <!-- Quick Filters -->
                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-medium text-gray-500 uppercase">Filters</span>
                            <button id="clearFilters" class="text-xs text-green-600 hover:text-green-700">Clear All</button>
                        </div>
                        
                        <!-- Category Filter -->
                        <select id="categoryFilter" class="w-full px-2 py-1 border border-gray-300 rounded text-xs">
                            <option value="">All Categories</option>
                            <option value="Recovery">Recovery</option>
                            <option value="Endurance">Endurance</option>
                            <option value="Threshold">Threshold</option>
                            <option value="VO2 Max">VO2 Max</option>
                            <option value="Neuromuscular">Neuromuscular</option>
                            <option value="Mixed">Mixed</option>
                        </select>

                        <!-- Difficulty Filter -->
                        <select id="difficultyFilter" class="w-full px-2 py-1 border border-gray-300 rounded text-xs">
                            <option value="">All Difficulties</option>
                            <option value="1">1 - Easy</option>
                            <option value="2">2 - Moderate</option>
                            <option value="3">3 - Hard</option>
                            <option value="4">4 - Very Hard</option>
                            <option value="5">5 - Extreme</option>
                        </select>

                        <!-- Duration Filter -->
                        <div class="flex space-x-1">
                            <select id="durationFilter" class="flex-1 px-2 py-1 border border-gray-300 rounded text-xs">
                                <option value="">Any Duration</option>
                                <option value="0-30">0-30 min</option>
                                <option value="30-60">30-60 min</option>
                                <option value="60-90">60-90 min</option>
                                <option value="90+">90+ min</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Sort Controls -->
                <div class="px-4 py-2 border-b border-gray-200">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-medium text-gray-500 uppercase">Sort by</span>
                        <select id="sortBy" class="text-xs border border-gray-300 rounded px-2 py-1">
                            <option value="dateModified">Last Modified</option>
                            <option value="dateCreated">Date Created</option>
                            <option value="name">Name</option>
                            <option value="duration">Duration</option>
                            <option value="tss">TSS</option>
                            <option value="difficulty">Difficulty</option>
                        </select>
                    </div>
                </div>

                <!-- Library Content -->
                <div class="flex-1 overflow-y-auto p-4">
                    <div id="libraryContent">
                        <!-- Workout list will be populated here -->
                    </div>
                </div>

                <!-- Library Actions -->
                <div class="border-t border-gray-200 p-4 space-y-2">
                    <button id="addCurrentWorkout" class="w-full py-2 px-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-all duration-200" disabled>
                        📥 Save Current Workout
                    </button>
                    <button id="importLibrary" class="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all duration-200">
                        📁 Import Library
                    </button>
                    <button id="exportLibrary" class="w-full py-2 px-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-all duration-200">
                        💾 Export Library
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(libraryPanel);

        // Add library toggle button to header
        this.addLibraryToggleButton();
    }

    /**
     * Add library toggle button to the main header
     */
    addLibraryToggleButton() {
        const headerButtons = document.querySelector('header .flex.justify-end');
        if (!headerButtons) return;

        const libraryButton = document.createElement('a');
        libraryButton.href = '#';
        libraryButton.className = 'inline-flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors duration-200 text-sm font-medium backdrop-blur-sm border border-white/20';
        libraryButton.innerHTML = `
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
            </svg>
            Library
        `;
        libraryButton.id = 'libraryToggleBtn';

        headerButtons.insertBefore(libraryButton, headerButtons.firstChild);
    }

    /**
     * Bind library event listeners
     */
    bindLibraryEvents() {
        // Toggle library panel
        document.getElementById('libraryToggleBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleLibraryPanel();
        });

        document.getElementById('toggleLibraryPanel')?.addEventListener('click', () => {
            this.toggleLibraryPanel();
        });

        // View switching
        document.getElementById('viewAllWorkouts')?.addEventListener('click', () => {
            this.switchView('library');
        });

        document.getElementById('viewCollections')?.addEventListener('click', () => {
            this.switchView('collections');
        });

        // Search
        document.getElementById('librarySearch')?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.debounceSearch();
        });

        // Filters
        document.getElementById('categoryFilter')?.addEventListener('change', (e) => {
            this.currentFilters.category = e.target.value || undefined;
            this.refreshLibraryView();
        });

        document.getElementById('difficultyFilter')?.addEventListener('change', (e) => {
            this.currentFilters.difficulty = e.target.value ? parseInt(e.target.value) : undefined;
            this.refreshLibraryView();
        });

        document.getElementById('durationFilter')?.addEventListener('change', (e) => {
            const value = e.target.value;
            delete this.currentFilters.minDuration;
            delete this.currentFilters.maxDuration;
            
            if (value === '0-30') {
                this.currentFilters.maxDuration = 30;
            } else if (value === '30-60') {
                this.currentFilters.minDuration = 30;
                this.currentFilters.maxDuration = 60;
            } else if (value === '60-90') {
                this.currentFilters.minDuration = 60;
                this.currentFilters.maxDuration = 90;
            } else if (value === '90+') {
                this.currentFilters.minDuration = 90;
            }
            
            this.refreshLibraryView();
        });

        // Sort
        document.getElementById('sortBy')?.addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.refreshLibraryView();
        });

        // Clear filters
        document.getElementById('clearFilters')?.addEventListener('click', () => {
            this.clearFilters();
        });

        // Actions
        document.getElementById('addCurrentWorkout')?.addEventListener('click', () => {
            this.saveCurrentWorkout();
        });

        document.getElementById('importLibrary')?.addEventListener('click', () => {
            this.importLibrary();
        });

        document.getElementById('exportLibrary')?.addEventListener('click', () => {
            this.exportLibrary();
        });
    }

    /**
     * Toggle the library panel visibility
     */
    toggleLibraryPanel() {
        const panel = document.getElementById('libraryPanel');
        if (!panel) return;

        const isOpen = !panel.classList.contains('-translate-x-full');
        
        if (isOpen) {
            panel.classList.add('-translate-x-full');
        } else {
            panel.classList.remove('-translate-x-full');
            this.refreshLibraryView();
        }
    }

    /**
     * Switch between different library views
     */
    switchView(view) {
        this.currentView = view;
        
        // Update navigation buttons
        document.querySelectorAll('[data-view]').forEach(btn => {
            if (btn.dataset.view === view) {
                btn.className = 'flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 bg-white text-gray-900 shadow-sm';
            } else {
                btn.className = 'flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 text-gray-600 hover:text-gray-900';
            }
        });

        this.refreshLibraryView();
    }

    /**
     * Refresh the library view with current filters and search
     */
    async refreshLibraryView() {
        if (!this.isInitialized) return;

        const content = document.getElementById('libraryContent');
        if (!content) return;

        try {
            let workouts = [];
            
            if (this.searchQuery.trim()) {
                workouts = await workoutStorage.searchWorkouts(this.searchQuery);
            } else {
                workouts = await workoutStorage.getAllWorkouts(this.currentFilters);
            }

            // Sort workouts
            this.sortWorkouts(workouts);

            // Render based on current view
            if (this.currentView === 'library') {
                this.renderWorkoutList(workouts);
            } else if (this.currentView === 'collections') {
                this.renderCollectionView();
            }

            // Update "Save Current Workout" button state
            this.updateSaveCurrentButton();

        } catch (error) {
            console.error('Error refreshing library view:', error);
            content.innerHTML = '<div class="text-center text-gray-500 py-8">Error loading library</div>';
        }
    }

    /**
     * Sort workouts array
     */
    sortWorkouts(workouts) {
        workouts.sort((a, b) => {
            let aVal = a[this.sortBy];
            let bVal = b[this.sortBy];

            // Handle string sorting
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            if (this.sortOrder === 'desc') {
                return aVal < bVal ? 1 : -1;
            } else {
                return aVal > bVal ? 1 : -1;
            }
        });
    }

    /**
     * Render the workout list
     */
    renderWorkoutList(workouts) {
        const content = document.getElementById('libraryContent');
        if (!content) return;

        if (workouts.length === 0) {
            content.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <p class="text-sm">No workouts found</p>
                    <p class="text-xs text-gray-400 mt-1">Load a workout and save it to get started</p>
                </div>
            `;
            return;
        }

        const workoutHTML = workouts.map(workout => this.createWorkoutCard(workout)).join('');
        content.innerHTML = `
            <div class="space-y-3">
                <div class="flex items-center justify-between mb-4">
                    <span class="text-sm text-gray-600">${workouts.length} workout${workouts.length !== 1 ? 's' : ''}</span>
                </div>
                ${workoutHTML}
            </div>
        `;

        // Bind workout card events
        this.bindWorkoutCardEvents();
    }

    /**
     * Create a workout card element
     */
    createWorkoutCard(workout) {
        const difficultyStars = '★'.repeat(workout.difficulty) + '☆'.repeat(5 - workout.difficulty);
        const duration = formatDuration(workout.duration);
        const dateModified = new Date(workout.dateModified).toLocaleDateString();

        return `
            <div class="workout-card p-3 border border-gray-200 rounded-lg hover:border-green-300 hover:shadow-md transition-all duration-200 cursor-pointer bg-white" data-workout-id="${workout.id}">
                <div class="flex items-start justify-between mb-2">
                    <div class="flex-1 min-w-0">
                        <h4 class="font-medium text-gray-900 truncate">${this.escapeHtml(workout.name)}</h4>
                        <p class="text-xs text-gray-500 truncate">${this.escapeHtml(workout.author)}</p>
                    </div>
                    <div class="flex space-x-1 ml-2">
                        <button class="star-workout text-gray-400 hover:text-yellow-500" data-workout-id="${workout.id}" title="${workout.starred ? 'Unstar' : 'Star'} workout">
                            <svg class="w-4 h-4 ${workout.starred ? 'text-yellow-500 fill-current' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
                            </svg>
                        </button>
                        <button class="delete-workout text-gray-400 hover:text-red-500" data-workout-id="${workout.id}" title="Delete workout">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <div class="space-y-1 mb-3">
                    <div class="flex items-center justify-between text-xs">
                        <span class="bg-gray-100 px-2 py-1 rounded">${workout.category}</span>
                        <span class="text-yellow-600" title="Difficulty">${difficultyStars}</span>
                    </div>
                    <div class="flex items-center justify-between text-xs text-gray-600">
                        <span>⏱️ ${duration}</span>
                        <span>📊 ${workout.tss} TSS</span>
                    </div>
                </div>

                ${workout.tags.length > 0 ? `
                    <div class="flex flex-wrap gap-1 mb-2">
                        ${workout.tags.map(tag => `<span class="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">${this.escapeHtml(tag)}</span>`).join('')}
                    </div>
                ` : ''}

                <div class="text-xs text-gray-400">
                    Modified ${dateModified}
                </div>
            </div>
        `;
    }

    /**
     * Bind events for workout cards
     */
    bindWorkoutCardEvents() {
        // Load workout on card click
        document.querySelectorAll('.workout-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('button')) return; // Don't trigger on button clicks
                
                const workoutId = card.dataset.workoutId;
                this.loadWorkout(workoutId);
            });
        });

        // Star/unstar workout
        document.querySelectorAll('.star-workout').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const workoutId = btn.dataset.workoutId;
                this.toggleWorkoutStar(workoutId);
            });
        });

        // Delete workout
        document.querySelectorAll('.delete-workout').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const workoutId = btn.dataset.workoutId;
                this.deleteWorkout(workoutId);
            });
        });
    }

    /**
     * Load a workout from the library
     */
    async loadWorkout(workoutId) {
        try {
            const workout = await workoutStorage.getWorkout(workoutId);
            if (!workout) {
                this.showToast('Workout not found', 'error');
                return;
            }

            // Use the visualizer to load the workout
            this.visualizer.createWorkoutFromData(workout.workoutData);
            this.showToast(`Loaded "${workout.name}" from library`, 'success');
            
            // Close library panel
            this.toggleLibraryPanel();

        } catch (error) {
            console.error('Error loading workout:', error);
            this.showToast('Failed to load workout', 'error');
        }
    }

    /**
     * Save the current workout to the library
     */
    async saveCurrentWorkout() {
        if (!this.visualizer.workout) {
            this.showToast('No workout to save', 'warning');
            return;
        }

        try {
            const workoutData = this.visualizer.workout.workoutData;
            await workoutStorage.saveWorkout(workoutData, {
                source: 'current'
            });

            this.showToast('Workout saved to library', 'success');
            this.refreshLibraryView();
        } catch (error) {
            console.error('Error saving workout:', error);
            this.showToast('Failed to save workout', 'error');
        }
    }

    /**
     * Toggle star status of a workout
     */
    async toggleWorkoutStar(workoutId) {
        try {
            const workout = await workoutStorage.getWorkout(workoutId);
            if (!workout) return;

            await workoutStorage.updateWorkout(workoutId, {
                starred: !workout.starred
            });

            this.refreshLibraryView();
        } catch (error) {
            console.error('Error toggling workout star:', error);
            this.showToast('Failed to update workout', 'error');
        }
    }

    /**
     * Delete a workout from the library
     */
    async deleteWorkout(workoutId) {
        if (!confirm('Are you sure you want to delete this workout?')) {
            return;
        }

        try {
            await workoutStorage.deleteWorkout(workoutId);
            this.showToast('Workout deleted', 'success');
            this.refreshLibraryView();
        } catch (error) {
            console.error('Error deleting workout:', error);
            this.showToast('Failed to delete workout', 'error');
        }
    }

    /**
     * Update the "Save Current Workout" button state
     */
    updateSaveCurrentButton() {
        const button = document.getElementById('addCurrentWorkout');
        if (!button) return;

        const hasWorkout = this.visualizer && this.visualizer.workout;
        button.disabled = !hasWorkout;
        
        if (hasWorkout) {
            button.innerHTML = '📥 Save Current Workout';
        } else {
            button.innerHTML = '📥 No Workout Loaded';
        }
    }

    /**
     * Clear all filters
     */
    clearFilters() {
        this.currentFilters = {};
        this.searchQuery = '';
        
        // Reset UI elements
        document.getElementById('librarySearch').value = '';
        document.getElementById('categoryFilter').value = '';
        document.getElementById('difficultyFilter').value = '';
        document.getElementById('durationFilter').value = '';
        
        this.refreshLibraryView();
    }

    /**
     * Debounced search function
     */
    debounceSearch() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.refreshLibraryView();
        }, 300);
    }

    /**
     * Render collection view
     */
    async renderCollectionView() {
        const content = document.getElementById('libraryContent');
        if (!content) return;

        try {
            const collections = await workoutStorage.getAllCollections();
            
            if (collections.length === 0) {
                content.innerHTML = `
                    <div class="text-center text-gray-500 py-8">
                        <svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                        </svg>
                        <p class="text-sm">No collections yet</p>
                        <p class="text-xs text-gray-400 mt-1">Collections help organize your workouts</p>
                    </div>
                `;
                return;
            }

            const collectionsHTML = collections.map(collection => `
                <div class="collection-card p-3 border border-gray-200 rounded-lg hover:border-green-300 hover:shadow-md transition-all duration-200 cursor-pointer bg-white">
                    <div class="flex items-center space-x-3">
                        <div class="w-4 h-4 rounded" style="background-color: ${collection.color}"></div>
                        <div class="flex-1 min-w-0">
                            <h4 class="font-medium text-gray-900 truncate">${this.escapeHtml(collection.name)}</h4>
                            <p class="text-xs text-gray-500">${collection.workoutCount || 0} workouts</p>
                        </div>
                    </div>
                </div>
            `).join('');

            content.innerHTML = `
                <div class="space-y-3">
                    <div class="flex items-center justify-between mb-4">
                        <span class="text-sm text-gray-600">${collections.length} collection${collections.length !== 1 ? 's' : ''}</span>
                        <button id="createCollection" class="text-xs text-green-600 hover:text-green-700">+ New Collection</button>
                    </div>
                    ${collectionsHTML}
                </div>
            `;

        } catch (error) {
            console.error('Error rendering collections:', error);
            content.innerHTML = '<div class="text-center text-gray-500 py-8">Error loading collections</div>';
        }
    }

    /**
     * Export library data
     */
    async exportLibrary() {
        try {
            const libraryData = await workoutStorage.exportLibrary();
            const jsonString = JSON.stringify(libraryData, null, 2);
            
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `workout-library-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            this.showToast('Library exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting library:', error);
            this.showToast('Failed to export library', 'error');
        }
    }

    /**
     * Import library data
     */
    importLibrary() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const libraryData = JSON.parse(text);
                
                await workoutStorage.importLibrary(libraryData);
                this.showToast('Library imported successfully', 'success');
                this.refreshLibraryView();
            } catch (error) {
                console.error('Error importing library:', error);
                this.showToast('Failed to import library', 'error');
            }
        });
        
        input.click();
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        // Use the existing UI toast system if available
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