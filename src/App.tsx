import React, { useState, useMemo, useEffect } from 'react';
import {
  CompanySettings,
  Employee,
  EmployeeNovedades,
  PayrollCalculationItem,
  PayrollPeriod,
  WeeklySchedule,
  ZoneChiefNovedad,
  ClientOrderReport
} from './types/payroll';
import {
  defaultCompanySettings,
  defaultNovedades,
  initialEmployees,
  initialPeriods,
  initialSchedules,
  initialZoneNovedades,
  initialClientReports
} from './data/initialData';
import {
  subscribeEmployees,
  subscribeSchedules,
  subscribeZoneNovedades,
  subscribeClientReports,
  subscribePeriods,
  subscribeCompanySettings,
  saveEmployeeToFirestore,
  saveScheduleToFirestore,
  saveZoneNovedadToFirestore,
  saveClientReportToFirestore,
  savePeriodToFirestore,
  saveCompanySettingsToFirestore,
  savePeriodNovedadesToFirestore,
  seedInitialDatabase
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

export default function App() {
  // Global Application State
  const [company, setCompany] = useState<CompanySettings>(defaultCompanySettings);
  const [periods, setPeriods] = useState<PayrollPeriod[]>(initialPeriods);
  const [activePeriodId, setActivePeriodId] = useState<string>(initialPeriods[0].id);
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [novedadesMap, setNovedadesMap] = useState<Record<string, EmployeeNovedades>>(defaultNovedades);

  // States for requested modules
  const [schedules, setSchedules] = useState<WeeklySchedule[]>(initialSchedules);
  const [zoneNovedades, setZoneNovedades] = useState<ZoneChiefNovedad[]>(initialZoneNovedades);
  const [clientReports, setClientReports] = useState<ClientOrderReport[]>(initialClientReports);

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>('admin-portal');

  // Firebase status
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Modals & Selection States
  const [editingNovedadesItem, setEditingNovedadesItem] = useState<PayrollCalculationItem | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewPeriodOpen, setIsNewPeriodOpen] = useState(false);

  // Firebase subscriptions & initial seeding
  useEffect(() => {
    let isMounted = true;

    // Seed database if empty with default SERGEM S.A.S. data
    seedInitialDatabase({
      employees: initialEmployees,
      schedules: initialSchedules,
      zoneNovedades: initialZoneNovedades,
      clientReports: initialClientReports,
      periods: initialPeriods,
      company: defaultCompanySettings,
      novedadesMap: defaultNovedades,
    })
      .then(() => {
        if (isMounted) setIsFirebaseConnected(true);
      })
      .catch((err) => {
        console.warn('Firestore initial check/seed:', err);
      });

    // Real-time Firestore Subscriptions
    const unsubEmp = subscribeEmployees(
      (data) => {
        if (data.length > 0) setEmployees(data);
        setIsFirebaseConnected(true);
      },
      () => setIsFirebaseConnected(false)
    );

    const unsubSched = subscribeSchedules((data) => {
      if (data.length > 0) setSchedules(data);
    });

    const unsubNov = subscribeZoneNovedades((data) => {
      if (data.length > 0) setZoneNovedades(data);
    });

    const unsubRep = subscribeClientReports((data) => {
      if (data.length > 0) setClientReports(data);
    });

    const unsubPeriods = subscribePeriods((data) => {
      if (data.length > 0) setPeriods(data);
    });

    const unsubCompany = subscribeCompanySettings((data) => {
      if (data) setCompany(data);
    });

    return () => {
      isMounted = false;
      unsubEmp();
      unsubSched();
      unsubNov();
      unsubRep();
      unsubPeriods();
      unsubCompany();
    };
  }, []);

  // Active Period Object
  const activePeriod = useMemo(() => {
    return periods.find((p) => p.id === activePeriodId) || periods[0];
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
        handleSaveCompanySettings={handleSaveCompanySettings}
        handleAddPeriod={handleAddPeriod}
        handleSaveNovedades={handleSaveNovedades}
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
  handleSaveCompanySettings: (settings: CompanySettings) => void;
  handleAddPeriod: (period: PayrollPeriod) => void;
  handleSaveNovedades: (empId: string, novs: EmployeeNovedades) => void;
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
  handleSaveCompanySettings,
  handleAddPeriod,
  handleSaveNovedades,
}: AppContentProps) {
  const { currentUser, userProfile, currentRole, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('admin-portal');

  const activePeriod = useMemo(() => {
    return periods.find((p) => p.id === activePeriodId) || periods[0];
  }, [periods, activePeriodId]);

  // Adjust active tab when user role changes
  useEffect(() => {
    if (currentRole === 'Jefe de Zona') {
      if (activeTab === 'admin-portal' || activeTab === 'driver-portal') {
        setActiveTab('zone-chief');
      }
    } else if (currentRole === 'Repartidor') {
      if (activeTab === 'admin-portal' || activeTab === 'zone-chief' || activeTab === 'client-report') {
        setActiveTab('driver-portal');
      }
    }
  }, [currentRole]);

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
        firebaseConnected={isFirebaseConnected}
        isSyncing={isSyncing}
        onSelectPeriod={setActivePeriodId}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onNewPeriod={() => setIsNewPeriodOpen(true)}
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
        
        {/* Modulo 1: Portal Administración */}
        {activeTab === 'admin-portal' && currentRole === 'Administrativo' && (
          <AdminPortalView
            employees={employees}
            onAddEmployee={handleAddEmployee}
            onUpdateEmployee={handleUpdateEmployee}
          />
        )}

        {/* Modulo 2: Portal Jefe de Zona */}
        {activeTab === 'zone-chief' && (currentRole === 'Administrativo' || currentRole === 'Jefe de Zona') && (
          <ZoneChiefPortalView
            employees={employees}
            schedules={schedules}
            novedades={zoneNovedades}
            onSaveSchedule={handleSaveSchedule}
            onDeleteSchedule={handleDeleteSchedule}
            onAddNovedad={handleAddZoneNovedad}
            onDeleteNovedad={handleDeleteZoneNovedad}
          />
        )}

        {/* Modulo Repartidor: Portal Repartidor */}
        {activeTab === 'driver-portal' && (
          <DriverPortalView
            employees={employees}
            schedules={schedules}
            clientReports={clientReports}
            onAddClientReport={handleAddClientReport}
            defaultDriverId={userProfile?.employeeId}
          />
        )}

        {/* Modulo 3: Reporte Clientes */}
        {activeTab === 'client-report' && (currentRole === 'Administrativo' || currentRole === 'Jefe de Zona') && (
          <ClientReportsView
            clientReports={clientReports}
            employees={employees}
            schedules={schedules}
            company={company}
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

