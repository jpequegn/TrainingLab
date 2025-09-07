/**
 * Chart.js and visualization related types
 */

import { Chart, ChartConfiguration, ChartData, ChartOptions } from 'chart.js';

export interface ChartPoint {
  x: number;
  y: number;
  segment?: string;
  power?: number;
  duration?: number;
  zone?: number;
}

export interface PowerCurveData {
  time: number;
  power: number;
  segment: string;
  zone: number;
  color: string;
}

export interface WorkoutChartData extends ChartData {
  datasets: Array<{
    label: string;
    data: ChartPoint[];
    borderColor: string;
    backgroundColor?: string;
    fill?: boolean;
    tension?: number;
    pointRadius?: number;
    pointHoverRadius?: number;
    borderWidth?: number;
  }>;
}

export interface WorkoutChartOptions extends ChartOptions {
  responsive: boolean;
  maintainAspectRatio: boolean;
  scales: {
    x: {
      display: boolean;
      title: {
        display: boolean;
        text: string;
      };
      grid?: {
        display?: boolean;
        color?: string;
      };
    };
    y: {
      display: boolean;
      title: {
        display: boolean;
        text: string;
      };
      min?: number;
      max?: number;
      grid?: {
        display?: boolean;
        color?: string;
      };
    };
  };
  plugins: {
    legend: {
      display: boolean;
      position?: 'top' | 'bottom' | 'left' | 'right';
    };
    tooltip: {
      enabled: boolean;
      mode?: 'index' | 'point' | 'nearest' | 'dataset' | 'x' | 'y';
      intersect?: boolean;
      callbacks?: {
        label?: (context: any) => string;
        title?: (context: any) => string;
      };
    };
    annotation?: {
      annotations?: Record<string, any>;
    };
  };
}

export interface ChartInstance {
  chart: Chart | null;
  container: HTMLCanvasElement | null;
  data: WorkoutChartData;
  options: WorkoutChartOptions;
}

export interface ChartTheme {
  backgroundColor: string;
  foregroundColor: string;
  gridColor: string;
  borderColor: string;
  primaryColor: string;
  powerZoneColors: string[];
}

// Advanced Chart Types
export type AdvancedChartType =
  | '3d-power-surface'
  | 'heat-map-calendar'
  | 'zone-distribution'
  | 'animated-preview'
  | 'power-duration-curve'
  | 'comparative-heat-maps';

export interface AdvancedChartData {
  id?: string;
  type: AdvancedChartType;
  workoutData?: WorkoutData;
  trainingData?: TrainingData[];
  workoutHistory?: WorkoutData[];
  workoutsData?: WorkoutData[];
  metadata?: {
    title?: string;
    description?: string;
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
}

export interface WorkoutData {
  id?: string;
  name?: string;
  title?: string;
  date?: string;
  segments: ChartWorkoutSegment[];
  duration?: number;
  totalWork?: number;
  averagePower?: number;
  normalizedPower?: number;
  intensityFactor?: number;
  trainingStressScore?: number;
}

export interface ChartWorkoutSegment {
  duration: number; // seconds
  power: number; // % FTP or watts
  cadence?: number; // RPM
  heartRate?: number; // BPM
  elevation?: number; // meters
  gradient?: number; // %
  temperature?: number; // °C
  index?: number;
}

export interface TrainingData {
  date: string;
  workouts: WorkoutData[];
  totalTime?: number;
  totalWork?: number;
  trainingLoad?: number;
  intensity?: number;
}

export interface ChartPowerZone {
  zone: string;
  min: number; // % FTP
  max: number; // % FTP
  time: number; // seconds
  color?: string;
  description?: string;
}

export interface PowerDurationPoint {
  duration: number; // seconds
  power: number; // watts
  date?: string;
  workout?: string;
}

// 3D Chart Options
export interface ThreeDChartOptions {
  width?: number;
  height?: number;
  backgroundColor?: number; // hex color
  cameraPosition?: {
    x: number;
    y: number;
    z: number;
  };
  showGrid?: boolean;
  showAxes?: boolean;
  autoRotate?: boolean;
  rotationSpeed?: number;
  interactive?: boolean;
  lighting?: {
    ambient?: number;
    directional?: number;
  };
}

// Heat Map Options
export interface HeatMapOptions {
  width?: number;
  height?: number;
  cellSize?: number;
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  colorScale?: string; // d3 color scale name
  showTooltip?: boolean;
  showLegend?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// Zone Distribution Options
export interface ZoneDistributionOptions {
  width?: number;
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  showLabels?: boolean;
  showPercentages?: boolean;
  interactive?: boolean;
  animationDuration?: number;
  colorScheme?: string[];
  zones?: ChartPowerZone[];
}

// Animated Preview Options
export interface AnimatedPreviewOptions {
  width?: number;
  height?: number;
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  animationSpeed?: number; // ms per segment
  showControls?: boolean;
  autoPlay?: boolean;
  showCurrentSegment?: boolean;
  showPowerZones?: boolean;
}

// Power Duration Curve Options
export interface PowerDurationCurveOptions {
  width?: number;
  height?: number;
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  showTrend?: boolean;
  showGoals?: boolean;
  interactive?: boolean;
  durations?: number[]; // seconds
  goals?: Array<{
    power: number;
    label?: string;
    color?: string;
  }>;
}

// Comparative Heat Map Options
export interface ComparativeHeatMapOptions {
  width?: number;
  height?: number;
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  cellWidth?: number;
  cellHeight?: number;
  showLegend?: boolean;
  showLabels?: boolean;
  colorScale?: string;
  maxWorkouts?: number;
  alignmentMode?: 'start' | 'center' | 'end';
}

// Export Options
export interface ExportOptions {
  format?: 'png' | 'svg' | 'pdf' | 'json' | 'multiple';
  filename?: string;
  quality?: number;
  scale?: number;
  backgroundColor?: string;
  title?: string;
  formats?: string[]; // for multiple export
}

// Advanced Chart Instance
export interface AdvancedChartInstance {
  id: string;
  type: AdvancedChartType;
  container: HTMLElement;
  data: AdvancedChartData;
  options: any; // specific to chart type
  instance?: any; // D3 selection, THREE.Scene, etc.
  controls?: {
    play?: () => void;
    pause?: () => void;
    reset?: () => void;
    export?: (format: string) => Promise<any>;
  };
}

// Chart Manager Types
export interface ChartManager {
  traditional: Map<string, ChartInstance>;
  advanced: Map<string, AdvancedChartInstance>;
}

export type ChartEventType =
  | 'chart:created'
  | 'chart:updated'
  | 'chart:destroyed'
  | 'chart:exported'
  | 'chart:error'
  | 'animation:started'
  | 'animation:paused'
  | 'animation:stopped'
  | 'interaction:hover'
  | 'interaction:click'
  | 'interaction:zoom';

export interface ChartEvent {
  type: ChartEventType;
  chartId: string;
  chartType: string;
  data?: any;
  timestamp: Date;
}

// Utility Types
export type ChartColor = string | number; // hex string or number
export type ChartSize = { width: number; height: number };
export type ChartPosition = { x: number; y: number };
export type ChartMargin = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};
