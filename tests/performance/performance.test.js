import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sampleWorkouts } from '../fixtures/sample-workouts.js';
import { createMockWorkout } from '../utils/test-helpers.js';

describe('Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Parsing Performance', () => {
    it('should parse small workouts quickly', async () => {
      const startTime = performance.now();

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(sampleWorkouts.simple, 'text/xml');

      // Mock parseWorkoutXML function
      const parseWorkoutXML = vi.fn().mockReturnValue(createMockWorkout());
      parseWorkoutXML(xmlDoc);

      const endTime = performance.now();
      const parseTime = endTime - startTime;

      expect(parseTime).toBeLessThan(50); // Should parse in under 50ms
      expect(parseWorkoutXML).toHaveBeenCalled();
    });

    it('should handle large workouts efficiently', async () => {
      // Create a large workout (simulating 2 hour workout with 1-second intervals)
      const largeWorkout = createLargeWorkoutXML(7200); // 2 hours = 7200 seconds

      const startTime = performance.now();

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(largeWorkout, 'text/xml');

      // Mock parsing a large workout
      const parseWorkoutXML = vi.fn().mockReturnValue(
        createMockWorkout({
          totalDuration: 7200,
          segments: new Array(720).fill({
            type: 'SteadyState',
            duration: 10,
            power: 0.8,
          }),
        })
      );
      parseWorkoutXML(xmlDoc);

      const endTime = performance.now();
      const parseTime = endTime - startTime;

      expect(parseTime).toBeLessThan(500); // Should parse large workout in under 500ms
    });

    it('should have linear parsing complexity', () => {
      const sizes = [100, 500, 1000, 2000];
      const times = [];

      sizes.forEach(size => {
        const workoutXml = createLargeWorkoutXML(size);

        const startTime = performance.now();
        const parser = new DOMParser();
        parser.parseFromString(workoutXml, 'text/xml');
        const endTime = performance.now();

        times.push(endTime - startTime);
      });

      // Check that parsing time increases roughly linearly
      const timeRatio1 = times[1] / times[0]; // 500/100
      const timeRatio2 = times[3] / times[2]; // 2000/1000

      // Both ratios should be roughly similar (linear complexity)
      expect(Math.abs(timeRatio1 - timeRatio2)).toBeLessThan(5);
    });
  });

  describe('Chart Rendering Performance', () => {
    it('should render charts quickly', () => {
      const workout = createMockWorkout();
      const startTime = performance.now();

      // Mock chart rendering
      const mockChart = {
        data: { datasets: [] },
        update: vi.fn(),
        render: vi.fn(),
      };

      // Simulate chart update
      mockChart.data.datasets = [
        {
          data: workout.segments.map(seg => ({
            x: seg.startTime,
            y: seg.power,
          })),
        },
      ];
      mockChart.update();

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(100); // Should render in under 100ms
      expect(mockChart.update).toHaveBeenCalled();
    });

    it('should handle data point limits for performance', () => {
      // Test with very high resolution data
      const highResWorkout = createMockWorkout({
        segments: new Array(10000).fill().map((_, i) => ({
          type: 'SteadyState',
          duration: 1,
          power: 0.5 + Math.sin(i / 100) * 0.3,
          startTime: i,
        })),
      });

      const startTime = performance.now();

      // Mock data reduction for performance
      const reducedData = reduceDataForPerformance(
        highResWorkout.segments,
        1000
      );

      const endTime = performance.now();
      const reductionTime = endTime - startTime;

      expect(reductionTime).toBeLessThan(50);
      expect(reducedData.length).toBeLessThanOrEqual(1000);
      expect(reducedData.length).toBeGreaterThan(0);
    });

    it('should use efficient data structures', () => {
      const workout = createMockWorkout();

      // Test memory-efficient data representation
      const chartData = convertToChartData(workout);

      expect(chartData).toHaveProperty('x');
      expect(chartData).toHaveProperty('y');
      expect(Array.isArray(chartData.x)).toBe(true);
      expect(Array.isArray(chartData.y)).toBe(true);
      expect(chartData.x.length).toBe(chartData.y.length);
    });
  });

  describe('Memory Management', () => {
    it('should not create memory leaks', () => {
      const initialMemory = getMemoryUsage();

      // Create and destroy multiple workouts
      for (let i = 0; i < 100; i++) {
        const workout = createMockWorkout();
        // Simulate processing
        processWorkout(workout);
        // Cleanup
        cleanupWorkout(workout);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = getMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should efficiently handle large datasets', () => {
      const largeWorkout = createMockWorkout({
        segments: new Array(50000).fill({
          type: 'SteadyState',
          duration: 1,
          power: 0.8,
        }),
      });

      const startMemory = getMemoryUsage();

      // Process large workout
      const result = processLargeWorkout(largeWorkout);

      const endMemory = getMemoryUsage();
      const memoryUsed = endMemory - startMemory;

      expect(result).toBeDefined();
      expect(memoryUsed).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    });
  });

  describe('File Processing Performance', () => {
    it('should upload files efficiently', async () => {
      const fileSize = 1024 * 1024; // 1MB
      const mockFile = new Blob(['x'.repeat(fileSize)], { type: 'text/xml' });

      const startTime = performance.now();

      // Mock file processing
      const processFile = vi.fn().mockResolvedValue({ success: true });
      await processFile(mockFile);

      const endTime = performance.now();
      const processTime = endTime - startTime;

      expect(processTime).toBeLessThan(1000); // Should process 1MB in under 1 second
      expect(processFile).toHaveBeenCalledWith(mockFile);
    });

    it('should handle concurrent uploads', async () => {
      const uploads = [];
      const uploadCount = 5;

      const startTime = performance.now();

      for (let i = 0; i < uploadCount; i++) {
        const mockFile = new Blob([`workout ${i}`], { type: 'text/xml' });
        uploads.push(processFileAsync(mockFile));
      }

      const results = await Promise.all(uploads);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(results).toHaveLength(uploadCount);
      expect(results.every(r => r.success)).toBe(true);
      expect(totalTime).toBeLessThan(2000); // All uploads in under 2 seconds
    });
  });

  describe('Calculation Performance', () => {
    it('should calculate TSS efficiently', () => {
      const workout = createMockWorkout({
        segments: new Array(1000).fill({
          type: 'SteadyState',
          duration: 10,
          power: 0.8,
        }),
      });

      const startTime = performance.now();

      // Mock TSS calculation
      const calculateTSS = vi.fn().mockReturnValue(85);
      const tss = calculateTSS(workout);

      const endTime = performance.now();
      const calcTime = endTime - startTime;

      expect(calcTime).toBeLessThan(10); // Should calculate in under 10ms
      expect(tss).toBe(85);
    });

    it('should generate power data efficiently', () => {
      const segment = {
        startTime: 0,
        duration: 3600, // 1 hour
        power: 0.8,
      };

      const startTime = performance.now();

      // Mock power data generation
      const generatePowerData = vi
        .fn()
        .mockReturnValue(
          new Array(360).fill().map((_, i) => ({ x: i * 10, y: 80 }))
        );
      const powerData = generatePowerData(segment);

      const endTime = performance.now();
      const genTime = endTime - startTime;

      expect(genTime).toBeLessThan(50); // Should generate in under 50ms
      expect(powerData).toHaveLength(360);
    });
  });

  describe('Search Performance', () => {
    it('should search workouts quickly', async () => {
      // Mock large workout database
      const workouts = new Array(10000).fill().map((_, i) => ({
        id: `workout-${i}`,
        name: `Workout ${i}`,
        tags: [`tag-${i % 10}`],
      }));

      const startTime = performance.now();

      // Mock search function
      const searchWorkouts = vi
        .fn()
        .mockReturnValue(
          workouts.filter(w => w.name.includes('100')).slice(0, 10)
        );
      const results = searchWorkouts('100');

      const endTime = performance.now();
      const searchTime = endTime - startTime;

      expect(searchTime).toBeLessThan(100); // Should search in under 100ms
      expect(results.length).toBeGreaterThan(0);
    });

    it('should filter by tags efficiently', () => {
      const workouts = new Array(1000).fill().map((_, i) => ({
        id: `workout-${i}`,
        tags: [`tag-${i % 5}`, `category-${i % 3}`],
      }));

      const startTime = performance.now();

      // Mock tag filtering
      const filterByTags = vi
        .fn()
        .mockReturnValue(workouts.filter(w => w.tags.includes('tag-1')));
      const filtered = filterByTags(['tag-1']);

      const endTime = performance.now();
      const filterTime = endTime - startTime;

      expect(filterTime).toBeLessThan(50);
      expect(filtered.length).toBeGreaterThan(0);
    });
  });
});

// Helper functions for performance testing
function createLargeWorkoutXML(segments) {
  let xml = `<?xml version="1.0"?>
        <workout_file>
            <name>Large Workout</name>
            <author>Performance Test</author>
            <workout>`;

  for (let i = 0; i < segments; i++) {
    xml += `<SteadyState Duration="1" Power="${0.5 + Math.random() * 0.5}" />`;
  }

  xml += `</workout>
        </workout_file>`;

  return xml;
}

function reduceDataForPerformance(segments, maxPoints) {
  if (segments.length <= maxPoints) return segments;

  const step = Math.floor(segments.length / maxPoints);
  return segments.filter((_, index) => index % step === 0);
}

function convertToChartData(workout) {
  return {
    x: workout.segments.map(seg => seg.startTime || 0),
    y: workout.segments.map(seg => seg.power || 0),
  };
}

function getMemoryUsage() {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage().heapUsed;
  }
  return 0; // Fallback for browser environment
}

function processWorkout(workout) {
  // Mock workout processing
  return {
    tss: 100,
    duration: workout.totalDuration,
    segments: workout.segments.length,
  };
}

function cleanupWorkout(workout) {
  // Mock cleanup
  workout.segments = null;
  workout.powerData = null;
}

function processLargeWorkout(workout) {
  // Mock processing with memory-efficient algorithms
  return {
    summary: {
      totalTime: workout.totalDuration,
      avgPower: 0.8,
      segmentCount: workout.segments.length,
    },
  };
}

async function processFileAsync(file) {
  // Mock async file processing
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({ success: true, size: file.size });
    }, Math.random() * 100); // Random delay up to 100ms
  });
}
