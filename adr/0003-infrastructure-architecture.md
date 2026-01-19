# ADR-0003: インフラストラクチャアーキテクチャ

## ステータス

承認済み

## コンテキスト

四書五経学習サイトのインフラストラクチャを設計する必要がある。ADR-0001（コンテンツデータ構造）および ADR-0002（人物データ構造）で定義したスキーマを効率的に保存・配信できる構成が求められる。

### 要件

1. **コスト**: 無料枠内での運用を優先
2. **スケーラビリティ**: 四書五経全体（数千コンテンツ）を扱える
3. **認証**: 管理者のみが編集可能
4. **パフォーマンス**: 閲覧は高速に、編集は許容範囲内で
5. **オープンデータ**: ビルド時に JSON を生成・配布

### 検討した選択肢

#### データベース: NoSQL vs SQL

本プロジェクトでは、統計・分析機能（ダッシュボード、Observable 連携）を実現する必要がある。これに対して2つのアプローチを検討した。

##### アプローチ A: NoSQL (ドキュメントDB) + ビルド時統計

```text
Firestore (ドキュメント単位の読み書き)
     ↓ ビルド時
統計計算 → JSON 出力
     ↓
ダッシュボード / Observable
```

##### アプローチ B: SQL (リレーショナルDB)

```text
PostgreSQL (集計クエリで直接計算)
     ↓ リアルタイム or キャッシュ
ダッシュボード / Observable
```

##### ユースケース別の適性比較

| ユースケース | A: NoSQL + ビルド時統計 | B: SQL |
| ------------ | ----------------------- | ------ |
| コンテンツ CRUD | ✅ ドキュメント単位で自然 | △ JOIN が必要 |
| segments のネスト | ✅ 配列をそのまま保存 | △ 別テーブル or JSON 型 |
| 統計・集計 | △ ビルド時に事前計算 | ✅ クエリで直接計算 |
| リアルタイム分析 | ❌ ビルドが必要 | ✅ 即座に反映 |
| スキーマ変更 | ✅ 柔軟 | △ マイグレーション必要 |
| 無料枠 | ✅ Firestore 無料枠大 | △ Supabase は制限厳しい |

##### アプローチ A を選択した理由

1. **読み取り中心のワークロード**: コンテンツは一度登録したらほぼ変更しない。統計も頻繁に変わらないため、リアルタイム集計は不要
2. **データ構造がドキュメント向き**: ADR-0001 の `segments` は配列でネストしており、ドキュメントDB なら自然に表現できる。SQL だと別テーブル + JOIN が必要
3. **無料枠の安定性**: Firestore (1GB) の方が Supabase (500MB) より余裕がある
4. **Observable 連携**: ビルド時に JSON を出力すれば、Observable から直接読み込み可能

##### アプローチ A が不適切なケース（将来の参考）

- 頻繁に統計を更新したい場合
- 複雑なアドホッククエリが必要な場合
- SQL ベースの BI ツール（Metabase, Redash）を使いたい場合

#### データベース製品の比較

| 選択肢 | メリット | デメリット |
| ------ | -------- | ---------- |
| **Firestore** | 無料枠あり、リアルタイム同期、スキーマレス | 複雑なクエリに制限 |
| PostgreSQL (Supabase) | SQL の柔軟性、リレーション | 無料枠の制限が厳しい |
| MongoDB Atlas | スキーマレス、柔軟 | 無料枠の制限 |

#### ホスティング

| 選択肢 | メリット | デメリット |
| ------ | -------- | ---------- |
| **Firebase Hosting** | Firestore との統合、CDN、無料枠 | Firebase エコシステムに依存 |
| Vercel | Next.js との親和性 | Firestore との統合が追加作業 |
| Cloudflare Pages | 高速、無料枠大きい | Firebase との統合が追加作業 |

#### フロントエンド

| 選択肢 | メリット | デメリット |
| ------ | -------- | ---------- |
| **Next.js** | SSG/SSR 対応、React エコシステム | 学習コスト |
| Remix | モダン、パフォーマンス良好 | Firebase との統合事例少 |
| SvelteKit | 軽量、高速 | エコシステムが小さい |

## 決定

**Firebase + Next.js** の構成を採用する。

### アーキテクチャ概要

```text
┌─────────────────────────────────────────────────────────────┐
│                        Firebase                              │
├──────────────┬──────────────┬───────────────────────────────┤
│   Hosting    │  Firestore   │       Authentication          │
│   (CDN)      │   (NoSQL)    │      (Admin only)             │
└──────┬───────┴──────┬───────┴───────────────────────────────┘
       │              │
       │              │
┌──────▼──────────────▼───────┐
│         Next.js App          │
│  ┌────────────────────────┐  │
│  │   Static Pages (SSG)   │  │  ← 閲覧用（ビルド時生成）
│  ├────────────────────────┤  │
│  │   Admin Pages (CSR)    │  │  ← 編集用（認証必須）
│  └────────────────────────┘  │
└──────────────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│     Open Data (JSON)         │  ← ビルド時に生成、GitHub で配布
└──────────────────────────────┘
```

### Firestore コレクション設計

ADR-0001, ADR-0002 のスキーマを Firestore コレクションにマッピングする。

#### 1. `books`

```typescript
// Document ID: "lunyu", "mengzi", etc.
{
  id: string,              // "lunyu"
  title: string,           // "論語"
  title_zh: string,        // "论语"
  sections: string[],      // ["学而第一", "為政第二", ...]
  order: number            // 表示順
}
```

#### 2. `contents`

ADR-0001 の `Content` インターフェースに対応。

```typescript
// Document ID: "lunyu_1_1", "lunyu_1_2", etc.
{
  id: string,
  book_id: string,
  section: string,
  chapter: string,
  text: string,
  segments: [
    {
      text: string,
      start_pos: number,
      end_pos: number,
      speaker: string | null    // Character ID (ADR-0002)
    }
  ],
  characters: {
    speakers: string[],
    mentioned: string[]
  },
  japanese?: string,
  created_at: timestamp,
  updated_at: timestamp
}
```

#### 3. `characters`

ADR-0002 の `Character` インターフェースに対応。

```typescript
// Document ID: "kongzi", "zilu", "yanzi-hui", etc.
{
  id: string,
  name: string,
  courtesy_name?: string,
  personal_name?: string,
  aliases: string[],
  pinyin?: string,
  description?: string
}
```

#### 4. `hanzi`

漢字辞書。音読み・ピンイン生成に使用。

```typescript
// Document ID: 漢字そのもの "學", "而", etc.
{
  id: string,
  meanings: [
    {
      id: string,
      onyomi: string,
      pinyin: string,
      tone: number,
      meaning_ja: string,
      is_default: boolean
    }
  ],
  is_common: boolean
}
```

#### 5. `content_hanzi`

コンテンツ内での漢字使用情報。サブコレクションまたは別コレクション。

```typescript
// Document ID: auto-generated
{
  content_id: string,
  hanzi_id: string,
  meaning_id: string,
  position: number,
  tone_change: {
    original_tone: number,
    changed_tone: number,
    reason: string
  } | null
}
```

### 認証設計

```typescript
// Firebase Authentication + Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 閲覧: 全員許可
    match /{collection}/{document} {
      allow read: if true;
    }

    // 編集: 認証済み管理者のみ
    match /{collection}/{document} {
      allow write: if request.auth != null
                   && request.auth.token.admin == true;
    }
  }
}
```

### ビルド時データ生成

Next.js の `getStaticProps` でビルド時に Firestore からデータを取得し、静的ページを生成。同時に JSON ファイルも出力。

```text
/public/data/
├── books.json              # 書籍一覧
├── contents/
│   ├── lunyu_1_1.json     # 各コンテンツ
│   └── ...
├── characters.json         # 人物一覧
├── index/
│   ├── by-character.json  # 人物別索引
│   └── by-hanzi.json      # 漢字別索引
└── hanzi.json              # 漢字辞書
```

## 結果

### メリット

1. **コスト効率**: Firebase 無料枠（Spark プラン）で運用可能
   - Firestore: 1GB ストレージ、50K 読み取り/日
   - Hosting: 10GB ストレージ、360MB/日 転送
2. **開発効率**: Firebase SDK により認証・DB アクセスがシンプル
3. **パフォーマンス**: SSG + CDN により閲覧は高速
4. **オープンデータ**: ビルド時に JSON 生成、GitHub で配布可能

### 考慮事項

1. **Firestore クエリ制限**: 複雑なクエリ（複数フィールドでの範囲検索など）には制限あり。インデックス設計が重要
2. **ビルド時間**: コンテンツ数が増えるとビルド時間が増加。ISR（Incremental Static Regeneration）の検討が必要
3. **無料枠の監視**: 読み取り回数が増えると無料枠を超える可能性。キャッシュ戦略が重要
4. **ベンダーロック**: Firebase エコシステムへの依存。データエクスポートの仕組みを維持することで軽減

### 無料枠での四書五経運用可否分析

#### コンテンツ数の見積もり

| 書籍 | 篇/巻数 | 章数（概算） |
| ---- | ------- | ------------ |
| **四書** | | |
| 論語 | 20篇 | ~500章 |
| 孟子 | 14篇 | ~260章 |
| 大学 | 1篇 | ~10章 |
| 中庸 | 1篇 | ~33章 |
| **五経** | | |
| 易経 | 64卦 + 十翼 | ~100+ |
| 書経 | 58篇 | ~58章 |
| 詩経 | 305篇 | ~305章 |
| 礼記 | 49篇 | ~200章 |
| 春秋左伝 | 12公 | ~500章 |
| **合計** | | **~2,000章** |

#### ストレージ使用量見積もり

ADR-0001, ADR-0002 のスキーマに基づく見積もり:

| コレクション | ドキュメント数 | 平均サイズ | 合計 |
| ------------ | -------------- | ---------- | ---- |
| `contents` | 2,000 | 2 KB | 4 MB |
| `books` | 10 | 500 B | 5 KB |
| `characters` | 200 | 500 B | 100 KB |
| `hanzi` | 5,000 | 300 B | 1.5 MB |
| `content_hanzi` | 100,000 | 100 B | 10 MB |
| **合計** | | | **~16 MB** |

#### 無料枠との比較

| 項目 | Firestore 無料枠 | 見積もり使用量 | 判定 |
| ---- | ---------------- | -------------- | ---- |
| ストレージ | 1 GB | ~16 MB (1.6%) | ✅ 余裕 |
| 読み取り | 50,000/日 | 動的読み取り時は要注意 | ⚠️ SSG 必須 |
| 書き込み | 20,000/日 | 編集時のみ | ✅ 余裕 |
| 削除 | 20,000/日 | ほぼなし | ✅ 余裕 |

#### 読み取り回数の懸念と対策

動的読み取りの場合、1ページ表示に必要な読み取り:

- `content`: 1回
- `characters`: N回（発言者数）
- `hanzi`: M回（文字数、ルビ表示時）

例: 50文字のコンテンツ、発言者1人の場合 → 52回/ページ

50,000 ÷ 52 ≈ 960 ページビュー/日 で上限に達する。

対策:

1. **SSG 採用**: ビルド時に全データを読み取り、静的ページ化（閲覧時は Firestore を読まない）
2. **データの事前結合**: ビルド時に `content_hanzi` を `contents` に埋め込み
3. **クライアントキャッシュ**: `characters` と `hanzi` は初回読み込み後キャッシュ

#### 結論

SSG 戦略を採用すれば、Firebase 無料枠で四書五経全体の運用が可能。

- ストレージ: 1GB に対して ~16MB（余裕あり）
- 読み取り: SSG によりビルド時のみ消費、閲覧時はゼロ
- 書き込み: 管理者による編集のみなので十分な余裕

### 将来の拡張

1. **検索機能**: Algolia または Meilisearch の導入
2. **API 公開**: Cloud Functions で REST API を提供
3. **オフライン対応**: PWA + Firestore オフライン永続化
