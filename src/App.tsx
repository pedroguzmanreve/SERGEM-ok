import React, { useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
import {
  CompanySettings,
  Employee,
  EmployeeNovedades,
  PayrollCalculationItem,
  PayrollPeriod,
  WeeklySchedule,
  ZoneChiefNovedad,
  ClientOrderReport,
  DriverDailyAttendance,
  AuthUser
} from './types/payroll';
import {
  defaultCompanySettings,
  defaultNovedades,
  initialEmployees,
  initialPeriods,
  initialSchedules,
  initialZoneNovedades,
  initialClientReports,
  initialDailyAttendance
} from './data/initialData';
import { calculatePayrollItem } from './utils/payrollCalculator';
import { checkSupabaseConnection } from './lib/supabase';
import { api } from './services/api';
import { telemetry } from './services/telemetry';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TableSkeleton, MetricCardSkeleton } from './components/Skeletons';
import { useRealtime } from './hooks/useRealtime';
import { Header } from './components/Header';
import { Navigation, TabType } from './components/Navigation';
import { Login } from './components/Login';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Loader2 } from 'lucide-react';

// Code Splitting / Lazy Loaded Portal Views and Modals
const AdminPortalView = lazy(() =>
  import('./components/AdminPortalView').then((m) => ({ default: m.AdminPortalView }))
);
const ZoneChiefPortalView = lazy(() =>
  import('./components/ZoneChiefPortalView').then((m) => ({ default: m.ZoneChiefPortalView }))
);
const DriverPortalView = lazy(() =>
  import('./components/DriverPortalView').then((m) => ({ default: m.DriverPortalView }))
);
const ClientReportsView = lazy(() =>
  import('./components/ClientReportsView').then((m) => ({ default: m.ClientReportsView }))
);
const NovedadesModal = lazy(() =>
  import('./components/NovedadesModal').then((m) => ({ default: m.NovedadesModal }))
);
const SettingsModal = lazy(() =>
  import('./components/SettingsModal').then((m) => ({ default: m.SettingsModal }))
);
const NewPeriodModal = lazy(() =>
  import('./components/NewPeriodModal').then((m) => ({ default: m.NewPeriodModal }))
);


function MainLayout() {
  const { authUser, role, isAuthenticated, loading: authLoading, signOut } = useAuth();
  const toast = useToast();

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
  const [attendanceMap, setAttendanceMap] = useState<Record<string, DriverDailyAttendance>>(initialDailyAttendance);

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>('admin-portal');

  // Supabase Async States
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('synced');

  // Modals & Selection States
  const [editingNovedadesItem, setEditingNovedadesItem] = useState<PayrollCalculationItem | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewPeriodOpen, setIsNewPeriodOpen] = useState(false);

  // Sync activeTab with user role on login
  useEffect(() => {
    if (authUser) {
      if (authUser.rol === 'Repartidor') {
        setActiveTab('driver-portal');
      } else if (authUser.rol === 'Jefe de Zona') {
        setActiveTab('zone-chief');
      } else {
        setActiveTab('admin-portal');
      }
    }
  }, [authUser?.id, authUser?.rol]);

  // Synchronize telemetry user context and breadcrumb trail
  useEffect(() => {
    if (authUser) {
      telemetry.setUser({
        id: authUser.id,
        rol: authUser.rol,
        email: authUser.email,
      });
    } else {
      telemetry.setUser(null);
    }
  }, [authUser]);

  useEffect(() => {
    telemetry.addBreadcrumb({
      category: 'navigation',
      message: `Pestaña activa: ${activeTab}`,
      data: { activeTab },
    });
  }, [activeTab]);

  // Initial Data Fetching from Supabase (FASE 3)
  useEffect(() => {
    let isMounted = true;

    const initializeData = async () => {
      setIsLoadingData(true);
      try {
        await checkSupabaseConnection();
        const res = await api.fetchAllInitialData();
        
        if (!isMounted) return;

        if (res.company) {
          setCompany(res.company);
        }
        if (res.employees && res.employees.length > 0) {
          setEmployees(res.employees);
        }
        if (res.periods && res.periods.length > 0) {
          setPeriods(res.periods);
          setActivePeriodId(res.periods[0].id);
        }
        if (res.schedules && res.schedules.length > 0) {
          setSchedules(res.schedules);
        }
        if (res.zoneNovedades && res.zoneNovedades.length > 0) {
          setZoneNovedades(res.zoneNovedades);
        }
        if (res.clientReports && res.clientReports.length > 0) {
          setClientReports(res.clientReports);
        }
        if (res.attendances && Object.keys(res.attendances).length > 0) {
          setAttendanceMap(res.attendances);
        }

        // Fetch novedades for the active period
        const periodIdToFetch = (res.periods && res.periods.length > 0) ? res.periods[0].id : initialPeriods[0].id;
        const novRes = await api.getEmployeeNovedades(periodIdToFetch);
        if (isMounted && novRes.data && Object.keys(novRes.data).length > 0) {
          setNovedadesMap(novRes.data);
        }

        setSyncStatus('synced');
      } catch (err: any) {
        console.warn('[App] Supabase fetch error, maintaining local fallback:', err);
        setSyncStatus('error');
      } finally {
        if (isMounted) {
          setIsLoadingData(false);
        }
      }
    };

    initializeData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Supabase Realtime Subscription Integration (FASE 5)
  const { isConnected: isRealtimeConnected } = useRealtime({
    enabled: Boolean(isAuthenticated),
    onAttendanceChange: (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const item: DriverDailyAttendance = payload.new;
        if (item && item.repartidorId) {
          setAttendanceMap((prev) => ({
            ...prev,
            [item.repartidorId]: item,
          }));
          toast.realtime(`Estado de turno en vivo actualizado para repartidor`, '⚡ Control Operativo');
        }
      }
    },
    onScheduleChange: (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const sched: WeeklySchedule = payload.new;
        if (sched && sched.id) {
          setSchedules((prev) => {
            const idx = prev.findIndex((s) => s.id === sched.id || (s.repartidorId === sched.repartidorId && s.semanaInicio === sched.semanaInicio));
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = sched;
              return updated;
            }
            return [sched, ...prev];
          });
          toast.realtime('Programación semanal actualizada en tiempo real', '📅 Cuadrante');
        }
      } else if (payload.eventType === 'DELETE') {
        const deletedId = payload.old?.id;
        if (deletedId) {
          setSchedules((prev) => prev.filter((s) => s.id !== deletedId));
        }
      }
    },
    onZoneNovedadChange: (payload) => {
      if (payload.eventType === 'INSERT') {
        const nov: ZoneChiefNovedad = payload.new;
        if (nov && nov.id) {
          setZoneNovedades((prev) => [nov, ...prev.filter((n) => n.id !== nov.id)]);
          toast.realtime(`Nueva novedad reportada: ${nov.tipo}`, '📋 Novedades de Campo');
        }
      } else if (payload.eventType === 'UPDATE') {
        const nov: ZoneChiefNovedad = payload.new;
        if (nov && nov.id) {
          setZoneNovedades((prev) => prev.map((n) => (n.id === nov.id ? nov : n)));
        }
      } else if (payload.eventType === 'DELETE') {
        const deletedId = payload.old?.id;
        if (deletedId) {
          setZoneNovedades((prev) => prev.filter((n) => n.id !== deletedId));
        }
      }
    },
    onClientReportChange: (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const rep: ClientOrderReport = payload.new;
        if (rep && rep.id) {
          setClientReports((prev) => [rep, ...prev.filter((r) => r.id !== rep.id)]);
          toast.realtime(`Reporte de cliente recibido (${rep.nombreCliente})`, '📦 Encomiendas');
        }
      } else if (payload.eventType === 'DELETE') {
        const deletedId = payload.old?.id;
        if (deletedId) {
          setClientReports((prev) => prev.filter((r) => r.id !== deletedId));
        }
      }
    },
    onEmployeeChange: (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const emp: Employee = payload.new;
        if (emp && emp.id) {
          setEmployees((prev) => [emp, ...prev.filter((e) => e.id !== emp.id)]);
          toast.realtime(`Colaborador ${emp.nombre} ${emp.apellido} sincronizado`, '👥 Gestión Humana');
        }
      }
    },
    onPayrollPeriodChange: (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const period: PayrollPeriod = payload.new;
        if (period && period.id) {
          setPeriods((prev) => [period, ...prev.filter((p) => p.id !== period.id)]);
        }
      }
    },
    onCompanySettingsChange: (payload) => {
      if (payload.new) {
        setCompany(payload.new);
        toast.realtime('Parámetros de empresa actualizados remotamente', '⚙️ Configuración');
      }
    },
  });

  // Active Period Object
  const activePeriod = useMemo(() => {
    return periods.find((p) => p.id === activePeriodId) || periods[0];
  }, [periods, activePeriodId]);

  // Company Settings Handler
  const handleSaveCompanySettings = async (updatedCompany: CompanySettings) => {
    setCompany(updatedCompany);
    setIsSyncing(true);
    const res = await api.updateCompanySettings(updatedCompany);
    setIsSyncing(false);
    if (res.error) {
      toast.error(`Error al sincronizar parámetros: ${res.error}`);
    } else {
      toast.success('Parámetros de empresa guardados en Supabase');
    }
  };

  // Novedades Handlers
  const handleSaveNovedades = async (employeeId: string, updatedNovedades: EmployeeNovedades) => {
    setNovedadesMap((prev) => ({
      ...prev,
      [employeeId]: updatedNovedades,
    }));
    setEditingNovedadesItem(null);

    setIsSyncing(true);
    const res = await api.upsertEmployeeNovedades(activePeriodId, employeeId, updatedNovedades);
    setIsSyncing(false);
    if (res.error) {
      toast.error(`Error al sincronizar novedades: ${res.error}`);
    } else {
      toast.success('Novedades de nómina actualizadas en base de datos');
    }
  };

  // Employee CRUD Handlers
  const handleAddEmployee = async (newEmp: Employee) => {
    setEmployees((prev) => [...prev, newEmp]);
    setIsSyncing(true);
    const res = await api.createEmployee(newEmp);
    setIsSyncing(false);
    if (res.error) {
      toast.error(`Error al registrar en Supabase: ${res.error}`);
    } else if (res.data) {
      setEmployees((prev) => prev.map((e) => (e.id === newEmp.id ? res.data! : e)));
      toast.success(`Colaborador ${newEmp.nombre} ${newEmp.apellido} registrado exitosamente`);
    }
  };

  const handleUpdateEmployee = async (updatedEmp: Employee) => {
    setEmployees((prev) => prev.map((e) => (e.id === updatedEmp.id ? updatedEmp : e)));
    setIsSyncing(true);
    const res = await api.updateEmployee(updatedEmp);
    setIsSyncing(false);
    if (res.error) {
      toast.error(`Error al actualizar en Supabase: ${res.error}`);
    } else {
      toast.success(`Colaborador ${updatedEmp.nombre} actualizado en base de datos`);
    }
  };

  // Period Handlers
  const handleAddPeriod = async (newPeriod: PayrollPeriod) => {
    setPeriods((prev) => [newPeriod, ...prev]);
    setActivePeriodId(newPeriod.id);
    setIsSyncing(true);
    const res = await api.createPayrollPeriod(newPeriod);
    setIsSyncing(false);
    if (res.error) {
      toast.error(`Error al crear periodo: ${res.error}`);
    } else {
      toast.success(`Periodo ${newPeriod.nombrePeriodo} creado y sincronizado`);
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

    setIsSyncing(true);
    const res = await api.upsertWeeklySchedule(newSched);
    setIsSyncing(false);
    if (res.error) {
      toast.error(`Error al sincronizar cuadrante: ${res.error}`);
    } else {
      toast.success('Programación semanal sincronizada en Supabase');
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
    setIsSyncing(true);
    const res = await api.deleteWeeklySchedule(scheduleId);
    setIsSyncing(false);
    if (res.error) {
      toast.error(`Error al eliminar programación: ${res.error}`);
    } else {
      toast.success('Programación eliminada');
    }
  };

  // Zone Chief Novedades Handlers
  const handleAddZoneNovedad = async (newNov: ZoneChiefNovedad) => {
    setZoneNovedades((prev) => [newNov, ...prev]);
    setIsSyncing(true);
    const res = await api.createZoneNovedad(newNov);
    setIsSyncing(false);
    if (res.error) {
      toast.error(`Error al guardar novedad: ${res.error}`);
    } else {
      toast.success(`Novedad de ${newNov.tipo} reportada y guardada`);
    }
  };

  const handleDeleteZoneNovedad = async (novedadId: string) => {
    setZoneNovedades((prev) => prev.filter((n) => n.id !== novedadId));
    setIsSyncing(true);
    const res = await api.deleteZoneNovedad(novedadId);
    setIsSyncing(false);
    if (res.error) {
      toast.error(`Error al eliminar novedad: ${res.error}`);
    } else {
      toast.success('Novedad eliminada');
    }
  };

  // Client Reports Handlers
  const handleAddClientReport = async (report: ClientOrderReport) => {
    setClientReports((prev) => [report, ...prev]);
    setIsSyncing(true);
    const res = await api.createClientOrderReport(report);
    setIsSyncing(false);
    if (res.error) {
      toast.error(`Error al registrar reporte de cliente: ${res.error}`);
    } else {
      toast.success(`Reporte para ${report.nombreCliente} guardado`);
    }
  };

  const handleDeleteClientReport = async (reportId: string) => {
    setClientReports((prev) => prev.filter((r) => r.id !== reportId));
    setIsSyncing(true);
    const res = await api.deleteClientOrderReport(reportId);
    setIsSyncing(false);
    if (res.error) {
      toast.error(`Error al eliminar reporte: ${res.error}`);
    } else {
      toast.success('Reporte eliminado de la base de datos');
    }
  };

  // Attendance Handlers
  const handleUpdateDriverAttendance = async (employeeId: string, updates: Partial<DriverDailyAttendance>) => {
    const existing = attendanceMap[employeeId] || {
      repartidorId: employeeId,
      diaSemana: 'Lunes',
      fecha: new Date().toISOString().split('T')[0],
      estado: 'PENDIENTE_INICIO',
    };
    const updatedAttendance: DriverDailyAttendance = {
      ...existing,
      ...updates,
    };

    setAttendanceMap((prev) => ({
      ...prev,
      [employeeId]: updatedAttendance,
    }));

    setIsSyncing(true);
    const res = await api.upsertDailyAttendance(updatedAttendance);
    setIsSyncing(false);
    if (res.error) {
      toast.error(`Error al sincronizar asistencia: ${res.error}`);
    } else {
      toast.success('Estado de jornada y auditoría actualizado');
    }
  };

  // Contact Driver Action
  const handleRecordContact = (
    employeeId: string,
    tipo: 'WhatsApp' | 'Llamada',
    mensaje?: string,
    respuesta?: string
  ) => {
    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('es-CO')} ${now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`;

    handleUpdateDriverAttendance(employeeId, {
      ultimoContacto: {
        tipo,
        fechaHora: formattedDate,
        mensajeEnviado: mensaje,
        registradoPor: authUser ? `${authUser.nombre} (${authUser.rol})` : 'Jefe de Operaciones',
        respuestaRegistrada: respuesta || 'Contacto registrado en bitácora',
      },
    });

    toast.info(`Contacto registrado vía ${tipo} para el repartidor`);
  };

  // Mark Shift as Started
  const handleMarkShiftStarted = (employeeId: string) => {
    const now = new Date();
    const formattedTime = now.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    handleUpdateDriverAttendance(employeeId, {
      estado: 'INICIADO',
      horaConexionReal: formattedTime,
    });

    toast.success(`Turno iniciado manualmente a las ${formattedTime}`);
  };

  // Calculated Payroll Items
  const calculatedItems = useMemo<PayrollCalculationItem[]>(() => {
    return employees.map((emp) => {
      const nov = novedadesMap[emp.id] || defaultNovedades[emp.id] || {
        diasTrabajados: 15,
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

      return calculatePayrollItem(emp, nov, company, activePeriod?.diasBasePeriodo || 15);
    });
  }, [employees, novedadesMap, company, activePeriod]);

  // Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
        <p className="text-sm font-bold text-slate-300">Cargando sesión y autenticación...</p>
      </div>
    );
  }

  // Login view if unauthenticated
  if (!isAuthenticated) {
    return <Login employees={employees} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      
      {/* App Header */}
      <Header
        company={company}
        activePeriod={activePeriod}
        periods={periods}
        currentUser={authUser}
        isSyncing={isSyncing}
        syncStatus={syncStatus}
        isRealtimeActive={isRealtimeConnected}
        onSelectPeriod={setActivePeriodId}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onNewPeriod={() => setIsNewPeriodOpen(true)}
        onLogout={signOut}
      />

      {/* App Navigation */}
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        employeeCount={employees.filter((e) => e.activo).length}
        currentUser={authUser}
      />

      {/* Main Content Area Protected by RBAC */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {isLoadingData ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </div>
            <TableSkeleton rows={6} cols={7} />
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <MetricCardSkeleton />
                  <MetricCardSkeleton />
                  <MetricCardSkeleton />
                  <MetricCardSkeleton />
                </div>
                <TableSkeleton rows={6} cols={7} />
              </div>
            }
          >
            {/* Modulo 1: Portal Administración */}
            {activeTab === 'admin-portal' && (
              <ProtectedRoute
                allowedRoles={['Administrativo', 'Jefe de Operaciones']}
                fallbackTabName="Portal Repartidor"
                onNavigateFallback={() => setActiveTab('driver-portal')}
              >
                <AdminPortalView
                  employees={employees}
                  schedules={schedules}
                  attendanceMap={attendanceMap}
                  onAddEmployee={handleAddEmployee}
                  onUpdateEmployee={handleUpdateEmployee}
                  onRecordContact={handleRecordContact}
                  onMarkShiftStarted={handleMarkShiftStarted}
                />
              </ProtectedRoute>
            )}

            {/* Modulo 2: Portal Jefe de Zona */}
            {activeTab === 'zone-chief' && (
              <ProtectedRoute
                allowedRoles={['Administrativo', 'Jefe de Operaciones', 'Jefe de Zona']}
                fallbackTabName="Portal Repartidor"
                onNavigateFallback={() => setActiveTab('driver-portal')}
              >
                <ZoneChiefPortalView
                  employees={employees}
                  schedules={schedules}
                  novedades={zoneNovedades}
                  currentUser={authUser}
                  attendanceMap={attendanceMap}
                  onSaveSchedule={handleSaveSchedule}
                  onDeleteSchedule={handleDeleteSchedule}
                  onAddNovedad={handleAddZoneNovedad}
                  onDeleteNovedad={handleDeleteZoneNovedad}
                  onRecordContact={handleRecordContact}
                  onMarkShiftStarted={handleMarkShiftStarted}
                />
              </ProtectedRoute>
            )}

            {/* Modulo Repartidor: Portal Repartidor */}
            {activeTab === 'driver-portal' && (
              <ProtectedRoute
                allowedRoles={['Administrativo', 'Jefe de Operaciones', 'Jefe de Zona', 'Repartidor']}
                fallbackTabName="Portal Principal"
                onNavigateFallback={() => setActiveTab('admin-portal')}
              >
                <DriverPortalView
                  employees={employees}
                  schedules={schedules}
                  clientReports={clientReports}
                  currentUser={authUser}
                  attendanceMap={attendanceMap}
                  onAddClientReport={handleAddClientReport}
                  onUpdateAttendance={handleUpdateDriverAttendance}
                />
              </ProtectedRoute>
            )}

            {/* Modulo 3: Reporte Clientes */}
            {activeTab === 'client-report' && (
              <ProtectedRoute
                allowedRoles={['Administrativo', 'Jefe de Operaciones', 'Jefe de Zona']}
                fallbackTabName="Portal Repartidor"
                onNavigateFallback={() => setActiveTab('driver-portal')}
              >
                <ClientReportsView
                  clientReports={clientReports}
                  employees={employees}
                  schedules={schedules}
                  company={company}
                  onAddClientReport={handleAddClientReport}
                  onDeleteClientReport={handleDeleteClientReport}
                />
              </ProtectedRoute>
            )}
          </Suspense>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <p>SERGEM MENSAJERIA S.A.S. • Sistema de Gestión y Reporte de Nómina Electrónica v2026 • Control de Acceso RBAC</p>
      </footer>

      {/* Modals with Suspense Fallbacks */}
      <Suspense
        fallback={
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center pointer-events-none">
            <Loader2 className="w-8 h-8 animate-spin text-red-600" />
          </div>
        }
      >
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
      </Suspense>

    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <MainLayout />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
