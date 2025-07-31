/**
 * Chart Utilities Module
 * Lazy-loaded chart functionality
 */

export class ChartUtils {
    constructor() {
        this.chartInstances = new Map();
        this.defaultOptions = this.getDefaultChartOptions();
    }

    /**
     * Create workout chart
     */
    async createWorkoutChart(canvasId, workoutData, options = {}) {
        if (!window.Chart) {
            throw new Error('Chart.js not loaded');
        }

        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            throw new Error(`Canvas element not found: ${canvasId}`);
        }

        const ctx = canvas.getContext('2d');
        const chartData = this.prepareChartData(workoutData);
        const chartOptions = { ...this.defaultOptions, ...options };

        const chart = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: chartOptions
        });

        this.chartInstances.set(canvasId, chart);
        return chart;
    }

    /**
     * Prepare chart data from workout
     */
    prepareChartData(workoutData) {
        const segments = workoutData.segments || [];
        const labels = [];
        const powerData = [];
        const cadenceData = [];
        let cumulativeTime = 0;

        segments.forEach((segment, index) => {
            const duration = segment.duration || 60;
            const power = segment.power || 0;
            const cadence = segment.cadence || 90;

            // Add start point
            labels.push(this.formatTime(cumulativeTime));
            powerData.push(power);
            cadenceData.push(cadence);

            cumulativeTime += duration;

            // Add end point
            labels.push(this.formatTime(cumulativeTime));
            powerData.push(power);
            cadenceData.push(cadence);
        });

        return {
            labels,
            datasets: [
                {
                    label: 'Power (%FTP)',
                    data: powerData,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0,
                    pointRadius: 0,
                    pointHoverRadius: 6
                },
                {
                    label: 'Cadence (RPM)',
                    data: cadenceData,
                    borderColor: 'rgb(16, 185, 129)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 1,
                    fill: false,
                    tension: 0,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    yAxisID: 'y1'
                }
            ]
        };
    }

    /**
     * Get default chart options
     */
    getDefaultChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Workout Power Profile'
                },
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        title: (context) => {
                            return `Time: ${context[0].label}`;
                        },
                        label: (context) => {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            
                            if (label.includes('Power')) {
                                return `${label}: ${Math.round(value)}%`;
                            } else if (label.includes('Cadence')) {
                                return `${label}: ${Math.round(value)} RPM`;
                            }
                            
                            return `${label}: ${value}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Time'
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Power (%FTP)'
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    min: 0,
                    max: 150
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Cadence (RPM)'
                    },
                    grid: {
                        drawOnChartArea: false
                    },
                    min: 60,
                    max: 120
                }
            },
            animation: {
                duration: 750,
                easing: 'easeInOutQuart'
            }
        };
    }

    /**
     * Update chart data
     */
    updateChartData(canvasId, newWorkoutData) {
        const chart = this.chartInstances.get(canvasId);
        if (!chart) {
            throw new Error(`Chart not found: ${canvasId}`);
        }

        const newData = this.prepareChartData(newWorkoutData);
        chart.data = newData;
        
        // Update with animation
        chart.update('active');
        
        return chart;
    }

    /**
     * Add power zone annotations
     */
    addPowerZoneAnnotations(canvasId, zones = []) {
        const chart = this.chartInstances.get(canvasId);
        if (!chart) {
            throw new Error(`Chart not found: ${canvasId}`);
        }

        // Default power zones (% of FTP)
        const defaultZones = [
            { min: 0, max: 55, color: 'rgba(128, 128, 128, 0.2)', label: 'Recovery' },
            { min: 55, max: 75, color: 'rgba(0, 123, 255, 0.2)', label: 'Endurance' },
            { min: 75, max: 90, color: 'rgba(40, 167, 69, 0.2)', label: 'Tempo' },
            { min: 90, max: 105, color: 'rgba(255, 193, 7, 0.2)', label: 'Threshold' },
            { min: 105, max: 120, color: 'rgba(255, 87, 34, 0.2)', label: 'VO2 Max' },
            { min: 120, max: 150, color: 'rgba(244, 67, 54, 0.2)', label: 'Neuromuscular' }
        ];

        const zonesToUse = zones.length > 0 ? zones : defaultZones;

        // Clear existing annotations
        if (chart.options.plugins.annotation) {
            chart.options.plugins.annotation.annotations = {};
        } else {
            chart.options.plugins.annotation = { annotations: {} };
        }

        // Add zone annotations
        zonesToUse.forEach((zone, index) => {
            chart.options.plugins.annotation.annotations[`zone${index}`] = {
                type: 'box',
                yMin: zone.min,
                yMax: zone.max,
                backgroundColor: zone.color,
                borderColor: zone.color.replace('0.2', '0.5'),
                borderWidth: 1,
                label: {
                    display: true,
                    content: zone.label,
                    position: 'start'
                }
            };
        });

        chart.update();
        return chart;
    }

    /**
     * Highlight workout segment
     */
    highlightSegment(canvasId, segmentIndex) {
        const chart = this.chartInstances.get(canvasId);
        if (!chart) return;

        // Remove existing highlight
        if (chart.options.plugins.annotation && chart.options.plugins.annotation.annotations.highlight) {
            delete chart.options.plugins.annotation.annotations.highlight;
        }

        if (segmentIndex !== null && segmentIndex >= 0) {
            const data = chart.data.datasets[0].data;
            const labels = chart.data.labels;
            
            // Calculate segment boundaries
            const startIndex = segmentIndex * 2;
            const endIndex = startIndex + 1;
            
            if (startIndex < data.length && endIndex < data.length) {
                if (!chart.options.plugins.annotation) {
                    chart.options.plugins.annotation = { annotations: {} };
                }
                
                chart.options.plugins.annotation.annotations.highlight = {
                    type: 'box',
                    xMin: labels[startIndex],
                    xMax: labels[endIndex],
                    backgroundColor: 'rgba(255, 255, 0, 0.2)',
                    borderColor: 'rgba(255, 255, 0, 0.8)',
                    borderWidth: 2
                };
            }
        }

        chart.update('none'); // Update without animation for highlighting
    }

    /**
     * Export chart as image
     */
    exportChart(canvasId, filename = 'workout-chart.png') {
        const chart = this.chartInstances.get(canvasId);
        if (!chart) {
            throw new Error(`Chart not found: ${canvasId}`);
        }

        const url = chart.toBase64Image();
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Format time in MM:SS format
     */
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    /**
     * Destroy chart instance
     */
    destroyChart(canvasId) {
        const chart = this.chartInstances.get(canvasId);
        if (chart) {
            chart.destroy();
            this.chartInstances.delete(canvasId);
        }
    }

    /**
     * Get chart instance
     */
    getChart(canvasId) {
        return this.chartInstances.get(canvasId);
    }

    /**
     * Resize chart
     */
    resizeChart(canvasId) {
        const chart = this.chartInstances.get(canvasId);
        if (chart) {
            chart.resize();
        }
    }

    /**
     * Update chart theme
     */
    updateChartTheme(canvasId, isDark = false) {
        const chart = this.chartInstances.get(canvasId);
        if (!chart) return;

        const textColor = isDark ? '#ffffff' : '#374151';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

        // Update scales colors
        chart.options.scales.x.title.color = textColor;
        chart.options.scales.x.ticks.color = textColor;
        chart.options.scales.x.grid.color = gridColor;

        chart.options.scales.y.title.color = textColor;
        chart.options.scales.y.ticks.color = textColor;
        chart.options.scales.y.grid.color = gridColor;

        chart.options.scales.y1.title.color = textColor;
        chart.options.scales.y1.ticks.color = textColor;

        // Update legend
        chart.options.plugins.legend.labels.color = textColor;
        chart.options.plugins.title.color = textColor;

        chart.update();
    }
}

// Export utilities
export const chartUtils = new ChartUtils();

// Convenience functions
export const createWorkoutChart = (canvasId, workoutData, options) => 
    chartUtils.createWorkoutChart(canvasId, workoutData, options);

export const updateChartData = (canvasId, newWorkoutData) => 
    chartUtils.updateChartData(canvasId, newWorkoutData);

export const highlightSegment = (canvasId, segmentIndex) => 
    chartUtils.highlightSegment(canvasId, segmentIndex);

export const addPowerZones = (canvasId, zones) => 
    chartUtils.addPowerZoneAnnotations(canvasId, zones);