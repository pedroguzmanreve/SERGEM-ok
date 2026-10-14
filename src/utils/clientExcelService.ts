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

  // Hoja 1: Clientes_SERGEM con las 4 columnas requeridas exclusivamente
  const clientsData = [
    [
      'EMPRESA',
      'CENTRO_COSTO',
      'PUNTO_VENTA',
      'CIUDAD'
    ],
    [
      'ALKOSTO CALI S.A.',
      'CC-VALLE-01',
      'Alkosto Pasoancho',
      'Cali'
    ],
    [
      'ALMACENES ÉXITO S.A.',
      'CC-EXITO-CALI',
      'Éxito Chipichape',
      'Cali'
    ],
    [
      'TCC LOGÍSTICA S.A.S.',
      'CC-TCC-IND',
      'Muelle Principal Acopi',
      'Yumbo'
    ],
    [
      'DISTRIBUIDORA DE MEDICAMENTOS',
      'CC-FARMA-VALLE',
      'Sede Parque Industrial La Dolores',
      'Palmira'
    ],
    [
      'SUPERINTER SUPERMERCADOS',
      'CC-INTER-CENTRO',
      'Superinter San Fernando',
      'Cali'
    ]
  ];

  const wsClients = XLSX.utils.aoa_to_sheet(clientsData);

  wsClients['!cols'] = [
    { wch: 32 }, // EMPRESA
    { wch: 22 }, // CENTRO_COSTO
    { wch: 34 }, // PUNTO_VENTA
    { wch: 20 }, // CIUDAD
  ];

  XLSX.utils.book_append_sheet(wb, wsClients, 'Clientes_SERGEM');

  // Hoja 2: Guia_Carga_Clientes
  const instructionsData = [
    ['SERGEM MENSAJERÍA Y LOGÍSTICA S.A.S. - PLANTILLA SIMPLIFICADA DE CLIENTES'],
    ['Estructura requerida para Carga Masiva: 4 columnas exactas'],
    [''],
    ['Columna', 'Nombre en Encabezado', 'Obligatorio', 'Descripción', 'Ejemplo'],
    ['1', 'EMPRESA', 'SÍ', 'Nombre o Razón Social corporativa del cliente', 'ALKOSTO CALI S.A.'],
    ['2', 'CENTRO_COSTO', 'SÍ', 'Centro de Costo operativo (admite CENTRO_COSTO o CENTRO_C)', 'CC-VALLE-01'],
    ['3', 'PUNTO_VENTA', 'SÍ', 'Nombre de la tienda, sede o muelle de despacho', 'Alkosto Pasoancho'],
    ['4', 'CIUDAD', 'SÍ', 'Ciudad de operación de la sede', 'Cali'],
    [''],
    ['Nota: Al subir este archivo, SERGEM creará y enlazará automáticamente la Empresa, el Centro de Costo y el Punto de Venta en el sistema y Firestore.']
  ];

  const wsGuia = XLSX.utils.aoa_to_sheet(instructionsData);
  wsGuia['!cols'] = [
    { wch: 12 },
    { wch: 26 },
    { wch: 16 },
    { wch: 55 },
    { wch: 28 }
  ];

  XLSX.utils.book_append_sheet(wb, wsGuia, 'Guia_Columnas');

  // Generación binaria y descarga segura mediante Blob
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'Plantilla_Carga_Masiva_Clientes_SERGEM.xlsx';
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
