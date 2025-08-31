/**
 * Workout Data Model
 * Core workout types and interfaces for TrainingLab
 */

export interface WorkoutSegment {
  type:
    | 'warmup'
    | 'cooldown'
    | 'steadystate'
    | 'intervals'
    | 'ramp'
    | 'freeride';
  duration: number; // seconds
  power?: number; // FTP percentage (0-2.0+)
  powerLow?: number; // For ramps/warmups
  powerHigh?: number; // For ramps/cooldowns
  cadence?: number; // RPM
  zone?: number; // Power zone (1-7)
}

export interface WorkoutMetadata {
  id: string;
  name: string;
  author?: string;
  description?: string;
  category?: string;
  tags?: string[];
  difficulty?: number; // 1-5 scale
  estimatedDuration: number; // seconds
  tss?: number; // Training Stress Score
  if?: number; // Intensity Factor
  np?: number; // Normalized Power
  created: Date;
  modified: Date;
}

export interface Workout {
  metadata: WorkoutMetadata;
  segments: WorkoutSegment[];
  totalDuration: number;
  maxPower: number;
  avgPower: number;
}

export interface WorkoutCollection {
  id: string;
  name: string;
  description?: string;
  workoutIds: string[];
  created: Date;
  modified: Date;
}

export interface TrainingStressMetrics {
  tss: number; // Training Stress Score
  if: number; // Intensity Factor
  np: number; // Normalized Power
  vi: number; // Variability Index
}

export interface WorkoutStats {
  totalWorkouts: number;
  totalDuration: number; // seconds
  totalTSS: number;
  avgDuration: number;
  avgTSS: number;
  favoriteCategory?: string;
}
