import { describe, it, expect, vi, beforeEach } from 'vitest';
import { telemetry } from '../../services/telemetry';
import { MonitoringService } from '../../services/monitoring';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
  isSupabaseConfigured: () => true,
}));

describe('Telemetry & Monitoring Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records breadcrumbs and retrieves them on error capture', () => {
    telemetry.addBreadcrumb({
      category: 'navigation',
      message: 'Usuario navegó a portal de administración',
      level: 'info',
    });

    const errorEvent = telemetry.captureException(new Error('Test runtime error'), {
      componentStack: 'in AdminPortalView',
    });

    expect(errorEvent.id).toBeDefined();
    expect(errorEvent.message).toBe('Test runtime error');
    expect(errorEvent.breadcrumbs.length).toBeGreaterThan(0);
    expect(errorEvent.breadcrumbs.some((b) => b.message.includes('portal de administración'))).toBe(true);
  });

  it('sets user context in telemetry events', () => {
    telemetry.setUser({
      id: 'usr-101',
      rol: 'Administrativo',
      email: 'admin@sergem.com',
    });

    const errorEvent = telemetry.captureException(new Error('Auth context error'));
    expect(errorEvent.user?.id).toBe('usr-101');
    expect(errorEvent.user?.rol).toBe('Administrativo');
  });

  it('runs system health check and benchmarks database latency', async () => {
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({
          data: [{ id: '1' }],
          error: null,
        }),
      }),
    });

    const health = await MonitoringService.runHealthCheck();
    expect(health.status).toBe('healthy');
    expect(health.database.connected).toBe(true);
    expect(health.storage.available).toBe(true);
    expect(health.database.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
