import React from 'react';
import { CompanySettings, PayrollPeriod, AuthUser } from '../types/payroll';
import { ShieldCheck, Settings, Truck, LogOut, Cloud, CloudCheck, RefreshCw, AlertCircle, Zap } from 'lucide-react';

interface HeaderProps {
  company: CompanySettings;
  activePeriod: PayrollPeriod;
  periods: PayrollPeriod[];
  currentUser?: AuthUser | null;
  isSyncing?: boolean;
  syncStatus?: 'synced' | 'syncing' | 'offline' | 'error';
  isRealtimeActive?: boolean;
  onSelectPeriod: (periodId: string) => void;
  onOpenSettings: () => void;
  onNewPeriod: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  company,
  activePeriod,
  periods,
  currentUser,
  isSyncing = false,
  syncStatus = 'synced',
  isRealtimeActive = false,
  onSelectPeriod,
  onOpenSettings,
  onNewPeriod,
  onLogout,
}) => {
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

        {/* Controls & User Session */}
        <div className="flex items-center space-x-2.5">
          {/* Cloud Sync Status & Realtime Indicator */}
          <div className="hidden sm:flex items-center gap-2">
            {isRealtimeActive && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300/80 text-xs font-bold shadow-2xs animate-in fade-in" title="Canal Supabase Realtime activo para sincronización instantánea">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                <span className="hidden md:inline">En Tiempo Real</span>
              </span>
            )}

            {isSyncing ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>Sincronizando...</span>
              </span>
            ) : syncStatus === 'synced' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold" title="Conectado a Supabase">
                <Cloud className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden lg:inline">Supabase Conectado</span>
              </span>
            ) : syncStatus === 'error' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold" title="Modo local de reserva activo">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Modo Local</span>
              </span>
            ) : null}
          </div>

          <button
            id="btn-settings"
            onClick={onOpenSettings}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200/90 shadow-2xs transition-all text-xs font-semibold cursor-pointer active:scale-95"
            title="Parámetros de Nómina y Empresa"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Configuración</span>
          </button>

          {currentUser && (
            <div className="flex items-center pl-2 border-l border-slate-200 space-x-2">
              <div className="hidden md:flex flex-col items-end text-right">
                <span className="text-xs font-extrabold text-slate-900 leading-tight">
                  {currentUser.nombre} {currentUser.apellido}
                </span>
                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.2 rounded border border-red-100">
                  {currentUser.rol}
                </span>
              </div>

              {onLogout && (
                <button
                  id="btn-logout"
                  onClick={onLogout}
                  className="inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-2 text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 shadow-2xs transition-all text-xs font-bold cursor-pointer active:scale-95"
                  title="Cerrar Sesión e ir a Login"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Salir</span>
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
