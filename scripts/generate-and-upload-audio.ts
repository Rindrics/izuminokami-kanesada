/**
 * Orchestrator script: Generate and upload audio files
 *
 * Usage:
 *   pnpm generate:audio <bookId> <sectionId> <chapterId>
 *   pnpm generate:audio lunyu 1 1
 *
 * This script:
 * 1. Calls generate-audio.ts to generate audio files
 * 2. Calls upload-audio.ts to upload generated files to Cloud Storage
 *
 * Environment variables:
 *   GOOGLE_APPLICATION_CREDENTIALS - Path to service account JSON (required for both)
 *   GCS_BUCKET - Cloud Storage bucket name (required for upload)
 */

import { execSync } from 'node:child_process';

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.error(
      'Usage: pnpm generate:audio <bookId> <sectionId> <chapterId>',
    );
    console.error('Example: pnpm generate:audio lunyu 1 1');
    process.exit(1);
  }

  const [bookId, sectionId, chapterId] = args;
  const contentId = `${bookId}/${sectionId}/${chapterId}`;

  console.log(`=== Generate and Upload Audio: ${contentId} ===\n`);

  // Step 1: Generate audio files
  console.log('Step 1: Generating audio files...\n');
  try {
    execSync(
      `pnpm tsx scripts/generate-audio.ts ${bookId} ${sectionId} ${chapterId}`,
      {
        stdio: 'inherit',
      },
    );
  } catch (error) {
    console.error('\n❌ Audio generation failed.');
    process.exit(1);
  }

  // Step 2: Upload audio files
  console.log('\nStep 2: Uploading audio files to Cloud Storage...\n');
  try {
    execSync(
      `pnpm tsx scripts/upload-audio.ts ${bookId} ${sectionId} ${chapterId}`,
      {
        stdio: 'inherit',
      },
    );
  } catch (error) {
    console.error('\n⚠️  Audio generation completed, but upload failed.');
    console.error('  You can upload manually later using: pnpm upload:audio');
    process.exit(1);
  }

  console.log('\n=== Complete ===');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
