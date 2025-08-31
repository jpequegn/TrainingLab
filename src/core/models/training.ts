/**
 * Training Analytics Data Model
 * Training metrics, history, and analytics types for TrainingLab
 */

export interface WorkoutSession {
  id: string;
  workoutId: string;
  userId: string;
  plannedDate: Date;
  completedDate?: Date;
  duration: number; // actual duration in seconds
  status: 'planned' | 'completed' | 'skipped' | 'partial';

  // Planned vs Actual metrics
  planned: {
    tss: number;
    duration: number;
    avgPower: number;
  };

  actual?: {
    tss: number;
    avgPower: number;
    maxPower: number;
    normalizedPower: number;
    intensityFactor: number;
    variabilityIndex: number;
    avgCadence?: number;
    maxCadence?: number;
    avgHeartRate?: number;
    maxHeartRate?: number;
    powerData?: number[]; // second-by-second power data
    cadenceData?: number[];
    heartRateData?: number[];
  };

  notes?: string;
  rating?: number; // 1-5 perceived exertion
  created: Date;
}

export interface TrainingLoad {
  date: Date;
  ctl: number; // Chronic Training Load (Fitness)
  atl: number; // Acute Training Load (Fatigue)
  tsb: number; // Training Stress Balance (Form)
  tss: number; // Daily TSS
}

export interface PerformanceMetrics {
  userId: string;
  date: Date;

  // Power metrics
  ftp: number;
  powerCurve: PowerCurvePoint[];

  // Training load metrics
  fitness: number; // CTL
  fatigue: number; // ATL
  form: number; // TSB

  // Volume metrics
  weeklyTSS: number;
  weeklyHours: number;
  monthlyTSS: number;
  monthlyHours: number;

  // Trends
  fitnessChange7d: number;
  fitnessChange30d: number;
  formTrend: 'improving' | 'declining' | 'stable';
}

export interface PowerCurvePoint {
  duration: number; // seconds (5s, 1min, 5min, 20min, 60min, etc.)
  power: number; // watts
  date: Date; // when this PR was achieved
  workoutId?: string; // workout where this was achieved
}

export interface TrainingPhase {
  id: string;
  userId: string;
  name: string;
  type: 'base' | 'build' | 'peak' | 'recovery' | 'transition';
  startDate: Date;
  endDate: Date;
  goals: string[];
  targetTSS?: number; // weekly target
  focus: 'endurance' | 'tempo' | 'threshold' | 'vo2max' | 'sprint';
}

export interface TrainingPlan {
  id: string;
  name: string;
  description: string;
  author: string;
  duration: number; // weeks
  phases: TrainingPhase[];
  workouts: PlannedWorkout[];
  prerequisites?: string[];
  difficulty: number; // 1-5
  category: string;
}

export interface PlannedWorkout {
  id: string;
  planId: string;
  workoutId: string;
  week: number;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  phase: string;
  description?: string;
  alternatives?: string[]; // alternative workout IDs
}

export interface WeeklyStats {
  weekStart: Date;
  totalTSS: number;
  totalDuration: number; // minutes
  workoutsCompleted: number;
  workoutsPlanned: number;
  avgIntensity: number;
  avgDuration: number;
  topPowerZone: number;
  rampRate: number; // week-over-week TSS change
}

export interface AnalyticsData {
  userId: string;
  generatedDate: Date;
  period: {
    start: Date;
    end: Date;
  };

  summary: {
    totalWorkouts: number;
    totalTSS: number;
    totalHours: number;
    avgTSSPerWeek: number;
    ftpGain: number;
    consistency: number; // % of planned workouts completed
  };

  trends: {
    fitnessGain: number;
    weeklyTSSProgression: number[];
    powerCurveChanges: PowerCurvePoint[];
  };

  recommendations: string[];
}
