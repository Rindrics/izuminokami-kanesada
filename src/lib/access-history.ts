import type { Timestamp } from 'firebase/firestore';
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import type { AccessHistory } from '@/types/favorite';
import {
  decodeContentId,
  encodeContentId,
  getFavoriteContentIds,
} from './favorites';
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

  const encodedId = encodeContentId(contentId);
  const accessRef = doc(db, 'users', userId, 'accessHistory', encodedId);
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
  return snapshot.docs.map((d) => ({
    contentId: decodeContentId(d.id),
    lastAccessedAt: d.data().lastAccessedAt as Timestamp,
  }));
}

/**
 * Get favorite content IDs ordered by last accessed date (most recent first)
 * If no access history exists, includes favorites without access history
 */
export async function getFavoriteContentIdsByAccessDate(
  userId: string,
  maxResults = 5,
): Promise<string[]> {
  if (!db) {
    return [];
  }

  try {
    // Get favorite content IDs
    const favoriteIds = await getFavoriteContentIds(userId);

    if (favoriteIds.length === 0) {
      return [];
    }

    // Get access history for favorite contents only
    const accessHistory = await getAccessHistory(userId);

    // Create a map of contentId -> lastAccessedAt for quick lookup
    const accessHistoryMap = new Map<string, Timestamp>();
    for (const item of accessHistory) {
      if (favoriteIds.includes(item.contentId)) {
        accessHistoryMap.set(item.contentId, item.lastAccessedAt);
      }
    }

    // Sort favorites: those with access history first (by last accessed date),
    // then those without access history
    // Copy array to avoid mutating the original
    const sortedFavorites = [...favoriteIds].sort((a, b) => {
      const aAccess = accessHistoryMap.get(a);
      const bAccess = accessHistoryMap.get(b);

      // Both have access history: sort by last accessed date (most recent first)
      if (aAccess && bAccess) {
        return bAccess.toMillis() - aAccess.toMillis();
      }

      // Only one has access history: prioritize the one with access history
      if (aAccess && !bAccess) {
        return -1;
      }
      if (!aAccess && bAccess) {
        return 1;
      }

      // Neither has access history: maintain original order
      return 0;
    });

    return sortedFavorites.slice(0, maxResults);
  } catch (error) {
    console.error('[getFavoriteContentIdsByAccessDate] Error:', error);
    return [];
  }
}

/**
 * Subscribe to favorite content IDs ordered by last accessed date (most recent first)
 * Returns an unsubscribe function
 */
export function subscribeFavoriteContentIdsByAccessDate(
  userId: string,
  maxResults: number,
  callback: (contentIds: string[]) => void,
): Unsubscribe {
  if (!db) {
    callback([]);
    return () => {};
  }

  let favoriteIdsCache: string[] = [];
  let accessHistoryCache: AccessHistory[] = [];

  // Helper function to update the list
  const updateList = async () => {
    try {
      if (favoriteIdsCache.length === 0) {
        callback([]);
        return;
      }

      // Get access history if not cached
      if (accessHistoryCache.length === 0) {
        accessHistoryCache = await getAccessHistory(userId);
      }

      // Create a map of contentId -> lastAccessedAt for quick lookup
      const accessHistoryMap = new Map<string, Timestamp>();
      for (const item of accessHistoryCache) {
        if (favoriteIdsCache.includes(item.contentId)) {
          accessHistoryMap.set(item.contentId, item.lastAccessedAt);
        }
      }

      // Sort favorites: those with access history first (by last accessed date),
      // then those without access history
      const sortedFavorites = [...favoriteIdsCache].sort((a, b) => {
        const aAccess = accessHistoryMap.get(a);
        const bAccess = accessHistoryMap.get(b);

        // Both have access history: sort by last accessed date (most recent first)
        if (aAccess && bAccess) {
          return bAccess.toMillis() - aAccess.toMillis();
        }

        // Only one has access history: prioritize the one with access history
        if (aAccess && !bAccess) {
          return -1;
        }
        if (!aAccess && bAccess) {
          return 1;
        }

        // Neither has access history: maintain original order
        return 0;
      });

      callback(sortedFavorites.slice(0, maxResults));
    } catch (error) {
      console.error(
        '[subscribeFavoriteContentIdsByAccessDate] Error in updateList:',
        error,
      );
      callback([]);
    }
  };

  // Subscribe to favorites collection
  const favoritesRef = collection(db, 'favorites', userId, 'items');

  const unsubscribeFavorites = onSnapshot(
    favoritesRef,
    (snapshot) => {
      // Decode document IDs back to contentIds
      favoriteIdsCache = snapshot.docs.map((d) => decodeContentId(d.id));
      updateList();
    },
    (error) => {
      console.error(
        '[subscribeFavoriteContentIdsByAccessDate] Favorites snapshot error:',
        error,
      );
      callback([]);
    },
  );

  // Also subscribe to access history changes
  const accessHistoryRef = collection(db, 'users', userId, 'accessHistory');
  const unsubscribeAccessHistory = onSnapshot(
    accessHistoryRef,
    (snapshot) => {
      // Decode document IDs back to contentIds
      accessHistoryCache = snapshot.docs.map((d) => ({
        contentId: decodeContentId(d.id),
        lastAccessedAt: d.data().lastAccessedAt as Timestamp,
      }));
      updateList();
    },
    (error) => {
      console.error(
        '[subscribeFavoriteContentIdsByAccessDate] Access history snapshot error:',
        error,
      );
    },
  );

  // Return unsubscribe function that unsubscribes from both
  return () => {
    unsubscribeFavorites();
    unsubscribeAccessHistory();
  };
}
