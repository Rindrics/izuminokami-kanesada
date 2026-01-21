import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const INPUT_YAML_SCHEMA = `# Input YAML Schema for Content Generation
# File path: contents/input/{book_id}/{section_id}/{chapter_id}.yaml

# Example:
# contents/input/lunyu/1/1.yaml

segments:
  - text: string        # Segment text (Chinese characters with spaces and markers)
    speaker: string|null  # Speaker ID (e.g., "kongzi", "youzi") or null for narration

mentioned: string[]     # Character IDs mentioned but not speaking

japanese: string        # Japanese reading (書き下し文)

# Notes:
# - Use spaces to separate semantic units (e.g., "子曰 學而時習之")
# - Use "-" to mark tone sandhi connections (e.g., "不-亦")
# - Use ";" to mark forced line breaks (e.g., "鮮矣; 不-好犯上")
# - First segment is typically narration (speaker: null)
# - Second segment is typically speech (speaker: character_id)

# The following fields are auto-derived by generate-contents.ts:
# - content_id: from file path (lunyu/1/1.yaml -> lunyu/1/1)
# - book_id: content_id.split('/')[0]
# - section: from books.ts lookup
# - chapter: content_id.split('/')[2]
# - text: segments.map(s => s.text).join(' ')
# - segments[].start_pos, end_pos: calculated from text positions
# - characters.speakers: derived from segments with non-null speaker
`;

const CONTENT_TYPE_SCHEMA = `// Content Type Definition (src/types/content.ts)

export interface Segment {
  text: string;
  start_pos: number;
  end_pos: number;
  speaker: string | null;
}

export interface Content {
  content_id: string;    // e.g., "lunyu/1/1"
  book_id: string;       // e.g., "lunyu"
  section: string;       // e.g., "学而第一"
  chapter: string;       // e.g., "1"
  text: string;          // Full text with spaces and markers
  segments: Segment[];
  characters: {
    speakers: string[];  // Character IDs who speak
    mentioned: string[]; // Character IDs mentioned
  };
  japanese?: string;     // Japanese reading
  japanese_ruby?: JapaneseRubyData;
}

// Text conventions:
// - Spaces: semantic unit separators (not displayed, adds spacing)
// - Hyphen (-): tone sandhi connection marker (不-亦 = bù-yì -> bú-yì)
// - Semicolon (;): forced line break marker (not displayed)
`;

export function registerSchemaResources(server: McpServer): void {
  // Input YAML schema
  server.resource('schema://input-yaml', 'Input YAML Schema', async () => ({
    contents: [
      {
        uri: 'schema://input-yaml',
        mimeType: 'text/yaml',
        text: INPUT_YAML_SCHEMA,
      },
    ],
  }));

  // Content type schema
  server.resource('schema://content', 'Content Type Definition', async () => ({
    contents: [
      {
        uri: 'schema://content',
        mimeType: 'text/typescript',
        text: CONTENT_TYPE_SCHEMA,
      },
    ],
  }));
}
