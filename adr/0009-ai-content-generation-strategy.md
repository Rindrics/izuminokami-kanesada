# ADR-0009: AI コンテンツ生成戦略

## ステータス

提案中

## コンテキスト

四書五経のコンテンツ（白文、セグメント、書き下し文、漢字辞書エントリなど）を AI に生成させたい。しかし、データスキーマは複雑で、以下の要素が絡み合っている：

- `Content` 型（白文、セグメント、登場人物、書き下し文）
- `HanziEntry` 型（音読み、ピンイン、声調、意味）
- `KunyomiEntry` 型（訓読み、送り仮名）
- 接続マーカー規約（ADR-0007）
- 機能語除外規約（ADR-0008）

### 問題

AI にこれらのスキーマを正確に守らせる方法が必要。主な懸念：

1. **ルールと実装の乖離**: ドキュメントを別途作成すると、実装変更時に更新が漏れる
2. **バリデーション**: 生成されたデータの正当性を確認する手段
3. **一貫性**: 辞書への追加と Content の生成で同じスキーマを使う必要がある

### 検討した選択肢

#### 選択肢 A: ルール参照方式

`prompts/content-generation.md` に生成ルールを記述し、実装ファイルへのパス参照を含める。

```markdown
## スキーマ

Content の型定義は `src/types/content.ts` を参照してください。
```

**メリット**:

- 実装コストが低い
- すぐに始められる

**デメリット**:

- ルール更新を忘れると乖離が発生
- バリデーションは手動
- AI がファイルを読めない環境では使えない

#### 選択肢 B: MCP（Model Context Protocol）実装

カスタム MCP サーバーを構築し、スキーマ取得・バリデーション・書き込みをツールとして提供。

```typescript
// Resources（読み取り）
"schema://content"     // Content 型定義を返す
"schema://hanzi"       // HanziEntry 型定義を返す
"dictionary://hanzi"   // 漢字辞書全体を返す

// Tools（書き込み）
validate_content(content: Content): ValidationResult
write_content(content: Content): WriteResult
add_hanzi_entry(entry: HanziEntry): void
```

**メリット**:

- 実装と完全に同期（型から自動生成可能）
- バリデーションが自動化
- CI でテスト可能
- どの AI 環境からも利用可能（Cursor、Claude Desktop、API 経由など）

**デメリット**:

- 初期開発コストがかかる
- MCP の学習コスト

## 決定

**選択肢 B: MCP 実装方式** を採用する。

### 根拠

1. **Single Source of Truth**: TypeScript の型定義が唯一の情報源となり、乖離が原理的に発生しない
2. **バリデーション自動化**: 生成されたデータは必ず `validate_content` を通過するため、不正なデータが混入しない
3. **拡張性**: 将来的に Web UI からのコンテンツ投稿にも同じバリデーションを再利用できる
4. **テスト容易性**: MCP ツールは通常の関数としてテスト可能

## 実装計画

### Phase 1: バリデーション関数 + 手動ワークフロー

MCP なしで、まずバリデーション関数を実装し、手動修正ワークフローを確立する。

1. `src/lib/validators/content.ts` にバリデーション関数を実装
2. AI に型定義ファイルを参照させてコンテンツを生成
3. 生成されたデータをバリデーション関数でチェック
4. エラーがあれば手動で修正

```text
AI 生成 → コピペ → validateContent() → エラー確認 → 手動修正
```

### Phase 2: MCP サーバー開発

Phase 1 のバリデーション関数を MCP ツールとしてラップし、自動化を実現する。

1. MCP サーバーの基本構造を作成（`mcp-server/`）
2. 型定義を返す Resources を実装
3. `validate_content` ツールを実装（Phase 1 の関数を再利用）
4. 辞書の読み取り Resources を実装
5. `add_hanzi_entry`, `add_kunyomi_entry` ツールを実装
6. `write_content` ツールを実装

### MCP の動作概要

MCP サーバーは **常駐プロセス** として動作し、AI クライアントと通信する。

```text
┌─────────────────┐     stdio/HTTP      ┌─────────────────┐
│  AI クライアント │ ◄────────────────► │   MCP サーバー   │
│  (Cursor, etc.) │                     │  (Node.js)      │
└─────────────────┘                     └─────────────────┘
```

Cursor での設定例（`.cursor/mcp.json`）:

```json
{
  "mcpServers": {
    "izuminokami": {
      "command": "node",
      "args": ["./mcp-server/dist/index.js"]
    }
  }
}
```

Cursor を起動すると MCP サーバーが自動起動し、AI が `validate_content` などのツールを使えるようになる。

### MCP サーバー設計

```text
mcp-server/
├── src/
│   ├── index.ts           # エントリポイント
│   ├── resources/
│   │   ├── schema.ts      # 型定義を返す
│   │   └── dictionary.ts  # 辞書データを返す
│   ├── tools/
│   │   ├── validate.ts    # バリデーションツール
│   │   ├── write.ts       # 書き込みツール
│   │   └── dictionary.ts  # 辞書追加ツール
│   └── validators/
│       ├── content.ts     # Content バリデーション
│       ├── hanzi.ts       # HanziEntry バリデーション
│       └── kunyomi.ts     # KunyomiEntry バリデーション
├── package.json
└── tsconfig.json
```

### ツール仕様

#### validate_content

```typescript
interface ValidateContentInput {
  content: Content;
}

interface ValidateContentOutput {
  valid: boolean;
  errors: {
    path: string;      // "segments[0].start_pos"
    message: string;   // "start_pos must be >= 0"
    severity: "error" | "warning";
  }[];
}
```

#### write_content

```typescript
interface WriteContentInput {
  content: Content;
  skipValidation?: boolean;  // default: false
}

interface WriteContentOutput {
  success: boolean;
  path: string;              // "src/data/contents/lunyu/1/1.ts"
  validation?: ValidateContentOutput;
}
```

#### add_hanzi_entry

```typescript
interface AddHanziEntryInput {
  entry: HanziEntry;
  updateExisting?: boolean;  // default: false
}

interface AddHanziEntryOutput {
  success: boolean;
  action: "created" | "updated" | "skipped";
}
```

## 結果

### メリット

1. **型安全**: TypeScript の型チェックと MCP バリデーションの二重チェック
2. **乖離防止**: ドキュメントと実装が分離しないアーキテクチャ
3. **自動化**: AI 生成 → バリデーション → 書き込みのパイプラインが可能
4. **再利用性**: 将来の Web UI でも同じバリデーションロジックを使用可能

### トレードオフ

1. **初期コスト**: MCP サーバーの実装に時間がかかる
2. **依存性**: MCP プロトコルへの依存が発生
3. **複雑性**: システム全体の複雑度が上がる

### 考慮事項

1. **段階的リリース**: Phase 1 だけでも実用的なワークフローが成立する
2. **フォールバック**: Phase 1 の関数は MCP なしでも CLI やテストから利用可能
3. **バージョニング**: Phase 2 以降、MCP API のバージョン管理戦略が必要

## 関連

- [ADR-0001: コンテンツデータ構造の設計](./0001-content-data-structure.md)
- [ADR-0007: 接続マーカー規約](./0007-connection-marker-convention.md)
- [ADR-0008: 機能語除外規約](./0008-function-word-exclusion.md)
- `src/types/content.ts` - Content 型定義
- `src/types/hanzi.ts` - HanziEntry 型定義
