const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

function generateExcelFile() {
  const wb = XLSX.utils.book_new();

  // -------------------------------------------------------------
  // HOJA 1: REGISTRO DE COLABORADORES
  // -------------------------------------------------------------
  const colaboradoresData = [
    // Fila de Encabezados
    [
      'Cédula',
      'Nombres',
      'Apellidos',
      'Rol en Plataforma',
      'Cargo Operativo',
      'Departamento',
      'Correo Electrónico (Para Invitación)',
      'Teléfono / Celular',
      'Placa Vehículo (Motos/Carros)',
      'Ciudad / Sede',
      'Salario Base Mensual (COP)',
      'Tipo de Contrato',
      'Nivel Riesgo ARL (1 a 5)',
      'EPS (Salud)',
      'Fondo de Pensiones (AFP)',
      'Caja de Compensación (CCF)',
      'Entidad Bancaria',
      'Tipo de Cuenta',
      'Número de Cuenta Bancaria',
      'Jefe de Zona Asignado (Solo Repartidores)',
      'Estado Inicial'
    ],
    // Ejemplo 1: Repartidor
    [
      '1144123456',
      'Carlos Andrés',
      'Restrepo Gómez',
      'Repartidor',
      'Repartidor Motorizado Urbano',
      'Operaciones y Mensajería',
      'carlos.repartidor@gmail.com',
      '3157890123',
      'ABC12D',
      'Cali',
      1423500,
      'Término Indefinido',
      4,
      'Sura EPS',
      'Protección',
      'Comfandi',
      'Bancolombia',
      'Ahorros',
      '301-458921-12',
      'Hernando Morales (Cédula: 94567890)',
      'Activo'
    ],
    // Ejemplo 2: Administrativo
    [
      '1130987654',
      'Diana Marcela',
      'Quintero Ospina',
      'Administrativo',
      'Coordinadora de Nómina y Talento Humano',
      'Administración',
      'diana.administrativo@sergemsas.com',
      '3186543210',
      'N/A',
      'Cali',
      2800000,
      'Término Indefinido',
      1,
      'Sanitas EPS',
      'Porvenir',
      'Comfandi',
      'Bancolombia',
      'Ahorros',
      '502-114789-05',
      'N/A (Nivel Central)',
      'Activo'
    ],
    // Ejemplo 3: Jefe de Zona
    [
      '94567890',
      'Hernando',
      'Morales Caicedo',
      'Jefe de Zona',
      'Jefe de Zona Operacional - Zona Norte',
      'Operaciones y Mensajería',
      'hernando.jefezona@sergemsas.com',
      '3109876543',
      'XYZ789',
      'Cali',
      2300000,
      'Término Indefinido',
      2,
      'Sura EPS',
      'Protección',
      'Comfandi',
      'Banco de Bogotá',
      'Corriente',
      '024-998877-33',
      'N/A (Es Supervisor de Zona)',
      'Activo'
    ]
  ];

  const wsColaboradores = XLSX.utils.aoa_to_sheet(colaboradoresData);

  // Definir anchos de columnas óptimos para lectura
  wsColaboradores['!cols'] = [
    { wch: 15 }, // Cédula
    { wch: 20 }, // Nombres
    { wch: 20 }, // Apellidos
    { wch: 20 }, // Rol
    { wch: 36 }, // Cargo
    { wch: 28 }, // Departamento
    { wch: 36 }, // Correo
    { wch: 20 }, // Teléfono
    { wch: 18 }, // Placa
    { wch: 16 }, // Ciudad
    { wch: 25 }, // Salario
    { wch: 20 }, // Tipo Contrato
    { wch: 24 }, // ARL
    { wch: 16 }, // EPS
    { wch: 18 }, // AFP
    { wch: 22 }, // CCF
    { wch: 18 }, // Banco
    { wch: 16 }, // Tipo Cuenta
    { wch: 24 }, // Num Cuenta
    { wch: 38 }, // Jefe de Zona
    { wch: 15 }  // Estado
  ];

  XLSX.utils.book_append_sheet(wb, wsColaboradores, 'Colaboradores_SERGEM');

  // -------------------------------------------------------------
  // HOJA 2: GUÍA E INSTRUCCIONES PARA EL CLIENTE
  // -------------------------------------------------------------
  const instruccionesData = [
    ['SERGEM S.A.S. - GUÍA DE DILIGENCIAMIENTO PARA EL CLIENTE'],
    ['SISTEMA INTEGRAL DE GESTIÓN OPERATIVA, NÓMINA Y TURNOS'],
    [''],
    ['1. OBJETIVO DEL ARCHIVO:'],
    ['Este archivo sirve para organizar y recopilar la información de todo el personal que ingresará a la plataforma de SERGEM S.A.S.'],
    ['La información consignada aquí permite habilitar los roles de acceso, despachar los enlaces de invitación a sus correos y parametrizar la nómina legal colombiana.'],
    [''],
    ['2. EXPLICACIÓN DE LOS 3 ROLES DEL SISTEMA:'],
    ['A) REPARTIDOR:'],
    ['   - Personal de mensajería, entrega urbana y distribución.'],
    ['   - Datos clave: Debe tener Cédula, Nombres, Correo (para recibir su acceso), Teléfono (para avisos WhatsApp/llamadas), y PLACA DEL VEHÍCULO.'],
    ['   - Debe asignársele un "Jefe de Zona" para que dicho supervisor pueda programar sus turnos y registrar sus novedades de ruta.'],
    ['   - Nivel de Riesgo ARL sugerido: 4 (riesgo alto por conducción de vehículo).'],
    ['   - Portal asignado: Portal Repartidor (donde visualiza sus turnos semanales, clientes asignados y novedades).'],
    [''],
    ['B) ADMINISTRATIVO:'],
    ['   - Personal de dirección, coordinación de nómina, gestión humana o contabilidad.'],
    ['   - Datos clave: Cédula, Nombres, Correo corporativo y Teléfono.'],
    ['   - No requiere placa de vehículo (se coloca "N/A"). Tampoco requiere Jefe de Zona asignado ("N/A").'],
    ['   - Nivel de Riesgo ARL sugerido: 1 (riesgo ordinario de oficina).'],
    ['   - Portal asignado: Portal Administrativo & Invitaciones (control global de personal, reportes de clientes, consolidado de turnos y nómina).'],
    [''],
    ['C) JEFE DE ZONA:'],
    ['   - Supervisores de campo encargados de coordinar rutas, tiendas/clientes y grupos de repartidores en sectores específicos.'],
    ['   - Datos clave: Cédula, Nombres, Correo, Teléfono y zona asignada en su cargo (ej. "Jefe de Zona Norte").'],
    ['   - Placa de vehículo: Opcional si se desplaza en moto/carro supervisando la zona.'],
    ['   - Nivel de Riesgo ARL sugerido: 2 o 3.'],
    ['   - Portal asignado: Portal Jefe de Zona (asistencia en tiempo real, registro de novedades operacionales y supervisión de repartidores).'],
    [''],
    ['3. CAMPOS OBLIGATORIOS PARA ENVÍO DE INVITACIÓN:'],
    ['   - Cédula de Ciudadanía: Identificador único nacional.'],
    ['   - Nombres y Apellidos completos.'],
    ['   - Rol en Plataforma: Debe ser exactamente "Repartidor", "Administrativo" o "Jefe de Zona".'],
    ['   - Correo Electrónico: Válido y activo. La plataforma enviará a esta dirección el enlace oficial para que el colaborador ingrese a su portal.'],
    ['   - Teléfono Celular: Utilizado para llamadas directas y notificaciones operativas por WhatsApp en caso de que el repartidor no se haya conectado a su turno.'],
    [''],
    ['4. RECOMENDACIONES DE LLENADO:'],
    ['   - No modifique los nombres de los encabezados de la fila 1 de la hoja "Colaboradores_SERGEM".'],
    ['   - Puede borrar los ejemplos o conservarlos como referencia y agregar a continuación las filas de su propio equipo.'],
    ['   - Guarde el archivo con formato .xlsx para asegurar total compatibilidad con el sistema.'],
    [''],
    ['SERGEM S.A.S. - Servicios Generales y Mensajería Especializada • Cali, Colombia']
  ];

  const wsInstrucciones = XLSX.utils.aoa_to_sheet(instruccionesData);
  wsInstrucciones['!cols'] = [
    { wch: 110 }
  ];

  XLSX.utils.book_append_sheet(wb, wsInstrucciones, 'Instrucciones_Para_El_Cliente');

  // Asegurar que la carpeta public existe
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Guardar archivo en public/ y en la raíz
  const publicFilePath = path.join(publicDir, 'Plantilla_Registro_Colaboradores_SERGEM.xlsx');
  const rootFilePath = path.join(process.cwd(), 'Plantilla_Registro_Colaboradores_SERGEM.xlsx');

  XLSX.writeFile(wb, publicFilePath);
  XLSX.writeFile(wb, rootFilePath);

  console.log('✅ Archivo Excel generado exitosamente en:');
  console.log(' - ' + publicFilePath);
  console.log(' - ' + rootFilePath);
}

generateExcelFile();
