# ADR-0020: 音声配信に CDN を使用しない

## ステータス

採用

## コンテキスト

音声ファイルを Cloud Storage から配信する際、パフォーマンスとセキュリティの観点から Cloud CDN の導入を検討した。

### Cloud CDN の構成

```text
ユーザー → Cloud CDN → Load Balancer → GCS バケット
```

### Cloud CDN のメリット

- エッジキャッシュによる低レイテンシ
- DDoS 保護
- バケットへの直接アクセスを遮断

## 決定

**現時点では Cloud CDN を使用せず、署名付き URL による直接配信を採用する。**

## 根拠

### コスト面

| リソース | 月額コスト |
|---------|-----------|
| Cloud CDN キャッシュ | $0.02〜0.08/GB（安価） |
| Global HTTPS Load Balancer | **~$18/月（固定）** |
| 転送ルール | ~$7/月 |

Cloud CDN を使用するには Global Load Balancer が必須であり、最低でも **月額 $25 程度** の固定コストが発生する。

### コスト比較（月間 1GB 配信の場合）

| 方式 | 月額コスト |
|------|-----------|
| GCS + 署名付き URL | ~$0.12 |
| GCS + Cloud CDN + LB | ~$25 |

個人プロジェクトで月間数十 GB 以上の配信が見込めない現状では、CDN の導入は費用対効果が低い。

### セキュリティ面

署名付き URL により以下のセキュリティ要件を満たしている：

- URL は有効期限付き（15 分）
- URL を知っていても期限切れで無効化
- バケットは非公開（`allUsers` なし）
- API 経由でのみ署名付き URL を取得可能

### パフォーマンス面

- 音声ファイルは比較的小さい（数十 KB〜数百 KB）
- 想定ユーザー数は限定的
- GCS は十分なスループットを提供

## 影響

### 現在の構成

```text
ユーザー → Next.js API → 署名付き URL 生成 → GCS 直接アクセス
```

### 将来の移行パス

以下の条件を満たした場合、CDN の導入を再検討する：

1. 月間配信量が 50GB を超える
2. レイテンシが問題になる（海外ユーザーの増加）
3. DDoS 攻撃を受ける

移行時の変更点：
- Terraform で Load Balancer + CDN を追加
- バックエンドバケットとして GCS を設定
- 署名付き URL → CDN URL に切り替え

## 代替案

### A: Cloud CDN + Load Balancer

**却下理由**: 固定コストが高く、現在の規模では費用対効果が低い

### B: Firebase Hosting の CDN

**却下理由**: 動的な音声ファイルのホスティングには不向き

### C: 外部 CDN（Cloudflare など）

**将来の検討候補**: 無料プランあり、ただし GCS との統合に追加設定が必要

## 関連

- [ADR-0017: 音声マニフェスト戦略](./0017-audio-manifest-strategy.md)（削除済み、Cloud Storage 方式に移行）
- Cloud CDN 料金: https://cloud.google.com/cdn/pricing
- Cloud Load Balancing 料金: https://cloud.google.com/load-balancing/pricing
