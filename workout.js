
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
