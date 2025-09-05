import { cn } from '../../lib/utils.js';

export function Tabs({ className = '', children, ...props }) {
  const classes = cn('w-full', className);
  return `<div class="${classes}" ${Object.entries(props)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ')}>${children}</div>`;
}

export function TabsList({ className = '', children, ...props }) {
  const classes = cn(
    'inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground',
    className
  );
  return `<div class="${classes}" ${Object.entries(props)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ')}>${children}</div>`;
}

export function TabsTrigger({ className = '', children, value, ...props }) {
  const classes = cn(
    'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
    className
  );
  return `<button class="${classes}" data-tab="${value}" ${Object.entries(props)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ')}>${children}</button>`;
}

export function TabsContent({ className = '', children, value, ...props }) {
  const classes = cn(
    'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-full min-h-0',
    className
  );
  return `<div class="${classes}" data-tab-content="${value}" ${Object.entries(
    props
  )
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ')}>${children}</div>`;
}
