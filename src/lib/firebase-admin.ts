import {
  type App,
  cert,
  getApps,
  initializeApp,
  type ServiceAccount,
} from 'firebase-admin/app';
import { type Firestore, getFirestore } from 'firebase-admin/firestore';

function getFirebaseAdminApp(): App {
  const existingApp = getApps()[0];
  if (existingApp) {
    return existingApp;
  }

  const serviceAccount: ServiceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  return initializeApp({
    credential: cert(serviceAccount),
  });
}

let firestoreInstance: Firestore | null = null;

export function getFirestoreAdmin(): Firestore {
  if (!firestoreInstance) {
    const app = getFirebaseAdminApp();
    firestoreInstance = getFirestore(app);
  }
  return firestoreInstance;
}
