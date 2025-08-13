export function generateERGContent(workoutData, ftp) {
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
    '[COURSE DATA]',
  ].join('\n');

  const dataPoints = generateWorkoutDataPoints(workoutData, 'watts', ftp);
  const courseData = dataPoints
    .map(point => `${(point.time / 60).toFixed(2)}\t${Math.round(point.power)}`)
    .join('\n');

  const textCues = generateTextCues(workoutData);

  let content = `${header  }\n${  courseData  }\n[END COURSE DATA]`;

  if (textCues.length > 0) {
    content +=
      `\n\n[COURSE TEXT]\n${  textCues.join('\n')  }\n[END COURSE TEXT]`;
  }

  return content;
}

export function generateMRCContent(workoutData) {
  const header = [
    '[COURSE HEADER]',
    'VERSION = 2',
    'UNITS = ENGLISH',
    `DESCRIPTION = ${workoutData.description}`,
    `FILE NAME = ${workoutData.name}.mrc`,
    'MINUTES PERCENT',
    '[END COURSE HEADER]',
    '',
    '[COURSE DATA]',
  ].join('\n');

  const dataPoints = generateWorkoutDataPoints(workoutData, 'percent');
  const courseData = dataPoints
    .map(point => `${(point.time / 60).toFixed(2)}\t${Math.round(point.power)}`)
    .join('\n');

  const textCues = generateTextCues(workoutData);

  let content = `${header  }\n${  courseData  }\n[END COURSE DATA]`;

  if (textCues.length > 0) {
    content +=
      `\n\n[COURSE TEXT]\n${  textCues.join('\n')  }\n[END COURSE TEXT]`;
  }

  return content;
}

function generateWorkoutDataPoints(workoutData, format, ftp = 250) {
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
      points.push({
        time: startTime,
        power: format === 'watts' ? 0.5 * ftp : 50,
      }); // Easy spinning
    }

    if (
      segment.type === 'Warmup' ||
      segment.type === 'Cooldown' ||
      segment.type === 'Ramp'
    ) {
      // Add start and end points for ramps
      points.push({
        time: startTime,
        power:
          format === 'watts' ? segment.powerLow * ftp : segment.powerLow * 100,
      });
      points.push({
        time: endTime,
        power:
          format === 'watts'
            ? segment.powerHigh * ftp
            : segment.powerHigh * 100,
      });
    } else {
      // Steady state or intervals
      const power = segment.power || 0.6;
      points.push({
        time: startTime,
        power: format === 'watts' ? power * ftp : power * 100,
      });
      points.push({
        time: endTime,
        power: format === 'watts' ? power * ftp : power * 100,
      });
    }

    currentTime = endTime;
  });

  return points;
}

function generateTextCues(workoutData) {
  const textCues = [];

  // Flatten all segments and extract text events
  const allSegments = [];
  workoutData.segments.forEach(segment => {
    if (Array.isArray(segment)) {
      allSegments.push(...segment);
    } else {
      allSegments.push(segment);
    }
  });

  // Add basic text cues for each segment
  allSegments.forEach(segment => {
    const startTimeSeconds = segment.startTime;
    let message = '';

    switch (segment.type) {
      case 'Warmup':
        message = 'Warmup - gradually increase effort';
        break;
      case 'Cooldown':
        message = 'Cooldown - gradually decrease effort';
        break;
      case 'SteadyState':
        message = `Steady effort at ${Math.round(segment.power * 100)}% FTP`;
        break;
      case 'Interval (On)':
        message = `Interval ON - ${Math.round(segment.power * 100)}% FTP`;
        break;
      case 'Interval (Off)':
        message = `Recovery - ${Math.round(segment.power * 100)}% FTP`;
        break;
      case 'Ramp':
        message = `Ramp from ${Math.round(segment.powerLow * 100)}% to ${Math.round(segment.powerHigh * 100)}% FTP`;
        break;
      case 'FreeRide':
        message = 'Free ride - choose your own effort';
        break;
    }

    if (message) {
      textCues.push(`${startTimeSeconds}\t${message}\t10`);
    }
  });

  return textCues;
}

export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateZWOContent(workoutData) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<workout_file>\n';
  xml += `    <author>${escapeXml(workoutData.author)}</author>\n`;
  xml += `    <name>${escapeXml(workoutData.name)}</name>\n`;
  xml += `    <description>${escapeXml(workoutData.description)}</description>\n`;
  xml += `    <sportType>${workoutData.sportType}</sportType>\n`;
  xml += '    <workout>\n';

  workoutData.segments.forEach(segment => {
    xml += generateSegmentXML(segment);
  });

  xml += '    </workout>\n';
  xml += '</workout_file>';

  return xml;
}

function generateSegmentXML(segment) {
  let xml = '';

  // Handle arrays of segments (intervals)
  if (Array.isArray(segment)) {
    segment.forEach(subSegment => {
      xml += generateSegmentXML(subSegment);
    });
    return xml;
  }

  const duration = segment.duration;

  switch (segment.type.toLowerCase()) {
    case 'warmup':
      xml += `        <Warmup Duration="${duration}" PowerLow="${segment.powerLow}" PowerHigh="${segment.powerHigh}"/>\n`;
      break;
    case 'cooldown':
      xml += `        <Cooldown Duration="${duration}" PowerLow="${segment.powerLow}" PowerHigh="${segment.powerHigh}"/>\n`;
      break;
    case 'steadystate':
      xml += `        <SteadyState Duration="${duration}" Power="${segment.power}"/>\n`;
      break;
    case 'interval (on)':
      xml += `        <SteadyState Duration="${duration}" Power="${segment.power}"/>\n`;
      break;
    case 'interval (off)':
      xml += `        <SteadyState Duration="${duration}" Power="${segment.power}"/>\n`;
      break;
    case 'intervals':
      xml += `        <IntervalsT Repeat="${segment.repeat || 1}" OnDuration="${segment.onDuration}" OffDuration="${segment.offDuration}" PowerOn="${segment.onPower}" PowerOff="${segment.offPower}"/>\n`;
      break;
    case 'ramp':
      xml += `        <Ramp Duration="${duration}" PowerLow="${segment.powerLow}" PowerHigh="${segment.powerHigh}"/>\n`;
      break;
    default:
      console.warn(`Unknown segment type: ${segment.type}`, segment);
      xml += `        <SteadyState Duration="${duration}" Power="${segment.power || 0.6}"/>\n`;
  }

  return xml;
}

function escapeXml(text) {
  if (!text) return '';
  return text
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
