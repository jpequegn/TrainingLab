/**
 * Workout Generation Module
 * Converts natural language descriptions into structured Zwift workout data
 * 
 * @class WorkoutGenerator
 * @description Provides intelligent parsing and generation of cycling workouts
 * with support for complex interval structures and natural language processing
 */

export class WorkoutGenerator {
    // Constants for workout generation
    static INTENSITY_ZONES = {
        recovery: { min: 0.35, max: 0.55, description: 'Active Recovery' },
        easy: { min: 0.56, max: 0.75, description: 'Endurance Base' },
        endurance: { min: 0.56, max: 0.75, description: 'Endurance Base' },
        tempo: { min: 0.76, max: 0.90, description: 'Tempo' },
        threshold: { min: 0.91, max: 1.05, description: 'Lactate Threshold' },
        sweetspot: { min: 0.84, max: 0.97, description: 'Sweet Spot' },
        vo2max: { min: 1.06, max: 1.20, description: 'VO2 Max' },
        vo2: { min: 1.06, max: 1.20, description: 'VO2 Max' },
        anaerobic: { min: 1.21, max: 1.50, description: 'Anaerobic Capacity' },
        neuromuscular: { min: 1.51, max: 3.00, description: 'Neuromuscular Power' },
        sprint: { min: 1.51, max: 3.00, description: 'Sprint Power' }
    };

    static DEFAULT_DURATIONS = {
        sprint: 45,
        recovery: 45,
        vo2max: 60,
        threshold: 75,
        default: 60
    };

    constructor(powerZoneManager = null) {
        this.powerZoneManager = powerZoneManager;
        this.intensityMap = this._initializeIntensityMap();
        this.workoutTypes = this._initializeWorkoutTypes();
        this._validateConfiguration();
        
        // Listen for power zone changes if manager is provided
        if (this.powerZoneManager && typeof window !== 'undefined') {
            window.addEventListener('powerZonesChanged', () => {
                this.intensityMap = this._initializeIntensityMap();
            });
        }
    }

    /**
     * Initialize intensity map from power zones or defaults
     * @private
     * @returns {Object} Intensity map for workout generation
     */
    _initializeIntensityMap() {
        if (this.powerZoneManager) {
            try {
                const zones = this.powerZoneManager.getZones();
                const intensityMap = {};
                
                // Map common zone names to power zones
                const zoneMapping = {
                    'recovery': ['recovery', 'active recovery', 'zone1'],
                    'easy': ['easy', 'endurance', 'base', 'zone2'],
                    'endurance': ['easy', 'endurance', 'base', 'zone2'],
                    'tempo': ['tempo', 'aerobic threshold', 'zone3'],
                    'threshold': ['threshold', 'lactate threshold', 'sweet spot', 'zone4'],
                    'sweetspot': ['sweet spot', 'threshold', 'zone4'],
                    'vo2max': ['vo2max', 'vo2 max', 'aerobic power', 'zone5'],
                    'vo2': ['vo2max', 'vo2 max', 'aerobic power', 'zone5'],
                    'anaerobic': ['anaerobic', 'anaerobic capacity', 'zone6'],
                    'neuromuscular': ['neuromuscular', 'sprint', 'zone7'],
                    'sprint': ['neuromuscular', 'sprint', 'zone7']
                };
                
                // Try to map workout intensities to user's power zones
                for (const [intensity, aliases] of Object.entries(zoneMapping)) {
                    let mappedZone = null;
                    
                    // Try to find matching zone by name
                    for (const [zoneId, zone] of Object.entries(zones)) {
                        const zoneName = zone.name.toLowerCase();
                        if (aliases.some(alias => zoneName.includes(alias.toLowerCase()))) {
                            mappedZone = zone;
                            break;
                        }
                    }
                    
                    if (mappedZone) {
                        intensityMap[intensity] = {
                            min: mappedZone.min,
                            max: mappedZone.max,
                            description: mappedZone.description,
                            color: mappedZone.color
                        };
                    }
                }
                
                // Fall back to defaults for unmapped intensities
                for (const [intensity, defaultZone] of Object.entries(WorkoutGenerator.INTENSITY_ZONES)) {
                    if (!intensityMap[intensity]) {
                        intensityMap[intensity] = defaultZone;
                    }
                }
                
                return intensityMap;
            } catch (error) {
                console.warn('Failed to use custom power zones, falling back to defaults:', error);
            }
        }
        
        return { ...WorkoutGenerator.INTENSITY_ZONES };
    }

    /**
     * Initialize workout type handlers
     * @private
     * @returns {Object} Map of workout types to handler functions
     */
    _initializeWorkoutTypes() {
        return {
            endurance: this.createEnduranceWorkout.bind(this),
            interval: this.createIntervalWorkout.bind(this),
            recovery: this.createRecoveryWorkout.bind(this),
            tempo: this.createTempoWorkout.bind(this),
            threshold: this.createThresholdWorkout.bind(this),
            vo2max: this.createVo2MaxWorkout.bind(this),
            sprint: this.createSprintWorkout.bind(this)
        };
    }

    /**
     * Validate generator configuration
     * @private
     * @throws {Error} If configuration is invalid
     */
    _validateConfiguration() {
        if (!this.intensityMap || Object.keys(this.intensityMap).length === 0) {
            throw new Error('WorkoutGenerator: Invalid intensity map configuration');
        }
        if (!this.workoutTypes || Object.keys(this.workoutTypes).length === 0) {
            throw new Error('WorkoutGenerator: Invalid workout types configuration');
        }
    }

    /**
     * Parse workout description into structured data
     * @param {string} description - Natural language workout description
     * @returns {Object} Parsed workout data structure
     * @throws {Error} If description is invalid or parsing fails
     */
    parseWorkoutDescription(description) {
        if (!description || typeof description !== 'string') {
            throw new Error('WorkoutGenerator: Description must be a non-empty string');
        }

        const cleanDescription = description.trim().toLowerCase();
        if (cleanDescription.length === 0) {
            throw new Error('WorkoutGenerator: Description cannot be empty');
        }

        try {
            const parsed = {
                duration: this._safeExtract(() => this.extractDuration(cleanDescription), 'duration'),
                type: this._safeExtract(() => this.extractWorkoutType(cleanDescription), 'workout type'),
                intensity: this._safeExtract(() => this.extractIntensity(cleanDescription), 'intensity'),
                intervals: this._safeExtract(() => this.extractIntervals(cleanDescription), 'intervals'),
                complexIntervals: this._safeExtract(() => this.extractComplexIntervals(cleanDescription), 'complex intervals'),
                zones: this._safeExtract(() => this.extractZones(cleanDescription), 'zones'),
                remainder: this._safeExtract(() => this.extractRemainder(cleanDescription), 'remainder')
            };
            
            this._validateParsedData(parsed);
            return parsed;
        } catch (error) {
            throw new Error(`WorkoutGenerator: Failed to parse description "${description}": ${error.message}`);
        }
    }

    /**
     * Safely execute extraction function with error handling
     * @private
     * @param {Function} extractFn - Extraction function to execute
     * @param {string} fieldName - Name of field being extracted (for error messages)
     * @returns {*} Extraction result or null if failed
     */
    _safeExtract(extractFn, fieldName) {
        try {
            return extractFn();
        } catch (error) {
            console.warn(`WorkoutGenerator: Failed to extract ${fieldName}: ${error.message}`);
            return null;
        }
    }

    /**
     * Validate parsed workout data
     * @private
     * @param {Object} parsed - Parsed workout data
     * @throws {Error} If parsed data is invalid
     */
    _validateParsedData(parsed) {
        if (!parsed.duration || parsed.duration <= 0) {
            throw new Error('Invalid workout duration');
        }
        if (!parsed.type) {
            throw new Error('Could not determine workout type');
        }
        if (parsed.duration > 480) { // 8 hours
            console.warn('WorkoutGenerator: Very long workout duration detected:', parsed.duration, 'minutes');
        }
    }

    /**
     * Extract workout duration from description
     * @param {string} description - Workout description
     * @returns {number} Duration in minutes
     * @throws {Error} If duration cannot be extracted or is invalid
     */
    extractDuration(description) {
        // First check for interval patterns and handle specially
        if (this._hasIntervalPattern(description)) {
            return this._extractIntervalDuration(description);
        }
        
        // Extract from explicit duration patterns
        const explicitDuration = this._extractExplicitDuration(description);
        if (explicitDuration) {
            return explicitDuration;
        }
        
        // Fall back to workout type defaults
        return this._getDefaultDurationForType(description);
    }

    /**
     * Check if description contains interval patterns
     * @private
     * @param {string} description - Workout description
     * @returns {boolean} True if interval pattern found
     */
    _hasIntervalPattern(description) {
        return /\d+\s*x\s*\d+/i.test(description);
    }

    /**
     * Extract duration for interval workouts
     * @private
     * @param {string} description - Workout description
     * @returns {number} Duration in minutes
     */
    _extractIntervalDuration(description) {
        // Look for explicit total duration OUTSIDE of the interval pattern  
        let nonIntervalText = description.replace(/\d+\s*x\s*\d+\s*(?:min|minutes?|sec|seconds?)/gi, '');
        // Remove common false matches like "VO2max"
        nonIntervalText = nonIntervalText.replace(/vo2max?/gi, '');
        
        const totalDurationMatch = nonIntervalText.match(/(\d+)\s*(?:hour|hr|h|minute|min|m)(?:s?)\b/i);
        if (totalDurationMatch) {
            const duration = parseInt(totalDurationMatch[1]);
            if (totalDurationMatch[0].match(/hour|hr|h/i)) {
                return duration * 60;
            }
            return duration;
        }
        
        // Use intelligent defaults based on workout type
        return this._getDefaultDurationForType(description);
    }

    /**
     * Extract explicit duration from description
     * @private
     * @param {string} description - Workout description
     * @returns {number|null} Duration in minutes or null if not found
     */
    _extractExplicitDuration(description) {
        const patterns = [
            { regex: /(\d+)\s*(?:hours?|hrs?|h)\b/i, multiplier: 60 },
            { regex: /(\d+)\s*(?:minutes?|mins?|m)\b/i, multiplier: 1 },
            { regex: /(\d+)[-\s](?:minute|min)\b/i, multiplier: 1 },
            { regex: /(\d+)\s*(?:h)\s*(\d+)\s*(?:m|minutes?)?/i, isComplex: true }
        ];
        
        for (const pattern of patterns) {
            const match = description.match(pattern.regex);
            if (match) {
                if (pattern.isComplex) {
                    const hours = parseInt(match[1]);
                    const minutes = parseInt(match[2]) || 0;
                    return hours * 60 + minutes;
                } else {
                    const value = parseInt(match[1]);
                    if (value > 0) {
                        return value * pattern.multiplier;
                    }
                }
            }
        }
        
        return null;
    }

    /**
     * Get default duration based on workout type
     * @private
     * @param {string} description - Workout description
     * @returns {number} Duration in minutes
     */
    _getDefaultDurationForType(description) {
        const workoutType = this.extractWorkoutType(description);
        return WorkoutGenerator.DEFAULT_DURATIONS[workoutType] || WorkoutGenerator.DEFAULT_DURATIONS.default;
    }

    /**
     * Extract workout type from description
     * @param {string} description - Workout description
     * @returns {string} Detected workout type
     */
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
        
        const totalTime = 0;
        
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
        const totalDuration = parsed.duration * 60; // Target total duration in seconds
        
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

    /**
     * Get available power zones for workout targeting
     * @returns {Object} Available power zones with metadata
     */
    getAvailablePowerZones() {
        if (this.powerZoneManager) {
            const zones = this.powerZoneManager.getZones();
            const ftp = this.powerZoneManager.getFTP();
            const wattsMode = this.powerZoneManager.getWattsMode();
            
            return {
                zones,
                ftp,
                wattsMode,
                zonesInWatts: this.powerZoneManager.getZonesInWatts()
            };
        }
        
        // Return default zones if no power zone manager
        const defaultZones = {};
        Object.entries(WorkoutGenerator.INTENSITY_ZONES).forEach(([key, zone], index) => {
            defaultZones[`zone${index + 1}`] = {
                ...zone,
                name: zone.description,
                color: this._getDefaultZoneColor(index)
            };
        });
        
        return {
            zones: defaultZones,
            ftp: 250, // Default FTP
            wattsMode: false,
            zonesInWatts: this._convertZonesToWatts(defaultZones, 250)
        };
    }

    /**
     * Create workout targeting specific power zone
     * @param {string} targetZone - Target power zone name or ID
     * @param {number} duration - Workout duration in minutes
     * @param {Object} options - Additional workout options
     * @returns {Object} Generated workout targeting the specified zone
     */
    createZoneTargetedWorkout(targetZone, duration, options = {}) {
        if (!this.powerZoneManager) {
            throw new Error('Power zone manager not available for zone-targeted workouts');
        }
        
        const zones = this.powerZoneManager.getZones();
        let targetZoneConfig = null;
        
        // Find target zone
        for (const [zoneId, zone] of Object.entries(zones)) {
            if (zoneId === targetZone || 
                zone.name.toLowerCase() === targetZone.toLowerCase()) {
                targetZoneConfig = zone;
                break;
            }
        }
        
        if (!targetZoneConfig) {
            throw new Error(`Target zone "${targetZone}" not found`);
        }
        
        const totalDuration = duration * 60; // Convert to seconds
        const warmupDuration = Math.min(600, totalDuration * 0.15);
        const cooldownDuration = Math.min(600, totalDuration * 0.15);
        const mainDuration = totalDuration - warmupDuration - cooldownDuration;
        
        const targetPower = (targetZoneConfig.min + targetZoneConfig.max) / 2;
        
        const segments = [
            this.createWarmup(warmupDuration),
            {
                type: 'SteadyState',
                duration: mainDuration,
                power: targetPower,
                startTime: warmupDuration,
                powerData: this.generateSteadyData(warmupDuration, mainDuration, targetPower),
                zone: targetZoneConfig
            },
            this.createCooldown(cooldownDuration, warmupDuration + mainDuration)
        ];
        
        return {
            name: `${targetZoneConfig.name} Zone Workout`,
            description: `${duration}-minute workout in ${targetZoneConfig.name} zone (${Math.round(targetZoneConfig.min * 100)}-${Math.round(targetZoneConfig.max * 100)}% FTP)`,
            author: 'Workout Creator',
            sportType: 'bike',
            totalDuration: totalDuration,
            segments: segments,
            tss: this.calculateTSS(segments),
            targetZone: targetZoneConfig
        };
    }

    /**
     * Get zone recommendation for workout description
     * @param {string} description - Workout description
     * @returns {Object|null} Recommended zone or null if not found
     */
    getZoneRecommendation(description) {
        if (!this.powerZoneManager) {
            return null;
        }
        
        const intensity = this.extractIntensity(description);
        if (!intensity) {
            return null;
        }
        
        const intensityZone = this.intensityMap[intensity];
        if (!intensityZone) {
            return null;
        }
        
        // Find matching user zone
        const zones = this.powerZoneManager.getZones();
        for (const [zoneId, zone] of Object.entries(zones)) {
            // Check if zone ranges overlap significantly
            const overlapMin = Math.max(zone.min, intensityZone.min);
            const overlapMax = Math.min(zone.max, intensityZone.max);
            const overlapAmount = Math.max(0, overlapMax - overlapMin);
            const zoneRange = zone.max - zone.min;
            const overlapPercentage = overlapAmount / zoneRange;
            
            if (overlapPercentage > 0.5) { // 50% overlap threshold
                return {
                    zoneId,
                    zone,
                    overlapPercentage,
                    recommendationReason: `Best match for ${intensity} intensity`
                };
            }
        }
        
        return null;
    }

    /**
     * Validate workout against power zones
     * @param {Object} workout - Workout to validate
     * @returns {Object} Validation results
     */
    validateWorkoutZones(workout) {
        if (!this.powerZoneManager) {
            return { valid: true, warnings: [], info: 'No power zone validation available' };
        }
        
        const zones = this.powerZoneManager.getZones();
        const warnings = [];
        const info = [];
        
        // Check each segment
        workout.segments.forEach((segment, index) => {
            if (segment.power !== undefined) {
                const zone = this.powerZoneManager.getZoneByPower(segment.power);
                if (zone) {
                    info.push(`Segment ${index + 1} (${segment.type}): ${zone.name} zone`);
                } else {
                    warnings.push(`Segment ${index + 1} power (${Math.round(segment.power * 100)}% FTP) doesn't match any defined zone`);
                }
            }
        });
        
        return {
            valid: warnings.length === 0,
            warnings,
            info
        };
    }

    /**
     * Get default zone color for index
     * @private
     * @param {number} index - Zone index
     * @returns {string} Hex color code
     */
    _getDefaultZoneColor(index) {
        const colors = ['#90EE90', '#87CEEB', '#FFD700', '#FFA500', '#FF6347', '#FF4500', '#8B0000'];
        return colors[index % colors.length];
    }

    /**
     * Convert zones to watts
     * @private
     * @param {Object} zones - Power zones
     * @param {number} ftp - FTP value
     * @returns {Object} Zones with watt ranges
     */
    _convertZonesToWatts(zones, ftp) {
        const wattsZones = {};
        for (const [zoneId, zone] of Object.entries(zones)) {
            wattsZones[zoneId] = {
                ...zone,
                minWatts: Math.round(zone.min * ftp),
                maxWatts: Math.round(zone.max * ftp)
            };
        }
        return wattsZones;
    }

    /**
     * Set power zone manager
     * @param {Object} powerZoneManager - Power zone manager instance
     */
    setPowerZoneManager(powerZoneManager) {
        this.powerZoneManager = powerZoneManager;
        this.intensityMap = this._initializeIntensityMap();
        
        // Listen for zone changes
        if (typeof window !== 'undefined') {
            window.addEventListener('powerZonesChanged', () => {
                this.intensityMap = this._initializeIntensityMap();
            });
        }
    }
}