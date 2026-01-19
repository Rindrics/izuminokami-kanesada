import type { Content } from '@/types/content';

export const sampleContents: Content[] = [
  {
    content_id: 'lunyu_1_1',
    book_id: 'lunyu',
    section: '学而第一',
    chapter: '1-1',
    text: '子曰 學而時習之 不亦說乎 有朋自遠方來 不亦樂乎 人不知而不慍 不亦君子乎',
    segments: [
      { text: '子曰', start_pos: 0, end_pos: 2, speaker: null },
      {
        text: '學而時習之 不亦說乎 有朋自遠方來 不亦樂乎 人不知而不慍 不亦君子乎',
        start_pos: 3,
        end_pos: 35,
        speaker: 'kongzi',
      },
    ],
    characters: {
      speakers: ['kongzi'],
      mentioned: [],
    },
    japanese:
      '子曰く、学びて之を時習す、亦た説ばしからずや。朋遠方より来る有り、亦た楽しからずや。人知らずして慍らず、亦た君子ならずや。',
    // All ruby is auto-fetched from dictionary
    // japanese_ruby is only needed for overrides
    // Example: { position: 30, text: '慍', ruby: 'うら' }
  },
];

export function getContentById(id: string): Content | undefined {
  return sampleContents.find((c) => c.content_id === id);
}

export function getAllContentIds(): string[] {
  return sampleContents.map((c) => c.content_id);
}
