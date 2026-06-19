'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FileUp, 
  ArrowRight,
  Info
} from 'lucide-react';

interface OcrData {
  fechaEmision: string;
  cuitReceptor: string;
  tipoComprobante: string;
  condicionReceptor: string;
  puntoVenta: string;
  nroComprobante: string;
  total: number;
}

export default function UploadPage() {
  const router = useRouter();

  // State management
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string>('');
  const [isDragActive, setIsDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  
  // Validation screen state
  const [isValidating, setIsValidating] = useState(false);
  const [formData, setFormData] = useState<OcrData>({
    fechaEmision: '',
    cuitReceptor: '',
    tipoComprobante: 'A',
    condicionReceptor: '',
    puntoVenta: '',
    nroComprobante: '',
    total: 0
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Clean up Object URL to prevent memory leaks
  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  // Handle Drag Over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  // Handle Drag Leave
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  // Process File Selection
  const processFile = (selectedFile: File) => {
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(selectedFile.type)) {
      alert('Solo se aceptan archivos PDF o imágenes (PNG, JPG).');
      return;
    }
    setFile(selectedFile);
    const objectUrl = URL.createObjectURL(selectedFile);
    setFileUrl(objectUrl);
    
    // Automatically trigger upload once file is dropped/selected
    uploadFile(selectedFile);
  };

  // Handle Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Handle File Input Change
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Upload to Next.js API route
  const uploadFile = async (targetFile: File) => {
    setLoading(true);
    setWarning(null);
    setErrorMsg(null);

    const apiFormData = new FormData();
    apiFormData.append('file', targetFile);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: apiFormData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.warning) {
          setWarning(data.warning);
        }
        setFormData({
          fechaEmision: data.ocrData.fechaEmision || '',
          cuitReceptor: data.ocrData.cuitReceptor || '',
          tipoComprobante: data.ocrData.tipoComprobante || 'A',
          condicionReceptor: data.ocrData.condicionReceptor || '',
          puntoVenta: data.ocrData.puntoVenta || '',
          nroComprobante: data.ocrData.nroComprobante || '',
          total: data.ocrData.total || 0,
        });
        setIsValidating(true);
      } else {
        setErrorMsg(data.message || 'Error al procesar el documento con el OCR.');
      }
    } catch (err) {
      setErrorMsg('Error de red al intentar conectarse con el servidor de digitalización.');
    } finally {
      setLoading(false);
    }
  };

  // Form input handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'total' ? parseFloat(value) || 0 : value,
    }));
  };

  // Submit to PostgreSQL DB
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/comprobantes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSaveSuccess(true);
        setTimeout(() => {
          router.push('/dashboard/metrics');
        }, 1500);
      } else {
        const fullMsg = data.details
          ? `${data.message} Detalle: ${data.details}`
          : (data.message || 'Error al guardar los datos.');
        setErrorMsg(fullMsg);
      }
    } catch (err) {
      setErrorMsg('Error de conexión al guardar el comprobante.');
    } finally {
      setSaving(false);
    }
  };

  // Reset upload state
  const handleReset = () => {
    setFile(null);
    setFileUrl('');
    setIsValidating(false);
    setWarning(null);
    setErrorMsg(null);
    setSaveSuccess(false);
  };

  // Determine file type category
  const isPdf = file?.type === 'application/pdf';

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Cargar Archivos</h1>
        <p className="text-sm text-slate-500">
          Digitaliza tus comprobantes de pago, facturas o tickets contables de manera instantánea.
        </p>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-3 rounded-2xl bg-red-50 p-5 text-sm text-red-700 border border-red-100">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="flex-1">
            <span className="font-semibold block">Error de procesamiento</span>
            <span>{errorMsg}</span>
          </div>
          <button 
            onClick={handleReset} 
            className="text-xs font-semibold underline text-red-800 hover:text-red-900 ml-4 shrink-0"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* 1. UPLOAD VIEW */}
      {!isValidating && !loading && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed p-12 text-center transition-all duration-300 ${
            isDragActive
              ? 'border-indigo-600 bg-indigo-50/30'
              : 'border-slate-200 bg-white hover:border-slate-300'
          } shadow-sm shadow-slate-100`}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 group-hover:scale-105 transition-transform">
            <UploadCloud className="h-8 w-8 text-slate-400" />
          </div>

          <h3 className="mt-6 text-lg font-semibold text-slate-900">
            Sube tus facturas o comprobantes
          </h3>
          <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
            Arrastra y suelta tu archivo PDF, PNG o JPG aquí, o haz clic para explorar en tu equipo.
          </p>

          <div className="mt-8 flex items-center justify-center gap-4">
            <label className="relative cursor-pointer rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-indigo-700 active:scale-[0.98] shadow-sm shadow-indigo-100">
              <span>Seleccionar Archivo</span>
              <input
                type="file"
                className="sr-only"
                accept="application/pdf, image/png, image/jpeg, image/jpg"
                onChange={handleFileInput}
              />
            </label>

            <label className="relative cursor-pointer rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] shadow-sm shadow-slate-50">
              <span>Capturar Foto</span>
              <input
                type="file"
                className="sr-only"
                accept="image/*"
                capture="environment"
                onChange={handleFileInput}
              />
            </label>
          </div>

          <div className="mt-6 text-xs text-slate-400 flex items-center gap-1.5 justify-center">
            <Info className="h-3.5 w-3.5" />
            <span>Formatos aceptados: PDF, PNG, JPG de hasta 10MB</span>
          </div>
        </div>
      )}

      {/* 2. LOADING STATE */}
      {loading && (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm shadow-slate-100">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>

          <h3 className="mt-6 text-lg font-semibold text-slate-900">
            Digitalizando documento
          </h3>
          <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
            El orquestador n8n está extrayendo los datos clave mediante OCR inteligente. Esto tomará solo unos segundos.
          </p>
          <div className="mt-8 w-full max-w-xs bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-indigo-600 h-1.5 rounded-full animate-[loading-bar_2s_ease-in-out_infinite]" style={{ width: '60%' }} />
          </div>
        </div>
      )}

      {/* 3. VALIDATION SCREEN (Human-in-the-Loop) */}
      {isValidating && file && (
        <div className="space-y-6">
          {warning && (
            <div className="flex items-center gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-700 border border-amber-100">
              <Info className="h-5 w-5 shrink-0 text-amber-600" />
              <span>{warning}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left Column: File Previewer */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-indigo-600" />
                  Vista Previa del Archivo
                </span>
                <span className="text-xs text-slate-400 font-mono truncate max-w-[200px]">
                  {file.name}
                </span>
              </div>
              
              <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200/60 bg-slate-100 shadow-sm min-h-[500px] flex items-center justify-center">
                {isPdf ? (
                  <iframe
                    src={`${fileUrl}#toolbar=0`}
                    className="h-full w-full min-h-[550px] border-0"
                    title="PDF Preview"
                  />
                ) : (
                  <div className="relative p-4 flex items-center justify-center max-h-[550px] overflow-auto w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={fileUrl}
                      alt="Receipt Preview"
                      className="max-h-[500px] max-w-full rounded-xl object-contain shadow-sm"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Validation Form */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Verificación de Datos (OCR)
                </span>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                >
                  Cancelar Carga
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm shadow-slate-100">
                {saveSuccess ? (
                  <div className="flex min-h-[400px] flex-col items-center justify-center text-center animate-in zoom-in duration-300">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <CheckCircle2 className="h-10 w-10" />
                    </div>
                    <h3 className="mt-6 text-lg font-bold text-slate-900">
                      Guardado con éxito
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                      El comprobante se ha guardado en la base de datos de PostgreSQL. Redirigiendo a Métricas...
                    </p>
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400 mt-6" />
                  </div>
                ) : (
                  <form onSubmit={handleSave} className="space-y-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 tracking-wider uppercase block">
                          Fecha de Emisión
                        </label>
                        <input
                          type="date"
                          name="fechaEmision"
                          required
                          value={formData.fechaEmision}
                          onChange={handleInputChange}
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition-all focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 tracking-wider uppercase block">
                          Tipo de Comprobante
                        </label>
                        <select
                          name="tipoComprobante"
                          value={formData.tipoComprobante}
                          onChange={handleInputChange}
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm bg-white outline-none transition-all focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                        >
                          <option value="A">Factura A</option>
                          <option value="B">Factura B</option>
                          <option value="C">Factura C</option>
                          <option value="M">Factura M</option>
                          <option value="T">Tique / Ticket</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 tracking-wider uppercase block">
                          CUIT Receptor
                        </label>
                        <input
                          type="text"
                          name="cuitReceptor"
                          required
                          placeholder="20-33444555-8"
                          value={formData.cuitReceptor}
                          onChange={handleInputChange}
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition-all focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 tracking-wider uppercase block">
                          Condición del Receptor frente al IVA
                        </label>
                        <input
                          type="text"
                          name="condicionReceptor"
                          required
                          placeholder="IVA Responsable Inscripto / Responsable Monotributo"
                          value={formData.condicionReceptor}
                          onChange={handleInputChange}
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition-all focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 tracking-wider uppercase block">
                          Punto de Venta
                        </label>
                        <input
                          type="text"
                          name="puntoVenta"
                          required
                          placeholder="0004"
                          value={formData.puntoVenta}
                          onChange={handleInputChange}
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition-all focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 tracking-wider uppercase block">
                          Nro Comprobante
                        </label>
                        <input
                          type="text"
                          name="nroComprobante"
                          required
                          placeholder="00012847"
                          value={formData.nroComprobante}
                          onChange={handleInputChange}
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition-all focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 tracking-wider uppercase block">
                        Total Importe ($)
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 text-sm font-medium">$</span>
                        <input
                          type="number"
                          step="0.01"
                          name="total"
                          required
                          value={formData.total || ''}
                          onChange={handleInputChange}
                          className="w-full rounded-xl border border-slate-200 pl-8 pr-4 py-3 text-sm font-semibold outline-none transition-all focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-slate-900 bg-slate-50/30"
                        />
                      </div>
                    </div>

                    <div className="pt-4 flex gap-4">
                      <button
                        type="button"
                        onClick={handleReset}
                        className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 hover:border-slate-300"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex-[2] flex justify-center items-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50"
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <span>Confirmar y Guardar</span>
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
