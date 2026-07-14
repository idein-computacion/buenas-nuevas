import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (username === 'admin' && password === '147258') {
      const response = NextResponse.json({ success: true, message: 'Autenticado con éxito' });
      
      // Set HttpOnly session cookie
      response.cookies.set({
        name: 'bn_admin_session',
        value: 'authenticated',
        httpOnly: true,
        path: '/',
        maxAge: 86400, // 24 hours
        sameSite: 'strict',
      });

      return response;
    }

    return NextResponse.json(
      { success: false, message: 'Usuario o contraseña incorrectos' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Error en el servidor' },
      { status: 500 }
    );
  }
}

// Log out route
export async function DELETE() {
  const response = NextResponse.json({ success: true, message: 'Sesión cerrada' });
  response.cookies.delete('bn_admin_session');
  return response;
}

// Check session route
export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const isAuthenticated = cookieHeader.includes('bn_admin_session=authenticated');

  return NextResponse.json({ authenticated: isAuthenticated });
}
