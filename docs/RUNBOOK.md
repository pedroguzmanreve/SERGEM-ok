# SERGEM MENSAJERÍA S.A.S. — Runbook de Despliegue y Plan de Contingencia

**Documento:** Runbook de Despliegue, Cold Start y Gestión de Incidentes  
**Empresa:** SERGEM MENSAJERÍA S.A.S. (NIT 900.564.123-1)  
**Versión:** 2026.3.1  
**Ambientes:** Staging (`ais-dev-*`), Pre-producción (`ais-pre-*`), Producción (`app.sergem.com.co`)  

---

## 1. Procedimiento de Despliegue desde Cero (Cold Start)

Este procedimiento describe el paso a paso para aprovisionar y levantar el sistema SERGEM S.A.S. en una infraestructura completamente nueva.

### 1.1 Aprovisionamiento de Supabase (Backend as a Service)

1. **Creación del Proyecto en Supabase:**
   - Iniciar sesión en [Supabase Console](https://supabase.com/dashboard).
   - Crear un nuevo proyecto:
     - **Name:** `sergem-payroll-prod`
     - **Database Password:** Generar contraseña de alta entropía ($\ge 24$ caracteres) y guardar en gestor de secretos.
     - **Region:** `sa-east-1` (São Paulo) o `us-east-1` (Virginia) para menor latencia hacia Colombia (< 80ms).
     - **Pricing Tier:** Pro (para soporte de PITR y réplicas de lectura).

2. **Ejecución del Esquema Relacional y Políticas RLS:**
   - Navegar a **SQL Editor** en la consola de Supabase.
   - Ejecutar en orden el script maestro de migración (`supabase/schema.sql`):
     - Creación de tablas: `company_settings`, `employees`, `payroll_periods`, `employee_novedades`, `weekly_schedules`, `zone_novedades`, `driver_daily_attendances`, `client_order_reports`.
     - Habilitación de Row Level Security (RLS) en todas las tablas (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`).
     - Creación de políticas de lectura y escritura por rol.
     - Configuración de disparadores para `updated_at`.

3. **Creación y Configuración de Buckets de Almacenamiento (Supabase Storage):**
   - Navegar a **Storage** > **New Bucket**.
   - Crear los siguientes tres buckets:
     | Nombre del Bucket | Visibilidad Pública | Tamaño Máx. Archivo | Tipos MIME Permitidos |
     |---|:---:|:---:|---|
     | `driver-audits` | Sí (Público) | 5 MB | `image/jpeg`, `image/png`, `image/webp` |
     | `novedades-attachments` | No (Privado con RLS) | 10 MB | `image/*`, `application/pdf` |
     | `payroll-receipts` | No (Privado con RLS) | 15 MB | `application/pdf` |
   - Configurar políticas de almacenamiento para permitir subida a usuarios autenticados con sus IDs correspondientes.

4. **Habilitación de Canales en Tiempo Real (Realtime CDC):**
   - Navegar a **Database** > **Replication**.
   - Activar la replicación en tiempo real para las tablas:
     - `driver_daily_attendances`
     - `zone_novedades`
     - `weekly_schedules`

5. **Inserción de Semillas Iniciales (Seeding):**
   - Ejecutar el script `supabase/seed.sql` para cargar:
     - Parámetros iniciales de SERGEM S.A.S. (SMMLV 2026, Auxilio de Transporte 2026, tarifas ARL).
     - Datos maestros de colaboradores piloto (Administrador, Jefe de Operaciones, Jefe de Zona, Repartidores).
     - Periodo de nómina quincenal activo.

---

### 1.2 Compilación y Despliegue del Frontend (React + Vite)

1. **Configuración de Variables de Entorno en el Hosting (Vercel / Netlify / Cloud Run):**
   ```env
   VITE_SUPABASE_URL=https://[PROJECT-REF].supabase.co
   VITE_SUPABASE_ANON_KEY=[TU_ANON_PUBLIC_KEY]
   NODE_ENV=production
   ```

2. **Proceso de Construcción (Build Pipeline):**
   ```bash
   # 1. Clonar repositorio y entrar al proyecto
   git clone git@github.com:sergem-sas/sergem-payroll.git
   cd sergem-payroll

   # 2. Instalar dependencias exactas del lockfile
   npm ci

   # 3. Validar tipado estricto con TypeScript
   npm run lint

   # 4. Ejecutar suite de pruebas automatizadas
   npx vitest run

   # 5. Compilar bundle de producción optimizado
   npm run build
   ```

3. **Verificación del Artefacto de Salida (`dist/`):**
   - El bundle generado debe contener:
     - `dist/index.html` con títulos y metas actualizados.
     - `dist/assets/vendor-react-*.js`
     - `dist/assets/vendor-supabase-*.js`
     - `dist/assets/vendor-icons-*.js`
     - `dist/assets/vendor-vitals-*.js`
     - CSS purgado y minificado con Tailwind.

---

## 2. Lista de Verificación Pre-Lanzamiento (Pre-flight Checklist)

Antes de autorizar el pase a producción de una nueva versión, el Líder de Proyecto y el Lead Architect deben validar los siguientes 10 puntos:

- [ ] **1. Integridad de Tipos y Compilación:** `npm run lint` y `npm run build` finalizan con código de salida `0`.
- [ ] **2. Cobertura de Pruebas:** Las 23 pruebas unitarias y de integración pasan en verde (`npx vitest run`).
- [ ] **3. Conectividad a Supabase:** La prueba de ping (`checkSupabaseConnection()`) responde de manera exitosa con latencia $< 250\text{ms}$.
- [ ] **4. Seguridad de Almacenamiento:** Los buckets `driver-audits`, `novedades-attachments` y `payroll-receipts` están creados con sus respectivas políticas de RLS.
- [ ] **5. Replicación en Tiempo Real:** El canal WebSocket `realtime:public:driver_daily_attendances` recibe eventos `INSERT` y `UPDATE`.
- [ ] **6. Cabeceras HTTP de Seguridad:** Verificación de CSP, HSTS, X-Frame-Options y Permissions-Policy en las respuestas HTTP del hosting.
- [ ] **7. Permisos de Dispositivo:** El manifiesto y `metadata.json` declaran el permiso de `camera` para captura de foto-auditoría.
- [ ] **8. Carga Diferida (Lazy Loading):** Los módulos principales cargan bajo demanda con fallback visual (`TableSkeleton` y `MetricCardSkeleton`).
- [ ] **9. Parámetros Laborales 2026:** El SMMLV ($1.423.500 COP) y auxilio de transporte ($200.000 COP) están validados frente al decreto oficial.
- [ ] **10. Telemetría y Monitoreo:** El módulo de telemetría captura Web Vitals y excepciones no controladas en consola y almacén de incidentes.

---

## 3. Plan de Contingencia y Procedimiento de Rollback

En caso de detectarse un fallo crítico en producción (ej. error en liquidación de nómina, bloqueo de marcación en vivo o fallas de autenticación):

### 3.1 Criterios de Declaración de Incidente Crítico (Sev-1)
- Imposibilidad de los motorizados para registrar foto-auditoría o inicio de turno.
- Discrepancias en el cálculo de horas extras o deducciones legales de nómina.
- Indisponibilidad de la base de datos o latencia continua $> 3,000\text{ms}$.

### 3.2 Protocolo de Rollback Inmediato del Frontend
1. **Despliegue en Vercel / Netlify:**
   - Ingresar a la consola de despliegues.
   - Localizar el último despliegue estable previo al incidente (Instant Rollback).
   - Clic en **"Rollback to this deployment"**.
   - Tiempo estimado de reversión: **$< 30$ segundos**.
2. **Despliegue Manual / Contenedores:**
   ```bash
   # Revertir al tag de versión estable anterior
   git checkout tags/v2026.3.0
   npm run build
   # Desplegar artefacto dist/ resultante
   ```

### 3.3 Protocolo de Contingencia Operativa en Campo (Offline / Contingency Mode)
Si la plataforma experimenta indisponibilidad durante la hora pico de despacho matutino (06:00 a 08:00 COT):
1. **Activación de Línea de Radio y WhatsApp:** Los Jefes de Zona registrarán las marcaciones de entrada en la planilla de contingencia física o digital compartida.
2. **Captura Fotográfica Local:** Los repartidores tomarán las fotos de carnet y dotación en el almacenamiento local de sus teléfonos.
3. **Carga Asíncrona:** Una vez restablecido el servicio, los Jefes de Zona cargarán las novedades y asistencias acumuladas mediante el módulo de registro manual.
