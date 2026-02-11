import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAfter,
  writeBatch,
} from 'firebase/firestore';
import type {
  CollectionContent,
  CollectionSummary,
  CollectionWithContents,
  ContentCollectionInfo,
  ContentType,
  PublicCollection,
} from '@/types/collection';
import { decodeContentId, encodeContentId } from './favorites';
import { db } from './firebase';

const MAX_COLLECTIONS = 255;

/**
 * コレクション作成
 * @throws Error コレクション数が255を超える場合
 */
export async function createCollection(
  userId: string,
  name: string,
  description?: string,
  isPublic = false,
): Promise<string> {
  if (!db) throw new Error('Firestore is not initialized');

  const firestore = db;

  return runTransaction(firestore, async (transaction) => {
    const parentRef = doc(firestore, 'collections', userId);
    const parentDoc = await transaction.get(parentRef);

    const currentCount = parentDoc.exists()
      ? parentDoc.data().collectionCount || 0
      : 0;

    if (currentCount >= MAX_COLLECTIONS) {
      throw new Error(`コレクションは最大${MAX_COLLECTIONS}個までです`);
    }

    const collectionRef = doc(
      collection(firestore, 'collections', userId, 'items'),
    );

    transaction.set(
      parentRef,
      {
        userId,
        collectionCount: increment(1),
      },
      { merge: true },
    );

    transaction.set(collectionRef, {
      name,
      description: description || null,
      isPublic,
      contentCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return collectionRef.id;
  });
}

/**
 * コレクション削除
 */
export async function deleteCollection(
  userId: string,
  collectionId: string,
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');

  const firestore = db;

  // まずコレクションが公開かどうか確認
  const collectionRef = doc(
    firestore,
    'collections',
    userId,
    'items',
    collectionId,
  );
  const collectionDoc = await getDoc(collectionRef);

  if (!collectionDoc.exists()) {
    throw new Error('コレクションが見つかりません');
  }

  const wasPublic = collectionDoc.data().isPublic;

  // トランザクション実行
  await runTransaction(firestore, async (transaction) => {
    // コンテンツを全て削除
    const contentsRef = collection(
      firestore,
      'collections',
      userId,
      'items',
      collectionId,
      'contents',
    );
    const contentsSnapshot = await getDocs(contentsRef);

    for (const contentDoc of contentsSnapshot.docs) {
      transaction.delete(contentDoc.ref);
    }

    // コレクションを削除
    transaction.delete(collectionRef);

    // カウントをデクリメント
    const parentRef = doc(firestore, 'collections', userId);
    transaction.update(parentRef, {
      collectionCount: increment(-1),
    });

    // 公開コレクションだった場合、インデックスも削除
    if (wasPublic) {
      const publicRef = doc(firestore, 'publicCollections', collectionId);
      transaction.delete(publicRef);
    }
  });

  // 削除後のクリーンアップパス（トランザクション中に追加された orphaned ドキュメント削除）
  const contentsRef = collection(
    firestore,
    'collections',
    userId,
    'items',
    collectionId,
    'contents',
  );
  await cleanupOrphanedContents(firestore, contentsRef);
}

async function cleanupOrphanedContents(
  firestore: typeof db,
  contentsRef: ReturnType<typeof collection>,
): Promise<void> {
  let queryObj = query(contentsRef, limit(100));

  while (true) {
    const snapshot = await getDocs(queryObj);
    if (snapshot.empty) break;

    const batch = writeBatch(firestore!);
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();

    // ページネーション: 最後のドキュメントから次へ
    if (snapshot.docs.length < 100) break;
    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    queryObj = query(contentsRef, startAfter(lastDoc), limit(100));
  }
}

/**
 * コレクション更新
 */
export async function updateCollection(
  userId: string,
  collectionId: string,
  updates: {
    name?: string;
    description?: string;
    isPublic?: boolean;
  },
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');

  const firestore = db;

  const collectionRef = doc(
    firestore,
    'collections',
    userId,
    'items',
    collectionId,
  );
  const publicRef = doc(firestore, 'publicCollections', collectionId);

  await runTransaction(firestore, async (transaction) => {
    // Read the current document state
    const collectionDoc = await transaction.get(collectionRef);

    if (!collectionDoc.exists()) {
      throw new Error('コレクションが見つかりません');
    }

    const currentData = collectionDoc.data();
    const wasPublic = currentData.isPublic || false;
    const willBePublic = updates.isPublic ?? wasPublic;

    // Update the collection document
    transaction.update(collectionRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    // Handle public collection index mutations atomically
    if (willBePublic && !wasPublic) {
      // 非公開→公開: インデックスに追加
      transaction.set(publicRef, {
        userId,
        name: updates.name ?? currentData.name,
        description: updates.description ?? currentData.description ?? null,
        contentCount: currentData.contentCount ?? 0,
        createdAt: currentData.createdAt,
        updatedAt: serverTimestamp(),
      });
    } else if (!willBePublic && wasPublic) {
      // 公開→非公開: インデックスから削除
      transaction.delete(publicRef);
    } else if (willBePublic) {
      // 公開のまま更新: インデックスも更新
      transaction.update(publicRef, {
        name: updates.name ?? currentData.name,
        description:
          updates.description !== undefined
            ? (updates.description ?? null)
            : (currentData.description ?? null),
        updatedAt: serverTimestamp(),
      });
    }
  });
}

/**
 * 公開コレクションインデックスを同期
 */
async function syncPublicCollectionIndex(
  userId: string,
  collectionId: string,
): Promise<void> {
  if (!db) return;

  const firestore = db;

  const collectionRef = doc(
    firestore,
    'collections',
    userId,
    'items',
    collectionId,
  );
  const collectionDoc = await getDoc(collectionRef);

  if (!collectionDoc.exists()) return;

  const data = collectionDoc.data();

  const publicRef = doc(firestore, 'publicCollections', collectionId);
  await setDoc(publicRef, {
    userId,
    name: data.name,
    description: data.description || null,
    contentCount: data.contentCount ?? 0,
    createdAt: data.createdAt,
    updatedAt: serverTimestamp(),
  });
}

/**
 * ユーザーの全コレクション取得（要約情報）
 */
export async function getCollections(
  userId: string,
): Promise<CollectionSummary[]> {
  if (!db) return [];

  try {
    const collectionsRef = collection(db, 'collections', userId, 'items');
    const snapshot = await getDocs(collectionsRef);

    const summaries: CollectionSummary[] = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();

      summaries.push({
        id: docSnap.id,
        name: data.name,
        description: data.description || undefined,
        isPublic: data.isPublic || false,
        contentCount: data.contentCount ?? 0,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    }

    return summaries.sort(
      (a, b) => (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0),
    );
  } catch (error) {
    console.error('[getCollections] Error:', error);
    return [];
  }
}

/**
 * コレクション詳細取得（コンテンツ含む）
 */
export async function getCollectionWithContents(
  userId: string,
  collectionId: string,
): Promise<CollectionWithContents | null> {
  if (!db) return null;

  try {
    const collectionRef = doc(db, 'collections', userId, 'items', collectionId);
    const collectionDoc = await getDoc(collectionRef);

    if (!collectionDoc.exists()) return null;

    const contentsRef = collection(
      db,
      'collections',
      userId,
      'items',
      collectionId,
      'contents',
    );
    const contentsSnapshot = await getDocs(contentsRef);

    const contents: CollectionContent[] = contentsSnapshot.docs.map((d) => ({
      contentId: decodeContentId(d.id),
      contentType: d.data().contentType,
      addedAt: d.data().addedAt,
    }));

    const data = collectionDoc.data();
    return {
      id: collectionDoc.id,
      userId,
      name: data.name,
      description: data.description || undefined,
      isPublic: data.isPublic || false,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      contents: contents.sort(
        (a, b) => (b.addedAt?.toMillis() ?? 0) - (a.addedAt?.toMillis() ?? 0),
      ),
    };
  } catch (error) {
    console.error('[getCollectionWithContents] Error:', error);
    return null;
  }
}

/**
 * コレクションにコンテンツを追加
 */
export async function addContentToCollection(
  userId: string,
  collectionId: string,
  contentId: string,
  contentType: ContentType,
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');

  const encodedId = encodeContentId(contentId);
  const contentRef = doc(
    db,
    'collections',
    userId,
    'items',
    collectionId,
    'contents',
    encodedId,
  );
  const collectionRef = doc(db, 'collections', userId, 'items', collectionId);

  let isPublic = false;

  await runTransaction(db, async (transaction) => {
    // Read content document to check if it exists
    const contentDoc = await transaction.get(contentRef);
    const collectionDoc = await transaction.get(collectionRef);

    if (!collectionDoc.exists()) {
      throw new Error('Collection does not exist');
    }

    isPublic = collectionDoc.data().isPublic || false;

    // Only write content and increment count if content doesn't exist
    if (!contentDoc.exists()) {
      transaction.set(contentRef, {
        contentId,
        contentType,
        addedAt: serverTimestamp(),
      });

      transaction.update(collectionRef, {
        contentCount: increment(1),
        updatedAt: serverTimestamp(),
      });
    }
  });

  // Update public collection index after successful transaction
  if (isPublic) {
    await syncPublicCollectionIndex(userId, collectionId);
  }
}

/**
 * コレクションからコンテンツを削除
 */
export async function removeContentFromCollection(
  userId: string,
  collectionId: string,
  contentId: string,
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');

  const encodedId = encodeContentId(contentId);
  const contentRef = doc(
    db,
    'collections',
    userId,
    'items',
    collectionId,
    'contents',
    encodedId,
  );
  const collectionRef = doc(db, 'collections', userId, 'items', collectionId);

  let isPublic = false;

  await runTransaction(db, async (transaction) => {
    // Read documents to check existence
    const contentDoc = await transaction.get(contentRef);
    const collectionDoc = await transaction.get(collectionRef);

    if (!collectionDoc.exists()) {
      throw new Error('Collection does not exist');
    }

    isPublic = collectionDoc.data().isPublic || false;

    // Only delete content and decrement count if content exists
    if (contentDoc.exists()) {
      transaction.delete(contentRef);

      transaction.update(collectionRef, {
        contentCount: increment(-1),
        updatedAt: serverTimestamp(),
      });
    }
  });

  // Update public collection index after successful transaction
  if (isPublic) {
    await syncPublicCollectionIndex(userId, collectionId);
  }
}

/**
 * 特定コンテンツが属するコレクション一覧を取得
 */
export async function getCollectionsForContent(
  userId: string,
  contentId: string,
): Promise<ContentCollectionInfo[]> {
  if (!db) return [];

  try {
    const collections = await getCollections(userId);
    const encodedId = encodeContentId(contentId);

    // Parallelize all getDoc calls using Promise.all
    const getDocPromises = collections.map((col) => {
      const contentRef = doc(
        db!,
        'collections',
        userId,
        'items',
        col.id,
        'contents',
        encodedId,
      );
      return getDoc(contentRef).then((contentDoc) => ({
        col,
        exists: contentDoc.exists(),
      }));
    });

    const results = await Promise.all(getDocPromises);
    return results
      .filter((r) => r.exists)
      .map((r) => ({
        collectionId: r.col.id,
        collectionName: r.col.name,
      }));
  } catch (error) {
    console.error('[getCollectionsForContent] Error:', error);
    return [];
  }
}

/**
 * コンテンツが特定コレクションに含まれているか確認
 */
export async function isContentInCollection(
  userId: string,
  collectionId: string,
  contentId: string,
): Promise<boolean> {
  if (!db) return false;

  try {
    const encodedId = encodeContentId(contentId);
    const contentRef = doc(
      db,
      'collections',
      userId,
      'items',
      collectionId,
      'contents',
      encodedId,
    );
    const contentDoc = await getDoc(contentRef);

    return contentDoc.exists();
  } catch (error) {
    console.error('[isContentInCollection] Error:', error);
    return false;
  }
}

/**
 * ユーザーのコレクション数を取得
 */
export async function getCollectionCount(userId: string): Promise<number> {
  if (!db) return 0;

  try {
    const parentRef = doc(db, 'collections', userId);
    const parentDoc = await getDoc(parentRef);

    return parentDoc.exists() ? parentDoc.data().collectionCount || 0 : 0;
  } catch (error) {
    console.error('[getCollectionCount] Error:', error);
    return 0;
  }
}

/**
 * 公開コレクション一覧を取得
 */
export async function getPublicCollections(): Promise<PublicCollection[]> {
  if (!db) return [];

  try {
    const publicRef = collection(db, 'publicCollections');
    const snapshot = await getDocs(publicRef);

    return snapshot.docs
      .map((d) => ({
        id: d.id,
        userId: d.data().userId,
        name: d.data().name,
        description: d.data().description || undefined,
        contentCount: d.data().contentCount || 0,
        createdAt: d.data().createdAt,
        updatedAt: d.data().updatedAt,
      }))
      .sort(
        (a, b) =>
          (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0),
      );
  } catch (error) {
    console.error('[getPublicCollections] Error:', error);
    return [];
  }
}

/**
 * 公開コレクションの詳細を取得（他ユーザーのコレクション閲覧用）
 */
export async function getPublicCollectionWithContents(
  collectionId: string,
): Promise<CollectionWithContents | null> {
  if (!db) return null;

  try {
    // まず公開インデックスから情報を取得
    const publicRef = doc(db, 'publicCollections', collectionId);
    const publicDoc = await getDoc(publicRef);

    if (!publicDoc.exists()) return null;

    const publicData = publicDoc.data();
    const userId = publicData.userId;

    // 実際のコレクションデータを取得
    const collection = await getCollectionWithContents(userId, collectionId);

    // isPublic フラグを検証（インデックスと実データの一貫性確認）
    if (!collection || !collection.isPublic) {
      console.warn(
        `[getPublicCollectionWithContents] Collection ${collectionId} is not public or not found`,
      );
      return null;
    }

    return collection;
  } catch (error) {
    console.error('[getPublicCollectionWithContents] Error:', error);
    return null;
  }
}
