# SERGEM MENSAJERÍA S.A.S. — Manual de Mantenimiento, SRE y Operaciones en Producción

**Documento:** Manual de Mantenimiento y Recuperación ante Desastres (Disaster Recovery & Ops Guide)  
**Entidad:** SERGEM MENSAJERÍA S.A.S. (NIT 900.564.123-1)  
**Versión:** 2026.3.1  
**Clasificación:** Confidencial / Operaciones Críticas  

---

## 1. Procedimiento de Rotación de Credenciales y Secretos

La rotación de credenciales previene el acceso no autorizado y garantiza el cumplimiento con estándares de ciberseguridad (ISO 27001, OWASP Top 10).

### 1.1 Calendario de Rotación
- **Clave Pública Anónima (`VITE_SUPABASE_ANON_KEY`)**: Rotación semestral o ante sospecha de exposición en repositorios públicos.
- **Clave de Servicio / Backend (`SUPABASE_SERVICE_ROLE_KEY`)**: Rotación trimestral.
- **Contraseña de Base de Datos PostgreSQL**: Rotación semestral.
- **JWT Secret de Firma de Tokens**: Rotación anual (requiere invalidar sesiones activas).

### 1.2 Paso a Paso para la Rotación de Claves en Supabase
1. Ingresar a la consola de administración de **Supabase** (`https://supabase.com/dashboard/project/<PROJECT_ID>/settings/api`).
2. En la sección **Project API Keys**:
   - Para `anon` / `public`: Hacer clic en **Generate new secret / Roll key**.
   - Para `service_role`: Generar nueva clave de servicio.
3. Actualizar inmediatamente las variables en el hosting de producción:
   - **Vercel**: `Project Settings` > `Environment Variables` > Actualizar `VITE_SUPABASE_ANON_KEY`.
   - **Netlify**: `Site configuration` > `Environment variables` > Actualizar `VITE_SUPABASE_ANON_KEY`.
4. Ejecutar un redespliegue forzado (`Trigger deploy`) para compilar el nuevo bundle de producción con la clave rotada.
5. Verificar el estado del servicio mediante la sonda de telemetría y consola de monitoreo.

---

## 2. Estrategia y Políticas de Copias de Seguridad (Backups)

El sistema SERGEM implementa un esquema de respaldo por capas para garantizar cero pérdida de transacciones de nómina, fotos de auditoría y novedades de repartidores.

### 2.1 Niveles de Respaldo en Supabase
| Tipo de Respaldo | Frecuencia | Retención | Almacenamiento |
|---|---|---|---|
| **Snapshot Físico Diario (Automated)** | Cada 24 horas (02:00 COT) | 7 a 30 días | Multi-región AWS/GCP |
| **Point-in-Time Recovery (PITR)** | Continuo (WAL Streams) | Hasta 7 días | Replicación en tiempo real |
| **Respaldo Lógico (`pg_dump`)** | Semanal / Previo a despliegues | 90 días | Cold Storage cifrado |

### 2.2 Ejecución de Backup Lógico Manual con `pg_dump`
Para generar un volcado de estructura y datos antes de una migración de esquema:

```bash
# Exportar base de datos completa con compresión gzip
pg_dump "postgres://postgres:[DB_PASSWORD]@[DB_HOST]:5432/postgres" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="backup_sergem_$(date +%Y%m%d_%H%M%S).dump"

# O exportar en formato SQL legible:
pg_dump "postgres://postgres:[DB_PASSWORD]@[DB_HOST]:5432/postgres" \
  --schema=public \
  --inserts \
  --file="backup_sergem_$(date +%Y%m%d).sql"
```

---

## 3. Procedimiento de Restauración de Datos y Disaster Recovery (DRP)

### 3.1 Objetivos de Nivel de Servicio (SLO)
- **RTO (Recovery Time Objective)**: Menor a **45 minutos** para restauración de servicios críticos.
- **RPO (Recovery Point Objective)**: Menor a **15 minutos** de datos mediante réplica WAL y PITR.

### 3.2 Restauración mediante Point-in-Time Recovery (PITR)
1. En el Dashboard de Supabase, navegar a **Database** > **Backups** > **Point in Time**.
2. Seleccionar la fecha y hora exacta (ej. 5 minutos antes del incidente o borrado accidental).
3. Seleccionar **Restore to this point**.
4. Supabase aprovisionará una réplica en el estado exacto solicitado.
5. Validar la integridad de los registros en `payroll_periods`, `employees` y `driver_daily_attendances`.

### 3.3 Restauración Manual desde Archivo de Volcado
```bash
# Restaurar sobre una instancia limpia o restaurada:
pg_restore --clean --if-exists --no-owner --no-privileges \
  -d "postgres://postgres:[DB_PASSWORD]@[DB_HOST]:5432/postgres" \
  backup_sergem_20260301.dump
```

---

## 4. Mantenimiento Preventivo de Base de Datos PostgreSQL

### 4.1 Limpieza de Espacio y Optimización (`VACUUM` y `ANALYZE`)
Para optimizar el planificador de consultas de PostgreSQL y liberar espacio ocupado por tuplas muertas (generadas por actualizaciones frecuentes de marcación en vivo):

```sql
-- Ejecutar mantenimiento en tablas con alta concurrencia
VACUUM (VERBOSE, ANALYZE) public.driver_daily_attendances;
VACUUM (VERBOSE, ANALYZE) public.zone_novedades;
VACUUM (VERBOSE, ANALYZE) public.weekly_schedules;
VACUUM (VERBOSE, ANALYZE) public.client_order_reports;

-- Reindexación periódica para mantener árboles B-Tree óptimos
REINDEX TABLE CONCURRENTLY public.driver_daily_attendances;
REINDEX TABLE CONCURRENTLY public.employees;
```

### 4.2 Monitoreo de Conexiones Activas y Bloqueos (Deadlocks)
```sql
-- Consultar conexiones activas y estados
SELECT pid, usename, client_addr, state, query_start, query 
FROM pg_stat_activity 
WHERE datname = 'postgres' AND state != 'idle';

-- Identificar transacciones bloqueadas
SELECT blocked_locks.pid     AS blocked_pid,
       blocked_activity.usename  AS blocked_user,
       blocking_locks.pid    AS blocking_pid,
       blocking_activity.usename AS blocking_user,
       blocked_activity.query    AS blocked_statement
FROM  pg_catalog.pg_locks         blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks         blocking_locks 
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

---

## 5. Gestión del Ciclo de Vida en Supabase Storage

### 5.1 Políticas de Retención de Archivos
- **`driver-audits` (Fotos de carnet y dotación)**:
  - Las fotos diarias tienen una retención operativa obligatoria de **60 días**.
  - Pasados 60 días, se ejecuta un script de archivado a almacenamiento frío (Cold Tier) o purga de thumbnails temporales.
- **`novedades-attachments` (Incapacidades, permisos)**:
  - Retención legal laboral de **5 años** conforme a los requerimientos del Ministerio de Trabajo de Colombia y la UGPP.
- **`payroll-receipts` (Desprendibles de pago)**:
  - Retención de **10 años**.

### 5.2 Limpieza y Verificación de Integridad de Objetos Huérfanos
Script SQL para identificar archivos en storage sin registro referencial en base de datos:
```sql
-- Verificar si existen URLs en driver_daily_attendances que apunten a storage
SELECT count(*) 
FROM public.driver_daily_attendances 
WHERE foto_auditoria IS NOT NULL AND foto_auditoria != '';
```

---

## 6. Monitoreo en Tiempo Real y Telemetría SRE

### 6.1 Métricas Clave de Salud (Golden Signals)
1. **Latencia**: Latencia de respuesta de PostgreSQL < 250ms (alerta si > 1,500ms).
2. **Tasa de Errores (Error Rate)**: < 0.05% de transacciones fallidas.
3. **Saturación**: Uso de memoria en cliente < 150 MB, CPU de base de datos < 70%.
4. **Web Vitals en Cliente**:
   - **LCP (Largest Contentful Paint)**: $\le 2.5\text{s}$ (Bueno).
   - **INP (Interaction to Next Paint)**: $\le 200\text{ms}$ (Bueno).
   - **CLS (Cumulative Layout Shift)**: $\le 0.1$ (Bueno).

### 6.2 Matriz de Contactos de Emergencia (On-Call Runbook)
| Rol | Responsabilidad | Canal de Contacto |
|---|---|---|
| **Líder SRE / DevOps** | Infraestructura Cloud, Vercel/Netlify, Supabase | `devops@sergem.com.co` / Slack `#ops-alerts` |
| **DBA / PostgreSQL Specialist** | Integridad de datos, PITR, Vacuum, RLS | `dba@sergem.com.co` |
| **Director de Operaciones** | Autorización de cambios y contingencia de campo | `operaciones@sergem.com.co` |
