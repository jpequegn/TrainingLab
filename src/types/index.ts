/**
 * Main types export file
 * Provides centralized access to all TypeScript definitions
 */

// Workout and training related types
export * from './workout.types';

// Chart and visualization types
export * from './chart.types';

// API and server types
export * from './api.types';

// UI component and state types
export * from './ui.types';

// Global type declarations
declare global {
  interface Window {
    visualizer?: {
      currentWorkout?: import('./workout.types').Workout;
      currentChart?: import('./chart.types').ChartInstance;
      theme?: 'light' | 'dark';
      debug?: boolean;
    };
  }
}

// Common utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];
export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Event handler types
export type EventHandler<T extends Event = Event> = (event: T) => void;
export type AsyncEventHandler<T extends Event = Event> = (
  event: T
) => Promise<void>;

// Generic callback types
export type Callback<T = void> = () => T;
export type AsyncCallback<T = void> = () => Promise<T>;
export type CallbackWithArgs<TArgs extends any[] = [], TReturn = void> = (
  ...args: TArgs
) => TReturn;
export type AsyncCallbackWithArgs<TArgs extends any[] = [], TReturn = void> = (
  ...args: TArgs
) => Promise<TReturn>;
