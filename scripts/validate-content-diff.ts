/**
 * Validate content diff between current branch and main branch
 *
 * This script:
 * 1. Gets the diff of input YAML files from origin/main
 * 2. Derives content_ids from file paths
 * 3. Validates those contents using validateContent()
 * 4. Exits with code 1 if any validation errors are found
 */

import { execSync } from 'node:child_process';
import { hanziDictionary } from '../src/data/hanzi-dictionary';
import { contents } from '../src/generated/contents';
import { validateContent } from '../src/lib/validators/content';
import { validateHanziDictionary } from '../src/lib/validators/hanzi';

/**
 * Derive content_id from input YAML file path
 * Example: contents/input/lunyu/1/1.yaml -> lunyu/1/1
 * Returns null for non-content files like frequency-blacklist.yaml
 */
function deriveContentId(filePath: string): string | null {
  const match = filePath.match(/^contents\/input\/(.+)\.yaml$/);
  if (!match) return null;

  const contentId = match[1];

  // Exclude non-content files
  if (contentId === 'frequency-blacklist' || contentId === 'compound-words') {
    return null;
  }

  return contentId;
}

/**
 * Get changed YAML files from various git sources
 */
function getChangedYamlFiles(): string[] {
  const changedFiles = new Set<string>();

  // 1. Committed changes from origin/main (if origin/main exists)
  try {
    execSync('git show-ref --verify --quiet refs/remotes/origin/main', {
      stdio: 'ignore',
    });
    const committed = execSync(
      'git diff --name-only origin/main...HEAD -- contents/input/',
      { encoding: 'utf-8' },
    ).trim();
    if (committed) {
      for (const file of committed.split('\n')) {
        changedFiles.add(file);
      }
    }
  } catch {
    // origin/main doesn't exist, skip committed changes check
  }

  // 2. Staged changes (not yet committed)
  try {
    const staged = execSync(
      'git diff --cached --name-only -- contents/input/',
      { encoding: 'utf-8' },
    ).trim();
    if (staged) {
      for (const file of staged.split('\n')) {
        changedFiles.add(file);
      }
    }
  } catch {
    // Ignore errors
  }

  // 3. Unstaged changes (modified but not staged)
  try {
    const unstaged = execSync('git diff --name-only -- contents/input/', {
      encoding: 'utf-8',
    }).trim();
    if (unstaged) {
      for (const file of unstaged.split('\n')) {
        changedFiles.add(file);
      }
    }
  } catch {
    // Ignore errors
  }

  // 4. Untracked new files
  try {
    const untracked = execSync(
      'git ls-files --others --exclude-standard -- contents/input/',
      { encoding: 'utf-8' },
    ).trim();
    if (untracked) {
      for (const file of untracked.split('\n')) {
        changedFiles.add(file);
      }
    }
  } catch {
    // Ignore errors
  }

  return [...changedFiles];
}

/**
 * Get changed content_ids from git diff
 */
function getChangedContentIds(): string[] {
  const changedFiles = getChangedYamlFiles();

  if (changedFiles.length === 0) {
    console.log('No changes in input YAML files');
    return [];
  }

  const contentIds: string[] = [];

  for (const file of changedFiles) {
    const contentId = deriveContentId(file);
    if (contentId) {
      contentIds.push(contentId);
    }
  }

  return [...new Set(contentIds)]; // Remove duplicates
}

/**
 * Check if --all flag is passed
 */
const isAllMode = process.argv.includes('--all');

/**
 * Main function
 */
function main(): void {
  // First, validate hanzi-dictionary for duplicates
  console.log('=== Hanzi Dictionary Validation ===\n');
  const hanziErrors = validateHanziDictionary(hanziDictionary);
  if (hanziErrors.size > 0) {
    console.error('❌ Hanzi dictionary validation failed:');
    for (const [entryId, errors] of hanziErrors) {
      console.error(`  Entry "${entryId}":`);
      for (const error of errors) {
        console.error(`    - [${error.field}] ${error.message}`);
      }
    }
    console.error('\nPlease fix duplicate entries in hanzi-dictionary.ts');
    process.exit(1);
  }
  console.log('✓ Hanzi dictionary validation passed (no duplicates)\n');

  let contentIdsToValidate: string[];

  if (isAllMode) {
    console.log('=== Content Validation (All) ===\n');
    contentIdsToValidate = contents.map((c) => c.content_id);
  } else {
    console.log('=== Content Diff Validation ===\n');
    contentIdsToValidate = getChangedContentIds();

    if (contentIdsToValidate.length === 0) {
      console.log('No content changes to validate.');
      process.exit(0);
    }
  }

  console.log(`Found ${contentIdsToValidate.length} content(s) to validate`);
  console.log(`Validating...\n`);

  let hasErrors = false;

  for (const contentId of contentIdsToValidate) {
    const content = contents.find((c) => c.content_id === contentId);

    if (!content) {
      console.error(`ERROR: Content not found: ${contentId}`);
      hasErrors = true;
      continue;
    }

    // Skip validation for primer contents (placeholder entries for reference)
    if ((content as Record<string, unknown>).primer === true) {
      console.log(`SKIP: ${contentId} (primer entry)`);
      continue;
    }

    const result = validateContent(content);
    const errors = result.errors.filter((e) => e.severity === 'error');
    const warnings = result.errors.filter((e) => e.severity === 'warning');

    if (errors.length > 0) {
      console.error(`FAIL: ${contentId}`);
      for (const error of errors) {
        console.error(`  - [${error.path}] ${error.message}`);
      }
      hasErrors = true;
    } else {
      console.log(`PASS: ${contentId}`);
    }

    if (warnings.length > 0) {
      for (const warning of warnings) {
        console.warn(`  WARN: [${warning.path}] ${warning.message}`);
      }
    }
  }

  console.log('');

  if (hasErrors) {
    console.error('Validation failed. Please fix the errors above.');
    process.exit(1);
  }

  console.log('All validations passed!');
  process.exit(0);
}

main();
