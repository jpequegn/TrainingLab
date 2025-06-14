class ZwiftWorkoutVisualizer {
    constructor() {
        this.chart = null;
        this.workoutData = null;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.handleFileUpload(e);
        });

        document.getElementById('loadSample').addEventListener('click', () => {
            this.loadSampleWorkout();
        });
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.zwo')) {
            alert('Please select a valid Zwift workout file (.zwo)');
            return;
        }

        try {
            const text = await this.readFileAsText(file);
            this.parseAndVisualize(text);
        } catch (error) {
            console.error('Error reading file:', error);
            alert('Error reading the workout file. Please try again.');
        }
    }

    async loadSampleWorkout() {
        try {
            const response = await fetch('sample_workout.zwo');
            const text = await response.text();
            this.parseAndVisualize(text);
        } catch (error) {
            console.error('Error loading sample workout:', error);
            alert('Error loading sample workout. Please try uploading your own file.');
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
            
            // Check for parsing errors
            const parseError = xmlDoc.querySelector('parsererror');
            if (parseError) {
                throw new Error('Invalid XML format');
            }

            this.workoutData = this.parseWorkoutXML(xmlDoc);
            this.displayWorkoutInfo();
            this.createChart();
            this.displaySegmentDetails();
        } catch (error) {
            console.error('Error parsing workout:', error);
            alert('Error parsing the workout file. Please ensure it\'s a valid Zwift workout file.');
        }
    }

    parseWorkoutXML(xmlDoc) {
        const workoutFile = xmlDoc.querySelector('workout_file');
        if (!workoutFile) {
            throw new Error('Invalid workout file format');
        }

        const workout = {
            name: this.getElementText(workoutFile, 'name') || 'Unnamed Workout',
            description: this.getElementText(workoutFile, 'description') || 'No description',
            author: this.getElementText(workoutFile, 'author') || 'Unknown',
            sportType: this.getElementText(workoutFile, 'sportType') || 'bike',
            segments: [],
            totalDuration: 0
        };

        const workoutElement = workoutFile.querySelector('workout');
        if (!workoutElement) {
            throw new Error('No workout element found');
        }

        const segments = workoutElement.children;
        let currentTime = 0;

        for (let segment of segments) {
            const segmentData = this.parseSegment(segment, currentTime);
            if (segmentData) {
                if (Array.isArray(segmentData)) {
                    // Handle intervals which return an array
                    workout.segments.push(segmentData);
                    // Calculate total duration for all intervals
                    const totalIntervalDuration = segmentData.reduce((sum, interval) => sum + interval.duration, 0);
                    currentTime += totalIntervalDuration;
                } else {
                    // Handle single segments
                    workout.segments.push(segmentData);
                    currentTime += segmentData.totalDuration;
                }
            }
        }

        workout.totalDuration = currentTime;
        return workout;
    }

    parseSegment(segment, startTime) {
        const tagName = segment.tagName;
        const duration = parseInt(segment.getAttribute('Duration')) || 0;
        
        let segmentData = {
            type: tagName,
            startTime: startTime,
            duration: duration,
            totalDuration: duration,
            powerData: []
        };

        switch (tagName) {
            case 'Warmup':
            case 'Cooldown':
                segmentData.powerLow = parseFloat(segment.getAttribute('PowerLow')) || 0.5;
                segmentData.powerHigh = parseFloat(segment.getAttribute('PowerHigh')) || 0.7;
                segmentData.powerData = this.generateRampData(segmentData);
                break;

            case 'SteadyState':
                segmentData.power = parseFloat(segment.getAttribute('Power')) || 0.6;
                segmentData.powerData = this.generateSteadyData(segmentData);
                break;

            case 'IntervalsT':
                return this.parseIntervals(segment, startTime);

            case 'Ramp':
                segmentData.powerLow = parseFloat(segment.getAttribute('PowerLow')) || 0.5;
                segmentData.powerHigh = parseFloat(segment.getAttribute('PowerHigh')) || 1.0;
                segmentData.powerData = this.generateRampData(segmentData);
                break;

            case 'FreeRide':
                segmentData.power = 0.6; // Default for free ride
                segmentData.powerData = this.generateSteadyData(segmentData);
                break;

            default:
                return null;
        }

        return segmentData;
    }

    parseIntervals(segment, startTime) {
        const repeat = parseInt(segment.getAttribute('Repeat')) || 1;
        const onDuration = parseInt(segment.getAttribute('OnDuration')) || 60;
        const offDuration = parseInt(segment.getAttribute('OffDuration')) || 60;
        const powerOnHigh = parseFloat(segment.getAttribute('PowerOnHigh')) || 1.0;
        const powerOnLow = parseFloat(segment.getAttribute('PowerOnLow')) || powerOnHigh;
        const powerOffHigh = parseFloat(segment.getAttribute('PowerOffHigh')) || 0.5;
        const powerOffLow = parseFloat(segment.getAttribute('PowerOffLow')) || powerOffHigh;

        const intervals = [];
        let currentTime = startTime;

        for (let i = 0; i < repeat; i++) {
            // On interval
            intervals.push({
                type: 'Interval (On)',
                startTime: currentTime,
                duration: onDuration,
                totalDuration: onDuration,
                power: powerOnHigh,
                powerData: this.generateSteadyData({
                    startTime: currentTime,
                    duration: onDuration,
                    power: powerOnHigh
                })
            });
            currentTime += onDuration;

            // Off interval (recovery) - only add if not the last interval or if offDuration > 0
            if (i < repeat - 1 && offDuration > 0) {
                intervals.push({
                    type: 'Interval (Off)',
                    startTime: currentTime,
                    duration: offDuration,
                    totalDuration: offDuration,
                    power: powerOffHigh,
                    powerData: this.generateSteadyData({
                        startTime: currentTime,
                        duration: offDuration,
                        power: powerOffHigh
                    })
                });
                currentTime += offDuration;
            }
        }

        return intervals;
    }

    generateSteadyData(segment) {
        const points = Math.max(2, Math.floor(segment.duration / 10)); // Point every 10 seconds, minimum 2 points
        const data = [];
        
        for (let i = 0; i < points; i++) {
            const time = segment.startTime + (i * segment.duration / (points - 1));
            data.push({
                x: time,
                y: segment.power * 100 // Convert to percentage
            });
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
            data.push({
                x: time,
                y: power * 100
            });
        }
        
        return data;
    }

    getElementText(parent, tagName) {
        const element = parent.querySelector(tagName);
        return element ? element.textContent.trim() : null;
    }

    displayWorkoutInfo() {
        document.getElementById('workoutName').textContent = this.workoutData.name;
        document.getElementById('workoutDescription').textContent = this.workoutData.description;
        document.getElementById('workoutAuthor').textContent = this.workoutData.author;
        document.getElementById('workoutSport').textContent = this.workoutData.sportType;
        document.getElementById('totalDuration').textContent = this.formatDuration(this.workoutData.totalDuration);
        
        document.getElementById('workoutInfo').style.display = 'block';
    }

    createChart() {
        const ctx = document.getElementById('workoutChart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.chart) {
            this.chart.destroy();
        }

        // Prepare data for Chart.js
        const datasets = [];
        const colors = {
            'Warmup': '#FFA726',
            'Cooldown': '#66BB6A',
            'SteadyState': '#42A5F5',
            'Interval (On)': '#EF5350',
            'Interval (Off)': '#AB47BC',
            'Ramp': '#FF7043',
            'FreeRide': '#78909C'
        };

        // Flatten all segments (including intervals)
        const allSegments = [];
        this.workoutData.segments.forEach(segment => {
            if (Array.isArray(segment)) {
                allSegments.push(...segment);
            } else {
                allSegments.push(segment);
            }
        });

        // Group segments by type for better visualization
        const segmentsByType = {};
        allSegments.forEach(segment => {
            if (!segmentsByType[segment.type]) {
                segmentsByType[segment.type] = [];
            }
            segmentsByType[segment.type].push(...segment.powerData);
        });

        // Create datasets
        Object.keys(segmentsByType).forEach(type => {
            datasets.push({
                label: type,
                data: segmentsByType[type],
                borderColor: colors[type] || '#999',
                backgroundColor: colors[type] ? colors[type] + '20' : '#99920',
                borderWidth: 2,
                fill: false,
                tension: 0.1
            });
        });

        this.chart = new Chart(ctx, {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Workout Power Profile',
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                const time = context[0].parsed.x;
                                return `Time: ${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}`;
                            },
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}% FTP`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: 'Time (seconds)'
                        },
                        ticks: {
                            callback: function(value) {
                                const minutes = Math.floor(value / 60);
                                const seconds = value % 60;
                                return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                            }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Power (% FTP)'
                        },
                        min: 0,
                        max: Math.max(120, Math.max(...datasets.flatMap(d => d.data.map(p => p.y))) + 10)
                    }
                }
            }
        });

        document.querySelector('.chart-container').style.display = 'block';
    }

    displaySegmentDetails() {
        const segmentList = document.getElementById('segmentList');
        segmentList.innerHTML = '';

        // Flatten segments for display
        const allSegments = [];
        this.workoutData.segments.forEach(segment => {
            if (Array.isArray(segment)) {
                allSegments.push(...segment);
            } else {
                allSegments.push(segment);
            }
        });

        allSegments.forEach((segment, index) => {
            const segmentDiv = document.createElement('div');
            segmentDiv.className = 'segment';
            
            let powerText = '';
            if (segment.power !== undefined) {
                powerText = `${(segment.power * 100).toFixed(0)}% FTP`;
            } else if (segment.powerLow !== undefined && segment.powerHigh !== undefined) {
                powerText = `${(segment.powerLow * 100).toFixed(0)}% - ${(segment.powerHigh * 100).toFixed(0)}% FTP`;
            }

            segmentDiv.innerHTML = `
                <div class="segment-header">
                    <span class="segment-type">${segment.type}</span>
                    <span class="segment-duration">${this.formatDuration(segment.duration)}</span>
                </div>
                <div class="segment-power">Power: ${powerText}</div>
            `;
            
            segmentList.appendChild(segmentDiv);
        });

        document.getElementById('segmentDetails').style.display = 'block';
    }

    formatDuration(seconds) {
        if (isNaN(seconds) || seconds < 0) {
            return '0:00';
        }
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ZwiftWorkoutVisualizer();
});