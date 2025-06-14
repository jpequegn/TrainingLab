// Simple test for workout conversion functionality
console.log('🧪 Running Workout Conversion Tests\n');

// Mock workout data
const mockWorkoutData = {
    name: 'Test Workout',
    description: 'Test Description',
    author: 'Test Author',
    sportType: 'bike',
    totalDuration: 1500,
    segments: [
        {
            type: 'Warmup',
            startTime: 0,
            duration: 600,
            powerLow: 0.5,
            powerHigh: 0.7
        },
        {
            type: 'SteadyState',
            startTime: 600,
            duration: 300,
            power: 0.6
        },
        {
            type: 'Cooldown',
            startTime: 900,
            duration: 600,
            powerLow: 0.6,
            powerHigh: 0.4
        }
    ]
};

// Extract conversion functions from the main script
function generateWorkoutDataPoints(workoutData, format) {
    const points = [];
    
    // Flatten all segments
    const allSegments = [];
    workoutData.segments.forEach(segment => {
        if (Array.isArray(segment)) {
            allSegments.push(...segment);
        } else {
            allSegments.push(segment);
        }
    });

    // Sort segments by start time
    allSegments.sort((a, b) => a.startTime - b.startTime);

    let currentTime = 0;

    allSegments.forEach(segment => {
        const startTime = segment.startTime;
        const endTime = segment.startTime + segment.duration;

        // Add transition point if there's a gap
        if (currentTime < startTime) {
            points.push({ time: startTime, power: 0.5 }); // Easy spinning
        }

        if (segment.type === 'Warmup' || segment.type === 'Cooldown' || segment.type === 'Ramp') {
            // Add start and end points for ramps
            points.push({ time: startTime, power: segment.powerLow });
            points.push({ time: endTime, power: segment.powerHigh });
        } else {
            // Steady state or intervals
            const power = segment.power || 0.6;
            points.push({ time: startTime, power: power });
            points.push({ time: endTime, power: power });
        }

        currentTime = endTime;
    });

    return points;
}

function generateERGContent(workoutData, ftp) {
    const header = [
        '[COURSE HEADER]',
        'VERSION=2',
        'UNITS=ENGLISH',
        `DESCRIPTION=${workoutData.description}`,
        `FILE NAME=${workoutData.name}.erg`,
        `FTP=${ftp}`,
        'MINUTES\tWATTS',
        '[END COURSE HEADER]',
        '',
        '[COURSE DATA]'
    ].join('\n');

    const dataPoints = generateWorkoutDataPoints(workoutData, 'watts');
    const courseData = dataPoints.map(point => 
        `${(point.time / 60).toFixed(2)}\t${Math.round(point.power * ftp)}`
    ).join('\n');

    return header + '\n' + courseData + '\n[END COURSE DATA]';
}

function generateMRCContent(workoutData) {
    const header = [
        '[COURSE HEADER]',
        'VERSION = 2',
        'UNITS = ENGLISH',
        `DESCRIPTION = ${workoutData.description}`,
        `FILE NAME = ${workoutData.name}.mrc`,
        'MINUTES PERCENT',
        '[END COURSE HEADER]',
        '',
        '[COURSE DATA]'
    ].join('\n');

    const dataPoints = generateWorkoutDataPoints(workoutData, 'percent');
    const courseData = dataPoints.map(point => 
        `${(point.time / 60).toFixed(2)}\t${Math.round(point.power * 100)}`
    ).join('\n');

    return header + '\n' + courseData + '\n[END COURSE DATA]';
}

// Test 1: Data Point Generation
try {
    const dataPoints = generateWorkoutDataPoints(mockWorkoutData, 'percent');
    
    const hasValidPoints = dataPoints.every(point => 
        typeof point.time === 'number' && 
        typeof point.power === 'number' &&
        point.time >= 0 &&
        point.power >= 0
    );

    const isChronological = dataPoints.every((point, index) => 
        index === 0 || point.time >= dataPoints[index - 1].time
    );

    if (hasValidPoints && isChronological && dataPoints.length > 0) {
        console.log('✅ Data Point Generation: PASS');
        console.log(`   Generated ${dataPoints.length} valid, chronological data points`);
    } else {
        console.log('❌ Data Point Generation: FAIL');
        console.log(`   Valid: ${hasValidPoints}, Chronological: ${isChronological}, Count: ${dataPoints.length}`);
    }
} catch (error) {
    console.log('❌ Data Point Generation: FAIL -', error.message);
}

// Test 2: ERG Generation
try {
    const ftp = 250;
    const ergContent = generateERGContent(mockWorkoutData, ftp);
    
    const lines = ergContent.split('\n');
    const hasHeader = lines.some(line => line.includes('[COURSE HEADER]'));
    const hasFTP = lines.some(line => line.includes('FTP=250'));
    const hasMinutesWatts = lines.some(line => line.includes('MINUTES\tWATTS'));
    const hasDataSection = lines.some(line => line.includes('[COURSE DATA]'));
    
    // Check for data points
    const dataLines = lines.filter(line => {
        const parts = line.split('\t');
        return parts.length === 2 && !isNaN(parseFloat(parts[0])) && !isNaN(parseInt(parts[1]));
    });

    if (hasHeader && hasFTP && hasMinutesWatts && hasDataSection && dataLines.length > 0) {
        console.log('✅ ERG Generation: PASS');
        console.log(`   Generated ${dataLines.length} data points`);
        console.log('   Sample ERG content:');
        console.log('   ' + lines.slice(0, 12).join('\n   '));
    } else {
        console.log('❌ ERG Generation: FAIL - Missing required elements');
    }
} catch (error) {
    console.log('❌ ERG Generation: FAIL -', error.message);
}

// Test 3: MRC Generation
try {
    const mrcContent = generateMRCContent(mockWorkoutData);
    
    const lines = mrcContent.split('\n');
    const hasHeader = lines.some(line => line.includes('[COURSE HEADER]'));
    const hasMinutesPercent = lines.some(line => line.includes('MINUTES PERCENT'));
    const hasDataSection = lines.some(line => line.includes('[COURSE DATA]'));
    
    // Check for data points
    const dataLines = lines.filter(line => {
        const parts = line.split('\t');
        return parts.length === 2 && !isNaN(parseFloat(parts[0])) && !isNaN(parseInt(parts[1]));
    });

    if (hasHeader && hasMinutesPercent && hasDataSection && dataLines.length > 0) {
        console.log('✅ MRC Generation: PASS');
        console.log(`   Generated ${dataLines.length} data points`);
        console.log('   Sample MRC content:');
        console.log('   ' + lines.slice(0, 12).join('\n   '));
    } else {
        console.log('❌ MRC Generation: FAIL - Missing required elements');
    }
} catch (error) {
    console.log('❌ MRC Generation: FAIL -', error.message);
}

// Test 4: Power Value Conversion
try {
    const ftp = 250;
    const dataPoints = generateWorkoutDataPoints(mockWorkoutData, 'watts');
    
    // Check that power values are reasonable
    const powerValues = dataPoints.map(p => p.power * ftp);
    const minPower = Math.min(...powerValues);
    const maxPower = Math.max(...powerValues);
    
    if (minPower >= 0 && maxPower <= 500 && powerValues.length > 0) {
        console.log('✅ Power Value Conversion: PASS');
        console.log(`   Power range: ${minPower}W - ${maxPower}W`);
    } else {
        console.log('❌ Power Value Conversion: FAIL');
        console.log(`   Invalid power range: ${minPower}W - ${maxPower}W`);
    }
} catch (error) {
    console.log('❌ Power Value Conversion: FAIL -', error.message);
}

console.log('\n✅ All tests completed!');