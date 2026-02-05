# ADR-0026: MCP コンテンツ生成ワークフロー

## ステータス

採用

## コンテキスト

ADR-0009 で MCP（Model Context Protocol）によるコンテンツ生成戦略を採用した。実運用を通じて以下の課題が判明した：

1. **読み仮名の誤り**: AI が生成した書き下し文の読み仮名が、辞書のデフォルト読みと異なる文脈で使われることがある
2. **音読み未登録**: 新しい漢字を追加した際に音読みが `TODO` のままになる
3. **同字異義語（多音字）**: 文脈によって異なるピンインが必要なケースがある

これらの問題を解決するため、**2段階レビューワークフロー**と**支援ツール群**を導入する。

## 決定

### ワークフロー状態遷移

```plaintext
                         ┌───────────┐
                         │   Init    │
                         └─────┬─────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Drafting          │ ← AI が白文・読み下し文生成
                    └──────────┬──────────┘
                               │ write_content_yaml
                               ▼
                    ┌─────────────────────┐
                    │ AwaitingTextReview  │ ← 人間レビュー待ち（第1回）
                    └──────────┬──────────┘
                               │
                   ┌───────────┴───────────┐
                   │ 白文・読み下し文 OK？   │
                   └───────────┬───────────┘
                         NG    │    OK
                   ┌───────────┘    └───────────┐
                   ▼                            │
            ┌─────────────┐                     │
            │ TextFixing  │ ← 人間が修正        │
            └──────┬──────┘                     │
                   │ 修正完了                   │
                   └───────────┬───────────────┘
                               ▼
                    ┌─────────────────────┐
                    │ GeneratingReadings  │ ← AI が訓読み・ピンイン生成
                    └──────────┬──────────┘
                               │
                   ┌───────────┴───────────┐
                   │ 空欄の漢字あり？       │
                   └───────────┬───────────┘
                         あり  │    なし
                   ┌───────────┘    └───────────┐
                   ▼                            │
            ┌─────────────────┐                 │
            │ RegisteringDict │ ← 辞書登録      │
            └────────┬────────┘                 │
                     │ 再生成                   │
                     └─────────────┬────────────┘
                                   ▼
                    ┌─────────────────────┐
                    │ AwaitingFinalReview │ ← 人間レビュー待ち（第2回）
                    └──────────┬──────────┘
                               │
                   ┌───────────┴───────────┐
                   │ 訓読み・ピンイン OK？   │
                   └───────────┬───────────┘
                         NG    │    OK
                   ┌───────────┘    └───────────┐
                   ▼                            │
            ┌──────────────┐                    │
            │ ReadingFixing│ ← 人間が修正       │
            └───────┬──────┘                    │
                    │                           │
                    └───────────────────────────┤
                                                ▼
                                     ┌─────────────────┐
                                     │    Reviewed     │ ← pinyin_reviewed: true
                                     └────────┬────────┘
                                              │ generate_audio
                                              ▼
                                     ┌─────────────────┐
                                     │     Ready       │ ← コミット可能
                                     └─────────────────┘
```

### 状態一覧

| 状態 | 説明 | 次アクション |
|------|------|-------------|
| `Init` | 初期状態 | AI がコンテンツ生成開始 |
| `Drafting` | AI が白文・読み下し文を生成中 | `write_content_yaml` |
| `AwaitingTextReview` | 人間の第1回レビュー待ち | 人間がレビュー |
| `TextFixing` | 人間が白文・読み下し文を修正中 | 修正完了後、訓読み生成へ |
| `GeneratingReadings` | AI が訓読み・ピンインを生成中 | 空欄チェック |
| `RegisteringDict` | 未登録漢字を辞書に追加中 | 再生成 |
| `AwaitingFinalReview` | 人間の第2回レビュー待ち | 人間がレビュー |
| `ReadingFixing` | 人間が訓読み・ピンインを修正中 | 修正完了後、再レビューへ |
| `Reviewed` | `pinyin_reviewed: true` 設定済み | `generate_audio` |
| `Ready` | コミット可能 | コミット |

### MCP ツール一覧

#### コンテンツツール（content.ts）

| ツール | 機能 | 使用タイミング |
|--------|------|---------------|
| `write_content_yaml` | YAML 書き込み + 自動バリデーション | Drafting → AwaitingTextReview |
| `read_content_yaml` | YAML 読み込み | 任意 |
| `validate_content` | 単一コンテンツバリデーション | 任意 |
| `validate_content_with_suggestions` | 声調変化検出・修正提案 | GeneratingReadings |
| `suggest_hanzi_overrides` | 多音字の hanzi_overrides 提案 | GeneratingReadings |
| `set_pinyin_reviewed` | ピンインレビュー完了フラグ設定 | AwaitingFinalReview → Reviewed |
| `generate_audio` | 音声生成 + GCS アップロード | Reviewed → Ready |
| `upload_audio` | 音声アップロード | Ready |
| `list_primers` | プライマー一覧取得 | Drafting（参考資料） |
| `read_primer_content` | プライマー内容読み込み | Drafting（参考資料） |

#### 辞書ツール（dictionary.ts）

| ツール | 機能 | 使用タイミング |
|--------|------|---------------|
| `add_hanzi_entry` | 漢字エントリ追加 | RegisteringDict |
| `add_kunyomi_entry` | 訓読みエントリ追加 | RegisteringDict |
| `update_hanzi_onyomi` | 音読み更新 | RegisteringDict |
| `check_missing_readings` | 未登録読みチェック | GeneratingReadings |
| `get_default_kunyomi` | デフォルト訓読み取得 | GeneratingReadings |
| `suggest_kunyomi_overrides` | 訓読みオーバーライド提案 | GeneratingReadings |

### バリデーション強化

`write_content_yaml` は以下の場合にエラーを返す（警告ではなくブロッキングエラー）：

- 音読みが `TODO` の漢字がある場合
- 辞書に存在しない漢字がある場合

これにより、不完全なコンテンツのコミットを防止する。

## 根拠

1. **2段階レビューで手戻りを最小化**
   - 第1回レビュー: 白文・読み下し文（読み仮名除く）のみ確認
   - 第2回レビュー: 訓読み・ピンインのみ確認
   - 各段階で焦点を絞り、レビュー負荷を軽減

2. **文脈情報を活用した高精度な発音生成**
   - 人間が修正した読み下し文を元に訓読み・ピンインを生成
   - 同字異義語の精度が向上（文脈から判断）
   - 空欄の漢字がゼロになるまで自動で辞書登録・再生成

3. **プライマー参照機能**
   - AI が既存のプライマーコンテンツを参照して文体を学習
   - 一貫した品質のコンテンツ生成が可能

## 結果

- レビューが2段階に分かれ、各段階の認知負荷が軽減
- 音読み未登録がブロッキングエラーになり、不完全なコンテンツのコミットを防止
- 支援ツールにより、適切な読みの選択が容易になる

## 関連

- [ADR-0009: AI コンテンツ生成戦略](./0009-ai-content-generation-strategy.md)
- [ADR-0014: 日本語読みオーバーライド記法](./0014-japanese-reading-override-notation.md)
- [ADR-0016: 声調変化バリデーション](./0016-tone-sandhi-validation.md)
- [ADR-0021: Speaker フィールドのセマンティクス](./0021-speaker-field-semantics.md)
