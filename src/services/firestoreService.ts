import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import {
  Employee,
  WeeklySchedule,
  ZoneChiefNovedad,
  ClientOrderReport,
  PayrollPeriod,
  CompanySettings,
  EmployeeNovedades,
  AppUserProfile,
  DriverAttendanceRecord,
  CompanyClient
} from '../types/payroll';

// Collections References
const USERS_COLLECTION = 'users';
const EMPLOYEES_COLLECTION = 'employees';
const SCHEDULES_COLLECTION = 'schedules';
const NOVEDADES_COLLECTION = 'zoneNovedades';
const CLIENT_REPORTS_COLLECTION = 'clientReports';
const DRIVER_ATTENDANCE_COLLECTION = 'driverAttendance';
const PERIODS_COLLECTION = 'periods';
const SETTINGS_COLLECTION = 'settings';
const NOVEDADES_MAP_COLLECTION = 'periodNovedades';
const CLIENTS_COLLECTION = 'clients';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

/**
 * Recursively removes all undefined fields from an object or array.
 * Firestore throws a runtime error if any field is undefined.
 */
export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => cleanForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = cleanForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

/**
 * Registra detalladamente en consola (console.error) cualquier error de conexión o consulta con Firestore.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errCode = (error as { code?: string })?.code || 'unknown';

  let consejoResolucion = 'Verifica la consola para más detalles.';
  if (errCode === 'permission-denied') {
    consejoResolucion = 'Permiso denegado. Revisa las reglas de seguridad en firestore.rules o el estado de autenticación del usuario.';
  } else if (errCode === 'unavailable' || errMsg.includes('offline') || errMsg.includes('network')) {
    consejoResolucion = 'No se pudo contactar el servidor de Firestore. Revisa tu conexión a internet o el proyecto configurado en Vercel.';
  } else if (errCode === 'not-found') {
    consejoResolucion = 'El documento o la base de datos de Firestore no fue encontrada. Revisa la variable VITE_FIREBASE_DATABASE_ID.';
  }

  console.error(
    `🚨 [Firestore Error de Conexión / Operación]:\n` +
    `  • Operación: ${operationType.toUpperCase()}\n` +
    `  • Ruta: ${path || 'desconocida'}\n` +
    `  • Código: ${errCode}\n` +
    `  • Mensaje: ${errMsg}\n` +
    `  • Diagnóstico: ${consejoResolucion}\n` +
    `  • Usuario actual: ${auth.currentUser ? `${auth.currentUser.email} (${auth.currentUser.uid})` : 'No autenticado'}\n` +
    `  • Hora: ${new Date().toLocaleString()}`
  );

  const errInfo = {
    error: errMsg,
    code: errCode,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Verifica la conectividad con Firestore realizando una lectura de diagnóstico.
 */
export const testFirestoreConnection = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const testDoc = await getDoc(doc(db, SETTINGS_COLLECTION, 'company'));
    console.info('✅ [Firestore Connection Test]: Conexión exitosa a Firestore.');
    return { success: true, message: 'Conexión exitosa a Firestore.' };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('❌ [Firestore Connection Test Falló]: No se pudo conectar a la base de datos:', error);
    return { success: false, message: msg };
  }
};

// ==============================================================================
// 1. PERFIL DE USUARIO
// ==============================================================================

export const saveUserProfileToFirestore = async (profile: AppUserProfile): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, profile.uid);
    const cleaned = cleanForFirestore(profile);
    await setDoc(userRef, cleaned, { merge: true });
  } catch (error) {
    console.error(`❌ [Firestore Write Error] No se pudo guardar el perfil de usuario "${profile.uid}":`, error);
    handleFirestoreError(error, OperationType.WRITE, `${USERS_COLLECTION}/${profile.uid}`);
  }
};

export const getUserProfileFromFirestore = async (uid: string): Promise<AppUserProfile | null> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as AppUserProfile;
    }
    return null;
  } catch (error) {
    console.error(`❌ [Firestore Read Error] No se pudo obtener el perfil de usuario "${uid}":`, error);
    handleFirestoreError(error, OperationType.GET, `${USERS_COLLECTION}/${uid}`);
    return null;
  }
};

export const subscribeUserProfile = (
  uid: string,
  onData: (profile: AppUserProfile | null) => void,
  onError?: (err: Error) => void
) => {
  const userRef = doc(db, USERS_COLLECTION, uid);
  return onSnapshot(
    userRef,
    (snap) => {
      if (snap.exists()) {
        onData(snap.data() as AppUserProfile);
      } else {
        onData(null);
      }
    },
    (error) => {
      console.error(`❌ [Firestore Connection Error] Error al suscribirse al perfil de usuario en "${USERS_COLLECTION}/${uid}":`, error);
      if (onError) onError(error);
    }
  );
};

// ==============================================================================
// 2. SUSCRIPCIONES EN TIEMPO REAL (LECTURAS CONTINUAS)
// ==============================================================================

// Suscripción a Empleados
export const subscribeEmployees = (onData: (data: Employee[]) => void, onError?: (err: Error) => void) => {
  const colRef = collection(db, EMPLOYEES_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: Employee[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as Employee);
      });
      onData(list);
    },
    (error) => {
      console.error('❌ [Firestore Connection Error] Error al leer la colección "employees":', error);
      if (onError) onError(error);
    }
  );
};

// Suscripción a Horarios Semanales
export const subscribeSchedules = (onData: (data: WeeklySchedule[]) => void, onError?: (err: Error) => void) => {
  const colRef = collection(db, SCHEDULES_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: WeeklySchedule[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as WeeklySchedule);
      });
      onData(list);
    },
    (error) => {
      console.error('❌ [Firestore Connection Error] Error al leer la colección "schedules":', error);
      if (onError) onError(error);
    }
  );
};

// Suscripción a Novedades de Jefe de Zona
export const subscribeZoneNovedades = (onData: (data: ZoneChiefNovedad[]) => void, onError?: (err: Error) => void) => {
  const colRef = collection(db, NOVEDADES_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: ZoneChiefNovedad[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as ZoneChiefNovedad);
      });
      onData(list);
    },
    (error) => {
      console.error('❌ [Firestore Connection Error] Error al leer la colección "zoneNovedades":', error);
      if (onError) onError(error);
    }
  );
};

// Suscripción a Reportes de Clientes
export const subscribeClientReports = (onData: (data: ClientOrderReport[]) => void, onError?: (err: Error) => void) => {
  const colRef = collection(db, CLIENT_REPORTS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: ClientOrderReport[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as ClientOrderReport);
      });
      onData(list);
    },
    (error) => {
      console.error('❌ [Firestore Connection Error] Error al leer la colección "clientReports":', error);
      if (onError) onError(error);
    }
  );
};

// Suscripción al Registro de Asistencia de Repartidores
export const subscribeDriverAttendance = (
  onData: (data: DriverAttendanceRecord[]) => void,
  onError?: (err: Error) => void
) => {
  const colRef = collection(db, DRIVER_ATTENDANCE_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: DriverAttendanceRecord[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as DriverAttendanceRecord);
      });
      onData(list);
    },
    (error) => {
      console.error('❌ [Firestore Connection Error] Error al leer la colección "driverAttendance":', error);
      if (onError) onError(error);
    }
  );
};

// Suscripción a Periodos de Nómina
export const subscribePeriods = (onData: (data: PayrollPeriod[]) => void, onError?: (err: Error) => void) => {
  const colRef = collection(db, PERIODS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: PayrollPeriod[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as PayrollPeriod);
      });
      onData(list);
    },
    (error) => {
      console.error('❌ [Firestore Connection Error] Error al leer la colección "periods":', error);
      if (onError) onError(error);
    }
  );
};

// Suscripción a Configuración General de la Empresa
export const subscribeCompanySettings = (onData: (data: CompanySettings) => void, onError?: (err: Error) => void) => {
  const docRef = doc(db, SETTINGS_COLLECTION, 'company');
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onData(snapshot.data() as CompanySettings);
      }
    },
    (error) => {
      console.error('❌ [Firestore Connection Error] Error al leer configuración en "settings/company":', error);
      if (onError) onError(error);
    }
  );
};

// Suscripción a Clientes Corporativos (Directorio SERGEM S.A.S.)
export const subscribeClients = (onData: (data: CompanyClient[]) => void, onError?: (err: Error) => void) => {
  const colRef = collection(db, CLIENTS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: CompanyClient[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as CompanyClient);
      });
      onData(list);
    },
    (error) => {
      console.error('❌ [Firestore Connection Error] Error al leer la colección "clients":', error);
      if (onError) onError(error);
    }
  );
};

// ==============================================================================
// 3. FUNCIONES DE GUARDADO Y ESCRITURA (MANEJO DE ERRORES EXPLÍCITO)
// ==============================================================================

export const saveClientToFirestore = async (client: CompanyClient): Promise<void> => {
  try {
    const cleaned = cleanForFirestore(client);
    await setDoc(doc(db, CLIENTS_COLLECTION, client.id), cleaned, { merge: true });
  } catch (err) {
    console.error(`❌ [Firestore Write Error] Falló el guardado del cliente "${client.id}" en Firestore:`, err);
    throw err;
  }
};

export const deleteClientFromFirestore = async (clientId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, CLIENTS_COLLECTION, clientId));
  } catch (err) {
    console.error(`❌ [Firestore Delete Error] Falló la eliminación del cliente "${clientId}" de Firestore:`, err);
    throw err;
  }
};

export const saveEmployeeToFirestore = async (emp: Employee): Promise<void> => {
  try {
    const cleaned = cleanForFirestore(emp);
    await setDoc(doc(db, EMPLOYEES_COLLECTION, emp.id), cleaned, { merge: true });
  } catch (err) {
    console.error(`❌ [Firestore Write Error] Falló el guardado del empleado "${emp.id}" en Firestore:`, err);
    throw err;
  }
};

export const deleteEmployeeFromFirestore = async (empId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, EMPLOYEES_COLLECTION, empId));
  } catch (err) {
    console.error(`❌ [Firestore Delete Error] Falló la eliminación del empleado "${empId}" de Firestore:`, err);
    throw err;
  }
};

export const saveScheduleToFirestore = async (schedule: WeeklySchedule): Promise<void> => {
  try {
    const cleaned = cleanForFirestore(schedule);
    await setDoc(doc(db, SCHEDULES_COLLECTION, schedule.id), cleaned, { merge: true });
  } catch (err) {
    console.error(`❌ [Firestore Write Error] Falló el guardado del horario semanal "${schedule.id}" en Firestore:`, err);
    throw err;
  }
};

export const saveZoneNovedadToFirestore = async (novedad: ZoneChiefNovedad): Promise<void> => {
  try {
    const cleaned = cleanForFirestore(novedad);
    await setDoc(doc(db, NOVEDADES_COLLECTION, novedad.id), cleaned, { merge: true });
  } catch (err) {
    console.error(`❌ [Firestore Write Error] Falló el guardado de la novedad "${novedad.id}" en Firestore:`, err);
    throw err;
  }
};

export const saveClientReportToFirestore = async (report: ClientOrderReport): Promise<void> => {
  try {
    const cleaned = cleanForFirestore(report);
    await setDoc(doc(db, CLIENT_REPORTS_COLLECTION, report.id), cleaned, { merge: true });
  } catch (err) {
    console.error(`❌ [Firestore Write Error] Falló el guardado del reporte de cliente "${report.id}" en Firestore:`, err);
    throw err;
  }
};

export const saveDriverAttendanceToFirestore = async (attendance: DriverAttendanceRecord): Promise<void> => {
  try {
    const cleaned = cleanForFirestore(attendance);
    await setDoc(doc(db, DRIVER_ATTENDANCE_COLLECTION, attendance.id), cleaned, { merge: true });
  } catch (err) {
    console.error(`❌ [Firestore Write Error] Falló el guardado del registro de asistencia "${attendance.id}" en Firestore:`, err);
    throw err;
  }
};

export const savePeriodToFirestore = async (period: PayrollPeriod): Promise<void> => {
  try {
    const cleaned = cleanForFirestore(period);
    await setDoc(doc(db, PERIODS_COLLECTION, period.id), cleaned, { merge: true });
  } catch (err) {
    console.error(`❌ [Firestore Write Error] Falló el guardado del periodo de nómina "${period.id}" en Firestore:`, err);
    throw err;
  }
};

export const saveCompanySettingsToFirestore = async (settings: CompanySettings): Promise<void> => {
  try {
    const cleaned = cleanForFirestore(settings);
    await setDoc(doc(db, SETTINGS_COLLECTION, 'company'), cleaned, { merge: true });
  } catch (err) {
    console.error('❌ [Firestore Write Error] Falló el guardado de la configuración de empresa en Firestore:', err);
    throw err;
  }
};

export const savePeriodNovedadesToFirestore = async (
  periodId: string,
  novedadesMap: Record<string, EmployeeNovedades>
): Promise<void> => {
  try {
    const cleaned = cleanForFirestore({ map: novedadesMap });
    await setDoc(doc(db, NOVEDADES_MAP_COLLECTION, periodId), cleaned, { merge: true });
  } catch (err) {
    console.error(`❌ [Firestore Write Error] Falló el guardado de novedades del periodo "${periodId}" en Firestore:`, err);
    throw err;
  }
};

// ==============================================================================
// 4. SIEMBRA INICIAL DE DATOS
// ==============================================================================

export const seedInitialDatabase = async (data: {
  employees: Employee[];
  schedules: WeeklySchedule[];
  zoneNovedades: ZoneChiefNovedad[];
  clientReports: ClientOrderReport[];
  periods: PayrollPeriod[];
  company: CompanySettings;
  novedadesMap: Record<string, EmployeeNovedades>;
}): Promise<boolean> => {
  try {
    const empDocs = await getDocs(collection(db, EMPLOYEES_COLLECTION));
    if (!empDocs.empty) {
      console.info('ℹ️ [Firestore Seed]: La base de datos ya contiene registros, se omite la siembra inicial.');
      return false;
    }

    console.info('🌱 [Firestore Seed]: Sembrando datos iniciales en Firestore...');
    const batch = writeBatch(db);

    data.employees.forEach((emp) => {
      const ref = doc(db, EMPLOYEES_COLLECTION, emp.id);
      batch.set(ref, cleanForFirestore(emp));
    });

    data.schedules.forEach((sch) => {
      const ref = doc(db, SCHEDULES_COLLECTION, sch.id);
      batch.set(ref, cleanForFirestore(sch));
    });

    data.zoneNovedades.forEach((nov) => {
      const ref = doc(db, NOVEDADES_COLLECTION, nov.id);
      batch.set(ref, cleanForFirestore(nov));
    });

    data.clientReports.forEach((rep) => {
      const ref = doc(db, CLIENT_REPORTS_COLLECTION, rep.id);
      batch.set(ref, cleanForFirestore(rep));
    });

    data.periods.forEach((per) => {
      const ref = doc(db, PERIODS_COLLECTION, per.id);
      batch.set(ref, cleanForFirestore(per));
    });

    const settingsRef = doc(db, SETTINGS_COLLECTION, 'company');
    batch.set(settingsRef, cleanForFirestore(data.company));

    if (data.periods[0]) {
      const novMapRef = doc(db, NOVEDADES_MAP_COLLECTION, data.periods[0].id);
      batch.set(novMapRef, cleanForFirestore({ map: data.novedadesMap }));
    }

    await batch.commit();
    console.info('✅ [Firestore Seed]: Datos iniciales sembrados exitosamente.');
    return true;
  } catch (error) {
    console.error('❌ [Firestore Write Error] Falló la siembra inicial de datos en Firestore:', error);
    return false;
  }
};

// ==============================================================================
// 5. MANTENIMIENTO Y VACIADO
// ==============================================================================

export const clearAllFirestoreCollections = async (): Promise<{ success: boolean; deletedCount: number }> => {
  const collectionsToClear = [
    EMPLOYEES_COLLECTION,
    SCHEDULES_COLLECTION,
    NOVEDADES_COLLECTION,
    CLIENT_REPORTS_COLLECTION,
    NOVEDADES_MAP_COLLECTION,
    PERIODS_COLLECTION,
    CLIENTS_COLLECTION,
  ];

  let deletedCount = 0;
  try {
    for (const colName of collectionsToClear) {
      const snap = await getDocs(collection(db, colName));
      for (const d of snap.docs) {
        await deleteDoc(doc(db, colName, d.id));
        deletedCount++;
      }
    }
    console.info(`🧹 [Firestore Info]: Colecciones vaciadas. Se eliminaron ${deletedCount} documentos.`);
    return { success: true, deletedCount };
  } catch (err) {
    console.error('❌ [Firestore Delete Error] Error al vaciar las colecciones de Firestore:', err);
    throw err;
  }
};
