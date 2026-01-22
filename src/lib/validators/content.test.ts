import { describe, expect, it } from 'vitest';
import type { Content } from '@/types/content';
import { validateContent } from './content';

// Helper to create a valid Content for testing
function createValidContent(overrides: Partial<Content> = {}): Content {
  return {
    content_id: 'lunyu/1/1',
    book_id: 'lunyu',
    section: '学而第一',
    chapter: '1',
    text: '子曰 學而時習之',
    segments: [
      { text: '子曰', start_pos: 0, end_pos: 2, speaker: null },
      { text: '學而時習之', start_pos: 3, end_pos: 8, speaker: 'kongzi' },
    ],
    persons: {
      speakers: ['kongzi'],
      mentioned: [],
    },
    ...overrides,
  };
}

describe('validateContent', () => {
  describe('required fields', () => {
    it('should pass for valid content', () => {
      const content = createValidContent();
      const result = validateContent(content);
      expect(result.valid).toBe(true);
      expect(result.errors.filter((e) => e.severity === 'error')).toHaveLength(
        0,
      );
    });

    it('should fail when content_id is empty', () => {
      const content = createValidContent({ content_id: '' });
      const result = validateContent(content);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'content_id',
          severity: 'error',
        }),
      );
    });

    it('should fail when text is empty', () => {
      const content = createValidContent({ text: '', segments: [] });
      const result = validateContent(content);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'text',
          severity: 'error',
        }),
      );
    });
  });

  describe('segments validation', () => {
    it('should fail when segments array is empty', () => {
      const content = createValidContent({ segments: [] });
      const result = validateContent(content);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'segments',
          message: 'segments must not be empty',
        }),
      );
    });

    it('should fail when start_pos is negative', () => {
      const content = createValidContent({
        segments: [{ text: '子曰', start_pos: -1, end_pos: 2, speaker: null }],
      });
      const result = validateContent(content);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'segments[0].start_pos',
          message: 'start_pos must be >= 0',
        }),
      );
    });

    it('should fail when end_pos exceeds text length', () => {
      const content = createValidContent({
        text: '子曰',
        segments: [{ text: '子曰', start_pos: 0, end_pos: 100, speaker: null }],
      });
      const result = validateContent(content);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'segments[0].end_pos',
        }),
      );
    });

    it('should fail when start_pos >= end_pos', () => {
      const content = createValidContent({
        segments: [{ text: '', start_pos: 5, end_pos: 5, speaker: null }],
      });
      const result = validateContent(content);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'segments[0]',
        }),
      );
    });

    it('should fail when segment text does not match text slice', () => {
      const content = createValidContent({
        text: '子曰 學而',
        segments: [{ text: '孔子', start_pos: 0, end_pos: 2, speaker: null }],
      });
      const result = validateContent(content);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'segments[0].text',
          message: 'segment text does not match text slice',
        }),
      );
    });

    it('should fail when segments overlap', () => {
      const content = createValidContent({
        text: '子曰學而',
        segments: [
          { text: '子曰', start_pos: 0, end_pos: 2, speaker: null },
          { text: '曰學', start_pos: 1, end_pos: 3, speaker: 'kongzi' },
        ],
      });
      const result = validateContent(content);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          message: 'segment overlaps with previous segment',
        }),
      );
    });

    it('should allow whitespace gaps between segments', () => {
      const content = createValidContent({
        text: '子曰 學而',
        segments: [
          { text: '子曰', start_pos: 0, end_pos: 2, speaker: null },
          { text: '學而', start_pos: 3, end_pos: 5, speaker: 'kongzi' },
        ],
      });
      const result = validateContent(content);
      expect(result.valid).toBe(true);
    });

    it('should fail when gap contains non-whitespace', () => {
      const content = createValidContent({
        text: '子曰X學而',
        segments: [
          { text: '子曰', start_pos: 0, end_pos: 2, speaker: null },
          { text: '學而', start_pos: 3, end_pos: 5, speaker: 'kongzi' },
        ],
      });
      const result = validateContent(content);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('gap between segments'),
        }),
      );
    });
  });

  describe('connection markers (ADR-0007)', () => {
    it('should pass for valid connection markers', () => {
      const content = createValidContent({
        text: '不-亦說乎',
        segments: [
          { text: '不-亦說乎', start_pos: 0, end_pos: 5, speaker: null },
        ],
        persons: {
          speakers: [],
          mentioned: [],
        },
      });
      const result = validateContent(content);
      expect(result.valid).toBe(true);
    });

    it('should fail for consecutive hyphens', () => {
      const content = createValidContent({
        text: '不--亦說乎',
        segments: [
          { text: '不--亦說乎', start_pos: 0, end_pos: 6, speaker: null },
        ],
        persons: {
          speakers: [],
          mentioned: [],
        },
      });
      const result = validateContent(content);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'text',
          message: 'consecutive connection markers (--) are not allowed',
        }),
      );
    });

    it('should fail when hyphen has no character before', () => {
      const content = createValidContent({
        text: '-亦說乎',
        segments: [
          { text: '-亦說乎', start_pos: 0, end_pos: 4, speaker: null },
        ],
        persons: {
          speakers: [],
          mentioned: [],
        },
      });
      const result = validateContent(content);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'text',
          message: expect.stringContaining('no valid character before'),
        }),
      );
    });

    it('should fail when hyphen has no character after', () => {
      const content = createValidContent({
        text: '不亦說-',
        segments: [
          { text: '不亦說-', start_pos: 0, end_pos: 4, speaker: null },
        ],
        persons: {
          speakers: [],
          mentioned: [],
        },
      });
      const result = validateContent(content);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'text',
          message: expect.stringContaining('no valid character after'),
        }),
      );
    });

    it('should fail when hyphen is preceded by space', () => {
      const content = createValidContent({
        text: '不 -亦說乎',
        segments: [
          { text: '不 -亦說乎', start_pos: 0, end_pos: 6, speaker: null },
        ],
        persons: {
          speakers: [],
          mentioned: [],
        },
      });
      const result = validateContent(content);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'text',
          message: expect.stringContaining('no valid character before'),
        }),
      );
    });

    it('should fail when hyphen is followed by space', () => {
      const content = createValidContent({
        text: '不- 亦說乎',
        segments: [
          { text: '不- 亦說乎', start_pos: 0, end_pos: 6, speaker: null },
        ],
        persons: {
          speakers: [],
          mentioned: [],
        },
      });
      const result = validateContent(content);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'text',
          message: expect.stringContaining('no valid character after'),
        }),
      );
    });
  });

  describe('speakers validation', () => {
    it('should fail when segment speaker is not in persons.speakers', () => {
      const content = createValidContent({
        persons: {
          speakers: [], // Missing 'kongzi'
          mentioned: [],
        },
      });
      const result = validateContent(content);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'persons.speakers',
          message: expect.stringContaining('not listed in persons.speakers'),
        }),
      );
    });

    it('should warn when persons.speakers contains unused speaker', () => {
      const content = createValidContent({
        persons: {
          speakers: ['kongzi', 'zengzi'], // 'zengzi' is not used
          mentioned: [],
        },
      });
      const result = validateContent(content);
      // Should still be valid (warning only)
      expect(result.valid).toBe(true);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'persons.speakers',
          message: expect.stringContaining('not used in any segment'),
          severity: 'warning',
        }),
      );
    });

    it('should pass with null speaker (narration)', () => {
      const content = createValidContent({
        text: '子曰',
        segments: [{ text: '子曰', start_pos: 0, end_pos: 2, speaker: null }],
        persons: {
          speakers: [],
          mentioned: [],
        },
      });
      const result = validateContent(content);
      expect(result.valid).toBe(true);
    });
  });

  describe('dictionary validation', () => {
    it('should fail when hanzi in text is not in hanzi-dictionary (missing pinyin)', () => {
      const content = createValidContent({
        text: '龍虎',
        segments: [{ text: '龍虎', start_pos: 0, end_pos: 2, speaker: null }],
        persons: {
          speakers: [],
          mentioned: [],
        },
      });
      const result = validateContent(content);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'text',
          message: expect.stringContaining(
            'hanzi not registered in hanzi-dictionary',
          ),
        }),
      );
    });

    it('should fail when kanji in japanese is not in kunyomi-dictionary (missing reading)', () => {
      const content = createValidContent({
        japanese: '龍虎が現れた',
      });
      const result = validateContent(content);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'japanese',
          message: expect.stringContaining(
            'kanji not registered in kunyomi-dictionary',
          ),
        }),
      );
    });

    it('should pass when japanese is not provided', () => {
      const content = createValidContent();
      delete content.japanese;
      const result = validateContent(content);
      expect(result.valid).toBe(true);
    });

    it('should pass when all hanzi and kanji are registered in dictionaries', () => {
      const content = createValidContent({
        japanese: '子曰く',
      });
      const result = validateContent(content);
      expect(result.valid).toBe(true);
    });
  });

  describe('person master validation', () => {
    it('should fail when speaker is not registered in person master', () => {
      const content = createValidContent({
        persons: {
          speakers: ['kongzi', 'unknown_person'],
          mentioned: [],
        },
      });
      const result = validateContent(content);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'persons.speakers',
          message: expect.stringContaining(
            'speakers not registered in person master',
          ),
          severity: 'error',
        }),
      );
    });

    it('should fail when mentioned person is not registered in person master', () => {
      const content = createValidContent({
        persons: {
          speakers: ['kongzi'],
          mentioned: ['unknown_person'],
        },
      });
      const result = validateContent(content);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'persons.mentioned',
          message: expect.stringContaining(
            'mentioned persons not registered in person master',
          ),
          severity: 'error',
        }),
      );
    });

    it('should pass when all speakers and mentioned are registered in person master', () => {
      const content = createValidContent({
        persons: {
          speakers: ['kongzi'],
          mentioned: ['zengzi'],
        },
      });
      const result = validateContent(content);
      expect(result.valid).toBe(true);
    });
  });
});
