# ADR-0005: 読み下し文のルビデータ構造

## ステータス

承認済み（更新）

## コンテキスト

読み下し文（漢文の日本語訓読）にもルビを振りたい。白文のルビ（音読み・ピンイン）とは異なり、訓読みのルビが必要。

### 要件

1. 読み下し文の漢字にルビを表示できる
2. 異義語がある場合は選択できる（白文と同じロジック）
3. 手間が徐々に減る仕組み（デフォルト読みの活用）
4. 熟語にもルビを振れる
5. **コンテンツデータは最小限に保つ**

## 決定

### 1. 訓読み辞書（KunyomiDictionary）

漢字・熟語の訓読みを登録する辞書を作成する。

```typescript
interface KunyomiEntry {
  id: string;           // "学" or "時習"
  text: string;         // 対象文字列 "学" or "時習"
  readings: KunyomiReading[];
}

interface KunyomiReading {
  id: string;           // "学-まな-1"
  ruby: string;         // "まな"
  okurigana?: string;   // "ぶ" (送り仮名のヒント)
  is_default: boolean;  // デフォルト読みかどうか
  note?: string;        // 用法メモ
}
```

### 2. 自動ルビ取得

コンテンツでは `japanese_ruby` を**省略可能**。表示時に辞書から自動取得する。

**ロジック**:

1. テキストを先頭から走査
2. 各位置で辞書から最長一致を検索（熟語優先）
3. マッチした場合、デフォルト読みを適用
4. マッチしない場合、そのまま表示（ルビなし）

### 3. オーバーライド（JapaneseRuby）

デフォルト読みと異なる読みを使いたい場合のみ、`japanese_ruby` でオーバーライドする。

```typescript
interface JapaneseRuby {
  position: number;    // 文字位置（0-indexed）
  text: string;        // 対象文字列 "学" or "時習"
  ruby: string;        // オーバーライドする読み
  reading_id?: string; // 辞書参照 ID（将来の異義語選択用）
}
```

### 4. 具体例

#### 訓読み辞書

```typescript
const kunyomiDictionary: KunyomiEntry[] = [
  {
    id: "学",
    text: "学",
    readings: [
      { id: "学-まな", ruby: "まな", okurigana: "ぶ", is_default: true },
      { id: "学-がく", ruby: "がく", is_default: false, note: "音読み的用法" }
    ]
  },
  {
    id: "時習",
    text: "時習",
    readings: [
      { id: "時習-じしゅう", ruby: "じしゅう", is_default: true },
      { id: "時習-ときなら", ruby: "ときなら", okurigana: "う", is_default: false }
    ]
  },
  {
    id: "慍",
    text: "慍",
    readings: [
      { id: "慍-いか", ruby: "いか", okurigana: "る", is_default: true },
      { id: "慍-うら", ruby: "うら", okurigana: "む", is_default: false }
    ]
  }
];
```

#### コンテンツでの使用

**通常（オーバーライドなし）**:

```typescript
{
  japanese: "子曰く、学びて之を時習す、亦た説ばしからずや。",
  // japanese_ruby を省略 → 辞書から自動取得
}
```

**オーバーライドあり**:

```typescript
{
  japanese: "子曰く、学びて之を時習す、亦た説ばしからずや。人知らずして慍らず、亦た君子ならずや。",
  japanese_ruby: [
    // 30文字目の「慍」をデフォルト「いか」から「うら」に変更
    { position: 30, text: "慍", ruby: "うら", reading_id: "慍-うら" }
  ]
}
```

### 5. 自動サジェストの流れ

1. 編集画面で読み下し文を入力
2. 漢字/熟語を選択
3. 訓読み辞書からデフォルト読みをサジェスト
4. 必要に応じて別の読みを選択（オーバーライドとして保存）
5. 新しい読みは辞書に追加可能

## 結果

### メリット

1. **データ最小化**: オーバーライドのみ記録、大半のコンテンツで `japanese_ruby` 不要
2. **手間削減**: 一度登録した読みは自動適用
3. **熟語対応**: 最長一致検索で自動的に熟語を優先
4. **異義語管理**: `position` で正確に特定し、`reading_id` で辞書参照

### 考慮事項

1. **辞書の初期構築**: 基本的な訓読みを事前に登録しておくと効率的
2. **position の維持**: テキスト編集時にオーバーライドの position がずれる可能性
3. **辞書の成長**: 使用頻度の高い読みを順次追加していく
