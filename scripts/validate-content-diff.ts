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
import { contents } from '../src/generated/contents';
import { validateContent } from '../src/lib/validators/content';

/**
 * Derive content_id from input YAML file path
 * Example: contents/input/lunyu/1/1.yaml -> lunyu/1/1
 */
function deriveContentId(filePath: string): string | null {
  const match = filePath.match(/^contents\/input\/(.+)\.yaml$/);
  return match ? match[1] : null;
}

/**
 * Get changed content_ids from git diff
 */
function getChangedContentIds(): string[] {
  // Check if origin/main exists
  try {
    execSync('git show-ref --verify --quiet refs/remotes/origin/main', {
      stdio: 'ignore',
    });
  } catch {
    console.warn('origin/main not found. Validating all contents.');
    return contents.map((c) => c.content_id);
  }

  try {
    // Get list of changed YAML files
    const output = execSync(
      'git diff --name-only origin/main...HEAD -- contents/input/',
      { encoding: 'utf-8' },
    );

    if (!output.trim()) {
      console.log('No changes in input YAML files');
      return [];
    }

    const changedFiles = output.trim().split('\n');
    const contentIds: string[] = [];

    for (const file of changedFiles) {
      const contentId = deriveContentId(file);
      if (contentId) {
        contentIds.push(contentId);
      }
    }

    return [...new Set(contentIds)]; // Remove duplicates
  } catch (error) {
    console.error('Failed to get git diff:', error);
    process.exit(1);
  }
}

/**
 * Main function
 */
function main(): void {
  console.log('=== Content Diff Validation ===\n');

  const contentIdsToValidate = getChangedContentIds();

  if (contentIdsToValidate.length === 0) {
    console.log('No content changes to validate.');
    process.exit(0);
  }

  console.log(`Found ${contentIdsToValidate.length} changed content(s)`);
  console.log(`Validating...\n`);

  let hasErrors = false;

  for (const contentId of contentIdsToValidate) {
    const content = contents.find((c) => c.content_id === contentId);

    if (!content) {
      console.error(`ERROR: Content not found: ${contentId}`);
      hasErrors = true;
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
