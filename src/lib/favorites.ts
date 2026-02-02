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
import { db } from './firebase';

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

  const favoriteRef = doc(db, 'favorites', userId, 'items', contentId);
  await setDoc(favoriteRef, {
    userId,
    contentId,
    createdAt: serverTimestamp(),
  });
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

  const favoriteRef = doc(db, 'favorites', userId, 'items', contentId);
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

  const favoriteRef = doc(db, 'favorites', userId, 'items', contentId);
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

  const favoritesRef = collection(db, 'favorites', userId, 'items');
  const snapshot = await getDocs(favoritesRef);
  return snapshot.docs.map((doc) => ({
    userId,
    contentId: doc.id,
    createdAt: doc.data().createdAt as Timestamp,
  }));
}

/**
 * Get favorite content IDs for a user
 */
export async function getFavoriteContentIds(userId: string): Promise<string[]> {
  if (!db) {
    return [];
  }

  const favoritesRef = collection(db, 'favorites', userId, 'items');
  const snapshot = await getDocs(favoritesRef);
  return snapshot.docs.map((doc) => doc.id);
}
