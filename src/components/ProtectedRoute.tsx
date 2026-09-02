import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/payroll';
import { ShieldAlert, LogOut, ArrowRight, Lock, Loader2, Truck } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  fallbackTabName?: string;
  onNavigateFallback?: () => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  fallbackTabName = 'su portal correspondiente',
  onNavigateFallback,
}) => {
  const { authUser, role, isAuthenticated, loading, signOut, switchRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[450px] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4 ring-8 ring-red-50/50">
          <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Verificando Credenciales</h3>
        <p className="text-xs text-slate-500 mt-1">Validando permisos y sesión con SERGEM S.A.S...</p>
      </div>
    );
  }

  if (!isAuthenticated || !authUser) {
    return null; // Will trigger Login view in App
  }

  // Check if role is authorized
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-amber-500 to-red-600 px-6 py-6 text-white flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-white/80">Control de Acceso (RBAC)</span>
            <h2 className="text-lg font-black leading-tight">Módulo con Restricción de Perfil</h2>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex items-start gap-3">
            <Lock className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 space-y-1">
              <p>
                El usuario <strong className="text-slate-900">{authUser.nombre} {authUser.apellido}</strong> tiene asignado el rol <span className="inline-block font-mono font-bold text-red-700 bg-red-100/80 px-2 py-0.5 rounded text-[11px]">{role}</span>.
              </p>
              <p>
                Este módulo requiere uno de los siguientes roles autorizados:{' '}
                <span className="font-semibold text-slate-800">
                  {allowedRoles.join(', ')}
                </span>.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {onNavigateFallback && (
              <button
                type="button"
                onClick={onNavigateFallback}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-red-600 text-white font-bold text-xs shadow-md shadow-red-600/20 hover:bg-red-700 active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>Ir a {fallbackTabName}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {/* Quick role preview switcher for testing in sandbox/dev */}
            <div className="flex items-center gap-2">
              {allowedRoles.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => switchRole(r)}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] font-semibold transition-all cursor-pointer"
                  title={`Simular cambio al rol ${r}`}
                >
                  Probar como {r}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-slate-500" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
