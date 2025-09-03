/**
 * Library Page for TrainingLab
 * Browse and manage workout library and training plans
 */

import { BasePage } from './BasePage.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('LibraryPage');

export class LibraryPage extends BasePage {
  constructor(container) {
    super(container, {
      title: 'Workout Library',
      loadingText: 'Loading library...',
    });

    // Library-specific state
    this.workouts = [];
    this.filteredWorkouts = [];
    this.currentFilter = 'all';
    this.currentSort = 'recent';
    this.searchQuery = '';
    this.selectedWorkouts = new Set();
  }

  async loadData() {
    try {
      // Load workout library data
      this.workouts = await this.loadWorkouts();
      this.filteredWorkouts = [...this.workouts];

      logger.info(`Library loaded with ${this.workouts.length} workouts`);
    } catch (error) {
      logger.error('Failed to load library data:', error);
      // Use empty array as fallback
      this.workouts = [];
      this.filteredWorkouts = [];
    }
  }

  async loadWorkouts() {
    // Mock workout data - in real implementation, this would come from a service
    return [
      {
        id: '1',
        name: 'Sweet Spot Base 1',
        description: 'Build aerobic base with sweet spot intervals',
        type: 'Endurance',
        duration: 3600, // seconds
        tss: 75,
        intensity: 0.88,
        tags: ['sweet-spot', 'base', 'aerobic'],
        created: '2024-01-15T10:00:00Z',
        difficulty: 3,
        author: 'TrainingLab',
        isFavorite: true,
      },
      {
        id: '2',
        name: 'VO2 Max Intervals',
        description: '5x5 minute intervals at VO2 max intensity',
        type: 'VO2 Max',
        duration: 3000,
        tss: 95,
        intensity: 1.15,
        tags: ['vo2-max', 'intervals', 'hard'],
        created: '2024-01-10T14:30:00Z',
        difficulty: 5,
        author: 'TrainingLab',
        isFavorite: false,
      },
      {
        id: '3',
        name: 'Recovery Spin',
        description: 'Easy recovery ride with light spinning',
        type: 'Recovery',
        duration: 1800,
        tss: 25,
        intensity: 0.45,
        tags: ['recovery', 'easy', 'spinning'],
        created: '2024-01-08T09:15:00Z',
        difficulty: 1,
        author: 'TrainingLab',
        isFavorite: false,
      },
      {
        id: '4',
        name: 'Threshold Builder',
        description: '3x12 minute threshold intervals',
        type: 'Threshold',
        duration: 4200,
        tss: 85,
        intensity: 1.02,
        tags: ['threshold', 'ftp', 'lactate'],
        created: '2024-01-05T16:20:00Z',
        difficulty: 4,
        author: 'TrainingLab',
        isFavorite: true,
      },
      {
        id: '5',
        name: 'Sprint Power',
        description: 'Short sprint intervals for power development',
        type: 'Neuromuscular',
        duration: 2400,
        tss: 55,
        intensity: 0.65,
        tags: ['sprint', 'power', 'neuromuscular'],
        created: '2024-01-02T11:45:00Z',
        difficulty: 4,
        author: 'TrainingLab',
        isFavorite: false,
      },
    ];
  }

  async render() {
    const content = `
      <div class="library-content">
        ${this.createLibraryHeader()}
        ${this.createFilterBar()}
        ${this.createWorkoutGrid()}
        ${this.createSelectionActions()}
      </div>
    `;

    this.container.innerHTML = this.generatePageHTML(content, {
      pageClass: 'library-page',
      pageId: 'library',
    });
  }

  createLibraryHeader() {
    return this.createPageHeader(
      'Workout Library',
      `${this.workouts.length} workouts available`,
      `
        <div class="header-actions">
          <button class="btn btn-outline" id="importBtn">
            <i class="fas fa-upload"></i>
            Import Workout
          </button>
          <button class="btn btn-primary" id="createBtn">
            <i class="fas fa-plus"></i>
            Create Workout
          </button>
        </div>
      `
    );
  }

  createFilterBar() {
    return `
      <div class="filter-bar">
        <div class="search-section">
          <div class="search-input-container">
            <i class="fas fa-search search-icon"></i>
            <input type="text" id="searchInput" placeholder="Search workouts..." class="search-input" value="${this.searchQuery}">
          </div>
        </div>
        
        <div class="filter-section">
          <select id="filterSelect" class="filter-select">
            <option value="all">All Types</option>
            <option value="Recovery">Recovery</option>
            <option value="Endurance">Endurance</option>
            <option value="Threshold">Threshold</option>
            <option value="VO2 Max">VO2 Max</option>
            <option value="Neuromuscular">Neuromuscular</option>
          </select>
          
          <select id="sortSelect" class="filter-select">
            <option value="recent">Most Recent</option>
            <option value="name">Name (A-Z)</option>
            <option value="duration">Duration</option>
            <option value="difficulty">Difficulty</option>
            <option value="tss">TSS Score</option>
          </select>
          
          <button class="btn btn-outline" id="favoritesBtn" title="Show Favorites">
            <i class="fas fa-heart"></i>
          </button>
        </div>
      </div>
    `;
  }

  createWorkoutGrid() {
    if (this.filteredWorkouts.length === 0) {
      return this.createEmptyState();
    }

    const workoutsHTML = this.filteredWorkouts
      .map(workout => this.createWorkoutCard(workout))
      .join('');

    return `
      <div class="workout-grid" id="workoutGrid">
        ${workoutsHTML}
      </div>
    `;
  }

  createWorkoutCard(workout) {
    const duration = this.formatDuration(workout.duration);
    const difficulty = this.getDifficultyStars(workout.difficulty);
    const isSelected = this.selectedWorkouts.has(workout.id);

    return `
      <div class="workout-card ${isSelected ? 'selected' : ''}" data-workout-id="${workout.id}">
        <div class="workout-header">
          <div class="workout-selection">
            <input type="checkbox" class="workout-checkbox" ${isSelected ? 'checked' : ''}>
          </div>
          <div class="workout-favorite">
            <button class="favorite-btn ${workout.isFavorite ? 'active' : ''}" title="Toggle Favorite">
              <i class="fas fa-heart"></i>
            </button>
          </div>
        </div>
        
        <div class="workout-content">
          <div class="workout-type-badge ${workout.type.toLowerCase().replace(' ', '-')}">${workout.type}</div>
          
          <h3 class="workout-title">${workout.name}</h3>
          <p class="workout-description">${workout.description}</p>
          
          <div class="workout-metrics">
            <div class="metric">
              <i class="fas fa-clock"></i>
              <span>${duration}</span>
            </div>
            <div class="metric">
              <i class="fas fa-fire"></i>
              <span>${workout.tss} TSS</span>
            </div>
            <div class="metric">
              <i class="fas fa-tachometer-alt"></i>
              <span>${Math.round(workout.intensity * 100)}% FTP</span>
            </div>
          </div>
          
          <div class="workout-difficulty">
            <span class="difficulty-label">Difficulty:</span>
            <div class="difficulty-stars">${difficulty}</div>
          </div>
          
          <div class="workout-tags">
            ${workout.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
          </div>
        </div>
        
        <div class="workout-actions">
          <button class="btn btn-outline btn-sm" data-action="preview">
            <i class="fas fa-eye"></i>
            Preview
          </button>
          <button class="btn btn-primary btn-sm" data-action="load">
            <i class="fas fa-play"></i>
            Load
          </button>
        </div>
      </div>
    `;
  }

  createEmptyState() {
    const message =
      this.searchQuery || this.currentFilter !== 'all'
        ? 'No workouts match your search criteria'
        : 'No workouts available';

    const suggestion =
      this.searchQuery || this.currentFilter !== 'all'
        ? 'Try adjusting your search or filter settings'
        : 'Import some workouts to get started';

    return `
      <div class="empty-state">
        <div class="empty-icon">
          <i class="fas fa-dumbbell"></i>
        </div>
        <h3 class="empty-title">${message}</h3>
        <p class="empty-description">${suggestion}</p>
        ${
          this.searchQuery || this.currentFilter !== 'all'
            ? `
          <button class="btn btn-outline" id="clearFiltersBtn">
            <i class="fas fa-times"></i>
            Clear Filters
          </button>
        `
            : `
          <button class="btn btn-primary" id="importFromEmptyBtn">
            <i class="fas fa-upload"></i>
            Import Workouts
          </button>
        `
        }
      </div>
    `;
  }

  createSelectionActions() {
    return `
      <div class="selection-actions" id="selectionActions" style="display: none;">
        <div class="selection-info">
          <span id="selectionCount">0</span> workout(s) selected
        </div>
        <div class="selection-buttons">
          <button class="btn btn-outline btn-sm" id="selectAllBtn">Select All</button>
          <button class="btn btn-outline btn-sm" id="deselectAllBtn">Deselect All</button>
          <button class="btn btn-outline btn-sm" id="exportSelectedBtn">
            <i class="fas fa-download"></i>
            Export
          </button>
          <button class="btn btn-outline btn-sm text-danger" id="deleteSelectedBtn">
            <i class="fas fa-trash"></i>
            Delete
          </button>
        </div>
      </div>
    `;
  }

  async onInit() {
    this.setupSearch();
    this.setupFilters();
    this.setupWorkoutCards();
    this.setupActions();
    this.setupSelectionHandlers();

    logger.info('Library page initialized successfully');
  }

  setupSearch() {
    const searchInput = this.container.querySelector('#searchInput');
    if (searchInput) {
      this.addEventListener(searchInput, 'input', event => {
        this.searchQuery = event.target.value;
        this.applyFilters();
      });
    }
  }

  setupFilters() {
    const filterSelect = this.container.querySelector('#filterSelect');
    const sortSelect = this.container.querySelector('#sortSelect');
    const favoritesBtn = this.container.querySelector('#favoritesBtn');

    if (filterSelect) {
      this.addEventListener(filterSelect, 'change', event => {
        this.currentFilter = event.target.value;
        this.applyFilters();
      });
    }

    if (sortSelect) {
      this.addEventListener(sortSelect, 'change', event => {
        this.currentSort = event.target.value;
        this.applyFilters();
      });
    }

    if (favoritesBtn) {
      this.addEventListener(favoritesBtn, 'click', () => {
        this.toggleFavoritesFilter();
      });
    }
  }

  setupWorkoutCards() {
    const workoutGrid = this.container.querySelector('#workoutGrid');
    if (workoutGrid) {
      this.addEventListener(workoutGrid, 'click', event => {
        const workoutCard = event.target.closest('.workout-card');
        if (!workoutCard) return;

        const { workoutId } = workoutCard.dataset;
        const action = event.target.closest('[data-action]')?.dataset.action;

        if (action) {
          this.handleWorkoutAction(workoutId, action);
        } else if (event.target.classList.contains('workout-checkbox')) {
          this.toggleWorkoutSelection(workoutId);
        } else if (event.target.closest('.favorite-btn')) {
          this.toggleWorkoutFavorite(workoutId);
        }
      });
    }
  }

  setupActions() {
    const importBtn = this.container.querySelector('#importBtn');
    const createBtn = this.container.querySelector('#createBtn');

    if (importBtn) {
      this.addEventListener(importBtn, 'click', () => this.importWorkout());
    }

    if (createBtn) {
      this.addEventListener(createBtn, 'click', () => this.createWorkout());
    }
  }

  setupSelectionHandlers() {
    const selectAllBtn = this.container.querySelector('#selectAllBtn');
    const deselectAllBtn = this.container.querySelector('#deselectAllBtn');
    const exportBtn = this.container.querySelector('#exportSelectedBtn');
    const deleteBtn = this.container.querySelector('#deleteSelectedBtn');

    if (selectAllBtn) {
      this.addEventListener(selectAllBtn, 'click', () =>
        this.selectAllWorkouts()
      );
    }

    if (deselectAllBtn) {
      this.addEventListener(deselectAllBtn, 'click', () =>
        this.deselectAllWorkouts()
      );
    }

    if (exportBtn) {
      this.addEventListener(exportBtn, 'click', () =>
        this.exportSelectedWorkouts()
      );
    }

    if (deleteBtn) {
      this.addEventListener(deleteBtn, 'click', () =>
        this.deleteSelectedWorkouts()
      );
    }
  }

  applyFilters() {
    let filtered = [...this.workouts];

    // Apply search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        workout =>
          workout.name.toLowerCase().includes(query) ||
          workout.description.toLowerCase().includes(query) ||
          workout.tags.some(tag => tag.includes(query))
      );
    }

    // Apply type filter
    if (this.currentFilter !== 'all') {
      filtered = filtered.filter(
        workout => workout.type === this.currentFilter
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (this.currentSort) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'duration':
          return b.duration - a.duration;
        case 'difficulty':
          return b.difficulty - a.difficulty;
        case 'tss':
          return b.tss - a.tss;
        case 'recent':
        default:
          return new Date(b.created) - new Date(a.created);
      }
    });

    this.filteredWorkouts = filtered;
    this.updateWorkoutGrid();
  }

  updateWorkoutGrid() {
    const workoutGrid = this.container.querySelector('#workoutGrid');
    if (workoutGrid) {
      workoutGrid.outerHTML = this.createWorkoutGrid();
      this.setupWorkoutCards(); // Re-setup event listeners
    }
  }

  toggleFavoritesFilter() {
    const favoritesBtn = this.container.querySelector('#favoritesBtn');
    const isActive = favoritesBtn.classList.toggle('active');

    if (isActive) {
      this.filteredWorkouts = this.workouts.filter(
        workout => workout.isFavorite
      );
    } else {
      this.applyFilters();
    }

    this.updateWorkoutGrid();
  }

  handleWorkoutAction(workoutId, action) {
    const workout = this.workouts.find(w => w.id === workoutId);
    if (!workout) return;

    switch (action) {
      case 'preview':
        this.previewWorkout(workout);
        break;
      case 'load':
        this.loadWorkout(workout);
        break;
    }
  }

  previewWorkout(workout) {
    logger.info(`Previewing workout: ${workout.name}`);
    // TODO: Implement workout preview
    this.showSuccess(`Preview for "${workout.name}" coming soon!`);
  }

  loadWorkout(workout) {
    logger.info(`Loading workout: ${workout.name}`);
    // Navigate to visualizer with this workout
    if (window.router) {
      window.router.navigate(`/visualizer?workout=${workout.id}`);
    }
  }

  toggleWorkoutSelection(workoutId) {
    if (this.selectedWorkouts.has(workoutId)) {
      this.selectedWorkouts.delete(workoutId);
    } else {
      this.selectedWorkouts.add(workoutId);
    }

    this.updateSelectionUI();
  }

  toggleWorkoutFavorite(workoutId) {
    const workout = this.workouts.find(w => w.id === workoutId);
    if (workout) {
      workout.isFavorite = !workout.isFavorite;
      this.updateWorkoutGrid();
      this.showSuccess(
        `"${workout.name}" ${workout.isFavorite ? 'added to' : 'removed from'} favorites`
      );
    }
  }

  updateSelectionUI() {
    const selectionActions = this.container.querySelector('#selectionActions');
    const selectionCount = this.container.querySelector('#selectionCount');

    if (selectionActions && selectionCount) {
      const count = this.selectedWorkouts.size;
      selectionActions.style.display = count > 0 ? 'flex' : 'none';
      selectionCount.textContent = count;
    }

    // Update checkboxes
    this.container.querySelectorAll('.workout-checkbox').forEach(checkbox => {
      const workoutCard = checkbox.closest('.workout-card');
      const { workoutId } = workoutCard.dataset;
      const isSelected = this.selectedWorkouts.has(workoutId);

      checkbox.checked = isSelected;
      workoutCard.classList.toggle('selected', isSelected);
    });
  }

  selectAllWorkouts() {
    this.filteredWorkouts.forEach(workout => {
      this.selectedWorkouts.add(workout.id);
    });
    this.updateSelectionUI();
  }

  deselectAllWorkouts() {
    this.selectedWorkouts.clear();
    this.updateSelectionUI();
  }

  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  getDifficultyStars(difficulty) {
    const maxStars = 5;
    let stars = '';

    for (let i = 1; i <= maxStars; i++) {
      if (i <= difficulty) {
        stars += '<i class="fas fa-star active"></i>';
      } else {
        stars += '<i class="fas fa-star"></i>';
      }
    }

    return stars;
  }

  importWorkout() {
    // Create file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.zwo,.mrc,.erg';
    fileInput.style.display = 'none';

    this.addEventListener(fileInput, 'change', event => {
      const file = event.target.files[0];
      if (file) {
        this.processImportedWorkout(file);
      }
      document.body.removeChild(fileInput);
    });

    document.body.appendChild(fileInput);
    fileInput.click();
  }

  processImportedWorkout(file) {
    logger.info(`Importing workout file: ${file.name}`);
    this.showSuccess(`Importing "${file.name}" - functionality coming soon!`);
  }

  createWorkout() {
    logger.info('Creating new workout');
    this.showSuccess('Workout creator coming soon!');
  }

  exportSelectedWorkouts() {
    const selectedWorkouts = Array.from(this.selectedWorkouts);
    logger.info(`Exporting ${selectedWorkouts.length} workouts`);
    this.showSuccess(
      `Exporting ${selectedWorkouts.length} workout(s) - functionality coming soon!`
    );
  }

  deleteSelectedWorkouts() {
    const selectedWorkouts = Array.from(this.selectedWorkouts);
    if (selectedWorkouts.length === 0) return;

    if (
      confirm(
        `Are you sure you want to delete ${selectedWorkouts.length} workout(s)?`
      )
    ) {
      this.workouts = this.workouts.filter(
        workout => !this.selectedWorkouts.has(workout.id)
      );
      this.selectedWorkouts.clear();
      this.applyFilters();
      this.updateSelectionUI();
      this.showSuccess(`${selectedWorkouts.length} workout(s) deleted`);
    }
  }

  showSuccess(message) {
    const successElement = document.createElement('div');
    successElement.className = 'success-toast';
    successElement.innerHTML = `
      <i class="fas fa-check-circle"></i>
      <span>${message}</span>
    `;

    document.body.appendChild(successElement);

    this.setTimeout(() => {
      successElement.remove();
    }, 3000);
  }
}

export default LibraryPage;
