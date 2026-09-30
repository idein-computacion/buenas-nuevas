"use client";

import React, { useState } from 'react';
import { uploadFileClient } from '@/lib/uploadService';

interface FileUploadProps {
  onUploadSuccess: (url: string) => void;
  accept?: string;
  label?: string;
  maxSizeMB?: number;
}

export default function FileUpload({ 
  onUploadSuccess, 
  accept = "image/jpeg, image/png, image/webp, application/pdf, audio/mpeg", 
  label = "Subir Archivo",
  maxSizeMB = 50
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
    setIsUploading(true);

    // Subir el archivo
    const response = await uploadFileClient(file);

    setIsUploading(false);

    if (response.success && response.url) {
      setSuccessMsg(`¡Archivo cargado! Recordá hacer clic en el botón de abajo para guardar los cambios.`);
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
      <label className="text-[10px] font-bold text-dorado uppercase tracking-wider block">
        {label} (Máx {maxSizeMB}MB)
      </label>
      
      <div className="relative w-full">
        <input
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={isUploading}
          className="w-full bg-monte-dark/60 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-dorado focus:outline-none transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-dorado file:text-crema hover:file:bg-dorado/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        />
        {isUploading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-dorado text-xs font-bold uppercase tracking-wider">
            <span className="w-4 h-4 rounded-full border-2 border-dorado border-t-transparent animate-spin" />
            Subiendo...
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-400 mt-1 font-bold">⚠️ {error}</p>
      )}
      {successMsg && (
        <p className="text-xs text-emerald-400 mt-1 font-bold">✓ {successMsg}</p>
      )}
    </div>
  );
}
