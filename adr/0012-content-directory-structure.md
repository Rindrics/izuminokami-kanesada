# ADR-0012: コンテンツディレクトリ構造

## ステータス

採用

## コンテキスト

現在、コンテンツデータは `src/data/sample-contents.ts` という単一ファイルに格納されている。この構造には以下の問題がある：

1. **名前が不適切**: 「sample」は本番用データにふさわしくない
2. **スケーラビリティ**: 書籍が増えると単一ファイルが肥大化する
3. **管理性**: 書籍ごとに独立して編集・レビューしにくい

## 決定

コンテンツデータをディレクトリ構造で管理する。

### ディレクトリ構造

```text
src/data/
  contents/
    index.ts        # 全コンテンツのエクスポート
    lunyu.ts        # 論語のコンテンツ
    # 将来的に他の書籍を追加
    # mengzi.ts     # 孟子
    # laozi.ts      # 老子
  books.ts          # 書籍メタデータ（現在は contents/index.ts 内）
  hanzi-dictionary.ts
  kunyomi-dictionary.ts
```

### ファイルの役割

| ファイル | 役割 |
|----------|------|
| `contents/index.ts` | 全書籍のコンテンツを集約してエクスポート |
| `contents/lunyu.ts` | 論語の章ごとのコンテンツデータ |
| `books.ts` | 書籍メタデータ（ID、名前、章構成） |

### エクスポート例

```typescript
// contents/lunyu.ts
export const lunyuContents: Content[] = [
  { content_id: 'lunyu/1/1', ... },
  { content_id: 'lunyu/1/2', ... },
];

// contents/index.ts
import { lunyuContents } from './lunyu';

export const contents: Content[] = [
  ...lunyuContents,
  // ...mengziContents,
];

export * from './lunyu';
```

## 根拠

- **明確な命名**: 「sample」を排除し、本番用データとして適切な名前に
- **スケーラビリティ**: 書籍ごとにファイルを分割し、肥大化を防止
- **管理性**: 書籍単位で編集・レビュー・差分確認が容易
- **段階的移行**: 現在の構造から少ない変更で移行可能

## 影響

- `sample-contents.ts` を `contents/` ディレクトリ構造に移行
- インポートパスの変更が必要なファイル：
  - `src/lib/validators/content.ts`
  - `src/lib/validators/content.test.ts`
  - `scripts/validate-content-diff.ts`
  - 各ページコンポーネント

## 関連

- [ADR-0006: コンテンツ保存戦略](./0006-content-storage-strategy.md)
- Issue: コンテンツデータ構造の最適化と CD 自動生成
