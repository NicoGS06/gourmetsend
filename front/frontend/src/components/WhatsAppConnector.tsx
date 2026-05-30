import { useState, useEffect } from 'react';
import { api } from '../api';
import type { WhatsappStatus } from '../api';
import { QrCode, CheckCircle, WifiOff, RefreshCw, LogOut, Loader2 } from 'lucide-react';

export default function WhatsAppConnector() {
  const [session, setSession] = useState<WhatsappStatus>({ status: 'DISCONNECTED', qr: null });
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    try {
      const data = await api.whatsapp.status();
      setSession(data);
    } catch (err) {
      console.error('Error fetching WhatsApp status:', err);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Consultar estado cada 5 segundos
    const interval = setInterval(() => {
      fetchStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    if (!window.confirm('¿Estás seguro de que deseas cerrar la sesión de WhatsApp? Tendrás que escanear el QR de nuevo.')) {
      return;
    }
    setLoading(true);
    try {
      await api.whatsapp.logout();
      await fetchStatus();
    } catch (err) {
      alert('Error al cerrar sesión: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="backdrop-blur-md bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      {/* Fondo estético decorativo */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full filter blur-xl"></div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Información de Estado */}
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-xl flex items-center justify-center ${
            session.status === 'READY'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : session.status === 'QR_CODE'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}>
            {session.status === 'READY' && <CheckCircle className="w-8 h-8" />}
            {session.status === 'QR_CODE' && <QrCode className="w-8 h-8" />}
            {(session.status === 'DISCONNECTED' || session.status === 'INITIALIZING') && <WifiOff className="w-8 h-8" />}
          </div>

          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              WhatsApp Link
              {session.status === 'INITIALIZING' && (
                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
              )}
            </h3>
            <p className="text-sm text-slate-400 mt-0.5">
              {session.status === 'READY' && 'Estado: Conectado y listo para enviar'}
              {session.status === 'QR_CODE' && 'Estado: Esperando escaneo de código QR'}
              {session.status === 'INITIALIZING' && 'Estado: Iniciando navegador en servidor...'}
              {session.status === 'DISCONNECTED' && 'Estado: Desconectado'}
            </p>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchStatus()}
            className="p-2.5 rounded-lg border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white transition-all duration-200"
            title="Refrescar estado"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          
          {session.status === 'READY' && (
            <button
              onClick={handleLogout}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium transition-all duration-200 shadow-lg shadow-rose-950/20 disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
          )}
        </div>
      </div>

      {/* Renderizado de QR si está disponible */}
      {session.status === 'QR_CODE' && session.qr && (
        <div className="mt-6 border-t border-slate-800/80 pt-6 flex flex-col items-center animate-fadeIn">
          <div className="bg-white p-4 rounded-xl shadow-xl border-4 border-emerald-500/20 max-w-[280px]">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(session.qr)}&size=260x260&color=059669`}
              alt="Escanear QR de WhatsApp"
              className="w-full h-auto aspect-square object-contain rounded-md"
            />
          </div>
          <p className="text-xs text-slate-400 text-center mt-4 max-w-sm leading-relaxed">
            Abre WhatsApp en tu teléfono, ve a <strong className="text-white">Dispositivos vinculados</strong> y escanea el código QR de arriba para sincronizar el sistema.
          </p>
        </div>
      )}
    </div>
  );
}
