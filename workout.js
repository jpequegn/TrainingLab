
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
    
