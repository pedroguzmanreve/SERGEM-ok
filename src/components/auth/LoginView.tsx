import React, { useState } from 'react';
import {
  ShieldCheck,
  CalendarDays,
  Truck,
  Lock,
  Mail,
  User,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Building2,
  CheckCircle2
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
    registerWithEmail,
    quickLoginAsRole,
    loading,
    error,
    clearError
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole>('Administrativo');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (mode === 'login') {
      if (!email || !password) return;
      await loginWithEmail(email, password);
    } else {
      if (!email || !password || !displayName) return;
      await registerWithEmail(email, password, displayName, selectedRole);
    }
  };

  // Find sample employees for role demonstration
  const sampleAdmin = employees.find((e) => e.rol === 'Administrativo');
  const sampleZoneChief = employees.find((e) => e.rol === 'Jefe de Zona' || e.rol === 'Jefe de Operaciones');
  const sampleDriver = employees.find((e) => e.rol === 'Repartidor');

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

          {/* Mode Switcher */}
          <div className="flex p-1 bg-slate-900/80 rounded-xl mb-6 border border-slate-700/50">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                clearError();
              }}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                clearError();
              }}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Registrar Usuario
            </button>
          </div>

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
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nombre Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ej. Pedro Guzmán"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
            )}

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
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Rol en SERGEM S.A.S.
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'Administrativo', label: 'Administrador', icon: ShieldCheck },
                    { id: 'Jefe de Zona', label: 'Jefe de Zona', icon: CalendarDays },
                    { id: 'Repartidor', label: 'Repartidor', icon: Truck },
                  ].map((r) => {
                    const Icon = r.icon;
                    const isSel = selectedRole === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedRole(r.id as AppRole)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                          isSel
                            ? 'bg-red-600/20 border-red-500 text-white font-bold'
                            : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Icon className={`w-5 h-5 mb-1 ${isSel ? 'text-red-400' : 'text-slate-500'}`} />
                        <span className="text-xs">{r.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md shadow-red-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{mode === 'login' ? 'Entrar a la Plataforma' : 'Crear Cuenta y Entrar'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Access Demo by Role */}
          <div className="mt-8 pt-6 border-t border-slate-700/80">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Acceso Rápido por Rol (Entrada Inmediata)
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Demostración & Pruebas</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => quickLoginAsRole('Administrativo', sampleAdmin)}
                className="group p-3 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-700/80 hover:border-red-500/60 transition-all text-left cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-colors">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-white">Administrador</span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1">Nómina, Legal & Personal</p>
              </button>

              <button
                type="button"
                onClick={() => quickLoginAsRole('Jefe de Zona', sampleZoneChief)}
                className="group p-3 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-700/80 hover:border-amber-500/60 transition-all text-left cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-white">Jefe de Zona</span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1">Turnos, Novedades & Rutas</p>
              </button>

              <button
                type="button"
                onClick={() => quickLoginAsRole('Repartidor', sampleDriver)}
                className="group p-3 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-700/80 hover:border-blue-500/60 transition-all text-left cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <Truck className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-white">Repartidor</span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1">Desprendibles & Mis Turnos</p>
              </button>
            </div>
          </div>

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
