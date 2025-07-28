
export function calculateTSS(workout) {
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

export function formatDuration(seconds) {
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

/**
 * Calculate Normalized Power using proper 30-second rolling window method
 * This follows the industry standard algorithm for more accurate training metrics
 */
export function calculateNormalizedPower(powerData) {
    if (!powerData || powerData.length < 30) {
        // Fallback to simple average for short workouts
        const avgPower = powerData.reduce((sum, p) => sum + p, 0) / powerData.length;
        return avgPower;
    }

    const rollingWindow = 30; // 30-second window
    const rollingAverages = [];

    // Calculate 30-second rolling averages
    for (let i = 0; i <= powerData.length - rollingWindow; i++) {
        const window = powerData.slice(i, i + rollingWindow);
        const windowAverage = window.reduce((sum, p) => sum + p, 0) / window.length;
        rollingAverages.push(windowAverage);
    }

    // Calculate the 4th power of each rolling average
    const fourthPowers = rollingAverages.map(avg => Math.pow(avg, 4));

    // Take the average of all 4th powers
    const avgFourthPower = fourthPowers.reduce((sum, p) => sum + p, 0) / fourthPowers.length;

    // Take the 4th root to get Normalized Power
    return Math.pow(avgFourthPower, 0.25);
}

/**
 * Create high-resolution power data array from workout segments
 * This generates 1-second resolution data for accurate NP calculation
 */
export function createPowerDataArray(workout) {
    const powerData = [];
    
    // Flatten all segments
    const allSegments = [];
    workout.segments.forEach(segment => {
        if (Array.isArray(segment)) {
            allSegments.push(...segment);
        } else {
            allSegments.push(segment);
        }
    });

    // Sort segments by start time
    allSegments.sort((a, b) => a.startTime - b.startTime);

    // Generate 1-second resolution power data
    allSegments.forEach(segment => {
        for (let i = 0; i < segment.duration; i++) {
            let power;
            if (segment.power !== undefined) {
                power = segment.power * 100; // Convert to watts (assuming FTP = 100%)
            } else if (segment.powerLow !== undefined && segment.powerHigh !== undefined) {
                // For ramps, interpolate power over time
                const progress = i / (segment.duration - 1);
                power = (segment.powerLow + (segment.powerHigh - segment.powerLow) * progress) * 100;
            } else {
                power = 60; // Default fallback
            }
            powerData.push(power);
        }
    });

    return powerData;
}

export function calculateWorkoutMetrics(workout) {
    if (!workout.segments || workout.segments.length === 0) {
        return {
            avgPower: 0,
            normalizedPower: 0,
            intensityFactor: 0,
            timeInZones: {},
            maxPower: 0,
            minPower: 0,
            variabilityIndex: 0
        };
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

    // Create high-resolution power data for accurate NP calculation
    const powerData = createPowerDataArray(workout);

    // Calculate power metrics
    let totalPowerSum = 0;
    let totalDuration = 0;
    let maxPower = 0;
    let minPower = Infinity;

    // Power zones based on FTP percentage
    const powerZones = {
        'Zone 1': { min: 0, max: 55, time: 0 },
        'Zone 2': { min: 56, max: 75, time: 0 },
        'Zone 3': { min: 76, max: 90, time: 0 },
        'Zone 4': { min: 91, max: 105, time: 0 },
        'Zone 5': { min: 106, max: 120, time: 0 },
        'Zone 6': { min: 121, max: 150, time: 0 },
        'Zone 7': { min: 151, max: 999, time: 0 }
    };

    allSegments.forEach(segment => {
        if (segment.duration > 0) {
            let segmentPower;
            
            // Calculate power for the segment
            if (segment.power !== undefined) {
                segmentPower = segment.power;
            } else if (segment.powerLow !== undefined && segment.powerHigh !== undefined) {
                segmentPower = (segment.powerLow + segment.powerHigh) / 2;
            } else {
                segmentPower = 0.6; // Default fallback
            }

            const powerPercent = segmentPower * 100;
            
            // Update min/max power
            maxPower = Math.max(maxPower, powerPercent);
            if (powerPercent > 0) {
                minPower = Math.min(minPower, powerPercent);
            }

            // Accumulate for average power calculation
            totalPowerSum += powerPercent * segment.duration;
            totalDuration += segment.duration;

            // Calculate time in zones
            for (const [zoneName, zone] of Object.entries(powerZones)) {
                if (powerPercent >= zone.min && powerPercent <= zone.max) {
                    zone.time += segment.duration;
                    break;
                }
            }
        }
    });

    if (totalDuration === 0) {
        return {
            avgPower: 0,
            normalizedPower: 0,
            intensityFactor: 0,
            timeInZones: powerZones,
            maxPower: 0,
            minPower: 0,
            variabilityIndex: 0
        };
    }

    // Calculate metrics using enhanced algorithms
    const avgPower = totalPowerSum / totalDuration;
    
    // Use the new 30-second rolling window Normalized Power calculation
    const normalizedPower = calculateNormalizedPower(powerData);
    
    const intensityFactor = normalizedPower / 100; // Since 100% = FTP
    const variabilityIndex = normalizedPower / avgPower;

    // Convert time in zones to percentages
    const timeInZonesPercent = {};
    for (const [zoneName, zone] of Object.entries(powerZones)) {
        timeInZonesPercent[zoneName] = {
            ...zone,
            percentage: (zone.time / totalDuration) * 100
        };
    }

    const metrics = {
        avgPower: Math.round(avgPower),
        normalizedPower: Math.round(normalizedPower),
        intensityFactor: Math.round(intensityFactor * 100) / 100,
        timeInZones: timeInZonesPercent,
        maxPower: Math.round(maxPower),
        minPower: minPower === Infinity ? 0 : Math.round(minPower),
        variabilityIndex: Math.round(variabilityIndex * 100) / 100
    };

    // Calculate Workout Difficulty Score
    const difficultyScore = calculateWorkoutDifficultyScore(workout, metrics);
    metrics.difficultyScore = difficultyScore;

    return metrics;
}

export function calculatePowerCurve(workout, durations = [5, 10, 15, 20, 30, 60, 300, 600, 1200, 3600]) {
    if (!workout.segments || workout.segments.length === 0) {
        return {};
    }

    // Create a continuous power data array with 1-second resolution
    const powerData = [];
    let currentTime = 0;

    const allSegments = [];
    workout.segments.forEach(segment => {
        if (Array.isArray(segment)) {
            allSegments.push(...segment);
        } else {
            allSegments.push(segment);
        }
    });

    // Sort segments by start time
    allSegments.sort((a, b) => a.startTime - b.startTime);

    allSegments.forEach(segment => {
        for (let i = 0; i < segment.duration; i++) {
            let power;
            if (segment.power !== undefined) {
                power = segment.power * 100;
            } else if (segment.powerLow !== undefined && segment.powerHigh !== undefined) {
                // For ramps, interpolate power over time
                const progress = i / segment.duration;
                power = (segment.powerLow + (segment.powerHigh - segment.powerLow) * progress) * 100;
            } else {
                power = 60; // Default
            }
            powerData.push(power);
        }
    });

    // Calculate power curve for specified durations
    const powerCurve = {};
    
    durations.forEach(duration => {
        if (duration <= powerData.length) {
            let maxAvgPower = 0;
            
            // Calculate rolling average for this duration
            for (let i = 0; i <= powerData.length - duration; i++) {
                const slice = powerData.slice(i, i + duration);
                const avgPower = slice.reduce((sum, p) => sum + p, 0) / slice.length;
                maxAvgPower = Math.max(maxAvgPower, avgPower);
            }
            
            powerCurve[duration] = Math.round(maxAvgPower);
        }
    });

    return powerCurve;
}

/**
 * Calculate Workout Difficulty Score based on multiple factors
 * Combines TSS, duration, intensity distribution, and variability for comprehensive difficulty assessment
 */
export function calculateWorkoutDifficultyScore(workout, metrics) {
    if (!workout.segments || workout.segments.length === 0 || !metrics) {
        return {
            score: 0,
            category: 'Recovery',
            factors: {
                tssComponent: 0,
                durationComponent: 0,
                intensityComponent: 0,
                variabilityComponent: 0
            }
        };
    }

    const tss = calculateTSS(workout);
    const duration = workout.totalDuration / 3600; // Convert to hours
    const { intensityFactor, variabilityIndex, timeInZones } = metrics;

    // TSS Component (0-40 points): Base difficulty from training stress
    let tssComponent = 0;
    if (tss <= 50) tssComponent = (tss / 50) * 10;
    else if (tss <= 100) tssComponent = 10 + ((tss - 50) / 50) * 15;
    else if (tss <= 200) tssComponent = 25 + ((tss - 100) / 100) * 15;
    else tssComponent = Math.min(40, 40 + ((tss - 200) / 100) * 5);

    // Duration Component (0-20 points): Longer workouts are more difficult
    let durationComponent = 0;
    if (duration <= 0.5) durationComponent = duration * 8; // Up to 4 points for 30min
    else if (duration <= 1.0) durationComponent = 4 + ((duration - 0.5) * 8); // 4-8 points for 30-60min
    else if (duration <= 2.0) durationComponent = 8 + ((duration - 1.0) * 8); // 8-16 points for 1-2h
    else durationComponent = Math.min(20, 16 + ((duration - 2.0) * 4)); // Up to 20 points for 2h+

    // Intensity Distribution Component (0-25 points): High-intensity zones increase difficulty
    let intensityComponent = 0;
    if (timeInZones) {
        const zone4Time = timeInZones['Zone 4']?.percentage || 0;
        const zone5Time = timeInZones['Zone 5']?.percentage || 0;
        const zone6Time = timeInZones['Zone 6']?.percentage || 0;
        const zone7Time = timeInZones['Zone 7']?.percentage || 0;

        // Weight higher zones more heavily
        intensityComponent = (
            (zone4Time * 0.4) + 
            (zone5Time * 0.8) + 
            (zone6Time * 1.2) + 
            (zone7Time * 1.6)
        ) / 4; // Normalize to 0-25 range
    }

    // Variability Component (0-15 points): Higher variability = more difficult
    let variabilityComponent = 0;
    if (variabilityIndex > 1.0) {
        variabilityComponent = Math.min(15, (variabilityIndex - 1.0) * 15);
    }

    // Calculate total score (0-100)
    const totalScore = tssComponent + durationComponent + intensityComponent + variabilityComponent;

    // Determine difficulty category
    let category = 'Recovery';
    if (totalScore >= 80) category = 'Extreme';
    else if (totalScore >= 65) category = 'Very Hard';
    else if (totalScore >= 50) category = 'Hard';
    else if (totalScore >= 35) category = 'Moderate';
    else if (totalScore >= 20) category = 'Easy';

    return {
        score: Math.round(totalScore),
        category,
        factors: {
            tssComponent: Math.round(tssComponent),
            durationComponent: Math.round(durationComponent),
            intensityComponent: Math.round(intensityComponent),
            variabilityComponent: Math.round(variabilityComponent)
        }
    };
}

export function generateSteadyData(segment) {
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

export function generateRampData(segment) {
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

export class Workout {
    constructor(workoutData, ftp = 250) {
        this.workoutData = workoutData;
        this.originalWorkoutData = JSON.parse(JSON.stringify(workoutData));
        this.ftp = ftp;
        this.undoStack = [];
    }

    updateFTP(newFTP) {
        this.ftp = newFTP;
    }

    applyScaling(scaleFactor) {
        this.undoStack.push(JSON.parse(JSON.stringify(this.workoutData)));

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

        this.recalculatePowerData();
        this.workoutData.tss = calculateTSS(this.workoutData);
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

    reset() {
        this.undoStack.push(JSON.parse(JSON.stringify(this.workoutData)));
        this.workoutData = JSON.parse(JSON.stringify(this.originalWorkoutData));
    }

    applySegmentEdit(segmentIndex, newDuration, newPower, newPowerLow, newPowerHigh) {
        this.undoStack.push(JSON.parse(JSON.stringify(this.workoutData)));

        const allSegments = this.getAllSegments();
        const segment = allSegments[segmentIndex];
        if (!segment) return;

        segment.duration = newDuration;
        if (segment.type === 'SteadyState' || segment.type === 'Interval (On)' || segment.type === 'Interval (Off)' || segment.type === 'FreeRide') {
            segment.power = newPower / 100;
        } else if (segment.type === 'Warmup' || segment.type === 'Cooldown' || segment.type === 'Ramp') {
            segment.powerLow = newPowerLow / 100;
            segment.powerHigh = newPowerHigh / 100;
        }

        this.recalculatePowerData();
        this.recalculateStartTimes();
        this.workoutData.tss = calculateTSS(this.workoutData);
    }

    undoLastEdit() {
        if (this.undoStack.length > 0) {
            this.workoutData = this.undoStack.pop();
        }
    }

    getAllSegments() {
        const allSegments = [];
        this.workoutData.segments.forEach(seg => {
            if (Array.isArray(seg)) {
                allSegments.push(...seg);
            } else {
                allSegments.push(seg);
            }
        });
        return allSegments;
    }

    recalculatePowerData() {
        this.workoutData.segments.forEach(segment => {
            if (Array.isArray(segment)) {
                segment.forEach(interval => {
                    this.updateSegmentPowerData(interval);
                });
            } else {
                this.updateSegmentPowerData(segment);
            }
        });
    }

    updateSegmentPowerData(segment) {
        if (segment.type.includes('Interval') || segment.type === 'SteadyState' || segment.type === 'FreeRide') {
            segment.powerData = generateSteadyData(segment);
        } else if (segment.type === 'Warmup' || segment.type === 'Cooldown' || segment.type === 'Ramp') {
            segment.powerData = generateRampData(segment);
        }
    }

    recalculateStartTimes() {
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
        this.workoutData.totalDuration = currentTime;
    }
}
    
