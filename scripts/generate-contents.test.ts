import { describe, expect, it } from 'vitest';
import type { OutputContent } from './generate-contents';
import {
  buildPersonPatterns,
  deriveMentionedFromText,
  generateSpeakerGraphs,
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

describe('generateSpeakerGraphs', () => {
  // Test case 1: Standalone speech (学而第一-1) - should create mention graph edges
  it('should create mention graph edges for standalone speech (lunyu/1/1)', () => {
    const content: OutputContent = {
      content_id: 'lunyu/1/1',
      book_id: 'lunyu',
      section: '1',
      chapter: '1',
      text: '學而時習之 不亦說乎 有朋自遠方來 不亦樂乎 人不知而不慍 不亦君子乎',
      segments: [
        {
          text: { original: '子曰', japanese: '子曰く、' },
          start_pos: 0,
          end_pos: 2,
          speaker: null,
        },
        {
          text: {
            original: '學而時習之 不亦說乎',
            japanese: '学びて之を時習す、亦た説ばしからずや。',
          },
          start_pos: 2,
          end_pos: 12,
          speaker: 'kongzi',
        },
        {
          text: {
            original: '有朋自遠方來 不亦樂乎',
            japanese: '朋遠方より来る有り、亦た楽しからずや。',
          },
          start_pos: 12,
          end_pos: 22,
          speaker: 'kongzi',
        },
        {
          text: {
            original: '人不知而不慍 不亦君子乎',
            japanese: '人知らずして慍らず、亦た君子ならずや。',
          },
          start_pos: 22,
          end_pos: 32,
          speaker: 'kongzi',
        },
      ],
      persons: {
        speakers: ['kongzi'],
        mentioned: ['kongzi'],
      },
    };

    const { mentionGraph } = generateSpeakerGraphs([content]);

    // Should have edges from kongzi to concepts mentioned in standalone speech
    const kongziEdges = mentionGraph.edges.filter((e) => e.source === 'kongzi');
    expect(kongziEdges.length).toBeGreaterThan(0);

    // Should have edge to 君子
    const junEdge = kongziEdges.find((e) => e.target === '君子');
    expect(junEdge).toBeDefined();
    expect(junEdge?.weight).toBe(3); // Standalone speech has weight 3

    // Should have edges to 學、樂、知
    const xueEdge = kongziEdges.find((e) => e.target === '學');
    expect(xueEdge).toBeDefined();
    expect(xueEdge?.weight).toBe(3);

    const leEdge = kongziEdges.find((e) => e.target === '樂');
    expect(leEdge).toBeDefined();
    expect(leEdge?.weight).toBe(3);

    const zhiEdge = kongziEdges.find((e) => e.target === '知');
    expect(zhiEdge).toBeDefined();
    expect(zhiEdge?.weight).toBe(3);
  });

  // Test case 2: Standalone speech (学而第一-2) - should create mention graph edges
  it('should create mention graph edges for standalone speech (lunyu/1/2)', () => {
    const content: OutputContent = {
      content_id: 'lunyu/1/2',
      book_id: 'lunyu',
      section: '1',
      chapter: '2',
      text: '其為人也孝弟 而好犯上者 鮮矣 不好犯上 而好作亂者 未之有也 君子務本 本立而道生 孝弟也者 其為仁之本與',
      segments: [
        {
          text: { original: '有子曰', japanese: '有子曰く、' },
          start_pos: 0,
          end_pos: 3,
          speaker: null,
        },
        {
          text: {
            original: '其為人也孝弟 而好犯上者 鮮矣',
            japanese: '其の人と為りや孝弟にして、上を犯すを好む者は鮮し。',
          },
          start_pos: 3,
          end_pos: 15,
          speaker: 'youzi',
        },
        {
          text: {
            original: '不好犯上 而好作亂者 未之有也',
            japanese:
              '上を犯すを好まずして、乱を作すを好む者は、未だ之れ有らざるなり。',
          },
          start_pos: 15,
          end_pos: 25,
          speaker: 'youzi',
        },
        {
          text: {
            original: '君子務本 本立而道生',
            japanese: '君子は本を務む、本立ちて道生ず。',
          },
          start_pos: 25,
          end_pos: 33,
          speaker: 'youzi',
        },
        {
          text: {
            original: '孝弟也者 其為仁之本與',
            japanese: '孝弟なる者は、其れ仁の本為（た）るか。',
          },
          start_pos: 33,
          end_pos: 43,
          speaker: 'youzi',
        },
      ],
      persons: {
        speakers: ['youzi'],
        mentioned: ['youzi'],
      },
    };

    const { mentionGraph } = generateSpeakerGraphs([content]);

    // Should have edges from youzi to concepts mentioned in standalone speech
    const youziEdges = mentionGraph.edges.filter((e) => e.source === 'youzi');
    expect(youziEdges.length).toBeGreaterThan(0);

    // Should have edges to 孝, 君, 道, 仁
    // Note: 孝 appears in multiple segments, so weight is cumulative (3 * 2 = 6)
    const xiaoEdge = youziEdges.find((e) => e.target === '孝');
    expect(xiaoEdge).toBeDefined();
    expect(xiaoEdge?.weight).toBeGreaterThanOrEqual(3); // At least 3, could be more if mentioned multiple times

    const junEdge = youziEdges.find((e) => e.target === '君');
    expect(junEdge).toBeDefined();
    expect(junEdge?.weight).toBeGreaterThanOrEqual(3); // At least 3, could be more if mentioned multiple times

    const daoEdge = youziEdges.find((e) => e.target === '道');
    expect(daoEdge).toBeDefined();
    expect(daoEdge?.weight).toBe(3);

    const renEdge = youziEdges.find((e) => e.target === '仁');
    expect(renEdge).toBeDefined();
    expect(renEdge?.weight).toBe(3);
  });

  // Test case 3: Dialogue (孟子1-1) - should NOT create mention graph edges, but should create dialogue edges
  it('should create dialogue graph edges but NOT mention graph edges for dialogue (mengzi/1/1-1)', () => {
    const content: OutputContent = {
      content_id: 'mengzi/1/1-1',
      book_id: 'mengzi',
      section: '1',
      chapter: '1-1',
      text: '孟子見梁惠王 王曰 叟不遠千里而來 亦將有以利吾國乎 孟子對曰 王何必曰利 亦有仁義而已矣',
      segments: [
        {
          text: {
            original: '孟子見梁惠王',
            japanese: '孟子、梁の惠王に見（まみ）ゆ。',
          },
          start_pos: 0,
          end_pos: 6,
          speaker: null,
        },
        {
          text: { original: '王曰', japanese: '王曰く、' },
          start_pos: 6,
          end_pos: 8,
          speaker: null,
        },
        {
          text: {
            original: '叟不遠千里而來 亦將有以利吾國乎',
            japanese:
              '「叟、千里を遠しとせずして來たる、亦た將に以て吾（わ）が國を利するあらんとするか。」と。',
          },
          start_pos: 8,
          end_pos: 20,
          speaker: 'liang-huiwang',
        },
        {
          text: { original: '孟子對曰', japanese: '孟子對へて曰く、' },
          start_pos: 20,
          end_pos: 24,
          speaker: null,
        },
        {
          text: {
            original: '王何必曰利 亦有仁義而已矣',
            japanese: '「王何ぞ必ずしも利と曰はん。亦た仁義あるのみ。」',
          },
          start_pos: 24,
          end_pos: 34,
          speaker: 'mengzi',
        },
      ],
      persons: {
        speakers: ['liang-huiwang', 'mengzi'],
        mentioned: ['liang-huiwang', 'mengzi'],
      },
    };

    const { dialogueGraph, mentionGraph } = generateSpeakerGraphs([content]);

    // Should NOT have mention graph edges for dialogue participants
    const liangHuiwangMentionEdges = mentionGraph.edges.filter(
      (e) => e.source === 'liang-huiwang',
    );
    const mengziMentionEdges = mentionGraph.edges.filter(
      (e) => e.source === 'mengzi',
    );
    expect(liangHuiwangMentionEdges.length).toBe(0);
    expect(mengziMentionEdges.length).toBe(0);

    // Should have dialogue graph edges
    // liang-huiwang -> mengzi (topic: 利)
    const liangToMengziEdge = dialogueGraph.edges.find(
      (e) =>
        e.source === 'liang-huiwang' &&
        e.target === 'mengzi' &&
        e.topic === '利',
    );
    expect(liangToMengziEdge).toBeDefined();
    expect(liangToMengziEdge?.weight).toBe(1);

    // mengzi -> liang-huiwang (topic: 仁)
    const mengziToLiangRenEdge = dialogueGraph.edges.find(
      (e) =>
        e.source === 'mengzi' &&
        e.target === 'liang-huiwang' &&
        e.topic === '仁',
    );
    expect(mengziToLiangRenEdge).toBeDefined();
    expect(mengziToLiangRenEdge?.weight).toBe(1);

    // mengzi -> liang-huiwang (topic: 義)
    const mengziToLiangYiEdge = dialogueGraph.edges.find(
      (e) =>
        e.source === 'mengzi' &&
        e.target === 'liang-huiwang' &&
        e.topic === '義',
    );
    expect(mengziToLiangYiEdge).toBeDefined();
    expect(mengziToLiangYiEdge?.weight).toBe(1);
  });
});
