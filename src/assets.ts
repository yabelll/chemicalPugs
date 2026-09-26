import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceDirectory = dirname(fileURLToPath(import.meta.url));
const imageDirectory = resolve(sourceDirectory, '../image');

export function imagePath(filename: string): string {
  return resolve(imageDirectory, filename);
}

export function resolveStoredImagePath(path: string): string {
  return isAbsolute(path) ? path : resolve(sourceDirectory, '..', path);
}
