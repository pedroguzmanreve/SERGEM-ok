import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import firebaseConfigData from '../firebase-applet-config.json';

// Vite environment variables configuration (Vercel & Production)
const env = import.meta.env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || firebaseConfigData.apiKey || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigData.authDomain || '',
  projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseConfigData.projectId || '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigData.storageBucket || '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigData.messagingSenderId || '',
  appId: env.VITE_FIREBASE_APP_ID || firebaseConfigData.appId || '',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfigData.measurementId || '',
};

// Target Firestore Database ID (SERGEM uses custom database or default)
export const firestoreDatabaseId: string =
  env.VITE_FIREBASE_DATABASE_ID ||
  env.VITE_FIREBASE_FIRESTORE_DATABASE_ID ||
  firebaseConfigData.firestoreDatabaseId ||
  '(default)';

// Initialize Firebase App
export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID if configured
export const db: Firestore =
  firestoreDatabaseId && firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firestoreDatabaseId)
    : getFirestore(app);

// Initialize Firebase Authentication
export const auth: Auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Diagnostic log to assist debugging during Vercel deployments
if (typeof window !== 'undefined') {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error(
      '⚠️ [Firebase Configuration Error]: Variables de entorno no detectadas. Asegúrate de configurar VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, etc. en el panel de Vercel.'
    );
  } else {
    console.log(
      `✅ [Firebase Initialized]: Conectado a proyecto "${firebaseConfig.projectId}", Base de datos Firestore: "${firestoreDatabaseId}"`
    );
  }
}

export { firebaseConfig };
export default app;
