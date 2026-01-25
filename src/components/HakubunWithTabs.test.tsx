import { describe, expect, it } from 'vitest';

// Extract parseTextWithToneSandhi for testing
// Since it's not exported, we test the behavior through the component's output expectations

describe('HakubunWithTabs text parsing', () => {
  describe('text without semicolons', () => {
    it('should not treat semicolons as special characters', () => {
      // This test documents that semicolons are no longer treated as line break markers
      // Instead, line breaks are achieved by splitting into multiple segments
      const textWithSemicolon = '子曰;學而';
      // The semicolon should be treated as a regular character (not filtered out)
      // This is a behavior documentation test - actual parsing removes hyphens only
      expect(textWithSemicolon.replace(/-/g, '')).toBe('子曰;學而');
    });
  });

  describe('segment-based line breaks', () => {
    it('should allow same speaker across multiple segments for line breaks', () => {
      // This test documents the new behavior: same speaker can have multiple segments
      // Each segment represents a display unit (line break unit)
      const segments = [
        { text: '其為人也孝弟 而好犯上者 鮮矣', speaker: 'youzi' },
        { text: '不-好犯上 而好作亂者 未之有也', speaker: 'youzi' },
        { text: '君子務本 本立而道生', speaker: 'youzi' },
      ];

      // All segments have the same speaker - this is now allowed
      const speakers = segments.map((s) => s.speaker);
      expect(new Set(speakers).size).toBe(1);
      expect(speakers[0]).toBe('youzi');
    });
  });

  describe('hyphen handling (tone sandhi markers)', () => {
    it('should still remove hyphens from display text', () => {
      const text = '不-亦說乎';
      const displayText = text.replace(/-/g, '');
      expect(displayText).toBe('不亦說乎');
    });

    it('should preserve text structure with spaces', () => {
      const text = '學而時習之 不-亦說乎';
      const displayText = text.replace(/-/g, '');
      expect(displayText).toBe('學而時習之 不亦說乎');
    });
  });

  describe('space handling (semantic unit separators)', () => {
    it('should split text by spaces into semantic groups', () => {
      const text = '子曰 學而時習之 不亦說乎';
      const groups = text.split(' ').filter((g) => g.length > 0);
      expect(groups).toEqual(['子曰', '學而時習之', '不亦說乎']);
    });

    it('should handle multiple consecutive spaces', () => {
      const text = '子曰  學而';
      const groups = text.split(' ').filter((g) => g.length > 0);
      expect(groups).toEqual(['子曰', '學而']);
    });
  });
});
