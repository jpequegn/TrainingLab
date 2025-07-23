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
            zones: this.extractZones(description)
        };
        
        return parsed;
    }

    extractDuration(description) {
        // Match patterns like "45 minutes", "1 hour", "90 min", etc.
        const patterns = [
            /(\d+)\s*(?:hours?|hrs?)/i,
            /(\d+)\s*(?:minutes?|mins?)/i,
            /(\d+)\s*(?:h)\s*(\d+)?\s*(?:m)?/i
        ];
        
        for (const pattern of patterns) {
            const match = description.match(pattern);
            if (match) {
                if (pattern === patterns[0]) { // hours
                    return parseInt(match[1]) * 60;
                } else if (pattern === patterns[1]) { // minutes
                    return parseInt(match[1]);
                } else if (pattern === patterns[2]) { // h m format
                    const hours = parseInt(match[1]);
                    const minutes = parseInt(match[2]) || 0;
                    return hours * 60 + minutes;
                }
            }
        }
        
        // Default duration based on workout type
        return 60; // 1 hour default
    }

    extractWorkoutType(description) {
        const types = ['endurance', 'interval', 'recovery', 'tempo', 'threshold', 'vo2max', 'sprint'];
        
        for (const type of types) {
            if (description.toLowerCase().includes(type)) {
                return type;
            }
        }
        
        // Check for interval patterns
        if (/\d+\s*x\s*\d+/i.test(description)) {
            return 'interval';
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
        // Match patterns like "4x5min", "8 x 30 seconds", etc.
        const intervalPattern = /(\d+)\s*x\s*(\d+)\s*(?:min|minutes?|sec|seconds?)/i;
        const match = description.match(intervalPattern);
        
        if (match) {
            const sets = parseInt(match[1]);
            const duration = parseInt(match[2]);
            const unit = description.match(/(?:min|minutes?)/i) ? 'minutes' : 'seconds';
            
            return {
                sets: sets,
                duration: unit === 'minutes' ? duration * 60 : duration,
                unit: unit
            };
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