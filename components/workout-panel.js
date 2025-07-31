/**
 * Workout Panel Component
 * Main container for workout display and interaction
 */

import { BaseComponent, Component } from './base-component.js';
import WorkoutChart from './workout-chart.js';
import SegmentEditor from './segment-editor.js';

@Component('workout-panel')
export class WorkoutPanel extends BaseComponent {
    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            showChart: true,
            showSegmentEditor: true,
            showWorkoutInfo: true,
            layout: 'vertical' // vertical, horizontal
        };
    }
    
    initialize() {
        super.initialize();
        
        this.workoutData = null;
        this.chartComponent = null;
        this.editorComponent = null;
        
        this.createPanelStructure();
        this.initializeChildComponents();
    }
    
    setupStateBindings() {
        // Subscribe to workout changes
        this.subscribe('workout', (workout) => {
            this.workoutData = workout;
            this.updateWorkoutDisplay();
        }, { immediate: true });
        
        // Subscribe to active panel changes
        this.subscribe('activePanel', (panel) => {
            this.toggleVisibility(panel === 'workout');
        }, { immediate: true });
    }
    
    createPanelStructure() {
        const layoutClass = this.options.layout === 'horizontal' ? 'flex-row' : 'flex-col';
        
        this.element.innerHTML = `
            <div class="workout-panel-container h-full flex ${layoutClass} gap-4">
                ${this.options.showWorkoutInfo ? this.createWorkoutInfoHTML() : ''}
                ${this.options.showChart ? this.createChartContainerHTML() : ''}
                ${this.options.showSegmentEditor ? this.createEditorContainerHTML() : ''}
            </div>
        `;
    }
    
    createWorkoutInfoHTML() {
        return `
            <div class="workout-info bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-4">
                <div class="info-header mb-4">
                    <h2 class="text-xl font-bold text-gray-900 dark:text-white">
                        Workout Information
                    </h2>
                </div>
                
                <div class="info-content grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="info-item">
                        <div class="label text-sm font-medium text-gray-600 dark:text-gray-400">
                            Name
                        </div>
                        <div class="value text-lg font-semibold text-gray-900 dark:text-white" data-bind="workout-name">
                            No workout loaded
                        </div>
                    </div>
                    
                    <div class="info-item">
                        <div class="label text-sm font-medium text-gray-600 dark:text-gray-400">
                            Duration
                        </div>
                        <div class="value text-lg font-semibold text-gray-900 dark:text-white" data-bind="workout-duration">
                            --:--
                        </div>
                    </div>
                    
                    <div class="info-item">
                        <div class="label text-sm font-medium text-gray-600 dark:text-gray-400">
                            TSS
                        </div>
                        <div class="value text-lg font-semibold text-gray-900 dark:text-white" data-bind="workout-tss">
                            ---
                        </div>
                    </div>
                    
                    <div class="info-item">
                        <div class="label text-sm font-medium text-gray-600 dark:text-gray-400">
                            IF
                        </div>
                        <div class="value text-lg font-semibold text-gray-900 dark:text-white" data-bind="workout-if">
                            --.-
                        </div>
                    </div>
                    
                    <div class="info-item">
                        <div class="label text-sm font-medium text-gray-600 dark:text-gray-400">
                            Segments
                        </div>
                        <div class="value text-lg font-semibold text-gray-900 dark:text-white" data-bind="segment-count">
                            --
                        </div>
                    </div>
                    
                    <div class="info-item">
                        <div class="label text-sm font-medium text-gray-600 dark:text-gray-400">
                            Avg Power
                        </div>
                        <div class="value text-lg font-semibold text-gray-900 dark:text-white" data-bind="avg-power">
                            ---%
                        </div>
                    </div>
                </div>
                
                <div class="info-actions mt-6 flex gap-2">
                    <button 
                        class="btn-export bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                        data-action="export-erg"
                        disabled
                    >
                        Export ERG
                    </button>
                    <button 
                        class="btn-export bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        data-action="export-mrc"
                        disabled
                    >
                        Export MRC
                    </button>
                    <button 
                        class="btn-export bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md font-medium focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                        data-action="export-zwo"
                        disabled
                    >
                        Export ZWO
                    </button>
                </div>
            </div>
        `;
    }
    
    createChartContainerHTML() {
        const containerClass = this.options.layout === 'horizontal' ? 'flex-1' : '';
        
        return `
            <div class="chart-container ${containerClass} bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <div class="chart-header mb-4 flex justify-between items-center">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                        Power Profile
                    </h3>
                    <div class="chart-controls flex gap-2">
                        <button 
                            class="btn-chart-action p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                            data-action="export-chart"
                            title="Export Chart"
                        >
                            📊
                        </button>
                        <button 
                            class="btn-chart-action p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                            data-action="toggle-power-zones"
                            title="Toggle Power Zones"
                        >
                            🎯
                        </button>
                    </div>
                </div>
                
                <div class="chart-wrapper relative" style="height: 400px;">
                    <div data-component-type="workout-chart" 
                         data-component-options='{"showPowerZones": true, "enableInteraction": true}'
                         class="w-full h-full">
                    </div>
                </div>
            </div>
        `;
    }
    
    createEditorContainerHTML() {
        const containerClass = this.options.layout === 'horizontal' ? 'w-80' : '';
        
        return `
            <div class="editor-container ${containerClass}">
                <div data-component-type="segment-editor" 
                     data-component-options='{"editable": true}'
                     class="w-full">
                </div>
            </div>
        `;
    }
    
    async initializeChildComponents() {
        // Wait for DOM to be ready
        await new Promise(resolve => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                window.addEventListener('load', resolve);
            }
        });
        
        // Initialize chart component
        if (this.options.showChart) {
            const chartElement = this.element.querySelector('[data-component-type="workout-chart"]');
            if (chartElement) {
                this.chartComponent = new WorkoutChart(chartElement, {
                    showPowerZones: true,
                    enableInteraction: true
                });
                this.addChild('chart', this.chartComponent);
            }
        }
        
        // Initialize segment editor
        if (this.options.showSegmentEditor) {
            const editorElement = this.element.querySelector('[data-component-type="segment-editor"]');
            if (editorElement) {
                this.editorComponent = new SegmentEditor(editorElement, {
                    editable: true
                });
                this.addChild('editor', this.editorComponent);
            }
        }
        
        this.emit('components:initialized');
    }
    
    setupEventListeners() {
        super.setupEventListeners();
        
        // Export actions
        this.element.addEventListener('click', (event) => {
            const action = event.target.getAttribute('data-action');
            if (action) {
                this.handleAction(action, event);
            }
        });
        
        // Chart component events
        this.on('chart:updated', this.handleChartUpdated.bind(this));
        this.on('segment:highlighted', this.handleSegmentHighlighted.bind(this));
        
        // Editor component events
        this.on('changes:applied', this.handleSegmentChanged.bind(this));
    }
    
    updateWorkoutDisplay() {
        if (!this.workoutData) {
            this.clearWorkoutDisplay();
            return;
        }
        
        // Update workout info
        this.updateWorkoutInfo(this.workoutData);
        
        // Enable export buttons
        this.enableExportButtons(true);
        
        this.emit('workout:displayed', { workout: this.workoutData });
    }
    
    updateWorkoutInfo(workoutData) {
        const bindings = {
            'workout-name': workoutData.name || 'Untitled Workout',
            'workout-duration': this.formatDuration(workoutData.totalDuration || 0),
            'workout-tss': Math.round(workoutData.tss || 0),
            'workout-if': (workoutData.intensityFactor || 0).toFixed(2),
            'segment-count': workoutData.segments?.length || 0,
            'avg-power': Math.round(workoutData.avgPower || 0) + '%'
        };
        
        Object.entries(bindings).forEach(([selector, value]) => {
            const element = this.element.querySelector(`[data-bind="${selector}"]`);
            if (element) {
                element.textContent = value;
            }
        });
    }
    
    clearWorkoutDisplay() {
        // Clear workout info
        const defaultValues = {
            'workout-name': 'No workout loaded',
            'workout-duration': '--:--',
            'workout-tss': '---',
            'workout-if': '--.-',
            'segment-count': '--',
            'avg-power': '---%'
        };
        
        Object.entries(defaultValues).forEach(([selector, value]) => {
            const element = this.element.querySelector(`[data-bind="${selector}"]`);
            if (element) {
                element.textContent = value;
            }
        });
        
        // Disable export buttons
        this.enableExportButtons(false);
    }
    
    enableExportButtons(enabled) {
        const exportButtons = this.element.querySelectorAll('.btn-export');
        exportButtons.forEach(button => {
            button.disabled = !enabled;
        });
    }
    
    handleAction(action, event) {
        switch (action) {
            case 'export-erg':
                this.exportWorkout('erg');
                break;
            case 'export-mrc':
                this.exportWorkout('mrc');
                break;
            case 'export-zwo':
                this.exportWorkout('zwo');
                break;
            case 'export-chart':
                this.exportChart();
                break;
            case 'toggle-power-zones':
                this.togglePowerZones();
                break;
        }
    }
    
    exportWorkout(format) {
        if (!this.workoutData) return;
        
        try {
            if (window.app) {
                switch (format) {
                    case 'erg':
                        window.app.exportToERG();
                        break;
                    case 'mrc':
                        window.app.exportToMRC();
                        break;
                    case 'zwo':
                        window.app.exportModifiedZWO();
                        break;
                }
                this.emit('workout:exported', { format });
            }
        } catch (error) {
            console.error(`Export ${format} failed:`, error);
            this.emit('export:error', { format, error });
        }
    }
    
    exportChart() {
        if (this.chartComponent) {
            this.chartComponent.exportChart();
        }
    }
    
    togglePowerZones() {
        if (this.chartComponent) {
            const currentOption = this.chartComponent.options.showPowerZones;
            this.chartComponent.updateOptions({ showPowerZones: !currentOption });
        }
    }
    
    handleChartUpdated(event) {
        console.log('Chart updated:', event.detail);
    }
    
    handleSegmentHighlighted(event) {
        const { segmentIndex } = event.detail;
        console.log('Segment highlighted:', segmentIndex);
    }
    
    handleSegmentChanged(event) {
        const { segmentIndex, changes } = event.detail;
        console.log('Segment changed:', segmentIndex, changes);
        
        // Refresh chart if needed
        if (this.chartComponent) {
            const workout = stateManager.getState('workout');
            if (workout) {
                this.chartComponent.updateChart(workout);
            }
        }
    }
    
    toggleVisibility(visible) {
        if (visible) {
            this.show();
        } else {
            this.hide();
        }
    }
    
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        }
    }
    
    // Public API methods
    refreshChart() {
        if (this.chartComponent && this.workoutData) {
            this.chartComponent.updateChart(this.workoutData);
        }
    }
    
    selectSegment(index) {
        stateManager.dispatch('SELECT_SEGMENT', index);
    }
    
    getSelectedSegment() {
        return stateManager.getState('selectedSegmentIndex');
    }
    
    destroy() {
        // Child components are automatically destroyed by BaseComponent
        super.destroy();
    }
}

export default WorkoutPanel;