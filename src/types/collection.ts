import type { Timestamp } from 'firebase/firestore';

/**
 * コンテンツの種類
 */
export type ContentType = 'section' | 'chapter';

/**
 * コレクション内のコンテンツ
 */
export interface CollectionContent {
  contentId: string;
  contentType: ContentType;
  addedAt: Timestamp;
}

/**
 * コレクション
 */
export interface Collection {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isPublic: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * コレクションとそのコンテンツ一覧
 */
export interface CollectionWithContents extends Collection {
  contents: CollectionContent[];
}

/**
 * コレクションの要約情報（一覧表示用）
 */
export interface CollectionSummary {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  contentCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * コンテンツが属するコレクションの情報
 */
export interface ContentCollectionInfo {
  collectionId: string;
  collectionName: string;
}

/**
 * 公開コレクション（インデックス用）
 */
export interface PublicCollection {
  id: string;
  userId: string;
  name: string;
  description?: string;
  contentCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
