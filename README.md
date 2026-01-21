# 素読庵

漢文素読を子供と実践する "指導者" の学習を支援するための Web アプリケーション

## 開発

```bash
pnpm install
pnpm dev
```

## MCP サーバー

コンテンツ生成を支援する MCP サーバーを提供しています。

### Cursor での使い方

1. このプロジェクトを Cursor で開く
2. `.cursor/mcp.json` が読み込まれる
3. Cursor Settings → Features → MCP Servers で「sodokuan」が有効になっていることを確認

### 利用可能なツール

- `write_content_yaml` - コンテンツ YAML を生成
- `validate_contents` - コンテンツを検証
- `add_hanzi_entry` - 漢字辞書にエントリを追加
- `add_kunyomi_entry` - 訓読み辞書にエントリを追加

## アーキテクチャ決定記録 (ADR)

設計上の意思決定は [adr/](adr/) ディレクトリに記録しています。

## ライセンス

MIT
