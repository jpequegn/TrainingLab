
import { describe, it, expect } from 'vitest';
import { calculateTSS, formatDuration } from '../workout.js';

describe('calculateTSS', () => {
    it('should calculate TSS for a simple workout', () => {
        const workout = {
            segments: [
                {
                    type: 'SteadyState',
                    duration: 3600,
                    power: 1.0,
                },
            ],
            totalDuration: 3600,
        };

        const tss = calculateTSS(workout);
        expect(tss).toBe(100);
    });

    it('should return 0 for an empty workout', () => {
        const workout = {
            segments: [],
            totalDuration: 0,
        };

        const tss = calculateTSS(workout);
        expect(tss).toBe(0);
    });
});

describe('formatDuration', () => {
    it('should format seconds into a human-readable string', () => {
        expect(formatDuration(60)).toBe('1:00');
        expect(formatDuration(90)).toBe('1:30');
        expect(formatDuration(3600)).toBe('1:00:00');
        expect(formatDuration(3661)).toBe('1:01:01');
    });
});
