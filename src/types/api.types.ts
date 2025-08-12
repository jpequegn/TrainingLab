/**
 * API request/response and server-related types
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface FileUploadRequest {
  file: File;
  metadata?: {
    description?: string;
    tags?: string[];
    category?: string;
  };
}

export interface FileUploadResponse extends ApiResponse {
  data: {
    filename: string;
    size: number;
    type: string;
    workout?: import('./workout.types').Workout;
  };
}

export interface WorkoutExportRequest {
  workout: import('./workout.types').Workout;
  format: 'erg' | 'mrc' | 'tcx' | 'fit';
  ftp?: number;
  options?: {
    includeMetadata?: boolean;
    scaleFactor?: number;
    timeFormat?: 'seconds' | 'minutes';
  };
}

export interface WorkoutExportResponse extends ApiResponse {
  data: {
    filename: string;
    content: string;
    mimeType: string;
    size: number;
  };
}

export interface ServerConfig {
  port: number;
  host: string;
  cors: {
    enabled: boolean;
    origins: string[];
  };
  uploads: {
    maxFileSize: number;
    allowedExtensions: string[];
    directory: string;
  };
  api: {
    version: string;
    prefix: string;
    rateLimit: {
      enabled: boolean;
      maxRequests: number;
      windowMs: number;
    };
  };
}

export interface ErrorResponse extends ApiResponse {
  success: false;
  error: string;
  details?: {
    code: string;
    field?: string;
    value?: any;
  };
}

export interface HealthCheckResponse extends ApiResponse {
  data: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
    memory: {
      used: number;
      total: number;
    };
    services: {
      fileSystem: boolean;
      parser: boolean;
    };
  };
}
