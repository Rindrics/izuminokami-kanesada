import type { Timestamp } from 'firebase/firestore';
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import type { AccessHistory } from '@/types/favorite';
import { getFavoriteContentIds } from './favorites';
import { db } from './firebase';

/**
 * Record access to a content page
 */
export async function recordAccess(
  userId: string,
  contentId: string,
): Promise<void> {
  if (!db) {
    return;
  }

  const accessRef = doc(db, 'users', userId, 'accessHistory', contentId);
  await setDoc(
    accessRef,
    {
      contentId,
      lastAccessedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/**
 * Get access history for a user, ordered by last accessed date (most recent first)
 */
export async function getAccessHistory(
  userId: string,
  maxResults?: number,
): Promise<AccessHistory[]> {
  if (!db) {
    return [];
  }

  const accessHistoryRef = collection(db, 'users', userId, 'accessHistory');
  let q = query(accessHistoryRef, orderBy('lastAccessedAt', 'desc'));

  if (maxResults !== undefined) {
    q = query(q, limit(maxResults));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    contentId: doc.id,
    lastAccessedAt: doc.data().lastAccessedAt as Timestamp,
  }));
}

/**
 * Get favorite content IDs ordered by last accessed date (most recent first)
 */
export async function getFavoriteContentIdsByAccessDate(
  userId: string,
  maxResults: number = 5,
): Promise<string[]> {
  if (!db) {
    return [];
  }

  // Get favorite content IDs
  const favoriteIds = await getFavoriteContentIds(userId);
  if (favoriteIds.length === 0) {
    return [];
  }

  // Get access history for favorite contents only
  const accessHistory = await getAccessHistory(userId);

  // Filter access history to only include favorites and sort by last accessed date
  const favoriteAccessHistory = accessHistory
    .filter((item) => favoriteIds.includes(item.contentId))
    .sort((a, b) => {
      // Most recent first
      return b.lastAccessedAt.toMillis() - a.lastAccessedAt.toMillis();
    })
    .slice(0, maxResults)
    .map((item) => item.contentId);

  return favoriteAccessHistory;
}
