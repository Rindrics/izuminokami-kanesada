import * as path from 'node:path';
import { z } from 'zod';

/**
 * Safe path segment pattern: alphanumeric, hyphen, underscore only
 * Prevents path traversal attacks (e.g., "../", "/", etc.)
 */
export const SAFE_PATH_SEGMENT_PATTERN = /^[a-zA-Z0-9_-]+$/;

/**
 * Validate that a path segment is safe (no path traversal)
 */
export function isSafePathSegment(segment: string): boolean {
  return SAFE_PATH_SEGMENT_PATTERN.test(segment) && !segment.includes('..');
}

/**
 * Validate that the resolved path is within the allowed base directory
 */
export function isPathWithinBase(filePath: string, baseDir: string): boolean {
  const resolvedPath = path.resolve(filePath);
  const resolvedBase = path.resolve(baseDir);
  return resolvedPath.startsWith(resolvedBase + path.sep);
}

/**
 * Zod schema for safe path segment (prevents path traversal)
 */
export const SafePathSegmentSchema = z.string().refine(isSafePathSegment, {
  message:
    'Invalid path segment: must contain only alphanumeric characters, hyphens, or underscores',
});
