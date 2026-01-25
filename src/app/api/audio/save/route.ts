import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { type NextRequest, NextResponse } from 'next/server';

// Only allow in development
const isDev = process.env.NODE_ENV === 'development';

// Allowed hosts for local-only access
const ALLOWED_HOSTS = ['localhost', '127.0.0.1', '::1'];

// Path segment validation: alphanumeric, hyphens, underscores only
// Max length 64 characters to prevent abuse
const PATH_SEGMENT_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

/**
 * Validate and sanitize a path segment to prevent path traversal attacks.
 * Rejects segments containing:
 * - Path separators (/, \)
 * - Parent directory references (..)
 * - Null bytes
 * - Disallowed characters
 * - Excessive length
 */
function isValidPathSegment(segment: string | null): segment is string {
  if (!segment || typeof segment !== 'string') {
    return false;
  }

  // Check for null bytes
  if (segment.includes('\0')) {
    return false;
  }

  // Check for path traversal attempts
  if (
    segment.includes('..') ||
    segment.includes('/') ||
    segment.includes('\\')
  ) {
    return false;
  }

  // Validate against allowed pattern
  return PATH_SEGMENT_REGEX.test(segment);
}

/**
 * Check if the request is from an allowed local origin.
 * Prevents CSRF-style remote writes.
 *
 * Security: Origin header takes precedence over Host header.
 * If Origin exists, we validate it exclusively to prevent bypass attacks.
 */
function isAllowedHost(request: NextRequest): boolean {
  const origin = request.headers.get('origin');

  // If Origin header exists, validate it exclusively
  if (origin) {
    try {
      const url = new URL(origin);
      return ALLOWED_HOSTS.includes(url.hostname);
    } catch {
      // Invalid origin URL - fail closed
      return false;
    }
  }

  // No Origin header - validate Host header
  const host = request.headers.get('host');
  if (host) {
    try {
      // Use URL parser to handle IPv6 brackets correctly
      const url = new URL(`http://${host}`);
      return ALLOWED_HOSTS.includes(url.hostname);
    } catch {
      // Invalid host - fail closed
      return false;
    }
  }

  return false;
}

/**
 * Safely join path segments and verify the result is within the allowed root.
 * Returns null if the resolved path escapes the root directory.
 */
function safeJoinPath(root: string, ...segments: string[]): string | null {
  const joined = path.join(root, ...segments);
  const resolved = path.resolve(joined);
  const resolvedRoot = path.resolve(root);

  // Ensure the resolved path starts with the root path
  if (
    !resolved.startsWith(resolvedRoot + path.sep) &&
    resolved !== resolvedRoot
  ) {
    return null;
  }

  return resolved;
}

interface AudioFileMetadata {
  generatedAt?: string;
  uploadedAt?: string;
  hash: string;
}

interface AudioManifestEntry {
  zh?: AudioFileMetadata;
  ja?: AudioFileMetadata;
}

type AudioManifest = Record<string, AudioManifestEntry>;

function calculateHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function readManifest(manifestPath: string): AudioManifest {
  if (!fs.existsSync(manifestPath)) {
    return {};
  }
  const content = fs.readFileSync(manifestPath, 'utf-8');
  return JSON.parse(content) as AudioManifest;
}

function writeManifest(manifestPath: string, manifest: AudioManifest): void {
  const sortedKeys = Object.keys(manifest).sort();
  const sorted: AudioManifest = {};
  for (const key of sortedKeys) {
    sorted[key] = manifest[key];
  }
  fs.writeFileSync(manifestPath, `${JSON.stringify(sorted, null, 2)}\n`);
}

export async function POST(request: NextRequest) {
  // Block in production
  if (!isDev) {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 },
    );
  }

  // Verify request is from allowed local host
  if (!isAllowedHost(request)) {
    return NextResponse.json(
      { error: 'Forbidden: requests must originate from localhost' },
      { status: 403 },
    );
  }

  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const bookId = formData.get('bookId') as string | null;
    const sectionId = formData.get('sectionId') as string | null;
    const chapterId = formData.get('chapterId') as string | null;

    if (!audioFile || !bookId || !sectionId || !chapterId) {
      return NextResponse.json(
        {
          error: 'Missing required fields: audio, bookId, sectionId, chapterId',
        },
        { status: 400 },
      );
    }

    // Validate path segments to prevent path traversal attacks
    if (!isValidPathSegment(bookId)) {
      return NextResponse.json(
        {
          error:
            'Invalid bookId: must be alphanumeric with hyphens/underscores, max 64 chars',
        },
        { status: 400 },
      );
    }
    if (!isValidPathSegment(sectionId)) {
      return NextResponse.json(
        {
          error:
            'Invalid sectionId: must be alphanumeric with hyphens/underscores, max 64 chars',
        },
        { status: 400 },
      );
    }
    if (!isValidPathSegment(chapterId)) {
      return NextResponse.json(
        {
          error:
            'Invalid chapterId: must be alphanumeric with hyphens/underscores, max 64 chars',
        },
        { status: 400 },
      );
    }

    // Validate content type
    if (!audioFile.type.startsWith('audio/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Expected audio file.' },
        { status: 400 },
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Safely construct output directory path
    const audioRoot = path.join(process.cwd(), 'audio');
    const audioDir = safeJoinPath(audioRoot, bookId, sectionId);
    if (!audioDir) {
      return NextResponse.json(
        { error: 'Invalid path: resolved path is outside audio directory' },
        { status: 400 },
      );
    }
    fs.mkdirSync(audioDir, { recursive: true });

    // Safely construct file path
    const filename = `${chapterId}-ja.webm`;
    const filePath = safeJoinPath(audioRoot, bookId, sectionId, filename);
    if (!filePath) {
      return NextResponse.json(
        {
          error: 'Invalid path: resolved file path is outside audio directory',
        },
        { status: 400 },
      );
    }
    fs.writeFileSync(filePath, buffer);

    // Update manifest
    const manifestPath = path.join(process.cwd(), 'audio-manifest.json');
    const manifest = readManifest(manifestPath);
    const contentId = `${bookId}/${sectionId}/${chapterId}`;
    const now = new Date().toISOString();
    const hash = calculateHash(buffer);

    // Preserve existing zh entry if present
    const existingEntry = manifest[contentId];
    manifest[contentId] = {
      ...(existingEntry?.zh && { zh: existingEntry.zh }),
      ja: {
        generatedAt: now,
        hash,
      },
    };

    writeManifest(manifestPath, manifest);

    return NextResponse.json({
      success: true,
      filePath: `audio/${bookId}/${sectionId}/${filename}`,
      contentId,
      hash,
    });
  } catch (error) {
    console.error('Failed to save audio:', error);
    return NextResponse.json(
      { error: 'Failed to save audio file' },
      { status: 500 },
    );
  }
}
