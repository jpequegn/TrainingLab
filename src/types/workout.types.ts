/**
 * Core workout data structures and types
 */

export interface WorkoutSegment {
  duration: number;
  type: string;
  power?: number;
  powerLow?: number;
  powerHigh?: number;
  powerOnHigh?: number;
  powerOffHigh?: number;
  repeat?: number;
  onDuration?: number;
  offDuration?: number;
  cadence?: number;
  cadenceLow?: number;
  cadenceHigh?: number;
  zone?: number;
  text?: string;
  ftpTest?: boolean;
  totalDuration?: number;
}

export interface WorkoutInterval extends WorkoutSegment {
  repeat: number;
  onDuration: number;
  offDuration: number;
  powerOnHigh: number;
  powerOffHigh: number;
}

export interface Workout {
  name: string;
  description: string;
  author: string;
  sportType: 'bike' | 'run' | 'swim';
  segments: (WorkoutSegment | WorkoutInterval[])[];
  totalDuration: number;
  tss?: number;
  estimatedPower?: number;
  tags?: string[];
  category?: string;
  subcategory?: string;
}

export interface WorkoutFileData {
  workout: Workout;
  metadata: {
    fileName?: string;
    fileSize?: number;
    uploadDate?: Date;
    lastModified?: Date;
  };
}

export interface PowerZone {
  zone: number;
  name: string;
  description: string;
  minPercent: number;
  maxPercent: number;
  color: string;
}

export interface TrainingStressMetrics {
  tss: number;
  intensityFactor: number;
  normalizedPower: number;
  averagePower: number;
  duration: number;
}

export interface ExportFormat {
  erg: string;
  mrc: string;
  tcx?: string;
  fit?: string;
}

export type SegmentType = 
  | 'Warmup'
  | 'Cooldown' 
  | 'SteadyState'
  | 'IntervalsT'
  | 'Ramp'
  | 'FreeRide'
  | 'TextEvent';