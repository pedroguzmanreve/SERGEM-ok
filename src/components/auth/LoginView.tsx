import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  CalendarDays,
  Truck,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AppRole, Employee } from '../../types/payroll';

interface LoginViewProps {
  employees: Employee[];
}

export const LoginView: React.FC<LoginViewProps> = ({ employees }) => {
  const {
    loginWithGoogle,
    loginWithEmail,
    loading,
    error,
    clearError
  } = useAuth();

  // Parse invitation parameters from URL (e.g. from Email, WhatsApp, or copied link)
  const inviteParams = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const p = new URLSearchParams(window.location.search);
    const portal = p.get('portal');
    const role = p.get('role');
    const email = p.get('invite_email');
    const empId = p.get('emp_id');
    const empName = p.get('emp_name');
    const token = p.get('token');

    if (!portal && !role && !email && !token) return null;

    let appRole: AppRole = 'Repartidor';
    if (role === 'Administrativo' || portal === 'admin-portal') {
      appRole = 'Administrativo';
    } else if (role === 'Jefe de Zona' || role === 'Jefe de Operaciones' || portal === 'zone-chief') {
      appRole = 'Jefe de Zona';
    } else {
      appRole = 'Repartidor';
    }

    const portalDisplayName =
      appRole === 'Repartidor'
        ? 'Portal del Repartidor'
        : appRole === 'Jefe de Zona'
        ? 'Portal de Jefatura de Zona'
        : 'Portal de Administración';

    const portalTab =
      appRole === 'Repartidor'
        ? 'driver-portal'
        : appRole === 'Jefe de Zona'
        ? 'zone-chief'
        : 'admin-portal';

    return {
      portal: portal || portalTab,
      role: role || appRole,
      appRole,
      email: email || '',
      empId: empId || '',
      empName: empName || '',
      token: token || '',
      portalDisplayName,
    };
  }, []);

  // Match with existing employee if possible
  const matchedInvitedEmployee = useMemo(() => {
    if (!inviteParams) return undefined;
    return employees.find(
      (e) =>
        (inviteParams.empId && e.id === inviteParams.empId) ||
        (inviteParams.email && e.email?.toLowerCase() === inviteParams.email.toLowerCase())
    );
  }, [employees, inviteParams]);

  const [email, setEmail] = useState(() => inviteParams?.email || '');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!email || !password) return;
    await loginWithEmail(email, password);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-red-600 blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 rounded-full bg-blue-600 blur-3xl" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-600 text-white shadow-lg shadow-red-600/30 mb-3">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            SERGEM S.A.S.
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-medium text-slate-400">
            Sistema Integral de Gestión & Reporte de Nómina
          </p>
          <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700/80 text-[11px] font-semibold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Autenticación Firebase & Roles de Acceso
          </div>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl relative z-10 px-4 sm:px-0">
        <div className="bg-slate-800/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8">
          
          {/* SPECIAL INVITATION BANNER (Shown when opened via Email, WhatsApp, or Copied Link) */}
          {inviteParams && (
            <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-blue-900/40 via-indigo-900/30 to-slate-900 border border-blue-500/40 shadow-lg">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                  inviteParams.appRole === 'Repartidor'
                    ? 'bg-blue-600 text-white'
                    : inviteParams.appRole === 'Jefe de Zona'
                    ? 'bg-amber-600 text-white'
                    : 'bg-red-600 text-white'
                }`}>
                  {inviteParams.appRole === 'Repartidor' ? (
                    <Truck className="w-5 h-5" />
                  ) : inviteParams.appRole === 'Jefe de Zona' ? (
                    <CalendarDays className="w-5 h-5" />
                  ) : (
                    <ShieldCheck className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Invitación Oficial
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                      inviteParams.appRole === 'Repartidor'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        : inviteParams.appRole === 'Jefe de Zona'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-red-500/20 text-red-300 border border-red-500/40'
                    }`}>
                      Rol: {inviteParams.role}
                    </span>
                  </div>
                  <h3 className="text-white font-bold text-sm mt-1">
                    {inviteParams.empName || matchedInvitedEmployee?.nombre
                      ? `¡Hola, ${inviteParams.empName || `${matchedInvitedEmployee?.nombre} ${matchedInvitedEmployee?.apellido}`}!`
                      : '¡Te damos la bienvenida a SERGEM S.A.S.!'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Has sido invitado(a) para ingresar a tu{' '}
                    <strong className="text-white underline decoration-blue-400">
                      {inviteParams.portalDisplayName}
                    </strong>
                    . Por favor inicia sesión con tu cuenta de Google o con tu correo y contraseña asignados.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-300 text-xs sm:text-sm">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-red-200">Aviso de autenticación</p>
                <p className="mt-0.5 text-red-300/90">{error}</p>
              </div>
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={loginWithGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm shadow-md transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continuar con Google</span>
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-800 px-3 text-slate-400 font-semibold tracking-wider">
                O con correo y contraseña
              </span>
            </div>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@sergem.com.co"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tu contraseña de acceso"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md shadow-red-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>Entrar a la Plataforma</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="mt-4 text-center text-xs text-slate-400 flex items-center justify-center gap-4">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Normativa Laboral Colombia (Ley 2101 de 2021)
          </span>
          <span>•</span>
          <span>Nómina SERGEM v2.4</span>
        </div>
      </div>
    </div>
  );
};

