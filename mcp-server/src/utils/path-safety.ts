import * as fs from 'node:fs';
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
 * Validate that the resolved path is within the allowed base directory.
 * Uses fs.realpathSync to resolve symlinks and prevent symlink bypass attacks.
 */
export function isPathWithinBase(filePath: string, baseDir: string): boolean {
  try {
    // Resolve symlinks for both paths to prevent bypass via symlinks
    const resolvedPath = fs.realpathSync(path.resolve(filePath));
    const resolvedBase = fs.realpathSync(path.resolve(baseDir));

    // Normalize paths for comparison
    const normalizedPath = path.normalize(resolvedPath);
    const normalizedBase = path.normalize(resolvedBase);

    // Check if path equals base or is within base directory
    return (
      normalizedPath === normalizedBase ||
      normalizedPath.startsWith(normalizedBase + path.sep)
    );
  } catch {
    // If realpath fails (e.g., path doesn't exist, permission denied),
    // return false to deny access
    return false;
  }
}

/**
 * Zod schema for safe path segment (prevents path traversal)
 */
export const SafePathSegmentSchema = z.string().refine(isSafePathSegment, {
  message:
    'Invalid path segment: must contain only alphanumeric characters, hyphens, or underscores',
});
