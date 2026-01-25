import * as fs from 'node:fs';
import * as path from 'node:path';
import { type NextRequest, NextResponse } from 'next/server';

// Only allow in development
const isDev = process.env.NODE_ENV === 'development';

export async function GET(request: NextRequest) {
  // Block in production
  if (!isDev) {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
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
  const normalizedPath = path.normalize(filePath);
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
