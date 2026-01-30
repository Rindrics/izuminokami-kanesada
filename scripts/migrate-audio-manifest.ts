/**
 * Migrate chapter-based audio manifest to segment-based format
 *
 * Usage:
 *   pnpm migrate:audio-manifest              # Dry run (show what would change)
 *   pnpm migrate:audio-manifest --apply      # Apply changes
 *
 * This script:
 * 1. Reads audio-manifest.json and identifies legacy entries (without segments array)
 * 2. Converts them to segment-based format (legacy entry becomes segment index 0)
 * 3. Optionally regenerates audio files using generate-audio script
 *
 * Note: This is a one-time migration script. After migration, the legacy format
 * will no longer be used.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  AudioManifest,
  AudioManifestEntry,
  AudioSegment,
} from '../src/lib/audio-manifest';

const MANIFEST_PATH = path.join(process.cwd(), 'audio-manifest.json');

interface LegacyAudioFileMetadata {
  generatedAt?: string;
  uploadedAt?: string;
  hash: string;
}

interface LegacyAudioManifestEntry {
  zh?: LegacyAudioFileMetadata;
  ja?: LegacyAudioFileMetadata;
}

type MixedManifest = Record<
  string,
  AudioManifestEntry | LegacyAudioManifestEntry
>;

/**
 * Check if an entry is in legacy format (no segments array)
 */
function isLegacyEntry(
  entry: AudioManifestEntry | LegacyAudioManifestEntry,
): entry is LegacyAudioManifestEntry {
  return !('segments' in entry);
}

/**
 * Convert legacy entry to new segment-based format
 * Legacy entries are treated as segment index 0
 */
function convertLegacyEntry(
  entry: LegacyAudioManifestEntry,
): AudioManifestEntry {
  const segment: AudioSegment = { index: 0 };
  if (entry.zh) segment.zh = entry.zh;
  if (entry.ja) segment.ja = entry.ja;
  return { segments: [segment] };
}

/**
 * Read manifest from file
 */
function readManifest(): MixedManifest {
  if (!fs.existsSync(MANIFEST_PATH)) {
    return {};
  }
  const content = fs.readFileSync(MANIFEST_PATH, 'utf-8');
  return JSON.parse(content) as MixedManifest;
}

/**
 * Write manifest to file (sorted by key)
 */
function writeManifest(manifest: AudioManifest): void {
  const sortedKeys = Object.keys(manifest).sort();
  const sorted: AudioManifest = {};
  for (const key of sortedKeys) {
    sorted[key] = manifest[key];
  }
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(sorted, null, 2)}\n`);
}

/**
 * Main migration function
 */
function migrateManifest(dryRun: boolean): void {
  console.log('=== Audio Manifest Migration ===\n');
  console.log(
    `Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'APPLY'}`,
  );
  console.log('');

  const manifest = readManifest();
  const entries = Object.entries(manifest);

  if (entries.length === 0) {
    console.log('No entries found in audio-manifest.json');
    return;
  }

  console.log(`Found ${entries.length} total entries\n`);

  // Identify legacy entries
  const legacyEntries: [string, LegacyAudioManifestEntry][] = [];
  const newFormatEntries: [string, AudioManifestEntry][] = [];

  for (const [contentId, entry] of entries) {
    if (isLegacyEntry(entry)) {
      legacyEntries.push([contentId, entry]);
    } else {
      newFormatEntries.push([contentId, entry]);
    }
  }

  console.log(`Legacy format entries: ${legacyEntries.length}`);
  console.log(`New format entries: ${newFormatEntries.length}`);
  console.log('');

  if (legacyEntries.length === 0) {
    console.log(
      '✓ No legacy entries to migrate. All entries are already in segment-based format.',
    );
    return;
  }

  // Show what will be migrated
  console.log('Entries to migrate:');
  for (const [contentId, entry] of legacyEntries) {
    const langs = [];
    if (entry.zh) langs.push('zh');
    if (entry.ja) langs.push('ja');
    console.log(`  - ${contentId} (${langs.join(', ')})`);
  }
  console.log('');

  if (dryRun) {
    console.log('=== Dry Run Complete ===');
    console.log('');
    console.log('To apply changes, run:');
    console.log('  pnpm migrate:audio-manifest --apply');
    console.log('');
    console.log('Note: After migration, you should regenerate audio files');
    console.log('using pnpm generate:audio to create segment-level files.');
    return;
  }

  // Apply migration
  console.log('Migrating entries...');
  const migratedManifest: AudioManifest = {};

  // Add already-new-format entries
  for (const [contentId, entry] of newFormatEntries) {
    migratedManifest[contentId] = entry;
  }

  // Convert legacy entries
  for (const [contentId, entry] of legacyEntries) {
    const converted = convertLegacyEntry(entry);
    migratedManifest[contentId] = converted;
    console.log(`  ✓ ${contentId}`);
  }

  // Write migrated manifest
  writeManifest(migratedManifest);
  console.log('');
  console.log(`Updated: ${MANIFEST_PATH}`);

  console.log('');
  console.log('=== Migration Complete ===');
  console.log('');
  console.log(
    `Migrated ${legacyEntries.length} entries to segment-based format.`,
  );
  console.log('');
  console.log('Next steps:');
  console.log('1. Review the changes in audio-manifest.json');
  console.log('2. Regenerate audio files to create segment-level files:');
  for (const [contentId] of legacyEntries) {
    const [bookId, sectionId, chapterId] = contentId.split('/');
    console.log(`   pnpm generate:audio ${bookId} ${sectionId} ${chapterId}`);
  }
}

// Parse arguments
const args = process.argv.slice(2);
const applyMode = args.includes('--apply');

migrateManifest(!applyMode);
