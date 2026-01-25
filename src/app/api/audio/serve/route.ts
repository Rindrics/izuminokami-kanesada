import * as fs from 'node:fs';
import * as path from 'node:path';
import { type NextRequest, NextResponse } from 'next/server';

// Only allow in development
const isDev = process.env.NODE_ENV === 'development';

// Allowed hosts for local-only access
const ALLOWED_HOSTS = ['localhost', '127.0.0.1', '::1'];

/**
 * Check if the request is from an allowed local origin.
 * Prevents CSRF-style remote access.
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

export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get('path');

  if (!filePath) {
    return NextResponse.json(
      { error: 'Missing path parameter' },
      { status: 400 },
    );
  }

  // Validate path to prevent directory traversal
  // Normalize to POSIX-style separators for consistent validation across platforms
  const normalizedPath = path.normalize(filePath).replace(/\\/g, '/');
  if (normalizedPath.includes('..') || !normalizedPath.startsWith('audio/')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const fullPath = path.join(process.cwd(), normalizedPath);

  if (!fs.existsSync(fullPath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  try {
    const buffer = fs.readFileSync(fullPath);
    const ext = path.extname(fullPath).toLowerCase();

    const contentType =
      ext === '.webm'
        ? 'audio/webm'
        : ext === '.mp3'
          ? 'audio/mpeg'
          : 'application/octet-stream';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Failed to serve audio:', error);
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}
