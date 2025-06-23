class ZwiftWorkoutVisualizer {
    constructor() {
        this.chart = null;
        this.workoutData = null;
        this.originalWorkoutData = null; // Store original for reset functionality
        this.ftp = 250; // Default FTP value in watts
        this.currentEditingSegment = null;
        this.selectedSegmentIndex = null; // For chart selection
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.handleFileUpload(e);
        });

        document.getElementById('loadSample').addEventListener('click', () => {
            this.loadSampleWorkout();
        });

        document.getElementById('exportERG').addEventListener('click', () => {
            this.exportToERG();
        });

        document.getElementById('exportMRC').addEventListener('click', () => {
            this.exportToMRC();
        });

        document.getElementById('ftpInput').addEventListener('input', (e) => {
            this.updateFTP(parseInt(e.target.value) || 250);
        });

        // Editing functionality event listeners
        document.getElementById('scaleSlider').addEventListener('input', (e) => {
            this.updateScaleValue(e.target.value);
        });

        document.getElementById('applyScale').addEventListener('click', () => {
            this.applyScaling();
        });

        document.getElementById('resetWorkout').addEventListener('click', () => {
            this.resetWorkout();
        });

        document.getElementById('exportModified').addEventListener('click', () => {
            this.exportModifiedZWO();
        });

        document.getElementById('deployWorkout').addEventListener('click', () => {
            this.deployWorkout();
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
            this.originalWorkoutData = JSON.parse(JSON.stringify(this.workoutData)); // Deep copy for reset
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
        workout.tss = this.calculateTSS(workout);
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
        document.getElementById('workoutTSS').textContent = this.workoutData.tss;
        
        document.getElementById('workoutInfo').style.display = 'block';
    }

    createChart() {
        const ctx = document.getElementById('workoutChart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.chart) {
            this.chart.destroy();
        }

        // Prepare data for Chart.js
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

        // Sort segments by start time to ensure proper ordering
        allSegments.sort((a, b) => a.startTime - b.startTime);

        // Group data points by type for legend clarity
        const typeDataMap = {};
        allSegments.forEach(segment => {
            const type = segment.type;
            if (!typeDataMap[type]) typeDataMap[type] = [];
            // Add all points for this segment to the type's array
            segment.powerData.forEach(point => typeDataMap[type].push(point));
        });

        // Create one dataset per type, but also create a dataset for each segment for highlighting
        const datasets = Object.keys(typeDataMap).map((type, idx) => ({
            label: type,
            data: typeDataMap[type],
            borderColor: colors[type] || '#999',
            backgroundColor: (colors[type] ? colors[type] + '60' : '#99960'),
            borderWidth: 1,
            fill: true,
            tension: 0.1,
            pointRadius: 0,
            pointHoverRadius: 4,
            order: idx
        }));

        // Add a dataset for the selected segment (if any)
        if (this.selectedSegmentIndex !== null && allSegments[this.selectedSegmentIndex]) {
            const seg = allSegments[this.selectedSegmentIndex];
            datasets.push({
                label: 'Selected',
                data: seg.powerData,
                borderColor: '#FFD600',
                backgroundColor: '#FFD60040',
                borderWidth: 3,
                fill: true,
                tension: 0.1,
                pointRadius: 0,
                pointHoverRadius: 6,
                order: 100
            });
            // Show edit form for selected segment
            this.showSegmentEditForm(this.selectedSegmentIndex, seg);
        } else {
            // Hide edit form if no segment selected
            const editBox = document.getElementById('segmentEditBox');
            if (editBox) editBox.style.display = 'none';
        }

        // Reference to the hover power box
        const hoverPowerBox = document.getElementById('hoverPowerBox');
        if (hoverPowerBox) hoverPowerBox.style.display = 'none';

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
                        enabled: true,
                        callbacks: {
                            title: function(context) {
                                const time = context[0].parsed.x;
                                return `Time: ${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}`;
                            },
                            label: (context) => {
                                const percent = context.parsed.y;
                                const ftp = this.ftp || 250;
                                const actual = Math.round((percent / 100) * ftp);
                                return `${context.dataset.label}: ${percent.toFixed(1)}% FTP (${actual} W)`;
                            }
                        },
                        external: (context) => {
                            // Show hovered power in the box below the chart
                            const tooltip = context.tooltip;
                            if (!hoverPowerBox) return;
                            if (tooltip && tooltip.opacity > 0 && tooltip.dataPoints && tooltip.dataPoints.length > 0) {
                                const dp = tooltip.dataPoints[0];
                                const percent = dp.parsed.y;
                                const ftp = this.ftp || 250;
                                const actual = Math.round((percent / 100) * ftp);
                                hoverPowerBox.innerHTML = `<span>Hovered Power: <b>${percent.toFixed(1)}% FTP</b> = <b>${actual} W</b> (FTP: ${ftp} W)</span>`;
                                hoverPowerBox.style.display = 'block';
                            } else {
                                hoverPowerBox.style.display = 'none';
                            }
                        }
                    }
                },
                onClick: (event, elements, chart) => {
                    // Find the nearest segment to the click
                    const points = chart.getElementsAtEventForMode(event, 'nearest', { intersect: false }, true);
                    if (points && points.length > 0) {
                        const point = points[0];
                        const clickedX = point.element.parsed.x;
                        // Find which segment this x belongs to
                        let foundIndex = null;
                        for (let i = 0; i < allSegments.length; i++) {
                            const seg = allSegments[i];
                            if (clickedX >= seg.startTime && clickedX <= seg.startTime + seg.duration) {
                                foundIndex = i;
                                break;
                            }
                        }
                        if (foundIndex !== null) {
                            this.selectedSegmentIndex = foundIndex;
                            this.createChart(); // re-render to highlight
                        }
                    } else {
                        // Clicked outside any segment, deselect
                        this.selectedSegmentIndex = null;
                        this.createChart();
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
            segmentDiv.className = 'segment segment-item';
            
            let powerText = '';
            if (segment.power !== undefined) {
                powerText = `${segment.power}% FTP`;
            } else if (segment.powerLow !== undefined && segment.powerHigh !== undefined) {
                powerText = `${segment.powerLow}% - ${segment.powerHigh}% FTP`;
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
        
        // Setup segment editing after segments are displayed
        setTimeout(() => this.setupSegmentEditing(), 100);
    }

    calculateTSS(workout) {
        // Calculate Training Stress Score (TSS) for the workout
        // TSS = (duration_in_seconds * NP * IF) / (FTP * 3600) * 100
        // Where NP = Normalized Power, IF = Intensity Factor (NP/FTP)
        // For workout files, we'll use a simplified approach based on planned power zones
        
        if (!workout.segments || workout.segments.length === 0 || workout.totalDuration === 0) {
            return 0;
        }

        // Flatten all segments
        const allSegments = [];
        workout.segments.forEach(segment => {
            if (Array.isArray(segment)) {
                allSegments.push(...segment);
            } else {
                allSegments.push(segment);
            }
        });

        // Calculate weighted power for TSS computation
        let totalWeightedPower = 0;
        let totalDuration = 0;

        allSegments.forEach(segment => {
            if (segment.duration > 0) {
                let segmentPower;
                
                // Calculate average power for the segment
                if (segment.power !== undefined) {
                    // Steady state power
                    segmentPower = segment.power;
                } else if (segment.powerLow !== undefined && segment.powerHigh !== undefined) {
                    // For ramps (warmup/cooldown), use average power
                    segmentPower = (segment.powerLow + segment.powerHigh) / 2;
                } else {
                    // Default fallback
                    segmentPower = 0.6;
                }

                // Weight the power by duration and apply 4th power for TSS calculation
                // This approximates the Normalized Power calculation
                const weightedPower = Math.pow(segmentPower, 4) * segment.duration;
                totalWeightedPower += weightedPower;
                totalDuration += segment.duration;
            }
        });

        if (totalDuration === 0) {
            return 0;
        }

        // Calculate Normalized Power (4th root of weighted average of 4th powers)
        const normalizedPower = Math.pow(totalWeightedPower / totalDuration, 0.25);
        
        // Calculate Intensity Factor (IF = NP / FTP, where FTP = 1.0 in our scale)
        const intensityFactor = normalizedPower / 1.0;
        
        // Calculate TSS
        const tss = (totalDuration * normalizedPower * intensityFactor) / (1.0 * 3600) * 100;
        
        return Math.round(tss);
    }

    updateFTP(newFTP) {
        this.ftp = newFTP;
        // Update display if workout is loaded
        if (this.workoutData) {
            this.displayWorkoutInfo();
        }
    }

    exportToERG() {
        if (!this.workoutData) {
            alert('Please load a workout first');
            return;
        }

        const ergContent = this.generateERGContent();
        this.downloadFile(ergContent, `${this.workoutData.name}.erg`, 'text/plain');
    }

    exportToMRC() {
        if (!this.workoutData) {
            alert('Please load a workout first');
            return;
        }

        const mrcContent = this.generateMRCContent();
        this.downloadFile(mrcContent, `${this.workoutData.name}.mrc`, 'text/plain');
    }

    generateERGContent() {
        const header = [
            '[COURSE HEADER]',
            'VERSION=2',
            'UNITS=ENGLISH',
            `DESCRIPTION=${this.workoutData.description}`,
            `FILE NAME=${this.workoutData.name}.erg`,
            `FTP=${this.ftp}`,
            'MINUTES\tWATTS',
            '[END COURSE HEADER]',
            '',
            '[COURSE DATA]'
        ].join('\n');

        const dataPoints = this.generateWorkoutDataPoints('watts');
        const courseData = dataPoints.map(point => 
            `${(point.time / 60).toFixed(2)}\t${Math.round(point.power * this.ftp)}`
        ).join('\n');

        const textCues = this.generateTextCues();
        
        let content = header + '\n' + courseData + '\n[END COURSE DATA]';
        
        if (textCues.length > 0) {
            content += '\n\n[COURSE TEXT]\n' + textCues.join('\n') + '\n[END COURSE TEXT]';
        }

        return content;
    }

    generateMRCContent() {
        const header = [
            '[COURSE HEADER]',
            'VERSION = 2',
            'UNITS = ENGLISH',
            `DESCRIPTION = ${this.workoutData.description}`,
            `FILE NAME = ${this.workoutData.name}.mrc`,
            'MINUTES PERCENT',
            '[END COURSE HEADER]',
            '',
            '[COURSE DATA]'
        ].join('\n');

        const dataPoints = this.generateWorkoutDataPoints('percent');
        const courseData = dataPoints.map(point => 
            `${(point.time / 60).toFixed(2)}\t${Math.round(point.power * 100)}`
        ).join('\n');

        const textCues = this.generateTextCues();
        
        let content = header + '\n' + courseData + '\n[END COURSE DATA]';
        
        if (textCues.length > 0) {
            content += '\n\n[COURSE TEXT]\n' + textCues.join('\n') + '\n[END COURSE TEXT]';
        }

        return content;
    }

    generateWorkoutDataPoints(format) {
        const points = [];
        
        // Flatten all segments
        const allSegments = [];
        this.workoutData.segments.forEach(segment => {
            if (Array.isArray(segment)) {
                allSegments.push(...segment);
            } else {
                allSegments.push(segment);
            }
        });

        // Sort segments by start time
        allSegments.sort((a, b) => a.startTime - b.startTime);

        let currentTime = 0;

        allSegments.forEach(segment => {
            const startTime = segment.startTime;
            const endTime = segment.startTime + segment.duration;

            // Add transition point if there's a gap
            if (currentTime < startTime) {
                points.push({ time: startTime, power: 0.5 }); // Easy spinning
            }

            if (segment.type === 'Warmup' || segment.type === 'Cooldown' || segment.type === 'Ramp') {
                // Add start and end points for ramps
                points.push({ time: startTime, power: segment.powerLow });
                points.push({ time: endTime, power: segment.powerHigh });
            } else {
                // Steady state or intervals
                const power = segment.power || 0.6;
                points.push({ time: startTime, power: power });
                points.push({ time: endTime, power: power });
            }

            currentTime = endTime;
        });

        return points;
    }

    generateTextCues() {
        const textCues = [];
        
        // Flatten all segments and extract text events
        const allSegments = [];
        this.workoutData.segments.forEach(segment => {
            if (Array.isArray(segment)) {
                allSegments.push(...segment);
            } else {
                allSegments.push(segment);
            }
        });

        // Add basic text cues for each segment
        allSegments.forEach(segment => {
            const startTimeSeconds = segment.startTime;
            let message = '';
            
            switch (segment.type) {
                case 'Warmup':
                    message = 'Warmup - gradually increase effort';
                    break;
                case 'Cooldown':
                    message = 'Cooldown - gradually decrease effort';
                    break;
                case 'SteadyState':
                    message = `Steady effort at ${Math.round(segment.power * 100)}% FTP`;
                    break;
                case 'Interval (On)':
                    message = `Interval ON - ${Math.round(segment.power * 100)}% FTP`;
                    break;
                case 'Interval (Off)':
                    message = `Recovery - ${Math.round(segment.power * 100)}% FTP`;
                    break;
                case 'Ramp':
                    message = `Ramp from ${Math.round(segment.powerLow * 100)}% to ${Math.round(segment.powerHigh * 100)}% FTP`;
                    break;
                case 'FreeRide':
                    message = 'Free ride - choose your own effort';
                    break;
            }
            
            if (message) {
                textCues.push(`${startTimeSeconds}\t${message}\t10`);
            }
        });

        return textCues;
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
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

    // Editing functionality methods
    updateScaleValue(value) {
        document.querySelector('.scale-value').textContent = parseFloat(value).toFixed(1);
    }

    applyScaling() {
        if (!this.workoutData) {
            alert('Please load a workout first');
            return;
        }

        const scaleFactor = parseFloat(document.getElementById('scaleSlider').value);
        
        // Apply scaling to segments (excluding warmup and cooldown)
        this.workoutData.segments.forEach(segment => {
            if (this.shouldScaleSegment(segment)) {
                this.scaleSegmentPower(segment, scaleFactor);
            }
        });

        // Regenerate power data and update displays
        this.workoutData.powerData = this.generatePowerData(this.workoutData.segments);
        this.workoutData.tss = this.calculateTSS(this.workoutData.powerData);
        
        this.displayWorkoutInfo();
        this.createChart();
        this.displaySegmentDetails();
    }

    shouldScaleSegment(segment) {
        // Don't scale warmup and cooldown segments
        const type = segment.type.toLowerCase();
        return type !== 'warmup' && type !== 'cooldown';
    }

    scaleSegmentPower(segment, scaleFactor) {
        if (segment.power !== undefined) {
            segment.power = Math.round(segment.power * scaleFactor);
        }
        if (segment.powerLow !== undefined) {
            segment.powerLow = Math.round(segment.powerLow * scaleFactor);
        }
        if (segment.powerHigh !== undefined) {
            segment.powerHigh = Math.round(segment.powerHigh * scaleFactor);
        }
    }

    resetWorkout() {
        if (!this.originalWorkoutData) {
            alert('No original workout data to reset to');
            return;
        }

        // Restore original workout data
        this.workoutData = JSON.parse(JSON.stringify(this.originalWorkoutData));
        
        // Reset scale slider
        document.getElementById('scaleSlider').value = 1.0;
        this.updateScaleValue(1.0);
        
        // Update displays
        this.displayWorkoutInfo();
        this.createChart();
        this.displaySegmentDetails();
    }

    exportModifiedZWO() {
        if (!this.workoutData) {
            alert('Please load a workout first');
            return;
        }

        const zwoContent = this.generateZWOContent();
        const blob = new Blob([zwoContent], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${this.workoutData.name.replace(/[^a-z0-9]/gi, '_')}_modified.zwo`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    generateZWOContent() {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<workout_file>\n';
        xml += `    <author>${this.escapeXml(this.workoutData.author)}</author>\n`;
        xml += `    <name>${this.escapeXml(this.workoutData.name)}</name>\n`;
        xml += `    <description>${this.escapeXml(this.workoutData.description)}</description>\n`;
        xml += `    <sportType>${this.workoutData.sportType}</sportType>\n`;
        xml += '    <workout>\n';

        this.workoutData.segments.forEach(segment => {
            xml += this.generateSegmentXML(segment);
        });

        xml += '    </workout>\n';
        xml += '</workout_file>';
        
        return xml;
    }

    generateSegmentXML(segment) {
        let xml = '';
        const duration = segment.duration;
        
        switch (segment.type.toLowerCase()) {
            case 'warmup':
                xml += `        <Warmup Duration="${duration}" PowerLow="${segment.powerLow / 100}" PowerHigh="${segment.powerHigh / 100}"/>\n`;
                break;
            case 'cooldown':
                xml += `        <Cooldown Duration="${duration}" PowerLow="${segment.powerLow / 100}" PowerHigh="${segment.powerHigh / 100}"/>\n`;
                break;
            case 'steadystate':
                xml += `        <SteadyState Duration="${duration}" Power="${segment.power / 100}"/>\n`;
                break;
            case 'intervals':
                xml += `        <IntervalsT Repeat="${segment.repeat || 1}" OnDuration="${segment.onDuration}" OffDuration="${segment.offDuration}" OnPower="${segment.onPower / 100}" OffPower="${segment.offPower / 100}"/>\n`;
                break;
            case 'ramp':
                xml += `        <Ramp Duration="${duration}" PowerLow="${segment.powerLow / 100}" PowerHigh="${segment.powerHigh / 100}"/>\n`;
                break;
            default:
                xml += `        <SteadyState Duration="${duration}" Power="${(segment.power || 50) / 100}"/>\n`;
        }
        
        return xml;
    }

    escapeXml(text) {
        if (!text) return '';
        return text.toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    setupSegmentEditing() {
        // Add click handlers to segment items for editing
        const segmentItems = document.querySelectorAll('.segment-item');
        segmentItems.forEach((item, index) => {
            item.addEventListener('click', () => {
                this.toggleSegmentEditing(index);
            });
        });
    }

    toggleSegmentEditing(segmentIndex) {
        // Close any currently editing segment
        if (this.currentEditingSegment !== null && this.currentEditingSegment !== segmentIndex) {
            this.closeSegmentEditing(this.currentEditingSegment);
        }

        const segmentItem = document.querySelectorAll('.segment-item')[segmentIndex];
        const isCurrentlyEditing = segmentItem.classList.contains('editing');

        if (isCurrentlyEditing) {
            this.closeSegmentEditing(segmentIndex);
        } else {
            this.openSegmentEditing(segmentIndex);
        }
    }

    openSegmentEditing(segmentIndex) {
        const segment = this.workoutData.segments[segmentIndex];
        const segmentItem = document.querySelectorAll('.segment-item')[segmentIndex];
        
        segmentItem.classList.add('editing');
        this.currentEditingSegment = segmentIndex;

        // Create editing controls
        const editControls = this.createSegmentEditControls(segment, segmentIndex);
        segmentItem.appendChild(editControls);
    }

    closeSegmentEditing(segmentIndex) {
        const segmentItem = document.querySelectorAll('.segment-item')[segmentIndex];
        segmentItem.classList.remove('editing');
        
        const editControls = segmentItem.querySelector('.segment-edit-controls');
        if (editControls) {
            editControls.remove();
        }
        
        if (this.currentEditingSegment === segmentIndex) {
            this.currentEditingSegment = null;
        }
    }

    createSegmentEditControls(segment, segmentIndex) {
        const controls = document.createElement('div');
        controls.className = 'segment-edit-controls active';

        let controlsHTML = '';
        
        if (segment.type.toLowerCase() === 'steadystate') {
            controlsHTML = `
                <div class="power-input-group">
                    <label>Power:</label>
                    <input type="number" id="power-${segmentIndex}" value="${segment.power}" min="0" max="300">
                    <span>% FTP</span>
                </div>
            `;
        } else if (segment.type.toLowerCase() === 'warmup' || segment.type.toLowerCase() === 'cooldown' || segment.type.toLowerCase() === 'ramp') {
            controlsHTML = `
                <div class="power-input-group">
                    <label>Power Low:</label>
                    <input type="number" id="powerLow-${segmentIndex}" value="${segment.powerLow}" min="0" max="300">
                    <span>% FTP</span>
                </div>
                <div class="power-input-group">
                    <label>Power High:</label>
                    <input type="number" id="powerHigh-${segmentIndex}" value="${segment.powerHigh}" min="0" max="300">
                    <span>% FTP</span>
                </div>
            `;
        }

        controlsHTML += `
            <div class="segment-edit-buttons">
                <button class="apply-btn" onclick="visualizer.applySegmentEdit(${segmentIndex})">Apply</button>
                <button class="cancel-btn" onclick="visualizer.closeSegmentEditing(${segmentIndex})">Cancel</button>
            </div>
        `;

        controls.innerHTML = controlsHTML;
        return controls;
    }

    applySegmentEdit(segmentIndex) {
        const segment = this.workoutData.segments[segmentIndex];
        
        if (segment.type.toLowerCase() === 'steadystate') {
            const powerInput = document.getElementById(`power-${segmentIndex}`);
            if (powerInput) {
                segment.power = parseInt(powerInput.value) || segment.power;
            }
        } else if (segment.type.toLowerCase() === 'warmup' || segment.type.toLowerCase() === 'cooldown' || segment.type.toLowerCase() === 'ramp') {
            const powerLowInput = document.getElementById(`powerLow-${segmentIndex}`);
            const powerHighInput = document.getElementById(`powerHigh-${segmentIndex}`);
            
            if (powerLowInput) {
                segment.powerLow = parseInt(powerLowInput.value) || segment.powerLow;
            }
            if (powerHighInput) {
                segment.powerHigh = parseInt(powerHighInput.value) || segment.powerHigh;
            }
        }

        // Regenerate power data and update displays
        this.workoutData.powerData = this.generatePowerData(this.workoutData.segments);
        this.workoutData.tss = this.calculateTSS(this.workoutData.powerData);
        
        this.displayWorkoutInfo();
        this.createChart();
        this.displaySegmentDetails();
        
        this.closeSegmentEditing(segmentIndex);
    }

    async deployWorkout() {
        if (!this.workoutData) {
            alert('Please load a workout first');
            return;
        }

        const zwoContent = this.generateZWOContent();
        const workoutName = this.workoutData.name.replace(/[^a-z0-9]/gi, '_');

        try {
            const response = await fetch('/deploy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: workoutName,
                    content: zwoContent
                })
            });

            const result = await response.json();
            if (result.success) {
                alert(`Workout successfully deployed to: ${result.path}`);
            } else {
                throw new Error('Deployment failed');
            }
        } catch (error) {
            console.error('Error deploying workout:', error);
            alert('Failed to deploy workout. Please try again.');
        }
    }

    showSegmentEditForm(segmentIndex, segment) {
        const editBox = document.getElementById('segmentEditBox');
        if (!editBox) return;
        let html = `<form id="segmentEditForm">`;
        html += `<div><b>Edit Segment:</b> <span>${segment.type}</span></div><br/>`;
        // Duration
        html += `<div><label for="segEditDuration">Duration (sec):</label><input type="number" id="segEditDuration" value="${segment.duration}" min="1" max="7200"></div>`;
        // Power fields by type
        if (segment.type === 'SteadyState' || segment.type === 'Interval (On)' || segment.type === 'Interval (Off)' || segment.type === 'FreeRide') {
            html += `<div><label for="segEditPower">Power (% FTP):</label><input type="number" id="segEditPower" value="${segment.power}" min="1" max="300"></div>`;
        } else if (segment.type === 'Warmup' || segment.type === 'Cooldown' || segment.type === 'Ramp') {
            html += `<div><label for="segEditPowerLow">Power Low (% FTP):</label><input type="number" id="segEditPowerLow" value="${segment.powerLow}" min="1" max="300"></div>`;
            html += `<div><label for="segEditPowerHigh">Power High (% FTP):</label><input type="number" id="segEditPowerHigh" value="${segment.powerHigh}" min="1" max="300"></div>`;
        }
        html += `<div class="edit-btns">
            <button type="submit" class="apply-btn">Apply</button>
            <button type="button" class="cancel-btn" id="segEditCancel">Cancel</button>
        </div>`;
        html += `</form>`;
        editBox.innerHTML = html;
        editBox.style.display = 'block';

        // Form logic
        const form = document.getElementById('segmentEditForm');
        const cancelBtn = document.getElementById('segEditCancel');
        form.onsubmit = (e) => {
            e.preventDefault();
            // Validate and update segment
            const newDuration = parseInt(document.getElementById('segEditDuration').value) || segment.duration;
            if (newDuration < 1 || newDuration > 7200) return alert('Duration must be 1-7200 seconds');
            segment.duration = newDuration;
            if (segment.type === 'SteadyState' || segment.type === 'Interval (On)' || segment.type === 'Interval (Off)' || segment.type === 'FreeRide') {
                const newPower = parseInt(document.getElementById('segEditPower').value) || segment.power;
                if (newPower < 1 || newPower > 300) return alert('Power must be 1-300% FTP');
                segment.power = newPower;
            } else if (segment.type === 'Warmup' || segment.type === 'Cooldown' || segment.type === 'Ramp') {
                const newPowerLow = parseInt(document.getElementById('segEditPowerLow').value) || segment.powerLow;
                const newPowerHigh = parseInt(document.getElementById('segEditPowerHigh').value) || segment.powerHigh;
                if (newPowerLow < 1 || newPowerLow > 300 || newPowerHigh < 1 || newPowerHigh > 300) return alert('Power must be 1-300% FTP');
                segment.powerLow = newPowerLow;
                segment.powerHigh = newPowerHigh;
            }
            // Regenerate powerData for this segment
            if (segment.type === 'SteadyState' || segment.type === 'Interval (On)' || segment.type === 'Interval (Off)' || segment.type === 'FreeRide') {
                segment.powerData = this.generateSteadyData(segment);
            } else if (segment.type === 'Warmup' || segment.type === 'Cooldown' || segment.type === 'Ramp') {
                segment.powerData = this.generateRampData(segment);
            }
            // Recalculate start times for all segments
            let currentTime = 0;
            const allSegments = [];
            this.workoutData.segments.forEach(seg => {
                if (Array.isArray(seg)) {
                    allSegments.push(...seg);
                } else {
                    allSegments.push(seg);
                }
            });
            for (let i = 0; i < allSegments.length; i++) {
                allSegments[i].startTime = currentTime;
                currentTime += allSegments[i].duration;
            }
            // Update displays
            this.displayWorkoutInfo();
            this.createChart();
            this.displaySegmentDetails();
        };
        cancelBtn.onclick = (e) => {
            this.selectedSegmentIndex = null;
            editBox.style.display = 'none';
            this.createChart();
        };
    }
}

// Initialize the application when the page loads
let visualizer;
document.addEventListener('DOMContentLoaded', () => {
    visualizer = new ZwiftWorkoutVisualizer();
});

// === Chat Interface Logic ===
function appendChatMessage(text, sender) {
    const chatMessages = document.getElementById('chatMessages');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message ' + sender;
    msgDiv.textContent = text;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

document.getElementById('chatForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;
    appendChatMessage(message, 'user');
    input.value = '';
    appendChatMessage('Thinking...', 'llm');
    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        const data = await response.json();
        // Remove the 'Thinking...' message
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.removeChild(chatMessages.lastChild);
        appendChatMessage(data.reply, 'llm');
    } catch (err) {
        // Remove the 'Thinking...' message
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.removeChild(chatMessages.lastChild);
        appendChatMessage('Error: Could not reach LLM backend.', 'llm');
    }
});

// === Directory Panel Logic ===
async function fetchDirectory(path = '') {
    const res = await fetch(`/workouts${path ? '/' + encodeURIComponent(path) : ''}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
}

function createDirectoryItem(item, parentPath = '') {
    const div = document.createElement('div');
    div.className = 'directory-item' + (item.is_dir ? ' folder' : ' file');
    div.textContent = item.name;
    div.dataset.path = item.path;
    if (item.is_dir) {
        div.addEventListener('click', async function(e) {
            e.stopPropagation();
            if (div.classList.contains('expanded')) {
                div.classList.remove('expanded');
                const children = div.querySelectorAll(':scope > .directory-children');
                children.forEach(child => child.remove());
            } else {
                div.classList.add('expanded');
                if (!div.querySelector('.directory-children')) {
                    const childrenDiv = document.createElement('div');
                    childrenDiv.className = 'directory-children';
                    const children = await fetchDirectory(item.path);
                    children.forEach(child => {
                        childrenDiv.appendChild(createDirectoryItem(child, item.path));
                    });
                    div.appendChild(childrenDiv);
                }
            }
        });
    } else if (item.name.toLowerCase().endsWith('.zwo')) {
        div.addEventListener('click', async function(e) {
            e.stopPropagation();
            // Highlight selected
            document.querySelectorAll('.directory-item.selected').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');
            // Fetch and visualize workout
            const res = await fetch(`/workout?file=${encodeURIComponent(item.path)}`);
            if (res.ok) {
                const data = await res.json();
                if (window.visualizer) {
                    window.visualizer.parseAndVisualize(data.content);
                }
            }
        });
    }
    return div;
}

async function renderDirectoryTree() {
    const tree = document.getElementById('directoryTree');
    tree.innerHTML = '';
    const items = await fetchDirectory();
    items.forEach(item => {
        tree.appendChild(createDirectoryItem(item));
    });
}

document.addEventListener('DOMContentLoaded', function() {
    renderDirectoryTree();
});

// === Panel Minimize/Restore Logic ===
document.addEventListener('DOMContentLoaded', function() {
    // Directory panel toggle
    const dirPanel = document.getElementById('directoryPanel');
    const dirToggle = document.getElementById('toggleDirectoryPanel');
    dirToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        dirPanel.classList.toggle('minimized');
        // Change icon
        dirToggle.textContent = dirPanel.classList.contains('minimized') ? '>' : '<';
        // For mobile, also update title
        dirToggle.title = dirPanel.classList.contains('minimized') ? 'Restore' : 'Minimize';
    });

    // Chat panel toggle
    const chatPanel = document.getElementById('chatPanel');
    const chatToggle = document.getElementById('toggleChatPanel');
    chatToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        chatPanel.classList.toggle('minimized');
        // Change icon
        chatToggle.textContent = chatPanel.classList.contains('minimized') ? '<' : '>';
        chatToggle.title = chatPanel.classList.contains('minimized') ? 'Restore' : 'Minimize';
    });
});

// Collapsible workout segments
const segmentDetails = document.getElementById('segmentDetails');
const toggleSegments = document.getElementById('toggleSegments');
if (toggleSegments && segmentDetails) {
    toggleSegments.addEventListener('click', function(e) {
        e.stopPropagation();
        segmentDetails.classList.toggle('collapsed');
        toggleSegments.textContent = segmentDetails.classList.contains('collapsed') ? '+' : '−';
        toggleSegments.title = segmentDetails.classList.contains('collapsed') ? 'Expand' : 'Collapse';
    });
}