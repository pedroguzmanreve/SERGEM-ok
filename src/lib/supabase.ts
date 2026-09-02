import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

const STORAGE_KEY_URL = 'SERGEM_SUPABASE_URL';
const STORAGE_KEY_KEY = 'SERGEM_SUPABASE_ANON_KEY';

export const DEFAULT_SUPABASE_URL = 'https://usvxopzgpqjlrruhznmg.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzdnhvcHpncHFqbHJydWh6bm1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMDMyMzEsImV4cCI6MjEwMzc3OTIzMX0.eMBZJHDSoP2QhmJfWZD3_mRrdOqO3Tjz7jFS_pW1Irs';

/**
 * Obtiene la URL configurada de Supabase (prioriza .env, luego localStorage, luego producción por defecto)
 */
export const getStoredSupabaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  if (
    envUrl && 
    envUrl.trim() && 
    envUrl !== 'https://tu-proyecto.supabase.co' && 
    envUrl !== 'https://placeholder.supabase.co'
  ) {
    return envUrl.trim();
  }

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY_URL);
    if (
      saved && 
      saved.trim() && 
      saved !== 'https://tu-proyecto.supabase.co' && 
      saved !== 'https://placeholder.supabase.co'
    ) {
      return saved.trim();
    }
  }

  return DEFAULT_SUPABASE_URL;
};

/**
 * Obtiene la Anon / Publishable Key de Supabase (prioriza .env, luego localStorage, luego producción por defecto)
 */
export const getStoredSupabaseAnonKey = (): string => {
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (
    envKey && 
    envKey.trim() && 
    envKey !== 'tu-anon-key-aqui' && 
    !envKey.startsWith('placeholder-')
  ) {
    return envKey.trim();
  }

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY_KEY);
    if (
      saved && 
      saved.trim() && 
      saved !== 'tu-anon-key-aqui' && 
      !saved.startsWith('placeholder-')
    ) {
      return saved.trim();
    }
  }

  return DEFAULT_SUPABASE_ANON_KEY;
};

let currentClient: SupabaseClient<Database> = createClient<Database>(
  getStoredSupabaseUrl(),
  getStoredSupabaseAnonKey(),
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

/**
 * Proxy exportado de Supabase para permitir actualización dinámica del cliente
 * sin necesidad de reiniciar la aplicación ni romper referencias importadas.
 */
export const supabase: SupabaseClient<Database> = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    return (currentClient as any)[prop];
  },
});

/**
 * Valida si la instancia actual de Supabase cuenta con credenciales válidas
 */
export const isSupabaseConfigured = (): boolean => {
  const url = getStoredSupabaseUrl();
  const key = getStoredSupabaseAnonKey();
  return Boolean(
    url &&
    key &&
    url !== 'https://tu-proyecto.supabase.co' &&
    url !== 'https://placeholder.supabase.co' &&
    key !== 'tu-anon-key-aqui' &&
    !key.startsWith('placeholder-')
  );
};

/**
 * Guarda las credenciales de Supabase en el almacenamiento local y reinicializa el cliente
 */
export const saveSupabaseCredentials = (url: string, anonKey: string): boolean => {
  const cleanUrl = url.trim();
  const cleanKey = anonKey.trim();

  if (typeof window !== 'undefined') {
    if (cleanUrl) {
      localStorage.setItem(STORAGE_KEY_URL, cleanUrl);
    } else {
      localStorage.removeItem(STORAGE_KEY_URL);
    }

    if (cleanKey) {
      localStorage.setItem(STORAGE_KEY_KEY, cleanKey);
    } else {
      localStorage.removeItem(STORAGE_KEY_KEY);
    }
  }

  // Re-crear cliente con las nuevas credenciales
  currentClient = createClient<Database>(
    cleanUrl || DEFAULT_SUPABASE_URL,
    cleanKey || DEFAULT_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    }
  );

  return isSupabaseConfigured();
};

/**
 * Realiza una prueba de ping/conexión al backend de Supabase
 * y notifica en la consola y al invocador el estado de la conexión.
 */
export const checkSupabaseConnection = async (testUrl?: string, testKey?: string): Promise<{ success: boolean; latency: number; message: string }> => {
  const clientToTest = (testUrl && testKey)
    ? createClient<Database>(testUrl.trim(), testKey.trim())
    : currentClient;

  const url = testUrl ? testUrl.trim() : getStoredSupabaseUrl();
  const key = testKey ? testKey.trim() : getStoredSupabaseAnonKey();

  if (!url || !key || url === 'https://placeholder.supabase.co' || key.startsWith('placeholder-')) {
    return {
      success: false,
      latency: 0,
      message: 'Falta configurar la Project URL o la Publishable / Anon Key.',
    };
  }

  try {
    const startTime = Date.now();
    const { error } = await clientToTest.from('company_settings').select('nit').limit(1);
    const latency = Date.now() - startTime;

    if (error) {
      const isExpectedSchemaState =
        error.code === 'PGRST205' ||
        error.code === '42P01' ||
        error.message?.toLowerCase().includes('not found') ||
        error.message?.toLowerCase().includes('does not exist') ||
        error.code === 'PGRST301' ||
        error.code === 'PGRST116';

      if (isExpectedSchemaState) {
        return {
          success: true,
          latency,
          message: `Conexión exitosa a Supabase (${latency}ms). Endpoint respondiendo correctamente.`,
        };
      }

      return {
        success: false,
        latency,
        message: `Servidor contactado con advertencia: ${error.message} (${error.code || 'sin código'})`,
      };
    }

    return {
      success: true,
      latency,
      message: `Conexión exitosa a Supabase (${latency}ms). Tablas y datos accesibles.`,
    };
  } catch (err: any) {
    return {
      success: false,
      latency: 0,
      message: `Error de conexión: ${err?.message || 'No se pudo contactar el servidor.'}`,
    };
  }
};