# ADR-0013: コンテンツ入力データ形式

## ステータス

採用

## コンテキスト

コンテンツデータの入力形式を決定する必要がある。将来的に MCP（Model Context Protocol）を使って AI にコンテンツを生成させる計画がある。

候補：
- **YAML**: シンプルな構文、人間とAIの両方が扱いやすい
- **TypeScript**: 型安全、IDE サポートが強い

## 決定

**YAML 形式** を採用する。

### 入力ファイル構造

```text
contents/
  input/
    lunyu/
      1/
        1.yaml    # lunyu/1/1 のコンテンツ
        2.yaml    # lunyu/1/2 のコンテンツ
      2/
        1.yaml    # lunyu/2/1 のコンテンツ
```

### 入力データスキーマ

```yaml
# contents/input/lunyu/1/1.yaml
segments:
  - text: 子曰
    speaker: null
  - text: 學而時習之 不-亦說乎; 有朋自遠方來 不-亦樂乎; 人不知而不慍 不-亦君子乎
    speaker: kongzi
mentioned: []
japanese: 子曰く、学びて之を時習す、亦た説ばしからずや。朋遠方より来る有り、亦た楽しからずや。人知らずして慍らず、亦た君子ならずや。
```

### 生成スクリプトが導出するフィールド

| フィールド | 導出方法 |
|-----------|----------|
| `content_id` | ファイルパス（`lunyu/1/1.yaml` → `lunyu/1/1`） |
| `book_id` | `content_id.split('/')[0]` |
| `section` | `books[book_id].sections[section_id].name` |
| `chapter` | `content_id.split('/')[2]` |
| `text` | `segments.map(s => s.text).join(' ')` |
| `segments[].start_pos` | 前の segment の `end_pos + 1`（最初は 0） |
| `segments[].end_pos` | `start_pos + text.length` |
| `characters.speakers` | `segments.filter(s => s.speaker).map(s => s.speaker)` |
| `characters.mentioned` | 入力の `mentioned` をそのまま使用 |

## 根拠

### AI 生成との相性

- **構文がシンプル**: クォート、カンマ、セミコロンが少なく、AI がシンタックスエラーを起こしにくい
- **レビューしやすい**: AI 生成後に人間が確認・修正しやすい
- **スキーマ標準**: YAML スキーマ（JSON Schema）は MCP で AI に渡しやすい

### 人間の編集

- **可読性**: インデントベースで読みやすい
- **コメント**: YAML はコメントをサポート
- **非プログラマーでも編集可能**: TypeScript の知識不要

### 実装

- **依存**: `js-yaml` パッケージを追加
- **型検証**: 生成スクリプトで Zod 等を使って検証

## 影響

- `js-yaml` を依存に追加
- `scripts/generate-contents.ts` で YAML をパースして TypeScript を生成
- 入力ファイル用のディレクトリ `contents/input/` を作成

## 関連

- [ADR-0012: コンテンツディレクトリ構造](./0012-content-directory-structure.md)
- [Issue #30: コンテンツデータ構造の最適化と CD 自動生成](https://github.com/Rindrics/izuminokami-kanesada/issues/30)
