import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (username === 'admin' && password === 'admin') {
      const response = NextResponse.json({ success: true, message: 'Sesión iniciada correctamente.' });
      
      response.cookies.set('session', 'admin_session_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24, // 1 day
      });
      
      return response;
    }

    return NextResponse.json(
      { success: false, message: 'Usuario o contraseña incorrectos.' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Ocurrió un error en el servidor.' },
      { status: 500 }
    );
  }
}
