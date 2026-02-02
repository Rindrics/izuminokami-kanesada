# ADR-0025: クライアント側 Firestore 直接操作によるユーザーデータ管理

## ステータス

採用

## コンテキスト

お気に入り機能などのユーザーデータを管理する際、API エンドポイントを経由するか、クライアント側で直接 Firestore を操作するかの選択が必要である。

### 検討事項

1. **セキュリティ**: Firestore セキュリティルールで適切に保護できるか
2. **開発効率**: API エンドポイントの実装・保守コスト
3. **パフォーマンス**: リアルタイム更新の必要性
4. **一貫性**: 既存の実装パターンとの整合性

### 検討した選択肢

#### 選択肢 A: API エンドポイント経由

```text
Client → API Route → Firebase Admin SDK → Firestore
```

**メリット**:
- サーバー側での検証・バリデーションが可能
- ビジネスロジックをサーバー側に集約
- クライアント側の Firebase SDK 不要

**デメリット**:
- API エンドポイントの実装・保守コスト
- リアルタイム更新には追加の仕組みが必要
- クライアント側の状態管理が複雑

#### 選択肢 B: クライアント側で直接 Firestore 操作

```text
Client → Firebase Client SDK → Firestore
```

**メリット**:
- 実装がシンプル（API エンドポイント不要）
- Firestore のリアルタイムリスナーを直接利用可能
- クライアント側の状態管理が自然
- 既存の Firestore セキュリティルールで保護可能

**デメリット**:
- クライアント側のコードが増える
- バリデーションは Firestore ルールに依存

## 決定

**選択肢 B（クライアント側で直接 Firestore 操作）** を採用する。

### 根拠

1. **Firestore セキュリティルールで十分保護可能**
   - 既存の `firestore.rules` でユーザーごとのデータアクセス制御が実現されている
   - `/favorites/{userId}/{document=**}` のパターンで、ユーザーは自分のデータのみアクセス可能

2. **リアルタイム更新の利点**
   - Firestore の `onSnapshot` を直接利用でき、UI の更新が自然
   - 複数のタブ間での同期も自動的に実現される

3. **開発効率**
   - API エンドポイントの実装・保守が不要
   - クライアント側のコードがシンプルになる

4. **既存パターンとの整合性**
   - Firebase Authentication もクライアント側で直接操作している
   - 一貫したアーキテクチャ

### データ構造

#### お気に入り

```typescript
// Firestore path: /favorites/{userId}/{contentId}
interface Favorite {
  userId: string;
  contentId: string;
  createdAt: Timestamp;
}
```

#### アクセス履歴

```typescript
// Firestore path: /users/{userId}/accessHistory/{contentId}
interface AccessHistory {
  contentId: string;
  lastAccessedAt: Timestamp;
}
```

### セキュリティルール

既存の `firestore.rules` で以下のように保護されている：

```javascript
// Favorites: users can only read/write their own favorites
match /favorites/{userId}/{document=**} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}

// User data: users can only read/write their own data
match /users/{userId}/{document=**} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

### 実装パターン

```typescript
// src/lib/favorites.ts
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore';

export async function addFavorite(userId: string, contentId: string): Promise<void> {
  const favoriteRef = doc(db, 'favorites', userId, contentId);
  await setDoc(favoriteRef, {
    userId,
    contentId,
    createdAt: serverTimestamp(),
  });
}

export async function removeFavorite(userId: string, contentId: string): Promise<void> {
  const favoriteRef = doc(db, 'favorites', userId, contentId);
  await deleteDoc(favoriteRef);
}
```

## 結果

### メリット

1. **シンプルな実装**: API エンドポイントが不要で、コード量が削減される
2. **リアルタイム更新**: Firestore の `onSnapshot` を直接利用可能
3. **一貫性**: 既存の Firebase Authentication パターンと整合

### 考慮事項

1. **バリデーション**: 複雑なバリデーションが必要な場合は、Firestore ルールまたは Cloud Functions を検討
2. **オフライン対応**: Firestore のオフライン機能により、オフライン時も動作する
3. **コスト**: Firestore の読み書き回数に応じた課金が発生するが、ユーザーデータの規模では問題にならない

### 関連 ADR

- ADR-0003: インフラストラクチャアーキテクチャ
- ADR-0006: コンテンツストレージ戦略
