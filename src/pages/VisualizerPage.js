/**
 * Visualizer Page for TrainingLab
 * Workout analysis and visualization functionality
 * Migrated from the main ZwiftWorkoutVisualizer
 */

import { BasePage } from './BasePage.js';
import { createLogger } from '../utils/logger.js';
import { parseWorkoutXML } from '../core/parser.js';
import { Workout } from '../core/workout.js';
import { UI } from '../ui/ui.js';
import { stateManager } from '../services/state-manager.js';
import { loadingManager, delay } from '../services/loading-manager.js';
import {
  generateERGContent,
  generateMRCContent,
  downloadFile,
  generateZWOContent,
} from '../utils/exporter.js';

const logger = createLogger('VisualizerPage');

export class VisualizerPage extends BasePage {
  constructor(container) {
    super(container, {
      title: 'Workout Visualizer',
      loadingText: 'Loading visualizer...',
    });

    // Visualizer-specific state
    this.workout = null;
    this.selectedSegmentIndex = null;
    this.ui = null;

    // Bind methods
    this.handleFileUpload = this.handleFileUpload.bind(this);
    this.setSelectedSegmentIndex = this.setSelectedSegmentIndex.bind(this);
  }

  async loadData() {
    // Check for URL parameters (e.g., activity ID)
    const urlParams = new URLSearchParams(window.location.search);
    const activityId = urlParams.get('activity');

    if (activityId) {
      logger.info(`Loading activity: ${activityId}`);
      // TODO: Load specific activity data
    }

    // Initialize the UI system for visualizer
    this.ui = new UI(this);

    // Setup state management integration
    this.setupStateIntegration();
  }

  setupStateIntegration() {
    // Subscribe to state changes
    stateManager.subscribe('workout', workout => {
      this.workout = workout;
    });

    stateManager.subscribe('selectedSegmentIndex', index => {
      this.selectedSegmentIndex = index;
    });
  }

  async render() {
    const content = `
      <div class="visualizer-content">
        ${this.createUploadSection()}
        ${this.createControlsSection()}
        ${this.createVisualizationSection()}
        ${this.createDetailsSection()}
      </div>
    `;

    this.container.innerHTML = this.generatePageHTML(content, {
      pageClass: 'visualizer-page',
      pageId: 'visualizer',
    });
  }

  createUploadSection() {
    return `
      <section class="upload-section">
        ${this.createPageHeader(
          'Workout Visualizer',
          'Upload and analyze your workout files',
          `
            <button class="btn btn-primary" id="uploadBtn">
              <i class="fas fa-upload"></i>
              Upload Workout
            </button>
          `
        )}
        
        <div class="upload-area" id="uploadArea">
          <div class="upload-content">
            <div class="upload-icon">
              <i class="fas fa-cloud-upload-alt"></i>
            </div>
            <h3>Drop your workout file here</h3>
            <p>Supported formats: .zwo (Zwift Workout)</p>
            <div class="upload-buttons">
              <label for="fileInput" class="btn btn-outline" id="chooseFileBtn">
                Choose File
              </label>
              <input type="file" id="fileInput" accept=".zwo" style="display: none;">
            </div>
          </div>
        </div>
      </section>
    `;
  }

  createControlsSection() {
    return `
      <section class="controls-section" id="controlsSection" style="display: none;">
        <div class="controls-grid">
          <div class="control-group">
            <label for="ftpInput">FTP (Watts)</label>
            <input type="number" id="ftpInput" min="50" max="500" value="250" class="form-input">
          </div>
          
          <div class="control-group">
            <label for="scaleSlider">Scale Factor</label>
            <div class="slider-container">
              <input type="range" id="scaleSlider" min="0.5" max="2.0" step="0.05" value="1.0" class="slider">
              <span class="slider-value" id="scaleValue">1.0x</span>
            </div>
          </div>
          
          <div class="control-actions">
            <button class="btn btn-secondary" id="applyScalingBtn">
              <i class="fas fa-sync-alt"></i>
              Apply Scaling
            </button>
            <button class="btn btn-outline" id="resetBtn">
              <i class="fas fa-undo"></i>
              Reset
            </button>
          </div>
        </div>
        
        <div class="export-section">
          <h3>Export Options</h3>
          <div class="export-buttons">
            <button class="btn btn-outline" id="exportERGBtn">
              <i class="fas fa-file-download"></i>
              Export ERG
            </button>
            <button class="btn btn-outline" id="exportMRCBtn">
              <i class="fas fa-file-download"></i>
              Export MRC
            </button>
            <button class="btn btn-outline" id="exportZWOBtn">
              <i class="fas fa-file-download"></i>
              Export ZWO
            </button>
          </div>
        </div>
      </section>
    `;
  }

  createVisualizationSection() {
    return `
      <section class="visualization-section" id="visualizationSection" style="display: none;">
        <div class="workout-info" id="workoutInfo">
          <h3 id="workoutName">Loading...</h3>
          <p id="workoutDescription">...</p>
          <div class="workout-meta">
            <span>Author: <span id="workoutAuthor">...</span></span>
            <span>Sport: <span id="workoutSport">...</span></span>
          </div>
        </div>
        
        <div class="chart-container">
          <div class="chart-header">
            <span id="chartDuration">0:00</span>
            <span id="chartTSS">0 TSS</span>
          </div>
          <canvas id="workoutChart" width="800" height="400"></canvas>
        </div>
        
        <div class="workout-stats" id="workoutStats">
          <!-- Workout statistics will be populated here -->
        </div>
      </section>
    `;
  }

  createDetailsSection() {
    return `
      <section class="details-section" id="detailsSection" style="display: none;">
        <div class="segments-container">
          <h3>Workout Segments</h3>
          <div id="segmentDetails" class="segment-details">
            <div id="segmentList">
              <!-- Segment details will be populated here -->
            </div>
          </div>
        </div>
      </section>
    `;
  }

  async onInit() {
    this.setupFileUpload();
    this.setupControls();
    this.setupExportButtons();
    this.setupDragAndDrop();

    logger.info('Visualizer page initialized successfully');
  }

  setupFileUpload() {
    const uploadBtn = this.container.querySelector('#uploadBtn');
    const fileInput = this.container.querySelector('#fileInput');

    console.log('Setting up file upload. File input found:', !!fileInput);

    // Function to trigger file input
    const triggerFileInput = e => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      // Use setTimeout to ensure the click happens after the event propagation
      setTimeout(() => {
        if (fileInput) {
          fileInput.click();
        }
      }, 0);
    };

    if (uploadBtn) {
      this.addEventListener(uploadBtn, 'click', triggerFileInput);
    }

    if (fileInput) {
      console.log('Adding change listener to file input');

      // Try both approaches - direct event listener and using addEventListener
      fileInput.addEventListener('change', event => {
        console.log('File input change event fired (direct listener)');
        console.log('Files selected:', event.target.files);
        this.handleFileUpload(event);
      });

      // Also try with this.addEventListener in case it's needed for cleanup
      this.addEventListener(fileInput, 'change', event => {
        console.log(
          'File input change event fired (via this.addEventListener)'
        );
        this.handleFileUpload(event);
      });
    } else {
      console.error('File input element not found!');
    }

    // The "Choose File" button is now a label, so it will work automatically
  }

  setupControls() {
    const ftpInput = this.container.querySelector('#ftpInput');
    const scaleSlider = this.container.querySelector('#scaleSlider');
    const scaleValue = this.container.querySelector('#scaleValue');
    const applyScalingBtn = this.container.querySelector('#applyScalingBtn');
    const resetBtn = this.container.querySelector('#resetBtn');

    if (ftpInput) {
      this.addEventListener(ftpInput, 'change', event => {
        const newFTP = parseInt(event.target.value);
        this.updateFTP(newFTP);
      });
    }

    if (scaleSlider && scaleValue) {
      this.addEventListener(scaleSlider, 'input', event => {
        const value = parseFloat(event.target.value);
        scaleValue.textContent = `${value.toFixed(2)}x`;
      });
    }

    if (applyScalingBtn) {
      this.addEventListener(applyScalingBtn, 'click', () => {
        this.applyScaling();
      });
    }

    if (resetBtn) {
      this.addEventListener(resetBtn, 'click', () => {
        this.resetWorkout();
      });
    }
  }

  setupExportButtons() {
    const exportERGBtn = this.container.querySelector('#exportERGBtn');
    const exportMRCBtn = this.container.querySelector('#exportMRCBtn');
    const exportZWOBtn = this.container.querySelector('#exportZWOBtn');

    if (exportERGBtn) {
      this.addEventListener(exportERGBtn, 'click', () => this.exportToERG());
    }

    if (exportMRCBtn) {
      this.addEventListener(exportMRCBtn, 'click', () => this.exportToMRC());
    }

    if (exportZWOBtn) {
      this.addEventListener(exportZWOBtn, 'click', () =>
        this.exportModifiedZWO()
      );
    }
  }

  setupDragAndDrop() {
    const uploadArea = this.container.querySelector('#uploadArea');

    if (uploadArea) {
      this.addEventListener(uploadArea, 'dragover', event => {
        event.preventDefault();
        uploadArea.classList.add('drag-over');
      });

      this.addEventListener(uploadArea, 'dragleave', () => {
        uploadArea.classList.remove('drag-over');
      });

      this.addEventListener(uploadArea, 'drop', event => {
        event.preventDefault();
        uploadArea.classList.remove('drag-over');

        const { files } = event.dataTransfer;
        if (files.length > 0) {
          this.processFile(files[0]);
        }
      });
    }
  }

  async handleFileUpload(event) {
    console.log('handleFileUpload called with event:', event);
    const file = event.target.files[0];
    console.log('File selected:', file);

    if (!file) {
      console.log('No file in event, returning');
      return;
    }

    console.log('Processing file:', file.name);
    await this.processFile(file);
  }

  async processFile(file) {
    console.log('processFile started for:', file.name);

    if (!file.name.toLowerCase().endsWith('.zwo')) {
      console.log('Invalid file extension');
      this.showError('Please select a valid Zwift workout file (.zwo)');
      return;
    }

    try {
      console.log('Setting loading state...');
      this.setLoadingState(true, 'Reading workout file...');

      console.log('Reading file as text...');
      const text = await this.readFileAsText(file);
      console.log('File read complete, text length:', text.length);

      console.log('Starting parse and visualize...');
      await this.parseAndVisualize(text, file.name);
    } catch (error) {
      console.error('Error in processFile:', error);
      logger.error('Error processing file:', error);
      this.showError(
        'Error reading the workout file. Please check the file format and try again.'
      );
    }
  }

  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = e => reject(e);
      reader.readAsText(file);
    });
  }

  async parseAndVisualize(xmlText, filename = 'workout.zwo') {
    console.log('parseAndVisualize started');
    try {
      this.setLoadingState(true, 'Parsing workout structure...');
      await delay(200);

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      console.log('XML parsed');

      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        console.error('Parse error found:', parseError);
        throw new Error(
          'Invalid XML format: The file appears to be corrupted or not a valid Zwift workout file'
        );
      }

      this.setLoadingState(true, 'Processing workout segments...');
      await delay(300);

      console.log('Calling parseWorkoutXML...');
      const workoutData = parseWorkoutXML(xmlDoc);
      console.log('Workout data:', workoutData);

      this.workout = new Workout(workoutData);
      console.log('Workout instance created');

      this.setLoadingState(true, 'Rendering visualization...');
      await delay(400);

      console.log('Displaying workout...');
      await this.displayWorkout();
      console.log('Showing workout controls...');
      this.showWorkoutControls(true);

      this.setLoadingState(false);
      this.showSuccess(`Successfully loaded: ${filename}`);
    } catch (error) {
      console.error('Error in parseAndVisualize:', error);
      logger.error('Error parsing workout:', error);
      this.setLoadingState(false);

      let errorMessage = 'Error parsing the workout file. ';
      if (error.message.includes('Invalid XML')) {
        errorMessage +=
          'The file appears to be corrupted or not a valid Zwift workout file.';
      } else if (error.message.includes('segments')) {
        errorMessage +=
          'The workout structure is invalid or contains unsupported segments.';
      } else {
        errorMessage += "Please ensure it's a valid Zwift workout file (.zwo).";
      }

      this.showError(errorMessage);
    }
  }

  async displayWorkout() {
    if (!this.workout) return;

    // Display workout information using the existing UI system
    this.ui.displayWorkoutInfo(
      this.workout.workoutData,
      this.workout.workoutData.tss
    );
    this.ui.createChart(
      this.workout.workoutData,
      this.workout.ftp,
      this.selectedSegmentIndex,
      this.setSelectedSegmentIndex
    );
    this.ui.displaySegmentDetails(this.workout.workoutData);
  }

  showWorkoutControls(show = true) {
    const controlsSection = this.container.querySelector('#controlsSection');
    const visualizationSection = this.container.querySelector(
      '#visualizationSection'
    );
    const detailsSection = this.container.querySelector('#detailsSection');

    if (controlsSection) {
      controlsSection.style.display = show ? 'block' : 'none';
    }
    if (visualizationSection) {
      visualizationSection.style.display = show ? 'block' : 'none';
    }
    if (detailsSection) {
      detailsSection.style.display = show ? 'block' : 'none';
    }
  }

  updateFTP(newFTP) {
    if (this.workout) {
      this.workout.updateFTP(newFTP);
      this.displayWorkout();
    }
  }

  applyScaling() {
    if (!this.workout) {
      this.showError('Please load a workout first');
      return;
    }

    const scaleFactor = parseFloat(
      this.container.querySelector('#scaleSlider').value
    );
    this.workout.applyScaling(scaleFactor);
    this.displayWorkout();
    this.showSuccess('Workout scaled!');
  }

  resetWorkout() {
    if (!this.workout) {
      this.showError('No workout to reset');
      return;
    }

    this.workout.reset();
    const scaleSlider = this.container.querySelector('#scaleSlider');
    const scaleValue = this.container.querySelector('#scaleValue');

    if (scaleSlider) scaleSlider.value = 1.0;
    if (scaleValue) scaleValue.textContent = '1.0x';

    this.displayWorkout();
    this.showSuccess('Workout reset!');
  }

  exportToERG() {
    if (!this.workout) {
      this.showError('Please load a workout first');
      return;
    }

    const ergContent = generateERGContent(
      this.workout.workoutData,
      this.workout.ftp
    );
    downloadFile(
      ergContent,
      `${this.workout.workoutData.name}.erg`,
      'text/plain'
    );
    this.showSuccess('ERG file downloaded');
  }

  exportToMRC() {
    if (!this.workout) {
      this.showError('Please load a workout first');
      return;
    }

    const mrcContent = generateMRCContent(this.workout.workoutData);
    downloadFile(
      mrcContent,
      `${this.workout.workoutData.name}.mrc`,
      'text/plain'
    );
    this.showSuccess('MRC file downloaded');
  }

  exportModifiedZWO() {
    if (!this.workout) {
      this.showError('Please load a workout first');
      return;
    }

    const zwoContent = generateZWOContent(this.workout.workoutData);
    downloadFile(
      zwoContent,
      `${this.workout.workoutData.name.replace(/[^a-z0-9]/gi, '_')}_modified.zwo`,
      'application/xml'
    );
    this.showSuccess('ZWO file downloaded');
  }

  setSelectedSegmentIndex(index) {
    this.selectedSegmentIndex = index;

    // Update state management
    stateManager.dispatch('SET_SELECTED_SEGMENT', index);

    // Update UI
    if (this.ui && this.ui.updateSegmentHighlight) {
      this.ui.updateSegmentHighlight(index);
    }

    this.displayWorkout();
  }

  showSuccess(message) {
    // Create temporary success message
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

  showError(message) {
    // Use the base page error handling
    const error = new Error(message);
    this.handleError(error, message);
  }

  hasUnsavedChanges() {
    return (
      this.workout &&
      this.workout.undoStack &&
      this.workout.undoStack.length > 0
    );
  }
}

export default VisualizerPage;
