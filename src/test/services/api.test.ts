import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../../services/api';
import { supabase } from '../../lib/supabase';
import { Employee, ZoneChiefNovedad } from '../../types/payroll';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
  isSupabaseConfigured: () => true,
  checkSupabaseConnection: vi.fn().mockResolvedValue(true),
}));

describe('api Service Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches employees and transforms database fields to Employee domain objects', async () => {
    const dbEmployees = [
      {
        id: '11111111-1111-1111-1111-111111111101',
        cedula: '1053800001',
        nombre: 'Carlos',
        apellido: 'Gómez',
        cargo: 'Mensajero Motorizado',
        departamento: 'Operaciones y Mensajería',
        rol: 'Repartidor',
        salario_base: 1423500,
        tipo_contrato: 'Término Indefinido',
        nivel_riesgo_arl: 4,
        banco: 'Bancolombia',
        tipo_cuenta: 'Ahorros',
        numero_cuenta: '1234',
        eps: 'Sura',
        afp: 'Protección',
        ccf: 'Confa',
        fecha_ingreso: '2024-01-15',
        activo: true,
      },
    ];

    const mockSelect = vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({
        data: dbEmployees,
        error: null,
      }),
    });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });

    const response = await api.getEmployees();

    expect(response.error).toBeNull();
    expect(response.data).toBeDefined();
    expect(response.data?.length).toBe(1);
    expect(response.data![0].salarioBase).toBe(1423500);
    expect(response.data![0].tipoContrato).toBe('Término Indefinido');
    expect(response.data![0].nivelRiesgoARL).toBe(4);
  });

  it('creates an employee with snake_case mapping for PostgreSQL', async () => {
    const newEmployee: Employee = {
      id: 'emp-new-1',
      cedula: '1053999999',
      nombre: 'Juan',
      apellido: 'Pérez',
      cargo: 'Jefe de Zona Manizales',
      departamento: 'Operaciones y Mensajería',
      rol: 'Jefe de Zona',
      salarioBase: 2500000,
      tipoContrato: 'Término Fijo',
      nivelRiesgoARL: 1,
      banco: 'Davivienda',
      tipoCuenta: 'Ahorros',
      numeroCuenta: '9876',
      eps: 'Sanitas',
      afp: 'Porvenir',
      ccf: 'Compensar',
      fechaIngreso: '2025-02-01',
      activo: true,
    };

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'generated-uuid-1',
            cedula: '1053999999',
            nombre: 'Juan',
            apellido: 'Pérez',
            cargo: 'Jefe de Zona Manizales',
            departamento: 'Operaciones y Mensajería',
            rol: 'Jefe de Zona',
            salario_base: 2500000,
            tipo_contrato: 'Término Fijo',
            nivel_riesgo_arl: 1,
            banco: 'Davivienda',
            tipo_cuenta: 'Ahorros',
            numero_cuenta: '9876',
            eps: 'Sanitas',
            afp: 'Porvenir',
            ccf: 'Compensar',
            fecha_ingreso: '2025-02-01',
            activo: true,
          },
          error: null,
        }),
      }),
    });

    (supabase.from as any).mockReturnValue({
      insert: mockInsert,
    });

    const response = await api.createEmployee(newEmployee);
    expect(response.error).toBeNull();
    expect(response.data?.nombre).toBe('Juan');
    expect(response.data?.salarioBase).toBe(2500000);
  });

  it('creates zone novedad correctly with mapped properties', async () => {
    const novedad: ZoneChiefNovedad = {
      id: 'nov-test-1',
      repartidorId: 'emp-1',
      jefeZonaId: 'jefe-1',
      tipo: 'Incapacidad',
      fecha: '2026-03-02',
      horaInicio: '08:00',
      horaFin: '12:00',
      duracionHoras: 4,
      observaciones: 'Reposo prescrito por EPS',
      fechaRegistro: new Date().toISOString(),
    };

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: novedad.id,
            repartidor_id: novedad.repartidorId,
            jefe_zona_id: novedad.jefeZonaId,
            tipo: novedad.tipo,
            fecha: novedad.fecha,
            hora_inicio: novedad.horaInicio,
            hora_fin: novedad.horaFin,
            duracion_horas: novedad.duracionHoras,
            observaciones: novedad.observaciones,
            fecha_registro: novedad.fechaRegistro,
          },
          error: null,
        }),
      }),
    });

    (supabase.from as any).mockReturnValue({
      insert: mockInsert,
    });

    const response = await api.createZoneNovedad(novedad);
    expect(response.error).toBeNull();
    expect(response.data?.tipo).toBe('Incapacidad');
    expect(response.data?.duracionHoras).toBe(4);
  });
});
