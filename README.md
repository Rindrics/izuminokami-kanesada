# 素読庵

漢文素読を子供と実践する "指導者" の学習を支援するための Web アプリケーション

## 機能

- 四書五経のコンテンツ表示（白文、ピンイン、音読み、書き下し文）
- 音声読み上げ（Google Cloud TTS）
  - ピンイン読み（中国語）
  - 音読み（日本語）
  - ループ再生対応
- 漢字の詳細情報表示（ピンイン、声調、意味）
- キーボードナビゲーション対応

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

#### コンテンツ管理

- `write_content_yaml` - コンテンツ YAML を生成（自動検証付き）
- `read_content_yaml` - 既存のコンテンツ YAML を読み込み
- `generate_contents` - YAML から TypeScript を生成
- `validate_contents` - 全コンテンツを検証
- `validate_content` - 特定コンテンツを検証（pre-push hook と同等）
- `validate_content_with_suggestions` - 声調変化パターンの修正候補を取得

#### 辞書管理

- `add_hanzi_entry` - 漢字辞書にエントリを追加
- `add_kunyomi_entry` - 訓読み辞書にエントリを追加
- `update_hanzi_onyomi` - 漢字辞書の音読みを更新

#### 音声生成

- `get_polyphonic_info` - 多音字（ポリフォニック文字）の情報を取得
- `set_pinyin_reviewed` - ピンインレビュー完了をマーク
- `generate_audio` - 音声ファイルを生成（Google Cloud TTS）
- `upload_audio` - 音声ファイルを Cloud Storage にアップロード

### 音声生成ワークフロー

1. `write_content_yaml` でコンテンツを作成
2. 多音字がある場合は `get_polyphonic_info` で確認し、必要に応じて `hanzi_overrides` を設定
3. `set_pinyin_reviewed` でレビュー完了をマーク
4. `generate_audio` で音声を生成・アップロード

## 環境変数

音声生成機能を使用する場合、以下の環境変数が必要です。

```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GCS_BUCKET=your-bucket-name
```

## アーキテクチャ決定記録 (ADR)

設計上の意思決定は [adr/](adr/) ディレクトリに記録しています。

## ライセンス

MIT
