import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import type { Group, Campaign } from '../api';
import { supabase } from '../supabaseClient';
import { Send, Upload, FileText, CheckCircle, AlertTriangle, Play, Pause, Trash2, Loader2, RefreshCw, Layers } from 'lucide-react';

export default function CampaignsManager() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);

  // Formulario
  const [name, setName] = useState('');
  const [messageText, setMessageText] = useState('¡Hola {{nombre}}! 🌟 Te comparto el menú del día de hoy en Gourmet. ¡Esperamos que te encante! 🍛🥢');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageAreaRef = useRef<HTMLTextAreaElement>(null);

  const loadData = async () => {
    try {
      const groupData = await api.groups.list();
      setGroups(groupData);

      const campaignData = await api.campaigns.list();
      setCampaigns(campaignData);

      // Si hay una campaña activa ('sending' o 'queued'), la fijamos como activa para monitoreo
      const active = campaignData.find((c) => c.status === 'sending' || c.status === 'queued');
      if (active) {
        fetchActiveDetails(active.id);
      } else {
        setActiveCampaign(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchActiveDetails = async (id: string) => {
    try {
      const data = await api.campaigns.get(id);
      setActiveCampaign(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Polling de detalles de campaña activa si está enviando
  useEffect(() => {
    let timer: any;
    if (activeCampaign && (activeCampaign.status === 'sending' || activeCampaign.status === 'queued')) {
      timer = setInterval(() => {
        fetchActiveDetails(activeCampaign.id);
      }, 3000);
    }
    return () => clearInterval(timer);
  }, [activeCampaign?.status]);

  // Manejar arrastre e imagen
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Insertar tag dinámico en la posición del cursor del text area
  const insertTagName = () => {
    const textarea = messageAreaRef.current;
    if (!textarea) return;

    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const tag = '{{nombre}}';

    const newValue =
      messageText.substring(0, startPos) +
      tag +
      messageText.substring(endPos, messageText.length);

    setMessageText(newValue);
    
    // Reactivar foco
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(startPos + tag.length, startPos + tag.length);
    }, 10);
  };

  const toggleGroupSelection = (groupId: string) => {
    if (selectedGroupIds.includes(groupId)) {
      setSelectedGroupIds(selectedGroupIds.filter((id) => id !== groupId));
    } else {
      setSelectedGroupIds([...selectedGroupIds, groupId]);
    }
  };

  // Subir la imagen a Supabase Storage
  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `menus/${fileName}`;

    // Subimos al bucket "menus"
    const { error: uploadError } = await supabase.storage
      .from('menus')
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(`Error subiendo imagen a Supabase: ${uploadError.message}`);
    }

    // Obtenemos la URL pública
    const { data } = supabase.storage.from('menus').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGroupIds.length === 0) {
      alert('Por favor selecciona al menos un grupo de destinatarios.');
      return;
    }
    if (!name.trim()) return;

    if (!window.confirm('¿Estás seguro de que deseas iniciar este envío masivo? Se aplicará el sistema de colas con Smart Throttling de forma automatizada.')) {
      return;
    }

    setSubmitting(true);
    let imageUrl = '';

    try {
      if (imageFile) {
        setUploading(true);
        imageUrl = await uploadImage(imageFile);
        setUploading(false);
      }

      const campaign = await api.campaigns.create({
        name,
        messageText,
        imageUrl: imageUrl || undefined,
        groupIds: selectedGroupIds,
      });

      // Limpiar formulario
      setName('');
      setImageFile(null);
      setImagePreview(null);
      setSelectedGroupIds([]);
      
      // Cargar campaña activa e historial
      fetchActiveDetails(campaign.id);
      loadData();
      alert('Campaña agendada exitosamente en la cola de envíos. 🚀');
    } catch (err) {
      alert('Error creando campaña: ' + (err as Error).message);
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  };

  const handlePause = async (id: string) => {
    try {
      await api.campaigns.pause(id);
      loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleResume = async (id: string) => {
    try {
      await api.campaigns.resume(id);
      loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar el registro de esta campaña?')) return;
    try {
      await api.campaigns.delete(id);
      if (activeCampaign?.id === id) {
        setActiveCampaign(null);
      }
      loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* SECCIÓN IZQUIERDA: CREADOR DE CAMPAÑAS */}
      <div className="lg:col-span-7 space-y-6">
        <div className="backdrop-blur-md bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            Nueva Campaña de Menú
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nombre */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Identificador de la Campaña
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Menú Ejecutivo Viernes 30 de Mayo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl placeholder:text-slate-700 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            {/* Grupos de Destinatarios */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                ¿A qué grupos enviar?
              </label>
              {groups.length === 0 ? (
                <p className="text-xs text-slate-500">No hay grupos disponibles. Crea un grupo primero.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {groups.map((group) => {
                    const isSelected = selectedGroupIds.includes(group.id);
                    return (
                      <button
                        type="button"
                        key={group.id}
                        onClick={() => toggleGroupSelection(group.id)}
                        className={`text-xs py-2 px-4 rounded-xl font-semibold border transition-all duration-200 ${
                          isSelected
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-md shadow-emerald-950/20'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {group.name} ({group.memberCount})
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Drag & Drop Carga de Foto */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Foto del Menú (Opcional)
              </label>
              
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageChange}
              />

              {imagePreview ? (
                <div className="relative border border-slate-800 rounded-xl overflow-hidden bg-slate-950 group">
                  <img
                    src={imagePreview}
                    alt="Previsualización del menú"
                    className="w-full max-h-60 object-contain mx-auto"
                  />
                  <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200">
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-lg"
                    >
                      Remover Foto
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-8 border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-xl bg-slate-950/50 flex flex-col items-center justify-center gap-2 hover:bg-slate-950 transition group cursor-pointer"
                >
                  <Upload className="w-8 h-8 text-slate-500 group-hover:text-emerald-400 transition" />
                  <span className="text-sm font-medium text-slate-300">Presiona para cargar la imagen del menú</span>
                  <span className="text-xs text-slate-500">Formatos: PNG, JPG, WEBP</span>
                </button>
              )}
            </div>

            {/* Mensaje */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Mensaje acompañante
                </label>
                <button
                  type="button"
                  onClick={insertTagName}
                  className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/5 hover:bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/10 transition"
                >
                  + Variable Nombre
                </button>
              </div>

              <textarea
                ref={messageAreaRef}
                required
                placeholder="Escribe el mensaje del menú aquí..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={5}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 text-white rounded-xl placeholder:text-slate-700 focus:outline-none focus:border-emerald-500 transition text-sm leading-relaxed resize-none"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Usa <code className="text-emerald-400">{"{{nombre}}"}</code> para insertar dinámicamente el nombre de cada contacto.
              </span>
            </div>

            {/* Botón de Enviar */}
            <button
              type="submit"
              disabled={submitting || uploading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 text-white font-bold rounded-xl transition shadow-lg shadow-emerald-950/20 cursor-pointer disabled:cursor-not-allowed"
            >
              {submitting || uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {uploading ? 'Subiendo Imagen del Menú...' : 'Creando Campaña de Envío...'}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Iniciar Envío Inteligente
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* SECCIÓN DERECHA: MONITOR REALTIME & HISTORIAL */}
      <div className="lg:col-span-5 space-y-6">
        {/* MONITOR EN TIEMPO REAL */}
        {activeCampaign && (
          <div className="backdrop-blur-md bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden animate-fadeIn">
            {/* Barra superior de estado */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-wider py-1 px-2.5 rounded-full border ${
                  activeCampaign.status === 'sending'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                }`}>
                  {activeCampaign.status === 'sending' ? 'Enviando Mensajes' : 'En Cola de Espera'}
                </span>
                <h3 className="text-lg font-bold text-white mt-3.5 leading-snug">{activeCampaign.name}</h3>
              </div>

              {/* Botón Pausa/Reanudar */}
              {activeCampaign.status === 'sending' || activeCampaign.status === 'queued' ? (
                <button
                  onClick={() => handlePause(activeCampaign.id)}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 text-slate-300 hover:text-white transition"
                  title="Pausar Envío"
                >
                  <Pause className="w-4 h-4" />
                </button>
              ) : activeCampaign.status === 'paused' ? (
                <button
                  onClick={() => handleResume(activeCampaign.id)}
                  className="p-2.5 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 rounded-xl transition"
                  title="Reanudar Envío"
                >
                  <Play className="w-4 h-4" />
                </button>
              ) : null}
            </div>

            {/* Contadores */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-slate-950 border border-slate-900 rounded-xl p-3 text-center">
                <span className="text-xl font-extrabold text-white block">{activeCampaign.sent_recipients}</span>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Enviados</span>
              </div>
              <div className="bg-slate-950 border border-slate-900 rounded-xl p-3 text-center">
                <span className="text-xl font-extrabold text-rose-400 block">{activeCampaign.failed_recipients}</span>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Fallidos</span>
              </div>
              <div className="bg-slate-950 border border-slate-900 rounded-xl p-3 text-center">
                <span className="text-xl font-extrabold text-slate-300 block">{activeCampaign.total_recipients}</span>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Total</span>
              </div>
            </div>

            {/* Barra de progreso visual */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-slate-400">Progreso general</span>
                <span className="text-xs font-bold text-white">
                  {Math.round(
                    ((activeCampaign.sent_recipients + activeCampaign.failed_recipients) / activeCampaign.total_recipients) * 100
                  ) || 0}
                  %
                </span>
              </div>
              
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      ((activeCampaign.sent_recipients + activeCampaign.failed_recipients) / activeCampaign.total_recipients) * 100
                    }%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Listado rápido de cola */}
            <div className="mt-6 border-t border-slate-800/80 pt-4">
              <h4 className="text-xs font-bold text-white mb-3">Detalle de Destinatarios</h4>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {activeCampaign.recipients?.map((r) => (
                  <div
                    key={r.id}
                    className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-950/60 border border-slate-900"
                  >
                    <div>
                      <span className="font-semibold text-white block">{r.contactName}</span>
                      <span className="text-[10px] text-slate-500 font-mono">+{r.contactPhone}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {r.status === 'sent' && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                          <CheckCircle className="w-3 h-3" /> Enviado
                        </span>
                      )}
                      {r.status === 'failed' && (
                        <span
                          className="flex items-center gap-1 text-[10px] font-semibold text-rose-400 bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/10 cursor-help"
                          title={r.error_message || 'Fallo general'}
                        >
                          <AlertTriangle className="w-3 h-3" /> Fallido
                        </span>
                      )}
                      {r.status === 'queued' && (
                        <span className="text-[10px] font-medium text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/60 animate-pulse">
                          En cola
                        </span>
                      )}
                      {r.status === 'sending' && (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-600/10 px-2 py-0.5 rounded border border-emerald-500/20 animate-pulse">
                          Enviando...
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* HISTORIAL DE CAMPAÑAS */}
        <div className="backdrop-blur-md bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Historial de Envíos
            </h3>
            
            <button
              onClick={() => loadData()}
              className="p-1.5 text-slate-500 hover:text-white rounded-lg border border-slate-800 hover:bg-slate-800 transition"
              title="Refrescar Historial"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
            {campaigns.filter((c) => c.status !== 'sending' && c.status !== 'queued').length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No hay campañas registradas en el historial.</p>
            ) : (
              campaigns
                .filter((c) => c.status !== 'sending' && c.status !== 'queued')
                .map((campaign) => (
                  <div
                    key={campaign.id}
                    className="p-4 rounded-xl bg-slate-950/60 border border-slate-900 flex justify-between items-start gap-4 hover:border-slate-800 transition group"
                  >
                    <div className="min-w-0">
                      <span className={`text-[9px] font-extrabold uppercase tracking-wider py-0.5 px-2 rounded-md ${
                        campaign.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                          : campaign.status === 'paused'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/10'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/10'
                      }`}>
                        {campaign.status === 'completed' && 'Completada'}
                        {campaign.status === 'paused' && 'Pausada'}
                        {campaign.status === 'failed' && 'Fallida'}
                        {campaign.status === 'draft' && 'Borrador'}
                      </span>
                      
                      <h4 className="text-sm font-bold text-white mt-2 truncate leading-snug">{campaign.name}</h4>
                      
                      <div className="flex gap-3 text-[10px] text-slate-500 mt-2 font-medium">
                        <span>{campaign.sent_recipients} env.</span>
                        <span>•</span>
                        <span>{campaign.failed_recipients} fall.</span>
                        <span>•</span>
                        <span>{new Date(campaign.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {campaign.status === 'paused' && (
                        <button
                          onClick={() => handleResume(campaign.id)}
                          className="p-1.5 text-emerald-400 hover:bg-slate-900 rounded-lg transition"
                          title="Reanudar envío"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDelete(campaign.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition"
                        title="Eliminar campaña"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
