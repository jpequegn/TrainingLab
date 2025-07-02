
import { parseWorkoutXML } from './parser.js';
import { calculateTSS, formatDuration } from './workout.js';
import { generateERGContent, generateMRCContent, downloadFile, generateZWOContent } from './exporter.js';
import { fetchDirectory, fetchWorkoutFile, deployWorkout, sendChatMessage } from './api.js';

export class UI {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.chart = null;
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

        const allSegments = [];
        workoutData.segments.forEach(segment => {
            if (Array.isArray(segment)) {
                allSegments.push(...segment);
            } else {
                allSegments.push(segment);
            }
        });

        allSegments.sort((a, b) => a.startTime - b.startTime);

        const typeDataMap = {};
        allSegments.forEach(segment => {
            const type = segment.type;
            if (!typeDataMap[type]) typeDataMap[type] = [];
            segment.powerData.forEach(point => typeDataMap[type].push(point));
        });

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
                                const actual = Math.round((percent / 100) * ftp);
                                return `${context.dataset.label}: ${percent.toFixed(1)}% FTP (${actual} W)`;
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
                    }
                },
                onClick: (event, elements, chart) => {
                    const points = chart.getElementsAtEventForMode(event, 'nearest', { intersect: false }, true);
                    if (points && points.length > 0) {
                        const point = points[0];
                        const clickedX = point.element.parsed.x;
                        let foundIndex = null;
                        for (let i = 0; i < allSegments.length; i++) {
                            const seg = allSegments[i];
                            if (clickedX >= seg.startTime && clickedX <= seg.startTime + seg.duration) {
                                foundIndex = i;
                                break;
                            }
                        }
                        if (foundIndex !== null) {
                            onSegmentClick(foundIndex);
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
                        max: Math.max(120, Math.max(...datasets.flatMap(d => d.data.map(p => p.y))) + 10)
                    }
                }
            }
        });

        document.querySelector('.chart-container').style.display = 'block';
    }

    displaySegmentDetails(workoutData) {
        const segmentList = document.getElementById('segmentList');
        segmentList.innerHTML = '';

        const allSegments = [];
        workoutData.segments.forEach(segment => {
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
        if (chatToggle) {
            chatToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                chatPanel.classList.toggle('minimized');
                chatToggle.textContent = chatPanel.classList.contains('minimized') ? '<' : '>';
                chatToggle.title = chatPanel.classList.contains('minimized') ? 'Restore' : 'Minimize';
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
                this.appendChatMessage('Thinking...', 'llm');
                try {
                    const reply = await sendChatMessage(message);
                    this.removeLastChatMessage();
                    this.appendChatMessage(reply, 'llm');
                } catch (_err) {
                    this.removeLastChatMessage();
                    this.appendChatMessage('Error: Could not reach LLM backend.', 'llm');
                }
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
}
