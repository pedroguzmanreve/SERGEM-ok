import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole, Employee } from '../types/payroll';
import {
  Truck,
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  UserPlus,
  Database,
  X,
  Key,
  RefreshCw,
} from 'lucide-react';
import { SignUpView } from './SignUpView';
import {
  getStoredSupabaseUrl,
  getStoredSupabaseAnonKey,
  saveSupabaseCredentials,
  checkSupabaseConnection,
  isSupabaseConfigured,
} from '../lib/supabase';

interface LoginProps {
  employees?: Employee[];
  onSuccess?: () => void;
}

export const Login: React.FC<LoginProps> = ({ employees = [], onSuccess }) => {
  const { signIn, resetPassword, loading, error: authError, clearError } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'quick'>('login');
  const [selectedRole, setSelectedRole] = useState<UserRole>('Administrativo');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Database Connection Modal
  const [showDbModal, setShowDbModal] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState(getStoredSupabaseUrl());
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(getStoredSupabaseAnonKey());
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{ success: boolean; message: string; latency?: number } | null>(null);

  // Local form feedback
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);

  // If in SignUp Mode, render the full SignUpView component
  if (mode === 'signup') {
    return (
      <SignUpView
        onBackToLogin={() => {
          setMode('login');
          setFormError(null);
        }}
        onRegisteredSuccess={() => {
          if (onSuccess) onSuccess();
        }}
      />
    );
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    clearError();

    if (!identifier.trim()) {
      setFormError('Por favor ingrese su correo electrónico o número de cédula.');
      return;
    }

    const res = await signIn(identifier, password, selectedRole);
    if (res.success) {
      if (onSuccess) onSuccess();
    } else {
      setFormError(res.error || 'Error al verificar credenciales.');
    }
  };

  const handleQuickRoleSelect = async (role: UserRole, defaultCedula: string) => {
    setFormError(null);
    clearError();
    setSelectedRole(role);
    setIdentifier(defaultCedula);
    setPassword('sergem2026');

    const res = await signIn(defaultCedula, 'sergem2026', role);
    if (res.success && onSuccess) {
      onSuccess();
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
      setFormError('Por favor ingrese un correo electrónico corporativo válido.');
      return;
    }

    setIsSubmittingReset(true);
    const res = await resetPassword(forgotEmail.trim());
    setIsSubmittingReset(false);

    if (res.success) {
      setSuccessMessage(res.message);
    } else {
      setFormError(res.error || 'No se pudo enviar el correo de recuperación.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col justify-center py-10 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background Decorative Rings */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-800/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10 px-4">
        {/* Top Actions: DB Config */}
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={() => {
              setSupabaseUrl(getStoredSupabaseUrl());
              setSupabaseAnonKey(getStoredSupabaseAnonKey());
              setShowDbModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold shadow-xs transition-all cursor-pointer"
            title="Configurar Supabase"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Supabase DB</span>
            <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured() ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          </button>
        </div>

        {/* Brand Header */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 text-white shadow-xl shadow-red-600/30 ring-4 ring-red-500/20 mb-4 animate-in zoom-in-90 duration-300">
          <Truck className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
          SERGEM MENSAJERIA S.A.S.
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 inline" />
          <span>Sistema de Gestión y Nómina Electrónica</span>
        </p>
      </div>

      {/* Supabase Connection Modal */}
      {showDbModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 text-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-700 overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Configuración de Supabase</h3>
                  <p className="text-xs text-slate-400">Project URL y Publishable / Anon Key</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDbModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="url"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://usvxopzgpqjlrruhznmg.supabase.co"
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl font-mono text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1 flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Supabase Publishable / Anon Key</span>
                </label>
                <input
                  type="password"
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl font-mono text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {dbTestResult && (
                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  dbTestResult.success
                    ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                    : 'bg-red-950/70 border-red-500/50 text-red-200'
                }`}>
                  {dbTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span>{dbTestResult.message}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={async () => {
                  setIsTestingSupabase(true);
                  setDbTestResult(null);
                  const res = await checkSupabaseConnection(supabaseUrl, supabaseAnonKey);
                  setDbTestResult(res);
                  setIsTestingSupabase(false);
                }}
                disabled={isTestingSupabase || !supabaseUrl.trim()}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isTestingSupabase ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    <span>Probando...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Probar Conexión</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDbModal(false)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    saveSupabaseCredentials(supabaseUrl, supabaseAnonKey);
                    setShowDbModal(false);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 cursor-pointer"
                >
                  Guardar y Aplicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="bg-white/95 backdrop-blur-xl py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-white/20">
          
          {/* View Mode Switcher */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-6 text-xs font-bold">
            <button
              type="button"
              onClick={() => { setMode('login'); setFormError(null); }}
              className={`flex-1 py-2 rounded-lg transition-all text-center cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Iniciar Sesión
            </button>

            <button
              type="button"
              onClick={() => { setMode('signup'); setFormError(null); }}
              className="flex-1 py-2 rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1 text-slate-500 hover:text-slate-900"
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
              <span>Registrarse</span>
            </button>

            <button
              type="button"
              onClick={() => { setMode('quick'); setFormError(null); }}
              className={`flex-1 py-2 rounded-lg transition-all text-center cursor-pointer ${
                mode === 'quick'
                  ? 'bg-white text-red-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Acceso Rápido
            </button>
          </div>

          {/* Feedback Alerts */}
          {(formError || authError) && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200/80 flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{formError || authError}</div>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-800 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{successMessage}</div>
            </div>
          )}

          {/* MODE 1: STANDARD LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Role Selection Tabs */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Seleccione su Perfil de Acceso
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['Administrativo', 'Jefe de Zona', 'Repartidor'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSelectedRole(r)}
                      className={`py-2 px-2 text-[11px] font-bold rounded-lg border text-center transition-all cursor-pointer ${
                        selectedRole === r
                          ? 'border-red-500 bg-red-50 text-red-700 shadow-2xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {r === 'Administrativo' ? 'Admin / RRHH' : r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Identifier Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cédula o Correo Corporativo
                </label>
                <div className="relative rounded-xl shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Ej. 1144001122 o usuario@sergemsas.com"
                    className="block w-full pl-10 pr-3.5 py-2.5 text-xs text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setFormError(null); setSuccessMessage(null); }}
                    className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                  >
                    ¿Olvidó su contraseña?
                  </button>
                </div>
                <div className="relative rounded-xl shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-10 py-2.5 text-xs text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-red-600 focus:ring-red-500 h-3.5 w-3.5"
                  />
                  <span>Mantener sesión iniciada</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <span>Ingresar al Sistema</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setFormError(null); }}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer inline-flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-emerald-50 transition-all"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>¿Usuario nuevo? Crear cuenta y sincronizar en 'employees'</span>
                </button>
              </div>
            </form>
          )}

          {/* MODE 2: QUICK ROLE TEST SELECTOR */}
          {mode === 'quick' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 mb-2">
                Haga clic en cualquiera de los perfiles preconfigurados para acceder y probar los permisos RBAC:
              </p>

              <button
                type="button"
                onClick={() => handleQuickRoleSelect('Administrativo', '1144001122')}
                disabled={loading}
                className="w-full text-left p-3 rounded-2xl border border-slate-200 hover:border-red-500 hover:bg-red-50/50 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs">
                    ADM
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-red-700">Administrador / RRHH</h4>
                    <p className="text-[11px] text-slate-500">Carlos Mario Restrepo (Gestión Humana)</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-red-600 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickRoleSelect('Jefe de Zona', '1144002233')}
                disabled={loading}
                className="w-full text-left p-3 rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    ZON
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-700">Jefe de Zona Norte</h4>
                    <p className="text-[11px] text-slate-500">Andrés Felipe Gómez (Supervisor de Flota)</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickRoleSelect('Repartidor', '1144004455')}
                disabled={loading}
                className="w-full text-left p-3 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    REP
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">Repartidor Motorizado</h4>
                    <p className="text-[11px] text-slate-500">Jhonathan Alexis Ruiz (Placa WTC-45F)</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          )}

          {/* MODE 3: FORGOT PASSWORD */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div className="text-center mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-2">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Restablecer Contraseña</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Ingrese su correo electrónico registrado y le enviaremos un enlace para restaurar su acceso.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Correo Electrónico
                </label>
                <div className="relative rounded-xl shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="usuario@sergemsas.com"
                    className="block w-full pl-10 pr-3.5 py-2.5 text-xs text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setFormError(null); setSuccessMessage(null); }}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50"
                >
                  Regresar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReset}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 shadow-md shadow-red-600/20 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                >
                  {isSubmittingReset ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Enviar Enlace</span>
                </button>
              </div>
            </form>
          )}

          {/* Footer Note */}
          <div className="mt-6 pt-5 border-t border-slate-200 text-center">
            <p className="text-[11px] text-slate-400">
              SERGEM S.A.S. • NIT 900.398.712-4 • Soporte IT PBX 314 6670473
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
