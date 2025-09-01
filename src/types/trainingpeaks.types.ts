/**
 * TrainingPeaks Integration Type Definitions
 * Comprehensive types for TrainingPeaks API integration, workout management, and training metrics
 */

// ============================================================================
// Core TrainingPeaks API Types
// ============================================================================

export interface TrainingPeaksConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  baseUrl: string;
  apiVersion: string;
  scopes: string[];
}

export interface TPOAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: 'bearer';
  scope: string;
}

export interface TPAuthState {
  state: string;
  codeVerifier: string;
  userId: string;
  timestamp: number;
  expires: number;
}

// ============================================================================
// TrainingPeaks User & Profile Types
// ============================================================================

export interface TPUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
  location?: string;
  accountType: 'free' | 'basic' | 'premium' | 'coach';
  timezone: string;
  units: 'metric' | 'english';
  dateFormat: string;
  createdDate: string;
  lastLoginDate?: string;
}

export interface TPAthlete extends TPUser {
  coachId?: number;
  trainingStressBalance?: number;
  chronicTrainingLoad?: number;
  acuteTrainingLoad?: number;
  rampRate?: number;
  restingHR?: number;
  maxHR?: number;
  ftpWatts?: number;
  ftpDate?: string;
  weight?: number;
  dateOfBirth?: string;
}

export interface TPCoach extends TPUser {
  athletes: TPAthlete[];
  certifications?: string[];
  specialties?: string[];
  yearsOfExperience?: number;
  website?: string;
  bio?: string;
}

// ============================================================================
// Workout & Training Plan Types
// ============================================================================

export interface TPWorkout {
  id: number;
  title: string;
  description?: string;
  coachComments?: string;
  athleteComments?: string;
  workoutDate: string;
  lastModified: string;
  structure: TPWorkoutStructure;
  estimatedDuration: number;
  estimatedTSS?: number;
  estimatedIF?: number;
  estimatedKJ?: number;
  workoutType: TPWorkoutType;
  tags?: string[];
  equipment?: TPEquipment[];
  createdBy: number;
  assignedTo?: number;
  status: 'planned' | 'completed' | 'skipped' | 'moved';
  completedDate?: string;
  library: boolean;
}

export interface TPWorkoutStructure {
  warmupSteps: TPWorkoutStep[];
  mainSetSteps: TPWorkoutStep[];
  cooldownSteps: TPWorkoutStep[];
  totalDuration: number;
  totalDistance?: number;
  targetLoad?: number;
}

export interface TPWorkoutStep {
  stepId: number;
  stepType: 'interval' | 'ramp' | 'steady' | 'rest' | 'cooldown' | 'warmup';
  duration: number;
  durationType: 'time' | 'distance' | 'calories' | 'lap';
  targets: TPStepTargets;
  repetitions?: number;
  stepDescription?: string;
  startTime: number;
  endTime: number;
}

export interface TPStepTargets {
  power?: TPTarget;
  heartRate?: TPTarget;
  cadence?: TPTarget;
  pace?: TPTarget;
  speed?: TPTarget;
  grade?: TPTarget;
}

export interface TPTarget {
  min: number;
  max: number;
  target?: number;
  unit: string;
  zone?: number;
}

export interface TPWorkoutType {
  id: number;
  name: string;
  category: 'endurance' | 'strength' | 'speed' | 'recovery' | 'race' | 'test';
  color: string;
  description?: string;
}

export interface TPEquipment {
  id: number;
  name: string;
  type: 'bike' | 'shoes' | 'power_meter' | 'heart_rate' | 'other';
  brand?: string;
  model?: string;
  notes?: string;
}

// ============================================================================
// Activity & Performance Types
// ============================================================================

export interface TPActivity {
  id: number;
  title: string;
  description?: string;
  workoutId?: number;
  activityDate: string;
  activityType: TPActivityType;
  structure: TPActivityStructure;
  energy: number; // kJ
  elevationGain?: number;
  distance?: number;
  duration: number;
  movingTime?: number;
  averageSpeed?: number;
  maxSpeed?: number;
  averagePower?: number;
  maxPower?: number;
  normalizedPower?: number;
  intensityFactor?: number;
  tss?: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  averageCadence?: number;
  maxCadence?: number;
  temperature?: number;
  gear?: TPEquipment;
  device?: string;
  uploadedFrom?: string;
  weatherConditions?: string;
  perceivedExertion?: number;
  feelings?: number;
  tags?: string[];
  privacy: 'public' | 'followers' | 'private';
  createdDate: string;
  lastModified: string;
}

export interface TPActivityType {
  id: number;
  name: string;
  category:
    | 'cycling'
    | 'running'
    | 'swimming'
    | 'triathlon'
    | 'strength'
    | 'other';
  icon: string;
  color: string;
}

export interface TPActivityStructure {
  streams: TPStream[];
  laps: TPLap[];
  intervals?: TPInterval[];
  summary: TPActivitySummary;
}

export interface TPStream {
  type:
    | 'time'
    | 'power'
    | 'heart_rate'
    | 'cadence'
    | 'speed'
    | 'distance'
    | 'altitude'
    | 'temperature'
    | 'lat'
    | 'lng';
  data: number[];
  originalSize?: number;
  resolution: 'high' | 'medium' | 'low';
}

export interface TPLap {
  lapNumber: number;
  startTime: number;
  endTime: number;
  duration: number;
  distance?: number;
  averagePower?: number;
  maxPower?: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  averageCadence?: number;
  normalizedPower?: number;
  intensityFactor?: number;
  tss?: number;
}

export interface TPInterval {
  intervalNumber: number;
  startTime: number;
  endTime: number;
  duration: number;
  targetPower?: TPTarget;
  actualPower?: {
    average: number;
    max: number;
    normalized: number;
  };
  targetHeartRate?: TPTarget;
  actualHeartRate?: {
    average: number;
    max: number;
  };
  compliance?: number; // Percentage of time in target zone
}

export interface TPActivitySummary {
  totalTime: number;
  movingTime: number;
  totalDistance?: number;
  elevationGain?: number;
  energyExpended: number;
  averagePower?: number;
  maxPower?: number;
  normalizedPower?: number;
  intensityFactor?: number;
  tss?: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  hrZoneDistribution?: number[];
  powerZoneDistribution?: number[];
  paceZoneDistribution?: number[];
}

// ============================================================================
// Performance Management & Analytics Types
// ============================================================================

export interface TPPerformanceData {
  athleteId: number;
  date: string;
  chronicTrainingLoad: number; // CTL
  acuteTrainingLoad: number; // ATL
  trainingStressBalance: number; // TSB
  tss: number;
  rampRate: number;
  form: number;
  fitness: number;
  fatigue: number;
}

export interface TPPowerCurve {
  athleteId: number;
  date: string;
  duration: number[]; // seconds
  power: number[]; // watts
  powerToWeight: number[]; // watts/kg
  percentOfFTP: number[];
}

export interface TPZoneDefinition {
  zoneId: number;
  zoneName: string;
  zoneNumber: number;
  minValue: number;
  maxValue: number;
  color: string;
  description?: string;
}

export interface TPPowerZones extends TPZoneDefinition {
  type: 'power';
  baseFTP: number;
  minWatts: number;
  maxWatts: number;
}

export interface TPHeartRateZones extends TPZoneDefinition {
  type: 'heart_rate';
  baseHR: number;
  maxHR: number;
  minBPM: number;
  maxBPM: number;
}

export interface TPPaceZones extends TPZoneDefinition {
  type: 'pace';
  basePace: string; // mm:ss format
  minPace: string;
  maxPace: string;
}

// ============================================================================
// Training Plans & Periodization
// ============================================================================

export interface TPTrainingPlan {
  id: number;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  totalWeeks: number;
  phases: TPPeriodizationPhase[];
  createdBy: number;
  assignedTo: number;
  planType: 'base' | 'build' | 'peak' | 'recovery' | 'race' | 'custom';
  targetEvent?: TPEvent;
  createdDate: string;
  lastModified: string;
}

export interface TPPeriodizationPhase {
  phaseId: number;
  phaseName: string;
  phaseType: 'base' | 'build' | 'peak' | 'recovery' | 'race' | 'transition';
  startDate: string;
  endDate: string;
  weekCount: number;
  targetTSS: number;
  description?: string;
  weeks: TPTrainingWeek[];
}

export interface TPTrainingWeek {
  weekNumber: number;
  startDate: string;
  endDate: string;
  plannedTSS: number;
  actualTSS?: number;
  rampRate?: number;
  workouts: TPWorkout[];
  notes?: string;
}

export interface TPEvent {
  id: number;
  name: string;
  eventDate: string;
  eventType: 'race' | 'test' | 'goal' | 'milestone';
  priority: 'A' | 'B' | 'C';
  description?: string;
  location?: string;
  distance?: number;
  duration?: number;
}

// ============================================================================
// Sync & Integration Types
// ============================================================================

export interface TPSyncSettings {
  userId: string;
  autoSync: boolean;
  syncDirection: 'import_only' | 'export_only' | 'bidirectional';
  syncWorkouts: boolean;
  syncActivities: boolean;
  syncMetrics: boolean;
  syncPlans: boolean;
  includePrivate: boolean;
  syncInterval: number; // minutes
  lastSync?: string;
  webhookSubscription?: TPWebhookSubscription;
}

export interface TPWebhookSubscription {
  id: number;
  callbackUrl: string;
  verifyToken: string;
  events: TPWebhookEvent[];
  active: boolean;
  createdDate: string;
}

export interface TPWebhookEvent {
  eventType:
    | 'workout_created'
    | 'workout_updated'
    | 'workout_deleted'
    | 'activity_created'
    | 'activity_updated'
    | 'athlete_updated';
  subscribed: boolean;
}

export interface TPSyncResult {
  syncId: string;
  userId: string;
  startTime: string;
  endTime: string;
  status: 'success' | 'partial' | 'failed';
  totalItems: number;
  processedItems: number;
  failedItems: number;
  errors: TPSyncError[];
  workoutsSynced: number;
  activitiesSynced: number;
  metricsSynced: number;
}

export interface TPSyncError {
  itemId: string;
  itemType: 'workout' | 'activity' | 'metric';
  errorCode: string;
  errorMessage: string;
  timestamp: string;
}

// ============================================================================
// TrainingLab Integration Types
// ============================================================================

export interface TPTrainingLabMapping {
  tpWorkoutId: number;
  tlWorkoutId: string;
  mappedDate: string;
  syncDirection: 'tp_to_tl' | 'tl_to_tp' | 'bidirectional';
  lastSyncDate: string;
  conflicts?: TPMappingConflict[];
}

export interface TPMappingConflict {
  field: string;
  tpValue: any;
  tlValue: any;
  resolution: 'use_tp' | 'use_tl' | 'merge' | 'manual';
  resolvedDate?: string;
}

export interface TPWorkoutConversion {
  source: 'trainingpeaks' | 'traininglab';
  sourceId: string | number;
  targetFormat: 'traininglab' | 'trainingpeaks';
  conversionDate: string;
  conversionRules: TPConversionRule[];
  preservedMetadata: Record<string, any>;
}

export interface TPConversionRule {
  field: string;
  sourceFormat: string;
  targetFormat: string;
  conversionFunction: string;
  lossyConversion: boolean;
  notes?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface TPApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: TPApiError;
  pagination?: TPPagination;
  rateLimit?: TPRateLimit;
}

export interface TPApiError {
  code: string;
  message: string;
  details?: string;
  field?: string;
  timestamp: string;
}

export interface TPPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface TPRateLimit {
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

// ============================================================================
// Connection & Status Types
// ============================================================================

export interface TPConnectionStatus {
  connected: boolean;
  user?: TPUser;
  lastSync?: string;
  syncStatus: 'idle' | 'syncing' | 'error' | 'paused';
  settings: TPSyncSettings;
  stats: TPConnectionStats;
  webhookStatus: 'active' | 'inactive' | 'error';
  tokenExpiry: number;
}

export interface TPConnectionStats {
  totalWorkouts: number;
  totalActivities: number;
  workoutsSynced: number;
  activitiesSynced: number;
  lastSyncDuration: number;
  syncErrors: number;
  dataUsage: number; // bytes
}

// ============================================================================
// Utility & Helper Types
// ============================================================================

export type TPSportType =
  | 'cycling'
  | 'running'
  | 'swimming'
  | 'triathlon'
  | 'strength'
  | 'other';

export type TPDataSource =
  | 'manual'
  | 'device'
  | 'file_upload'
  | 'third_party'
  | 'estimated';

export type TPPrivacyLevel = 'public' | 'followers_only' | 'private';

export type TPTimeZone = string; // IANA timezone format

export type TPUnits = 'metric' | 'imperial';

export type TPDateFormat = 'MM/dd/yyyy' | 'dd/MM/yyyy' | 'yyyy-MM-dd';

// ============================================================================
// Event Types for Real-time Updates
// ============================================================================

export interface TPRealtimeEvent {
  eventType: string;
  athleteId: number;
  timestamp: string;
  data: any;
  source: 'webhook' | 'polling' | 'manual';
}

export interface TPWorkoutUpdatedEvent extends TPRealtimeEvent {
  eventType: 'workout_updated';
  data: {
    workoutId: number;
    changes: string[];
    updatedBy: number;
  };
}

export interface TPActivityCreatedEvent extends TPRealtimeEvent {
  eventType: 'activity_created';
  data: {
    activityId: number;
    activityType: TPActivityType;
    summary: TPActivitySummary;
  };
}

// ============================================================================
// Export all types for easy importing
// ============================================================================

export type {
  TrainingPeaksConfig as TPConfig,
  TPOAuthTokens as TPTokens,
  TPUser as TPUserProfile,
  TPWorkout as TPWorkoutData,
  TPActivity as TPActivityData,
  TPSyncSettings as TPSyncConfig,
  TPConnectionStatus as TPStatus,
  TPApiResponse as TPResponse,
};
