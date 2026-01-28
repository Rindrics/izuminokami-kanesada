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

// Client-side validation (only check if values are missing, don't throw during module evaluation)
if (typeof window !== 'undefined') {
  if (
    !firebaseConfig.apiKey ||
    !firebaseConfig.authDomain ||
    !firebaseConfig.projectId
  ) {
    console.error(
      'Firebase configuration is missing. Please set NEXT_PUBLIC_FIREBASE_* environment variables in .env or .env.local',
    );
  }
}

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Connect to emulators in development if configured
const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';

if (useEmulators && typeof window !== 'undefined') {
  const authEmulatorHost =
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';
  const firestoreEmulatorHost =
    process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST ||
    'localhost:30602';
  const [firestoreHost, firestorePort] = firestoreEmulatorHost.split(':');

  try {
    connectAuthEmulator(getAuth(app), `http://${authEmulatorHost}`, {
      disableWarnings: true,
    });
    connectFirestoreEmulator(
      getFirestore(app),
      firestoreHost,
      parseInt(firestorePort, 10),
    );
  } catch (_error) {
    // Emulators already connected, ignore
  }
}

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
