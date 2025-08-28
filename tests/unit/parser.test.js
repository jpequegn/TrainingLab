import { describe, it, expect, beforeEach } from 'vitest';
import { parseWorkoutXML } from '../../parser.js';
import { sampleWorkouts } from '../fixtures/sample-workouts.js';

describe('parseWorkoutXML', () => {
  let parser;

  beforeEach(() => {
    parser = new DOMParser();
  });

  describe('Basic parsing functionality', () => {
    it('should parse a simple workout correctly', () => {
      const xmlDoc = parser.parseFromString(sampleWorkouts.simple, 'text/xml');
      const workout = parseWorkoutXML(xmlDoc);

      expect(workout.name).toBe('Simple Test Workout');
      expect(workout.author).toBe('Test Author');
      expect(workout.description).toBe('A simple workout for testing');
      expect(workout.sportType).toBe('bike');
      expect(workout.segments).toHaveLength(3);
      expect(workout.totalDuration).toBe(1200); // 300 + 600 + 300
    });

    it('should parse complex workout with intervals', () => {
      const xmlDoc = parser.parseFromString(sampleWorkouts.complex, 'text/xml');
      const workout = parseWorkoutXML(xmlDoc);

      expect(workout.name).toBe('Complex Test Workout');
      expect(workout.segments).toHaveLength(5); // SteadyState, IntervalsT array, SteadyState, Ramp, SteadyState
      expect(workout.totalDuration).toBeGreaterThan(0);

      // Check that intervals are properly nested
      expect(Array.isArray(workout.segments[1])).toBe(true); // IntervalsT creates array
    });

    it('should handle empty workout', () => {
      const xmlDoc = parser.parseFromString(sampleWorkouts.empty, 'text/xml');
      const workout = parseWorkoutXML(xmlDoc);

      expect(workout.name).toBe('Empty Workout');
      expect(workout.segments).toHaveLength(0);
      expect(workout.totalDuration).toBe(0);
    });
  });

  describe('Error handling', () => {
    it('should throw error for invalid XML structure', () => {
      const invalidXml = '<invalid>test</invalid>';
      const xmlDoc = parser.parseFromString(invalidXml, 'text/xml');

      expect(() => parseWorkoutXML(xmlDoc)).toThrow(
        'Invalid workout file format'
      );
    });

    it('should throw error for missing workout element', () => {
      const xmlWithoutWorkout = `<?xml version="1.0"?>
                <workout_file>
                    <name>Test</name>
                </workout_file>`;
      const xmlDoc = parser.parseFromString(xmlWithoutWorkout, 'text/xml');

      expect(() => parseWorkoutXML(xmlDoc)).toThrow('No workout element found');
    });

    it('should handle XML parsing errors', () => {
      const malformedXml = '<workout_file><name>Test</workout_file>'; // Missing closing tag
      const xmlDoc = parser.parseFromString(malformedXml, 'text/xml');

      // DOMParser creates parsererror element for malformed XML
      const hasParseError = xmlDoc.querySelector('parsererror');
      if (hasParseError) {
        expect(() => parseWorkoutXML(xmlDoc)).toThrow();
      }
    });
  });

  describe('Segment type parsing', () => {
    it('should parse SteadyState segments correctly', () => {
      const xml = `<?xml version="1.0"?>
                <workout_file>
                    <name>SteadyState Test</name>
                    <workout>
                        <SteadyState Duration="300" Power="0.75" />
                    </workout>
                </workout_file>`;
      const xmlDoc = parser.parseFromString(xml, 'text/xml');
      const workout = parseWorkoutXML(xmlDoc);

      expect(workout.segments[0].type).toBe('SteadyState');
      expect(workout.segments[0].duration).toBe(300);
      expect(workout.segments[0].power).toBe(0.75);
      expect(workout.segments[0].powerData).toBeDefined();
    });

    it('should parse Warmup segments correctly', () => {
      const xml = `<?xml version="1.0"?>
                <workout_file>
                    <name>Warmup Test</name>
                    <workout>
                        <Warmup Duration="600" PowerLow="0.4" PowerHigh="0.6" />
                    </workout>
                </workout_file>`;
      const xmlDoc = parser.parseFromString(xml, 'text/xml');
      const workout = parseWorkoutXML(xmlDoc);

      expect(workout.segments[0].type).toBe('Warmup');
      expect(workout.segments[0].duration).toBe(600);
      expect(workout.segments[0].powerLow).toBe(0.4);
      expect(workout.segments[0].powerHigh).toBe(0.6);
    });

    it('should parse Ramp segments correctly', () => {
      const xml = `<?xml version="1.0"?>
                <workout_file>
                    <name>Ramp Test</name>
                    <workout>
                        <Ramp Duration="300" PowerLow="0.5" PowerHigh="1.2" />
                    </workout>
                </workout_file>`;
      const xmlDoc = parser.parseFromString(xml, 'text/xml');
      const workout = parseWorkoutXML(xmlDoc);

      expect(workout.segments[0].type).toBe('Ramp');
      expect(workout.segments[0].powerLow).toBe(0.5);
      expect(workout.segments[0].powerHigh).toBe(1.2);
    });

    it('should parse IntervalsT segments correctly', () => {
      const xml = `<?xml version="1.0"?>
                <workout_file>
                    <name>Intervals Test</name>
                    <workout>
                        <IntervalsT Repeat="3" OnDuration="30" OffDuration="30" OnPower="1.2" OffPower="0.4" />
                    </workout>
                </workout_file>`;
      const xmlDoc = parser.parseFromString(xml, 'text/xml');
      const workout = parseWorkoutXML(xmlDoc);

      // IntervalsT creates multiple segments
      expect(Array.isArray(workout.segments[0])).toBe(true);
      expect(workout.segments[0]).toHaveLength(5); // 3 on + 2 off intervals
    });

    it('should handle unknown segment types gracefully', () => {
      const xml = `<?xml version="1.0"?>
                <workout_file>
                    <name>Unknown Segment Test</name>
                    <workout>
                        <UnknownSegment Duration="300" />
                        <SteadyState Duration="300" Power="0.6" />
                    </workout>
                </workout_file>`;
      const xmlDoc = parser.parseFromString(xml, 'text/xml');
      const workout = parseWorkoutXML(xmlDoc);

      // Should only include known segments
      expect(workout.segments).toHaveLength(1);
      expect(workout.segments[0].type).toBe('SteadyState');
    });
  });

  describe('Default values', () => {
    it('should use default values for missing attributes', () => {
      const xml = `<?xml version="1.0"?>
                <workout_file>
                    <workout>
                        <SteadyState Duration="300" />
                    </workout>
                </workout_file>`;
      const xmlDoc = parser.parseFromString(xml, 'text/xml');
      const workout = parseWorkoutXML(xmlDoc);

      expect(workout.name).toBe('Unnamed Workout');
      expect(workout.description).toBe('No description');
      expect(workout.author).toBe('Unknown');
      expect(workout.sportType).toBe('bike');
      expect(workout.segments[0].power).toBe(0.6); // Default power
    });

    it('should handle missing duration gracefully', () => {
      const xml = `<?xml version="1.0"?>
                <workout_file>
                    <name>Missing Duration Test</name>
                    <workout>
                        <SteadyState Power="0.8" />
                    </workout>
                </workout_file>`;
      const xmlDoc = parser.parseFromString(xml, 'text/xml');
      const workout = parseWorkoutXML(xmlDoc);

      expect(workout.segments[0].duration).toBe(0);
      expect(workout.totalDuration).toBe(0);
    });
  });

  describe('Data integrity', () => {
    it('should maintain segment order', () => {
      const xmlDoc = parser.parseFromString(sampleWorkouts.simple, 'text/xml');
      const workout = parseWorkoutXML(xmlDoc);

      expect(workout.segments[0].power).toBe(0.5);
      expect(workout.segments[1].power).toBe(0.8);
      expect(workout.segments[2].power).toBe(0.5);
    });

    it('should calculate total duration correctly', () => {
      const xmlDoc = parser.parseFromString(sampleWorkouts.simple, 'text/xml');
      const workout = parseWorkoutXML(xmlDoc);

      const expectedDuration = workout.segments.reduce((sum, segment) => {
        return (
          sum +
          (Array.isArray(segment)
            ? segment.reduce((s, seg) => s + seg.duration, 0)
            : segment.duration)
        );
      }, 0);

      expect(workout.totalDuration).toBe(expectedDuration);
    });

    it('should generate power data for all segments', () => {
      const xmlDoc = parser.parseFromString(sampleWorkouts.simple, 'text/xml');
      const workout = parseWorkoutXML(xmlDoc);

      workout.segments.forEach(segment => {
        if (Array.isArray(segment)) {
          segment.forEach(seg => {
            expect(seg.powerData).toBeDefined();
            expect(Array.isArray(seg.powerData)).toBe(true);
          });
        } else {
          expect(segment.powerData).toBeDefined();
          expect(Array.isArray(segment.powerData)).toBe(true);
        }
      });
    });
  });
});
