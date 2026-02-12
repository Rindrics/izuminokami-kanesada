/**
 * Validate that all changed content YAML files have corresponding audio entries
 * in audio-manifest.json for all segments
 *
 * Usage:
 *   pnpm validate:audio-manifest
 *
 * This script:
 * 1. Finds content YAML files changed since origin/main
 * 2. Reads each YAML to determine segment count
 * 3. Checks that each segment has an entry in audio-manifest.json
 * 4. Exits with code 1 if any are missing (blocks push)
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import yaml from 'js-yaml';
import { type AudioManifest, getSegmentAudio } from '../src/lib/audio-manifest';

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

interface ContentYaml {
  segments: unknown[];
  primer?: boolean;
}

/**
 * Read YAML file and return segment count
 */
function getSegmentCount(yamlPath: string): number {
  const fullPath = path.join(process.cwd(), yamlPath);
  if (!fs.existsSync(fullPath)) {
    return 0;
  }
  const content = fs.readFileSync(fullPath, 'utf-8');
  const parsed = yaml.load(content) as ContentYaml;
  return parsed.segments?.length ?? 0;
}

interface MissingSegment {
  contentId: string;
  segmentIndex: number;
}

/**
 * Validate that all changed YAML files have audio entries for all segments
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
  for (const yamlFile of changedYamls) {
    console.log(`  - ${yamlFile}`);
  }

  const manifest = readManifest();
  const missingSegments: MissingSegment[] = [];
  const contentsMissingAll: string[] = [];

  for (const yamlPath of changedYamls) {
    const contentId = yamlPathToContentId(yamlPath);

    // Check if this is a primer content (skip validation)
    const fullPath = path.join(process.cwd(), yamlPath);
    if (fs.existsSync(fullPath)) {
      const yamlContent = fs.readFileSync(fullPath, 'utf-8');
      const parsedYaml = yaml.load(yamlContent) as ContentYaml;
      if (parsedYaml.primer === true) {
        console.log(`  ⏭️  ${contentId}: Skipping primer content`);
        continue;
      }
    }

    const entry = manifest[contentId];
    const segmentCount = getSegmentCount(yamlPath);

    if (segmentCount === 0) {
      console.log(`  ⚠️  ${contentId}: No segments found in YAML`);
      continue;
    }

    if (!entry) {
      contentsMissingAll.push(contentId);
      continue;
    }

    // Check that zh entry exists for all segments
    for (let i = 0; i < segmentCount; i++) {
      const zhAudio = getSegmentAudio(entry, i, 'zh');
      if (!zhAudio) {
        missingSegments.push({ contentId, segmentIndex: i });
      }
    }
  }

  const hasErrors = contentsMissingAll.length > 0 || missingSegments.length > 0;

  if (contentsMissingAll.length > 0) {
    console.log('\n❌ No audio entries for the following content:');
    for (const contentId of contentsMissingAll) {
      console.log(`  - ${contentId}`);
    }
  }

  if (missingSegments.length > 0) {
    console.log('\n❌ Missing audio for the following segments:');
    for (const { contentId, segmentIndex } of missingSegments) {
      console.log(`  - ${contentId} segment ${segmentIndex}`);
    }
  }

  if (hasErrors) {
    // Get unique content IDs that need audio generation
    const contentIdsToGenerate = new Set([
      ...contentsMissingAll,
      ...missingSegments.map((m) => m.contentId),
    ]);

    console.log('\nPlease run the following commands to generate audio:');
    for (const contentId of contentIdsToGenerate) {
      const [bookId, sectionId, chapterId] = contentId.split('/');
      console.log(`  pnpm generate:audio ${bookId} ${sectionId} ${chapterId}`);
    }
    console.log('\n=== Validation Failed ===');
    return false;
  }

  console.log('\n✓ All changed content has audio entries for all segments.');
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
