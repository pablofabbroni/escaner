'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  BarChart3, 
  FileText, 
  DollarSign, 
  Calendar, 
  ArrowUpRight,
  TrendingUp,
  Inbox,
  Loader2,
  RefreshCw
} from 'lucide-react';

interface Comprobante {
  id: number;
  fechaEmision: string;
  cuitEmisor: string;
  cuitReceptor: string;
  tipoComprobante: string;
  puntoVenta: string;
  nroComprobante: string;
  total: number;
  createdAt: string;
}

interface Metrics {
  count: number;
  totalAmount: number;
}

export default function MetricsPage() {
  const [comprobantes, setComprobantes] = useState<Comprobante[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({ count: 0, totalAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetricsAndReceipts = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const response = await fetch('/api/comprobantes');
      const data = await response.json();

      if (response.ok && data.success) {
        setComprobantes(data.data || []);
        setMetrics(data.metrics || { count: 0, totalAmount: 0 });
      } else {
        setError(data.message || 'Error al obtener los datos de la base de datos.');
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor para obtener los comprobantes.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetricsAndReceipts();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      // We parse as UTC to prevent timezone shifts on YYYY-MM-DD strings
      return new Intl.DateTimeFormat('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'UTC'
      }).format(date);
    } catch (e) {
      return dateStr;
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'A': return 'Factura A';
      case 'B': return 'Factura B';
      case 'C': return 'Factura C';
      case 'M': return 'Factura M';
      case 'T': return 'Tique';
      default: return `Comprobante ${tipo}`;
    }
  };

  const getTipoBadgeClass = (tipo: string) => {
    switch (tipo) {
      case 'A': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'B': return 'bg-cyan-50 text-cyan-700 border-cyan-100';
      case 'C': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Métricas y Resumen</h1>
          <p className="text-sm text-slate-500">
            Analiza las estadísticas y los comprobantes validados hasta el momento.
          </p>
        </div>
        
        <button
          onClick={() => fetchMetricsAndReceipts(true)}
          disabled={loading || refreshing}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50 shadow-sm"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700 border border-red-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <span className="text-sm text-slate-500">Cargando métricas...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Total count card */}
            <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm shadow-slate-50 flex items-center justify-between">
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase block">
                  Total Procesados
                </span>
                <span className="text-3xl font-bold text-slate-900 tracking-tight">
                  {metrics.count}
                </span>
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                  Comprobantes validados con éxito
                </span>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <FileText className="h-6 w-6" />
              </div>
            </div>

            {/* Total sum card */}
            <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm shadow-slate-50 flex items-center justify-between">
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase block">
                  Monto Acumulado
                </span>
                <span className="text-3xl font-bold text-slate-900 tracking-tight">
                  {formatCurrency(metrics.totalAmount)}
                </span>
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-emerald-500" />
                  Suma total de importes netos
                </span>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>

            {/* Platform Health indicator */}
            <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm shadow-slate-50 flex items-center justify-between sm:col-span-2 lg:col-span-1">
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase block">
                  Estado de n8n
                </span>
                <span className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  Activo
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                </span>
                <span className="text-[10px] text-slate-500">
                  Integración OCR lista para operar
                </span>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
                <BarChart3 className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Receipts Table */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-800">
              Historial de Comprobantes Validados
            </h2>

            {comprobantes.length === 0 ? (
              <div className="flex min-h-[250px] flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                  <Inbox className="h-6 w-6" />
                </div>
                <h4 className="mt-4 text-sm font-semibold text-slate-900">No hay comprobantes</h4>
                <p className="mt-1.5 text-xs text-slate-500 max-w-xs mx-auto">
                  Aún no has validado ningún comprobante contable. Comienza subiendo uno hoy.
                </p>
                <Link
                  href="/dashboard"
                  className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <span>Cargar Documento</span>
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm shadow-slate-100/50">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                        <th className="px-6 py-4">Fecha</th>
                        <th className="px-6 py-4">Tipo</th>
                        <th className="px-6 py-4">Número</th>
                        <th className="px-6 py-4">CUIT Emisor</th>
                        <th className="px-6 py-4">CUIT Receptor</th>
                        <th className="px-6 py-4 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                      {comprobantes.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-800">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              {formatDate(item.fechaEmision)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-medium ${getTipoBadgeClass(item.tipoComprobante)}`}>
                              {getTipoLabel(item.tipoComprobante)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-xs">
                            {item.puntoVenta} - {item.nroComprobante}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-xs">
                            {item.cuitEmisor}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-xs">
                            {item.cuitReceptor}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-slate-900">
                            {formatCurrency(item.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
