
import { parseWorkoutXML } from './parser.js';
import { calculateTSS, formatDuration } from './workout.js';
import { generateERGContent, generateMRCContent, downloadFile, generateZWOContent } from './exporter.js';
import { fetchDirectory, fetchWorkoutFile, deployWorkout, sendChatMessage, getZwiftWorkoutDirectory, saveAsWorkout, selectFolder } from './api.js';
import { WorkoutGenerator } from './workout-generator.js';

export class UI {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.chart = null;
        this.workoutGenerator = new WorkoutGenerator();
        this.initializeEventListeners();
        this.setupUndoButton();
        this.renderDirectoryTree();
        this.setupPanelToggles();
        this.setupSegmentToggle();
        this.setupChatInterface();
    }

    initializeEventListeners() {
        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.visualizer.handleFileUpload(e);
        });

        document.getElementById('loadSample').addEventListener('click', () => {
            this.visualizer.loadSampleWorkout();
        });

        document.getElementById('exportERG').addEventListener('click', () => {
            this.visualizer.exportToERG();
        });

        document.getElementById('exportMRC').addEventListener('click', () => {
            this.visualizer.exportToMRC();
        });

        document.getElementById('ftpInput').addEventListener('input', (e) => {
            this.visualizer.updateFTP(parseInt(e.target.value) || 250);
        });

        document.getElementById('scaleSlider').addEventListener('input', (e) => {
            this.updateScaleValue(e.target.value);
        });

        document.getElementById('applyScale').addEventListener('click', () => {
            this.visualizer.applyScaling();
        });

        document.getElementById('resetWorkout').addEventListener('click', () => {
            this.visualizer.resetWorkout();
        });

        document.getElementById('exportModified').addEventListener('click', () => {
            this.visualizer.exportModifiedZWO();
        });

        document.getElementById('deployWorkout').addEventListener('click', () => {
            this.visualizer.deployWorkout();
        });

        document.getElementById('saveAsWorkout').addEventListener('click', () => {
            this.showSaveAsDialog();
        });
    }

    setupUndoButton() {
        const undoBtn = document.getElementById('undoEditBtn');
        if (!undoBtn) return;
        undoBtn.onclick = () => {
            this.visualizer.undoLastEdit();
        };
        this.updateUndoButton(0);
    }

    updateUndoButton(stackLength) {
        const undoBtn = document.getElementById('undoEditBtn');
        if (!undoBtn) return;
        undoBtn.style.display = stackLength > 0 ? 'block' : 'none';
    }

    showToast(msg) {
        let toast = document.getElementById('toastNotification');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toastNotification';
            toast.className = 'toast-notification';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    }

    displayWorkoutInfo(workoutData, tss) {
        document.getElementById('workoutName').textContent = workoutData.name;
        document.getElementById('workoutDescription').textContent = workoutData.description;
        document.getElementById('workoutAuthor').textContent = workoutData.author;
        document.getElementById('workoutSport').textContent = workoutData.sportType;
        document.getElementById('totalDuration').textContent = formatDuration(workoutData.totalDuration);
        document.getElementById('workoutTSS').textContent = tss;
        
        document.getElementById('workoutInfo').style.display = 'block';
    }

    createPowerZoneAnnotations(ftp) {
        const powerZones = {
            'Zone 1 (Active Recovery)': { min: 0, max: 55, color: '#808080' },
            'Zone 2 (Endurance)': { min: 56, max: 75, color: '#0000FF' },
            'Zone 3 (Tempo)': { min: 76, max: 90, color: '#008000' },
            'Zone 4 (Lactate Threshold)': { min: 91, max: 105, color: '#FFFF00' },
            'Zone 5 (VO2 Max)': { min: 106, max: 120, color: '#FFA500' },
            'Zone 6 (Anaerobic Capacity)': { min: 121, max: 150, color: '#FF0000' },
            'Zone 7 (Neuromuscular Power)': { min: 151, max: 999, color: '#800080' },
        };

        const annotations = {};

        for (const zone in powerZones) {
            const { min, max, color } = powerZones[zone];
            annotations[zone] = {
                type: 'box',
                yMin: min,
                yMax: max,
                backgroundColor: color + '33',
                borderColor: color + '33',
                borderWidth: 1,
                label: {
                    content: zone,
                    enabled: true,
                    position: 'start',
                    color: '#000',
                    font: {
                        size: 10,
                    },
                },
            };
        }

        return annotations;
    }

    createChart(workoutData, ftp, selectedSegmentIndex, onSegmentClick) {
        const ctx = document.getElementById('workoutChart').getContext('2d');
        
        if (this.chart) {
            this.chart.destroy();
        }

        const colors = {
            'Warmup': '#FFA726',
            'Cooldown': '#66BB6A',
            'SteadyState': '#42A5F5',
            'Interval (On)': '#EF5350',
            'Interval (Off)': '#AB47BC',
            'Ramp': '#FF7043',
            'FreeRide': '#78909C'
        };

        const allSegments = this.visualizer.workout.getAllSegments();
        allSegments.sort((a, b) => a.startTime - b.startTime);

        // Create a single continuous dataset for the entire workout
        const continuousWorkoutData = [];
        
        allSegments.forEach(segment => {
            segment.powerData.forEach((point, index) => {
                continuousWorkoutData.push({
                    x: point.x,
                    y: point.y,
                    segmentType: segment.type,
                    segmentIndex: allSegments.indexOf(segment)
                });
            });
        });
        
        // Sort by time to ensure continuity
        continuousWorkoutData.sort((a, b) => a.x - b.x);

        // Create the main workout profile dataset
        const datasets = [{
            label: 'Workout Profile',
            data: continuousWorkoutData,
            borderColor: '#2563eb', // Primary blue color
            backgroundColor: 'rgba(37, 99, 235, 0.1)', // Light blue fill
            borderWidth: 2,
            fill: 'origin', // Fill to zero baseline
            tension: 0.1,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointBackgroundColor: (context) => {
                // Color points based on segment type
                const point = context.parsed || context.dataPoint;
                if (point && continuousWorkoutData[context.dataIndex]) {
                    const segmentType = continuousWorkoutData[context.dataIndex].segmentType;
                    return colors[segmentType] || '#999';
                }
                return '#2563eb';
            },
            segment: {
                borderColor: (context) => {
                    // Color line segments based on workout segment type
                    const point = context.p1DataIndex;
                    if (point !== undefined && continuousWorkoutData[point]) {
                        const segmentType = continuousWorkoutData[point].segmentType;
                        return colors[segmentType] || '#2563eb';
                    }
                    return '#2563eb';
                }
            }
        }];

        if (selectedSegmentIndex !== null && allSegments[selectedSegmentIndex]) {
            const seg = allSegments[selectedSegmentIndex];
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
            this.showSegmentEditForm(selectedSegmentIndex, seg);
        } else {
            const editBox = document.getElementById('segmentEditBox');
            if (editBox) editBox.style.display = 'none';
        }

        const hoverPowerBox = document.getElementById('hoverPowerBox');
        if (hoverPowerBox) hoverPowerBox.style.display = 'none';

        const annotations = this.createPowerZoneAnnotations(ftp);

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
                        position: 'top',
                        labels: {
                            generateLabels: (chart) => {
                                // Create custom legend showing segment types
                                const segmentTypes = [...new Set(continuousWorkoutData.map(point => point.segmentType))];
                                return segmentTypes.map(type => ({
                                    text: type,
                                    fillStyle: colors[type] || '#999',
                                    strokeStyle: colors[type] || '#999',
                                    lineWidth: 2,
                                    hidden: false
                                }));
                            }
                        }
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
                                const actual = Math.round((percent / 100) * ftp);
                                const dataIndex = context.dataIndex;
                                const segmentType = continuousWorkoutData[dataIndex]?.segmentType || 'Unknown';
                                return `${segmentType}: ${percent.toFixed(1)}% FTP (${actual} W)`;
                            }
                        },
                        external: (context) => {
                            const tooltip = context.tooltip;
                            if (!hoverPowerBox) return;
                            if (tooltip && tooltip.opacity > 0 && tooltip.dataPoints && tooltip.dataPoints.length > 0) {
                                const dp = tooltip.dataPoints[0];
                                const percent = dp.parsed.y;
                                const actual = Math.round((percent / 100) * ftp);
                                hoverPowerBox.innerHTML = `<span>Hovered Power: <b>${percent.toFixed(1)}% FTP</b> = <b>${actual} W</b> (FTP: ${ftp} W)</span>`;
                                hoverPowerBox.style.display = 'block';
                            } else {
                                hoverPowerBox.style.display = 'none';
                            }
                        }
                    },
                    annotation: {
                        annotations: annotations,
                    },
                },
                onClick: (event, elements, chart) => {
                    const points = chart.getElementsAtEventForMode(event, 'nearest', { intersect: false }, true);
                    if (points && points.length > 0) {
                        const point = points[0];
                        const dataIndex = point.index;
                        
                        // Get segment index from the clicked data point
                        if (dataIndex !== undefined && continuousWorkoutData[dataIndex]) {
                            const segmentIndex = continuousWorkoutData[dataIndex].segmentIndex;
                            onSegmentClick(segmentIndex);
                        }
                    } else {
                        onSegmentClick(null);
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
                        max: Math.max(120, Math.max(...continuousWorkoutData.map(p => p.y)) + 10),
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)',
                            lineWidth: 1
                        }
                    }
                }
            }
        });

        document.querySelector('.chart-container').style.display = 'block';
    }

    displaySegmentDetails(workoutData) {
        const segmentList = document.getElementById('segmentList');
        segmentList.innerHTML = '';

        const allSegments = this.visualizer.workout.getAllSegments();

        allSegments.forEach((segment, index) => {
            const segmentDiv = document.createElement('div');
            segmentDiv.className = 'segment segment-item';
            
            let powerText = '';
            if (segment.power !== undefined) {
                powerText = `${(segment.power * 100).toFixed(1)}% FTP`;
            } else if (segment.powerLow !== undefined && segment.powerHigh !== undefined) {
                powerText = `${(segment.powerLow * 100).toFixed(1)}% - ${(segment.powerHigh * 100).toFixed(1)}% FTP`;
            }

            segmentDiv.innerHTML = `
                <div class="segment-header">
                    <span class="segment-type">${segment.type}</span>
                    <span class="segment-duration">${formatDuration(segment.duration)}</span>
                </div>
                <div class="segment-power">Power: ${powerText}</div>
            `;
            
            segmentList.appendChild(segmentDiv);
        });

        document.getElementById('segmentDetails').style.display = 'block';
    }

    updateScaleValue(value) {
        document.querySelector('.scale-value').textContent = parseFloat(value).toFixed(1);
    }

    showSegmentEditForm(segmentIndex, segment) {
        const editBox = document.getElementById('segmentEditBox');
        if (!editBox) return;
        let html = '<form id="segmentEditForm">';
        html += `<div><b>Edit Segment:</b> <span>${segment.type}</span></div><br/>`;
        html += `<div><label for="segEditDuration">Duration (sec):</label><input type="number" id="segEditDuration" value="${segment.duration}" min="1" max="7200" required></div>`;
        if (segment.type === 'SteadyState' || segment.type === 'Interval (On)' || segment.type === 'Interval (Off)' || segment.type === 'FreeRide') {
            html += `<div><label for="segEditPower">Power (% FTP):</label><input type="number" id="segEditPower" value="${(segment.power * 100).toFixed(0)}" min="1" max="300" required></div>`;
        } else if (segment.type === 'Warmup' || segment.type === 'Cooldown' || segment.type === 'Ramp') {
            html += `<div><label for="segEditPowerLow">Power Low (% FTP):</label><input type="number" id="segEditPowerLow" value="${(segment.powerLow * 100).toFixed(0)}" min="1" max="300" required></div>`;
            html += `<div><label for="segEditPowerHigh">Power High (% FTP):</label><input type="number" id="segEditPowerHigh" value="${(segment.powerHigh * 100).toFixed(0)}" min="1" max="300" required></div>`;
        }
        html += '<div id="segEditError" style="color:#c62828;font-weight:600;margin:8px 0 0 0;display:none;"></div>';
        html += `<div class="edit-btns">
            <button type="submit" class="apply-btn">Apply</button>
            <button type="button" class="cancel-btn" id="segEditCancel">Cancel</button>
        </div>`;
        html += '</form>';
        editBox.innerHTML = html;
        editBox.style.display = 'block';

        const form = document.getElementById('segmentEditForm');
        const cancelBtn = document.getElementById('segEditCancel');
        const errorDiv = document.getElementById('segEditError');
        
        let lastFocusedInput = null;
        const inputs = ['segEditDuration', 'segEditPower', 'segEditPowerLow', 'segEditPowerHigh'];
        inputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('focus', () => {
                    lastFocusedInput = inputId;
                });
            }
        });

        form.onsubmit = (e) => {
            e.preventDefault();
            errorDiv.style.display = 'none';
            const newDuration = parseInt(document.getElementById('segEditDuration').value);
            if (isNaN(newDuration) || newDuration < 1 || newDuration > 7200) {
                errorDiv.textContent = 'Duration must be between 1 and 7200 seconds.';
                errorDiv.style.display = 'block';
                return;
            }
            
            let newPower, newPowerLow, newPowerHigh;

            if (segment.type === 'SteadyState' || segment.type === 'Interval (On)' || segment.type === 'Interval (Off)' || segment.type === 'FreeRide') {
                newPower = parseInt(document.getElementById('segEditPower').value);
                if (isNaN(newPower) || newPower < 1 || newPower > 300) {
                    errorDiv.textContent = 'Power must be between 1 and 300% FTP.';
                    errorDiv.style.display = 'block';
                    return;
                }
            } else if (segment.type === 'Warmup' || segment.type === 'Cooldown' || segment.type === 'Ramp') {
                newPowerLow = parseInt(document.getElementById('segEditPowerLow').value);
                newPowerHigh = parseInt(document.getElementById('segEditPowerHigh').value);
                if (isNaN(newPowerLow) || isNaN(newPowerHigh) || newPowerLow < 1 || newPowerLow > 300 || newPowerHigh < 1 || newPowerHigh > 300) {
                    errorDiv.textContent = 'Power values must be between 1 and 300% FTP.';
                    errorDiv.style.display = 'block';
                    return;
                }
                if (newPowerLow > newPowerHigh) {
                    errorDiv.textContent = 'Power Low must be less than or equal to Power High.';
                    errorDiv.style.display = 'block';
                    return;
                }
            }
            this.visualizer.applySegmentEdit(segmentIndex, newDuration, newPower, newPowerLow, newPowerHigh);
            
            setTimeout(() => {
                if (lastFocusedInput) {
                    const input = document.getElementById(lastFocusedInput);
                    if (input) {
                        input.focus();
                        input.select();
                    }
                }
            }, 100);
        };
        cancelBtn.onclick = (e) => {
            this.visualizer.setSelectedSegmentIndex(null);
            editBox.style.display = 'none';
            this.visualizer.createChart();
        };
    }

    async renderDirectoryTree() {
        const tree = document.getElementById('directoryTree');
        if (!tree) return; // Ensure the element exists
        tree.innerHTML = '';
        const items = await fetchDirectory();
        items.forEach(item => {
            tree.appendChild(this.createDirectoryItem(item));
        });
    }

    createDirectoryItem(item, parentPath = '') {
        const div = document.createElement('div');
        div.className = 'directory-item' + (item.is_dir ? ' folder' : ' file');
        div.textContent = item.name;
        div.dataset.path = item.path;
        if (item.is_dir) {
            div.addEventListener('click', async (e) => {
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
                            childrenDiv.appendChild(this.createDirectoryItem(child, item.path));
                        });
                        div.appendChild(childrenDiv);
                    }
                }
            });
        } else if (item.name.toLowerCase().endsWith('.zwo')) {
            div.addEventListener('click', async (e) => {
                e.stopPropagation();
                document.querySelectorAll('.directory-item.selected').forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');
                try {
                    const content = await fetchWorkoutFile(item.path);
                    this.visualizer.parseAndVisualize(content);
                } catch (error) {
                    console.error('Error loading workout from directory:', error);
                    this.showToast('Error loading workout.');
                }
            });
        }
        return div;
    }

    setupPanelToggles() {
        const dirPanel = document.getElementById('directoryPanel');
        const dirToggle = document.getElementById('toggleDirectoryPanel');
        if (dirToggle) {
            dirToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                dirPanel.classList.toggle('minimized');
                dirToggle.textContent = dirPanel.classList.contains('minimized') ? '>' : '<';
                dirToggle.title = dirPanel.classList.contains('minimized') ? 'Restore' : 'Minimize';
            });
        }

        const chatPanel = document.getElementById('chatPanel');
        const chatToggle = document.getElementById('toggleChatPanel');
        const container = document.querySelector('.container');
        
        if (chatToggle && chatPanel && container) {
            chatToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                chatPanel.classList.toggle('minimized');
                chatToggle.textContent = chatPanel.classList.contains('minimized') ? '<' : '>';
                chatToggle.title = chatPanel.classList.contains('minimized') ? 'Restore' : 'Minimize';
                
                // Adjust main content margin
                if (chatPanel.classList.contains('minimized')) {
                    container.style.paddingRight = '3rem';
                } else {
                    container.style.paddingRight = '20rem';
                }
            });
        }
    }

    setupSegmentToggle() {
        const segmentDetails = document.getElementById('segmentDetails');
        const toggleSegments = document.getElementById('toggleSegments');
        if (toggleSegments && segmentDetails) {
            toggleSegments.addEventListener('click', (e) => {
                e.stopPropagation();
                segmentDetails.classList.toggle('collapsed');
                toggleSegments.textContent = segmentDetails.classList.contains('collapsed') ? '+' : '−';
                toggleSegments.title = segmentDetails.classList.contains('collapsed') ? 'Expand' : 'Collapse';
            });
        }
    }

    setupChatInterface() {
        const chatForm = document.getElementById('chatForm');
        if (chatForm) {
            chatForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const input = document.getElementById('chatInput');
                const message = input.value.trim();
                if (!message) return;
                
                this.appendChatMessage(message, 'user');
                input.value = '';
                
                // Show thinking message
                const thinkingMsg = this.appendChatMessage('🤔 Creating your workout...', 'llm thinking');
                
                // Generate workout locally
                setTimeout(() => {
                    try {
                        const workoutData = this.workoutGenerator.generateWorkout(message);
                        this.removeLastChatMessage(); // Remove thinking message
                        
                        // Create workout from generated data
                        this.visualizer.createWorkoutFromData(workoutData);
                        
                        // Show success message
                        const duration = Math.round(workoutData.totalDuration / 60);
                        const successMsg = `✅ Created "${workoutData.name}" - ${duration} minutes, TSS: ${workoutData.tss}`;
                        this.appendChatMessage(successMsg, 'llm');
                        
                    } catch (error) {
                        this.removeLastChatMessage();
                        console.error('Error generating workout:', error);
                        this.appendChatMessage('❌ Sorry, I had trouble understanding your request. Try describing your workout like: "Create a 45-minute endurance ride" or "4x5 minute threshold intervals".', 'llm');
                    }
                }, 500); // Small delay to show thinking state
            });
        }
    }

    appendChatMessage(text, sender) {
        const chatMessages = document.getElementById('chatMessages');
        const msgDiv = document.createElement('div');
        msgDiv.className = 'chat-message ' + sender;
        msgDiv.textContent = text;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    removeLastChatMessage() {
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages.lastChild) {
            chatMessages.removeChild(chatMessages.lastChild);
        }
    }

    async showSaveAsDialog() {
        if (!this.visualizer.workout) {
            this.showToast('Please load a workout first');
            return;
        }

        try {
            // Get the default Zwift directory
            const zwiftDirectory = await getZwiftWorkoutDirectory();
            
            // Create and show the save dialog
            const dialog = this.createSaveAsDialog(zwiftDirectory);
            document.body.appendChild(dialog);
        } catch (error) {
            console.error('Error showing save dialog:', error);
            this.showToast('Error opening save dialog');
        }
    }

    createSaveAsDialog(defaultDirectory) {
        const dialog = document.createElement('div');
        dialog.id = 'saveAsDialog';
        dialog.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
        
        const workoutName = this.visualizer.workout.workoutData.name || 'Custom Workout';
        const sanitizedName = workoutName.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '_');
        
        dialog.innerHTML = `
            <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
                <div class="flex items-center mb-4">
                    <svg class="w-6 h-6 text-emerald-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12"></path>
                    </svg>
                    <h3 class="text-xl font-semibold text-gray-800">Save Workout As</h3>
                </div>
                
                <div class="space-y-4">
                    <div>
                        <label for="saveAsFilename" class="block text-sm font-medium text-gray-700 mb-2">
                            Filename:
                        </label>
                        <input 
                            type="text" 
                            id="saveAsFilename" 
                            value="${sanitizedName}"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder="Enter filename (without .zwo)"
                        />
                        <p class="text-xs text-gray-500 mt-1">.zwo extension will be added automatically</p>
                    </div>
                    
                    <div>
                        <label for="saveAsDirectory" class="block text-sm font-medium text-gray-700 mb-2">
                            Save Location:
                        </label>
                        <div class="flex gap-2">
                            <input 
                                type="text" 
                                id="saveAsDirectory" 
                                value="${defaultDirectory || ''}"
                                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                placeholder="Choose directory path"
                            />
                            <button 
                                type="button"
                                id="browseFolder" 
                                class="px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-gray-700 font-medium transition-all duration-200 flex items-center"
                            >
                                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z"></path>
                                </svg>
                                Browse...
                            </button>
                        </div>
                        <p class="text-xs text-gray-500 mt-1">Click "Browse..." to select a folder or use the default Zwift workout directory</p>
                    </div>
                    
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div class="flex items-center">
                            <svg class="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <span class="text-xs text-blue-800">File will be saved as: <strong id="previewFilename">${sanitizedName}.zwo</strong></span>
                        </div>
                    </div>
                </div>
                
                <div class="flex gap-3 mt-6">
                    <button 
                        id="saveAsCancel" 
                        class="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium rounded-lg transition-all duration-200"
                    >
                        Cancel
                    </button>
                    <button 
                        id="saveAsConfirm" 
                        class="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-all duration-200"
                    >
                        Save Workout
                    </button>
                </div>
            </div>
        `;

        // Add event listeners
        const filenameInput = dialog.querySelector('#saveAsFilename');
        const previewFilename = dialog.querySelector('#previewFilename');
        
        filenameInput.addEventListener('input', (e) => {
            const sanitized = e.target.value.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '_');
            previewFilename.textContent = `${sanitized}.zwo`;
        });

        dialog.querySelector('#saveAsCancel').addEventListener('click', () => {
            document.body.removeChild(dialog);
        });

        dialog.querySelector('#saveAsConfirm').addEventListener('click', () => {
            this.handleSaveAsConfirm(dialog);
        });

        dialog.querySelector('#browseFolder').addEventListener('click', () => {
            this.handleBrowseFolder(dialog);
        });

        // Close on background click
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                document.body.removeChild(dialog);
            }
        });

        return dialog;
    }

    async handleBrowseFolder(dialog) {
        try {
            const browseBtn = dialog.querySelector('#browseFolder');
            const directoryInput = dialog.querySelector('#saveAsDirectory');
            
            // Show loading state
            const originalText = browseBtn.innerHTML;
            browseBtn.innerHTML = `
                <svg class="w-4 h-4 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Loading...
            `;
            browseBtn.disabled = true;

            // Request folder selection from backend
            const selectedFolder = await selectFolder();
            
            // Restore button state
            browseBtn.innerHTML = originalText;
            browseBtn.disabled = false;
            
            if (selectedFolder) {
                directoryInput.value = selectedFolder;
                this.showToast('Folder selected successfully');
            }
        } catch (error) {
            console.error('Error browsing folders:', error);
            this.showToast('Error opening folder dialog');
            
            // Restore button state
            const browseBtn = dialog.querySelector('#browseFolder');
            if (browseBtn) {
                browseBtn.innerHTML = `
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z"></path>
                    </svg>
                    Browse...
                `;
                browseBtn.disabled = false;
            }
        }
    }

    async handleSaveAsConfirm(dialog) {
        const filename = dialog.querySelector('#saveAsFilename').value.trim();
        const directory = dialog.querySelector('#saveAsDirectory').value.trim();

        if (!filename) {
            this.showToast('Please enter a filename');
            return;
        }

        // Sanitize filename
        const sanitizedFilename = filename.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '_');
        const fullFilename = sanitizedFilename.endsWith('.zwo') ? sanitizedFilename : `${sanitizedFilename}.zwo`;

        try {
            // Show loading state
            const confirmBtn = dialog.querySelector('#saveAsConfirm');
            const originalText = confirmBtn.textContent;
            confirmBtn.textContent = 'Saving...';
            confirmBtn.disabled = true;

            // Generate ZWO content
            const zwoContent = generateZWOContent(this.visualizer.workout.workoutData);
            
            // Save the file
            const savedPath = await saveAsWorkout(fullFilename, zwoContent, directory);
            
            // Close dialog and show success message
            document.body.removeChild(dialog);
            this.showToast(`Workout saved successfully to: ${savedPath}`);
            
        } catch (error) {
            console.error('Error saving workout:', error);
            this.showToast(`Error saving workout: ${error.message}`);
            
            // Restore button state
            const confirmBtn = dialog.querySelector('#saveAsConfirm');
            if (confirmBtn) {
                confirmBtn.textContent = 'Save Workout';
                confirmBtn.disabled = false;
            }
        }
    }
}
