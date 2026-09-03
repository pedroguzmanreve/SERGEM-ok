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
  AppUserProfile
} from '../types/payroll';

// Collections References
const USERS_COLLECTION = 'users';
const EMPLOYEES_COLLECTION = 'employees';
const SCHEDULES_COLLECTION = 'schedules';
const NOVEDADES_COLLECTION = 'zoneNovedades';
const CLIENT_REPORTS_COLLECTION = 'clientReports';
const PERIODS_COLLECTION = 'periods';
const SETTINGS_COLLECTION = 'settings';
const NOVEDADES_MAP_COLLECTION = 'periodNovedades';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
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
    await setDoc(userRef, profile, { merge: true });
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
      if (list.length > 0) {
        onData(list);
      }
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
      if (list.length > 0) {
        onData(list);
      }
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
      if (list.length > 0) {
        onData(list);
      }
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
      if (list.length > 0) {
        onData(list);
      }
    },
    (error) => {
      console.error('❌ [Firestore Connection Error] Error al leer la colección "clientReports":', error);
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
      if (list.length > 0) {
        onData(list);
      }
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

// Save operations
export const saveEmployeeToFirestore = async (emp: Employee): Promise<void> => {
  try {
    await setDoc(doc(db, EMPLOYEES_COLLECTION, emp.id), emp, { merge: true });
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
    await setDoc(doc(db, SCHEDULES_COLLECTION, schedule.id), schedule, { merge: true });
  } catch (err) {
    console.error(`❌ [Firestore Write Error] No se pudo guardar el horario (${schedule.id}) en Firestore:`, err);
    throw err;
  }
};

export const saveZoneNovedadToFirestore = async (novedad: ZoneChiefNovedad): Promise<void> => {
  try {
    await setDoc(doc(db, NOVEDADES_COLLECTION, novedad.id), novedad, { merge: true });
  } catch (err) {
    console.error(`❌ [Firestore Write Error] No se pudo guardar la novedad (${novedad.id}) en Firestore:`, err);
    throw err;
  }
};

export const saveClientReportToFirestore = async (report: ClientOrderReport): Promise<void> => {
  try {
    await setDoc(doc(db, CLIENT_REPORTS_COLLECTION, report.id), report, { merge: true });
  } catch (err) {
    console.error(`❌ [Firestore Write Error] No se pudo guardar el reporte de cliente (${report.id}) en Firestore:`, err);
    throw err;
  }
};

export const savePeriodToFirestore = async (period: PayrollPeriod): Promise<void> => {
  try {
    await setDoc(doc(db, PERIODS_COLLECTION, period.id), period, { merge: true });
  } catch (err) {
    console.error(`❌ [Firestore Write Error] No se pudo guardar el periodo (${period.id}) en Firestore:`, err);
    throw err;
  }
};

export const saveCompanySettingsToFirestore = async (settings: CompanySettings): Promise<void> => {
  try {
    await setDoc(doc(db, SETTINGS_COLLECTION, 'company'), settings, { merge: true });
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
    await setDoc(doc(db, NOVEDADES_MAP_COLLECTION, periodId), { map: novedadesMap }, { merge: true });
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
      batch.set(ref, emp);
    });

    // Schedules
    data.schedules.forEach((sch) => {
      const ref = doc(db, SCHEDULES_COLLECTION, sch.id);
      batch.set(ref, sch);
    });

    // Zone novedades
    data.zoneNovedades.forEach((nov) => {
      const ref = doc(db, NOVEDADES_COLLECTION, nov.id);
      batch.set(ref, nov);
    });

    // Client reports
    data.clientReports.forEach((rep) => {
      const ref = doc(db, CLIENT_REPORTS_COLLECTION, rep.id);
      batch.set(ref, rep);
    });

    // Periods
    data.periods.forEach((per) => {
      const ref = doc(db, PERIODS_COLLECTION, per.id);
      batch.set(ref, per);
    });

    // Settings
    const settingsRef = doc(db, SETTINGS_COLLECTION, 'company');
    batch.set(settingsRef, data.company);

    // Initial period novedades
    if (data.periods[0]) {
      const novMapRef = doc(db, NOVEDADES_MAP_COLLECTION, data.periods[0].id);
      batch.set(novMapRef, { map: data.novedadesMap });
    }

    await batch.commit();
    console.log('Initial data successfully seeded to Firestore.');
    return true;
  } catch (error) {
    console.error('Error seeding initial data to Firestore:', error);
    return false;
  }
};
