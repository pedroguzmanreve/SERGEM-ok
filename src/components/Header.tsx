import React, { useState } from 'react';
import {
  CompanySettings,
  PayrollPeriod,
  AppRole,
  Employee,
  WeeklySchedule,
  DriverAttendanceRecord,
  ClientOrderReport,
} from '../types/payroll';
import { ShieldCheck, Settings, Truck, Database, LogOut, ChevronDown, User, CalendarDays } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AdminAttendanceNotification } from './AdminAttendanceNotification';

interface HeaderProps {
  company: CompanySettings;
  activePeriod: PayrollPeriod;
  periods: PayrollPeriod[];
  employees?: Employee[];
  schedules?: WeeklySchedule[];
  attendanceRecords?: DriverAttendanceRecord[];
  clientReports?: ClientOrderReport[];
  firebaseConnected?: boolean;
  isSyncing?: boolean;
  onSelectPeriod: (periodId: string) => void;
  onOpenSettings: () => void;
  onNewPeriod: () => void;
  onNavigateToPortal?: (portal: any) => void;
}

export const Header: React.FC<HeaderProps> = ({
  company,
  activePeriod: _activePeriod,
  periods: _periods,
  employees = [],
  schedules = [],
  attendanceRecords = [],
  clientReports = [],
  firebaseConnected = true,
  isSyncing = false,
  onSelectPeriod: _onSelectPeriod,
  onOpenSettings,
  onNewPeriod: _onNewPeriod,
  onNavigateToPortal,
}) => {
  const { userProfile, currentRole, switchRole, logout } = useAuth();
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);

  const getRoleBadgeStyle = (role: AppRole) => {
    switch (role) {
      case 'Administrativo':
        return {
          bg: 'bg-red-50 text-red-700 border-red-200/80',
          dot: 'bg-red-600',
          icon: ShieldCheck,
          label: 'Administrador',
        };
      case 'Jefe de Zona':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200/80',
          dot: 'bg-amber-600',
          icon: CalendarDays,
          label: 'Jefe de Zona',
        };
      case 'Repartidor':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200/80',
          dot: 'bg-blue-600',
          icon: Truck,
          label: 'Repartidor',
        };
      default:
        return {
          bg: 'bg-slate-50 text-slate-700 border-slate-200',
          dot: 'bg-slate-500',
          icon: User,
          label: role,
        };
    }
  };

  const roleStyle = getRoleBadgeStyle(currentRole);
  const RoleIcon = roleStyle.icon;

  return (
    <header id="main-header" className="bg-white/95 backdrop-blur-md text-slate-900 border-b border-slate-200/90 shadow-2xs sticky top-0 z-30 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
        
        {/* Brand & Company Info */}
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center text-white shadow-md shadow-red-600/25 ring-1 ring-red-500/30 shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 leading-none">
                {company.nombreEmpresa}
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-red-50 text-red-700 border border-red-200/70 shadow-2xs">
                NIT {company.nit}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 flex items-center gap-1.5 font-medium mt-0.5">
              <span>{company.ciudad}</span>
              <span className="text-slate-300">•</span>
              <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" /> Logística & Mensajería S.A.S.
              </span>
            </p>
          </div>
        </div>

        {/* Controls & Auth Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Firebase Status Badge */}
          <div
            id="firebase-status-badge"
            className={`hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold ${
              firebaseConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                : 'bg-amber-50 text-amber-700 border-amber-200/80'
            }`}
            title="Conexión en tiempo real con Google Cloud Firestore"
          >
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>Firestore:</span>
            <span className="flex items-center gap-1 font-mono text-[11px]">
              <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-blue-500 animate-ping' : 'bg-emerald-500'}`} />
              {isSyncing ? 'Sincronizando...' : 'Conectado'}
            </span>
          </div>

          {/* Admin Shift Connection Notification Bell */}
          {currentRole === 'Administrativo' && (
            <AdminAttendanceNotification
              employees={employees}
              schedules={schedules}
              attendanceRecords={attendanceRecords}
              clientReports={clientReports}
              onNavigateToPortal={onNavigateToPortal}
            />
          )}

          {/* User Role Badge (Locked for Repartidor and Jefe de Zona, only Administrator can switch) */}
          {currentRole !== 'Administrativo' ? (
            <div
              id="user-role-badge-locked"
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${roleStyle.bg} shadow-2xs select-none`}
              title={`Acceso asignado: ${roleStyle.label}`}
            >
              <RoleIcon className="w-3.5 h-3.5" />
              <div className="text-left hidden sm:block">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold leading-none">
                  Rol Asignado
                </div>
                <div className="leading-tight">{roleStyle.label}</div>
              </div>
              <span className="sm:hidden">{roleStyle.label}</span>
            </div>
          ) : (
            <div className="relative">
              <button
                id="user-role-badge-button"
                type="button"
                onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${roleStyle.bg} shadow-2xs hover:opacity-90 active:scale-95`}
                title="Supervisar roles del sistema"
              >
                <RoleIcon className="w-3.5 h-3.5" />
                <div className="text-left hidden sm:block">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold leading-none">
                    Rol Administrador
                  </div>
                  <div className="leading-tight">{roleStyle.label}</div>
                </div>
                <span className="sm:hidden">{roleStyle.label}</span>
                <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
              </button>

              {/* Role Switcher Menu */}
              {isRoleMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsRoleMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-800 line-clamp-1">
                        {userProfile?.displayName || 'Administrador SERGEM'}
                      </p>
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        {userProfile?.email || 'pedroguzman@revesolution.net'}
                      </p>
                    </div>
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Supervisar Portales
                    </div>
                    {(['Administrativo', 'Jefe de Zona', 'Repartidor'] as AppRole[]).map((r) => {
                      const rStyle = getRoleBadgeStyle(r);
                      const RIcon = rStyle.icon;
                      const isSelected = currentRole === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            switchRole(r);
                            setIsRoleMenuOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer ${
                            isSelected ? 'text-red-700 bg-red-50/70 font-bold' : 'text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <RIcon className="w-4 h-4 text-slate-500" />
                            <span>{rStyle.label}</span>
                          </div>
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-red-600" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Settings Button (Only for Admin) */}
          {currentRole === 'Administrativo' && (
            <button
              id="btn-settings"
              onClick={onOpenSettings}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200/90 shadow-2xs transition-all text-xs font-semibold cursor-pointer active:scale-95"
              title="Parámetros de Nómina y Empresa"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Configuración</span>
            </button>
          )}

          {/* Logout Button */}
          <button
            id="btn-logout"
            onClick={logout}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-red-700 hover:text-red-800 bg-red-50/80 hover:bg-red-100/80 rounded-xl border border-red-200/80 shadow-2xs transition-all text-xs font-semibold cursor-pointer active:scale-95"
            title="Cerrar sesión segura"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>

      </div>
    </header>
  );
};

