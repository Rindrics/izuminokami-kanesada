import type { Timestamp } from 'firebase/firestore';

export interface Favorite {
  userId: string;
  contentId: string;
  createdAt: Timestamp;
}

export interface AccessHistory {
  contentId: string;
  lastAccessedAt: Timestamp;
}
