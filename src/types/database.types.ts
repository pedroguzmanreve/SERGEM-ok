/**
 * SERGEM S.A.S. - Definición de Tipos de Base de Datos para Supabase
 * FASE 2: Tipos generados para PostgreSQL y @supabase/supabase-js
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      company_settings: {
        Row: {
          id: string;
          nombre_empresa: string;
          nit: string;
          direccion: string | null;
          telefono: string | null;
          ciudad: string | null;
          email: string | null;
          smmlv: number;
          auxilio_transporte_mensual: number;
          jornada_maxima_semanal: number;
          jornada_diaria_base: number;
          porcentaje_salud_empleado: number;
          porcentaje_pension_empleado: number;
          porcentaje_salud_empresa: number;
          porcentaje_pension_empresa: number;
          aplica_exencion_art114: boolean;
          porcentaje_caja_compensacion: number;
          porcentaje_sena: number;
          porcentaje_icbf: number;
          tarifas_generales_clientes: Json;
          tarifas_arl: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nombre_empresa: string;
          nit: string;
          direccion?: string | null;
          telefono?: string | null;
          ciudad?: string | null;
          email?: string | null;
          smmlv?: number;
          auxilio_transporte_mensual?: number;
          jornada_maxima_semanal?: number;
          jornada_diaria_base?: number;
          porcentaje_salud_empleado?: number;
          porcentaje_pension_empleado?: number;
          porcentaje_salud_empresa?: number;
          porcentaje_pension_empresa?: number;
          aplica_exencion_art114?: boolean;
          porcentaje_caja_compensacion?: number;
          porcentaje_sena?: number;
          porcentaje_icbf?: number;
          tarifas_generales_clientes?: Json;
          tarifas_arl?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nombre_empresa?: string;
          nit?: string;
          direccion?: string | null;
          telefono?: string | null;
          ciudad?: string | null;
          email?: string | null;
          smmlv?: number;
          auxilio_transporte_mensual?: number;
          jornada_maxima_semanal?: number;
          jornada_diaria_base?: number;
          porcentaje_salud_empleado?: number;
          porcentaje_pension_empleado?: number;
          porcentaje_salud_empresa?: number;
          porcentaje_pension_empresa?: number;
          aplica_exencion_art114?: boolean;
          porcentaje_caja_compensacion?: number;
          porcentaje_sena?: number;
          porcentaje_icbf?: number;
          tarifas_generales_clientes?: Json;
          tarifas_arl?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      clients: {
        Row: {
          id: string;
          legacy_id: string | null;
          nombre: string;
          nit: string;
          direccion: string | null;
          ciudad: string | null;
          telefono: string | null;
          email_contacto: string | null;
          persona_contacto: string | null;
          estado: 'Activo' | 'Inactivo';
          sedes: Json;
          tarifas: Json;
          observaciones: string | null;
          fecha_registro: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          legacy_id?: string | null;
          nombre: string;
          nit: string;
          direccion?: string | null;
          ciudad?: string | null;
          telefono?: string | null;
          email_contacto?: string | null;
          persona_contacto?: string | null;
          estado?: 'Activo' | 'Inactivo';
          sedes?: Json;
          tarifas: Json;
          observaciones?: string | null;
          fecha_registro?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          legacy_id?: string | null;
          nombre?: string;
          nit?: string;
          direccion?: string | null;
          ciudad?: string | null;
          telefono?: string | null;
          email_contacto?: string | null;
          persona_contacto?: string | null;
          estado?: 'Activo' | 'Inactivo';
          sedes?: Json;
          tarifas?: Json;
          observaciones?: string | null;
          fecha_registro?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      employees: {
        Row: {
          id: string;
          legacy_id: string | null;
          cedula: string;
          nombre: string;
          apellido: string;
          cargo: string;
          departamento: string;
          salario_base: number;
          tipo_contrato: string;
          nivel_riesgo_arl: number;
          fecha_ingreso: string;
          banco: string | null;
          tipo_cuenta: 'Ahorros' | 'Corriente' | null;
          numero_cuenta: string | null;
          eps: string | null;
          afp: string | null;
          ccf: string | null;
          activo: boolean;
          rol: 'Administrativo' | 'Jefe de Zona' | 'Jefe de Operaciones' | 'Repartidor';
          placa_vehiculo: string | null;
          jefe_zona_id: string | null;
          email: string | null;
          telefono: string | null;
          estado_invitacion: 'Invitado' | 'Activo' | 'Pendiente' | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          legacy_id?: string | null;
          cedula: string;
          nombre: string;
          apellido: string;
          cargo: string;
          departamento: string;
          salario_base?: number;
          tipo_contrato?: string;
          nivel_riesgo_arl?: number;
          fecha_ingreso?: string;
          banco?: string | null;
          tipo_cuenta?: 'Ahorros' | 'Corriente' | null;
          numero_cuenta?: string | null;
          eps?: string | null;
          afp?: string | null;
          ccf?: string | null;
          activo?: boolean;
          rol?: 'Administrativo' | 'Jefe de Zona' | 'Jefe de Operaciones' | 'Repartidor';
          placa_vehiculo?: string | null;
          jefe_zona_id?: string | null;
          email?: string | null;
          telefono?: string | null;
          estado_invitacion?: 'Invitado' | 'Activo' | 'Pendiente' | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          legacy_id?: string | null;
          cedula?: string;
          nombre?: string;
          apellido?: string;
          cargo?: string;
          departamento?: string;
          salario_base?: number;
          tipo_contrato?: string;
          nivel_riesgo_arl?: number;
          fecha_ingreso?: string;
          banco?: string | null;
          tipo_cuenta?: 'Ahorros' | 'Corriente' | null;
          numero_cuenta?: string | null;
          eps?: string | null;
          afp?: string | null;
          ccf?: string | null;
          activo?: boolean;
          rol?: 'Administrativo' | 'Jefe de Zona' | 'Jefe de Operaciones' | 'Repartidor';
          placa_vehiculo?: string | null;
          jefe_zona_id?: string | null;
          email?: string | null;
          telefono?: string | null;
          estado_invitacion?: 'Invitado' | 'Activo' | 'Pendiente' | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      payroll_periods: {
        Row: {
          id: string;
          legacy_id: string | null;
          nombre_periodo: string;
          fecha_inicio: string;
          fecha_fin: string;
          tipo_periodo: 'Quincenal' | 'Mensual';
          dias_base_periodo: number;
          estado: 'Borrador' | 'Liquidata' | 'Aprobada' | 'Pagada';
          fecha_liquidacion: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          legacy_id?: string | null;
          nombre_periodo: string;
          fecha_inicio: string;
          fecha_fin: string;
          tipo_periodo?: 'Quincenal' | 'Mensual';
          dias_base_periodo?: number;
          estado?: 'Borrador' | 'Liquidata' | 'Aprobada' | 'Pagada';
          fecha_liquidacion?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          legacy_id?: string | null;
          nombre_periodo?: string;
          fecha_inicio?: string;
          fecha_fin?: string;
          tipo_periodo?: 'Quincenal' | 'Mensual';
          dias_base_periodo?: number;
          estado?: 'Borrador' | 'Liquidata' | 'Aprobada' | 'Pagada';
          fecha_liquidacion?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      weekly_schedules: {
        Row: {
          id: string;
          legacy_id: string | null;
          repartidor_id: string;
          jefe_zona_id: string | null;
          semana_inicio: string;
          dias: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          legacy_id?: string | null;
          repartidor_id: string;
          jefe_zona_id?: string | null;
          semana_inicio: string;
          dias?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          legacy_id?: string | null;
          repartidor_id?: string;
          jefe_zona_id?: string | null;
          semana_inicio?: string;
          dias?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      zone_novedades: {
        Row: {
          id: string;
          legacy_id: string | null;
          repartidor_id: string;
          jefe_zona_id: string | null;
          fecha: string;
          tipo: 'Permiso Remunerado' | 'Permiso No Remunerado' | 'Incapacidad';
          hora_inicio: string;
          hora_fin: string;
          duracion_horas: number;
          observaciones: string | null;
          fecha_registro: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          legacy_id?: string | null;
          repartidor_id: string;
          jefe_zona_id?: string | null;
          fecha: string;
          tipo: 'Permiso Remunerado' | 'Permiso No Remunerado' | 'Incapacidad';
          hora_inicio: string;
          hora_fin: string;
          duracion_horas?: number;
          observaciones?: string | null;
          fecha_registro?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          legacy_id?: string | null;
          repartidor_id?: string;
          jefe_zona_id?: string | null;
          fecha?: string;
          tipo?: 'Permiso Remunerado' | 'Permiso No Remunerado' | 'Incapacidad';
          hora_inicio?: string;
          hora_fin?: string;
          duracion_horas?: number;
          observaciones?: string | null;
          fecha_registro?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      client_order_reports: {
        Row: {
          id: string;
          legacy_id: string | null;
          cliente_id: string | null;
          nombre_cliente: string;
          repartidor_id: string | null;
          nombre_repartidor: string;
          placa_vehiculo: string;
          fecha: string;
          paquetes_entregados: number;
          venta_neta: number;
          horas_trabajadas: number;
          horas_ordinarias: number;
          horas_extras_diurnas: number;
          horas_extras_nocturnas: number;
          horas_festivas: number;
          horas_extras_festivas_nocturnas: number;
          recargo_nocturno: number;
          recargo_festivo: number;
          salidas_fuera_perimetro: number;
          valor_fuera_perimetro: number;
          detalles_fuera_perimetro: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          legacy_id?: string | null;
          cliente_id?: string | null;
          nombre_cliente: string;
          repartidor_id?: string | null;
          nombre_repartidor: string;
          placa_vehiculo: string;
          fecha: string;
          paquetes_entregados?: number;
          venta_neta?: number;
          horas_trabajadas?: number;
          horas_ordinarias?: number;
          horas_extras_diurnas?: number;
          horas_extras_nocturnas?: number;
          horas_festivas?: number;
          horas_extras_festivas_nocturnas?: number;
          recargo_nocturno?: number;
          recargo_festivo?: number;
          salidas_fuera_perimetro?: number;
          valor_fuera_perimetro?: number;
          detalles_fuera_perimetro?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          legacy_id?: string | null;
          cliente_id?: string | null;
          nombre_cliente?: string;
          repartidor_id?: string | null;
          nombre_repartidor?: string;
          placa_vehiculo?: string;
          fecha?: string;
          paquetes_entregados?: number;
          venta_neta?: number;
          horas_trabajadas?: number;
          horas_ordinarias?: number;
          horas_extras_diurnas?: number;
          horas_extras_nocturnas?: number;
          horas_festivas?: number;
          horas_extras_festivas_nocturnas?: number;
          recargo_nocturno?: number;
          recargo_festivo?: number;
          salidas_fuera_perimetro?: number;
          valor_fuera_perimetro?: number;
          detalles_fuera_perimetro?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      daily_attendances: {
        Row: {
          id: string;
          repartidor_id: string;
          dia_semana: string;
          fecha: string;
          estado: 'PENDIENTE_INICIO' | 'INICIADO' | 'FINALIZADO' | 'DESCANSO' | 'SIN_TURNO';
          hora_inicio_programada: string | null;
          hora_fin_programada: string | null;
          cliente_nombre: string | null;
          hora_conexion_real: string | null;
          minutos_retraso: number;
          foto_auditoria: string | null;
          salidas_fuera_perimetro: number;
          valor_fuera_perimetro: number;
          ultimo_contacto: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          repartidor_id: string;
          dia_semana: string;
          fecha: string;
          estado?: 'PENDIENTE_INICIO' | 'INICIADO' | 'FINALIZADO' | 'DESCANSO' | 'SIN_TURNO';
          hora_inicio_programada?: string | null;
          hora_fin_programada?: string | null;
          cliente_nombre?: string | null;
          hora_conexion_real?: string | null;
          minutos_retraso?: number;
          foto_auditoria?: string | null;
          salidas_fuera_perimetro?: number;
          valor_fuera_perimetro?: number;
          ultimo_contacto?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          repartidor_id?: string;
          dia_semana?: string;
          fecha?: string;
          estado?: 'PENDIENTE_INICIO' | 'INICIADO' | 'FINALIZADO' | 'DESCANSO' | 'SIN_TURNO';
          hora_inicio_programada?: string | null;
          hora_fin_programada?: string | null;
          cliente_nombre?: string | null;
          hora_conexion_real?: string | null;
          minutos_retraso?: number;
          foto_auditoria?: string | null;
          salidas_fuera_perimetro?: number;
          valor_fuera_perimetro?: number;
          ultimo_contacto?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      employee_novedades: {
        Row: {
          id: string;
          periodo_id: string;
          employee_id: string;
          dias_trabajados: number;
          horas: Json;
          comisiones: number;
          bonificaciones_constitutivas: number;
          bonificaciones_no_constitutivas: number;
          auxilio_no_constitutivo: number;
          incapacidad_dias: number;
          incapacidad_valor: number;
          licencias_remuneradas_dias: number;
          licencias_no_remuneradas_dias: number;
          prestamos_y_deducciones: number;
          otras_deducciones: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          periodo_id: string;
          employee_id: string;
          dias_trabajados?: number;
          horas?: Json;
          comisiones?: number;
          bonificaciones_constitutivas?: number;
          bonificaciones_no_constitutivas?: number;
          auxilio_no_constitutivo?: number;
          incapacidad_dias?: number;
          incapacidad_valor?: number;
          licencias_remuneradas_dias?: number;
          licencias_no_remuneradas_dias?: number;
          prestamos_y_deducciones?: number;
          otras_deducciones?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          periodo_id?: string;
          employee_id?: string;
          dias_trabajados?: number;
          horas?: Json;
          comisiones?: number;
          bonificaciones_constitutivas?: number;
          bonificaciones_no_constitutivas?: number;
          auxilio_no_constitutivo?: number;
          incapacidad_dias?: number;
          incapacidad_valor?: number;
          licencias_remuneradas_dias?: number;
          licencias_no_remuneradas_dias?: number;
          prestamos_y_deducciones?: number;
          otras_deducciones?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
