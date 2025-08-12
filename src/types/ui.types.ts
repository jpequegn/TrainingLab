/**
 * UI component and state management types
 */

export interface UIState {
  theme: 'light' | 'dark' | 'auto';
  loading: boolean;
  error: string | null;
  currentView: 'upload' | 'viewer' | 'editor' | 'export';
  sidebarCollapsed: boolean;
  notifications: Notification[];
}

export interface Notification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message?: string;
  duration?: number;
  dismissible?: boolean;
  timestamp: number;
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'file' | 'select' | 'textarea' | 'checkbox';
  required?: boolean;
  placeholder?: string;
  value?: any;
  options?: Array<{ label: string; value: any }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    custom?: (value: any) => boolean | string;
  };
}

export interface ModalOptions {
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closable?: boolean;
  backdrop?: boolean;
  keyboard?: boolean;
  centered?: boolean;
}

export interface DropdownItem {
  id: string;
  label: string;
  value?: any;
  disabled?: boolean;
  separator?: boolean;
  icon?: string;
  action?: () => void;
}

export interface TabItem {
  id: string;
  label: string;
  content?: string;
  active?: boolean;
  disabled?: boolean;
  closable?: boolean;
}

export interface TableColumn<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: T, index: number) => string | HTMLElement;
  headerRender?: () => string | HTMLElement;
}

export interface TableOptions<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  pagination?: {
    enabled: boolean;
    pageSize: number;
    currentPage: number;
    showSizeChanger?: boolean;
  };
  selection?: {
    enabled: boolean;
    multiple?: boolean;
    selectedRows?: T[];
    onSelectionChange?: (selected: T[]) => void;
  };
  loading?: boolean;
  emptyMessage?: string;
}

export interface FileInputOptions {
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  maxFiles?: number;
  dragDrop?: boolean;
  preview?: boolean;
  validation?: {
    allowedTypes?: string[];
    maxSizeBytes?: number;
    customValidator?: (file: File) => boolean | string;
  };
}

export interface ProgressBarOptions {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  striped?: boolean;
}

export interface ToastOptions extends Omit<Notification, 'id' | 'timestamp'> {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  autoClose?: boolean;
  showProgress?: boolean;
}