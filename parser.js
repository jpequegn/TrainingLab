
import { generateSteadyData, generateRampData } from './workout.js';


export function parseWorkoutXML(xmlDoc) {
    const workoutFile = xmlDoc.querySelector('workout_file');
    if (!workoutFile) {
        throw new Error('Invalid workout file format');
    }

    const workout = {
        name: getElementText(workoutFile, 'name') || 'Unnamed Workout',
        description: getElementText(workoutFile, 'description') || 'No description',
        author: getElementText(workoutFile, 'author') || 'Unknown',
        sportType: getElementText(workoutFile, 'sportType') || 'bike',
        segments: [],
        totalDuration: 0
    };

    const workoutElement = workoutFile.querySelector('workout');
    if (!workoutElement) {
        throw new Error('No workout element found');
    }

    const segments = workoutElement.children;
    let currentTime = 0;

    for (const segment of segments) {
        const segmentData = parseSegment(segment, currentTime);
        if (segmentData) {
            if (Array.isArray(segmentData)) {
                // Handle intervals which return an array
                workout.segments.push(segmentData);
                // Calculate total duration for all intervals
                const totalIntervalDuration = segmentData.reduce((sum, interval) => sum + interval.duration, 0);
                currentTime += totalIntervalDuration;
            } else {
                // Handle single segments
                workout.segments.push(segmentData);
                currentTime += segmentData.totalDuration;
            }
        }
    }

    workout.totalDuration = currentTime;
    return workout;
}

function parseSegment(segment, startTime) {
    const tagName = segment.tagName;
    const duration = parseInt(segment.getAttribute('Duration')) || 0;
    
    const segmentData = {
        type: tagName,
        startTime: startTime,
        duration: duration,
        totalDuration: duration,
        powerData: []
    };

    switch (tagName) {
    case 'Warmup':
    case 'Cooldown':
        segmentData.powerLow = parseFloat(segment.getAttribute('PowerLow')) || 0.5;
        segmentData.powerHigh = parseFloat(segment.getAttribute('PowerHigh')) || 0.7;
        segmentData.powerData = generateRampData(segmentData);
        break;

    case 'SteadyState':
        segmentData.power = parseFloat(segment.getAttribute('Power')) || 0.6;
        segmentData.powerData = generateSteadyData(segmentData);
        break;

    case 'IntervalsT':
        return parseIntervals(segment, startTime);

    case 'Ramp':
        segmentData.powerLow = parseFloat(segment.getAttribute('PowerLow')) || 0.5;
        segmentData.powerHigh = parseFloat(segment.getAttribute('PowerHigh')) || 1.0;
        segmentData.powerData = generateRampData(segmentData);
        break;

    case 'FreeRide':
        segmentData.power = 0.6; // Default for free ride
        segmentData.powerData = generateSteadyData(segmentData);
        break;

    default:
        return null;
    }

    return segmentData;
}

function parseIntervals(segment, startTime) {
    const repeat = parseInt(segment.getAttribute('Repeat')) || 1;
    const onDuration = parseInt(segment.getAttribute('OnDuration')) || 60;
    const offDuration = parseInt(segment.getAttribute('OffDuration')) || 60;
    const powerOn = parseFloat(segment.getAttribute('PowerOn')) || 1.0;
    const powerOff = parseFloat(segment.getAttribute('PowerOff')) || 0.5;

    const intervals = [];
    let currentTime = startTime;

    for (let i = 0; i < repeat; i++) {
        // On interval
        intervals.push({
            type: 'Interval (On)',
            startTime: currentTime,
            duration: onDuration,
            totalDuration: onDuration,
            power: powerOn,
            powerData: generateSteadyData({
                startTime: currentTime,
                duration: onDuration,
                power: powerOn
            })
        });
        currentTime += onDuration;

        // Off interval (recovery) - only add if not the last interval or if offDuration > 0
        if (i < repeat - 1 && offDuration > 0) {
            intervals.push({
                type: 'Interval (Off)',
                startTime: currentTime,
                duration: offDuration,
                totalDuration: offDuration,
                power: powerOff,
                powerData: generateSteadyData({
                    startTime: currentTime,
                    duration: offDuration,
                    power: powerOff
                })
            });
            currentTime += offDuration;
        }
    }

    return intervals;
}



function getElementText(parent, tagName) {
    const element = parent.querySelector(tagName);
    return element ? element.textContent.trim() : null;
}
