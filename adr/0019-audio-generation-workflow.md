# ADR-0019: 音声生成ワークフロー

## ステータス

承認

## コンテキスト

音声生成（`generate_audio`）を行う前に、多音字（同字異義語）のピンインが文脈に合っているか確認する必要がある。確認せずに音声を生成すると、誤った読みで音声が作成される可能性がある。

### 課題

- Agent が `generate_audio` を呼ぶ前に多音字の確認を忘れる可能性がある
- 確認済みかどうかの状態を追跡する仕組みがない
- ワークフローの順序を強制する方法が必要

## 決定

**YAML ファイルに `pinyin_reviewed` フラグを追加し、`generate_audio` はこのフラグが `true` でないと拒否する**。

### ワークフロー

```text
1. write_content_yaml でコンテンツを作成
   - 多音字がある場合: pinyin_reviewed: false で保存
   - 多音字がない場合: pinyin_reviewed: true で保存

2. Agent が多音字を確認（get_polyphonic_info を使用）
   - 文脈に合った読みかどうか確認
   - 必要であれば hanzi_overrides を設定

3. 確認完了後、write_content_yaml で pinyin_reviewed: true に更新

4. generate_audio を実行
   - pinyin_reviewed: true でない場合はエラーを返す
```

### YAML スキーマの変更

```yaml
segments:
  - text: 子曰
    speaker: null
    hanzi_overrides:
      - char: 說
        position: 5
        meaning_id: 說-yuè
mentioned: []
japanese: 子曰く
pinyin_reviewed: true  # 新規追加
```

### MCP ツールの動作

#### write_content_yaml

- 多音字を検出した場合: `pinyin_reviewed: false` を設定し、確認が必要な旨をレスポンスに含める
- 多音字がない場合: `pinyin_reviewed: true` を設定

#### generate_audio

- `pinyin_reviewed: true` でない場合: エラーを返し、確認手順を案内
- `pinyin_reviewed: true` の場合: 音声を生成

## 根拠

### この方式を採用する理由

| 観点 | 効果 |
|------|------|
| 明示性 | 確認状態がファイルに記録され、追跡可能 |
| 強制力 | `generate_audio` がフラグをチェックするため、確認をスキップできない |
| シンプルさ | MCP ツールの範囲内で完結、オーケストレーター層不要 |
| 柔軟性 | 手動で YAML を編集する場合も対応可能 |

### 代替案

#### A. Agent のルールのみで制御

**却下理由**: 強制力がなく、Agent が忘れる可能性がある

#### B. 別のステータス管理ファイル

**却下理由**: 管理が複雑になり、YAML と状態の同期が必要

#### C. オーケストレーター層を追加

**却下理由**: このプロジェクトの規模では過剰設計

## 影響

### コンテンツ作成ワークフロー

1. `write_content_yaml` → 多音字確認 → `generate_audio` の順序が強制される
2. 既存の YAML ファイルには `pinyin_reviewed` フラグを追加する必要がある

### 既存コンテンツの移行

既存の YAML ファイルに `pinyin_reviewed: true` を追加するマイグレーションが必要。

## 関連

- [ADR-0017: 音声マニフェスト戦略](./0017-audio-manifest-strategy.md)
- [ADR-0018: 音声生成戦略](./0018-audio-generation-strategy.md)
