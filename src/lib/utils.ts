import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateSlug(title: string, id: number | string) {
  const cleanTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  return `${cleanTitle}-${id}`;
}

export function extractIdFromSlug(slug: string) {
  const cleanSlug = slug.split('?')[0];
  const match = cleanSlug.match(/-(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}
