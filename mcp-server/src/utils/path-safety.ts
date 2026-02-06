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
 * For non-existent paths, resolves the closest existing ancestor and reconstructs
 * the intended path to allow write operations to new files.
 */
export function isPathWithinBase(filePath: string, baseDir: string): boolean {
  try {
    // Resolve baseDir with symlink resolution (must exist)
    const resolvedBase = fs.realpathSync(path.resolve(baseDir));
    const normalizedBase = path.normalize(resolvedBase);

    // Try to resolve filePath directly first
    const absoluteFilePath = path.resolve(filePath);
    let resolvedPath: string;

    try {
      // If path exists, resolve symlinks directly
      resolvedPath = fs.realpathSync(absoluteFilePath);
    } catch {
      // Path doesn't exist - find closest existing ancestor
      let currentPath = absoluteFilePath;
      let existingAncestor: string | null = null;

      while (currentPath !== path.dirname(currentPath)) {
        currentPath = path.dirname(currentPath);
        if (fs.existsSync(currentPath)) {
          existingAncestor = currentPath;
          break;
        }
      }

      if (!existingAncestor) {
        // No existing ancestor found, deny access
        return false;
      }

      // Resolve symlinks for the existing ancestor
      const resolvedAncestor = fs.realpathSync(existingAncestor);

      // Reconstruct the intended path by appending remaining segments
      const remainingPath = path.relative(existingAncestor, absoluteFilePath);
      resolvedPath = path.join(resolvedAncestor, remainingPath);
    }

    // Normalize for comparison
    const normalizedPath = path.normalize(resolvedPath);

    // Check if path equals base or is within base directory
    return (
      normalizedPath === normalizedBase ||
      normalizedPath.startsWith(normalizedBase + path.sep)
    );
  } catch {
    // Unexpected error (e.g., permission denied on baseDir), deny access
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
