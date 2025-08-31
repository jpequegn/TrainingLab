/**
 * User Data Model
 * User profile and settings types for TrainingLab
 */

export interface UserProfile {
  id: string;
  email?: string;
  name?: string;
  avatar?: string;
  created: Date;
  lastActive: Date;
}

export interface AthleteProfile {
  userId: string;
  ftp: number; // Functional Threshold Power in watts
  ftpHistory: FTPMeasurement[];
  weight?: number; // kg
  powerZones: PowerZones;
  hrZones?: HeartRateZones;
  preferences: TrainingPreferences;
  goals: TrainingGoal[];
}

export interface FTPMeasurement {
  value: number; // watts
  date: Date;
  testType: 'ramp' | '20min' | '8min' | 'race' | 'estimated';
  source?: string; // e.g., "Zwift", "TrainerRoad", "Manual"
}

export interface PowerZones {
  ftp: number;
  zones: {
    active_recovery: { min: number; max: number }; // Zone 1: <55% FTP
    endurance: { min: number; max: number }; // Zone 2: 55-75% FTP
    tempo: { min: number; max: number }; // Zone 3: 75-90% FTP
    threshold: { min: number; max: number }; // Zone 4: 90-105% FTP
    vo2max: { min: number; max: number }; // Zone 5: 105-120% FTP
    anaerobic: { min: number; max: number }; // Zone 6: 120-150% FTP
    neuromuscular: { min: number; max: number }; // Zone 7: >150% FTP
  };
  updated: Date;
}

export interface HeartRateZones {
  maxHR: number;
  zones: {
    zone1: { min: number; max: number };
    zone2: { min: number; max: number };
    zone3: { min: number; max: number };
    zone4: { min: number; max: number };
    zone5: { min: number; max: number };
  };
  updated: Date;
}

export interface TrainingPreferences {
  units: 'metric' | 'imperial';
  timezone: string;
  language: string;
  theme: 'light' | 'dark' | 'auto';
  autoFTPUpdate: boolean;
  weekStartsOn: 'monday' | 'sunday';
  defaultWorkoutView: 'power' | 'zones' | 'both';
}

export interface TrainingGoal {
  id: string;
  type: 'ftp' | 'weight' | 'race' | 'volume' | 'custom';
  title: string;
  description?: string;
  target: number;
  targetDate: Date;
  current?: number;
  unit: string; // 'watts', 'kg', 'hours', etc.
  created: Date;
  completed?: Date;
}

export interface UserSettings {
  userId: string;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  integrations: IntegrationSettings;
}

export interface NotificationSettings {
  workoutReminders: boolean;
  weeklyReports: boolean;
  achievementAlerts: boolean;
  ftpUpdates: boolean;
  email: boolean;
  push: boolean;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'friends' | 'private';
  shareWorkouts: boolean;
  shareProgress: boolean;
  allowDataExport: boolean;
}

export interface IntegrationSettings {
  strava?: {
    connected: boolean;
    syncWorkouts: boolean;
    syncActivities: boolean;
  };
  garmin?: {
    connected: boolean;
    syncWorkouts: boolean;
  };
  zwift?: {
    connected: boolean;
    importWorkouts: boolean;
  };
}
