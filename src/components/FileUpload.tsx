"use client";

import React, { useState } from 'react';
import { uploadFileClient } from '@/lib/uploadService';

interface FileUploadProps {
  onUploadSuccess: (url: string) => void;
  onPreview?: (previewUrl: string) => void;
  accept?: string;
  label?: string;
  maxSizeMB?: number;
}

export default function FileUpload({ 
  onUploadSuccess, 
  onPreview,
  accept = "image/jpeg, image/png, image/webp, application/pdf, audio/mpeg, video/mp4, video/webm, video/*", 
  label = "Subir Archivo",
  maxSizeMB = 64
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset states
    setError(null);
    setSuccessMsg(null);

    // Vista previa inmediata para videos e imágenes
    const localBlobUrl = URL.createObjectURL(file);
    if (onPreview) {
      onPreview(localBlobUrl);
    }

    setIsUploading(true);

    // Subir el archivo
    const response = await uploadFileClient(file);

    setIsUploading(false);

    if (response.success && response.url) {
      setSuccessMsg(`¡Archivo cargado con éxito!`);
      onUploadSuccess(response.url);
      
      // Limpiar el input para permitir subir otro archivo si es necesario
      e.target.value = '';
    } else {
      setError(response.error || "Ocurrió un error inesperado al subir el archivo.");
      e.target.value = '';
    }
  };

  return (
    <div className="w-full flex flex-col gap-2">
      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
        {label} (Máx {maxSizeMB}MB)
      </label>
      
      <div className="relative w-full">
        <input
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={isUploading}
          className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-tierra focus:outline-none transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-tierra file:text-white hover:file:bg-tierra-dark disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        />
        {isUploading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-tierra text-xs font-bold uppercase tracking-wider">
            <span className="w-4 h-4 rounded-full border-2 border-tierra border-t-transparent animate-spin" />
            Subiendo...
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600 mt-1 font-bold">⚠️ {error}</p>
      )}
      {successMsg && (
        <p className="text-xs text-emerald-600 mt-1 font-bold">✓ {successMsg}</p>
      )}
    </div>
  );
}
