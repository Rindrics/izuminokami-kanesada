# ADR-0001: コンテンツデータ構造の設計

## ステータス

承認済み

## コンテキスト

四書五経学習サイトにおいて、論語などの古典テキストを保存・表示するためのデータ構造を設計する必要がある。

### 要件

1. **発言者の管理**: 論語のような対話形式では、各発言の発言者を特定できる必要がある
2. **ナレーション対応**: 「子曰」「憲問恥」のような地の文（ナレーション）も扱える必要がある
3. **言及人物の管理**: 発言者ではないが言及される人物（例: 「子謂子産」における子産）も関連人物として追跡したい
4. **汎用性**: 論語だけでなく、易経など構造の異なる古典にも対応できる必要がある

### 検討したパターン

#### パターン A: utterances + characters の重複管理

```typescript
{
  utterances: [{ text, speaker }],
  characters: ["kongzi"]  // utterances.speaker と重複
}
```

**却下理由**: `characters` は `utterances` の `speaker` から自動生成可能であり、データの重複となる。

#### パターン B: 引用元を詳細に追跡

```typescript
{
  utterances: [{
    text,
    speaker,
    quote_source?: { type: "classic" | "person", source: string }
  }]
}
```

**却下理由**: 詩経などの引用は発言者の発言の一部として扱えば十分。過度な複雑さを招く。

## 決定

以下のデータ構造を採用する。

### スキーマ

```typescript
interface Content {
  content_id: string;           // 例: "lunyu_14_1"
  text: string;                 // 白文全体

  segments: Segment[];          // テキストの区間リスト

  characters: {
    speakers: string[];         // segments から自動生成
    mentioned: string[];        // aliases を活用した自動サジェスト + 手動確認
  };

  japanese?: string;            // 読み下し文（あれば）
}

interface Segment {
  text: string;
  start_pos: number;
  end_pos: number;
  speaker: string | null;       // null = ナレーション、人物IDはADR-0002参照
}
```

### 具体例

#### 論語14-1（対話形式）

```json
{
  "content_id": "lunyu_14_1",
  "text": "憲問恥 子曰 邦有道穀 邦無道穀 恥也 克伐怨欲 不行焉 可以爲仁矣 子曰 可以爲難矣 仁則吾不知也",
  "segments": [
    { "text": "憲問恥", "start_pos": 0, "end_pos": 3, "speaker": null },
    { "text": "子曰", "start_pos": 4, "end_pos": 6, "speaker": null },
    { "text": "邦有道穀 邦無道穀 恥也", "start_pos": 7, "end_pos": 18, "speaker": "kongzi" },
    { "text": "克伐怨欲 不行焉 可以爲仁矣", "start_pos": 19, "end_pos": 32, "speaker": "yuanxian" },
    { "text": "子曰", "start_pos": 33, "end_pos": 35, "speaker": null },
    { "text": "可以爲難矣 仁則吾不知也", "start_pos": 36, "end_pos": 48, "speaker": "kongzi" }
  ],
  "characters": {
    "speakers": ["kongzi", "yuanxian"],
    "mentioned": []
  }
}
```

#### 論語5-16（言及人物あり）

```json
{
  "content_id": "lunyu_5_16",
  "text": "子謂子産 有君子之道四焉 其行己也恭 其事上也敬 其養民也惠 其使民也義",
  "segments": [
    { "text": "子謂子産", "start_pos": 0, "end_pos": 4, "speaker": null },
    { "text": "有君子之道四焉 其行己也恭 其事上也敬 其養民也惠 其使民也義", "start_pos": 5, "end_pos": 32, "speaker": "kongzi" }
  ],
  "characters": {
    "speakers": ["kongzi"],
    "mentioned": ["zichan"]
  }
}
```

#### 易経（発言者なし）

```json
{
  "content_id": "yijing_qian",
  "text": "乾 元亨利貞",
  "segments": [
    { "text": "乾 元亨利貞", "start_pos": 0, "end_pos": 5, "speaker": null }
  ],
  "characters": {
    "speakers": [],
    "mentioned": []
  }
}
```

## 結果

### メリット

1. **シンプルさ**: `segments` という汎用的な概念で、発言もナレーションも統一的に扱える
2. **重複排除**: `characters.speakers` は `segments` から自動生成できる
3. **汎用性**: 論語（対話形式）も易経（説明形式）も同じスキーマで表現可能
4. **拡張性**: 将来的に `Segment` に属性を追加しても後方互換性を保てる

### 考慮事項

1. **UI 設計**: 編集画面ではテキスト範囲を選択して発言者を指定する UI が必要
2. **自動生成**: `characters.speakers` の自動生成ロジックを実装する必要がある
3. **位置情報の整合性**: `start_pos` / `end_pos` と `text` の整合性を保証する仕組みが必要

### 入力仕様

#### セグメントの指定方法

白文入力後、**UI 上でテキスト範囲を選択**して発言者を指定する。

```text
入力例: 憲問恥 子曰 邦有道穀 邦無道穀 恥也 克伐怨欲 不行焉 可以爲仁矣 子曰 可以爲難矣 仁則吾不知也
```

#### 編集フロー

1. 白文を一括入力（半角スペースはそのまま保持）
2. 発言部分をドラッグで範囲選択
3. 選択範囲に対して発言者を指定
4. 選択されなかった部分は自動的にナレーション（`speaker: null`）として扱う

#### 操作例

| 操作 | 選択範囲 | 発言者 |
| ---- | -------- | ------ |
| 1 | 「邦有道穀 邦無道穀 恥也」を選択 | 孔子 |
| 2 | 「克伐怨欲 不行焉 可以爲仁矣」を選択 | 原憲 |
| 3 | 「可以爲難矣 仁則吾不知也」を選択 | 孔子 |

→ 「憲問恥」「子曰」などの未選択部分は自動的にナレーションとして segments に追加
