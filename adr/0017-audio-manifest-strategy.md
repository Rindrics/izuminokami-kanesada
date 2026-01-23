# ADR-0017: 音声マニフェスト戦略

## ステータス

提案

## コンテキスト

四書五経のコンテンツに音声読み上げ機能を追加する。各コンテンツ（章）ごとに、中国語（ピンイン）と日本語（書き下し文）の 2 つの音声ファイルを生成し、Web で再生できるようにする。

### 要件

1. **音声データの保存先**: Firebase Storage（CDN 配信、既存インフラとの統合）
2. **音声生成**: Google Cloud Text-to-Speech API（Wavenet）
3. **整合性保証**: コンテンツ YAML と音声データの対応を保証したい
4. **コスト効率**: pre-push での毎回の Firebase 読み取りは避けたい

### 課題

音声ファイルを Git にコミットすると容量が増大する。一方、Firebase Storage のみに保存すると、コンテンツ YAML と音声の整合性を保証する仕組みが必要になる。

単純に pre-push フックで Firebase Storage の存在確認を行う方式では、プッシュのたびに読み取りコストが発生し、ネットワーク遅延も問題になる。

## 決定

**音声マニフェストファイル（`audio-manifest.json`）を Git にコミットし、音声ファイル自体は Firebase Storage にのみ保存する**。

### マニフェストファイル

```json
{
  "lunyu/1/1": {
    "zh": { "uploadedAt": "2026-01-22T10:00:00Z", "hash": "abc123..." },
    "ja": { "uploadedAt": "2026-01-22T10:00:00Z", "hash": "def456..." }
  },
  "lunyu/1/2": {
    "zh": { "generatedAt": "2026-01-22T10:05:00Z", "hash": "ghi789..." },
    "ja": { "generatedAt": "2026-01-22T10:05:00Z", "hash": "jkl012..." }
  }
}
```

| フィールド | 説明 |
|-----------|------|
| キー | `{bookId}/{sectionId}/{chapterId}` 形式 |
| `zh` | 中国語（ピンイン）音声のメタデータ |
| `ja` | 日本語（音読み）音声のメタデータ |
| `generatedAt` | ローカルでの音声生成日時（アップロード前） |
| `uploadedAt` | Firebase Storage へのアップロード日時（アップロード後、`generatedAt` は削除） |
| `hash` | 音声ファイルのハッシュ値（再生成検知用） |

### ワークフロー

```text
1. コンテンツ YAML を作成（既存フロー）
2. MCP ツール generate_audio を実行
   - YAML からテキスト抽出
   - Google Cloud TTS で音声生成
   - Firebase Storage にアップロード
   - audio-manifest.json を更新
3. audio-manifest.json をコミット
4. git push 時に pre-push フックが実行
   - origin/main との差分がある YAML を検出
   - 各 YAML に対応するエントリが audio-manifest.json に存在するか確認
   - エントリがなければ push を拒否
```

### pre-push バリデーション

```typescript
// 擬似コード
async function validateAudioManifest(): Promise<boolean> {
  // 1. origin/main との差分がある YAML を取得
  const changedYamls = await getChangedYamls('origin/main');
  
  // 2. audio-manifest.json を読み込み
  const manifest = await readManifest('audio-manifest.json');
  
  // 3. 各 YAML に対応するエントリがあるか確認
  for (const yaml of changedYamls) {
    const key = yamlPathToKey(yaml); // e.g., "lunyu/1/1"
    if (!manifest[key] || !manifest[key].zh || !manifest[key].ja) {
      console.error(`音声が未生成: ${key}`);
      return false;
    }
  }
  
  return true;
}
```

## 根拠

### マニフェスト方式を採用する理由

| 観点 | 効果 |
|------|------|
| **pre-push の速度** | ローカルファイル比較のみ、Firebase 通信不要 |
| **コスト** | 読み取り料金が発生しない |
| **整合性** | YAML とマニフェストの対応をチェック可能 |
| **Git 容量** | 音声ファイルはコミットしない |
| **監査性** | いつ・どの音声がアップロードされたか追跡可能 |

### Firebase Storage を音声の保存先とする理由

- 既存のプロジェクトインフラ（Firebase Hosting）と統合しやすい
- CDN 配信による高速な音声ロード
- 従量課金だが、音声ファイルのサイズは比較的小さい

### ローカルで音声生成する理由

- 音声の品質を確認してからアップロードできる
- 古文・漢文の読み上げは調整が必要な可能性がある
- 必要なときだけ API を呼び出すことでコスト管理が容易

## 影響

### コンテンツ作成ワークフロー

1. YAML 作成後、必ず `generate_audio` MCP ツールを実行する必要がある
2. 音声未生成のコンテンツは push できない（pre-push でブロック）

### 新規ファイル

- `audio-manifest.json` - 音声メタデータ（Git 管理）
- `scripts/generate-audio.ts` - 音声生成スクリプト
- `.husky/pre-push` - 音声存在確認フック

### Firebase Storage 構造

```text
audio/
├── lunyu/
│   ├── 1/
│   │   ├── 1-zh.mp3
│   │   ├── 1-ja.mp3
│   │   └── ...
│   └── ...
└── ...
```

## 代替案

### A: 音声ファイルを Git LFS でコミット

**却下理由**:
- Git リポジトリの容量が増大する
- LFS の無料枠には制限がある
- Firebase Storage の CDN 配信のメリットを活かせない

### B: pre-push で毎回 Firebase Storage の存在確認

**却下理由**:
- プッシュのたびに読み取りコストが発生
- ネットワーク遅延により開発体験が悪化
- オフライン環境でプッシュできない

### C: 整合性チェックを行わない

**却下理由**:
- 音声のないコンテンツが本番にデプロイされる可能性
- ユーザー体験の低下（再生ボタンがあるのに音声がない）

### D: CI で音声生成

**却下理由**:
- 音声の品質を事前確認できない
- CI から Git へのプッシュが複雑
- API 認証情報の管理が煩雑

## 関連

- [ADR-0006: コンテンツ保存戦略](./0006-content-storage-strategy.md)
- [ADR-0012: コンテンツディレクトリ構造](./0012-content-directory-structure.md)
- Google Cloud Text-to-Speech: https://cloud.google.com/text-to-speech
- Firebase Storage: https://firebase.google.com/docs/storage
