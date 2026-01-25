import { describe, expect, it } from 'vitest';
import {
  buildPersonPatterns,
  deriveMentionedFromText,
  loadPersonsYaml,
} from './generate-contents';

// Load actual persons data from contents/persons.yaml
const persons = loadPersonsYaml();

describe('buildPersonPatterns', () => {
  it('should build patterns from name, courtesy, and given fields', () => {
    const patterns = buildPersonPatterns(persons);

    // Should contain name patterns
    expect(
      patterns.some((p) => p.pattern === '孔子' && p.id === 'kongzi'),
    ).toBe(true);
    expect(
      patterns.some((p) => p.pattern === '顏淵' && p.id === 'yanyuan'),
    ).toBe(true);

    // Should contain courtesy name patterns
    expect(
      patterns.some((p) => p.pattern === '仲尼' && p.id === 'kongzi'),
    ).toBe(true);
    expect(
      patterns.some((p) => p.pattern === '子淵' && p.id === 'yanyuan'),
    ).toBe(true);

    // Should contain given name patterns
    expect(patterns.some((p) => p.pattern === '丘' && p.id === 'kongzi')).toBe(
      true,
    );
    expect(patterns.some((p) => p.pattern === '回' && p.id === 'yanyuan')).toBe(
      true,
    );
  });

  it('should sort patterns by length descending (longer patterns first)', () => {
    const patterns = buildPersonPatterns(persons);

    // Verify descending order by length
    for (let i = 1; i < patterns.length; i++) {
      expect(patterns[i - 1].pattern.length).toBeGreaterThanOrEqual(
        patterns[i].pattern.length,
      );
    }
  });

  it('should not include family names (too ambiguous)', () => {
    const patterns = buildPersonPatterns(persons);

    // Family names like 孔, 顏 should not be standalone patterns
    // (孔子 contains 孔, but 孔 alone should not match)
    const familyOnlyPatterns = patterns.filter(
      (p) => p.pattern === '孔' || p.pattern === '顏' || p.pattern === '曾',
    );
    expect(familyOnlyPatterns.length).toBe(0);
  });
});

describe('deriveMentionedFromText', () => {
  const patterns = buildPersonPatterns(persons);

  it('should detect person by name (顏淵)', () => {
    const text = '顏淵問仁';
    const mentioned = deriveMentionedFromText(text, patterns);

    expect(mentioned).toContain('yanyuan');
  });

  it('should detect person by given name (回)', () => {
    const text = '回雖不敏 請事斯語矣';
    const mentioned = deriveMentionedFromText(text, patterns);

    expect(mentioned).toContain('yanyuan');
  });

  it('should detect multiple persons', () => {
    const text = '子禽問於子貢曰';
    const mentioned = deriveMentionedFromText(text, patterns);

    expect(mentioned).toContain('ziqin');
    expect(mentioned).toContain('zigong');
  });

  it('should return empty array when no person is mentioned', () => {
    const text = '學而時習之 不亦說乎';
    const mentioned = deriveMentionedFromText(text, patterns);

    expect(mentioned).toEqual([]);
  });

  it('should not duplicate person IDs', () => {
    // Text contains both name (顏淵) and given name (回)
    const text = '顏淵曰 回雖不敏';
    const mentioned = deriveMentionedFromText(text, patterns);

    // yanyuan should appear only once
    const yanyuanCount = mentioned.filter((id) => id === 'yanyuan').length;
    expect(yanyuanCount).toBe(1);
  });

  it('should detect person by courtesy name (子淵)', () => {
    const text = '子淵問於夫子';
    const mentioned = deriveMentionedFromText(text, patterns);

    expect(mentioned).toContain('yanyuan');
  });

  it('should handle Mengzi text with 梁惠王', () => {
    const text = '孟子見梁惠王';
    const mentioned = deriveMentionedFromText(text, patterns);

    expect(mentioned).toContain('mengzi');
    expect(mentioned).toContain('liang-huiwang');
  });

  it('should detect Kongzi from "子曰" at text start', () => {
    const text = '子曰 學而時習之';
    const mentioned = deriveMentionedFromText(text, patterns);

    expect(mentioned).toContain('kongzi');
  });

  it('should detect Kongzi from "子曰" at segment start (after space)', () => {
    const text = '顏淵問仁 子曰 克己復禮為仁';
    const mentioned = deriveMentionedFromText(text, patterns);

    expect(mentioned).toContain('kongzi');
    expect(mentioned).toContain('yanyuan');
  });

  it('should not detect Kongzi from "子" in other names (子夏, 子貢)', () => {
    const text = '子夏問孝';
    const mentioned = deriveMentionedFromText(text, patterns);

    expect(mentioned).toContain('zixia');
    expect(mentioned).not.toContain('kongzi');
  });
});
