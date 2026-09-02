import { useEffect, useState, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  mapCompanySettingsFromDb,
  mapEmployeeFromDb,
  mapPeriodFromDb,
  mapScheduleFromDb,
  mapZoneNovedadFromDb,
  mapClientReportFromDb,
  mapDailyAttendanceFromDb,
} from '../services/api';

export type RealtimeConnectionStatus = 'SUBSCRIBED' | 'CONNECTING' | 'CLOSED' | 'CHANNEL_ERROR' | 'OFFLINE';

export interface RealtimeEventPayload<T = any> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  new: T;
  old: T;
  timestamp: string;
}

export interface UseRealtimeOptions {
  enabled?: boolean;
  onAttendanceChange?: (payload: RealtimeEventPayload) => void;
  onScheduleChange?: (payload: RealtimeEventPayload) => void;
  onZoneNovedadChange?: (payload: RealtimeEventPayload) => void;
  onClientReportChange?: (payload: RealtimeEventPayload) => void;
  onEmployeeChange?: (payload: RealtimeEventPayload) => void;
  onPayrollPeriodChange?: (payload: RealtimeEventPayload) => void;
  onCompanySettingsChange?: (payload: RealtimeEventPayload) => void;
  onEmployeeNovedadesChange?: (payload: RealtimeEventPayload) => void;
  onAnyChange?: (event: RealtimeEventPayload) => void;
}

/**
 * Custom Hook para suscripción reactiva en tiempo real a Supabase Realtime
 * Escucha cambios INSERT, UPDATE y DELETE en las tablas operativas de SERGEM S.A.S.
 */
export function useRealtime({
  enabled = true,
  onAttendanceChange,
  onScheduleChange,
  onZoneNovedadChange,
  onClientReportChange,
  onEmployeeChange,
  onPayrollPeriodChange,
  onCompanySettingsChange,
  onEmployeeNovedadesChange,
  onAnyChange,
}: UseRealtimeOptions = {}) {
  const [status, setStatus] = useState<RealtimeConnectionStatus>('CONNECTING');
  const [lastEvent, setLastEvent] = useState<RealtimeEventPayload | null>(null);
  const [eventCount, setEventCount] = useState<number>(0);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Memoized handlers using refs to avoid re-subscribing on every callback change
  const callbacksRef = useRef({
    onAttendanceChange,
    onScheduleChange,
    onZoneNovedadChange,
    onClientReportChange,
    onEmployeeChange,
    onPayrollPeriodChange,
    onCompanySettingsChange,
    onEmployeeNovedadesChange,
    onAnyChange,
  });

  useEffect(() => {
    callbacksRef.current = {
      onAttendanceChange,
      onScheduleChange,
      onZoneNovedadChange,
      onClientReportChange,
      onEmployeeChange,
      onPayrollPeriodChange,
      onCompanySettingsChange,
      onEmployeeNovedadesChange,
      onAnyChange,
    };
  }, [
    onAttendanceChange,
    onScheduleChange,
    onZoneNovedadChange,
    onClientReportChange,
    onEmployeeChange,
    onPayrollPeriodChange,
    onCompanySettingsChange,
    onEmployeeNovedadesChange,
    onAnyChange,
  ]);

  const handlePostgresChange = useCallback((payload: any) => {
    const table = payload.table;
    const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
    const timestamp = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const eventData: RealtimeEventPayload = {
      eventType,
      table,
      new: payload.new,
      old: payload.old,
      timestamp,
    };

    setLastEvent(eventData);
    setEventCount((prev) => prev + 1);

    // Trigger universal listener
    if (callbacksRef.current.onAnyChange) {
      callbacksRef.current.onAnyChange(eventData);
    }

    // Specific Table Callbacks
    switch (table) {
      case 'daily_attendances':
        if (callbacksRef.current.onAttendanceChange) {
          const mappedNew = payload.new ? mapDailyAttendanceFromDb(payload.new) : null;
          const mappedOld = payload.old ? mapDailyAttendanceFromDb(payload.old) : null;
          callbacksRef.current.onAttendanceChange({ ...eventData, new: mappedNew, old: mappedOld });
        }
        break;

      case 'weekly_schedules':
        if (callbacksRef.current.onScheduleChange) {
          const mappedNew = payload.new ? mapScheduleFromDb(payload.new) : null;
          const mappedOld = payload.old ? mapScheduleFromDb(payload.old) : null;
          callbacksRef.current.onScheduleChange({ ...eventData, new: mappedNew, old: mappedOld });
        }
        break;

      case 'zone_novedades':
        if (callbacksRef.current.onZoneNovedadChange) {
          const mappedNew = payload.new ? mapZoneNovedadFromDb(payload.new) : null;
          const mappedOld = payload.old ? mapZoneNovedadFromDb(payload.old) : null;
          callbacksRef.current.onZoneNovedadChange({ ...eventData, new: mappedNew, old: mappedOld });
        }
        break;

      case 'client_order_reports':
        if (callbacksRef.current.onClientReportChange) {
          const mappedNew = payload.new ? mapClientReportFromDb(payload.new) : null;
          const mappedOld = payload.old ? mapClientReportFromDb(payload.old) : null;
          callbacksRef.current.onClientReportChange({ ...eventData, new: mappedNew, old: mappedOld });
        }
        break;

      case 'employees':
        if (callbacksRef.current.onEmployeeChange) {
          const mappedNew = payload.new ? mapEmployeeFromDb(payload.new) : null;
          const mappedOld = payload.old ? mapEmployeeFromDb(payload.old) : null;
          callbacksRef.current.onEmployeeChange({ ...eventData, new: mappedNew, old: mappedOld });
        }
        break;

      case 'payroll_periods':
        if (callbacksRef.current.onPayrollPeriodChange) {
          const mappedNew = payload.new ? mapPeriodFromDb(payload.new) : null;
          const mappedOld = payload.old ? mapPeriodFromDb(payload.old) : null;
          callbacksRef.current.onPayrollPeriodChange({ ...eventData, new: mappedNew, old: mappedOld });
        }
        break;

      case 'company_settings':
        if (callbacksRef.current.onCompanySettingsChange) {
          const mappedNew = payload.new ? mapCompanySettingsFromDb(payload.new) : null;
          const mappedOld = payload.old ? mapCompanySettingsFromDb(payload.old) : null;
          callbacksRef.current.onCompanySettingsChange({ ...eventData, new: mappedNew, old: mappedOld });
        }
        break;

      case 'employee_novedades':
        if (callbacksRef.current.onEmployeeNovedadesChange) {
          callbacksRef.current.onEmployeeNovedadesChange(eventData);
        }
        break;

      default:
        break;
    }
  }, []);

  // Initialize and tear down channel
  useEffect(() => {
    if (!enabled) {
      setStatus('OFFLINE');
      return;
    }

    setStatus('CONNECTING');

    const channelName = `sergem-realtime-${Date.now()}`;
    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    // Listen to changes on public schema
    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_attendances' },
        handlePostgresChange
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'weekly_schedules' },
        handlePostgresChange
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'zone_novedades' },
        handlePostgresChange
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'client_order_reports' },
        handlePostgresChange
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'employees' },
        handlePostgresChange
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payroll_periods' },
        handlePostgresChange
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'company_settings' },
        handlePostgresChange
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'employee_novedades' },
        handlePostgresChange
      )
      .subscribe((subStatus) => {
        if (subStatus === 'SUBSCRIBED') {
          setStatus('SUBSCRIBED');
          console.log('[SERGEM Realtime] 🟢 Canal en tiempo real conectado activamente.');
        } else if (subStatus === 'CLOSED') {
          setStatus('CLOSED');
        } else if (subStatus === 'CHANNEL_ERROR') {
          setStatus('CHANNEL_ERROR');
          console.warn('[SERGEM Realtime] ⚠️ Error en canal en tiempo real.');
        }
      });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [enabled, handlePostgresChange]);

  const reconnect = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    setStatus('CONNECTING');
  }, []);

  return {
    status,
    isConnected: status === 'SUBSCRIBED',
    lastEvent,
    eventCount,
    reconnect,
  };
}
