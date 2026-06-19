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

      const rawData = await response.json();
      const data = Array.isArray(rawData) ? rawData[0] : rawData;
      
      let ocrData = data;
      let rawText = '';
      
      // Extrae el texto ya sea del Agente de IA ('output') o del nodo directo de Gemini ('content.parts[0].text')
      if (data && typeof data.output === 'string') {
        rawText = data.output;
      } else if (data && data.content?.parts?.[0]?.text) {
        rawText = data.content.parts[0].text;
      }

      if (rawText) {
        try {
          // Limpiar bloques de código markdown que Gemini suele incluir
          const cleanOutput = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const parsed = JSON.parse(cleanOutput);
          if (parsed && typeof parsed === 'object') {
            ocrData = normalizeOcrKeys(parsed);
          }
        } catch (e) {
          console.error('Error al parsear el output de n8n:', e);
        }
      } else if (data && data.output && typeof data.output === 'object') {
        ocrData = normalizeOcrKeys(data.output);
      } else if (data && typeof data === 'object') {
        ocrData = normalizeOcrKeys(data);
      }

      return NextResponse.json({
        success: true,
        ocrData: ocrData,
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

// Normalizador inteligente de las claves devueltas por la IA en n8n
function normalizeOcrKeys(obj: any): any {
  const normalized: any = {};
  
  const getValue = (keys: string[], defaultVal: any = '') => {
    for (const key of keys) {
      if (obj[key] !== undefined) return obj[key];
      
      const cleanKeyToFind = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      const match = Object.keys(obj).find(k => {
        const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        return cleanK === cleanKeyToFind;
      });
      if (match !== undefined) return obj[match];
    }
    return defaultVal;
  };

  normalized.fechaEmision = getValue(['fechaEmision', 'fecha', 'fecha_emision']);
  normalized.cuitReceptor = getValue(['cuitReceptor', 'cuit_receptor']);
  normalized.tipoComprobante = getValue(['tipoComprobante', 'tipo_comprobante', 'tipo']);
  normalized.condicionReceptor = getValue(['condicionReceptor', 'condicion_receptor', 'condicionIva', 'condicion']);
  normalized.puntoVenta = getValue(['puntoVenta', 'punto_venta', 'pv']);
  normalized.nroComprobante = getValue(['nroComprobante', 'nro_comprobante', 'numero', 'compNro', 'comp.nro', 'comp . nro']);
  
  const rawTotal = getValue(['total', 'importe', 'totalImporte', 'monto']);
  normalized.total = typeof rawTotal === 'number' ? rawTotal : parseFloat(rawTotal) || 0;

  return normalized;
}
