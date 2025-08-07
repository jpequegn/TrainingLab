

import { parseWorkoutXML } from './parser.js';
import { Workout } from './workout.js';
import { generateERGContent, generateMRCContent, downloadFile, generateZWOContent } from './exporter.js';
import { deployWorkout } from './api.js';
import { UI } from './ui.js';
import { WorkoutLibrary } from './library.js';
import { loadingManager, delay } from './loading-manager.js';
import { stateManager } from './state-manager.js';
// import { reactiveUI } from './reactive-ui.js'; // Currently unused
// import { initializeComponents } from './components/index.js'; // Disabled - not needed for main app
import { performanceOptimizer } from './performance-optimizer.js';
import { WorkoutEditor } from './editor.js';

// Global Error Handling - Security Feature
window.addEventListener('error', (event) => {
    const errorData = {
        type: 'javascript_error',
        message: event.error?.message || 'Unknown error',
        filename: event.filename || 'unknown',
        lineno: event.lineno || 0,
        colno: event.colno || 0,
        stack: event.error?.stack || 'No stack trace',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
    };
    
    console.error('🚨 Unhandled JavaScript Error:', errorData);
    
    // Send to error reporting service in production
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
        // TODO: Integrate with error reporting service (Sentry, etc.)
        // reportError(errorData);
    }
    
    // Show user-friendly error message
    if (window.app && window.app.ui) {
        window.app.ui.showToast('An unexpected error occurred. Please refresh the page.', 'error');
    }
});

window.addEventListener('unhandledrejection', (event) => {
    const errorData = {
        type: 'promise_rejection',
        reason: event.reason?.toString() || 'Unknown rejection',
        stack: event.reason?.stack || 'No stack trace',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
    };
    
    console.error('🚨 Unhandled Promise Rejection:', errorData);
    
    // Send to error reporting service in production
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
        // TODO: Integrate with error reporting service
        // reportError(errorData);
    }
    
    // Show user-friendly error message
    if (window.app && window.app.ui) {
        window.app.ui.showToast('A background operation failed. Please try again.', 'error');
    }
    
    // Prevent the default unhandled rejection behavior
    event.preventDefault();
});

// Security: Disable eval and similar dangerous functions
// eslint-disable-next-line no-eval
window.eval = function() {
    throw new Error('eval() is disabled for security reasons');
};

// Security: Remove any potential XSS vectors
if (window.setTimeout.toString().indexOf('[native code]') === -1) {
    console.warn('⚠️ setTimeout appears to be overridden - potential security risk');
}

class ZwiftWorkoutVisualizer {
    constructor() {
        this.ui = new UI(this);
        this.library = new WorkoutLibrary(this);
        
        // Make globally accessible for keyboard navigation and error handling
        window.app = this;
        
        // Initialize workout editor
        this.editor = new WorkoutEditor(this);
        
        // Set global reference for inline event handlers
        window.workoutEditor = this.editor;
        
        // Setup state management integration
        this.setupStateIntegration();
        
        // Initialize reactive UI bindings
        this.initializeReactiveBindings();
        
        // Initialize component system - disabled (not needed for main app)
        // this.initializeComponents();
        
        // Initialize performance monitoring
        this.initializePerformanceMonitoring();
    }

    setupStateIntegration() {
        // Subscribe to state changes and update legacy properties
        stateManager.subscribe('workout', (workout) => {
            this.workout = workout;
        });
        
        stateManager.subscribe('selectedSegmentIndex', (index) => {
            this.selectedSegmentIndex = index;
        });
        
        // Setup state action handlers
        this.setupStateActions();
    }

    setupStateActions() {
        // Add custom action handlers
        stateManager.addMiddleware((context) => {
            const { path, newValue, source } = context;
            
            // Log state changes in development
            if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
                console.log(`State change: ${path} = ${JSON.stringify(newValue)} (source: ${source})`);
            }
            
            return true; // Allow the change
        });
        
        // Custom actions that need special handling
        const customActions = {
            'FILE_UPLOAD': async (payload) => {
                const { file } = payload;
                await this.handleFileUpload({ target: { files: [file] } });
            },
            
            'LOAD_SAMPLE': async () => {
                await this.loadSampleWorkout();
            },
            
            'APPLY_SCALING': () => {
                this.applyScaling();
            },
            
            'RESET_WORKOUT': () => {
                this.resetWorkout();
            },
            
            'TOGGLE_THEME': () => {
                const currentTheme = stateManager.getState('themeMode');
                const newTheme = currentTheme === 'light' ? 'dark' : 'light';
                stateManager.dispatch('SET_THEME', newTheme);
            }
        };
        
        // Override the dispatch method to handle custom actions
        const originalDispatch = stateManager.dispatch.bind(stateManager);
        stateManager.dispatch = (action, payload) => {
            if (customActions[action]) {
                return customActions[action](payload);
            }
            return originalDispatch(action, payload);
        };
    }

    initializeReactiveBindings() {
        // Setup computed properties
        stateManager.computed('canUndo', () => {
            const undoStack = stateManager.getState('undoStack');
            return undoStack && undoStack.length > 0;
        }, ['undoStack']);
        
        stateManager.computed('canRedo', () => {
            const redoStack = stateManager.getState('redoStack');
            return redoStack && redoStack.length > 0;
        }, ['redoStack']);
        
        stateManager.computed('hasWorkout', () => {
            const workout = stateManager.getState('workout');
            return workout !== null;
        }, ['workout']);
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.zwo')) {
            stateManager.dispatch('ADD_ERROR', {
                type: 'FILE_ERROR',
                message: 'Please select a valid Zwift workout file (.zwo)',
                timestamp: Date.now()
            });
            return;
        }

        try {
            // Set loading state
            stateManager.dispatch('SET_LOADING', {
                isLoading: true,
                message: 'Reading workout file...',
                progress: 0
            });
            
            const text = await this.readFileAsText(file);
            await delay(200);
            
            stateManager.dispatch('SET_LOADING', {
                isLoading: true,
                message: 'Processing workout data...',
                progress: 25
            });
            
            await this.parseAndVisualize(text, file.name);
            
        } catch (error) {
            console.error('Error reading file:', error);
            stateManager.dispatch('SET_LOADING', { isLoading: false });
            stateManager.dispatch('ADD_ERROR', {
                type: 'FILE_PROCESSING_ERROR',
                message: 'Error reading the workout file. Please check the file format and try again.',
                error,
                timestamp: Date.now()
            });
        }
    }

    async loadSampleWorkout() {
        try {
            // Show loading state
            loadingManager.showLoading('Loading sample workout...');
            loadingManager.updateProgress(0, 'Fetching sample data...');
            
            const response = await fetch('sample_workout.zwo');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            await delay(300);
            loadingManager.updateProgress(1, 'Processing sample workout...');
            
            const text = await response.text();
            await this.parseAndVisualize(text, 'sample_workout.zwo');
            
        } catch (error) {
            console.error('Error loading sample workout:', error);
            loadingManager.hideLoading();
            this.ui.showToast('Error loading sample workout. Please try uploading your own file.', 'error');
        }
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }

    async parseAndVisualize(xmlText, filename = 'workout.zwo') {
        try {
            loadingManager.updateProgress(2, 'Parsing workout structure...');
            await delay(200);
            
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            
            const parseError = xmlDoc.querySelector('parsererror');
            if (parseError) {
                throw new Error('Invalid XML format: The file appears to be corrupted or not a valid Zwift workout file');
            }

            loadingManager.updateProgress(3, 'Processing workout segments...');
            await delay(300);
            
            const workoutData = parseWorkoutXML(xmlDoc);
            this.workout = new Workout(workoutData);
            
            loadingManager.updateProgress(4, 'Rendering visualization...');
            await delay(400);
            
            this.ui.updateUndoButton(this.workout.undoStack.length);
            await this.displayWorkout();
            
            loadingManager.hideLoading();
            this.ui.showToast(`Successfully loaded: ${filename}`, 'success');
            
        } catch (error) {
            console.error('Error parsing workout:', error);
            loadingManager.hideLoading();
            
            let errorMessage = 'Error parsing the workout file. ';
            if (error.message.includes('Invalid XML')) {
                errorMessage += 'The file appears to be corrupted or not a valid Zwift workout file.';
            } else if (error.message.includes('segments')) {
                errorMessage += 'The workout structure is invalid or contains unsupported segments.';
            } else {
                errorMessage += 'Please ensure it\'s a valid Zwift workout file (.zwo).';
            }
            
            this.ui.showToast(errorMessage, 'error');
        }
    }

    displayWorkout() {
        if (!this.workout) return;
        this.ui.displayWorkoutInfo(this.workout.workoutData, this.workout.workoutData.tss);
        this.ui.createChart(this.workout.workoutData, this.workout.ftp, this.selectedSegmentIndex, this.setSelectedSegmentIndex.bind(this));
        this.ui.displaySegmentDetails(this.workout.workoutData);
    }

    updateFTP(newFTP) {
        if (this.workout) {
            this.workout.updateFTP(newFTP);
            this.displayWorkout();
        }
    }

    exportToERG() {
        if (!this.workout) {
            this.ui.showToast('Please load a workout first');
            return;
        }
        const ergContent = generateERGContent(this.workout.workoutData, this.workout.ftp);
        downloadFile(ergContent, `${this.workout.workoutData.name}.erg`, 'text/plain');
    }

    exportToMRC() {
        if (!this.workout) {
            this.ui.showToast('Please load a workout first');
            return;
        }
        const mrcContent = generateMRCContent(this.workout.workoutData);
        downloadFile(mrcContent, `${this.workout.workoutData.name}.mrc`, 'text/plain');
    }

    applyScaling() {
        if (!this.workout) {
            this.ui.showToast('Please load a workout first');
            return;
        }

        const scaleFactor = parseFloat(document.getElementById('scaleSlider').value);
        this.workout.applyScaling(scaleFactor);
        this.ui.updateUndoButton(this.workout.undoStack.length);
        this.displayWorkout();
        this.ui.showToast('Workout scaled!');
    }

    resetWorkout() {
        if (!this.workout) {
            this.ui.showToast('No workout to reset');
            return;
        }

        this.workout.reset();
        this.ui.updateUndoButton(this.workout.undoStack.length);
        document.getElementById('scaleSlider').value = 1.0;
        this.ui.updateScaleValue(1.0);
        this.displayWorkout();
        this.ui.showToast('Workout reset!');
    }

    exportModifiedZWO() {
        if (!this.workout) {
            this.ui.showToast('Please load a workout first');
            return;
        }

        const zwoContent = generateZWOContent(this.workout.workoutData);
        downloadFile(zwoContent, `${this.workout.workoutData.name.replace(/[^a-z0-9]/gi, '_')}_modified.zwo`, 'application/xml');
    }

    async deployWorkout() {
        if (!this.workout) {
            this.ui.showToast('Please load a workout first');
            return;
        }

        const zwoContent = generateZWOContent(this.workout.workoutData);
        const workoutName = this.workout.workoutData.name.replace(/[^a-z0-9]/gi, '_');

        try {
            const deployedPath = await deployWorkout(workoutName, zwoContent);
            this.ui.showToast(`Workout successfully deployed to: ${deployedPath}`);
        } catch (error) {
            console.error('Error deploying workout:', error);
            this.ui.showToast('Failed to deploy workout. Please try again.');
        }
    }

    setSelectedSegmentIndex(index) {
        this.selectedSegmentIndex = index;
        // Update UI and chart highlighting
        if (this.ui && this.ui.updateSegmentHighlight) {
            this.ui.updateSegmentHighlight(index);
        }
        
        // Announce to screen readers
        if (index !== null && this.workout && this.workout.workoutData.segments) {
            const segment = this.workout.workoutData.segments[index];
            if (segment) {
                this.announceToScreenReader(`Selected segment ${index + 1}: ${Math.round(segment.power || 0)}% power, ${segment.duration || 0} seconds`);
            }
        }
        
        this.displayWorkout();
    }

    announceToScreenReader(message) {
        const announcements = document.getElementById('sr-announcements');
        if (announcements) {
            announcements.textContent = message;
            // Clear after a delay
            setTimeout(() => {
                announcements.textContent = '';
            }, 1000);
        }
    }

    applySegmentEdit(segmentIndex, newDuration, newPower, newPowerLow, newPowerHigh) {
        if (!this.workout) return;

        this.workout.applySegmentEdit(segmentIndex, newDuration, newPower, newPowerLow, newPowerHigh);
        this.ui.updateUndoButton(this.workout.undoStack.length);
        this.displayWorkout();
        this.ui.showToast('Segment updated!');
    }

    undoLastEdit() {
        if (this.workout && this.workout.undoStack.length > 0) {
            this.workout.undoLastEdit();
            this.selectedSegmentIndex = null;
            this.displayWorkout();
            this.ui.updateUndoButton(this.workout.undoStack.length);
            this.ui.showToast('Undo successful');
        }
    }

    createWorkoutFromData(workoutData) {
        try {
            this.workout = new Workout(workoutData);
            this.ui.updateUndoButton(this.workout.undoStack.length);
            this.displayWorkout();
        } catch (error) {
            console.error('Error creating workout from data:', error);
            this.ui.showToast('Error creating workout from generated data');
        }
    }
    
    // async initializeComponents() {
    //     try {
    //         // Initialize component system
    //         const components = await initializeComponents();
    //         console.log(`Initialized ${components.length} components`);
    //         
    //         // Setup component event handlers
    //         this.setupComponentEvents();
    //         
    //     } catch (error) {
    //         console.error('Failed to initialize components:', error);
    //     }
    // }
    
    setupComponentEvents() {
        // Listen for component events
        document.addEventListener('workout:exported', (event) => {
            this.ui.showToast(`Workout exported as ${event.detail.format.toUpperCase()}`, 'success');
        });
        
        document.addEventListener('export:error', (event) => {
            this.ui.showToast(`Export failed: ${event.detail.error.message}`, 'error');
        });
        
        document.addEventListener('chart:initialized', () => {
            console.log('Chart component initialized');
        });
        
        document.addEventListener('component:destroy', (event) => {
            console.log('Component destroyed:', event.detail.component);
        });
    }
    
    initializePerformanceMonitoring() {
        // Performance monitoring is automatically initialized by the performance optimizer
        console.log('Performance monitoring initialized');
        
        // Setup performance reporting
        setInterval(() => {
            const summary = performanceOptimizer.getSummary();
            if (summary.score < 70) {
                console.warn('Performance score is low:', summary.score);
                console.warn('Issues:', summary.issues);
                console.warn('Recommendations:', summary.recommendations);
            }
        }, 60000); // Check every minute
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.visualizer = new ZwiftWorkoutVisualizer();
});

