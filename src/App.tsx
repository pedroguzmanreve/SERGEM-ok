import React, { useState, useMemo, useEffect } from 'react';
import {
  CompanySettings,
  Employee,
  EmployeeNovedades,
  PayrollCalculationItem,
  PayrollPeriod,
  WeeklySchedule,
  ZoneChiefNovedad,
  ClientOrderReport,
  DriverAttendanceRecord,
  CompanyClient,
  AppRole
} from './types/payroll';
import {
  defaultCompanySettings,
  defaultNovedades
} from './data/initialData';
import {
  subscribeEmployees,
  subscribeSchedules,
  subscribeZoneNovedades,
  subscribeClientReports,
  subscribePeriods,
  subscribeCompanySettings,
  subscribeDriverAttendance,
  subscribeClients,
  saveEmployeeToFirestore,
  saveScheduleToFirestore,
  saveZoneNovedadToFirestore,
  saveClientReportToFirestore,
  savePeriodToFirestore,
  saveCompanySettingsToFirestore,
  savePeriodNovedadesToFirestore,
  saveDriverAttendanceToFirestore,
  saveClientToFirestore,
  deleteClientFromFirestore,
  seedInitialDatabase,
  clearAllFirestoreCollections
} from './services/firestoreService';
import { calculatePayrollItem } from './utils/payrollCalculator';
import { Header } from './components/Header';
import { Navigation, TabType } from './components/Navigation';
import { NovedadesModal } from './components/NovedadesModal';
import { SettingsModal } from './components/SettingsModal';
import { NewPeriodModal } from './components/NewPeriodModal';
import { AdminPortalView } from './components/AdminPortalView';
import { ZoneChiefPortalView } from './components/ZoneChiefPortalView';
import { DriverPortalView } from './components/DriverPortalView';
import { ClientReportsView } from './components/ClientReportsView';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginView } from './components/auth/LoginView';

const defaultPeriodFallback: PayrollPeriod = {
  id: '',
  nombrePeriodo: 'Sin periodo activo',
  fechaInicio: '',
  fechaFin: '',
  tipoPeriodo: 'Quincenal',
  diasBasePeriodo: 15,
  estado: 'Borrador',
  fechaLiquidacion: '',
};

export default function App() {
  // Global Application State (Clean Database ready for real data)
  const [company, setCompany] = useState<CompanySettings>(defaultCompanySettings);
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [activePeriodId, setActivePeriodId] = useState<string>('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [novedadesMap, setNovedadesMap] = useState<Record<string, EmployeeNovedades>>({});

  // States for requested modules (Initialized empty for real data entry)
  const [schedules, setSchedules] = useState<WeeklySchedule[]>([]);
  const [zoneNovedades, setZoneNovedades] = useState<ZoneChiefNovedad[]>([]);
  const [clientReports, setClientReports] = useState<ClientOrderReport[]>([]);
  const [driverAttendance, setDriverAttendance] = useState<DriverAttendanceRecord[]>([]);
  const [clients, setClients] = useState<CompanyClient[]>([]);

  // Firebase status
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Modals & Selection States
  const [editingNovedadesItem, setEditingNovedadesItem] = useState<PayrollCalculationItem | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewPeriodOpen, setIsNewPeriodOpen] = useState(false);

  // Real-time Firestore Subscriptions (Live connection without auto-seeding mock data)
  useEffect(() => {
    let isMounted = true;

    const unsubEmp = subscribeEmployees(
      (data) => {
        if (isMounted) {
          setEmployees(data || []);
          setIsFirebaseConnected(true);
        }
      },
      () => {
        if (isMounted) setIsFirebaseConnected(false);
      }
    );

    const unsubSched = subscribeSchedules((data) => {
      if (isMounted) setSchedules(data || []);
    });

    const unsubNov = subscribeZoneNovedades((data) => {
      if (isMounted) setZoneNovedades(data || []);
    });

    const unsubRep = subscribeClientReports((data) => {
      if (isMounted) setClientReports(data || []);
    });

    const unsubPeriods = subscribePeriods((data) => {
      if (isMounted) {
        setPeriods(data || []);
        if (data && data.length > 0) {
          setActivePeriodId((prev) => (prev && data.some((p) => p.id === prev) ? prev : data[0].id));
        } else {
          setActivePeriodId('');
        }
      }
    });

    const unsubCompany = subscribeCompanySettings((data) => {
      if (isMounted && data) setCompany(data);
    });

    const unsubAttendance = subscribeDriverAttendance((data) => {
      if (isMounted) setDriverAttendance(data || []);
    });

    const unsubClients = subscribeClients((data) => {
      if (isMounted) {
        setClients(data || []);
      }
    });

    return () => {
      isMounted = false;
      unsubEmp();
      unsubSched();
      unsubNov();
      unsubRep();
      unsubPeriods();
      unsubCompany();
      unsubAttendance();
      unsubClients();
    };
  }, []);

  // Active Period Object
  const activePeriod = useMemo<PayrollPeriod>(() => {
    return periods.find((p) => p.id === activePeriodId) || periods[0] || defaultPeriodFallback;
  }, [periods, activePeriodId]);

  // Recalculate Payroll for all active employees whenever state changes
  const calculatedItems = useMemo<PayrollCalculationItem[]>(() => {
    return employees
      .filter((emp) => emp.activo)
      .map((emp) => {
        const empNovedades: EmployeeNovedades = novedadesMap[emp.id] || {
          diasTrabajados: activePeriod.diasBasePeriodo,
          horas: {
            horasExtrasDiurnas: 0,
            horasExtrasNocturnas: 0,
            horasExtrasDominicalesDiurnas: 0,
            horasExtrasDominicalesNocturnas: 0,
            horasRecargoNocturno: 0,
            horasRecargoDominical: 0,
          },
          comisiones: 0,
          bonificacionesConstitutivas: 0,
          bonificacionesNoConstitutivas: 0,
          auxilioNoConstitutivo: 0,
          incapacidadDias: 0,
          incapacidadValor: 0,
          licenciasRemuneradasDias: 0,
          licenciasNoRemuneradasDias: 0,
          prestamosYDeducciones: 0,
          otrasDeducciones: 0,
        };

        return calculatePayrollItem(emp, empNovedades, company, activePeriod.diasBasePeriodo);
      });
  }, [employees, novedadesMap, company, activePeriod]);

  // Handlers
  const handleSaveNovedades = async (employeeId: string, updatedNovedades: EmployeeNovedades) => {
    const updatedMap = {
      ...novedadesMap,
      [employeeId]: updatedNovedades,
    };
    setNovedadesMap(updatedMap);
    setEditingNovedadesItem(null);
    try {
      setIsSyncing(true);
      await savePeriodNovedadesToFirestore(activePeriod.id, updatedMap);
    } catch (e) {
      console.warn('Error saving novedades to Firestore:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddEmployee = async (newEmp: Employee) => {
    setEmployees((prev) => [...prev, newEmp]);
    try {
      setIsSyncing(true);
      await saveEmployeeToFirestore(newEmp);
    } catch (e) {
      console.warn('Error saving employee to Firestore:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateEmployee = async (updatedEmp: Employee) => {
    setEmployees((prev) => prev.map((e) => (e.id === updatedEmp.id ? updatedEmp : e)));
    try {
      setIsSyncing(true);
      await saveEmployeeToFirestore(updatedEmp);
    } catch (e) {
      console.warn('Error updating employee to Firestore:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddPeriod = async (newPeriod: PayrollPeriod) => {
    setPeriods((prev) => [newPeriod, ...prev]);
    setActivePeriodId(newPeriod.id);
    try {
      setIsSyncing(true);
      await savePeriodToFirestore(newPeriod);
    } catch (e) {
      console.warn('Error saving period to Firestore:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Schedule Handlers
  const handleSaveSchedule = async (newSched: WeeklySchedule) => {
    setSchedules((prev) => {
      const existingIdx = prev.findIndex(
        (s) => s.repartidorId === newSched.repartidorId && s.semanaInicio === newSched.semanaInicio
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = newSched;
        return updated;
      }
      return [...prev, newSched];
    });
    try {
      setIsSyncing(true);
      await saveScheduleToFirestore(newSched);
    } catch (e) {
      console.warn('Error saving schedule to Firestore:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteSchedule = (schedId: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== schedId));
  };

  // Zone Novedad Handlers
  const handleAddZoneNovedad = async (nov: ZoneChiefNovedad) => {
    setZoneNovedades((prev) => [nov, ...prev]);
    try {
      setIsSyncing(true);
      await saveZoneNovedadToFirestore(nov);
    } catch (e) {
      console.warn('Error saving zone novedad to Firestore:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteZoneNovedad = (novId: string) => {
    setZoneNovedades((prev) => prev.filter((n) => n.id !== novId));
  };

  // Client Report Handlers
  const handleAddClientReport = async (rep: ClientOrderReport) => {
    setClientReports((prev) => [rep, ...prev]);
    try {
      setIsSyncing(true);
      await saveClientReportToFirestore(rep);
    } catch (e) {
      console.warn('Error saving client report to Firestore:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteClientReport = (repId: string) => {
    setClientReports((prev) => prev.filter((r) => r.id !== repId));
  };

  const handleRecordAttendance = async (record: DriverAttendanceRecord) => {
    setDriverAttendance((prev) => {
      const idx = prev.findIndex((a) => a.id === record.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = record;
        return copy;
      }
      return [record, ...prev];
    });
    try {
      setIsSyncing(true);
      await saveDriverAttendanceToFirestore(record);
    } catch (e) {
      console.warn('Error saving attendance record to Firestore:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveCompanySettings = async (newSettings: CompanySettings) => {
    setCompany(newSettings);
    try {
      setIsSyncing(true);
      await saveCompanySettingsToFirestore(newSettings);
    } catch (e) {
      console.warn('Error saving company settings to Firestore:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveClient = async (client: CompanyClient) => {
    setIsSyncing(true);
    try {
      await saveClientToFirestore(client);
      setClients((prev) => {
        const idx = prev.findIndex((c) => c.id === client.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = client;
          return copy;
        }
        return [client, ...prev];
      });
    } catch (e) {
      console.warn('Error saving client to Firestore:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    setIsSyncing(true);
    try {
      await deleteClientFromFirestore(clientId);
      setClients((prev) => prev.filter((c) => c.id !== clientId));
    } catch (e) {
      console.warn('Error deleting client from Firestore:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleWipeEntireDatabase = async () => {
    try {
      setIsSyncing(true);
      await clearAllFirestoreCollections();
      setEmployees([]);
      setSchedules([]);
      setZoneNovedades([]);
      setClientReports([]);
      setDriverAttendance([]);
      setClients([]);
      setNovedadesMap({});
    } catch (e) {
      console.warn('Error clearing entire database:', e);
      throw e;
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <AuthProvider employees={employees}>
      <AppContent
        company={company}
        periods={periods}
        activePeriodId={activePeriodId}
        setActivePeriodId={setActivePeriodId}
        employees={employees}
        schedules={schedules}
        zoneNovedades={zoneNovedades}
        clientReports={clientReports}
        driverAttendance={driverAttendance}
        clients={clients}
        handleRecordAttendance={handleRecordAttendance}
        isFirebaseConnected={isFirebaseConnected}
        isSyncing={isSyncing}
        editingNovedadesItem={editingNovedadesItem}
        setEditingNovedadesItem={setEditingNovedadesItem}
        isSettingsOpen={isSettingsOpen}
        setIsSettingsOpen={setIsSettingsOpen}
        isNewPeriodOpen={isNewPeriodOpen}
        setIsNewPeriodOpen={setIsNewPeriodOpen}
        handleAddEmployee={handleAddEmployee}
        handleUpdateEmployee={handleUpdateEmployee}
        handleSaveSchedule={handleSaveSchedule}
        handleDeleteSchedule={handleDeleteSchedule}
        handleAddZoneNovedad={handleAddZoneNovedad}
        handleDeleteZoneNovedad={handleDeleteZoneNovedad}
        handleAddClientReport={handleAddClientReport}
        handleDeleteClientReport={handleDeleteClientReport}
        handleSaveClient={handleSaveClient}
        handleDeleteClient={handleDeleteClient}
        handleSaveCompanySettings={handleSaveCompanySettings}
        handleAddPeriod={handleAddPeriod}
        handleSaveNovedades={handleSaveNovedades}
        handleWipeEntireDatabase={handleWipeEntireDatabase}
      />
    </AuthProvider>
  );
}

interface AppContentProps {
  company: CompanySettings;
  periods: PayrollPeriod[];
  activePeriodId: string;
  setActivePeriodId: (id: string) => void;
  employees: Employee[];
  schedules: WeeklySchedule[];
  zoneNovedades: ZoneChiefNovedad[];
  clientReports: ClientOrderReport[];
  driverAttendance: DriverAttendanceRecord[];
  clients: CompanyClient[];
  handleRecordAttendance: (record: DriverAttendanceRecord) => void;
  isFirebaseConnected: boolean;
  isSyncing: boolean;
  editingNovedadesItem: PayrollCalculationItem | null;
  setEditingNovedadesItem: (item: PayrollCalculationItem | null) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  isNewPeriodOpen: boolean;
  setIsNewPeriodOpen: (open: boolean) => void;
  handleAddEmployee: (emp: Employee) => void;
  handleUpdateEmployee: (emp: Employee) => void;
  handleSaveSchedule: (sched: WeeklySchedule) => void;
  handleDeleteSchedule: (id: string) => void;
  handleAddZoneNovedad: (nov: ZoneChiefNovedad) => void;
  handleDeleteZoneNovedad: (id: string) => void;
  handleAddClientReport: (rep: ClientOrderReport) => void;
  handleDeleteClientReport: (id: string) => void;
  handleSaveClient: (client: CompanyClient) => Promise<void>;
  handleDeleteClient: (clientId: string) => Promise<void>;
  handleSaveCompanySettings: (settings: CompanySettings) => void;
  handleAddPeriod: (period: PayrollPeriod) => void;
  handleSaveNovedades: (empId: string, novs: EmployeeNovedades) => void;
  handleWipeEntireDatabase: () => Promise<void>;
}

function AppContent({
  company,
  periods,
  activePeriodId,
  setActivePeriodId,
  employees,
  schedules,
  zoneNovedades,
  clientReports,
  driverAttendance,
  clients,
  handleRecordAttendance,
  isFirebaseConnected,
  isSyncing,
  editingNovedadesItem,
  setEditingNovedadesItem,
  isSettingsOpen,
  setIsSettingsOpen,
  isNewPeriodOpen,
  setIsNewPeriodOpen,
  handleAddEmployee,
  handleUpdateEmployee,
  handleSaveSchedule,
  handleDeleteSchedule,
  handleAddZoneNovedad,
  handleDeleteZoneNovedad,
  handleAddClientReport,
  handleDeleteClientReport,
  handleSaveClient,
  handleDeleteClient,
  handleSaveCompanySettings,
  handleAddPeriod,
  handleSaveNovedades,
  handleWipeEntireDatabase,
}: AppContentProps) {
  const { currentUser, userProfile, currentRole, loading } = useAuth();
  
  // Detect invitation parameters from URL (e.g. sent via Email, WhatsApp, or copied link)
  const inviteParams = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const portal = params.get('portal');
    const role = params.get('role');
    const email = params.get('invite_email');
    const empId = params.get('emp_id');
    const empName = params.get('emp_name');
    const token = params.get('token');

    if (!portal && !role && !email && !empId && !token) return null;

    let targetPortal: TabType = 'admin-portal';
    let targetRole: AppRole = 'Administrativo';

    if (portal === 'driver-portal' || role === 'Repartidor') {
      targetPortal = 'driver-portal';
      targetRole = 'Repartidor';
    } else if (
      portal === 'zone-chief' || 
      role === 'Jefe de Zona' || 
      role === 'Jefe de Operaciones' ||
      role === 'Jefe Inmediato' ||
      role === 'Coordinador'
    ) {
      targetPortal = 'zone-chief';
      targetRole = 'Jefe de Zona';
    } else if (portal === 'client-report') {
      targetPortal = 'client-report';
      targetRole = 'Administrativo';
    } else {
      targetPortal = 'admin-portal';
      targetRole = 'Administrativo';
    }

    const portalDisplayName =
      targetPortal === 'driver-portal'
        ? 'Portal del Repartidor'
        : targetPortal === 'zone-chief'
        ? 'Portal de Jefe de Zona'
        : targetPortal === 'client-report'
        ? 'Reporte Clientes'
        : 'Portal de Administración';

    return {
      portal: targetPortal,
      role: role || targetRole,
      targetRole,
      email: email || '',
      empId: empId || '',
      empName: empName || '',
      token: token || '',
      portalDisplayName,
    };
  }, []);

  // Set initial tab strictly based on URL invitation parameter first, then assigned role
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (inviteParams?.portal) return inviteParams.portal;
    if (currentRole === 'Repartidor') return 'driver-portal';
    if (currentRole === 'Jefe de Zona') return 'zone-chief';
    return 'admin-portal';
  });

  const activePeriod = useMemo(() => {
    return periods.find((p) => p.id === activePeriodId) || periods[0];
  }, [periods, activePeriodId]);

  // Adjust active tab immediately when user role changes or when URL invitation link is detected
  useEffect(() => {
    if (inviteParams?.portal) {
      setActiveTab(inviteParams.portal);
      return;
    }
    if (currentRole === 'Repartidor') {
      setActiveTab('driver-portal');
    } else if (currentRole === 'Jefe de Zona') {
      setActiveTab('zone-chief');
    } else if (currentRole === 'Administrativo') {
      setActiveTab((prev) => prev || 'admin-portal');
    }
  }, [currentRole, inviteParams]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-200 font-bold text-sm">Verificando sesión en Firebase...</p>
          <p className="text-slate-400 text-xs mt-1">SERGEM S.A.S. • Seguridad & Control de Roles</p>
        </div>
      </div>
    );
  }

  // Not authenticated: Show Login & Role Selection view
  if (!userProfile && !currentUser) {
    return <LoginView employees={employees} />;
  }

  return (
    <div id="app-root" className="min-h-screen bg-slate-100 text-slate-900 font-sans antialiased flex flex-col">
      
      {/* App Header */}
      <Header
        company={company}
        activePeriod={activePeriod}
        periods={periods}
        employees={employees}
        schedules={schedules}
        attendanceRecords={driverAttendance}
        clientReports={clientReports}
        firebaseConnected={isFirebaseConnected}
        isSyncing={isSyncing}
        onSelectPeriod={setActivePeriodId}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onNewPeriod={() => setIsNewPeriodOpen(true)}
        onNavigateToPortal={(portal) => setActiveTab(portal)}
      />

      {/* App Navigation with role-filtered tabs */}
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        employeeCount={employees.filter((e) => e.activo).length}
        currentRole={currentRole}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Special Invitation Context Banner */}
        {inviteParams && (
          <div className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 border border-blue-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3 text-xs sm:text-sm text-slate-800">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse shrink-0" />
              <div>
                <p className="font-bold text-slate-900">
                  Acceso mediante enlace de invitación: Rol {inviteParams.role}
                </p>
                <p className="text-slate-600 text-xs mt-0.5">
                  Redirigido directamente al <strong className="text-blue-700">{inviteParams.portalDisplayName}</strong>
                  {inviteParams.empName ? ` asignado a ${inviteParams.empName}` : ''}.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-xs">
                {inviteParams.portalDisplayName}
              </span>
            </div>
          </div>
        )}

        {/* Modulo 1: Portal Administración */}
        {activeTab === 'admin-portal' && currentRole === 'Administrativo' && (
          <AdminPortalView
            employees={employees}
            schedules={schedules}
            attendanceRecords={driverAttendance}
            clientReports={clientReports}
            onAddEmployee={handleAddEmployee}
            onUpdateEmployee={handleUpdateEmployee}
          />
        )}

        {/* Modulo 2: Portal Jefe de Zona */}
        {activeTab === 'zone-chief' && (currentRole === 'Jefe de Zona' || inviteParams?.targetRole === 'Jefe de Zona') && (
          <ZoneChiefPortalView
            employees={employees}
            schedules={schedules}
            novedades={zoneNovedades}
            attendanceRecords={driverAttendance}
            clientReports={clientReports}
            clients={clients}
            onSaveSchedule={handleSaveSchedule}
            onDeleteSchedule={handleDeleteSchedule}
            onAddNovedad={handleAddZoneNovedad}
            onDeleteNovedad={handleDeleteZoneNovedad}
            onRecordAttendance={handleRecordAttendance}
            onAddEmployee={handleAddEmployee}
            currentRole={inviteParams?.targetRole === 'Jefe de Zona' ? 'Jefe de Zona' : currentRole}
            userProfile={userProfile}
          />
        )}

        {/* Modulo Repartidor: Portal Repartidor */}
        {activeTab === 'driver-portal' && (currentRole === 'Repartidor' || inviteParams?.targetRole === 'Repartidor') && (
          <DriverPortalView
            employees={employees}
            schedules={schedules}
            clientReports={clientReports}
            attendanceRecords={driverAttendance}
            onAddClientReport={handleAddClientReport}
            onRecordAttendance={handleRecordAttendance}
            defaultDriverId={inviteParams?.empId || userProfile?.employeeId}
            currentRole={inviteParams?.targetRole === 'Repartidor' ? 'Repartidor' : currentRole}
            userProfile={userProfile}
          />
        )}

        {/* Modulo 3: Portal Clientes & Reportes */}
        {activeTab === 'client-report' && (currentRole === 'Administrativo' || currentRole === 'Jefe de Zona') && (
          <ClientReportsView
            clientReports={clientReports}
            employees={employees}
            schedules={schedules}
            company={company}
            clients={clients}
            onSaveClient={handleSaveClient}
            onDeleteClient={handleDeleteClient}
            onAddClientReport={handleAddClientReport}
            onDeleteClientReport={handleDeleteClientReport}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <p>SERGEM MENSAJERIA S.A.S. • Sistema de Gestión y Reporte de Nómina Electrónica v2026</p>
      </footer>

      {/* Modals */}
      {editingNovedadesItem && (
        <NovedadesModal
          employee={editingNovedadesItem.employee}
          novedades={editingNovedadesItem.novedades}
          onSave={handleSaveNovedades}
          onClose={() => setEditingNovedadesItem(null)}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          company={company}
          onSave={handleSaveCompanySettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {isNewPeriodOpen && (
        <NewPeriodModal
          onAddPeriod={handleAddPeriod}
          onClose={() => setIsNewPeriodOpen(false)}
        />
      )}

    </div>
  );
}

