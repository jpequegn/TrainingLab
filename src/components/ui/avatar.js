import { cn } from '../../lib/utils.js';

export function Avatar({ className = '', children, ...props }) {
  const classes = cn(
    'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full',
    className
  );
  return `<div class="${classes}" ${Object.entries(props)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ')}>${children}</div>`;
}

export function AvatarImage({ className = '', src, alt = '', ...props }) {
  const classes = cn('aspect-square h-full w-full', className);
  return `<img class="${classes}" src="${src}" alt="${alt}" ${Object.entries(
    props
  )
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ')} />`;
}

export function AvatarFallback({ className = '', children, ...props }) {
  const classes = cn(
    'flex h-full w-full items-center justify-center rounded-full bg-muted',
    className
  );
  return `<div class="${classes}" ${Object.entries(props)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ')}>${children}</div>`;
}
