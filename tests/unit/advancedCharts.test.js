/**
 * Advanced Charts Test Suite
 * Comprehensive tests for advanced chart visualizations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { advancedCharts } from '../../src/utils/advancedCharts.js';

// Mock dependencies
vi.mock('d3', () => ({
  select: vi.fn(),
  selectAll: vi.fn(),
  scaleLinear: vi.fn(() => ({
    domain: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
  })),
  scaleLog: vi.fn(() => ({
    domain: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
  })),
  scaleBand: vi.fn(() => ({
    domain: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    paddingInner: vi.fn().mockReturnThis(),
    bandwidth: vi.fn(() => 20),
  })),
  scaleOrdinal: vi.fn(() => ({
    domain: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
  })),
  scaleSequential: vi.fn(() => ({
    domain: vi.fn().mockReturnThis(),
  })),
  pie: vi.fn(() => vi.fn()),
  arc: vi.fn(() => vi.fn()),
  line: vi.fn(() => vi.fn()),
  axisBottom: vi.fn(() => vi.fn()),
  axisLeft: vi.fn(() => vi.fn()),
  axisTop: vi.fn(() => vi.fn()),
  timeDays: vi.fn(() => []),
  timeWeek: { count: vi.fn(() => 0) },
  timeMonths: vi.fn(() => []),
  timeFormat: vi.fn(() => vi.fn()),
  sum: vi.fn(() => 100),
  max: vi.fn(() => 100),
  extent: vi.fn(() => [0, 100]),
  interpolate: vi.fn(),
  interpolateViridis: vi.fn(),
  interpolateRdYlBu: vi.fn(),
  range: vi.fn(() => []),
}));

vi.mock('three', () => ({
  Scene: vi.fn(() => ({
    add: vi.fn(),
    clear: vi.fn(),
  })),
  PerspectiveCamera: vi.fn(() => ({
    position: { set: vi.fn() },
    lookAt: vi.fn(),
    aspect: 1,
    updateProjectionMatrix: vi.fn(),
  })),
  WebGLRenderer: vi.fn(() => ({
    setSize: vi.fn(),
    setClearColor: vi.fn(),
    domElement: document.createElement('canvas'),
    render: vi.fn(),
    dispose: vi.fn(),
  })),
  AmbientLight: vi.fn(),
  DirectionalLight: vi.fn(() => ({
    position: { set: vi.fn() },
  })),
  PlaneGeometry: vi.fn(() => ({
    attributes: {
      position: {
        array: new Float32Array(300),
        needsUpdate: false,
      },
    },
    computeVertexNormals: vi.fn(),
  })),
  MeshLambertMaterial: vi.fn(),
  Mesh: vi.fn(() => ({
    rotation: { z: 0 },
  })),
  GridHelper: vi.fn(),
  AxesHelper: vi.fn(),
  DoubleSide: 'double',
}));

vi.mock('jspdf', () => ({
  jsPDF: vi.fn(() => ({
    addImage: vi.fn(),
    setFontSize: vi.fn(),
    text: vi.fn(),
    save: vi.fn(),
    internal: {
      pageSize: {
        getWidth: vi.fn(() => 210),
      },
    },
  })),
}));

vi.mock('html2canvas', () => ({
  default: vi.fn(() =>
    Promise.resolve({
      toDataURL: vi.fn(() => 'data:image/png;base64,test'),
      height: 400,
      width: 800,
    })
  ),
}));

describe('AdvancedCharts', () => {
  let dom;
  let document;
  let window;

  beforeEach(() => {
    // Setup DOM
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
    window = dom.window;

    global.document = document;
    global.window = window;
    global.HTMLElement = window.HTMLElement;
    global.XMLSerializer = window.XMLSerializer;
    global.Blob = window.Blob;
    global.URL = window.URL;

    // Mock requestAnimationFrame
    global.requestAnimationFrame = vi.fn(cb => setTimeout(cb, 16));
    global.cancelAnimationFrame = vi.fn();

    // Create test container
    const container = document.createElement('div');
    container.id = 'test-chart';
    container.style.width = '800px';
    container.style.height = '400px';
    document.body.appendChild(container);
  });

  afterEach(() => {
    // Cleanup
    advancedCharts.destroyAll();
    vi.clearAllMocks();
  });

  describe('AdvancedCharts Class', () => {
    it('should initialize with correct default properties', () => {
      expect(advancedCharts.charts).toBeInstanceOf(Map);
      expect(advancedCharts.d3Charts).toBeInstanceOf(Map);
      expect(advancedCharts.threeJsScenes).toBeInstanceOf(Map);
      expect(advancedCharts.animationFrames).toBeInstanceOf(Map);
      expect(advancedCharts.defaultColors).toBeDefined();
    });

    it('should have default power zone colors defined', () => {
      const colors = advancedCharts.defaultColors;
      expect(colors.recovery).toBe('#808080');
      expect(colors.endurance).toBe('#007BFF');
      expect(colors.tempo).toBe('#28A745');
      expect(colors.threshold).toBe('#FFC107');
      expect(colors.vo2max).toBe('#FF5722');
      expect(colors.neuromuscular).toBe('#F44336');
    });
  });

  describe('3D Power Surface Plot', () => {
    const mockWorkoutData = {
      segments: [
        { duration: 300, power: 80, elevation: 100 },
        { duration: 600, power: 120, elevation: 150 },
        { duration: 300, power: 95, elevation: 120 },
      ],
    };

    it('should create 3D power surface plot successfully', async () => {
      const result = await advancedCharts.create3DPowerSurface(
        'test-chart',
        mockWorkoutData
      );

      expect(result).toBeDefined();
      expect(result.scene).toBeDefined();
      expect(result.camera).toBeDefined();
      expect(result.renderer).toBeDefined();
      expect(result.mesh).toBeDefined();
    });

    it('should throw error for invalid container', async () => {
      await expect(
        advancedCharts.create3DPowerSurface(
          'invalid-container',
          mockWorkoutData
        )
      ).rejects.toThrow('Container not found: invalid-container');
    });

    it('should apply custom options', async () => {
      const options = {
        backgroundColor: 0x333333,
        showGrid: false,
        showAxes: false,
        autoRotate: false,
      };

      const result = await advancedCharts.create3DPowerSurface(
        'test-chart',
        mockWorkoutData,
        options
      );
      expect(result).toBeDefined();
    });
  });

  describe('Heat Map Calendar', () => {
    const mockTrainingData = [
      {
        date: '2024-01-01',
        segments: [{ duration: 3600, power: 100 }],
      },
      {
        date: '2024-01-02',
        segments: [{ duration: 1800, power: 120 }],
      },
    ];

    it('should create heat map calendar successfully', () => {
      const mockD3Selection = {
        selectAll: vi.fn().mockReturnThis(),
        remove: vi.fn().mockReturnThis(),
        append: vi.fn().mockReturnThis(),
        attr: vi.fn().mockReturnThis(),
        data: vi.fn().mockReturnThis(),
        enter: vi.fn().mockReturnThis(),
        text: vi.fn().mockReturnThis(),
        on: vi.fn().mockReturnThis(),
      };

      vi.mocked(vi.importMock('d3').select).mockReturnValue(mockD3Selection);

      const result = advancedCharts.createHeatMapCalendar(
        'test-chart',
        mockTrainingData
      );
      expect(result).toBeDefined();
    });

    it('should throw error for invalid container', () => {
      vi.mocked(vi.importMock('d3').select).mockReturnValue({
        empty: vi.fn(() => true),
      });

      expect(() =>
        advancedCharts.createHeatMapCalendar(
          'invalid-container',
          mockTrainingData
        )
      ).toThrow('Container not found: invalid-container');
    });
  });

  describe('Zone Distribution Chart', () => {
    const mockWorkoutData = {
      segments: [
        { duration: 600, power: 50 }, // Recovery
        { duration: 1200, power: 70 }, // Endurance
        { duration: 300, power: 85 }, // Tempo
        { duration: 180, power: 100 }, // Threshold
      ],
    };

    it('should create zone distribution chart successfully', () => {
      const mockD3Selection = {
        selectAll: vi.fn().mockReturnThis(),
        remove: vi.fn().mockReturnThis(),
        append: vi.fn().mockReturnThis(),
        attr: vi.fn().mockReturnThis(),
        data: vi.fn().mockReturnThis(),
        enter: vi.fn().mockReturnThis(),
        text: vi.fn().mockReturnThis(),
        on: vi.fn().mockReturnThis(),
        transition: vi.fn().mockReturnThis(),
        duration: vi.fn().mockReturnThis(),
        delay: vi.fn().mockReturnThis(),
        style: vi.fn().mockReturnThis(),
        attrTween: vi.fn().mockReturnThis(),
      };

      vi.mocked(vi.importMock('d3').select).mockReturnValue(mockD3Selection);

      const result = advancedCharts.createZoneDistribution(
        'test-chart',
        mockWorkoutData
      );
      expect(result).toBeDefined();
    });

    it('should calculate zone distribution correctly', () => {
      const zoneData =
        advancedCharts.calculateZoneDistribution(mockWorkoutData);

      expect(zoneData.length).toBeGreaterThan(0);
      expect(zoneData.every(zone => zone.time > 0)).toBe(true);
      expect(
        zoneData.every(
          zone => zone.zone && zone.min !== undefined && zone.max !== undefined
        )
      ).toBe(true);
    });
  });

  describe('Animated Workout Preview', () => {
    const mockWorkoutData = {
      segments: [
        { duration: 300, power: 80 },
        { duration: 600, power: 120 },
        { duration: 300, power: 95 },
      ],
    };

    it('should create animated preview successfully', () => {
      const mockD3Selection = {
        selectAll: vi.fn().mockReturnThis(),
        remove: vi.fn().mockReturnThis(),
        append: vi.fn().mockReturnThis(),
        attr: vi.fn().mockReturnThis(),
        data: vi.fn().mockReturnThis(),
        enter: vi.fn().mockReturnThis(),
        text: vi.fn().mockReturnThis(),
        datum: vi.fn().mockReturnThis(),
        call: vi.fn().mockReturnThis(),
        style: vi.fn().mockReturnThis(),
      };

      vi.mocked(vi.importMock('d3').select).mockReturnValue(mockD3Selection);

      const result = advancedCharts.createAnimatedPreview(
        'test-chart',
        mockWorkoutData
      );

      expect(result).toBeDefined();
      expect(result.controls).toBeDefined();
      expect(result.controls.startAnimation).toBeInstanceOf(Function);
      expect(result.controls.stopAnimation).toBeInstanceOf(Function);
      expect(result.controls.resetAnimation).toBeInstanceOf(Function);
    });
  });

  describe('Power Duration Curve', () => {
    const mockWorkoutHistory = [
      {
        date: '2024-01-01',
        segments: [
          { duration: 300, power: 200 },
          { duration: 600, power: 180 },
          { duration: 1200, power: 150 },
        ],
      },
      {
        date: '2024-01-02',
        segments: [
          { duration: 300, power: 210 },
          { duration: 600, power: 190 },
          { duration: 1200, power: 160 },
        ],
      },
    ];

    it('should create power duration curve successfully', () => {
      const mockD3Selection = {
        selectAll: vi.fn().mockReturnThis(),
        remove: vi.fn().mockReturnThis(),
        append: vi.fn().mockReturnThis(),
        attr: vi.fn().mockReturnThis(),
        data: vi.fn().mockReturnThis(),
        enter: vi.fn().mockReturnThis(),
        text: vi.fn().mockReturnThis(),
        datum: vi.fn().mockReturnThis(),
        call: vi.fn().mockReturnThis(),
        on: vi.fn().mockReturnThis(),
        transition: vi.fn().mockReturnThis(),
        duration: vi.fn().mockReturnThis(),
      };

      vi.mocked(vi.importMock('d3').select).mockReturnValue(mockD3Selection);

      const result = advancedCharts.createPowerDurationCurve(
        'test-chart',
        mockWorkoutHistory
      );
      expect(result).toBeDefined();
    });

    it('should calculate power duration curve data correctly', () => {
      const durations = [5, 15, 30, 60, 300, 600, 1200];
      const curveData = advancedCharts.calculatePowerDurationCurve(
        mockWorkoutHistory,
        durations
      );

      expect(Array.isArray(curveData)).toBe(true);
      expect(curveData.length).toBeGreaterThan(0);
      expect(curveData.every(point => point.duration && point.power >= 0)).toBe(
        true
      );
    });

    it('should find best effort for given duration', () => {
      const workout = mockWorkoutHistory[0];
      const bestEffort = advancedCharts.findBestEffort(workout, 300);

      expect(typeof bestEffort).toBe('number');
      expect(bestEffort).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Comparative Heat Maps', () => {
    const mockWorkoutsData = [
      {
        name: 'Workout A',
        segments: [
          { duration: 300, power: 100 },
          { duration: 600, power: 120 },
        ],
      },
      {
        name: 'Workout B',
        segments: [
          { duration: 300, power: 110 },
          { duration: 600, power: 130 },
        ],
      },
    ];

    it('should create comparative heat maps successfully', () => {
      const mockD3Selection = {
        selectAll: vi.fn().mockReturnThis(),
        remove: vi.fn().mockReturnThis(),
        append: vi.fn().mockReturnThis(),
        attr: vi.fn().mockReturnThis(),
        data: vi.fn().mockReturnThis(),
        enter: vi.fn().mockReturnThis(),
        text: vi.fn().mockReturnThis(),
        call: vi.fn().mockReturnThis(),
        on: vi.fn().mockReturnThis(),
      };

      vi.mocked(vi.importMock('d3').select).mockReturnValue(mockD3Selection);

      const result = advancedCharts.createComparativeHeatMaps(
        'test-chart',
        mockWorkoutsData
      );
      expect(result).toBeDefined();
    });

    it('should process comparative data correctly', () => {
      const processedData =
        advancedCharts.processComparativeData(mockWorkoutsData);

      expect(Array.isArray(processedData)).toBe(true);
      expect(processedData.length).toBe(mockWorkoutsData.length);
      expect(
        processedData.every(workout => workout.name && workout.segments)
      ).toBe(true);
    });
  });

  describe('Export Functionality', () => {
    beforeEach(() => {
      // Setup mock chart for export tests
      const mockChart = {
        svg: {
          node: vi.fn(() => document.createElement('svg')),
        },
        config: { width: 800, height: 400 },
        curveData: [{ duration: 300, power: 200 }],
      };
      advancedCharts.d3Charts.set('test-chart', mockChart);
    });

    it('should export chart as SVG', () => {
      const result = advancedCharts.exportChartAsSVG('test-chart', 'test.svg');
      expect(typeof result).toBe('string');
    });

    it('should export chart data as JSON', () => {
      const result = advancedCharts.exportChartData('test-chart', 'test.json');
      expect(result).toBeDefined();
      expect(result.type).toBe('advanced-chart');
      expect(result.containerId).toBe('test-chart');
    });

    it('should handle multiple format export', async () => {
      const formats = ['svg', 'json'];
      const results = await advancedCharts.exportChartMultiple(
        'test-chart',
        'test',
        formats
      );

      expect(results).toBeDefined();
      expect(results.svg).toBeDefined();
      expect(results.json).toBeDefined();
    });
  });

  describe('Utility Methods', () => {
    it('should calculate training load correctly', () => {
      const workout = {
        segments: [
          { duration: 3600, power: 100 }, // 1 hour at 100%
          { duration: 1800, power: 120 }, // 30 min at 120%
        ],
      };

      const load = advancedCharts.calculateTrainingLoad(workout);
      expect(typeof load).toBe('number');
      expect(load).toBeGreaterThan(0);
    });

    it('should format time correctly', () => {
      expect(advancedCharts.formatTime(0)).toBe('0:00');
      expect(advancedCharts.formatTime(60)).toBe('1:00');
      expect(advancedCharts.formatTime(90)).toBe('1:30');
      expect(advancedCharts.formatTime(3661)).toBe('61:01');
    });

    it('should format duration correctly', () => {
      expect(advancedCharts.formatDuration(60)).toBe('1m');
      expect(advancedCharts.formatDuration(3600)).toBe('1h 0m');
      expect(advancedCharts.formatDuration(3661)).toBe('1h 1m');
    });

    it('should calculate trend line correctly', () => {
      const data = [
        { duration: 60, power: 200 },
        { duration: 300, power: 180 },
        { duration: 1200, power: 150 },
      ];

      const trendData = advancedCharts.calculateTrendLine(data);
      expect(Array.isArray(trendData)).toBe(true);
      expect(trendData.length).toBe(data.length);
      expect(trendData.every(point => point.duration && point.power >= 0)).toBe(
        true
      );
    });
  });

  describe('Chart Cleanup', () => {
    it('should destroy individual chart correctly', () => {
      // Setup a mock chart
      const mockChart = { svg: document.createElement('svg') };
      advancedCharts.d3Charts.set('test-chart', mockChart);

      // Destroy chart
      advancedCharts.destroyChart('test-chart');

      // Verify cleanup
      expect(advancedCharts.d3Charts.has('test-chart')).toBe(false);
    });

    it('should destroy all charts correctly', () => {
      // Setup mock charts
      advancedCharts.d3Charts.set('chart1', {});
      advancedCharts.d3Charts.set('chart2', {});
      advancedCharts.threeJsScenes.set('chart3', {});

      // Destroy all
      advancedCharts.destroyAll();

      // Verify cleanup
      expect(advancedCharts.d3Charts.size).toBe(0);
      expect(advancedCharts.threeJsScenes.size).toBe(0);
      expect(advancedCharts.animationFrames.size).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing container gracefully', () => {
      expect(() => {
        advancedCharts.createHeatMapCalendar('nonexistent', []);
      }).toThrow('Container not found: nonexistent');
    });

    it('should handle invalid data gracefully', () => {
      const mockD3Selection = {
        empty: vi.fn(() => false),
        selectAll: vi.fn().mockReturnThis(),
        remove: vi.fn().mockReturnThis(),
        append: vi.fn().mockReturnThis(),
        attr: vi.fn().mockReturnThis(),
      };

      vi.mocked(vi.importMock('d3').select).mockReturnValue(mockD3Selection);

      // Should not throw error with empty data
      expect(() => {
        advancedCharts.createZoneDistribution('test-chart', { segments: [] });
      }).not.toThrow();
    });

    it('should handle export errors gracefully', async () => {
      // Try to export non-existent chart
      await expect(
        advancedCharts.exportChartAsPNG('nonexistent')
      ).rejects.toThrow('Container not found: nonexistent');
    });
  });
});
