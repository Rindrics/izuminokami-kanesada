/**
 * Upload generated audio files to Cloud Storage
 *
 * Usage:
 *   pnpm upload:audio                    # Upload all pending audio files
 *   pnpm upload:audio lunyu 1 1          # Upload specific content (all segments)
 *
 * Environment variables:
 *   GOOGLE_APPLICATION_CREDENTIALS - Path to service account JSON
 *   GCS_BUCKET - Cloud Storage bucket name (required)
 *
 * This script:
 * 1. Reads audio-manifest.json to find segment files with generatedAt (not yet uploaded)
 * 2. Uploads them to Cloud Storage
 * 3. Updates manifest: removes generatedAt, adds uploadedAt
 *
 * File naming convention:
 * - Segment audio: audio/{bookId}/{sectionId}/{chapterId}-{segmentIndex}-{lang}.{ext}
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Storage } from '@google-cloud/storage';
import type { AudioManifest } from '../src/lib/audio-manifest';

// ============================================================================
// Manifest Functions
// ============================================================================

const MANIFEST_PATH = path.join(process.cwd(), 'audio-manifest.json');
const AUDIO_DIR = path.join(process.cwd(), 'audio');

function readManifest(): AudioManifest {
  if (!fs.existsSync(MANIFEST_PATH)) {
    return {};
  }
  const content = fs.readFileSync(MANIFEST_PATH, 'utf-8');
  return JSON.parse(content) as AudioManifest;
}

function writeManifest(manifest: AudioManifest): void {
  const sortedKeys = Object.keys(manifest).sort();
  const sorted: AudioManifest = {};
  for (const key of sortedKeys) {
    sorted[key] = manifest[key];
  }
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(sorted, null, 2)}\n`);
}

// ============================================================================
// Cloud Storage Functions
// ============================================================================

function initializeStorage(): { storage: Storage; bucketName: string } {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialsPath) {
    throw new Error(
      'GOOGLE_APPLICATION_CREDENTIALS environment variable is not set.',
    );
  }

  const bucketName = process.env.GCS_BUCKET;
  if (!bucketName) {
    throw new Error('GCS_BUCKET environment variable is not set.');
  }

  console.log(`  Credentials file: ${credentialsPath}`);
  console.log(`  Storage bucket: ${bucketName}`);

  const storage = new Storage({
    keyFilename: credentialsPath,
  });

  return { storage, bucketName };
}

async function uploadFile(
  storage: Storage,
  bucketName: string,
  localPath: string,
  remotePath: string,
): Promise<string> {
  const bucket = storage.bucket(bucketName);

  // Determine content type based on file extension
  const contentType = remotePath.endsWith('.webm')
    ? 'audio/webm'
    : 'audio/mpeg';

  await bucket.upload(localPath, {
    destination: remotePath,
    metadata: {
      contentType,
      cacheControl: 'public, max-age=31536000', // 1 year cache
    },
  });

  // Note: Public access is controlled at bucket level (Uniform bucket-level access)
  // No need to call makePublic() on individual objects

  // Return public URL
  return `https://storage.googleapis.com/${bucketName}/${remotePath}`;
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Upload audio files for a specific content (all segments)
 * Exported for use by other scripts
 */
export async function uploadContentAudio(
  bookId: string,
  sectionId: string,
  chapterId: string,
): Promise<void> {
  const contentId = `${bookId}/${sectionId}/${chapterId}`;

  // Read manifest
  const manifest = readManifest();
  const pendingUploads = findPendingUploads(manifest, contentId);

  if (pendingUploads.length === 0) {
    console.log(`No pending uploads found for ${contentId}.`);
    return;
  }

  console.log(`Uploading ${pendingUploads.length} file(s) for ${contentId}:`);
  for (const upload of pendingUploads) {
    console.log(
      `  - ${upload.contentId} segment ${upload.segmentIndex} (${upload.lang})`,
    );
  }
  console.log('');

  // Initialize Cloud Storage
  const { storage, bucketName } = initializeStorage();

  // Upload files
  let _successCount = 0;
  let errorCount = 0;

  for (const upload of pendingUploads) {
    try {
      // Check if local file exists
      if (!fs.existsSync(upload.localPath)) {
        console.log(
          `  ❌ ${upload.contentId} segment ${upload.segmentIndex} (${upload.lang}): Local file not found`,
        );
        errorCount++;
        continue;
      }

      const url = await uploadFile(
        storage,
        bucketName,
        upload.localPath,
        upload.remotePath,
      );
      console.log(
        `  ✓ ${upload.contentId} segment ${upload.segmentIndex} (${upload.lang})`,
      );
      console.log(`    URL: ${url}`);

      // Update manifest: remove generatedAt, add uploadedAt
      const entry = manifest[upload.contentId];
      const segment = entry.segments.find(
        (s) => s.index === upload.segmentIndex,
      );

      if (segment) {
        const langEntry = segment[upload.lang];
        if (langEntry) {
          const now = new Date().toISOString();
          delete langEntry.generatedAt;
          langEntry.uploadedAt = now;
        }
      }

      _successCount++;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.log(
        `  ❌ ${upload.contentId} segment ${upload.segmentIndex} (${upload.lang}): ${errorMessage}`,
      );
      errorCount++;
    }
  }

  // Save updated manifest
  writeManifest(manifest);
  console.log(`\nUpdated: ${MANIFEST_PATH}`);

  if (errorCount > 0) {
    throw new Error(`Upload failed for ${errorCount} file(s)`);
  }
}

interface PendingUpload {
  contentId: string;
  segmentIndex: number;
  lang: 'zh' | 'ja';
  localPath: string;
  remotePath: string;
}

function findPendingUploads(
  manifest: AudioManifest,
  filterContentId?: string,
): PendingUpload[] {
  const pending: PendingUpload[] = [];

  for (const [contentId, entry] of Object.entries(manifest)) {
    // Skip if filtering by content ID and doesn't match
    if (filterContentId && contentId !== filterContentId) {
      continue;
    }

    // Skip entries without segments array (legacy format)
    if (!entry.segments) {
      continue;
    }

    const [bookId, sectionId, chapterId] = contentId.split('/');

    // Process all segments
    for (const segment of entry.segments) {
      const segmentIndex = segment.index;

      // Segment audio filename: {chapterId}-{segmentIndex}-{lang}.{ext}
      const zhFilename = `${chapterId}-${segmentIndex}-zh.mp3`;
      const jaFilename = `${chapterId}-${segmentIndex}-ja.webm`;

      // Check Chinese audio
      if (segment.zh?.generatedAt && !segment.zh.uploadedAt) {
        pending.push({
          contentId,
          segmentIndex,
          lang: 'zh',
          localPath: path.join(AUDIO_DIR, bookId, sectionId, zhFilename),
          remotePath: `audio/${bookId}/${sectionId}/${zhFilename}`,
        });
      }

      // Check Japanese audio (webm format for manually recorded)
      if (segment.ja?.generatedAt && !segment.ja.uploadedAt) {
        pending.push({
          contentId,
          segmentIndex,
          lang: 'ja',
          localPath: path.join(AUDIO_DIR, bookId, sectionId, jaFilename),
          remotePath: `audio/${bookId}/${sectionId}/${jaFilename}`,
        });
      }
    }
  }

  return pending;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  let filterContentId: string | undefined;
  if (args.length >= 3) {
    filterContentId = `${args[0]}/${args[1]}/${args[2]}`;
  }

  console.log('=== Audio Upload to Cloud Storage ===\n');

  // Read manifest
  const manifest = readManifest();
  const pendingUploads = findPendingUploads(manifest, filterContentId);

  if (pendingUploads.length === 0) {
    console.log('No pending uploads found.');
    if (filterContentId) {
      console.log(`  (Filtered by: ${filterContentId})`);
    }
    return;
  }

  console.log(`Found ${pendingUploads.length} file(s) to upload:`);
  for (const upload of pendingUploads) {
    console.log(
      `  - ${upload.contentId} segment ${upload.segmentIndex} (${upload.lang})`,
    );
  }
  console.log('');

  // Initialize Cloud Storage
  console.log('Initializing Cloud Storage...');
  const { storage, bucketName } = initializeStorage();
  console.log('');

  // Upload files
  console.log('Uploading files...');
  let successCount = 0;
  let errorCount = 0;

  for (const upload of pendingUploads) {
    try {
      // Check if local file exists
      if (!fs.existsSync(upload.localPath)) {
        console.log(
          `  ❌ ${upload.contentId} segment ${upload.segmentIndex} (${upload.lang}): Local file not found`,
        );
        errorCount++;
        continue;
      }

      const url = await uploadFile(
        storage,
        bucketName,
        upload.localPath,
        upload.remotePath,
      );
      console.log(
        `  ✓ ${upload.contentId} segment ${upload.segmentIndex} (${upload.lang})`,
      );
      console.log(`    URL: ${url}`);

      // Update manifest: remove generatedAt, add uploadedAt
      const entry = manifest[upload.contentId];
      const segment = entry.segments.find(
        (s) => s.index === upload.segmentIndex,
      );

      if (segment) {
        const langEntry = segment[upload.lang];
        if (langEntry) {
          const now = new Date().toISOString();
          delete langEntry.generatedAt;
          langEntry.uploadedAt = now;
        }
      }

      successCount++;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.log(
        `  ❌ ${upload.contentId} segment ${upload.segmentIndex} (${upload.lang}): ${errorMessage}`,
      );
      errorCount++;
    }
  }

  // Save updated manifest
  writeManifest(manifest);
  console.log(`\nUpdated: ${MANIFEST_PATH}`);

  console.log(`\n=== Upload Complete ===`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Errors: ${errorCount}`);

  if (errorCount > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
