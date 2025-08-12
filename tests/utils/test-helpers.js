// Test helper utilities
import { vi } from 'vitest';

/**
 * Create a mock DOM parser for testing
 */
export function createMockDOMParser() {
  return {
    parseFromString: vi.fn((str, type) => {
      const parser = new DOMParser();
      return parser.parseFromString(str, type);
    }),
  };
}

/**
 * Create a mock file for upload testing
 */
export function createMockFile(
  content,
  filename = 'test.zwo',
  type = 'text/xml'
) {
  const blob = new Blob([content], { type });
  blob.name = filename;
  return blob;
}

/**
 * Mock fetch for API testing
 */
export function mockFetch(response, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(response),
    text: () =>
      Promise.resolve(
        typeof response === 'string' ? response : JSON.stringify(response)
      ),
  });
}

/**
 * Create a mock canvas context for chart testing
 */
export function createMockCanvasContext() {
  return {
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Array(4) })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => ({ data: new Array(4) })),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    fillText: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
  };
}

/**
 * Wait for DOM updates in tests
 */
export function waitForNextTick() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Create a mock HTMLCanvasElement
 */
export function createMockCanvas() {
  const canvas = document.createElement('canvas');
  const context = createMockCanvasContext();
  vi.spyOn(canvas, 'getContext').mockReturnValue(context);
  return { canvas, context };
}

/**
 * Assert that an element has specific attributes
 */
export function assertElementAttributes(element, attributes) {
  Object.entries(attributes).forEach(([attr, value]) => {
    expect(element.getAttribute(attr)).toBe(value);
  });
}

/**
 * Create a mock workout object for testing
 */
export function createMockWorkout(overrides = {}) {
  return {
    name: 'Test Workout',
    author: 'Test Author',
    description: 'Test Description',
    sportType: 'bike',
    totalDuration: 1200,
    segments: [
      { type: 'SteadyState', duration: 300, power: 0.5 },
      { type: 'SteadyState', duration: 600, power: 0.8 },
      { type: 'SteadyState', duration: 300, power: 0.5 },
    ],
    ...overrides,
  };
}

/**
 * Mock Chart.js for testing
 */
export function mockChartJS() {
  const mockChart = {
    data: { datasets: [] },
    options: {},
    update: vi.fn(),
    destroy: vi.fn(),
    resize: vi.fn(),
    render: vi.fn(),
  };

  global.Chart = vi.fn(() => mockChart);
  global.Chart.register = vi.fn();

  return mockChart;
}
