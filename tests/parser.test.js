
import { describe, it, expect } from 'vitest';
import { parseWorkoutXML } from '../parser.js';

describe('parseWorkoutXML', () => {
  it('should parse a simple workout', () => {
    const xml = `
      <workout_file>
        <author>Test Author</author>
        <name>Test Workout</name>
        <description>Test Description</description>
        <sportType>bike</sportType>
        <workout>
          <SteadyState Duration="60" Power="0.5" />
        </workout>
      </workout_file>
    `;
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, 'text/xml');
    const workout = parseWorkoutXML(xmlDoc);

    expect(workout.name).toBe('Test Workout');
    expect(workout.author).toBe('Test Author');
    expect(workout.description).toBe('Test Description');
    expect(workout.sportType).toBe('bike');
    expect(workout.segments.length).toBe(1);
    expect(workout.totalDuration).toBe(60);

    const segment = workout.segments[0];
    expect(segment.type).toBe('SteadyState');
    expect(segment.duration).toBe(60);
    expect(segment.power).toBe(0.5);
  });
});
