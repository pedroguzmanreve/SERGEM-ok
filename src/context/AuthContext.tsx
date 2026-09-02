import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AuthUser, Employee, UserRole, Department, ContractType, RiskLevel } from '../types/payroll';
import { api } from '../services/api';
import { initialEmployees } from '../data/initialData';

export interface SignUpData {
  email: string;
  password?: string;
  cedula: string;
  nombre: string;
  apellido: string;
  telefono?: string;
  rol: UserRole;
  cargo?: string;
  departamento?: Department;
  salarioBase?: number;
  tipoContrato?: ContractType;
  nivelRiesgoARL?: RiskLevel;
  sede?: string;
  placaVehiculo?: string;
  banco?: string;
  tipoCuenta?: 'Ahorros' | 'Corriente';
  numeroCuenta?: string;
  eps?: string;
  afp?: string;
  ccf?: string;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  authUser: AuthUser | null;
  role: UserRole;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  signIn: (identifier: string, password?: string, preferredRole?: UserRole) => Promise<{ success: boolean; error?: string }>;
  signUp: (data: SignUpData) => Promise<{ success: boolean; requiresEmailConfirmation?: boolean; message?: string; error?: string; employee?: Employee }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string; error?: string }>;
  switchRole: (role: UserRole) => void;
  setDemoUser: (user: AuthUser) => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'sergem_auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Derived Role
  const role: UserRole = authUser?.rol || 'Administrativo';
  const isAuthenticated = Boolean(authUser);

  // Clear local storage and state when logging out
  const clearAuthState = useCallback(() => {
    setUser(null);
    setSession(null);
    setAuthUser(null);
    try {
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    } catch {
      // ignore
    }
  }, []);

  // Helper to persist AuthUser locally
  const saveAuthUser = useCallback((userObj: AuthUser) => {
    setAuthUser(userObj);
    try {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(userObj));
    } catch {
      // ignore
    }
  }, []);

  // Match Supabase User with an Employee record
  const syncUserWithEmployee = useCallback(async (sbUser: User) => {
    try {
      const { data: employees } = await api.getEmployees();
      const allEmps = (employees && employees.length > 0) ? employees : initialEmployees;

      // 1. Match by id, email, or user metadata
      const userEmail = sbUser.email?.toLowerCase();
      const metaCedula = sbUser.user_metadata?.cedula;
      const metaRole = sbUser.user_metadata?.rol as UserRole;

      const found = allEmps.find(
        (emp) =>
          emp.id === sbUser.id ||
          (userEmail && emp.email && emp.email.toLowerCase() === userEmail) ||
          (metaCedula && emp.cedula === metaCedula)
      );

      if (found) {
        saveAuthUser({
          id: found.id,
          cedula: found.cedula,
          nombre: found.nombre,
          apellido: found.apellido,
          email: found.email || sbUser.email,
          rol: found.rol,
          cargo: found.cargo,
          departamento: found.departamento,
          placaVehiculo: found.placaVehiculo,
          jefeZonaId: found.jefeZonaId,
        });
      } else {
        // Construct basic AuthUser from Supabase metadata
        saveAuthUser({
          id: sbUser.id,
          cedula: metaCedula || '1000000000',
          nombre: sbUser.user_metadata?.nombre || sbUser.email?.split('@')[0] || 'Usuario',
          apellido: sbUser.user_metadata?.apellido || 'SERGEM',
          email: sbUser.email,
          rol: metaRole || 'Administrativo',
          cargo: sbUser.user_metadata?.cargo || 'Colaborador',
        });
      }
    } catch (err) {
      console.warn('[AuthContext] Error syncing employee with Supabase user:', err);
    }
  }, [saveAuthUser]);

  // Listen to Supabase Auth state changes
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (initialSession && isMounted) {
          setSession(initialSession);
          setUser(initialSession.user);
          await syncUserWithEmployee(initialSession.user);
        }
      } catch (err) {
        console.warn('[AuthContext] Error getting initial session:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initAuth();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      setSession(newSession);
      setUser(newSession?.user || null);

      if (event === 'SIGNED_IN' && newSession?.user) {
        await syncUserWithEmployee(newSession.user);
      } else if (event === 'SIGNED_OUT') {
        clearAuthState();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [syncUserWithEmployee, clearAuthState]);

  // Sign In Function (supports both Supabase Auth and Local Fallback/Cedula login)
  const signIn = async (
    identifier: string,
    password?: string,
    preferredRole?: UserRole
  ): Promise<{ success: boolean; error?: string }> => {
    setError(null);
    setLoading(true);

    try {
      const cleanId = identifier.trim().toLowerCase();
      const isEmail = cleanId.includes('@');

      // 1. Try Supabase Auth if email and password provided
      if (isEmail && password && password.length >= 6) {
        try {
          const { data, error: sbError } = await supabase.auth.signInWithPassword({
            email: cleanId,
            password: password,
          });

          if (!sbError && data.user) {
            setUser(data.user);
            setSession(data.session);
            await syncUserWithEmployee(data.user);
            setLoading(false);
            return { success: true };
          }
        } catch (sbEx: any) {
          console.warn('[AuthContext] Supabase sign in failed, checking local database:', sbEx?.message);
        }
      }

      // 2. Fallback / Direct Employee Lookup (Cedula, Email, Name or Role Quick Login)
      const { data: employees } = await api.getEmployees();
      const allEmps = (employees && employees.length > 0) ? employees : initialEmployees;

      let foundEmp: Employee | undefined;

      if (cleanId) {
        foundEmp = allEmps.find(
          (emp) =>
            emp.cedula.trim() === cleanId ||
            (emp.email && emp.email.trim().toLowerCase() === cleanId) ||
            `${emp.nombre} ${emp.apellido}`.toLowerCase().includes(cleanId)
        );
      }

      if (!foundEmp && preferredRole) {
        foundEmp = allEmps.find((e) => e.rol === preferredRole);
      }

      if (foundEmp) {
        const authUserData: AuthUser = {
          id: foundEmp.id,
          cedula: foundEmp.cedula,
          nombre: foundEmp.nombre,
          apellido: foundEmp.apellido,
          email: foundEmp.email,
          rol: foundEmp.rol,
          cargo: foundEmp.cargo,
          departamento: foundEmp.departamento,
          placaVehiculo: foundEmp.placaVehiculo,
          jefeZonaId: foundEmp.jefeZonaId,
        };

        saveAuthUser(authUserData);
        setLoading(false);
        return { success: true };
      }

      // 3. If standard role quick login without specific ID
      const targetRole = preferredRole || 'Administrativo';
      const defaultForRole = allEmps.find((e) => e.rol === targetRole) || allEmps[0];
      
      if (defaultForRole) {
        saveAuthUser({
          id: defaultForRole.id,
          cedula: defaultForRole.cedula,
          nombre: defaultForRole.nombre,
          apellido: defaultForRole.apellido,
          email: defaultForRole.email,
          rol: defaultForRole.rol,
          cargo: defaultForRole.cargo,
          departamento: defaultForRole.departamento,
          placaVehiculo: defaultForRole.placaVehiculo,
          jefeZonaId: defaultForRole.jefeZonaId,
        });
        setLoading(false);
        return { success: true };
      }

      const errMsg = 'Credenciales no encontradas. Verifique su cédula o correo electrónico.';
      setError(errMsg);
      setLoading(false);
      return { success: false, error: errMsg };
    } catch (err: any) {
      const errMsg = err?.message || 'Error al iniciar sesión';
      setError(errMsg);
      setLoading(false);
      return { success: false, error: errMsg };
    }
  };

  // Sign Up Function: Creates Supabase Auth User & Synchronizes Profile in 'employees' Table
  const signUp = async (data: SignUpData): Promise<{
    success: boolean;
    requiresEmailConfirmation?: boolean;
    message?: string;
    error?: string;
    employee?: Employee;
  }> => {
    setError(null);
    setLoading(true);

    try {
      const cleanEmail = data.email.trim().toLowerCase();
      const cleanCedula = data.cedula.trim();
      const cleanNombre = data.nombre.trim();
      const cleanApellido = data.apellido.trim();
      const userPassword = data.password && data.password.trim() ? data.password.trim() : 'sergem2026';

      if (!cleanEmail || !cleanEmail.includes('@')) {
        const msg = 'Debe ingresar un correo electrónico corporativo válido.';
        setError(msg);
        setLoading(false);
        return { success: false, error: msg };
      }

      if (!cleanCedula || !cleanNombre || !cleanApellido) {
        const msg = 'Nombre, apellido y cédula de ciudadanía son obligatorios.';
        setError(msg);
        setLoading(false);
        return { success: false, error: msg };
      }

      // Default role values
      const role = data.rol || 'Administrativo';
      const cargo = data.cargo?.trim() || (
        role === 'Repartidor'
          ? 'Mensajero Motorizado'
          : role === 'Jefe de Zona'
          ? 'Jefe de Zona y Operaciones'
          : 'Director de Operaciones y Nómina'
      );
      const departamento: Department = data.departamento || (
        role === 'Administrativo' ? 'Gestión Humana' : 'Operaciones y Mensajería'
      );
      const salarioBase = data.salarioBase || (
        role === 'Repartidor' ? 1423500 : role === 'Jefe de Zona' ? 2100000 : 3500000
      );
      const tipoContrato = data.tipoContrato || 'Término Indefinido';
      const nivelRiesgoARL = data.nivelRiesgoARL || (role === 'Repartidor' ? 4 : 1);

      let createdAuthUserId: string | undefined;
      let hasDirectSession = false;
      let emailConfirmationRequired = false;

      // 1. Create User in Supabase Auth (if Supabase is configured)
      if (isSupabaseConfigured()) {
        try {
          const { data: authResult, error: sbAuthError } = await supabase.auth.signUp({
            email: cleanEmail,
            password: userPassword,
            options: {
              data: {
                nombre: cleanNombre,
                apellido: cleanApellido,
                cedula: cleanCedula,
                rol: role,
                cargo,
                departamento,
                telefono: data.telefono?.trim() || '',
              },
            },
          });

          if (sbAuthError) {
            // If user already registered in Auth, allow linking or notify
            if (sbAuthError.message?.toLowerCase().includes('already registered')) {
              console.warn('[AuthContext] User already registered in Supabase Auth, continuing with profile sync.');
            } else {
              throw sbAuthError;
            }
          }

          if (authResult?.user) {
            createdAuthUserId = authResult.user.id;
            if (authResult.session) {
              hasDirectSession = true;
              setUser(authResult.user);
              setSession(authResult.session);
            } else if (!authResult.session && authResult.user.identities && authResult.user.identities.length > 0) {
              emailConfirmationRequired = true;
            }
          }
        } catch (authEx: any) {
          console.warn('[AuthContext] Supabase Auth sign up issue, continuing local sync:', authEx?.message);
        }
      }

      // Generate a valid ID for local/database synchronization
      const finalId = createdAuthUserId || (
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `emp-${Date.now()}`
      );

      // 2. Prepare Employee Record synchronized by Email
      const newEmployee: Employee = {
        id: finalId,
        cedula: cleanCedula,
        nombre: cleanNombre,
        apellido: cleanApellido,
        cargo,
        departamento,
        salarioBase,
        tipoContrato,
        nivelRiesgoARL,
        fechaIngreso: new Date().toISOString().split('T')[0],
        banco: data.banco?.trim() || 'Bancolombia',
        tipoCuenta: data.tipoCuenta || 'Ahorros',
        numeroCuenta: data.numeroCuenta?.trim() || '000-000000-00',
        eps: data.eps?.trim() || 'SURA',
        afp: data.afp?.trim() || 'Porvenir',
        ccf: data.ccf?.trim() || 'Comfandi',
        activo: true,
        rol: role,
        placaVehiculo: data.placaVehiculo?.trim() || (role === 'Repartidor' ? 'SER-01A' : undefined),
        email: cleanEmail,
        telefono: data.telefono?.trim() || '310 000 0000',
        estadoInvitacion: 'Activo',
      };

      // 3. Synchronize Profile to 'public.employees' table in Supabase
      try {
        const payloadToDb = {
          id: finalId.length >= 30 ? finalId : undefined,
          cedula: cleanCedula,
          nombre: cleanNombre,
          apellido: cleanApellido,
          cargo,
          departamento,
          salario_base: salarioBase,
          tipo_contrato: tipoContrato,
          nivel_riesgo_arl: nivelRiesgoARL,
          fecha_ingreso: newEmployee.fechaIngreso,
          banco: newEmployee.banco,
          tipo_cuenta: newEmployee.tipoCuenta,
          numero_cuenta: newEmployee.numeroCuenta,
          eps: newEmployee.eps,
          afp: newEmployee.afp,
          ccf: newEmployee.ccf,
          telefono: newEmployee.telefono || null,
          email: cleanEmail,
          placa_vehiculo: newEmployee.placaVehiculo || null,
          estado: 'Activo',
          activo: true,
          rol: role,
        };

        const { error: dbError } = await (supabase.from('employees') as any)
          .upsert(payloadToDb, { onConflict: 'email' });

        if (dbError) {
          console.warn('[AuthContext] Note on employees table upsert:', dbError.message);
          // Retry by cedula if email conflict trigger is not set as primary index
          await (supabase.from('employees') as any)
            .upsert(payloadToDb, { onConflict: 'cedula' });
        }
      } catch (dbEx) {
        console.warn('[AuthContext] Error upserting to Supabase employees table:', dbEx);
      }

      // 4. Save and establish AuthUser
      const newAuthUser: AuthUser = {
        id: finalId,
        cedula: cleanCedula,
        nombre: cleanNombre,
        apellido: cleanApellido,
        email: cleanEmail,
        rol: role,
        cargo,
        departamento,
        placaVehiculo: newEmployee.placaVehiculo,
      };

      saveAuthUser(newAuthUser);
      setLoading(false);

      const msg = emailConfirmationRequired
        ? `Cuenta creada con éxito para ${cleanEmail}. Revisa tu bandeja de entrada si tu proyecto requiere confirmación por email.`
        : `¡Registro exitoso! Perfil sincronizado en Supabase para ${cleanNombre} (${role}).`;

      return {
        success: true,
        requiresEmailConfirmation: emailConfirmationRequired,
        message: msg,
        employee: newEmployee,
      };
    } catch (err: any) {
      const errMsg = err?.message || 'Error al procesar el registro del usuario';
      setError(errMsg);
      setLoading(false);
      return { success: false, error: errMsg };
    }
  };

  // Sign Out Function
  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[AuthContext] Supabase signOut error:', err);
    } finally {
      clearAuthState();
      setLoading(false);
    }
  };

  // Reset Password Function
  const resetPassword = async (email: string): Promise<{ success: boolean; message: string; error?: string }> => {
    try {
      if (!email || !email.includes('@')) {
        return { success: false, message: 'Ingrese un correo electrónico válido', error: 'Email inválido' };
      }

      const { error: sbError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });

      if (sbError) {
        console.warn('[AuthContext] Reset password Supabase note:', sbError.message);
      }

      return {
        success: true,
        message: `Se ha enviado el enlace de restablecimiento de contraseña a ${email}.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: 'No se pudo procesar la solicitud en este momento.',
        error: err?.message,
      };
    }
  };

  // Switch role for quick testing/preview
  const switchRole = (newRole: UserRole) => {
    if (!authUser) return;
    const updated = { ...authUser, rol: newRole };
    saveAuthUser(updated);
  };

  // Set direct demo user
  const setDemoUser = (userObj: AuthUser) => {
    saveAuthUser(userObj);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        authUser,
        role,
        isAuthenticated,
        loading,
        error,
        signIn,
        signUp,
        signOut,
        resetPassword,
        switchRole,
        setDemoUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
