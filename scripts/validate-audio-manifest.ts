/**
 * Validate that all changed content YAML files have corresponding audio entries
 * in audio-manifest.json
 *
 * Usage:
 *   pnpm validate:audio-manifest
 *
 * This script:
 * 1. Finds content YAML files changed since origin/main
 * 2. Checks that each has an entry in audio-manifest.json
 * 3. Exits with code 1 if any are missing (blocks push)
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

interface AudioFileMetadata {
  generatedAt?: string;
  uploadedAt?: string;
  hash: string;
}

interface AudioManifestEntry {
  zh: AudioFileMetadata;
  ja?: AudioFileMetadata; // Optional: Japanese audio may not be available for all content
}

type AudioManifest = Record<string, AudioManifestEntry>;

const MANIFEST_PATH = path.join(process.cwd(), 'audio-manifest.json');
const CONTENT_INPUT_DIR = 'contents/input';

/**
 * Get list of changed YAML files in contents/input/ compared to origin/main
 * @throws Error if git diff fails or origin/main is unavailable
 */
function getChangedYamlFiles(): string[] {
  try {
    // Get files changed between origin/main and HEAD
    const output = execSync(
      'git diff --name-only origin/main...HEAD -- "contents/input/**/*.yaml"',
      { encoding: 'utf-8' },
    );

    return output
      .trim()
      .split('\n')
      .filter((line) => line.length > 0);
  } catch (error) {
    // Log the full error details
    console.error(
      '❌ Failed to get changed YAML files from git diff:',
      error instanceof Error ? error.message : String(error),
    );
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    throw new Error(
      'Cannot validate audio manifest: git diff failed. ' +
        'This usually means origin/main is not available or git is not accessible. ' +
        'Please ensure you have a valid git repository with origin/main configured.',
    );
  }
}

/**
 * Convert YAML path to content ID
 * e.g., "contents/input/lunyu/1/1.yaml" -> "lunyu/1/1"
 */
function yamlPathToContentId(yamlPath: string): string {
  // Remove "contents/input/" prefix and ".yaml" suffix
  const relativePath = yamlPath.replace(`${CONTENT_INPUT_DIR}/`, '');
  return relativePath.replace('.yaml', '');
}

/**
 * Read audio manifest from file
 */
function readManifest(): AudioManifest {
  if (!fs.existsSync(MANIFEST_PATH)) {
    return {};
  }
  const content = fs.readFileSync(MANIFEST_PATH, 'utf-8');
  return JSON.parse(content) as AudioManifest;
}

/**
 * Validate that all changed YAML files have audio entries
 */
function validateAudioManifest(): boolean {
  console.log('=== Audio Manifest Validation ===\n');

  const changedYamls = getChangedYamlFiles();

  if (changedYamls.length === 0) {
    console.log('No changed content YAML files found.');
    console.log('\n=== Validation Passed ===');
    return true;
  }

  console.log(`Found ${changedYamls.length} changed content YAML file(s):`);
  for (const yaml of changedYamls) {
    console.log(`  - ${yaml}`);
  }

  const manifest = readManifest();
  const missingAudio: string[] = [];

  for (const yamlPath of changedYamls) {
    const contentId = yamlPathToContentId(yamlPath);
    const entry = manifest[contentId];

    if (!entry) {
      missingAudio.push(contentId);
      continue;
    }

    // Check that zh entry exists (ja is optional)
    if (!entry.zh) {
      missingAudio.push(contentId);
    }
  }

  if (missingAudio.length > 0) {
    console.log('\n❌ Missing audio for the following content:');
    for (const contentId of missingAudio) {
      console.log(`  - ${contentId}`);
    }
    console.log('\nPlease run the following commands to generate audio:');
    for (const contentId of missingAudio) {
      const [bookId, sectionId, chapterId] = contentId.split('/');
      console.log(`  pnpm generate:audio ${bookId} ${sectionId} ${chapterId}`);
    }
    console.log('\n=== Validation Failed ===');
    return false;
  }

  console.log('\n✓ All changed content has audio entries.');
  console.log('\n=== Validation Passed ===');
  return true;
}

// Run validation
try {
  const isValid = validateAudioManifest();
  process.exit(isValid ? 0 : 1);
} catch (error) {
  console.error(
    '\n❌ Audio manifest validation failed with error:',
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
}
