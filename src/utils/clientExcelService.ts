import * as XLSX from 'xlsx';

/**
 * Genera y descarga directamente en el navegador la plantilla oficial de Excel
 * para el registro y carga masiva de clientes corporativos de SERGEM S.A.S.
 *
 * Utiliza un Blob binario con el tipo MIME correcto para evitar que navegadores
 * o entornos en iframes interpreten la descarga como una página HTML.
 */
export function downloadClientExcelTemplate(): void {
  const wb = XLSX.utils.book_new();

  // Hoja 1: Jerarquia_Clientes_SERGEM
  const clientsData = [
    [
      'NIT Empresa *',
      'Razón Social / Empresa *',
      'Código Centro Costo *',
      'Nombre Centro Costo *',
      'Código Punto Venta',
      'Nombre Punto de Venta / Sede *',
      'Ciudad *',
      'Dirección de Sede / Muelle',
      'Nombre Supervisor / Contacto',
      'Teléfono Celular (WhatsApp)',
      'Correo Electrónico Contacto',
      'Tarifa Base por Hora ($ COP)',
      'Observaciones Operativas / EPP',
      'Estado (Activo / Inactivo)'
    ],
    [
      '890.900.608-9',
      'ALKOSTO CALI S.A.',
      'CC-VALLE-01',
      'Operación Logística Valle del Cauca',
      'PV-PASOANCHO',
      'Alkosto Pasoancho (Hiperahorro)',
      'Cali',
      'Av. Pasoancho # 80-120, Bodega 4',
      'Liceth Morales',
      '3154567890',
      'logistica.cali@alkosto.com.co',
      12500,
      'Ingreso con botas de seguridad y carné de ARL vigente. Despacho matutino.',
      'Activo'
    ],
    [
      '890.900.608-1',
      'ALMACENES ÉXITO S.A.',
      'CC-EXITO-CALI',
      'Reparto Express y Última Milla',
      'PV-CHIPICHAPE',
      'Éxito Chipichape Sede Norte',
      'Cali',
      'Calle 38 Norte # 6N-35',
      'Carlos Méndez',
      '3168889911',
      'despachos.chipichape@exito.com',
      13000,
      'Control de precintos y entrega con datáfono.',
      'Activo'
    ],
    [
      '900.123.456-1',
      'TCC LOGÍSTICA S.A.S.',
      'CC-TCC-IND',
      'Zona Industrial Acopi y Envíos Masivos',
      'PV-ACOPI-01',
      'Muelle Principal Acopi Yumbo',
      'Yumbo',
      'Zona Industrial Acopi, Calle 15 # 22-45',
      'Ing. Carlos Ruiz',
      '3109876543',
      'operaciones.valle@tcc.com.co',
      14000,
      'Cargue diario de 6:00 AM a 8:00 AM. Control estricto de paquetes y remisiones.',
      'Activo'
    ],
    [
      '901.456.789-2',
      'DISTRIBUIDORA DE MEDICAMENTOS DEL VALLE S.A.S.',
      'CC-FARMA-VALLE',
      'Cadena de Frío y Farmacéutica',
      'PV-DOLORES-12',
      'Sede Parque Industrial La Dolores',
      'Palmira',
      'Parque Industrial La Dolores, Bodega 12',
      'Dra. Patricia Gómez',
      '3201234567',
      'despachos@distrimedvalle.com',
      13500,
      'Exclusivo reparto motorizado con maletín térmico para transporte de medicamentos.',
      'Activo'
    ]
  ];

  const wsClients = XLSX.utils.aoa_to_sheet(clientsData);

  wsClients['!cols'] = [
    { wch: 18 }, // NIT Empresa
    { wch: 34 }, // Razon Social Empresa
    { wch: 22 }, // Cod Centro Costo
    { wch: 34 }, // Nombre Centro Costo
    { wch: 20 }, // Cod Punto Venta
    { wch: 32 }, // Nombre Punto Venta
    { wch: 16 }, // Ciudad
    { wch: 36 }, // Dirección
    { wch: 26 }, // Contacto
    { wch: 20 }, // Teléfono
    { wch: 32 }, // Correo
    { wch: 24 }, // Tarifa
    { wch: 45 }, // Observaciones
    { wch: 16 }  // Estado
  ];

  XLSX.utils.book_append_sheet(wb, wsClients, 'Jerarquia_Clientes_SERGEM');

  // Hoja 2: Guia_Jerarquia_SERGEM
  const instructionsData = [
    ['SERGEM MENSAJERÍA Y LOGÍSTICA S.A.S. - GUÍA DE ESTRUCTURA Y CARGA JERÁRQUICA'],
    ['Estructura organizacional oficial: 1. Empresa -> 2. Centro de Costo -> 3. Punto de Venta (con Ciudad)'],
    [''],
    ['Nivel Jerárquico', 'Campo en Plantilla', 'Obligatorio', 'Descripción', 'Ejemplo'],
    ['Nivel 1: EMPRESA', 'NIT Empresa', 'Recomendado', 'NIT tributario de la empresa cliente con o sin dígito de verificación', '890.900.608-9'],
    ['Nivel 1: EMPRESA', 'Razón Social / Empresa', 'SÍ (Obligatorio)', 'Nombre legal o corporativo de la empresa', 'ALKOSTO CALI S.A.'],
    ['Nivel 2: CENTRO DE COSTO', 'Código Centro Costo', 'SÍ (Obligatorio)', 'Código interno para imputación presupuestal y operativa', 'CC-VALLE-01'],
    ['Nivel 2: CENTRO DE COSTO', 'Nombre Centro Costo', 'SÍ (Obligatorio)', 'Denominación de la línea, contrato o centro de costo', 'Operación Logística Valle'],
    ['Nivel 3: PUNTO DE VENTA', 'Código Punto Venta', 'Opcional', 'Código o identificador de tienda, sucursal o muelle', 'PV-PASOANCHO'],
    ['Nivel 3: PUNTO DE VENTA', 'Nombre Punto de Venta / Sede', 'SÍ (Obligatorio)', 'Sede física donde opera el repartidor o mensajero', 'Alkosto Pasoancho (Hiperahorro)'],
    ['Nivel 3: PUNTO DE VENTA', 'Ciudad', 'SÍ (Obligatorio)', 'Ciudad de la sede (Cali, Yumbo, Palmira, Jamundí, Bogotá, Medellín, etc.)', 'Cali'],
    ['Nivel 3: PUNTO DE VENTA', 'Dirección de Sede / Muelle', 'Opcional', 'Dirección física completa del muelle o punto de despacho', 'Av. Pasoancho # 80-120'],
    ['Nivel 3: PUNTO DE VENTA', 'Nombre Supervisor', 'Opcional', 'Supervisor de tienda o contacto encargado', 'Liceth Morales'],
    ['Nivel 3: PUNTO DE VENTA', 'Teléfono Celular (WhatsApp)', 'Opcional', 'Número móvil para enlace directo y llamadas', '3154567890'],
    ['Nivel 3: PUNTO DE VENTA', 'Correo Electrónico', 'Opcional', 'Correo para remisiones e informes', 'logistica@alkosto.com.co'],
    ['Nivel 3: PUNTO DE VENTA', 'Tarifa Base por Hora', 'Opcional', 'Tarifa acordada por hora de servicio (número sin puntos)', '12500'],
    ['Nivel 3: PUNTO DE VENTA', 'Observaciones / EPP', 'Opcional', 'Requisitos de EPP, horarios de descargue o restricciones', 'Uso obligatorio de botas y chaleco'],
    ['Nivel 3: PUNTO DE VENTA', 'Estado', 'Opcional', 'Activo o Inactivo', 'Activo'],
    [''],
    ['Nota: Al importar esta plantilla, el sistema de SERGEM creará o actualizará automáticamente los 3 niveles en Firestore.']
  ];

  const wsGuia = XLSX.utils.aoa_to_sheet(instructionsData);
  wsGuia['!cols'] = [
    { wch: 25 },
    { wch: 28 },
    { wch: 18 },
    { wch: 55 },
    { wch: 28 }
  ];

  XLSX.utils.book_append_sheet(wb, wsGuia, 'Guia_Jerarquia_SERGEM');

  // Generación binaria y descarga segura mediante Blob
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'Plantilla_Registro_Empresas_CentrosCosto_PuntosVenta_SERGEM.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Genera y descarga la plantilla oficial de colaboradores
 */
export function downloadCollaboratorExcelTemplate(): void {
  const wb = XLSX.utils.book_new();

  const colsHeaders = [
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
  ];

  const sampleRows = [
    colsHeaders,
    [
      '94567890',
      'Hernando',
      'Morales Caicedo',
      'Jefe Inmediato',
      'Jefe Inmediato de Operaciones',
      'Operaciones y Mensajería',
      'hernando.jefeinmediato@sergemsas.com',
      '3109876543',
      'XYZ789',
      'Cali',
      2500000,
      'Término Indefinido',
      2,
      'Sura EPS',
      'Protección',
      'Comfandi',
      'Banco de Bogotá',
      'Corriente',
      '024-998877-33',
      'N/A (Liderazgo / Jefe)',
      'Activo'
    ],
    [
      '1130987654',
      'Diana Marcela',
      'Quintero Ospina',
      'Coordinador',
      'Coordinadora de Operaciones y Logística',
      'Logística y Despachos',
      'diana.coordinadora@sergemsas.com',
      '3186543210',
      'N/A',
      'Cali',
      2400000,
      'Término Indefinido',
      1,
      'Sanitas EPS',
      'Porvenir',
      'Comfandi',
      'Bancolombia',
      'Ahorros',
      '502-114789-05',
      'N/A (Liderazgo)',
      'Activo'
    ],
    [
      '1144089901',
      'Andrés Felipe',
      'Torres Gómez',
      'Analista',
      'Analista de Nómina y Facturación',
      'Financiera y Contabilidad',
      'andres.analista@sergemsas.com',
      '3165551234',
      'N/A',
      'Cali',
      2100000,
      'Término Indefinido',
      1,
      'Sura EPS',
      'Protección',
      'Comfandi',
      'Bancolombia',
      'Ahorros',
      '301-889977-22',
      'N/A (Nivel Central)',
      'Activo'
    ],
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
    [
      '1144332211',
      'Jorge Luis',
      'Valencia Mora',
      'Auxiliar',
      'Auxiliar Operativo de Bodega y Despachos',
      'Operaciones y Mensajería',
      'jorge.auxiliar@sergemsas.com',
      '3178889900',
      'N/A',
      'Cali',
      1423500,
      'Término Indefinido',
      2,
      'Nueva EPS',
      'Colfondos',
      'Comfandi',
      'Banco Agrario',
      'Ahorros',
      '402-334455-66',
      'Hernando Morales (Cédula: 94567890)',
      'Activo'
    ]
  ];

  const ws = XLSX.utils.aoa_to_sheet(sampleRows);
  ws['!cols'] = [
    { wch: 15 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 28 },
    { wch: 22 },
    { wch: 32 },
    { wch: 18 },
    { wch: 16 },
    { wch: 14 },
    { wch: 20 },
    { wch: 20 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 14 },
    { wch: 20 },
    { wch: 28 },
    { wch: 14 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Colaboradores_SERGEM');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'Plantilla_Registro_Colaboradores_SERGEM.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
