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