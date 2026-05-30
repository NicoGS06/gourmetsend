import { useState } from 'react';
import { Send, Users, Contact, Utensils } from 'lucide-react';
import WhatsAppConnector from './components/WhatsAppConnector';
import CampaignsManager from './components/CampaignsManager';
import ContactsManager from './components/ContactsManager';
import GroupsManager from './components/GroupsManager';

export default function App() {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'contacts' | 'groups'>('campaigns');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-300">
      
      {/* HEADER DE LA APLICACIÓN */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-950/20">
              <Utensils className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                GourmetSend
              </h1>
              <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                Panel de WhatsApp para Restaurantes
              </p>
            </div>
          </div>

          {/* MENÚ DE PESTAÑAS (TABS NAVIGATION) */}
          <nav className="flex bg-slate-900/60 border border-slate-800/80 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === 'campaigns'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Enviar Menú</span>
            </button>

            <button
              onClick={() => setActiveTab('contacts')}
              className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === 'contacts'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Contact className="w-4 h-4" />
              <span className="hidden sm:inline">Contactos</span>
            </button>

            <button
              onClick={() => setActiveTab('groups')}
              className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === 'groups'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Grupos</span>
            </button>
          </nav>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* COMPONENTE DE SINCRONIZACIÓN DE WHATSAPP (SIEMPRE VISIBLE EN LA PARTE SUPERIOR) */}
        <section aria-label="WhatsApp Connection">
          <WhatsAppConnector />
        </section>

        {/* CONTENEDOR DINÁMICO SEGÚN PESTAÑA ACTIVA */}
        <section aria-label="Tab Content" className="min-h-[400px]">
          {activeTab === 'campaigns' && <CampaignsManager />}
          {activeTab === 'contacts' && <ContactsManager />}
          {activeTab === 'groups' && <GroupsManager />}
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950 text-center py-6 text-xs text-slate-600">
        <p>© {new Date().getFullYear()} GourmetSend. Diseñado profesionalmente para dueños de restaurantes.</p>
        <p className="mt-1 text-slate-700">Sistema seguro con Smart Throttling y cola asíncrona de base de datos.</p>
      </footer>
    </div>
  );
}
