# ADR-0016: 声調変化バリデーション

## ステータス

提案

## コンテキスト

ADR-0007 で接続マーカー `-` を導入し、声調変化（tone sandhi）が発生する箇所を明示できるようにした。しかし、現状のバリデーションでは「声調変化が起こり得る状況で、接続が明示されていない」ケースを検出できない。

### 問題

4 声が連続する箇所では声調変化が発生し得る。例：

```text
不亦説乎
```

- `不亦` → 4 声 + 4 声 → 声調変化が起こり得る
- コンテンツ作成者が意図的に接続を判断していない場合、読み方が曖昧になる

### 声調変化が起こり得るパターン

| パターン | 変化 | 例 |
|----------|------|-----|
| 4 声 + 4 声 | 2 声 + 4 声 | 不是 bù shì → bú shì |
| 3 声 + 3 声 | 2 声 + 3 声 | 你好 nǐ hǎo → ní hǎo |

## 決定

**声調変化が起こり得る箇所に対して、明示的なマーカーを要求する** バリデーションルールを追加する。

### マーカー体系

| マーカー | 意味 | 声調変化 |
|----------|------|----------|
| `-` | 接続（連続して読む） | 適用する |
| `\|` | 独立（別々に読む） | 適用しない |
| なし | 未指定 | **バリデーションエラー**（声調変化パターンの場合） |

### バリデーションルール

1. **隣接する 2 文字が声調変化パターンに該当する場合**：
   - `-` または `|` で明示されていなければエラー

2. **声調変化パターンに該当しない場合**：
   - マーカーは任意（明示してもしなくても OK）

### 記法例

```text
# OK: 接続を明示（声調変化適用）
不-亦説乎

# OK: 独立を明示（声調変化なし）
不|亦説乎

# NG: 4声+4声が未指定（バリデーションエラー）
不亦説乎
→ Error: 声調変化パターン '不亦'（4声+4声）にマーカーがありません。'-' または '|' を指定してください。
```

### 実装イメージ

```typescript
interface ToneSandhiValidationResult {
  valid: boolean;
  warnings: ToneSandhiWarning[];
}

interface ToneSandhiWarning {
  position: number;
  chars: [string, string];
  tones: [number, number];
  pattern: '4+4' | '3+3';
  message: string;
}

function validateToneSandhi(text: string, hanziDictionary: HanziEntry[]): ToneSandhiValidationResult {
  // 1. マーカー（-、|）を除いた位置で隣接文字ペアを抽出
  // 2. 各ペアの声調を辞書から取得
  // 3. 声調変化パターンに該当するペアをチェック
  // 4. マーカーがないペアを警告として報告
}
```

## 根拠

- **明示性**: 声調変化の適用有無を曖昧にしない
- **品質保証**: コンテンツ作成時に見落としを防ぐ
- **学習支援**: 学習者に正確な発音を提供するために重要
- **ADR-0007 との整合性**: 既存の `-` マーカーを拡張し、`|` を追加

## 影響

### コンテンツ作成

- 4 声 + 4 声、3 声 + 3 声が連続する箇所には必ずマーカーが必要
- 既存コンテンツの修正が必要な場合がある

### バリデーション

- `validateContent()` に声調変化チェックを追加
- CI で自動検出、マージをブロック

### 表示

- `|` マーカーも `-` と同様に表示時は非表示
- 声調変化の計算ロジックは `-` のみに適用（`|` は独立扱い）

## 代替案

### A: マーカーなしはデフォルトで「独立」とみなす

現状の ADR-0007 の方針。声調変化は `-` がある場合のみ適用。

**却下理由**: 声調変化が必要な箇所に `-` を付け忘れると、誤った発音になるが検出できない。

### B: マーカーなしはデフォルトで「接続」とみなす

**却下理由**: 独立して読むべき箇所に誤って声調変化が適用される可能性がある。

### C: 全箇所にマーカーを要求

**却下理由**: 過剰。声調変化が起こらない箇所にまでマーカーを強制するのは冗長。

## MCP サーバーの改善

AI エージェントが MCP を使ってコンテンツを作成する際、バリデーションエラーを自己修正できるようにする。

### 現状の問題

1. **バリデーションエラーが修正方法を示さない**: 「マーカーがありません」だけでは、どこをどう直すべきか不明確
2. **既存の YAML を読み込めない**: 修正するには現在の内容を知る必要がある

### 改善 1: バリデーション結果に修正提案を含める

```typescript
// 現状
"Error: 声調変化パターン '不亦' にマーカーがありません"

// 改善後
{
  "error": "声調変化パターン '不亦'（4声+4声）にマーカーがありません",
  "location": {
    "segmentIndex": 1,
    "position": { "start": 0, "end": 2 },
    "original": "不亦説乎"
  },
  "suggestions": [
    { "fix": "不-亦説乎", "meaning": "接続（声調変化適用）" },
    { "fix": "不|亦説乎", "meaning": "独立（声調変化なし）" }
  ]
}
```

### 改善 2: MCP ツールの追加

```typescript
// 既存の YAML を読み込む
server.registerTool('read_content_yaml', {
  description: 'Read an existing content YAML file',
  inputSchema: { bookId, sectionId, chapterId }
});

// バリデーション結果と修正提案を取得
server.registerTool('validate_content_with_suggestions', {
  description: 'Validate content and get fix suggestions for tone sandhi',
  inputSchema: { bookId, sectionId, chapterId }
});
```

### エージェントの自己修正フロー

```text
1. write_content_yaml で YAML を作成
2. generate_contents で TypeScript 生成
3. validate_content_with_suggestions で検証
4. エラーがあれば suggestions を参照
5. read_content_yaml で現在の内容を取得
6. 修正を適用して write_content_yaml で上書き
7. 再度 validate_content_with_suggestions で確認
8. エラーがなくなるまで繰り返し
```

### 実装対象

- `mcp-server/src/tools/content.ts` - 新規ツール追加
- `src/lib/validators/content.ts` - 修正提案を返すように拡張
- `scripts/validate-content-diff.ts` - 修正提案を出力

## 関連

- [ADR-0007: 接続マーカー規約](./0007-connection-marker-convention.md)
- [ADR-0010: コンテンツバリデーション戦略](./0010-content-validation-strategy.md)
- [ADR-0009: AI コンテンツ生成戦略](./0009-ai-content-generation-strategy.md)
- `src/lib/validators/content.ts` - バリデーション関数
- `src/data/hanzi-dictionary.ts` - 声調情報の参照元
- `mcp-server/src/tools/content.ts` - MCP ツール
