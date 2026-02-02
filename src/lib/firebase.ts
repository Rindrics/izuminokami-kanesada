import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

// Direct access to environment variables
// Next.js webpack DefinePlugin replaces process.env.NEXT_PUBLIC_* at build time
// IMPORTANT: Must use direct access, not through functions, for client-side to work
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate required environment variables
// Only validate on server-side to avoid issues with client-side bundle
if (typeof window === 'undefined') {
  const requiredEnvVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  ] as const;

  const missingEnvVars = requiredEnvVars.filter((varName) => {
    const value = process.env[varName];
    return !value || value.trim() === '';
  });

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing required Firebase environment variables: ${missingEnvVars.join(', ')}. ` +
        'Please set them in your .env or .env.local file and restart the dev server. See README.md for details.',
    );
  }
}

// Client-side validation - check if Firebase is properly configured
export const isFirebaseConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId
);

if (typeof window !== 'undefined' && !isFirebaseConfigured) {
  console.error(
    'Firebase configuration is missing. Please set NEXT_PUBLIC_FIREBASE_* environment variables in .env or .env.local',
  );
}

// Only initialize Firebase if properly configured
let app: ReturnType<typeof initializeApp> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;

if (isFirebaseConfigured) {
  // Initialize Firebase
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

  // Connect to emulators in development if configured
  const useEmulators =
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';

  if (useEmulators && typeof window !== 'undefined') {
    const authEmulatorHost =
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || 'localhost:30603';
    const firestoreEmulatorHost =
      process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST ||
      'localhost:30602';
    const [firestoreHost, firestorePort] = firestoreEmulatorHost.split(':');
    const [authHost, authPort] = authEmulatorHost.split(':');

    // Get Firestore instance and connect to emulator immediately
    const tempDb = getFirestore(app);
    try {
      connectFirestoreEmulator(
        tempDb,
        firestoreHost,
        Number.parseInt(firestorePort, 10),
      );
      db = tempDb;
    } catch (error) {
      // Emulators already connected, ignore
      if (
        error instanceof Error &&
        !error.message.includes('already connected')
      ) {
        console.error('[firebase] Firestore emulator connection error:', error);
      }
      db = tempDb;
    }

    // Get Auth instance and connect to emulator immediately
    const tempAuth = getAuth(app);
    try {
      const authEmulatorUrl = `http://${authHost}:${authPort}`;
      connectAuthEmulator(tempAuth, authEmulatorUrl, {
        disableWarnings: true,
      });
      auth = tempAuth;
    } catch (error) {
      // Emulators already connected, ignore
      if (
        error instanceof Error &&
        !error.message.includes('already connected')
      ) {
        console.warn(
          '[firebase] Auth emulator connection warning:',
          error.message,
        );
      }
      auth = tempAuth;
    }
  } else {
    // Initialize Firebase services (production mode)
    auth = getAuth(app);
    db = getFirestore(app);
  }
}

export { auth, db };
export default app;
