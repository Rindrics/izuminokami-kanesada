import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { type NextRequest, NextResponse } from 'next/server';

// Only allow in development
const isDev = process.env.NODE_ENV === 'development';

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

    // Create output directory
    const audioDir = path.join(process.cwd(), 'audio', bookId, sectionId);
    fs.mkdirSync(audioDir, { recursive: true });

    // Save audio file
    const filename = `${chapterId}-ja.webm`;
    const filePath = path.join(audioDir, filename);
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
