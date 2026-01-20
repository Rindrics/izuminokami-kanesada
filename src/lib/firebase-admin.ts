import {
  type App,
  type ServiceAccount,
  cert,
  getApps,
  initializeApp,
} from 'firebase-admin/app';
import { type Firestore, getFirestore } from 'firebase-admin/firestore';

function getFirebaseAdminApp(): App {
  const existingApp = getApps()[0];
  if (existingApp) {
    return existingApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing required Firebase Admin credentials. Ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set.',
    );
  }

  const serviceAccount: ServiceAccount = {
    projectId,
    clientEmail,
    privateKey,
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
