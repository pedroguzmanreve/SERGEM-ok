import React from 'react';
import {
  CompanySettings,
  PayrollPeriod,
  Employee,
  WeeklySchedule,
  DriverAttendanceRecord,
  ClientOrderReport,
} from '../types/payroll';
import { LogOut, Truck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  company?: CompanySettings;
  activePeriod?: PayrollPeriod;
  periods?: PayrollPeriod[];
  employees?: Employee[];
  schedules?: WeeklySchedule[];
  attendanceRecords?: DriverAttendanceRecord[];
  clientReports?: ClientOrderReport[];
  firebaseConnected?: boolean;
  isSyncing?: boolean;
  onSelectPeriod?: (periodId: string) => void;
  onOpenSettings?: () => void;
  onNewPeriod?: () => void;
  onNavigateToPortal?: (portal: any) => void;
}

export const Header: React.FC<HeaderProps> = ({ company }) => {
  const { logout } = useAuth();
  const companyName = company?.nombreEmpresa || 'SERGEM MENSAJERIA S.A.S.';

  return (
    <header id="main-header" className="bg-white/95 backdrop-blur-md text-slate-900 border-b border-slate-200/90 shadow-2xs sticky top-0 z-30 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3">
        {/* Nombre de la Empresa */}
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center text-white shadow-xs shrink-0">
            <Truck className="w-4 h-4" />
          </div>
          <h1 className="text-sm sm:text-base font-black tracking-tight text-slate-900 truncate">
            {companyName}
          </h1>
        </div>

        {/* Solo botón de Cerrar Sesión */}
        <button
          id="btn-logout"
          onClick={logout}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 shadow-2xs transition-all text-xs font-bold cursor-pointer active:scale-95 shrink-0"
          title="Cerrar sesión"
        >
          <LogOut className="w-3.5 h-3.5 text-red-600" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </header>
  );
};


