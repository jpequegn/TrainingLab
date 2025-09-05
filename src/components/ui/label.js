import { cn } from '../../lib/utils.js';

export function Label({ className = '', children, htmlFor, ...props }) {
  const classes = cn(
    'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
    className
  );
  return `<label class="${classes}" ${htmlFor ? `for="${htmlFor}"` : ''} ${Object.entries(
    props
  )
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ')}>${children}</label>`;
}
