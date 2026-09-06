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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errCode = (error as { code?: string })?.code || 'unknown';
  
  console.error(`❌ [Firestore Connection/Data Error] [Op: ${operationType}] [Path: ${path || 'unknown'}]:`, {
    code: errCode,
    message: errMsg,
    authenticatedUser: auth.currentUser ? `${auth.currentUser.email} (${auth.currentUser.uid})` : 'Unauthenticated',
    timestamp: new Date().toISOString(),
  });

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

// User Profile Services
export const saveUserProfileToFirestore = async (profile: AppUserProfile): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, profile.uid);
    const cleaned = cleanForFirestore(profile);
    await setDoc(userRef, cleaned, { merge: true });
  } catch (error) {
    console.error(`❌ [Firestore Error] Falló el guardado del perfil de usuario (${profile.uid}):`, error);
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
    console.error(`❌ [Firestore Error] Falló la lectura del perfil de usuario (${uid}):`, error);
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
      console.error(`❌ [Firestore Connection Error] Error al suscribirse al perfil de usuario (${uid}):`, error);
      if (onError) onError(error);
    }
  );
};

// Subscribe to Employees
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

// Subscribe to Schedules
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

// Subscribe to Zone Novedades
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

// Subscribe to Client Reports
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

// Subscribe to Driver Attendance Records
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

// Subscribe to Periods
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

// Subscribe to Company Settings
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
      console.error('❌ [Firestore Connection Error] Error al leer configuración de empresa en "settings/company":', error);
      if (onError) onError(error);
    }
  );
};

// Subscribe to Clients (Directorio de Clientes de SERGEM S.A.S.)
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

// Save operations
export const saveClientToFirestore = async (client: CompanyClient): Promise<void> => {
  try {
    const cleaned = cleanForFirestore(client);
    await setDoc(doc(db, CLIENTS_COLLECTION, client.id), cleaned, { merge: true });
  } catch (err) {
    console.error(`❌ [Firestore Write Error] No se pudo guardar el cliente (${client.id}) en Firestore:`, err);
    throw err;
  }
};

export const deleteClientFromFirestore = async (clientId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, CLIENTS_COLLECTION, clientId));
  } catch (err) {
    console.error(`❌ [Firestore Delete Error] No se pudo eliminar el cliente (${clientId}) de Firestore:`, err);
    throw err;
  }
};

export const saveEmployeeToFirestore = async (emp: Employee): Promise<void> => {
  try {
    const cleaned = cleanForFirestore(emp);
    await setDoc(doc(db, EMPLOYEES_COLLECTION, emp.id), cleaned, { merge: true });
  } catch (err) {
    console.error(`❌ [Firestore Write Error] No se pudo guardar el empleado (${emp.id}) en Firestore:`, err);
    throw err;
  }
};

export const deleteEmployeeFromFirestore = async (empId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, EMPLOYEES_COLLECTION, empId));
  } catch (err) {
    console.error(`❌ [Firestore Write Error] No se pudo eliminar el empleado (${empId}) de Firestore:`, err);
    throw err;
  }
};

export const saveScheduleToFirestore = async (schedule: WeeklySchedule): Promise<void> => {
  try {
    const cleaned = cleanForFirestore(schedule);
    await setDoc(doc(db, SCHEDULES_COLLECTION, schedule.id), cleaned, { merge: true });
  } catch (err) {
    console.error(`❌ [Firestore Write Error] No se pudo guardar el horario (${schedule.id}) en Firestore:`, err);
    throw err;
  }
};

export const saveZoneNovedadToFirestore = async (novedad: ZoneChiefNovedad): Promise<void> => {
  try {
    const cleaned = cleanForFirestore(novedad);
    await setDoc(doc(db, NOVEDADES_COLLECTION, novedad.id), cleaned, { merge: true });
  } catch (err) {
    console.error(`❌ [Firestore Write Error] No se pudo guardar la novedad (${novedad.id}) en Firestore:`, err);
    throw err;
  }
};

export const saveClientReportToFirestore = async (report: ClientOrderReport): Promise<void> => {
  try {
    const cleaned = cleanForFirestore(report);
    await setDoc(doc(db, CLIENT_REPORTS_COLLECTION, report.id), cleaned, { merge: true });
  } catch (err) {
    console.error(`❌ [Firestore Write Error] No se pudo guardar el reporte de cliente (${report.id}) en Firestore:`, err);
    throw err;
  }
};

export const saveDriverAttendanceToFirestore = async (attendance: DriverAttendanceRecord): Promise<void> => {
  try {
    const cleaned = cleanForFirestore(attendance);
    await setDoc(doc(db, DRIVER_ATTENDANCE_COLLECTION, attendance.id), cleaned, { merge: true });
  } catch (err) {
    console.error(`❌ [Firestore Write Error] No se pudo guardar la asistencia del repartidor (${attendance.id}) en Firestore:`, err);
    throw err;
  }
};

export const savePeriodToFirestore = async (period: PayrollPeriod): Promise<void> => {
  try {
    const cleaned = cleanForFirestore(period);
    await setDoc(doc(db, PERIODS_COLLECTION, period.id), cleaned, { merge: true });
  } catch (err) {
    console.error(`❌ [Firestore Write Error] No se pudo guardar el periodo (${period.id}) en Firestore:`, err);
    throw err;
  }
};

export const saveCompanySettingsToFirestore = async (settings: CompanySettings): Promise<void> => {
  try {
    const cleaned = cleanForFirestore(settings);
    await setDoc(doc(db, SETTINGS_COLLECTION, 'company'), cleaned, { merge: true });
  } catch (err) {
    console.error('❌ [Firestore Write Error] No se pudo guardar la configuración de empresa en Firestore:', err);
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
    console.error(`❌ [Firestore Write Error] No se pudieron guardar las novedades del periodo (${periodId}) en Firestore:`, err);
    throw err;
  }
};

// Seed initial dataset to Firestore if currently empty
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
      console.log('Firestore already contains data, skipping seed.');
      return false;
    }

    console.log('Seeding initial data to Firestore...');
    const batch = writeBatch(db);

    // Employees
    data.employees.forEach((emp) => {
      const ref = doc(db, EMPLOYEES_COLLECTION, emp.id);
      batch.set(ref, cleanForFirestore(emp));
    });

    // Schedules
    data.schedules.forEach((sch) => {
      const ref = doc(db, SCHEDULES_COLLECTION, sch.id);
      batch.set(ref, cleanForFirestore(sch));
    });

    // Zone novedades
    data.zoneNovedades.forEach((nov) => {
      const ref = doc(db, NOVEDADES_COLLECTION, nov.id);
      batch.set(ref, cleanForFirestore(nov));
    });

    // Client reports
    data.clientReports.forEach((rep) => {
      const ref = doc(db, CLIENT_REPORTS_COLLECTION, rep.id);
      batch.set(ref, cleanForFirestore(rep));
    });

    // Periods
    data.periods.forEach((per) => {
      const ref = doc(db, PERIODS_COLLECTION, per.id);
      batch.set(ref, cleanForFirestore(per));
    });

    // Settings
    const settingsRef = doc(db, SETTINGS_COLLECTION, 'company');
    batch.set(settingsRef, cleanForFirestore(data.company));

    // Initial period novedades
    if (data.periods[0]) {
      const novMapRef = doc(db, NOVEDADES_MAP_COLLECTION, data.periods[0].id);
      batch.set(novMapRef, cleanForFirestore({ map: data.novedadesMap }));
    }

    await batch.commit();
    console.log('Initial data successfully seeded to Firestore.');
    return true;
  } catch (error) {
    console.error('Error seeding initial data to Firestore:', error);
    return false;
  }
};

/**
 * Completely empties all operational collections in Firestore:
 * employees, schedules, zoneNovedades, clientReports, periodNovedades, periods.
 */
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
    console.log(`🧹 Firestore limpiado con éxito. Se eliminaron ${deletedCount} documentos.`);
    return { success: true, deletedCount };
  } catch (err) {
    console.error('❌ Error al vaciar Firestore:', err);
    throw err;
  }
};

