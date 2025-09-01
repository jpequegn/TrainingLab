/**
 * Strava Integration Types
 * Types for Strava API integration, OAuth flow, and activity data
 */

export interface StravaOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
}

export interface StravaTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // timestamp
  scope: string;
}

export interface StravaAuthState {
  state: string;
  userId: string;
  timestamp: number;
}

export interface StravaActivity {
  id: number;
  name: string;
  distance: number; // meters
  moving_time: number; // seconds
  elapsed_time: number; // seconds
  total_elevation_gain: number; // meters
  type: StravaActivityType;
  start_date: string; // ISO 8601
  start_date_local: string; // ISO 8601
  timezone: string;
  utc_offset: number;
  achievement_count: number;
  kudos_count: number;
  comment_count: number;
  athlete_count: number;
  photo_count: number;
  trainer: boolean;
  commute: boolean;
  manual: boolean;
  private: boolean;
  visibility: 'everyone' | 'followers_only' | 'only_me';
  flagged: boolean;
  gear_id?: string;
  start_latlng?: [number, number];
  end_latlng?: [number, number];
  average_speed: number; // m/s
  max_speed: number; // m/s
  average_watts?: number;
  max_watts?: number;
  weighted_average_watts?: number;
  kilojoules?: number;
  device_watts?: boolean;
  has_heartrate: boolean;
  average_heartrate?: number;
  max_heartrate?: number;
  heartrate_opt_out: boolean;
  display_hide_heartrate_option: boolean;
  elev_high?: number;
  elev_low?: number;
  upload_id?: number;
  upload_id_str?: string;
  external_id?: string;
  from_accepted_tag: boolean;
  pr_count: number;
  total_photo_count: number;
  has_kudoed: boolean;
  suffer_score?: number;
}

export type StravaActivityType =
  | 'Ride'
  | 'Run'
  | 'Swim'
  | 'Hike'
  | 'Walk'
  | 'AlpineSki'
  | 'BackcountrySki'
  | 'Canoeing'
  | 'Crossfit'
  | 'EBikeRide'
  | 'Elliptical'
  | 'Golf'
  | 'Handcycle'
  | 'HighIntensityIntervalTraining'
  | 'Hockey'
  | 'IceSkate'
  | 'InlineSkate'
  | 'Kayaking'
  | 'Kitesurf'
  | 'NordicSki'
  | 'RockClimbing'
  | 'RollerSki'
  | 'Rowing'
  | 'Sail'
  | 'Skateboard'
  | 'Snowboard'
  | 'Snowshoe'
  | 'Soccer'
  | 'StairStepper'
  | 'StandUpPaddling'
  | 'Surfing'
  | 'VirtualRide'
  | 'VirtualRun'
  | 'WeightTraining'
  | 'Wheelchair'
  | 'Windsurf'
  | 'Workout'
  | 'Yoga';

export interface StravaDetailedActivity extends StravaActivity {
  description?: string;
  calories?: number;
  segment_efforts?: StravaSegmentEffort[];
  splits_metric?: StravaSplit[];
  splits_standard?: StravaSplit[];
  best_efforts?: StravaBestEffort[];
  gear?: StravaGear;
  photos?: StravaPhoto;
  stats_visibility?: StravaStatsVisibility[];
  hide_from_home?: boolean;
  device_name?: string;
  embed_token?: string;
  segment_leaderboard_opt_out?: boolean;
  leaderboard_opt_out?: boolean;
}

export interface StravaSegmentEffort {
  id: number;
  resource_state: number;
  name: string;
  activity: {
    id: number;
    resource_state: number;
  };
  athlete: {
    id: number;
    resource_state: number;
  };
  elapsed_time: number;
  moving_time: number;
  start_date: string;
  start_date_local: string;
  distance: number;
  start_index: number;
  end_index: number;
  average_cadence?: number;
  device_watts?: boolean;
  average_watts?: number;
  segment: {
    id: number;
    resource_state: number;
    name: string;
    climb_category: number;
    climb_category_desc: string;
    avg_grade: number;
    start_latlng: [number, number];
    end_latlng: [number, number];
    elevation_high: number;
    elevation_low: number;
    distance: number;
    points: string;
    starred: boolean;
  };
  kom_rank?: number;
  pr_rank?: number;
  achievements?: StravaAchievement[];
  hidden: boolean;
}

export interface StravaSplit {
  distance: number;
  elapsed_time: number;
  elevation_difference: number;
  moving_time: number;
  split: number;
  average_speed: number;
  average_grade_adjusted_speed?: number;
  average_heartrate?: number;
  pace_zone?: number;
}

export interface StravaBestEffort {
  id: number;
  resource_state: number;
  name: string;
  activity: {
    id: number;
    resource_state: number;
  };
  athlete: {
    id: number;
    resource_state: number;
  };
  elapsed_time: number;
  moving_time: number;
  start_date: string;
  start_date_local: string;
  distance: number;
  start_index: number;
  end_index: number;
  pr_rank?: number;
  achievements?: StravaAchievement[];
}

export interface StravaAchievement {
  type_id: number;
  type: string;
  rank: number;
}

export interface StravaGear {
  id: string;
  primary: boolean;
  name: string;
  nickname?: string;
  resource_state: number;
  retired: boolean;
  distance: number;
  converted_distance?: number;
  brand_name?: string;
  model_name?: string;
  frame_type?: number;
  description?: string;
}

export interface StravaPhoto {
  primary?: StravaPhotoItem;
  use_primary_photo: boolean;
  count: number;
}

export interface StravaPhotoItem {
  id?: number;
  unique_id: string;
  urls: {
    [key: string]: string;
  };
  source: number;
  uploaded_at: string;
  created_at: string;
  created_at_local: string;
  caption?: string;
  location?: [number, number];
  activity_id: number;
  activity_name: string;
  resource_state: number;
}

export interface StravaStatsVisibility {
  type: string;
  visibility: 'everyone' | 'followers_only' | 'only_me';
}

export interface StravaStream {
  type: StravaStreamType;
  data: number[];
  series_type: 'distance' | 'time';
  original_size: number;
  resolution: string;
}

export type StravaStreamType =
  | 'time'
  | 'latlng'
  | 'distance'
  | 'altitude'
  | 'velocity_smooth'
  | 'heartrate'
  | 'cadence'
  | 'watts'
  | 'temp'
  | 'moving'
  | 'grade_smooth';

export interface StravaWebhookEvent {
  object_type: 'activity' | 'athlete';
  object_id: number;
  aspect_type: 'create' | 'update' | 'delete';
  updates?: {
    title?: string;
    type?: string;
    private?: boolean;
    authorized?: boolean;
  };
  owner_id: number;
  subscription_id: number;
  event_time: number;
}

export interface StravaWebhookSubscription {
  id: number;
  resource_state: number;
  application_id: number;
  callback_url: string;
  created_at: string;
  updated_at: string;
}

export interface StravaIntegrationStatus {
  connected: boolean;
  lastSync?: Date;
  totalActivities?: number;
  syncInProgress?: boolean;
  lastError?: string;
  webhookActive?: boolean;
}

export interface StravaConnectionSettings {
  autoSync: boolean;
  syncHistorical: boolean;
  syncTypes: StravaActivityType[];
  excludePrivate: boolean;
  excludeCommute: boolean;
  excludeTrainer: boolean;
}

// TrainingLab specific types for mapping
export interface StravaActivityMapping {
  stravaId: number;
  trainingLabId: string;
  mappedAt: Date;
  syncStatus: 'pending' | 'synced' | 'failed';
  lastUpdated: Date;
}

export interface StravaDataTransform {
  // Power data transformation
  normalizedPower?: number;
  intensityFactor?: number;
  trainingStressScore?: number;
  variabilityIndex?: number;

  // Zone analysis
  powerZoneDistribution?: {
    [key: string]: number; // zone name -> time in seconds
  };

  // Derived metrics
  efficiency?: number;
  decoupling?: number;

  // Quality flags
  hasValidPowerData: boolean;
  hasValidHRData: boolean;
  estimatedTSS: boolean;
}
