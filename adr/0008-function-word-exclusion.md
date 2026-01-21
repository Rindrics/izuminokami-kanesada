# ADR-0008: 虚字（助字）の統計除外方法

## ステータス

提案中

## コンテキスト

漢字の出現頻度統計において、「之」「也」「而」などの虚字（助字・function word）は意味のある統計を妨げる。これらを除外する方法を決定する必要がある。

現在の `HanziEntry` には `is_common` フィールドがあるが、これは「頻出字」を示すもので、「虚字」とは異なる概念である。

## 選択肢

### 選択肢 A: `HanziEntry` に `is_function_word` フィールドを追加

```typescript
export interface HanziEntry {
  id: string;
  meanings: HanziMeaning[];
  is_common: boolean;
  is_function_word: boolean;  // 追加
}
```

**メリット:**
- 漢字の属性として一元管理できる
- 辞書データと整合性が保たれる
- 将来的に他の用途（虚字のハイライト表示など）にも使える

**デメリット:**
- 辞書に登録されていない虚字は除外できない
- 全エントリにフィールド追加が必要
- 虚字の定義変更時に辞書全体を更新する必要がある

### 選択肢 B: 独立したブラックリスト配列

```typescript
// src/data/function-words.ts
export const functionWords = new Set([
  '之', '也', '而', '乎', '者', '所', '其', '於', '以', '為',
  '則', '故', '矣', '焉', '哉', '夫', '蓋', '若', '如', '與',
]);
```

**メリット:**
- 辞書登録有無に関係なく除外できる
- 追加・削除が容易
- 辞書データに影響を与えない
- 統計以外の用途でも再利用しやすい

**デメリット:**
- 二箇所でデータ管理が必要（辞書と別ファイル）
- 虚字の漢字情報（ピンイン等）と分離される

## 決定

**選択肢 B: 独立したブラックリスト配列** を採用する。

## 根拠

1. **辞書非依存**: 辞書に登録されていない漢字も除外できる
2. **変更容易性**: 虚字リストの追加・削除が辞書に影響しない
3. **関心の分離**: 「漢字の読み情報」と「統計除外ルール」は別の関心事
4. **シンプル**: Set による O(1) の存在確認が可能

## 実装

```typescript
// src/data/function-words.ts
export const functionWords = new Set([
  // 助詞・語気詞
  '之', '也', '而', '乎', '者', '所', '其', '於', '以', '為',
  '則', '故', '矣', '焉', '哉', '夫', '蓋', '若', '如', '與',
  '且', '或', '雖', '然', '即', '乃', '是', '非',
]);

export function isFunctionWord(char: string): boolean {
  return functionWords.has(char);
}
```

## 影響

- `src/data/function-words.ts` を新規作成
- 統計計算時に `isFunctionWord()` でフィルタリング
- `HanziEntry` の `is_common` フィールドは別目的（索引除外など）で継続使用

## 関連

- [503-statistics-dashboard](../tasks/improvement/tier5-index/503-statistics-dashboard.md)
