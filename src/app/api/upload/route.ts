import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No se ha proporcionado ningún archivo.' },
        { status: 400 }
      );
    }

    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    
    // Check if we should use mock fallback (e.g. if env is missing or is explicitly requested via query)
    const { searchParams } = new URL(request.url);
    const forceMock = searchParams.get('mock') === 'true';

    if (forceMock || !n8nWebhookUrl) {
      console.warn('Usando respuesta OCR simulada (mock) para pruebas.');
      const mockOcrData = generateMockOcrData(file.name);
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return NextResponse.json({
        success: true,
        ocrData: mockOcrData,
        isMocked: true
      });
    }

    // Prepare FormData to send to n8n
    const n8nFormData = new FormData();
    n8nFormData.append('file', file, file.name);

    try {
      console.log(`Enviando archivo '${file.name}' a n8n webhook: ${n8nWebhookUrl}`);
      const response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        body: n8nFormData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('n8n error response:', errorText);
        // Fallback to mock data on error so the frontend flow can still be demoed
        console.warn('El webhook de n8n retornó un error. Usando mock OCR de contingencia.');
        const mockOcrData = generateMockOcrData(file.name);
        return NextResponse.json({
          success: true,
          ocrData: mockOcrData,
          isMocked: true,
          warning: 'La conexión con n8n falló (status: ' + response.status + '). Se utilizaron datos simulados.'
        });
      }

      const data = await response.json();
      return NextResponse.json({
        success: true,
        ocrData: data,
        isMocked: false
      });
    } catch (fetchError: any) {
      console.error('No se pudo conectar con n8n. Detalle:', fetchError.message);
      console.warn('Generando datos OCR simulados de contingencia.');
      const mockOcrData = generateMockOcrData(file.name);
      return NextResponse.json({
        success: true,
        ocrData: mockOcrData,
        isMocked: true,
        warning: `El webhook de n8n no está disponible (Detalle: ${fetchError.message}). Se utilizaron datos simulados.`
      });
    }
  } catch (error: any) {
    console.error('Error en API upload route:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Ocurrió un error al procesar el archivo en el servidor.',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// Helper to generate realistic OCR data based on file name or defaults
function generateMockOcrData(filename: string) {
  const cleanName = filename.toLowerCase();
  
  let total = 85400.00;
  let tipoComprobante = 'A';
  let cuitReceptor = '20-33444555-8';
  let condicionReceptor = 'IVA Responsable Inscripto';
  let puntoVenta = '0004';
  let nroComprobante = '00008432';
  
  if (cleanName.includes('factura_c') || cleanName.includes('monotributo')) {
    tipoComprobante = 'C';
    total = 12500.00;
    condicionReceptor = 'Responsable Monotributo';
  } else if (cleanName.includes('ticket') || cleanName.includes('b')) {
    tipoComprobante = 'B';
    total = 3850.50;
    condicionReceptor = 'Consumidor Final';
    puntoVenta = '0012';
    nroComprobante = '00192843';
  }

  // Format today's date or a random recent date as YYYY-MM-DD
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];

  return {
    fechaEmision: dateStr,
    cuitReceptor,
    tipoComprobante,
    condicionReceptor,
    puntoVenta,
    nroComprobante,
    total
  };
}
