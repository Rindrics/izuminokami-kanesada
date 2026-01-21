/**
 * Validate content diff between current branch and main branch
 *
 * This script:
 * 1. Gets the diff of contents directory from origin/main
 * 2. Identifies added content_ids
 * 3. Validates those contents using validateContent()
 * 4. Exits with code 1 if any validation errors are found
 */

import { execSync } from 'node:child_process';
import { contents } from '../src/data/contents';
import { validateContent } from '../src/lib/validators/content';

interface DiffResult {
  addedContentIds: string[];
  modifiedContentIds: string[];
}

/**
 * Parse git diff output to find added/modified content_ids
 */
function parseContentDiff(): DiffResult {
  const result: DiffResult = {
    addedContentIds: [],
    modifiedContentIds: [],
  };

  try {
    // Get diff of contents directory
    const diff = execSync(
      'git diff origin/main...HEAD -- src/data/contents/',
      { encoding: 'utf-8' },
    );

    if (!diff) {
      console.log('No changes in contents directory');
      return result;
    }

    // Find added content_id lines (lines starting with +)
    // Pattern: content_id: 'lunyu/1/2',
    const contentIdPattern = /^\+\s*content_id:\s*['"]([^'"]+)['"]/gm;
    let match: RegExpExecArray | null;

    while ((match = contentIdPattern.exec(diff)) !== null) {
      const contentId = match[1];
      result.addedContentIds.push(contentId);
    }

    // Find modified content_ids (lines that appear in both + and -)
    const removedPattern = /^-\s*content_id:\s*['"]([^'"]+)['"]/gm;
    const removedIds: string[] = [];

    while ((match = removedPattern.exec(diff)) !== null) {
      removedIds.push(match[1]);
    }

    // If a content_id appears in both added and removed, it's modified
    for (const id of result.addedContentIds) {
      if (removedIds.includes(id)) {
        result.modifiedContentIds.push(id);
      }
    }

    // Remove modified from added (they're tracked separately)
    result.addedContentIds = result.addedContentIds.filter(
      (id) => !result.modifiedContentIds.includes(id),
    );

    return result;
  } catch (error) {
    // If git diff fails (e.g., origin/main doesn't exist), validate all contents
    console.warn(
      'Could not get diff from origin/main, validating all contents',
    );
    result.addedContentIds = contents.map((c) => c.content_id);
    return result;
  }
}

/**
 * Main function
 */
function main(): void {
  console.log('=== Content Diff Validation ===\n');

  const { addedContentIds, modifiedContentIds } = parseContentDiff();
  const contentIdsToValidate = [...addedContentIds, ...modifiedContentIds];

  if (contentIdsToValidate.length === 0) {
    console.log('No content changes to validate.');
    process.exit(0);
  }

  console.log(`Found ${addedContentIds.length} added content(s)`);
  console.log(`Found ${modifiedContentIds.length} modified content(s)`);
  console.log(`Validating ${contentIdsToValidate.length} content(s)...\n`);

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
