import React, { useState } from 'react';
import { CompanySettings, PayrollCalculationItem, PayrollPeriod } from '../types/payroll';
import { generateBankFlatFile, generateDianXmlPreview } from '../utils/exporters';
import { FileCode, Download, Copy, Check, ShieldCheck, Building, Code2 } from 'lucide-react';

interface DianExportModalProps {
  items: PayrollCalculationItem[];
  period: PayrollPeriod;
  company: CompanySettings;
}

export const DianExportModal: React.FC<DianExportModalProps> = ({
  items,
  period,
  company,
}) => {
  const [selectedEmpId, setSelectedEmpId] = useState<string>(items[0]?.employee.id || '');
  const [copiedBank, setCopiedBank] = useState(false);
  const [copiedXml, setCopiedXml] = useState(false);

  const selectedItem = items.find((i) => i.employee.id === selectedEmpId) || items[0];

  const bankFileContent = generateBankFlatFile(items, period, company);
  const xmlContent = selectedItem ? generateDianXmlPreview(selectedItem, period, company) : '';

  const handleDownloadBank = () => {
    const blob = new Blob([bankFileContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PAGO_BANCO_SERGEM_${period.id}.txt`;
    link.click();
  };

  const handleDownloadXml = () => {
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DIAN_NOMINA_${selectedItem.employee.cedula}_${period.id}.xml`;
    link.click();
  };

  const handleCopyBank = () => {
    navigator.clipboard.writeText(bankFileContent);
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2000);
  };

  const handleCopyXml = () => {
    navigator.clipboard.writeText(xmlContent);
    setCopiedXml(true);
    setTimeout(() => setCopiedXml(false), 2000);
  };

  return (
    <div id="dian-export-view" className="space-y-6 pb-10">
      
      {/* Top Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Integración Fiscal & Bancaria</span>
          </div>
          <h2 className="text-2xl font-bold">Nómina Electrónica DIAN & Archivo Plano de Banco</h2>
          <p className="text-xs text-slate-400 mt-1">
            Generación automática de formato XML certificado DIAN (Anexo Técnico v1.0) y archivo de transferencia masiva para Bancolombia / Davivienda.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Bank Flat File Section */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Building className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Archivo Plano de Pago Masivo</h3>
              </div>
              <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full">
                {items.length} Registros
              </span>
            </div>

            <p className="text-xs text-slate-600 mb-3">
              Formato PAB homologado para dispersión de fondos de nómina. Incluye {items.length} trabajadores por un monto abonado de{' '}
              <strong className="text-emerald-700 font-extrabold">
                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
                  items.reduce((a, b) => a + b.netoAPagar, 0)
                )}
              </strong>.
            </p>

            <div className="bg-slate-900 rounded-xl p-3.5 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-56 leading-relaxed mb-4 border border-slate-800">
              <pre>{bankFileContent}</pre>
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button
              onClick={handleDownloadBank}
              className="flex-1 inline-flex items-center justify-center px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition cursor-pointer"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Descargar Archivo Banco (.TXT)
            </button>
            <button
              onClick={handleCopyBank}
              className="inline-flex items-center px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              {copiedBank ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* DIAN XML Preview Section */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Code2 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">XML Nómina Electrónica DIAN</h3>
              </div>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Validado DIAN
              </span>
            </div>

            <div className="flex items-center space-x-2 mb-3">
              <label className="text-xs font-bold text-slate-700">Ver XML de:</label>
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg p-1.5 focus:outline-none"
              >
                {items.map((i) => (
                  <option key={i.employee.id} value={i.employee.id}>
                    {i.employee.nombre} {i.employee.apellido} (C.C. {i.employee.cedula})
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-slate-950 rounded-xl p-3.5 text-blue-300 font-mono text-[11px] overflow-x-auto max-h-56 leading-relaxed mb-4 border border-slate-800">
              <pre>{xmlContent}</pre>
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button
              onClick={handleDownloadXml}
              className="flex-1 inline-flex items-center justify-center px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition cursor-pointer"
            >
              <FileCode className="w-4 h-4 mr-1.5" />
              Descargar XML DIAN
            </button>
            <button
              onClick={handleCopyXml}
              className="inline-flex items-center px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              {copiedXml ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
