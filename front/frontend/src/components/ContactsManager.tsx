import { useState, useEffect } from 'react';
import { api } from '../api';
import type { Contact } from '../api';
import { UserPlus, Search, Trash2, Edit3, X, Check, Clipboard, Phone, HelpCircle } from 'lucide-react';

export default function ContactsManager() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  
  // Modales y Formularios
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Campos del contacto
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Campo de importación masiva
  const [bulkText, setBulkText] = useState('');
  const [bulkPreview, setBulkPreview] = useState<{ name: string; phone: string; valid: boolean }[]>([]);

  const loadContacts = async () => {
    try {
      const data = await api.contacts.list();
      setContacts(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  // Normalizar número telefónico (ej: "+57 300 123 4567" -> "573001234567")
  const normalizePhone = (num: string): string => {
    let clean = num.replace(/[^\d]/g, ''); // Deja solo dígitos
    
    // Si tiene 10 dígitos y empieza por 3 (celular en Colombia), prepende el código de país 57
    if (clean.length === 10 && clean.startsWith('3')) {
      clean = '57' + clean;
    }
    
    return clean;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    const normalized = normalizePhone(phone);
    if (!/^\d+$/.test(normalized)) {
      alert('El número telefónico debe contener solo dígitos.');
      return;
    }

    try {
      if (editingId) {
        await api.contacts.update(editingId, { name, phone: normalized });
      } else {
        await api.contacts.create({ name, phone: normalized });
      }
      setName('');
      setPhone('');
      setEditingId(null);
      setIsFormOpen(false);
      loadContacts();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleEdit = (contact: Contact) => {
    setEditingId(contact.id);
    setName(contact.name);
    setPhone(contact.phone);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este contacto?')) return;
    try {
      await api.contacts.delete(id);
      loadContacts();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  // Procesar texto para la vista previa de importación masiva
  useEffect(() => {
    if (!bulkText.trim()) {
      setBulkPreview([]);
      return;
    }

    const lines = bulkText.split('\n');
    const parsed = lines
      .map((line) => {
        // Soporta formatos comunes: "Nombre, Telefono" o "Nombre; Telefono" o "Nombre \t Telefono"
        const parts = line.split(/[,;\t]/);
        if (parts.length >= 2) {
          const rawName = parts[0].trim();
          const rawPhone = parts[1].trim();
          const cleanPhone = normalizePhone(rawPhone);
          const valid = rawName.length > 0 && cleanPhone.length >= 8 && /^\d+$/.test(cleanPhone);
          return { name: rawName, phone: cleanPhone, valid };
        }
        
        // Si no hay separador, revisamos si tiene un número al final
        const match = line.match(/(.+?)\s*(\+?\d[\d\s-]{6,}\d)$/);
        if (match) {
          const rawName = match[1].trim();
          const rawPhone = match[2].trim();
          const cleanPhone = normalizePhone(rawPhone);
          const valid = rawName.length > 0 && cleanPhone.length >= 8 && /^\d+$/.test(cleanPhone);
          return { name: rawName, phone: cleanPhone, valid };
        }

        return { name: line.trim(), phone: '', valid: false };
      })
      .filter((item) => item.name || item.phone);

    setBulkPreview(parsed);
  }, [bulkText]);

  const handleBulkSubmit = async () => {
    const validContacts = bulkPreview.filter((c) => c.valid).map((c) => ({
      name: c.name,
      phone: c.phone,
    }));

    if (validContacts.length === 0) {
      alert('No se encontraron contactos válidos en la lista.');
      return;
    }

    try {
      await api.contacts.bulkCreate(validContacts);
      setBulkText('');
      setIsBulkOpen(false);
      loadContacts();
      alert(`¡Se importaron ${validContacts.length} contactos exitosamente! 🎉`);
    } catch (err) {
      alert('Error en importación masiva: ' + (err as Error).message);
    }
  };

  // Filtrar contactos por búsqueda
  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  return (
    <div className="space-y-6">
      {/* Barra de cabecera con acciones */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar contacto o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-800 rounded-xl bg-slate-900/60 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              setEditingId(null);
              setName('');
              setPhone('');
              setIsFormOpen(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition shadow-lg shadow-emerald-950/20"
          >
            <UserPlus className="w-4 h-4" />
            Nuevo Contacto
          </button>
          
          <button
            onClick={() => setIsBulkOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium rounded-xl border border-slate-700 transition"
          >
            <Clipboard className="w-4 h-4" />
            Carga Masiva
          </button>
        </div>
      </div>

      {/* Tabla de Contactos */}
      <div className="backdrop-blur-md bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold text-sm">
                <th className="py-4 px-6">Nombre</th>
                <th className="py-4 px-6">Número de WhatsApp</th>
                <th className="py-4 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 text-sm">
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 px-6 text-center text-slate-500">
                    No se encontraron contactos.
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-4 px-6 font-medium text-white">{contact.name}</td>
                    <td className="py-4 px-6">
                      <span className="flex items-center gap-2 font-mono">
                        <Phone className="w-3.5 h-3.5 text-emerald-500" />
                        +{contact.phone}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleEdit(contact)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-emerald-400 transition"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(contact.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: CREAR / EDITAR CONTACTO */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsFormOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white mb-4">
              {editingId ? 'Editar Contacto' : 'Nuevo Contacto'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Nicolás García"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Número Telefónico (WhatsApp)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: +57 300 123 4567 o 3001234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
                <span className="text-[10px] text-slate-500 mt-1.5 block">
                  Sugerencia: Se guardará limpio de espacios y símbolos. Si omites el prefijo, le prependeremos 57 de Colombia automáticamente.
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition"
                >
                  {editingId ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: IMPORTACIÓN MASIVA */}
      {isBulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 max-h-[85vh] flex flex-col relative">
            <button
              onClick={() => setIsBulkOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Clipboard className="w-5 h-5 text-emerald-500" />
              Importar Contactos Masivamente
            </h3>
            
            <p className="text-xs text-slate-400 mb-4">
              Pega un listado copiado de Excel o escríbelo directamente. Cada contacto debe estar en una línea nueva. 
              <br />Formatos válidos: <code className="text-emerald-400">Nombre, Teléfono</code>, <code className="text-emerald-400">Nombre; Teléfono</code> o <code className="text-emerald-400">Nombre Teléfono</code>.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-hidden min-h-[300px]">
              {/* Editor */}
              <div className="flex flex-col h-full">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Pegar listado aquí
                </label>
                <textarea
                  placeholder="Ejemplo:&#10;Nicolás García, 3001234567&#10;Maria Perez, +573129876543"
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  className="flex-1 w-full p-4 bg-slate-950 border border-slate-800 text-white rounded-xl placeholder:text-slate-700 font-mono text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
                />
              </div>

              {/* Vista previa procesada */}
              <div className="flex flex-col h-full overflow-hidden">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Vista Previa Procesada ({bulkPreview.filter((x) => x.valid).length} válidos)
                </label>
                <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl overflow-y-auto p-4 space-y-2">
                  {bulkPreview.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 text-sm">
                      <HelpCircle className="w-8 h-8 mb-2 opacity-40" />
                      Ingresa datos a la izquierda
                    </div>
                  ) : (
                    bulkPreview.map((item, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                          item.valid
                            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/5 border-rose-500/20 text-rose-300'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <span className="font-semibold">{item.name || 'Sin Nombre'}</span>
                          <span className="block font-mono text-[10px] text-slate-500">
                            {item.phone ? `+${item.phone}` : 'Teléfono no detectado'}
                          </span>
                        </div>
                        {item.valid ? (
                          <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-rose-400 flex-shrink-0" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-slate-800 mt-4">
              <button
                type="button"
                onClick={() => setIsBulkOpen(false)}
                className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleBulkSubmit}
                disabled={bulkPreview.filter((x) => x.valid).length === 0}
                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition disabled:opacity-50"
              >
                Importar ({bulkPreview.filter((x) => x.valid).length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
