import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const normalizeName = (name) => {
  return name
    .normalize('NFD')
    .replace(/\s*[({[].*?[})\]]/g, '') // Remove anything inside (), [], {} and the (),[],{} themselves
    .replace(/ø/g, 'oe') // replace all 'ø' with 'oe'
    .replace(/\p{Diacritic}/gu, '')
    .trim();
};

const toSlug = (name: string) => normalizeName(name).toLowerCase().replace(/\s+/g, '-');
