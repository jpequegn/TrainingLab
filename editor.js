/**
 * Workout Editor - Drag and Drop Builder
 *
 * Provides a visual drag-and-drop interface for creating and editing workouts
 */

import { formatDuration, calculateTSS } from './workout.js';

export class WorkoutEditor {
  constructor(visualizer) {
    this.visualizer = visualizer;
    this.segments = [];
    this.isEditing = false;
    this.draggedElement = null;
    this.nextSegmentId = 1;

    // Initialize segment templates
    this.templates = this.createSegmentTemplates();

    // Initialize editor
    this.initializeEditor();
  }

  /**
   * Create predefined segment templates
   */
  createSegmentTemplates() {
    return [
      {
        id: 'warmup',
        name: 'Warmup',
        type: 'Warmup',
        icon: '🔥',
        color: '#FFA726',
        duration: 600, // 10 minutes
        powerLow: 0.5,
        powerHigh: 0.7,
        description: 'Gradual power increase',
      },
      {
        id: 'endurance',
        name: 'Endurance',
        type: 'SteadyState',
        icon: '🚴',
        color: '#42A5F5',
        duration: 1200, // 20 minutes
        power: 0.65,
        description: 'Steady endurance pace',
      },
      {
        id: 'threshold',
        name: 'Threshold',
        type: 'SteadyState',
        icon: '⚡',
        color: '#FFEB3B',
        duration: 480, // 8 minutes
        power: 1.0,
        description: 'FTP threshold power',
      },
      {
        id: 'vo2max',
        name: 'VO2 Max',
        type: 'SteadyState',
        icon: '🔥',
        color: '#F44336',
        duration: 300, // 5 minutes
        power: 1.2,
        description: 'High intensity intervals',
      },
      {
        id: 'recovery',
        name: 'Recovery',
        type: 'SteadyState',
        icon: '💤',
        color: '#4CAF50',
        duration: 300, // 5 minutes
        power: 0.5,
        description: 'Active recovery',
      },
      {
        id: 'intervals',
        name: 'Intervals',
        type: 'IntervalsT',
        icon: '📊',
        color: '#9C27B0',
        duration: 600, // 10 minutes total
        repeat: 4,
        onDuration: 120,
        offDuration: 60,
        powerOnHigh: 1.1,
        powerOffHigh: 0.6,
        description: '4x2min @ 110% / 1min recovery',
      },
      {
        id: 'ramp',
        name: 'Ramp',
        type: 'Ramp',
        icon: '📈',
        color: '#FF7043',
        duration: 600, // 10 minutes
        powerLow: 0.6,
        powerHigh: 1.0,
        description: 'Progressive power increase',
      },
      {
        id: 'cooldown',
        name: 'Cooldown',
        type: 'Cooldown',
        icon: '❄️',
        color: '#66BB6A',
        duration: 600, // 10 minutes
        powerHigh: 0.6,
        powerLow: 0.4,
        description: 'Gradual power decrease',
      },
    ];
  }

  /**
   * Initialize the editor interface
   */
  initializeEditor() {
    this.renderTemplates();
    this.setupEventListeners();
    this.setupDragAndDrop();
  }

  /**
   * Render segment templates in the UI
   */
  renderTemplates() {
    const templatesContainer = document.getElementById('segmentTemplates');
    if (!templatesContainer) return;

    templatesContainer.innerHTML = this.templates
      .map(
        template => `
            <div class="segment-template bg-white border-2 border-gray-200 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-indigo-300 hover:shadow-md transition-all duration-200"
                 draggable="true"
                 data-template-id="${template.id}"
                 style="border-left: 4px solid ${template.color}">
                <div class="text-center">
                    <div class="text-2xl mb-1">${template.icon}</div>
                    <div class="text-xs font-medium text-gray-700">${template.name}</div>
                    <div class="text-xs text-gray-500 mt-1">${formatDuration(template.duration)}</div>
                </div>
            </div>
        `
      )
      .join('');
  }

  /**
   * Setup event listeners for editor controls
   */
  setupEventListeners() {
    // New workout button
    const newWorkoutBtn = document.getElementById('newWorkoutBtn');
    if (newWorkoutBtn) {
      newWorkoutBtn.addEventListener('click', () => this.createNewWorkout());
    }

    // Toggle editor button
    const toggleEditorBtn = document.getElementById('toggleEditorBtn');
    if (toggleEditorBtn) {
      toggleEditorBtn.addEventListener('click', () => this.toggleEditor());
    }

    // Close segment editor modal
    const closeSegmentEditor = document.getElementById('closeSegmentEditor');
    if (closeSegmentEditor) {
      closeSegmentEditor.addEventListener('click', () =>
        this.closeSegmentEditor()
      );
    }

    // Modal background click to close
    const segmentEditorModal = document.getElementById('segmentEditorModal');
    if (segmentEditorModal) {
      segmentEditorModal.addEventListener('click', e => {
        if (e.target === segmentEditorModal) {
          this.closeSegmentEditor();
        }
      });
    }
  }

  /**
   * Setup HTML5 drag and drop functionality
   */
  setupDragAndDrop() {
    // Handle drag start on templates
    document.addEventListener('dragstart', e => {
      if (e.target.classList.contains('segment-template')) {
        const { templateId } = e.target.dataset;
        e.dataTransfer.setData('text/plain', templateId);
        e.dataTransfer.setData('application/x-template-id', templateId);
        e.target.style.opacity = '0.5';
      } else if (e.target.classList.contains('timeline-segment')) {
        const { segmentId } = e.target.dataset;
        e.dataTransfer.setData('text/plain', segmentId);
        e.dataTransfer.setData('application/x-segment-id', segmentId);
        e.target.style.opacity = '0.5';
      }
    });

    // Handle drag end
    document.addEventListener('dragend', e => {
      if (
        e.target.classList.contains('segment-template') ||
        e.target.classList.contains('timeline-segment')
      ) {
        e.target.style.opacity = '1';
      }
    });

    // Setup drop zone
    const workoutTimeline = document.getElementById('workoutTimeline');
    if (workoutTimeline) {
      workoutTimeline.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        workoutTimeline.classList.add('border-indigo-400', 'bg-indigo-50');
      });

      workoutTimeline.addEventListener('dragleave', e => {
        if (!workoutTimeline.contains(e.relatedTarget)) {
          workoutTimeline.classList.remove('border-indigo-400', 'bg-indigo-50');
        }
      });

      workoutTimeline.addEventListener('drop', e => {
        e.preventDefault();
        workoutTimeline.classList.remove('border-indigo-400', 'bg-indigo-50');

        const templateId = e.dataTransfer.getData('application/x-template-id');
        const segmentId = e.dataTransfer.getData('application/x-segment-id');

        if (templateId) {
          this.addSegmentFromTemplate(templateId);
        } else if (segmentId) {
          // Handle reordering existing segments
          this.reorderSegment(segmentId, e);
        }
      });
    }
  }

  /**
   * Create a new workout from scratch
   */
  createNewWorkout() {
    this.segments = [];
    this.updateTimeline();
    this.updateWorkoutSummary();
    this.showEditor();

    // Clear existing workout display
    const workoutInfo = document.getElementById('workoutInfo');
    const chartContainer = document.querySelector('.chart-container');
    const segmentDetails = document.getElementById('segmentDetails');

    if (workoutInfo) workoutInfo.style.display = 'none';
    if (chartContainer) chartContainer.style.display = 'none';
    if (segmentDetails) segmentDetails.style.display = 'none';
  }

  /**
   * Toggle editor visibility
   */
  toggleEditor() {
    const editor = document.getElementById('workoutEditor');
    if (!editor) return;

    if (editor.style.display === 'none') {
      this.showEditor();
    } else {
      this.hideEditor();
    }
  }

  /**
   * Show the editor
   */
  showEditor() {
    const editor = document.getElementById('workoutEditor');
    if (editor) {
      editor.style.display = 'block';
      this.isEditing = true;
    }
  }

  /**
   * Hide the editor
   */
  hideEditor() {
    const editor = document.getElementById('workoutEditor');
    if (editor) {
      editor.style.display = 'none';
      this.isEditing = false;
    }
  }

  /**
   * Add a segment from a template
   */
  addSegmentFromTemplate(templateId) {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) return;

    const segment = {
      id: this.nextSegmentId++,
      templateId: template.id,
      type: template.type,
      name: template.name,
      duration: template.duration,
      color: template.color,
      icon: template.icon,
      ...this.getTemplateProperties(template),
    };

    this.segments.push(segment);
    this.updateTimeline();
    this.updateWorkoutSummary();
    this.updateChart();
  }

  /**
   * Extract properties from template based on type
   */
  getTemplateProperties(template) {
    const props = {};

    switch (template.type) {
      case 'SteadyState':
        props.power = template.power;
        break;
      case 'Warmup':
      case 'Cooldown':
      case 'Ramp':
        props.powerLow = template.powerLow;
        props.powerHigh = template.powerHigh;
        break;
      case 'IntervalsT':
        props.repeat = template.repeat;
        props.onDuration = template.onDuration;
        props.offDuration = template.offDuration;
        props.powerOnHigh = template.powerOnHigh;
        props.powerOffHigh = template.powerOffHigh;
        break;
    }

    return props;
  }

  /**
   * Update the timeline display
   */
  updateTimeline() {
    const timelineSegments = document.getElementById('timelineSegments');
    const timelineEmptyState = document.getElementById('timelineEmptyState');

    if (!timelineSegments || !timelineEmptyState) return;

    if (this.segments.length === 0) {
      timelineSegments.innerHTML = '';
      timelineEmptyState.style.display = 'block';
      return;
    }

    timelineEmptyState.style.display = 'none';

    // Calculate total duration for relative width calculation
    const totalDuration = this.segments.reduce(
      (sum, seg) => sum + seg.duration,
      0
    );

    timelineSegments.innerHTML = this.segments
      .map((segment, index) => {
        const widthPercent = (segment.duration / totalDuration) * 100;
        const minWidth = Math.max(widthPercent, 8); // Minimum 8% width for visibility

        return `
                <div class="timeline-segment bg-white border border-gray-300 rounded cursor-pointer hover:shadow-md transition-all duration-200 flex flex-col items-center justify-center p-2 relative group"
                     draggable="true"
                     data-segment-id="${segment.id}"
                     style="
                         width: ${minWidth}%;
                         height: 60px;
                         border-left: 4px solid ${segment.color};
                         min-width: 60px;
                     ">
                    <div class="text-lg">${segment.icon}</div>
                    <div class="text-xs font-medium text-gray-700 text-center">${segment.name}</div>
                    <div class="text-xs text-gray-500">${formatDuration(segment.duration)}</div>
                    
                    <!-- Delete button -->
                    <button class="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
                            onclick="workoutEditor.removeSegment(${segment.id})"
                            title="Remove segment">
                        ×
                    </button>
                    
                    <!-- Edit button -->
                    <button class="absolute -top-2 -left-2 w-5 h-5 bg-blue-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
                            onclick="workoutEditor.editSegment(${segment.id})"
                            title="Edit segment">
                        ✏
                    </button>
                </div>
            `;
      })
      .join('');

    // Add click handlers for segments
    timelineSegments.querySelectorAll('.timeline-segment').forEach(element => {
      element.addEventListener('click', e => {
        if (e.target.tagName !== 'BUTTON') {
          const segmentId = parseInt(element.dataset.segmentId);
          this.editSegment(segmentId);
        }
      });
    });
  }

  /**
   * Update workout summary statistics
   */
  updateWorkoutSummary() {
    const totalDuration = this.segments.reduce(
      (sum, seg) => sum + seg.duration,
      0
    );
    let totalPower = 0;
    let weightedDuration = 0;

    this.segments.forEach(segment => {
      let avgPower = 0;
      if (segment.power !== undefined) {
        avgPower = segment.power;
      } else if (
        segment.powerLow !== undefined &&
        segment.powerHigh !== undefined
      ) {
        avgPower = (segment.powerLow + segment.powerHigh) / 2;
      }

      totalPower += avgPower * segment.duration;
      weightedDuration += segment.duration;
    });

    const avgPower = weightedDuration > 0 ? totalPower / weightedDuration : 0;
    const estimatedTSS = this.calculateEstimatedTSS();

    // Update display
    document.getElementById('editorTotalDuration').textContent =
      formatDuration(totalDuration);
    document.getElementById('editorAvgPower').textContent =
      `${Math.round(avgPower * 100)}%`;
    document.getElementById('editorEstTSS').textContent =
      Math.round(estimatedTSS);
  }

  /**
   * Calculate estimated TSS for the current workout
   */
  calculateEstimatedTSS() {
    if (this.segments.length === 0) return 0;

    // Create a mock workout object for TSS calculation
    const mockWorkout = {
      segments: this.segments.map(segment => ({
        type: segment.type,
        duration: segment.duration,
        power: segment.power,
        powerLow: segment.powerLow,
        powerHigh: segment.powerHigh,
        startTime: 0, // Will be calculated properly in the TSS function
      })),
      totalDuration: this.segments.reduce((sum, seg) => sum + seg.duration, 0),
    };

    return calculateTSS(mockWorkout);
  }

  /**
   * Remove a segment from the timeline
   */
  removeSegment(segmentId) {
    this.segments = this.segments.filter(seg => seg.id !== segmentId);
    this.updateTimeline();
    this.updateWorkoutSummary();
    this.updateChart();
  }

  /**
   * Edit a segment
   */
  editSegment(segmentId) {
    const segment = this.segments.find(seg => seg.id === segmentId);
    if (!segment) return;

    this.currentEditingSegment = segment;
    this.showSegmentEditor(segment);
  }

  /**
   * Show segment editor modal
   */
  showSegmentEditor(segment) {
    const modal = document.getElementById('segmentEditorModal');
    const content = document.getElementById('segmentEditorContent');

    if (!modal || !content) return;

    // Generate editor form based on segment type
    content.innerHTML = this.generateSegmentEditorForm(segment);
    modal.style.display = 'flex';
  }

  /**
   * Generate segment editor form HTML
   */
  generateSegmentEditorForm(segment) {
    let formHTML = `
            <form id="segmentEditForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input type="text" id="segmentName" value="${segment.name}" 
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                    <input type="number" id="segmentDuration" value="${segment.duration / 60}" min="0.5" step="0.5"
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                </div>
        `;

    // Add power fields based on segment type
    switch (segment.type) {
      case 'SteadyState':
        formHTML += `
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Power (% FTP)</label>
                        <input type="number" id="segmentPower" value="${(segment.power * 100).toFixed(0)}" min="30" max="300"
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    </div>
                `;
        break;
      case 'Warmup':
      case 'Cooldown':
      case 'Ramp':
        formHTML += `
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Start Power (% FTP)</label>
                        <input type="number" id="segmentPowerLow" value="${(segment.powerLow * 100).toFixed(0)}" min="30" max="300"
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">End Power (% FTP)</label>
                        <input type="number" id="segmentPowerHigh" value="${(segment.powerHigh * 100).toFixed(0)}" min="30" max="300"
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    </div>
                `;
        break;
    }

    formHTML += `
                <div class="flex gap-3 pt-4">
                    <button type="submit" class="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors duration-200">
                        Save Changes
                    </button>
                    <button type="button" id="cancelSegmentEdit" class="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium rounded-lg transition-colors duration-200">
                        Cancel
                    </button>
                </div>
            </form>
        `;

    // Add event listeners after HTML is inserted
    setTimeout(() => {
      const form = document.getElementById('segmentEditForm');
      const cancelBtn = document.getElementById('cancelSegmentEdit');

      if (form) {
        form.addEventListener('submit', e => {
          e.preventDefault();
          this.saveSegmentChanges(segment);
        });
      }

      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => this.closeSegmentEditor());
      }
    }, 0);

    return formHTML;
  }

  /**
   * Save segment changes from editor
   */
  saveSegmentChanges(segment) {
    const name = document.getElementById('segmentName')?.value;
    const duration =
      parseFloat(document.getElementById('segmentDuration')?.value) * 60;

    if (name) segment.name = name;
    if (duration > 0) segment.duration = duration;

    // Update power values based on segment type
    switch (segment.type) {
      case 'SteadyState':
        const power =
          parseFloat(document.getElementById('segmentPower')?.value) / 100;
        if (power > 0) segment.power = power;
        break;
      case 'Warmup':
      case 'Cooldown':
      case 'Ramp':
        const powerLow =
          parseFloat(document.getElementById('segmentPowerLow')?.value) / 100;
        const powerHigh =
          parseFloat(document.getElementById('segmentPowerHigh')?.value) / 100;
        if (powerLow > 0) segment.powerLow = powerLow;
        if (powerHigh > 0) segment.powerHigh = powerHigh;
        break;
    }

    this.updateTimeline();
    this.updateWorkoutSummary();
    this.updateChart();
    this.closeSegmentEditor();
  }

  /**
   * Close segment editor modal
   */
  closeSegmentEditor() {
    const modal = document.getElementById('segmentEditorModal');
    if (modal) {
      modal.style.display = 'none';
    }
    this.currentEditingSegment = null;
  }

  /**
   * Update chart with current segments
   */
  updateChart() {
    if (this.segments.length === 0) return;

    // Convert segments to workout format and display
    const workoutData = this.segmentsToWorkoutData();
    if (this.visualizer.ui) {
      this.visualizer.ui.createChart(workoutData, 250, null, () => {}); // Default FTP 250W

      // Show chart container
      const chartContainer = document.querySelector('.chart-container');
      if (chartContainer) {
        chartContainer.style.display = 'block';
      }
    }
  }

  /**
   * Convert editor segments to workout data format
   */
  segmentsToWorkoutData() {
    let currentTime = 0;
    const segments = this.segments.map(segment => {
      const segmentData = {
        type: segment.type,
        duration: segment.duration,
        startTime: currentTime,
      };

      // Add power properties based on type
      if (segment.power !== undefined) {
        segmentData.power = segment.power;
      }
      if (segment.powerLow !== undefined) {
        segmentData.powerLow = segment.powerLow;
      }
      if (segment.powerHigh !== undefined) {
        segmentData.powerHigh = segment.powerHigh;
      }

      // Generate power data for chart
      segmentData.powerData = this.generateSegmentPowerData(
        segment,
        currentTime
      );

      currentTime += segment.duration;
      return segmentData;
    });

    return {
      name: 'Custom Workout',
      description: 'Created with drag-and-drop editor',
      author: 'Workout Builder',
      sportType: 'bike',
      segments: segments,
      totalDuration: currentTime,
      tss: this.calculateEstimatedTSS(),
    };
  }

  /**
   * Generate power data points for a segment
   */
  generateSegmentPowerData(segment, startTime) {
    const points = [];
    const resolution = Math.max(1, Math.floor(segment.duration / 100)); // Max 100 points per segment

    for (let i = 0; i <= segment.duration; i += resolution) {
      let power;

      if (segment.power !== undefined) {
        power = segment.power * 100;
      } else if (
        segment.powerLow !== undefined &&
        segment.powerHigh !== undefined
      ) {
        const progress = i / segment.duration;
        power =
          (segment.powerLow +
            (segment.powerHigh - segment.powerLow) * progress) *
          100;
      } else {
        power = 65; // Default
      }

      points.push({
        x: startTime + i,
        y: power,
      });
    }

    return points;
  }

  /**
   * Generate workout data and save/export
   */
  generateWorkout() {
    if (this.segments.length === 0) {
      alert('Please add some segments to your workout first.');
      return;
    }

    const workoutData = this.segmentsToWorkoutData();

    // Create a workout object and set it as current
    if (this.visualizer.workout) {
      this.visualizer.workout.workoutData = workoutData;
    }

    // Update the main display
    this.visualizer.displayWorkout();

    // Hide editor
    this.hideEditor();

    return workoutData;
  }
}

// Global reference for inline event handlers
window.workoutEditor = null;
