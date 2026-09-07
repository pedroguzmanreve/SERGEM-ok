import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { AppUserProfile, AppRole, Employee } from '../types/payroll';
import {
  getUserProfileFromFirestore,
  saveUserProfileToFirestore,
  subscribeUserProfile
} from '../services/firestoreService';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: AppUserProfile | null;
  loading: boolean;
  error: string | null;
  currentRole: AppRole;
  isDemoUser: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string, role: AppRole) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (newRole: AppRole) => Promise<void>;
  quickLoginAsRole: (role: AppRole, employee?: Employee) => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Admin emails configured for SERGEM system administration
const ADMIN_EMAILS = [
  'pedroguzman@revesolution.net',
  'pedguzman@gmail.com',
];

export const AuthProvider: React.FC<{ children: ReactNode; employees: Employee[] }> = ({
  children,
  employees
}) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<AppUserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoUser, setIsDemoUser] = useState<boolean>(false);

  // Sync profile from Firestore or initialize
  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      setError(null);

      if (fbUser) {
        setCurrentUser(fbUser);
        setIsDemoUser(false);

        try {
          // Check existing profile in Firestore
          const existingProfile = await getUserProfileFromFirestore(fbUser.uid);

          if (existingProfile) {
            // Check if user accessed via an invitation link that specifies a role or employee
            let effectiveProfile = existingProfile;
            if (typeof window !== 'undefined') {
              const urlParams = new URLSearchParams(window.location.search);
              const urlRole = urlParams.get('role');
              const urlPortal = urlParams.get('portal');
              const urlEmpId = urlParams.get('emp_id');

              let invitedRole: AppRole | null = null;
              if (urlRole === 'Administrativo' || urlPortal === 'admin-portal') invitedRole = 'Administrativo';
              else if (urlRole === 'Jefe de Zona' || urlRole === 'Jefe de Operaciones' || urlPortal === 'zone-chief') invitedRole = 'Jefe de Zona';
              else if (urlRole === 'Repartidor' || urlPortal === 'driver-portal') invitedRole = 'Repartidor';

              if (invitedRole && existingProfile.role !== invitedRole) {
                effectiveProfile = {
                  ...existingProfile,
                  role: invitedRole,
                  ...(urlEmpId ? { employeeId: urlEmpId } : {}),
                };
                try {
                  await saveUserProfileToFirestore(effectiveProfile);
                } catch (e) {
                  console.warn('Could not update profile with invite role:', e);
                }
              }
            }

            // Sync with administrative privileges or employee records so all admins share the exact same view
            const email = fbUser.email?.toLowerCase() || '';
            const isAdminEmail = ADMIN_EMAILS.some((e) => e.toLowerCase() === email) || email.startsWith('pedguzman') || email.startsWith('pedroguzman');
            const matchedEmp = employees.find((e) => e.email?.toLowerCase() === email);

            if ((isAdminEmail || matchedEmp?.rol === 'Administrativo') && effectiveProfile.role !== 'Administrativo') {
              effectiveProfile = {
                ...effectiveProfile,
                role: 'Administrativo',
                ...(matchedEmp?.id ? { employeeId: matchedEmp.id } : {}),
              };
              try {
                await saveUserProfileToFirestore(effectiveProfile);
              } catch (e) {
                console.warn('Could not update profile with admin role:', e);
              }
            }

            setUserProfile(effectiveProfile);
          } else {
            // Determine initial role
            const email = fbUser.email?.toLowerCase() || '';
            const isAdminEmail = ADMIN_EMAILS.some((e) => e.toLowerCase() === email) || email.startsWith('pedguzman') || email.startsWith('pedroguzman');

            // Check URL parameters for explicit invitation role
            let urlRole: AppRole | null = null;
            let urlEmpId: string | null = null;
            if (typeof window !== 'undefined') {
              const urlParams = new URLSearchParams(window.location.search);
              const r = urlParams.get('role');
              const p = urlParams.get('portal');
              urlEmpId = urlParams.get('emp_id');
              if (r === 'Administrativo' || p === 'admin-portal') urlRole = 'Administrativo';
              else if (r === 'Jefe de Zona' || r === 'Jefe de Operaciones' || p === 'zone-chief') urlRole = 'Jefe de Zona';
              else if (r === 'Repartidor' || p === 'driver-portal') urlRole = 'Repartidor';
            }

            // Check if matches an existing employee or invite emp_id
            const matchedEmp = employees.find(
              (e) => (urlEmpId && e.id === urlEmpId) || (e.email?.toLowerCase() === email)
            );

            let initialRole: AppRole = urlRole || 'Repartidor';
            if (!urlRole) {
              if (isAdminEmail) {
                initialRole = 'Administrativo';
              } else if (matchedEmp) {
                if (matchedEmp.rol === 'Jefe de Zona' || matchedEmp.rol === 'Jefe de Operaciones') {
                  initialRole = 'Jefe de Zona';
                } else if (matchedEmp.rol === 'Administrativo') {
                  initialRole = 'Administrativo';
                } else {
                  initialRole = 'Repartidor';
                }
              }
            }

            const newProfile: AppUserProfile = {
              uid: fbUser.uid,
              email: fbUser.email || '',
              displayName: fbUser.displayName || email.split('@')[0] || 'Usuario SERGEM',
              role: initialRole,
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
              ...(matchedEmp?.id ? { employeeId: matchedEmp.id } : {}),
              ...(fbUser.photoURL ? { photoURL: fbUser.photoURL } : {}),
              ...(matchedEmp?.cedula ? { cedula: matchedEmp.cedula } : {}),
              ...(matchedEmp?.telefono ? { telefono: matchedEmp.telefono } : {}),
            };

            await saveUserProfileToFirestore(newProfile);
            setUserProfile(newProfile);
          }

          // Live subscribe to any profile changes
          unsubscribeProfile = subscribeUserProfile(fbUser.uid, (updated) => {
            if (updated) setUserProfile(updated);
          });
        } catch (err) {
          console.warn('Error handling user profile in Firestore:', err);
        }
      } else {
        if (!isDemoUser) {
          setCurrentUser(null);
          setUserProfile(null);
        }
      }

      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, [employees]);

  // Google Login
  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Error signing in with Google:', err);
      // Friendly message for popup blockers / iframe constraints
      if (err.code === 'auth/popup-blocked') {
        setError('El navegador bloqueó la ventana emergente de Google. Por favor habilita las ventanas emergentes o inicia sesión con correo y contraseña.');
      } else if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        setError('Inicio de sesión cancelado.');
      } else {
        setError(err.message || 'Error al iniciar sesión con Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Email Login
  const loginWithEmail = async (email: string, pass: string) => {
    try {
      setLoading(true);
      setError(null);
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      console.error('Error signing in with email:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Credenciales inválidas. Verifica tu correo y contraseña.');
      } else {
        setError(err.message || 'Error al autenticar usuario.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Register with Email
  const registerWithEmail = async (email: string, pass: string, name: string, role: AppRole) => {
    try {
      setLoading(true);
      setError(null);
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(res.user, { displayName: name });

      const newProfile: AppUserProfile = {
        uid: res.user.uid,
        email: email,
        displayName: name,
        role: role,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };

      await saveUserProfileToFirestore(newProfile);
      setUserProfile(newProfile);
    } catch (err: any) {
      console.error('Error creating user with email:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('El proveedor Correo/Contraseña (Email/Password) debe estar habilitado en Firebase Console > Authentication > Sign-in method. También puedes ingresar con Google.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este correo ya se encuentra registrado. Inicia sesión directamente.');
      } else if (err.code === 'auth/weak-password') {
        setError('La contraseña debe tener al menos 6 caracteres.');
      } else {
        setError(err.message || 'Error al registrar usuario.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Switch Role
  const switchRole = async (newRole: AppRole) => {
    if (userProfile) {
      const updated = { ...userProfile, role: newRole };
      setUserProfile(updated);
      if (!isDemoUser && currentUser) {
        try {
          await saveUserProfileToFirestore(updated);
        } catch (e) {
          console.warn('Could not save role update:', e);
        }
      }
    }
  };

  // Quick Login / Role Simulator (Ideal for testing and previewing each role instantly)
  const quickLoginAsRole = (role: AppRole, employee?: Employee) => {
    setIsDemoUser(true);
    setError(null);

    const defaultNames: Record<AppRole, string> = {
      'Administrativo': 'Pedro Guzmán (Administrador)',
      'Jefe de Zona': 'Carlos Restrepo (Jefe Zona Norte)',
      'Repartidor': 'Andrés Felipe Morales (Repartidor Principal)',
    };

    const mockProfile: AppUserProfile = {
      uid: `role-user-${role.toLowerCase().replace(/\s+/g, '-')}`,
      email: employee?.email || (role === 'Administrativo' ? 'pedroguzman@revesolution.net' : `${role.toLowerCase().replace(/\s+/g, '')}@sergem.com.co`),
      displayName: employee ? `${employee.nombre} ${employee.apellido}` : defaultNames[role],
      role: role,
      ...(employee?.id || role === 'Repartidor' ? { employeeId: employee?.id || 'emp-001' } : {}),
      ...(employee?.cedula || role === 'Repartidor' ? { cedula: employee?.cedula || '1017123456' } : {}),
      telefono: employee?.telefono || '3001234567',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };

    setUserProfile(mockProfile);
    setLoading(false);
  };

  // Logout
  const logout = async () => {
    try {
      setLoading(true);
      if (!isDemoUser) {
        await fbSignOut(auth);
      }
      setCurrentUser(null);
      setUserProfile(null);
      setIsDemoUser(false);
    } catch (err: any) {
      console.error('Error logging out:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentRole: AppRole = userProfile?.role || 'Administrativo';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        error,
        currentRole,
        isDemoUser,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        logout,
        switchRole,
        quickLoginAsRole,
        clearError: () => setError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
