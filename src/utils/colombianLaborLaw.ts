// Colombian Labor Law (Reforma Laboral 2025/2026 - Ley 2101 de 2021)
// Reducción progresiva de la jornada laboral: 42 Horas Semanales a partir de Julio/2026.

export const COLOMBIA_HOLIDAYS_2026: string[] = [
  '2026-01-01', // Año Nuevo
  '2026-01-06', // Reyes Magos
  '2026-03-23', // Día de San José
  '2026-04-02', // Jueves Santo
  '2026-04-03', // Viernes Santo
  '2026-05-01', // Día del Trabajo
  '2026-05-18', // Ascensión del Señor
  '2026-06-08', // Corpus Christi
  '2026-06-15', // Sagrado Corazón
  '2026-06-29', // San Pedro y San Pablo
  '2026-07-20', // Día de la Independencia
  '2026-08-07', // Batalla de Boyacá
  '2026-08-17', // Asunción de la Virgen
  '2026-10-12', // Día de la Raza
  '2026-11-02', // Todos los Santos
  '2026-11-16', // Independencia de Cartagena
  '2026-12-08', // Inmaculada Concepción
  '2026-12-25', // Navidad
];

export const COLOMBIA_HOLIDAYS_2027: string[] = [
  '2027-01-01', // Año Nuevo
  '2027-01-11', // Reyes Magos
  '2027-03-22', // Día de San José
  '2027-03-25', // Jueves Santo
  '2027-03-26', // Viernes Santo
  '2027-05-01', // Día del Trabajo
  '2027-05-10', // Ascensión del Señor
  '2027-05-31', // Corpus Christi
  '2027-06-07', // Sagrado Corazón
  '2027-07-05', // San Pedro y San Pablo
  '2027-07-20', // Día de la Independencia
  '2027-08-07', // Batalla de Boyacá
  '2027-08-16', // Asunción de la Virgen
  '2027-10-18', // Día de la Raza
  '2027-11-01', // Todos los Santos
  '2027-11-15', // Independencia de Cartagena
  '2027-12-08', // Inmaculada Concepción
  '2027-12-25', // Navidad
];

/**
 * Checks if a given YYYY-MM-DD date is a holiday or Sunday in Colombia.
 */
export function isHolidayOrSundayInColombia(dateStr: string): boolean {
  const date = new Date(dateStr + 'T00:00:00');
  const dayOfWeek = date.getDay(); // 0 is Sunday
  if (dayOfWeek === 0) return true;

  return (
    COLOMBIA_HOLIDAYS_2026.includes(dateStr) ||
    COLOMBIA_HOLIDAYS_2027.includes(dateStr)
  );
}

/**
 * Legal parameters according to Reforma Laboral Colombia 2026 (42h/semana)
 */
export const LABOR_REFORM_2026 = {
  jornadaSemanalMaxima: 42, // Horas semanales ordinarias a partir de junio/julio 2026
  jornadaDiariaBase: 7, // 42h / 6 días hábiles = 7h por día promedio
  recargos: {
    horaExtraDiurna: 0.25, // +25%
    horaExtraNocturna: 0.75, // +75%
    horaRecargoNocturno: 0.35, // +35% (6:00 PM a 6:00 AM)
    horaDominicalFestiva: 1.0, // +100% (según la reforma gradual hacia 100%)
    horaExtraDominicalDiurna: 1.25, // Ordinaria + Dominical + Extra
    horaExtraDominicalNocturna: 1.75,
  },
};

/**
 * Calculates breakdown of hours for a shift/day or client log based on 42h weekly reform & Sunday/Holiday rules.
 */
export function calculateHoursBreakdown(
  totalHours: number,
  dateStr: string,
  isNightShift: boolean = false
) {
  const isFestive = isHolidayOrSundayInColombia(dateStr);
  const maxOrdinaryDaily = LABOR_REFORM_2026.jornadaDiariaBase;

  let horasOrdinarias = 0;
  let horasExtrasDiurnas = 0;
  let horasExtrasNocturnas = 0;
  let horasFestivas = 0;

  if (isFestive) {
    // If worked on a Sunday or holiday in Colombia
    horasFestivas = totalHours;
  } else {
    if (totalHours <= maxOrdinaryDaily) {
      horasOrdinarias = totalHours;
    } else {
      horasOrdinarias = maxOrdinaryDaily;
      const extraHours = totalHours - maxOrdinaryDaily;
      if (isNightShift) {
        horasExtrasNocturnas = extraHours;
      } else {
        horasExtrasDiurnas = extraHours;
      }
    }
  }

  return {
    horasTrabajadas: totalHours,
    horasOrdinarias,
    horasExtrasDiurnas,
    horasExtrasNocturnas,
    horasFestivas,
  };
}
