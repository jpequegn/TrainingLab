/**
 * Global Type Definitions
 * Shared types used across TrainingLab
 */

// Re-export all model types for easy importing
export * from '../core/models';

// Global utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequireAtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> &
    Partial<Pick<T, Exclude<keyof T, K>>>;
}[keyof T];

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Event types for the application
export interface AppEvent<T = any> {
  type: string;
  payload: T;
  timestamp: Date;
}

// Theme types
export type ThemeMode = 'light' | 'dark' | 'auto';

// Chart data types (for Chart.js integration)
export interface ChartDataPoint {
  x: number;
  y: number;
  label?: string;
}

export interface ChartSeries {
  label: string;
  data: ChartDataPoint[];
  color?: string;
  borderColor?: string;
  backgroundColor?: string;
}

// File handling types
export interface FileUpload {
  file: File;
  name: string;
  type: string;
  size: number;
}

export interface ParsedWorkoutFile {
  content: string;
  metadata: {
    filename: string;
    filesize: number;
    format: 'zwo' | 'erg' | 'mrc';
    parsed: Date;
  };
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

// Storage types
export interface StorageOptions {
  encrypt?: boolean;
  compress?: boolean;
  ttl?: number; // Time to live in milliseconds
}
