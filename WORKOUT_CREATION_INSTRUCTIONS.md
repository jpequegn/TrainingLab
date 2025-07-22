# Workout Creation Instructions for LLM Integration

This document provides comprehensive instructions for Large Language Models (LLMs) to create structured workout data from natural language descriptions in the Zwift Workout Visualizer chat interface.

## Overview

The workout generator processes natural language descriptions and converts them into structured workout data with appropriate warmup, main workout segments, and cooldown phases. All power values are expressed as percentages of Functional Threshold Power (FTP).

## Input Processing

### Duration Extraction
Parse time expressions in various formats:
- **Minutes**: "45 minutes", "30 min", "60 mins"
- **Hours**: "1 hour", "2 hrs", "1.5 hours" 
- **Mixed**: "1 hour 30 minutes", "1h 30m", "90 min"

**Default**: If no duration specified, use 60 minutes.

### Workout Type Classification
Identify the primary workout type from keywords:

| Type | Keywords | Default Structure |
|------|----------|-------------------|
| **endurance** | endurance, steady, aerobic, base | 15% warmup, 70% steady, 15% cooldown |
| **interval** | interval, repeat, x, sets | 20% warmup, 60% intervals, 20% cooldown |
| **recovery** | recovery, easy, active recovery | 10% warmup, 80% easy, 10% cooldown |
| **tempo** | tempo, sweetspot, threshold- | 25% warmup, 60% tempo, 15% cooldown |
| **threshold** | threshold, FTP, lactate | 20% warmup, 60% threshold, 20% cooldown |
| **vo2max** | vo2max, vo2, max, anaerobic | 20% warmup, 60% high intensity, 20% cooldown |
| **sprint** | sprint, neuromuscular, power | 25% warmup, 50% sprints, 25% cooldown |

### Intensity Mapping
Convert intensity keywords to FTP percentages:

```javascript
const intensityMap = {
    'recovery': { min: 35, max: 55 },        // Zone 1
    'easy': { min: 56, max: 75 },            // Zone 2
    'endurance': { min: 56, max: 75 },       // Zone 2
    'tempo': { min: 76, max: 90 },           // Zone 3
    'sweetspot': { min: 84, max: 97 },       // Zone 3-4
    'threshold': { min: 91, max: 105 },      // Zone 4
    'vo2max': { min: 106, max: 120 },        // Zone 5
    'vo2': { min: 106, max: 120 },           // Zone 5
    'anaerobic': { min: 121, max: 150 },     // Zone 6
    'neuromuscular': { min: 151, max: 300 }, // Zone 7
    'sprint': { min: 151, max: 300 }         // Zone 7
};
```

### Interval Pattern Recognition
Extract structured interval information from patterns:

**Patterns to Match:**
- "4x5 min" → 4 sets of 5 minutes
- "6 x 30 seconds" → 6 sets of 30 seconds  
- "5x(3min on, 1min off)" → 5 sets with 3min work, 1min rest
- "8x30sec sprints" → 8 sets of 30-second sprints

**Default Intervals by Type:**
- **Threshold**: 4x8 minutes at 95-105% FTP, 50% recovery between
- **VO2max**: 5x5 minutes at 110-120% FTP, 50% recovery between  
- **Sprints**: 8x30 seconds at 200%+ FTP, 90 seconds recovery between

## Workout Structure Generation

### Warmup Creation
```javascript
// Duration: 10-15% of total workout (max 15 minutes)
{
    type: 'Warmup',
    duration: calculated_seconds,
    powerLow: 0.5,    // 50% FTP
    powerHigh: 0.7,   // 70% FTP
    startTime: 0
}
```

### Main Workout Segments

#### Steady State
```javascript
{
    type: 'SteadyState', 
    duration: calculated_seconds,
    power: intensity_percentage / 100,  // e.g., 0.75 for 75% FTP
    startTime: calculated_start_time
}
```

#### Intervals
```javascript
// Work interval
{
    type: 'Interval (On)',
    duration: work_duration_seconds,
    power: work_intensity / 100,
    startTime: calculated_start_time
}

// Recovery interval  
{
    type: 'Interval (Off)',
    duration: recovery_duration_seconds,
    power: recovery_intensity / 100,  // Usually 50-65% FTP
    startTime: calculated_start_time
}
```

### Cooldown Creation
```javascript
// Duration: 10-15% of total workout (max 10 minutes)
{
    type: 'Cooldown',
    duration: calculated_seconds,
    powerLow: 0.7,    // 70% FTP
    powerHigh: 0.5,   // 50% FTP  
    startTime: calculated_start_time
}
```

## Common Workout Examples

### Example 1: "45 minute endurance ride"
```javascript
{
    name: "Custom Endurance Workout",
    description: "45 minute endurance ride",
    author: "Workout Creator",
    sportType: "bike", 
    totalDuration: 2700, // 45 * 60
    segments: [
        {
            type: 'Warmup',
            duration: 600,     // 10 minutes
            powerLow: 0.5,
            powerHigh: 0.7,
            startTime: 0
        },
        {
            type: 'SteadyState',
            duration: 1500,    // 25 minutes  
            power: 0.68,       // 68% FTP (endurance)
            startTime: 600
        },
        {
            type: 'Cooldown', 
            duration: 600,     // 10 minutes
            powerLow: 0.7,
            powerHigh: 0.5,
            startTime: 2100
        }
    ]
}
```

### Example 2: "4x5 minute threshold intervals"
```javascript
{
    name: "Custom Threshold Intervals",
    description: "4x5 minute threshold intervals", 
    author: "Workout Creator",
    sportType: "bike",
    totalDuration: 3600, // Calculated total
    segments: [
        // Warmup (15 minutes)
        {
            type: 'Warmup',
            duration: 900,
            powerLow: 0.5, 
            powerHigh: 0.7,
            startTime: 0
        },
        // 4 interval sets
        [
            // Interval 1
            {
                type: 'Interval (On)',
                duration: 300,    // 5 minutes
                power: 1.0,       // 100% FTP
                startTime: 900
            },
            {
                type: 'Interval (Off)', 
                duration: 150,    // 2.5 minutes recovery
                power: 0.6,       // 60% FTP
                startTime: 1200
            },
            // Repeat for intervals 2, 3, 4...
        ],
        // Cooldown (10 minutes)
        {
            type: 'Cooldown',
            duration: 600,
            powerLow: 0.7,
            powerHigh: 0.5, 
            startTime: 2990  // Calculated
        }
    ]
}
```

## Power Data Generation

Each segment must include `powerData` array for chart visualization:

### Steady State Power Data
```javascript
const generateSteadyData = (segment) => {
    const points = Math.max(2, Math.floor(segment.duration / 10));
    const data = [];
    
    for (let i = 0; i < points; i++) {
        const time = segment.startTime + (i * segment.duration / (points - 1));
        data.push({
            x: time,
            y: segment.power * 100  // Convert to percentage for display
        });
    }
    
    return data;
};
```

### Ramp Power Data (Warmup/Cooldown)
```javascript
const generateRampData = (segment) => {
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
};
```

## TSS Calculation

Calculate Training Stress Score using normalized power:

```javascript
const calculateTSS = (segments) => {
    let totalWeightedPower = 0;
    let totalDuration = 0;

    segments.flat().forEach(segment => {
        if (segment.duration > 0) {
            let segmentPower;
            
            if (segment.power !== undefined) {
                segmentPower = segment.power;
            } else if (segment.powerLow !== undefined && segment.powerHigh !== undefined) {
                segmentPower = (segment.powerLow + segment.powerHigh) / 2;
            } else {
                segmentPower = 0.6; // Default
            }

            const weightedPower = Math.pow(segmentPower, 4) * segment.duration;
            totalWeightedPower += weightedPower;
            totalDuration += segment.duration;
        }
    });

    if (totalDuration === 0) return 0;

    const normalizedPower = Math.pow(totalWeightedPower / totalDuration, 0.25);
    const intensityFactor = normalizedPower / 1.0;
    const tss = (totalDuration * normalizedPower * intensityFactor) / 3600 * 100;
    
    return Math.round(tss);
};
```

## Error Handling

### Invalid Inputs
- **No duration found**: Default to 60 minutes
- **Unrecognized workout type**: Default to endurance
- **Invalid intensity**: Use moderate endurance (65% FTP)
- **Malformed intervals**: Create simple steady-state workout

### Validation Rules
- **Minimum duration**: 15 minutes
- **Maximum duration**: 6 hours (21600 seconds)
- **Power range**: 30-300% FTP
- **Warmup duration**: 5-20 minutes
- **Cooldown duration**: 5-15 minutes

## Response Format

Always return a complete workout object with:
1. **Metadata**: name, description, author, sportType
2. **Duration**: totalDuration in seconds
3. **Segments**: Array of workout segments with proper timing
4. **Power Data**: Each segment includes powerData for visualization
5. **TSS**: Calculated Training Stress Score

## Natural Language Examples

| Input | Interpretation | Key Elements |
|-------|---------------|--------------|
| "Easy 30 minute recovery ride" | Recovery workout, 30 min, 40-55% FTP | Short warmup, long easy segment |
| "Build me a VO2max session" | VO2max intervals, 60 min default, 110-120% FTP | 5x5min intervals typical |
| "Sprint workout with 8x30 seconds" | Sprint intervals, 8 sets, 30s each, 200%+ FTP | Long recovery between sprints |
| "1 hour threshold at 95%" | Threshold workout, 60 min, 95% FTP | Mostly steady-state at threshold |
| "Pyramid intervals 1-2-3-2-1 minutes" | Custom intervals, increasing/decreasing | Progressive structure |

## Best Practices

1. **Always include warmup and cooldown** unless specifically requested otherwise
2. **Use appropriate recovery ratios** (typically 50-100% of work interval duration)
3. **Scale warmup/cooldown duration** based on workout intensity and duration
4. **Provide realistic power targets** based on the requested intensity
5. **Generate smooth power transitions** between segments
6. **Include helpful descriptions** that explain the workout purpose
7. **Calculate accurate start times** for proper segment sequencing
8. **Ensure total duration matches** the sum of all segments

This instruction set ensures consistent, physiologically sound workout generation that integrates seamlessly with the Zwift Workout Visualizer interface.