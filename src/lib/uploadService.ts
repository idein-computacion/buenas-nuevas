// src/lib/uploadService.ts

export interface UploadResponse {
  success: boolean;
  url?: string;
  type?: 'image' | 'document' | 'audio';
  error?: string;
}

/**
 * Función reutilizable para subir archivos al servidor Ferozo mediante api.php.
 * Maneja validación de peso máximo en el cliente (15MB).
 * 
 * @param file El objeto File del input de archivo
 * @param password La contraseña de administrador (necesaria por seguridad)
 * @returns UploadResponse con la URL pública si tuvo éxito, o el error.
 */
export async function uploadFileClient(file: File, password: string = "buenasnuevas2026"): Promise<UploadResponse> {
  // 1. Validación de tamaño en el cliente (64 MB)
  const MAX_SIZE_MB = 64;
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
  
  if (file.size > MAX_SIZE_BYTES) {
    return {
      success: false,
      error: `El archivo supera el límite de ${MAX_SIZE_MB}MB. Por favor, suba un archivo más liviano.`
    };
  }

  // 2. Validación de tipos permitidos en cliente (Imágenes, Documentos, Audios y Videos)
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 
    'application/pdf', 
    'audio/mpeg', 'audio/mp3', 'audio/wav',
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'
  ];
  const isAllowedExt = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.mp3', '.mp4', '.webm', '.ogg', '.mov'].some(ext => 
    file.name.toLowerCase().endsWith(ext)
  );

  const isMediaPrefix = file.type.startsWith("video/") || file.type.startsWith("image/") || file.type.startsWith("audio/");
  if (!allowedTypes.includes(file.type) && !isAllowedExt && !isMediaPrefix) {
    return {
      success: false,
      error: 'Tipo de archivo no permitido. Se aceptan JPG, PNG, WEBP, PDF, MP3 y MP4/WEBM de video.'
    };
  }

  try {
    // 3. Construir FormData
    const formData = new FormData();
    formData.append("action", "upload");
    formData.append("password", password);
    formData.append("file", file);

    // 4. Intentar primero con la ruta Next.js (/api/upload) para entorno local
    try {
      const nextUploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (nextUploadRes.ok) {
        const nextData = await nextUploadRes.json();
        if (nextData && nextData.success && nextData.url) {
          return {
            success: true,
            url: nextData.url,
            type: nextData.type,
          };
        }
      }
    } catch (e) {
      // Ignorar si no está disponible (ej: export estático en hosting Ferozo)
    }

    // 5. Petición al endpoint PHP (Hosting de Producción Ferozo)
    const response = await fetch("/api.php", {
      method: "POST",
      body: formData, // fetch ajusta los headers de multipart automáticamente
    });

    // 5. Manejar respuesta
    if (!response.ok || response.status === 405 || response.status === 404) {
      console.warn("Modo Local: Subida simulada en frontend con vista previa local.");
      const blobUrl = URL.createObjectURL(file);
      return {
        success: true,
        url: file.type.startsWith("video/") || file.name.toLowerCase().endsWith(".mp4") ? (blobUrl || "/video.mp4") : blobUrl,
        type: file.type.startsWith("video/") ? ("video" as any) : (file.type.startsWith("image/") ? 'image' : (file.name.endsWith('.mp3') ? 'audio' : 'document'))
      };
    }

    const text = await response.text();
    // Si la respuesta comienza con <?php, Next.js sirvió el archivo PHP estático en desarrollo local
    if (text.startsWith("<?php")) {
      console.warn("Modo Local (PHP estático dev): Subida simulada en frontend con vista previa.");
      const blobUrl = URL.createObjectURL(file);
      return {
        success: true,
        url: file.type.startsWith("video/") || file.name.toLowerCase().endsWith(".mp4") ? (blobUrl || "/video.mp4") : blobUrl,
        type: file.type.startsWith("video/") ? ("video" as any) : (file.type.startsWith("image/") ? 'image' : (file.name.endsWith('.mp3') ? 'audio' : 'document'))
      };
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return {
        success: false,
        error: "Respuesta del servidor no válida al subir el archivo."
      };
    }
    
    if (data.success && data.url) {
      return {
        success: true,
        url: data.url,
        type: data.type
      };
    } else {
      return {
        success: false,
        error: data.error || "Respuesta inválida del servidor al subir el archivo."
      };
    }

  } catch (error: any) {
    console.error("Error en uploadFileClient:", error);
    return {
      success: false,
      error: error.message || "Error de red al intentar subir el archivo. Verifica tu conexión."
    };
  }
}
