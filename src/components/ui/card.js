import { cn } from '../../lib/utils.js';

export function Card({ className = '', children, ...props }) {
  const classes = cn(
    'rounded-lg border bg-card text-card-foreground shadow-sm',
    className
  );

  return `<div class="${classes}" ${Object.entries(props)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ')}>${children}</div>`;
}

export function CardHeader({ className = '', children, ...props }) {
  const classes = cn('flex flex-col space-y-1.5 p-6', className);
  return `<div class="${classes}" ${Object.entries(props)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ')}>${children}</div>`;
}

export function CardTitle({ className = '', children, ...props }) {
  const classes = cn(
    'text-2xl font-semibold leading-none tracking-tight',
    className
  );
  return `<h3 class="${classes}" ${Object.entries(props)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ')}>${children}</h3>`;
}

export function CardDescription({ className = '', children, ...props }) {
  const classes = cn('text-sm text-muted-foreground', className);
  return `<p class="${classes}" ${Object.entries(props)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ')}>${children}</p>`;
}

export function CardContent({ className = '', children, ...props }) {
  const classes = cn('p-6 pt-0', className);
  return `<div class="${classes}" ${Object.entries(props)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ')}>${children}</div>`;
}

export function CardFooter({ className = '', children, ...props }) {
  const classes = cn('flex items-center p-6 pt-0', className);
  return `<div class="${classes}" ${Object.entries(props)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ')}>${children}</div>`;
}
