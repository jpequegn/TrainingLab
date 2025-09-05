import { cn } from '../../lib/utils.js';

export function Input({ className = '', type = 'text', ...props }) {
  const classes = cn(
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
    className
  );

  return `<input type="${type}" class="${classes}" ${Object.entries(props)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ')} />`;
}

export function createInput({
  className = '',
  type = 'text',
  id,
  value = '',
  placeholder,
  ...props
}) {
  const classes = cn(
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
    className
  );

  const input = document.createElement('input');
  input.type = type;
  input.className = classes;
  if (id) input.id = id;
  if (value) input.value = value;
  if (placeholder) input.placeholder = placeholder;

  Object.entries(props).forEach(([key, value]) => {
    input.setAttribute(key, value);
  });

  return input;
}
