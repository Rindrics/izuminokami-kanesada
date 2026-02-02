import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from 'firebase/firestore';
import type { Favorite } from '@/types/favorite';
import { recordAccess } from './access-history';
import { db } from './firebase';

/**
 * Encode contentId for use as Firestore document ID
 * Firestore interprets '/' as path separator, so we encode it
 */
export function encodeContentId(contentId: string): string {
  return contentId.replace(/\//g, '__');
}

/**
 * Decode contentId from Firestore document ID
 */
export function decodeContentId(encodedId: string): string {
  return encodedId.replace(/__/g, '/');
}

/**
 * Add a favorite for a user
 */
export async function addFavorite(
  userId: string,
  contentId: string,
): Promise<void> {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  const encodedId = encodeContentId(contentId);

  // Ensure parent document exists for subcollection access
  const parentRef = doc(db, 'favorites', userId);
  await setDoc(parentRef, { userId }, { merge: true });

  const favoriteRef = doc(db, 'favorites', userId, 'items', encodedId);
  await setDoc(favoriteRef, {
    userId,
    contentId,
    createdAt: serverTimestamp(),
  });

  // Record access history when adding favorite so it appears in the list immediately
  try {
    await recordAccess(userId, contentId);
  } catch (error) {
    console.error('[addFavorite] Failed to record access history:', error);
    // Don't throw - favorite was added successfully
  }
}

/**
 * Remove a favorite for a user
 */
export async function removeFavorite(
  userId: string,
  contentId: string,
): Promise<void> {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  const encodedId = encodeContentId(contentId);
  const favoriteRef = doc(db, 'favorites', userId, 'items', encodedId);
  await deleteDoc(favoriteRef);
}

/**
 * Check if a content is favorited by a user
 */
export async function isFavorite(
  userId: string,
  contentId: string,
): Promise<boolean> {
  if (!db) {
    return false;
  }

  const encodedId = encodeContentId(contentId);
  const favoriteRef = doc(db, 'favorites', userId, 'items', encodedId);
  const favoriteDoc = await getDoc(favoriteRef);

  return favoriteDoc.exists();
}

/**
 * Get all favorites for a user
 */
export async function getFavorites(userId: string): Promise<Favorite[]> {
  if (!db) {
    return [];
  }

  try {
    const favoritesRef = collection(db, 'favorites', userId, 'items');
    const snapshot = await getDocs(favoritesRef);
    const favorites = snapshot.docs.map((d) => ({
      userId,
      contentId: decodeContentId(d.id),
      createdAt: d.data().createdAt as Timestamp,
    }));
    return favorites;
  } catch (error) {
    console.error('[getFavorites] Error:', error);
    return [];
  }
}

/**
 * Get favorite content IDs for a user
 */
export async function getFavoriteContentIds(userId: string): Promise<string[]> {
  if (!db) {
    return [];
  }

  try {
    const favoritesRef = collection(db, 'favorites', userId, 'items');
    const snapshot = await getDocs(favoritesRef);
    const ids = snapshot.docs.map((d) => decodeContentId(d.id));
    return ids;
  } catch (error) {
    console.error('[getFavoriteContentIds] Error:', error);
    return [];
  }
}
