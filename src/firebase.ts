import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import firebaseConfigData from '../firebase-applet-config.json';

// Variables de entorno de Vite (import.meta.env) - Prioridad para Vercel y producción
const env = import.meta.env;

export const firebaseConfig = {
  apiKey: (env.VITE_FIREBASE_API_KEY || firebaseConfigData?.apiKey || '').trim(),
  authDomain: (env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigData?.authDomain || '').trim(),
  projectId: (env.VITE_FIREBASE_PROJECT_ID || firebaseConfigData?.projectId || '').trim(),
  storageBucket: (env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigData?.storageBucket || '').trim(),
  messagingSenderId: (env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigData?.messagingSenderId || '').trim(),
  appId: (env.VITE_FIREBASE_APP_ID || firebaseConfigData?.appId || '').trim(),
  measurementId: (env.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfigData?.measurementId || '').trim(),
};

// ID de base de datos Firestore (soporta bases de datos nombradas o la predeterminada '(default)')
export const firestoreDatabaseId: string =
  (
    env.VITE_FIREBASE_DATABASE_ID ||
    env.VITE_FIREBASE_FIRESTORE_DATABASE_ID ||
    firebaseConfigData?.firestoreDatabaseId ||
    '(default)'
  ).trim();

// Inicialización de la aplicación Firebase (Singleton SDK v10+)
export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Inicialización de Firestore
export const db: Firestore =
  firestoreDatabaseId && firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firestoreDatabaseId)
    : getFirestore(app);

// Inicialización de Firebase Authentication
export const auth: Auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Diagnóstico explícito en consola para despliegues en Vercel
if (typeof window !== 'undefined') {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error(
      '❌ [Firebase Configuration Error]: Variables de entorno faltantes en Vercel.\n' +
      'Por favor configura en el panel de Vercel (Project Settings -> Environment Variables):\n' +
      '  • VITE_FIREBASE_API_KEY\n' +
      '  • VITE_FIREBASE_AUTH_DOMAIN\n' +
      '  • VITE_FIREBASE_PROJECT_ID\n' +
      '  • VITE_FIREBASE_STORAGE_BUCKET\n' +
      '  • VITE_FIREBASE_MESSAGING_SENDER_ID\n' +
      '  • VITE_FIREBASE_APP_ID\n' +
      '  • VITE_FIREBASE_DATABASE_ID'
    );
  } else {
    console.info(
      `✅ [Firebase v10+ Inicializado]: Proyecto "${firebaseConfig.projectId}" | Base de datos: "${firestoreDatabaseId}"`
    );
  }
}

export default app;
