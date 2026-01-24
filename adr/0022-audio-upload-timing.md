# ADR-0022: 音声ファイルのアップロードタイミング

## ステータス

承認

## コンテキスト

音声ファイルはローカルで生成され、Cloud Storage にアップロードする必要がある。アップロードのタイミングを決定する必要がある。

### 課題

- 音声ファイルは生成されたが、アップロードされていない状態が存在する
- アップロード後、`audio-manifest.json` に `uploadedAt` が追加されるため、マニフェストに差分が発生する
- アップロードの失敗時に push をブロックすべきかどうか

### 現在の状況

- `audio-manifest.json` で `generatedAt` と `uploadedAt` を管理
- `validate:audio-manifest` が pre-push フックで実行されている
- `upload:audio` スクリプトが存在し、`generatedAt` があるが `uploadedAt` がないファイルをアップロードする

## 決定

**音声生成の直後に自動的に Cloud Storage にアップロードする**。

### 実装方針

1. **`scripts/generate-audio.ts` にアップロード処理を追加**
   - 音声ファイル生成後、自動的に Cloud Storage にアップロード
   - アップロード成功後、マニフェストの `generatedAt` を削除し、`uploadedAt` を追加
   - アップロード失敗時はエラーを表示するが、生成は成功として扱う（手動アップロード可能）

2. **MCP ツールでも同様に動作**
   - `generate_audio` ツールは `pnpm generate:audio` を実行するため、自動的にアップロードされる
   - 説明文を更新して、アップロードも自動的に行われることを明記

3. **環境変数の要件**
   - `GOOGLE_APPLICATION_CREDENTIALS`: 必須（アップロードに必要）
   - `GCS_BUCKET`: 必須（アップロードに必要）
   - 環境変数が設定されていない場合、アップロードをスキップして警告を表示

### ワークフロー

```text
1. 開発者が音声を生成（pnpm generate:audio または MCP generate_audio）
   a. 音声ファイルをローカルに生成
   b. audio-manifest.json に generatedAt を追加
   c. 自動的に Cloud Storage にアップロード
   d. アップロード成功後、generatedAt を削除し uploadedAt を追加

2. マニフェストの変更がコミットに含まれる
   → 生成とアップロードが同じコミットに含まれる
```

## 根拠

### この方式を採用する理由

| 観点 | 効果 |
|------|------|
| 自動化 | 手動でのアップロード操作が不要 |
| 整合性 | 生成とアップロードが同じプロセスで完了するため、状態が一致 |
| シンプルさ | 生成の直後にアップロードするため、ワークフローが明確 |
| マニフェスト管理 | アップロード後のマニフェスト変更も同じコミットに含められる |
| 即時性 | 生成後すぐにアップロードされるため、すぐに利用可能 |

### 代替案

#### A. pre-push フックでアップロード

**却下理由**: プッシュ前にアップロードすると、生成とアップロードが別のタイミングになり、状態管理が複雑になる。また、アップロード失敗時に push がブロックされる。

#### B. pre-commit フックでアップロード

**却下理由**: コミット前にアップロードすると、コミットメッセージにアップロード情報が含まれにくい。また、コミットが増える。

#### C. CI/CD でアップロード

**却下理由**: プッシュ後にアップロードされるため、ローカルとリモートの状態が一時的に不一致になる。また、CI の実行時間が長くなる。

#### D. 手動アップロード

**却下理由**: 忘れる可能性があり、自動化のメリットがない。

#### E. post-commit フックでアップロード

**却下理由**: コミット後にアップロードすると、マニフェストの変更が別コミットになる。また、コミット済みの状態でアップロードが失敗すると、状態が不整合になる。

## 影響

### `scripts/generate-audio.ts` の変更

- Cloud Storage へのアップロード処理を追加
- アップロード成功後、マニフェストの `generatedAt` を削除し、`uploadedAt` を追加
- アップロード失敗時はエラーを表示するが、生成は成功として扱う

### エラーハンドリング

- アップロードが失敗した場合、エラーを表示して続行（生成は成功）
- 環境変数（`GOOGLE_APPLICATION_CREDENTIALS`, `GCS_BUCKET`）が設定されていない場合、アップロードをスキップして警告を表示
- 手動で `pnpm upload:audio` を実行して後からアップロード可能

### マニフェストの差分管理

- アップロード後のマニフェスト変更（`uploadedAt` の追加）は生成と同じコミットに含まれる
- `generatedAt` は一時的な状態で、アップロード後は `uploadedAt` に置き換わる

### MCP ツールの変更

- `generate_audio` ツールの説明を更新して、アップロードも自動的に行われることを明記
- 環境変数の要件（`GCS_BUCKET`）を追加

## MCP ツールの状態遷移図

### `generate_audio` ツール

```text
[開始]
  |
  v
YAML ファイルが存在する？
  |
  +-- No --> [エラー: Content file not found]
  |
  +-- Yes
       |
       v
pinyin_reviewed === true?
  |
  +-- No --> [エラー: pinyin_reviewed is not true]
  |          (ワークフロー案内を表示)
  |
  +-- Yes
       |
       v
[オーケストレータスクリプト実行]
(generate-and-upload-audio.ts)
  |
  +-- 成功 --> [成功: Audio generation successful]
  |
  +-- 失敗 --> [エラー: Audio generation failed]
```

### `upload_audio` ツール

```text
[開始]
  |
  v
マニフェストファイルが存在する？
  |
  +-- No --> [エラー: Audio manifest not found]
  |          (generate_audio を先に実行するよう案内)
  |
  +-- Yes
       |
       v
マニフェストにエントリが存在する？
  |
  +-- No --> [エラー: Content not found in manifest]
  |          (generate_audio を先に実行するよう案内)
  |
  +-- Yes
       |
       v
ローカルファイルが存在する？
(zh.mp3, ja.mp3)
  |
  +-- No (一部または全部欠けている)
  |    |
  |    v
  |  [オーケストレータスクリプト実行]
  |  (generate-and-upload-audio.ts)
  |    |
  |    +-- 成功 --> [成功: Regenerated and uploaded]
  |    |
  |    +-- 失敗 --> [エラー: Regeneration and upload failed]
  |
  +-- Yes (両方存在)
       |
       v
[upload:audio スクリプト実行]
  |
  +-- 成功 --> [成功: Upload successful]
  |
  +-- 失敗 --> [エラー: Upload failed]
```

### 状態遷移の詳細

#### ファイルが欠けている場合の処理

`upload_audio` ツールでローカルファイルが欠けている場合、以下の処理が実行される:

1. **欠けているファイルの検出**
   - `audio/{bookId}/{sectionId}/{chapterId}-zh.mp3`
   - `audio/{bookId}/{sectionId}/{chapterId}-ja.mp3`
   - どちらか一方、または両方が欠けている可能性がある

2. **オーケストレータスクリプトの実行**
   - `generate-and-upload-audio.ts` を実行
   - これにより、生成とアップロードが一度に実行される
   - タイムアウト: 3 分（生成+アップロードの両方を含む）

3. **結果の返却**
   - 成功: 欠けていたファイル名と共に成功メッセージを返却
   - 失敗: エラーメッセージと共に失敗を返却

#### エラーケースの処理

| エラーケース | ツール | エラーメッセージ | 次のアクション |
|------------|--------|----------------|--------------|
| YAML ファイルが存在しない | `generate_audio` | `Content file not found` | YAML ファイルを作成 |
| `pinyin_reviewed` が false | `generate_audio` | `pinyin_reviewed is not true` | `set_pinyin_reviewed` を実行 |
| マニフェストが存在しない | `upload_audio` | `Audio manifest not found` | `generate_audio` を先に実行 |
| マニフェストにエントリがない | `upload_audio` | `Content not found in manifest` | `generate_audio` を先に実行 |
| ローカルファイルが欠けている | `upload_audio` | 自動的に再生成を試行 | オーケストレータスクリプトを実行 |
| アップロード失敗 | `upload_audio` | `Upload failed` | 手動で再試行可能 |

## 関連

- [ADR-0017: 音声マニフェスト戦略](./0017-audio-manifest-strategy.md)
- [ADR-0018: 音声生成戦略](./0018-audio-generation-strategy.md)
