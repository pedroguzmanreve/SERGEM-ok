import React, { useState } from 'react';
import { Employee, DriverDailyAttendance } from '../types/payroll';
import {
  X,
  Phone,
  PhoneCall,
  MessageCircle,
  Copy,
  Check,
  Clock,
  AlertTriangle,
  Send,
  Building2,
  Truck,
  UserCheck,
  CheckCircle2,
  FileEdit
} from 'lucide-react';

interface ContactDriverModalProps {
  employee: Employee;
  attendance?: DriverDailyAttendance;
  callerRole: 'Administrativo' | 'Jefe de Zona';
  callerName?: string;
  onClose: () => void;
  onRecordContact?: (
    employeeId: string,
    tipo: 'WhatsApp' | 'Llamada',
    mensaje?: string,
    respuesta?: string
  ) => void;
  onMarkShiftStarted?: (employeeId: string) => void;
}

export const ContactDriverModal: React.FC<ContactDriverModalProps> = ({
  employee,
  attendance,
  callerRole,
  callerName = 'Coordinación SERGEM',
  onClose,
  onRecordContact,
  onMarkShiftStarted,
}) => {
  const [copied, setCopied] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<number>(0);
  const [customResponse, setCustomResponse] = useState<string>('');
  const [responseLogged, setResponseLogged] = useState<boolean>(false);

  // Phone processing
  const rawPhone = employee.telefono || '3000000000';
  const cleanDigits = rawPhone.replace(/\D/g, '');
  const waPhone = cleanDigits.length === 10 ? `57${cleanDigits}` : cleanDigits;

  const cliente = attendance?.clienteNombre || 'Sede Asignada SERGEM';
  const horaInicio = attendance?.horaInicioProgramada || '07:00 AM';
  const dia = attendance?.diaSemana || 'Hoy';

  // Message templates
  const templates = [
    {
      id: 0,
      title: 'Recordatorio de Turno & Conexión',
      tag: 'Recomendado',
      text: `¡Hola ${employee.nombre}! Te saludamos de SERGEM S.A.S. Te recordamos que tu turno de ${dia} con el cliente "${cliente}" está programado para iniciar a las ${horaInicio}. En nuestro sistema registramos que aún no has iniciado tu jornada en el portal. Por favor ingresa a registrar tu turno o comunícate de inmediato si tienes algún inconveniente.`,
    },
    {
      id: 1,
      title: 'Consulta de Novedad / Retraso',
      tag: 'Novedades',
      text: `Hola ${employee.nombre}, desde SERGEM S.A.S. notamos que tienes un retraso para el inicio de tu turno de las ${horaInicio} en ${cliente}. ¿Presentas alguna novedad, dificultad en la ruta o problema con tu vehículo (${employee.placaVehiculo || 'motocicleta'})? Por favor avísanos para coordinar el apoyo.`,
    },
    {
      id: 2,
      title: 'Urgente - Cliente en Espera',
      tag: 'Prioridad Alta',
      text: `⚠️ URGENTE: ${employee.nombre}, el cliente "${cliente}" se encuentra a la espera del inicio de la operación. Tu turno estaba programado para las ${horaInicio}. Por favor comunícate urgente con tu supervisor (${callerName}) o responde este mensaje.`,
    },
  ];

  const [message, setMessage] = useState<string>(templates[0].text);

  const handleSelectTemplate = (idx: number) => {
    setSelectedTemplate(idx);
    setMessage(templates[idx].text);
  };

  const handleOpenWhatsApp = () => {
    const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    if (onRecordContact) {
      onRecordContact(employee.id, 'WhatsApp', message);
    }
  };

  const handleMakeCall = () => {
    window.location.href = `tel:${cleanDigits}`;

    if (onRecordContact) {
      onRecordContact(employee.id, 'Llamada', 'Llamada directa telefónica efectuada');
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveResponse = () => {
    if (!customResponse.trim()) return;
    if (onRecordContact) {
      onRecordContact(
        employee.id,
        'Llamada',
        message,
        customResponse.trim()
      );
    }
    setResponseLogged(true);
    setTimeout(() => {
      setResponseLogged(false);
      onClose();
    }, 1500);
  };

  return (
    <div
      id="contact-driver-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="bg-slate-50 text-slate-900 px-6 py-4 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 border border-red-200/80 flex items-center justify-center">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900">
                  Contactar a {employee.nombre} {employee.apellido}
                </h3>
                <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  Turno sin iniciar
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Acción directa desde {callerRole} ({callerName})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs overflow-y-auto flex-1">
          
          {/* Driver & Shift Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-800 text-white font-black text-xs flex items-center justify-center">
                  {employee.nombre.charAt(0)}{employee.apellido.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm">
                    {employee.nombre} {employee.apellido}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    C.C. {employee.cedula} • Tel: <span className="font-bold text-slate-800">{rawPhone}</span>
                  </div>
                </div>
              </div>

              {employee.placaVehiculo && (
                <span className="inline-flex items-center space-x-1 font-mono font-black text-slate-800 bg-amber-50 border border-amber-200/90 px-2.5 py-1 rounded-lg text-xs">
                  <Truck className="w-3.5 h-3.5 text-amber-700" />
                  <span>{employee.placaVehiculo}</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200/80 text-[11px]">
              <div>
                <span className="text-slate-400 block font-medium">Cliente Asignado:</span>
                <span className="font-bold text-slate-800 truncate block">{cliente}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Hora de Turno:</span>
                <span className="font-bold text-red-700 font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3 text-red-600" />
                  {horaInicio}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Estado de Conexión:</span>
                <span className="font-extrabold text-amber-700">
                  {attendance?.minutosRetraso ? `Retraso (${attendance.minutosRetraso} min)` : 'Pendiente inicio'}
                </span>
              </div>
            </div>

            {attendance?.ultimoContacto && (
              <div className="bg-white border border-slate-200 rounded-lg p-2 text-[11px] text-slate-600 flex items-center justify-between">
                <span className="font-medium">
                  Último contacto vía <strong className="text-slate-800">{attendance.ultimoContacto.tipo}</strong>: {attendance.ultimoContacto.fechaHora}
                </span>
                {attendance.ultimoContacto.respuestaRegistrada && (
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {attendance.ultimoContacto.respuestaRegistrada}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Quick Direct Actions Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleOpenWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center space-x-2.5 cursor-pointer active:scale-95 text-xs"
            >
              <MessageCircle className="w-4.5 h-4.5" />
              <span>Enviar Mensaje por WhatsApp</span>
            </button>

            <button
              onClick={handleMakeCall}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center space-x-2.5 cursor-pointer active:scale-95 text-xs"
            >
              <Phone className="w-4.5 h-4.5 text-emerald-400" />
              <span>Llamar a Teléfono Directo</span>
            </button>
          </div>

          {/* Message Template Selector */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-700">
              Plantillas de Mensaje Automático:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleSelectTemplate(tpl.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedTemplate === tpl.id
                      ? 'bg-red-50/80 border-red-500 text-red-950 ring-1 ring-red-500'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="block font-bold text-[11px] mb-0.5 truncate">{tpl.title}</span>
                  <span
                    className={`inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                      selectedTemplate === tpl.id
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {tpl.tag}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Message Preview & Editor */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-slate-700">
                Texto del Mensaje (Editable):
              </label>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copiar texto</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-xl text-xs text-slate-800 font-medium focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all bg-white"
            />
          </div>

          {/* Quick Logging of Driver Response */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
            <label className="block font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
              <FileEdit className="w-3.5 h-3.5 text-slate-600" />
              <span>Registrar Resultado de la Llamada / Contacto:</span>
            </label>
            
            <div className="flex flex-wrap gap-1.5">
              {[
                'Reportó que viene en camino (10 min)',
                'Reportó que viene en camino (20 min)',
                'Presenta avería de vehículo',
                'Reportó calamidad o incapacidad',
                'No contestó llamada ni WhatsApp',
              ].map((quickText) => (
                <button
                  key={quickText}
                  type="button"
                  onClick={() => setCustomResponse(quickText)}
                  className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-[10px] font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {quickText}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Escribe el resultado de la llamada..."
                value={customResponse}
                onChange={(e) => setCustomResponse(e.target.value)}
                className="flex-1 p-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
              <button
                type="button"
                onClick={handleSaveResponse}
                disabled={!customResponse.trim()}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-bold rounded-lg text-xs cursor-pointer transition-colors whitespace-nowrap"
              >
                {responseLogged ? '¡Guardado!' : 'Guardar Log'}
              </button>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div>
            {onMarkShiftStarted && (
              <button
                type="button"
                onClick={() => {
                  onMarkShiftStarted(employee.id);
                  onClose();
                }}
                className="text-xs font-bold text-slate-700 hover:text-emerald-700 bg-white border border-slate-300 hover:border-emerald-500 px-3 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Marcar inicio de turno manual</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-xl transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
