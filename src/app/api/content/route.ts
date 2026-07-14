import { NextResponse } from 'next/server';
import { 
  readDb, 
  updateVerse, 
  saveDbItem, 
  deleteDbItem, 
  addGalleryPhoto, 
  deleteGalleryPhoto,
  saveMessage,
  deleteMessage,
  toggleMessageRead
} from '@/lib/db';

// Helper to verify auth
function checkAuth(request: Request): boolean {
  const cookieHeader = request.headers.get('cookie') || '';
  return cookieHeader.includes('bn_admin_session=authenticated');
}

// GET all content
export async function GET(request: Request) {
  const data = readDb();
  if (!checkAuth(request)) {
    // Return copy of data without messages for public users
    const { messages, ...publicData } = data;
    return NextResponse.json({ success: true, data: publicData });
  }
  return NextResponse.json({ success: true, data });
}

// POST modifications
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    // Public action: anyone can submit a contact message
    if (action === 'submitMessage') {
      const { name, phone, message } = body;
      if (!name || !phone || !message) {
        return NextResponse.json({ success: false, message: 'Campos requeridos incompletos' }, { status: 400 });
      }
      const result = saveMessage(name, phone, message);
      if (result) {
        return NextResponse.json({ success: true, message: 'Mensaje enviado con éxito' });
      }
      return NextResponse.json({ success: false, message: 'Error al registrar el mensaje' }, { status: 500 });
    }

    // Protected actions (require admin login)
    if (!checkAuth(request)) {
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });
    }

    let result = false;

    switch (action) {
      case 'updateVerse':
        result = updateVerse(body.verse);
        break;

      case 'saveItem':
        result = saveDbItem(body.type, body.item);
        break;

      case 'deleteItem':
        result = deleteDbItem(body.type, body.id);
        break;

      case 'addPhoto':
        result = addGalleryPhoto(body.photoUrl);
        break;

      case 'deletePhoto':
        result = deleteGalleryPhoto(body.photoUrl);
        break;

      case 'toggleMessageRead':
        result = toggleMessageRead(body.id);
        break;

      case 'deleteMessage':
        result = deleteMessage(body.id);
        break;

      default:
        return NextResponse.json({ success: false, message: 'Acción no válida' }, { status: 400 });
    }

    if (result) {
      return NextResponse.json({ success: true, message: 'Operación realizada con éxito' });
    } else {
      return NextResponse.json({ success: false, message: 'Error al escribir en la base de datos' }, { status: 500 });
    }
  } catch (error) {
    console.error('API content error:', error);
    return NextResponse.json({ success: false, message: 'Error procesando la solicitud' }, { status: 500 });
  }
}
