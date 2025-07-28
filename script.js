

import { parseWorkoutXML } from './parser.js';
import { Workout } from './workout.js';
import { generateERGContent, generateMRCContent, downloadFile, generateZWOContent } from './exporter.js';
import { deployWorkout } from './api.js';
import { UI } from './ui.js';
import { WorkoutLibrary } from './library.js';

class ZwiftWorkoutVisualizer {
    constructor() {
        this.workout = null;
        this.ui = new UI(this);
        this.selectedSegmentIndex = null;
        
        // Initialize workout library
        this.library = new WorkoutLibrary(this);
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.zwo')) {
            this.ui.showToast('Please select a valid Zwift workout file (.zwo)');
            return;
        }

        try {
            const text = await this.readFileAsText(file);
            this.parseAndVisualize(text);
        } catch (error) {
            console.error('Error reading file:', error);
            this.ui.showToast('Error reading the workout file. Please try again.');
        }
    }

    async loadSampleWorkout() {
        try {
            const response = await fetch('sample_workout.zwo');
            const text = await response.text();
            this.parseAndVisualize(text);
        } catch (error) {
            console.error('Error loading sample workout:', error);
            this.ui.showToast('Error loading sample workout. Please try uploading your own file.');
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

    parseAndVisualize(xmlText) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            
            const parseError = xmlDoc.querySelector('parsererror');
            if (parseError) {
                throw new Error('Invalid XML format');
            }

            const workoutData = parseWorkoutXML(xmlDoc);
            this.workout = new Workout(workoutData);
            this.ui.updateUndoButton(this.workout.undoStack.length);
            this.displayWorkout();
        } catch (error) {
            console.error('Error parsing workout:', error);
            this.ui.showToast('Error parsing the workout file. Please ensure it\'s a valid Zwift workout file.');
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
        this.displayWorkout();
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
}

document.addEventListener('DOMContentLoaded', () => {
    window.visualizer = new ZwiftWorkoutVisualizer();
});

