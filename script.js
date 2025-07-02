

import { parseWorkoutXML } from './parser.js';
import { calculateTSS } from './workout.js';
import { generateERGContent, generateMRCContent, downloadFile, generateZWOContent } from './exporter.js';
import { deployWorkout } from './api.js';
import { UI } from './ui.js';

class ZwiftWorkoutVisualizer {
    constructor() {
        this.chart = null;
        this.workoutData = null;
        this.originalWorkoutData = null; // Store original for reset functionality
        this.ftp = 250; // Default FTP value in watts
        this.selectedSegmentIndex = null; // For chart selection
        this.undoStack = [];
        this.ui = new UI(this);
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

            this.workoutData = parseWorkoutXML(xmlDoc);
            this.workoutData.tss = calculateTSS(this.workoutData);
            this.originalWorkoutData = JSON.parse(JSON.stringify(this.workoutData));
            this.undoStack = []; // Clear undo stack on new workout load
            this.ui.updateUndoButton(this.undoStack.length);
            this.displayWorkout();
        } catch (error) {
            console.error('Error parsing workout:', error);
            this.ui.showToast('Error parsing the workout file. Please ensure it\'s a valid Zwift workout file.');
        }
    }

    displayWorkout() {
        if (!this.workoutData) return;
        this.ui.displayWorkoutInfo(this.workoutData, this.workoutData.tss);
        this.ui.createChart(this.workoutData, this.ftp, this.selectedSegmentIndex, this.setSelectedSegmentIndex.bind(this));
        this.ui.displaySegmentDetails(this.workoutData);
    }

    updateFTP(newFTP) {
        this.ftp = newFTP;
        if (this.workoutData) {
            this.displayWorkout();
        }
    }

    exportToERG() {
        if (!this.workoutData) {
            this.ui.showToast('Please load a workout first');
            return;
        }
        const ergContent = generateERGContent(this.workoutData, this.ftp);
        downloadFile(ergContent, `${this.workoutData.name}.erg`, 'text/plain');
    }

    exportToMRC() {
        if (!this.workoutData) {
            this.ui.showToast('Please load a workout first');
            return;
        }
        const mrcContent = generateMRCContent(this.workoutData);
        downloadFile(mrcContent, `${this.workoutData.name}.mrc`, 'text/plain');
    }

    applyScaling() {
        if (!this.workoutData) {
            this.ui.showToast('Please load a workout first');
            return;
        }

        this.undoStack.push(JSON.parse(JSON.stringify(this.workoutData)));
        this.ui.updateUndoButton(this.undoStack.length);

        const scaleFactor = parseFloat(document.getElementById('scaleSlider').value);
        
        this.workoutData.segments.forEach(segment => {
            if (Array.isArray(segment)) { // Handle intervals
                segment.forEach(interval => {
                    if (this.shouldScaleSegment(interval)) {
                        this.scaleSegmentPower(interval, scaleFactor);
                    }
                });
            } else { // Handle single segments
                if (this.shouldScaleSegment(segment)) {
                    this.scaleSegmentPower(segment, scaleFactor);
                }
            }
        });

        // Re-generate power data for all segments after scaling
        this.workoutData.segments.forEach(segment => {
            if (Array.isArray(segment)) {
                segment.forEach(interval => {
                    if (interval.type.includes('Interval') || interval.type === 'SteadyState' || interval.type === 'FreeRide') {
                        interval.powerData = this.generateSteadyData(interval);
                    } else if (interval.type === 'Warmup' || interval.type === 'Cooldown' || interval.type === 'Ramp') {
                        interval.powerData = this.generateRampData(interval);
                    }
                });
            } else {
                if (segment.type === 'SteadyState' || segment.type === 'FreeRide') {
                    segment.powerData = this.generateSteadyData(segment);
                } else if (segment.type === 'Warmup' || segment.type === 'Cooldown' || segment.type === 'Ramp') {
                    segment.powerData = this.generateRampData(segment);
                }
            }
        });

        this.workoutData.tss = calculateTSS(this.workoutData);
        this.displayWorkout();
        this.ui.showToast('Workout scaled!');
    }

    shouldScaleSegment(segment) {
        const type = segment.type.toLowerCase();
        return type !== 'warmup' && type !== 'cooldown';
    }

    scaleSegmentPower(segment, scaleFactor) {
        if (segment.power !== undefined) {
            segment.power = parseFloat((segment.power * scaleFactor).toFixed(2));
        }
        if (segment.powerLow !== undefined) {
            segment.powerLow = parseFloat((segment.powerLow * scaleFactor).toFixed(2));
        }
        if (segment.powerHigh !== undefined) {
            segment.powerHigh = parseFloat((segment.powerHigh * scaleFactor).toFixed(2));
        }
    }

    resetWorkout() {
        if (!this.originalWorkoutData) {
            this.ui.showToast('No original workout data to reset to');
            return;
        }

        this.undoStack.push(JSON.parse(JSON.stringify(this.workoutData)));
        this.ui.updateUndoButton(this.undoStack.length);

        this.workoutData = JSON.parse(JSON.stringify(this.originalWorkoutData));
        
        document.getElementById('scaleSlider').value = 1.0;
        this.ui.updateScaleValue(1.0);
        
        this.displayWorkout();
        this.ui.showToast('Workout reset!');
    }

    exportModifiedZWO() {
        if (!this.workoutData) {
            this.ui.showToast('Please load a workout first');
            return;
        }

        const zwoContent = generateZWOContent(this.workoutData);
        downloadFile(zwoContent, `${this.workoutData.name.replace(/[^a-z0-9]/gi, '_')}_modified.zwo`, 'application/xml');
    }

    async deployWorkout() {
        if (!this.workoutData) {
            this.ui.showToast('Please load a workout first');
            return;
        }

        const zwoContent = generateZWOContent(this.workoutData);
        const workoutName = this.workoutData.name.replace(/[^a-z0-9]/gi, '_');

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
        this.ui.createChart(this.workoutData, this.ftp, this.selectedSegmentIndex, this.setSelectedSegmentIndex.bind(this));
    }

    applySegmentEdit(segmentIndex, newDuration, newPower, newPowerLow, newPowerHigh) {
        this.undoStack.push(JSON.parse(JSON.stringify(this.workoutData)));
        this.ui.updateUndoButton(this.undoStack.length);

        // Flatten all segments to find the correct one by index
        const allSegments = [];
        this.workoutData.segments.forEach(seg => {
            if (Array.isArray(seg)) {
                allSegments.push(...seg);
            } else {
                allSegments.push(seg);
            }
        });

        const segment = allSegments[segmentIndex];
        if (!segment) return; // Should not happen

        segment.duration = newDuration;
        if (segment.type === 'SteadyState' || segment.type === 'Interval (On)' || segment.type === 'Interval (Off)' || segment.type === 'FreeRide') {
            segment.power = newPower / 100; // Convert back to 0-1 scale
        } else if (segment.type === 'Warmup' || segment.type === 'Cooldown' || segment.type === 'Ramp') {
            segment.powerLow = newPowerLow / 100;
            segment.powerHigh = newPowerHigh / 100;
        }

        // Re-generate powerData for this specific segment
        if (segment.type === 'SteadyState' || segment.type === 'Interval (On)' || segment.type === 'Interval (Off)' || segment.type === 'FreeRide') {
            segment.powerData = this.generateSteadyData(segment);
        } else if (segment.type === 'Warmup' || segment.type === 'Cooldown' || segment.type === 'Ramp') {
            segment.powerData = this.generateRampData(segment);
        }

        // Recalculate start times for all segments in the main workoutData structure
        let currentTime = 0;
        this.workoutData.segments.forEach(seg => {
            if (Array.isArray(seg)) {
                seg.forEach(interval => {
                    interval.startTime = currentTime;
                    currentTime += interval.duration;
                });
            } else {
                seg.startTime = currentTime;
                currentTime += seg.duration;
            }
        });
        this.workoutData.totalDuration = currentTime; // Update total duration
        this.workoutData.tss = calculateTSS(this.workoutData);
        
        this.displayWorkout();
        this.ui.showToast('Segment updated!');
    }

    undoLastEdit() {
        if (this.undoStack.length > 0) {
            this.workoutData = this.undoStack.pop();
            this.selectedSegmentIndex = null;
            this.displayWorkout();
            this.ui.updateUndoButton(this.undoStack.length);
            this.ui.showToast('Undo successful');
        }
    }

    // Helper functions for generating power data (copied from parser.js for now, consider moving to workout.js)
    generateSteadyData(segment) {
        const points = Math.max(2, Math.floor(segment.duration / 10));
        const data = [];
        for (let i = 0; i < points; i++) {
            const time = segment.startTime + (i * segment.duration / (points - 1));
            data.push({ x: time, y: segment.power * 100 });
        }
        return data;
    }

    generateRampData(segment) {
        const points = Math.max(2, Math.floor(segment.duration / 10));
        const data = [];
        for (let i = 0; i < points; i++) {
            const progress = i / (points - 1);
            const time = segment.startTime + (i * segment.duration / (points - 1));
            const power = segment.powerLow + (segment.powerHigh - segment.powerLow) * progress;
            data.push({ x: time, y: power * 100 });
        }
        return data;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.visualizer = new ZwiftWorkoutVisualizer();
});

