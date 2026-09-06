import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import config from '../firebase-applet-config.json' with { type: 'json' };

const app = initializeApp({
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
});

const db = getFirestore(app, config.firestoreDatabaseId);

const COLLECTIONS_TO_CLEAR = [
  'employees',
  'schedules',
  'zoneNovedades',
  'clientReports',
  'periodNovedades',
  'users',
];

async function clearCollections() {
  console.log(`🧹 Iniciando limpieza de Firestore en base de datos: ${config.firestoreDatabaseId}`);
  
  for (const colName of COLLECTIONS_TO_CLEAR) {
    try {
      const snap = await getDocs(collection(db, colName));
      console.log(`Colección "${colName}": encontrados ${snap.size} documentos.`);
      for (const d of snap.docs) {
        await deleteDoc(doc(db, colName, d.id));
      }
      console.log(`✅ Colección "${colName}" vaciada completamente.`);
    } catch (err) {
      console.error(`Error al limpiar "${colName}":`, err);
    }
  }

  console.log('✨ Base de datos Firestore limpiada exitosamente y lista para datos reales.');
  process.exit(0);
}

clearCollections();
