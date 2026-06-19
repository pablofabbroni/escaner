import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      fechaEmision,
      cuitReceptor,
      tipoComprobante,
      condicionReceptor,
      puntoVenta,
      nroComprobante,
      total,
    } = body;

    // Validaciones
    if (
      !fechaEmision ||
      !cuitReceptor ||
      !tipoComprobante ||
      !condicionReceptor ||
      !puntoVenta ||
      !nroComprobante ||
      total === undefined
    ) {
      return NextResponse.json(
        { success: false, message: 'Todos los campos son obligatorios.' },
        { status: 400 }
      );
    }

    const parsedDate = new Date(fechaEmision);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { success: false, message: 'La fecha de emisión no es válida.' },
        { status: 400 }
      );
    }

    const numericTotal = parseFloat(total);
    if (isNaN(numericTotal)) {
      return NextResponse.json(
        { success: false, message: 'El total debe ser un número válido.' },
        { status: 400 }
      );
    }

    // Insertar en la Base de Datos
    const comprobante = await prisma.comprobante.create({
      data: {
        fechaEmision: parsedDate,
        cuitReceptor,
        tipoComprobante,
        condicionReceptor,
        puntoVenta,
        nroComprobante,
        total: numericTotal,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Comprobante guardado y validado correctamente.',
      data: comprobante,
    });
  } catch (error: any) {
    console.error('Error al guardar comprobante:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Ocurrió un error en el servidor al intentar guardar.',
        details: error.message
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Obtener los comprobantes ordenados por fecha de emisión descendente
    const comprobantes = await prisma.comprobante.findMany({
      orderBy: {
        fechaEmision: 'desc',
      },
    });

    // Calcular las métricas agregadas
    const count = comprobantes.length;
    const totalAmount = comprobantes.reduce((sum, item) => sum + item.total, 0);

    return NextResponse.json({
      success: true,
      data: comprobantes,
      metrics: {
        count,
        totalAmount,
      },
    });
  } catch (error: any) {
    console.error('Error al obtener comprobantes:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Ocurrió un error en el servidor al obtener datos.',
        details: error.message
      },
      { status: 500 }
    );
  }
}
