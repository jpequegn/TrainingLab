// Workout Generation Module
// Converts natural language descriptions into structured Zwift workout data

export class WorkoutGenerator {
    constructor() {
        this.intensityMap = {
            'recovery': { min: 0.35, max: 0.55 },
            'easy': { min: 0.56, max: 0.75 },
            'endurance': { min: 0.56, max: 0.75 },
            'tempo': { min: 0.76, max: 0.90 },
            'threshold': { min: 0.91, max: 1.05 },
            'sweetspot': { min: 0.84, max: 0.97 },
            'vo2max': { min: 1.06, max: 1.20 },
            'vo2': { min: 1.06, max: 1.20 },
            'anaerobic': { min: 1.21, max: 1.50 },
            'neuromuscular': { min: 1.51, max: 3.00 },
            'sprint': { min: 1.51, max: 3.00 }
        };
        
        this.workoutTypes = {
            'endurance': this.createEnduranceWorkout.bind(this),
            'interval': this.createIntervalWorkout.bind(this),
            'recovery': this.createRecoveryWorkout.bind(this),
            'tempo': this.createTempoWorkout.bind(this),
            'threshold': this.createThresholdWorkout.bind(this),
            'vo2max': this.createVo2MaxWorkout.bind(this),
            'sprint': this.createSprintWorkout.bind(this)
        };
    }

    parseWorkoutDescription(description) {
        const parsed = {
            duration: this.extractDuration(description),
            type: this.extractWorkoutType(description),
            intensity: this.extractIntensity(description),
            intervals: this.extractIntervals(description),
            complexIntervals: this.extractComplexIntervals(description),
            zones: this.extractZones(description),
            remainder: this.extractRemainder(description)
        };
        
        return parsed;
    }

    extractDuration(description) {
        // First check for interval patterns and handle specially
        if (/\d+\s*x\s*\d+/i.test(description)) {
            // Look for explicit total duration OUTSIDE of the interval pattern  
            // Match things like "60 minute workout with 4x5 intervals"
            let nonIntervalText = description.replace(/\d+\s*x\s*\d+\s*(?:min|minutes?|sec|seconds?)/gi, '');
            // Also remove common false matches like "VO2max" "vo2max"
            nonIntervalText = nonIntervalText.replace(/vo2max?/gi, '');
            const totalDurationMatch = nonIntervalText.match(/(\d+)\s*(?:hour|hr|h|minute|min|m)(?:s?)\b/i);
            if (totalDurationMatch) {
                const duration = parseInt(totalDurationMatch[1]);
                if (totalDurationMatch[0].match(/hour|hr|h/i)) {
                    return duration * 60;
                }
                return duration;
            }
            
            // For intervals without explicit total, use intelligent defaults based on type
            const workoutType = this.extractWorkoutType(description);
            if (workoutType === 'sprint') return 45; // Short sprint sessions
            if (workoutType === 'vo2max') return 60; // Standard VO2max sessions  
            if (workoutType === 'threshold') return 75; // Longer threshold sessions
            return 60; // Default for intervals
        }
        
        // Match patterns like "45 minutes", "1 hour", "90 min", "45-minute", etc.
        const patterns = [
            /(\d+)\s*(?:hours?|hrs?|h)\b/i,                    // "2 hours", "1 hr", "1h"
            /(\d+)\s*(?:minutes?|mins?|m)\b/i,                 // "45 minutes", "30 min", "45m"
            /(\d+)[-\s](?:minute|min)\b/i,                     // "45-minute", "30-min"
            /(\d+)\s*(?:h)\s*(\d+)\s*(?:m|minutes?)?/i        // "1h 30m", "1h 30 minutes"
        ];
        
        for (let i = 0; i < patterns.length; i++) {
            const match = description.match(patterns[i]);
            if (match) {
                if (i === 0) { // hours
                    return parseInt(match[1]) * 60;
                } else if (i === 1 || i === 2) { // minutes
                    return parseInt(match[1]);
                } else if (i === 3) { // h m format
                    const hours = parseInt(match[1]);
                    const minutes = parseInt(match[2]) || 0;
                    return hours * 60 + minutes;
                }
            }
        }
        
        // Default duration based on workout type
        const workoutType = this.extractWorkoutType(description);
        if (workoutType === 'sprint') return 45;
        if (workoutType === 'recovery') return 45;
        return 60; // 1 hour default
    }

    extractWorkoutType(description) {
        const lower = description.toLowerCase();
        
        // Direct type matches - order matters for precedence
        const typeKeywords = {
            'sprint': ['sprint', 'neuromuscular', 'anaerobic power'],
            'vo2max': ['vo2max', 'vo2', 'v02', 'aerobic power', 'max aerobic'],
            'threshold': ['threshold', 'lactate threshold', 'sweet spot', 'sweetspot'],
            'tempo': ['tempo', 'sub-threshold', 'subthreshold'],
            'recovery': ['recovery', 'easy', 'active recovery', 'rest'],
            'endurance': ['endurance', 'aerobic', 'base', 'steady', 'zone 2', 'ride'],
            'interval': ['interval', 'intervals', 'session', 'training', 'sets', 'reps']
        };
        
        // Check for specific type keywords
        for (const [type, keywords] of Object.entries(typeKeywords)) {
            for (const keyword of keywords) {
                if (lower.includes(keyword)) {
                    return type;
                }
            }
        }
        
        // Check for interval patterns (like "4x5", "8x30")
        if (/\d+\s*x\s*\d+/i.test(description)) {
            return 'interval';
        }
        
        // Check for power/intensity indicators (only if no other type found)
        if (lower.includes('power') || lower.includes('watts')) {
            if (lower.includes('high') || lower.includes('hard') || lower.includes('max')) {
                return 'vo2max';
            }
            return 'threshold';
        }
        
        // FTP percentage indicators (only specific high intensities)
        if (lower.includes('ftp') || /%\s*ftp/.test(lower)) {
            const percentMatch = lower.match(/(\d+)%/);
            if (percentMatch) {
                const percent = parseInt(percentMatch[1]);
                if (percent >= 106) return 'vo2max';
                if (percent >= 91) return 'threshold'; 
                if (percent >= 76) return 'tempo';
                // For lower percentages, let other keywords determine type
            }
        }
        
        return 'endurance'; // default
    }

    extractIntensity(description) {
        const intensities = Object.keys(this.intensityMap);
        
        for (const intensity of intensities) {
            if (description.toLowerCase().includes(intensity)) {
                return intensity;
            }
        }
        
        return null;
    }

    extractIntervals(description) {
        // Match various interval patterns
        const patterns = [
            /(\d+)\s*x\s*(\d+)\s*(?:min|minutes?)/i,           // "4x5 min", "8 x 3 minutes"
            /(\d+)\s*x\s*(\d+)\s*(?:sec|seconds?)/i,           // "8x30 sec", "10 x 15 seconds"
            /(\d+)\s*x\s*(\d+)(?:\s*(?:min|minutes?))?/i,      // "4x5", "8x30" (assume context)
            /(\d+)\s+sets?\s+of\s+(\d+)\s*(?:min|minutes?)/i,  // "4 sets of 5 minutes"
            /(\d+)\s+reps?\s+of\s+(\d+)\s*(?:sec|seconds?)/i   // "8 reps of 30 seconds"
        ];
        
        for (const pattern of patterns) {
            const match = description.match(pattern);
            if (match) {
                const sets = parseInt(match[1]);
                const duration = parseInt(match[2]);
                
                // Determine unit based on pattern and context
                let unit;
                let durationInSeconds;
                
                if (pattern.source.includes('sec')) {
                    unit = 'seconds';
                    durationInSeconds = duration;
                } else if (pattern.source.includes('min')) {
                    unit = 'minutes';
                    durationInSeconds = duration * 60;
                } else {
                    // Context-based unit detection for patterns like "4x5"
                    const workoutType = this.extractWorkoutType(description);
                    if (workoutType === 'sprint' || duration <= 60) {
                        unit = 'seconds';
                        durationInSeconds = duration;
                    } else {
                        unit = 'minutes';
                        durationInSeconds = duration * 60;
                    }
                }
                
                return {
                    sets: sets,
                    duration: durationInSeconds,
                    unit: unit
                };
            }
        }
        
        return null;
    }

    extractComplexIntervals(description) {
        // Match patterns like "2 x 14' (4') as first 2' @ 105% then 12' at 100%"
        const complexPattern = /(\d+)\s*x\s*(\d+)'?\s*\((\d+)'?\)\s*as\s*(.*?)(?:\.|\s*$)/i;
        const match = description.match(complexPattern);
        
        if (!match) return null;
        
        const sets = parseInt(match[1]);
        const totalDuration = parseInt(match[2]);
        const recovery = parseInt(match[3]);
        const subStructure = match[4];
        
        // Parse the sub-structure like "first 2' @ 105% then 12' at 100%"
        const subSegments = this.parseSubStructure(subStructure);
        
        return {
            sets: sets,
            totalDuration: totalDuration * 60, // convert to seconds
            recovery: recovery * 60, // convert to seconds
            subSegments: subSegments
        };
    }
    
    parseSubStructure(subStructure) {
        const segments = [];
        
        // Match patterns like "first 2' @ 105% then 12' at 100%"
        const patterns = [
            /(?:first\s+)?(\d+)'?\s*@\s*(\d+)%/gi,  // "first 2' @ 105%"
            /then\s+(\d+)'?\s*at\s+(\d+)%/gi,      // "then 12' at 100%"
            /(\d+)'?\s*@\s*(\d+)%/gi               // Generic "X' @ Y%"
        ];
        
        let totalTime = 0;
        
        // Try to parse "first X @ Y% then Z @ W%" structure
        const firstMatch = subStructure.match(/(?:first\s+)?(\d+)'?\s*@\s*(\d+)%/i);
        const thenMatch = subStructure.match(/then\s+(\d+)'?\s*at\s+(\d+)%/i);
        
        if (firstMatch && thenMatch) {
            const duration1 = parseInt(firstMatch[1]) * 60;
            const power1 = parseInt(firstMatch[2]) / 100;
            const duration2 = parseInt(thenMatch[1]) * 60; 
            const power2 = parseInt(thenMatch[2]) / 100;
            
            segments.push({ duration: duration1, power: power1 });
            segments.push({ duration: duration2, power: power2 });
        } else {
            // Fallback: try to parse any "X' @ Y%" patterns
            const allMatches = [...subStructure.matchAll(/(\d+)'?\s*@\s*(\d+)%/gi)];
            for (const match of allMatches) {
                const duration = parseInt(match[1]) * 60;
                const power = parseInt(match[2]) / 100;
                segments.push({ duration: duration, power: power });
            }
        }
        
        return segments;
    }
    
    extractRemainder(description) {
        // Look for "remainder" or "rest" instructions
        const remainderPattern = /remainder.*?(?:zone\s*(\d+)|(\d+)\s*-\s*(\d+)\s*watts?)/i;
        const match = description.match(remainderPattern);
        
        if (match) {
            if (match[1]) {
                // Zone specification like "Zone 2"
                const zone = parseInt(match[1]);
                const zoneMap = {
                    1: 0.45,  // Recovery
                    2: 0.68,  // Endurance  
                    3: 0.82,  // Tempo
                    4: 0.98,  // Threshold
                    5: 1.13   // VO2max
                };
                return { power: zoneMap[zone] || 0.68 };
            } else if (match[2] && match[3]) {
                // Wattage range like "168 - 180 watts"
                const lowWatts = parseInt(match[2]);
                const highWatts = parseInt(match[3]);
                const avgWatts = (lowWatts + highWatts) / 2;
                // Convert to FTP percentage (assuming 250W FTP)
                return { power: avgWatts / 250 };
            }
        }
        
        return null;
    }

    extractZones(description) {
        const zones = [];
        const zonePattern = /zone\s*(\d+)/gi;
        let match;
        
        while ((match = zonePattern.exec(description)) !== null) {
            zones.push(parseInt(match[1]));
        }
        
        return zones;
    }

    generateWorkout(description) {
        const parsed = this.parseWorkoutDescription(description);
        
        // Check for complex intervals first
        if (parsed.complexIntervals) {
            return this.createComplexIntervalWorkout(parsed, description);
        }
        
        const workoutType = parsed.type || 'endurance';
        
        if (this.workoutTypes[workoutType]) {
            return this.workoutTypes[workoutType](parsed, description);
        }
        
        // Fallback to endurance workout
        return this.createEnduranceWorkout(parsed, description);
    }

    createWarmup(duration = 600) { // 10 minutes default
        return {
            type: 'Warmup',
            duration: duration,
            powerLow: 0.5,
            powerHigh: 0.7,
            startTime: 0,
            powerData: this.generateRampData(0, duration, 0.5, 0.7)
        };
    }

    createCooldown(duration = 600, startTime = 0) { // 10 minutes default
        return {
            type: 'Cooldown',
            duration: duration,
            powerLow: 0.7,
            powerHigh: 0.5,
            startTime: startTime,
            powerData: this.generateRampData(startTime, duration, 0.7, 0.5)
        };
    }

    createEnduranceWorkout(parsed, description) {
        const totalDuration = parsed.duration * 60; // convert to seconds
        const warmupDuration = Math.min(600, totalDuration * 0.15);
        const cooldownDuration = Math.min(600, totalDuration * 0.15);
        const mainDuration = totalDuration - warmupDuration - cooldownDuration;
        
        const intensity = this.intensityMap[parsed.intensity || 'endurance'];
        const power = (intensity.min + intensity.max) / 2;
        
        const segments = [
            this.createWarmup(warmupDuration),
            {
                type: 'SteadyState',
                duration: mainDuration,
                power: power,
                startTime: warmupDuration,
                powerData: this.generateSteadyData(warmupDuration, mainDuration, power)
            },
            this.createCooldown(cooldownDuration, warmupDuration + mainDuration)
        ];
        
        return {
            name: `Custom ${parsed.intensity || 'Endurance'} Workout`,
            description: description,
            author: 'Workout Creator',
            sportType: 'bike',
            totalDuration: totalDuration,
            segments: segments,
            tss: this.calculateTSS(segments)
        };
    }

    createIntervalWorkout(parsed, description) {
        const totalDuration = parsed.duration * 60;
        const warmupDuration = Math.min(600, totalDuration * 0.2);
        const cooldownDuration = Math.min(600, totalDuration * 0.2);
        
        let intervals = parsed.intervals;
        if (!intervals) {
            // Default intervals based on intensity
            const intensity = parsed.intensity || 'threshold';
            if (intensity === 'vo2max' || intensity === 'vo2') {
                intervals = { sets: 5, duration: 300, unit: 'seconds' }; // 5x5min
            } else if (intensity === 'threshold') {
                intervals = { sets: 4, duration: 480, unit: 'seconds' }; // 4x8min
            } else {
                intervals = { sets: 6, duration: 240, unit: 'seconds' }; // 6x4min
            }
        }
        
        const workIntensity = this.intensityMap[parsed.intensity || 'threshold'];
        const restIntensity = this.intensityMap['easy'];
        const workPower = (workIntensity.min + workIntensity.max) / 2;
        const restPower = (restIntensity.min + restIntensity.max) / 2;
        
        const intervalDuration = intervals.duration;
        const restDuration = Math.max(60, intervalDuration * 0.5); // 50% recovery or min 1 minute
        
        const intervalSegments = [];
        let currentTime = warmupDuration;
        
        for (let i = 0; i < intervals.sets; i++) {
            // Work interval
            intervalSegments.push({
                type: 'Interval (On)',
                duration: intervalDuration,
                power: workPower,
                startTime: currentTime,
                powerData: this.generateSteadyData(currentTime, intervalDuration, workPower)
            });
            currentTime += intervalDuration;
            
            // Rest interval (except after last interval)
            if (i < intervals.sets - 1) {
                intervalSegments.push({
                    type: 'Interval (Off)',
                    duration: restDuration,
                    power: restPower,
                    startTime: currentTime,
                    powerData: this.generateSteadyData(currentTime, restDuration, restPower)
                });
                currentTime += restDuration;
            }
        }
        
        const segments = [
            this.createWarmup(warmupDuration),
            ...intervalSegments,  // Flatten the interval segments
            this.createCooldown(cooldownDuration, currentTime)
        ];
        
        const finalDuration = currentTime + cooldownDuration;
        
        return {
            name: `Custom ${parsed.intensity || 'Threshold'} Intervals`,
            description: description,
            author: 'Workout Creator',
            sportType: 'bike',
            totalDuration: finalDuration,
            segments: segments,
            tss: this.calculateTSS(segments)
        };
    }

    createRecoveryWorkout(parsed, description) {
        const totalDuration = parsed.duration * 60;
        const warmupDuration = Math.min(300, totalDuration * 0.1); // Shorter warmup
        const cooldownDuration = Math.min(300, totalDuration * 0.1); // Shorter cooldown
        const mainDuration = totalDuration - warmupDuration - cooldownDuration;
        
        const intensity = this.intensityMap['recovery'];
        const power = (intensity.min + intensity.max) / 2;
        
        const segments = [
            this.createWarmup(warmupDuration),
            {
                type: 'SteadyState',
                duration: mainDuration,
                power: power,
                startTime: warmupDuration,
                powerData: this.generateSteadyData(warmupDuration, mainDuration, power)
            },
            this.createCooldown(cooldownDuration, warmupDuration + mainDuration)
        ];
        
        return {
            name: 'Custom Recovery Workout',
            description: description,
            author: 'Workout Creator',
            sportType: 'bike',
            totalDuration: totalDuration,
            segments: segments,
            tss: this.calculateTSS(segments)
        };
    }

    createTempoWorkout(parsed, description) {
        const totalDuration = parsed.duration * 60;
        const warmupDuration = Math.min(900, totalDuration * 0.25); // Longer warmup for tempo
        const cooldownDuration = Math.min(600, totalDuration * 0.15);
        const mainDuration = totalDuration - warmupDuration - cooldownDuration;
        
        const intensity = this.intensityMap['tempo'];
        const power = (intensity.min + intensity.max) / 2;
        
        const segments = [
            this.createWarmup(warmupDuration),
            {
                type: 'SteadyState',
                duration: mainDuration,
                power: power,
                startTime: warmupDuration,
                powerData: this.generateSteadyData(warmupDuration, mainDuration, power)
            },
            this.createCooldown(cooldownDuration, warmupDuration + mainDuration)
        ];
        
        return {
            name: 'Custom Tempo Workout',
            description: description,
            author: 'Workout Creator',
            sportType: 'bike',
            totalDuration: totalDuration,
            segments: segments,
            tss: this.calculateTSS(segments)
        };
    }

    createThresholdWorkout(parsed, description) {
        // Similar to interval workout but with longer steady efforts
        return this.createIntervalWorkout(parsed, description);
    }

    createVo2MaxWorkout(parsed, description) {
        // High intensity intervals
        return this.createIntervalWorkout(parsed, description);
    }

    createSprintWorkout(parsed, description) {
        // Short, high power intervals
        const modifiedParsed = { ...parsed };
        if (!modifiedParsed.intervals) {
            modifiedParsed.intervals = { sets: 8, duration: 30, unit: 'seconds' }; // 8x30sec
        }
        modifiedParsed.intensity = 'sprint';
        
        return this.createIntervalWorkout(modifiedParsed, description);
    }

    createComplexIntervalWorkout(parsed, description) {
        const complex = parsed.complexIntervals;
        let totalDuration = parsed.duration * 60; // Target total duration in seconds
        
        // Calculate warmup and cooldown
        const warmupDuration = Math.min(600, totalDuration * 0.15); // Max 10 minutes
        const cooldownDuration = Math.min(600, totalDuration * 0.15); // Max 10 minutes
        
        const segments = [];
        let currentTime = 0;
        
        // Add warmup
        const warmup = this.createWarmup(warmupDuration);
        warmup.startTime = currentTime;
        segments.push(warmup);
        currentTime += warmupDuration;
        
        // Add complex intervals
        for (let i = 0; i < complex.sets; i++) {
            // Add sub-segments for this interval
            for (const subSegment of complex.subSegments) {
                segments.push({
                    type: 'Interval (On)',
                    duration: subSegment.duration,
                    power: subSegment.power,
                    startTime: currentTime,
                    powerData: this.generateSteadyData(currentTime, subSegment.duration, subSegment.power)
                });
                currentTime += subSegment.duration;
            }
            
            // Add recovery between intervals (except after last one)
            if (i < complex.sets - 1) {
                segments.push({
                    type: 'Interval (Off)',
                    duration: complex.recovery,
                    power: 0.6, // 60% FTP recovery
                    startTime: currentTime,
                    powerData: this.generateSteadyData(currentTime, complex.recovery, 0.6)
                });
                currentTime += complex.recovery;
            }
        }
        
        // Calculate remaining time
        const remainingTime = totalDuration - currentTime - cooldownDuration;
        
        // Add remainder segment if specified and there's time
        if (parsed.remainder && remainingTime > 300) { // At least 5 minutes
            segments.push({
                type: 'SteadyState',
                duration: remainingTime,
                power: parsed.remainder.power,
                startTime: currentTime,
                powerData: this.generateSteadyData(currentTime, remainingTime, parsed.remainder.power)
            });
            currentTime += remainingTime;
        }
        
        // Add cooldown
        const cooldown = this.createCooldown(cooldownDuration, currentTime);
        segments.push(cooldown);
        currentTime += cooldownDuration;
        
        return {
            name: 'Custom Complex Interval Workout',
            description: description,
            author: 'Workout Creator',
            sportType: 'bike',
            totalDuration: currentTime,
            segments: segments,
            tss: this.calculateTSS(segments)
        };
    }

    // Helper methods
    generateSteadyData(startTime, duration, power) {
        const points = Math.max(2, Math.floor(duration / 10));
        const data = [];
        
        for (let i = 0; i < points; i++) {
            const time = startTime + (i * duration / (points - 1));
            data.push({
                x: time,
                y: power * 100
            });
        }
        
        return data;
    }

    generateRampData(startTime, duration, powerLow, powerHigh) {
        const points = Math.max(2, Math.floor(duration / 10));
        const data = [];
        
        for (let i = 0; i < points; i++) {
            const progress = i / (points - 1);
            const time = startTime + (i * duration / (points - 1));
            const power = powerLow + (powerHigh - powerLow) * progress;
            data.push({
                x: time,
                y: power * 100
            });
        }
        
        return data;
    }

    calculateTSS(segments) {
        let totalWeightedPower = 0;
        let totalDuration = 0;

        const allSegments = segments.flat();

        allSegments.forEach(segment => {
            if (segment.duration > 0) {
                let segmentPower;
                
                if (segment.power !== undefined) {
                    segmentPower = segment.power;
                } else if (segment.powerLow !== undefined && segment.powerHigh !== undefined) {
                    segmentPower = (segment.powerLow + segment.powerHigh) / 2;
                } else {
                    segmentPower = 0.6;
                }

                const weightedPower = Math.pow(segmentPower, 4) * segment.duration;
                totalWeightedPower += weightedPower;
                totalDuration += segment.duration;
            }
        });

        if (totalDuration === 0) {
            return 0;
        }

        const normalizedPower = Math.pow(totalWeightedPower / totalDuration, 0.25);
        const intensityFactor = normalizedPower / 1.0;
        const tss = (totalDuration * normalizedPower * intensityFactor) / (1.0 * 3600) * 100;
        
        return Math.round(tss);
    }
}