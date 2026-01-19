# 四書五経学習サイト

四書五経およびその他の中国古典を学習するための Web アプリケーション

## 機能

- **3つの表示モード**: 白文、音読み（ルビ）、ピンイン（ルビ）
- **声調変化対応**: ピンインモードで声調変化を視覚的に表示
- **人物・漢字索引**: 人物別・漢字別にコンテンツを検索
- **ダッシュボード**: 統計情報の表示
- **オープンデータ**: JSON 形式でデータを公開

## 技術スタック

- **フロントエンド**: Next.js (React)
- **データベース**: Firebase Firestore
- **認証**: Firebase Authentication
- **ホスティング**: Firebase Hosting

## アーキテクチャ決定記録 (ADR)

| ADR | タイトル | 概要 |
| --- | -------- | ---- |
| [ADR-0001](adr/0001-content-data-structure.md) | コンテンツデータ構造 | segments による発言・ナレーション管理 |
| [ADR-0002](adr/0002-character-data-structure.md) | 人物データ構造 | ピンインベースの ID 命名規則 |
| [ADR-0003](adr/0003-infrastructure-architecture.md) | インフラアーキテクチャ | Firebase + Next.js、NoSQL + ビルド時統計 |
| [ADR-0004](adr/0004-port-number-convention.md) | ポート番号規則 | 30600〜30699 番の使用 |

## ライセンス

MIT
