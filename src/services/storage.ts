import { supabase } from '../lib/supabase';

export type StorageBucket = 
  | 'driver-audits' 
  | 'novedades-attachments' 
  | 'payroll-receipts' 
  | 'employee-docs';

export interface FileUploadResult {
  path: string;
  url: string;
  isSigned: boolean;
  error: string | null;
}

export interface StorageFileItem {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: Record<string, any>;
}

// In-memory fallback cache for offline or unconfigured environments
const localFileCache: Map<string, { dataUrl: string; name: string; type: string; timestamp: number }> = new Map();

/**
 * Servicio de Almacenamiento Supabase Storage para SERGEM S.A.S.
 * Permite gestionar evidencias fotográficas, incapacidades médicas, comprobantes y contratos.
 */
export const storageService = {
  /**
   * Sube un archivo a un bucket específico en Supabase Storage
   * @param bucket Nombre del bucket ('driver-audits', 'novedades-attachments', etc.)
   * @param filePath Ruta interna del archivo (ej. "repartidores/1144004455/auditoria_2026-03-01.jpg")
   * @param file Archivo Blob o File a subir
   * @param options Opciones de subida como sobrescribir
   */
  async uploadFile(
    bucket: StorageBucket,
    filePath: string,
    file: File | Blob,
    options: { upsert?: boolean; contentType?: string } = { upsert: true }
  ): Promise<FileUploadResult> {
    try {
      // Normalizar nombre de ruta
      const cleanPath = filePath.replace(/^\/+/, '').replace(/\s+/g, '_');
      const contentType = options.contentType || (file instanceof File ? file.type : 'application/octet-stream');

      // Intentar subir a Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(cleanPath, file, {
          cacheControl: '3600',
          upsert: options.upsert !== false,
          contentType,
        });

      if (error) {
        console.warn(`[Supabase Storage] Error al subir a "${bucket}/${cleanPath}":`, error.message);
        
        // Modo local de reserva (guarda DataURL para que la UI no se bloquee)
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        
        const localKey = `${bucket}:${cleanPath}`;
        localFileCache.set(localKey, {
          dataUrl,
          name: cleanPath.split('/').pop() || 'archivo',
          type: contentType,
          timestamp: Date.now(),
        });

        return {
          path: cleanPath,
          url: dataUrl,
          isSigned: false,
          error: null, // Provee la URL de fallback sin romper el flujo
        };
      }

      // Obtener URL de acceso
      const publicBuckets: StorageBucket[] = ['driver-audits'];
      if (publicBuckets.includes(bucket)) {
        const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(cleanPath);
        return {
          path: data.path,
          url: publicUrlData.publicUrl,
          isSigned: false,
          error: null,
        };
      } else {
        // Generar URL firmada de 2 horas (7200s) para documentos protegidos
        const signedRes = await this.createSignedUrl(bucket, cleanPath, 7200);
        return {
          path: data.path,
          url: signedRes.url,
          isSigned: true,
          error: null,
        };
      }
    } catch (err: any) {
      console.error('[Supabase Storage] Fallo general en uploadFile:', err);
      return {
        path: filePath,
        url: '',
        isSigned: false,
        error: err?.message || 'Error inesperado al subir archivo',
      };
    }
  },

  /**
   * Sube una imagen en formato Base64 directamente a Supabase Storage
   */
  async uploadBase64(
    bucket: StorageBucket,
    filePath: string,
    base64Data: string,
    contentType: string = 'image/jpeg'
  ): Promise<FileUploadResult> {
    try {
      // Extraer datos limpios sin el prefijo data:image/...;base64,
      const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      const byteCharacters = atob(cleanBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: contentType });

      return await this.uploadFile(bucket, filePath, blob, { contentType, upsert: true });
    } catch (err: any) {
      console.error('[Supabase Storage] Error en uploadBase64:', err);
      return {
        path: filePath,
        url: base64Data, // Retornar el base64 como URL de respaldo
        isSigned: false,
        error: null,
      };
    }
  },

  /**
   * Obtiene la URL pública directa para un archivo
   */
  getPublicUrl(bucket: StorageBucket, filePath: string): string {
    const localKey = `${bucket}:${filePath}`;
    if (localFileCache.has(localKey)) {
      return localFileCache.get(localKey)!.dataUrl;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  },

  /**
   * Genera una URL firmada con tiempo de expiración (para documentos con privacidad RBAC)
   */
  async createSignedUrl(
    bucket: StorageBucket,
    filePath: string,
    expiresInSeconds: number = 3600
  ): Promise<{ url: string; error: string | null }> {
    try {
      const localKey = `${bucket}:${filePath}`;
      if (localFileCache.has(localKey)) {
        return { url: localFileCache.get(localKey)!.dataUrl, error: null };
      }

      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, expiresInSeconds);

      if (error) {
        // Fallback a URL pública
        const pub = this.getPublicUrl(bucket, filePath);
        return { url: pub, error: error.message };
      }

      return { url: data.signedUrl, error: null };
    } catch (err: any) {
      return { url: '', error: err?.message || 'Error al generar URL firmada' };
    }
  },

  /**
   * Descarga un archivo directamente al navegador del usuario
   */
  async downloadFile(
    bucket: StorageBucket,
    filePath: string,
    downloadFilename?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const localKey = `${bucket}:${filePath}`;
      if (localFileCache.has(localKey)) {
        const item = localFileCache.get(localKey)!;
        const link = document.createElement('a');
        link.href = item.dataUrl;
        link.download = downloadFilename || item.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return { success: true };
      }

      const { data, error } = await supabase.storage.from(bucket).download(filePath);
      if (error || !data) {
        throw error || new Error('No se recibieron datos del archivo');
      }

      const blobUrl = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = downloadFilename || filePath.split('/').pop() || 'archivo_sergem';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      return { success: true };
    } catch (err: any) {
      console.error('[Supabase Storage] Error en downloadFile:', err);
      return { success: false, error: err?.message || 'Error al descargar archivo' };
    }
  },

  /**
   * Elimina un archivo del bucket
   */
  async deleteFile(bucket: StorageBucket, filePaths: string | string[]): Promise<{ success: boolean; error?: string }> {
    try {
      const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
      
      // Limpiar cache local si existe
      paths.forEach((p) => localFileCache.delete(`${bucket}:${p}`));

      const { error } = await supabase.storage.from(bucket).remove(paths);
      if (error) {
        console.warn('[Supabase Storage] Error al eliminar:', error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error al eliminar archivo' };
    }
  },

  /**
   * Lista los archivos en una carpeta o bucket
   */
  async listFiles(bucket: StorageBucket, path: string = ''): Promise<{ data: StorageFileItem[]; error: string | null }> {
    try {
      const { data, error } = await supabase.storage.from(bucket).list(path, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
      });

      if (error) {
        return { data: [], error: error.message };
      }

      return { data: (data as any) || [], error: null };
    } catch (err: any) {
      return { data: [], error: err?.message || 'Error al listar archivos' };
    }
  },
};
