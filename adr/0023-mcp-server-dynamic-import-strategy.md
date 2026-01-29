# ADR-0023: MCP サーバーでの動的インポート戦略

## ステータス

承認済み

## コンテキスト

MCP サーバー（`mcp-server`）では、実行時に生成される TypeScript ファイル（`src/generated/contents/index.ts` など）を動的にインポートする必要がある。特に、`validate_content` ツールでは以下の流れで動作する：

1. YAML ファイルからコンテンツを再生成（`pnpm generate:contents`）
2. 生成された TypeScript ファイルをインポートしてバリデーション

この際、以下の課題があった：

### 課題

1. **TypeScript ファイルの直接インポート**: Node.js の標準的なモジュール解決システムは `.js` ファイルを探すため、`.ts` ファイルを直接インポートできない
2. **実行環境**: MCP サーバーは `tsx` で実行されるが、動的インポート（`import()`）では `tsx` の TypeScript 解決機能が自動的に適用されない
3. **パスエイリアス**: 生成されたファイル内で `@/types/content` のようなパスエイリアスが使われている場合、`tsconfig.json` の `paths` 設定だけでは動的インポートでは解決されない

### 検討したアプローチ

#### アプローチ A: 静的インポートを使用

```typescript
import { contents } from '@/generated/contents';
import { validateContent } from '@/lib/validators/content';
```

**却下理由**:
- `tsconfig.json` の `rootDir` 制約により、`mcp-server/src` 外のファイルを静的インポートできない
- 再生成後に最新のデータを取得するには、モジュールキャッシュをクリアする必要があるが、ESM では困難

#### アプローチ B: 文字列パスで `.ts` ファイルを直接インポート

```typescript
const contentsModule = await import(`${PROJECT_ROOT}/src/generated/contents/index.ts`);
```

**却下理由**:
- Node.js のモジュール解決システムが `.js` ファイルを探すため、`.ts` ファイルが見つからない
- `tsx` で実行していても、動的インポートでは TypeScript 解決が自動的に適用されない

#### アプローチ C: `pathToFileURL` を使用

```typescript
const contentsPath = path.join(PROJECT_ROOT, 'src/generated/contents/index.ts');
const contentsModule = await import(pathToFileURL(contentsPath).href);
```

**採用理由**:
- `pathToFileURL` はファイルシステムのパスを `file://` URL に変換する
- `file://` URL を使用することで、`tsx` が実行時に TypeScript ファイルを直接実行できる
- 再生成後に最新のデータを確実に取得できる

## 決定

MCP サーバーで TypeScript ファイルを動的インポートする際は、`pathToFileURL` を使用する。

### 実装パターン

```typescript
import { pathToFileURL } from 'node:url';
import * as path from 'node:path';

// ファイルパスを構築
const filePath = path.join(PROJECT_ROOT, 'src/generated/contents/index.ts');

// pathToFileURL で file:// URL に変換してからインポート
const module = await import(pathToFileURL(filePath).href);
```

### 補足設定

`mcp-server/tsconfig.json` に `paths` 設定を追加し、インポートされるファイル内のパスエイリアス（`@/types/content` など）を解決できるようにする：

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["../src/*"]
    }
  }
}
```

**注意**: `paths` 設定は、インポートされるファイル内のパスエイリアス解決にのみ有効。動的インポート自体には `pathToFileURL` が必要。

## 結果

### メリット

1. **確実な TypeScript ファイル解決**: `file://` URL により、`tsx` が実行時に TypeScript ファイルを直接実行できる
2. **最新データの取得**: 再生成後に動的インポートすることで、常に最新のデータを取得できる
3. **一貫性**: `write_content_yaml` ツールでも同じパターンを使用しており、コードベース全体で一貫性が保たれる

### デメリット

1. **コードの複雑さ**: 静的インポートと比べて、コードがやや複雑になる
2. **型安全性**: 動的インポートは非同期のため、TypeScript の型チェックが一部制限される

### 影響範囲

- `mcp-server/src/tools/content.ts`: `validate_content` ツール
- `mcp-server/src/tools/dictionary.ts`: `add_hanzi_entry` ツール（辞書の重複チェック時）
- `mcp-server/tsconfig.json`: `paths` 設定の追加

### 関連 ADR

- ADR-0009: AI コンテンツ生成戦略（コンテンツ生成のワークフロー）
- ADR-0010: コンテンツバリデーション戦略（バリデーションの実行タイミング）
