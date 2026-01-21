# ADR-0012: コンテンツディレクトリ構造

## ステータス

採用

## コンテキスト

現在、コンテンツデータは `src/data/sample-contents.ts` という単一ファイルに格納されている。この構造には以下の問題がある：

1. **名前が不適切**: 「sample」は本番用データにふさわしくない
2. **スケーラビリティ**: 書籍が増えると単一ファイルが肥大化する
3. **管理性**: 書籍ごとに独立して編集・レビューしにくい

## 決定

コンテンツデータをディレクトリ構造で管理する。**生成物は gitignore し、ビルド時に生成する。**

### ディレクトリ構造

```text
contents/
  books.yaml            # 書籍メタデータ（手動管理）- git 管理
  input/                # 入力データ（YAML）- git 管理
    lunyu/
      1/
        1.yaml
        2.yaml

src/
  generated/            # 自動生成物 - gitignore
    books.ts            # 書籍メタデータ + chapters（自動生成）
    contents/
      index.ts          # 全コンテンツのエクスポート（自動生成）
      lunyu.ts          # 論語のコンテンツ（自動生成）
  data/
    hanzi-dictionary.ts
    kunyomi-dictionary.ts
```

### ファイルの役割

| ファイル | 役割 | 管理方法 |
|----------|------|----------|
| `contents/books.yaml` | 書籍メタデータ（id, name, sections） | 手動管理 |
| `contents/input/*.yaml` | 入力データ（最小限の情報） | 手動/AI 生成 |
| `src/generated/books.ts` | 書籍メタデータ + chapters 配列 | 自動生成 |
| `src/generated/contents/*.ts` | 出力データ（導出フィールド含む） | 自動生成 |

### ビルドプロセス

```bash
# package.json
"prebuild": "pnpm generate:contents",
"generate:contents": "tsx scripts/generate-contents.ts"
```

1. `pnpm build` 実行時に `prebuild` が自動実行
2. `generate-contents.ts` が YAML → TypeScript 変換
3. 生成された `.ts` ファイルを Next.js がビルド

## 根拠

- **明確な命名**: 「sample」を排除し、本番用データとして適切な名前に
- **スケーラビリティ**: 書籍ごとにファイルを分割し、肥大化を防止
- **管理性**: YAML 入力のみを管理、生成物はリポジトリに含めない
- **冗長性の排除**: 導出可能なフィールドはビルド時に計算

## 影響

- `sample-contents.ts` を削除
- `src/data/contents/` を `.gitignore` に追加
- `prebuild` スクリプトで生成を自動化
- ローカル開発時は `pnpm generate:contents` を明示的に実行

## 関連

- [ADR-0006: コンテンツ保存戦略](./0006-content-storage-strategy.md)
- [ADR-0013: コンテンツ入力データ形式](./0013-content-input-format.md)
- [Issue #30: コンテンツデータ構造の最適化と CD 自動生成](https://github.com/Rindrics/izuminokami-kanesada/issues/30)
