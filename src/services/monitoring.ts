/**
 * ==============================================================================
 * SERGEM MENSAJERÍA S.A.S. — SRE & SYSTEM HEALTH MONITORING UTILITIES
 * ==============================================================================
 * Realtime health metrics, network latency monitoring, and database heartbeat
 * checks for production reliability and uptime assurance.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { telemetry } from './telemetry';

export interface SystemHealthReport {
  timestamp: string;
  status: 'healthy' | 'degraded' | 'offline';
  database: {
    connected: boolean;
    latencyMs: number;
    error?: string;
  };
  storage: {
    available: boolean;
    error?: string;
  };
  realtime: {
    status: 'connected' | 'connecting' | 'disconnected';
  };
  client: {
    online: boolean;
    memoryUsageMb?: number;
    userAgent: string;
  };
}

export class MonitoringService {
  /**
   * Performs an end-to-end health probe against Supabase PostgreSQL and Storage
   */
  public static async runHealthCheck(): Promise<SystemHealthReport> {
    const start = performance.now();
    let dbConnected = false;
    let latencyMs = 0;
    let dbError: string | undefined;

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('company_settings').select('id').limit(1);
        latencyMs = Math.round(performance.now() - start);
        dbConnected = !error;
        if (error) dbError = error.message;
      } catch (err) {
        latencyMs = Math.round(performance.now() - start);
        dbConnected = false;
        dbError = err instanceof Error ? err.message : 'Unknown connection failure';
      }
    }

    const report: SystemHealthReport = {
      timestamp: new Date().toISOString(),
      status: dbConnected ? (latencyMs > 1500 ? 'degraded' : 'healthy') : 'offline',
      database: {
        connected: dbConnected,
        latencyMs,
        error: dbError,
      },
      storage: {
        available: isSupabaseConfigured(),
      },
      realtime: {
        status: dbConnected ? 'connected' : 'disconnected',
      },
      client: {
        online: typeof navigator !== 'undefined' ? navigator.onLine : true,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
        memoryUsageMb:
          typeof performance !== 'undefined' && (performance as any).memory
            ? Math.round((performance as any).memory.usedJSHeapSize / (1024 * 1024))
            : undefined,
      },
    };

    telemetry.addBreadcrumb({
      category: 'system',
      message: `Health probe: ${report.status} (DB Latency: ${latencyMs}ms)`,
      data: report as unknown as Record<string, unknown>,
      level: report.status === 'healthy' ? 'info' : 'warn',
    });

    return report;
  }

  /**
   * Periodic network connectivity listeners
   */
  public static initNetworkListeners(onStatusChange?: (online: boolean) => void): () => void {
    const handleOnline = () => {
      telemetry.addBreadcrumb({
        category: 'system',
        message: 'Conectividad a Internet restablecida',
        level: 'info',
      });
      onStatusChange?.(true);
    };

    const handleOffline = () => {
      telemetry.addBreadcrumb({
        category: 'system',
        message: 'Conectividad a Internet perdida. Modo sin conexión activado',
        level: 'warn',
      });
      onStatusChange?.(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }
}
