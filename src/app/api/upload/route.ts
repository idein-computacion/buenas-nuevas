import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { addGalleryPhoto } from '@/lib/db';

// Helper to verify auth
function checkAuth(request: Request): boolean {
  const cookieHeader = request.headers.get('cookie') || '';
  return cookieHeader.includes('bn_admin_session=authenticated');
}

export async function POST(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const addToGallery = formData.get('addToGallery') === 'true';

    if (!file) {
      return NextResponse.json({ success: false, message: 'Archivo no encontrado' }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to public/uploads
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    
    // Ensure upload directory exists
    await mkdir(uploadDir, { recursive: true });

    // Generate safe unique filename
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const cleanFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${uniqueSuffix}-${cleanFilename}`;
    const filePath = join(uploadDir, filename);

    // Write file
    await writeFile(filePath, buffer);
    
    const fileUrl = `/uploads/${filename}`;

    // Proactively register in gallery if requested
    if (addToGallery) {
      addGalleryPhoto(fileUrl);
    }

    return NextResponse.json({
      success: true,
      message: 'Archivo subido con éxito',
      url: fileUrl
    });

  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json({ success: false, message: 'Error al subir el archivo' }, { status: 500 });
  }
}
