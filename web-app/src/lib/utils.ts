import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function decodeHtmlEntities(text?: string): string {
  if (!text) return '';
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}
