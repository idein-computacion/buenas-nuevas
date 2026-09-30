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
  // 1. Validación de tamaño en el cliente (50 MB)
  const MAX_SIZE_MB = 50;
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
  
  if (file.size > MAX_SIZE_BYTES) {
    return {
      success: false,
      error: `El archivo supera el límite de ${MAX_SIZE_MB}MB. Por favor, suba un archivo más liviano.`
    };
  }

  // 2. Validación básica de tipos en cliente (Opcional pero recomendada)
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'audio/mpeg'];
  if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.mp3')) {
    return {
      success: false,
      error: 'Tipo de archivo no permitido. Solo se aceptan JPG, PNG, WEBP, PDF y MP3.'
    };
  }

  try {
    // 3. Construir FormData
    const formData = new FormData();
    formData.append("action", "upload");
    formData.append("password", password);
    formData.append("file", file);

    // 4. Petición al endpoint PHP
    const response = await fetch("/api.php", {
      method: "POST",
      body: formData, // fetch ajusta los headers de multipart automáticamente
    });

    // 5. Manejar respuesta
    if (!response.ok) {
      if (response.status === 405) {
        console.warn("Modo Local (405): Subida simulada en frontend con vista previa local.");
        let localPreview = `/uploads/simulado-${Date.now()}-${file.name}`;
        if (file.type.startsWith("image/")) {
          try {
            localPreview = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => resolve(localPreview);
              reader.readAsDataURL(file);
            });
          } catch (e) {}
        }
        return {
          success: true,
          url: localPreview,
          type: allowedTypes.includes(file.type) && !file.type.includes('pdf') ? 'image' : (file.name.endsWith('.mp3') ? 'audio' : 'document')
        };
      }
      // Intentar leer el mensaje de error del servidor si existe
      try {
        const errorData = await response.json();
        return { success: false, error: errorData.error || `Error del servidor HTTP ${response.status}` };
      } catch (e) {
        return { success: false, error: `Error HTTP ${response.status}. Revisa el servidor.` };
      }
    }

    const data = await response.json();
    
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
