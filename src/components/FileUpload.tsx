import React, { useState, useRef } from 'react';
import { storageService, StorageBucket, FileUploadResult } from '../services/storage';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Download,
  ExternalLink,
  Camera,
  X,
  File
} from 'lucide-react';

export interface FileUploadProps {
  bucket: StorageBucket;
  pathPrefix: string;
  accept?: string;
  maxSizeMB?: number;
  currentFileUrl?: string;
  label?: string;
  description?: string;
  enableCamera?: boolean;
  onUploadComplete?: (result: FileUploadResult) => void;
  onRemoveFile?: () => void;
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  bucket,
  pathPrefix,
  accept = 'image/*,application/pdf',
  maxSizeMB = 10,
  currentFileUrl,
  label = 'Adjuntar Archivo',
  description = 'Arrastre o seleccione una imagen o documento PDF (Máx. 10MB)',
  enableCamera = false,
  onUploadComplete,
  onRemoveFile,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentFileUrl || null);
  const [fileName, setFileName] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const isImage = (urlOrName: string | null) => {
    if (!urlOrName) return false;
    return (
      urlOrName.startsWith('data:image') ||
      /\.(jpg|jpeg|png|webp|gif|svg|heic)/i.test(urlOrName)
    );
  };

  const isPdf = (urlOrName: string | null) => {
    if (!urlOrName) return false;
    return urlOrName.includes('.pdf') || urlOrName.startsWith('data:application/pdf');
  };

  const handleFileProcess = async (file: File) => {
    setError(null);

    // 1. Validate file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`El archivo supera el tamaño máximo permitido de ${maxSizeMB} MB.`);
      return;
    }

    setIsUploading(true);
    setFileName(file.name);

    try {
      // Create clean unique timestamped file path
      const ext = file.name.split('.').pop() || 'dat';
      const cleanName = file.name
        .substring(0, file.name.lastIndexOf('.'))
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .toLowerCase();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const finalPath = `${pathPrefix}/${cleanName}_${timestamp}.${ext}`.replace(/\/+/g, '/');

      // Upload via storage service
      const res = await storageService.uploadFile(bucket, finalPath, file, {
        contentType: file.type,
      });

      if (res.error) {
        setError(`Error al guardar archivo: ${res.error}`);
      } else {
        setPreviewUrl(res.url);
        if (onUploadComplete) {
          onUploadComplete(res);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Fallo inesperado al procesar el archivo');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleRemove = async () => {
    setPreviewUrl(null);
    setFileName(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (onRemoveFile) {
      onRemoveFile();
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <UploadCloud className="w-3.5 h-3.5 text-red-600" />
            <span>{label}</span>
          </label>
          <span className="text-[10px] text-slate-400 font-medium">Máx. {maxSizeMB}MB</span>
        </div>
      )}

      {/* Hidden native inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />
      {enableCamera && (
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleInputChange}
          className="hidden"
        />
      )}

      {/* Active File Preview Card */}
      {previewUrl ? (
        <div className="relative rounded-2xl border border-slate-200 bg-white p-3 shadow-xs hover:border-slate-300 transition-all flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {isImage(previewUrl) ? (
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 flex items-center justify-center">
                <img
                  src={previewUrl}
                  alt="Adjunto"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : isPdf(previewUrl) ? (
              <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 shrink-0 border border-red-200 flex items-center justify-center font-bold text-xs">
                <FileText className="w-6 h-6" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 shrink-0 border border-blue-200 flex items-center justify-center font-bold text-xs">
                <File className="w-6 h-6" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 truncate">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="truncate">{fileName || 'Archivo adjunto cargado'}</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Bucket: <span className="font-mono text-[10px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{bucket}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all"
                title="Abrir en pestaña nueva"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              type="button"
              onClick={handleRemove}
              className="p-2 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-700 transition-all cursor-pointer"
              title="Eliminar adjunto"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Drag and Drop Zone */
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`relative border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center transition-all cursor-pointer ${
            isDragging
              ? 'border-red-500 bg-red-50/50 scale-[0.99]'
              : 'border-slate-300 hover:border-red-400 bg-slate-50/70 hover:bg-slate-50'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? (
            <div className="flex flex-col items-center justify-center py-2 space-y-2">
              <Loader2 className="w-7 h-7 text-red-600 animate-spin" />
              <p className="text-xs font-bold text-slate-800">Subiendo a Supabase Storage...</p>
              <p className="text-[11px] text-slate-500">Generando hash y enlace seguro</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-white text-red-600 shadow-xs border border-slate-200 flex items-center justify-center mx-auto">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">
                  <span className="text-red-600 hover:underline">Haga clic para subir</span> o arrastre su archivo
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">{description}</p>
              </div>

              {enableCamera && (
                <div className="pt-1 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      cameraInputRef.current?.click();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[11px] font-bold text-slate-700 shadow-2xs hover:bg-slate-100 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-red-600" />
                    <span>Tomar Foto</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error feedback */}
      {error && (
        <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-600 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
