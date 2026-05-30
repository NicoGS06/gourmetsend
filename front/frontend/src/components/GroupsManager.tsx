import { useState, useEffect } from 'react';
import { api } from '../api';
import type { Group, Contact } from '../api';
import { FolderPlus, Users, Trash2, Edit3, X, Search, CheckSquare, Square, Save, HelpCircle } from 'lucide-react';

export default function GroupsManager() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  
  // Modales y estados
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  
  // Campos del formulario
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Sincronización de contactos
  const [syncSearch, setSyncSearch] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);

  const loadData = async () => {
    try {
      const groupData = await api.groups.list();
      setGroups(groupData);
      
      const contactData = await api.contacts.list();
      setContacts(contactData);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (editingId) {
        await api.groups.update(editingId, { name, description });
      } else {
        await api.groups.create({ name, description });
      }
      setName('');
      setDescription('');
      setEditingId(null);
      setIsFormOpen(false);
      loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleEdit = (group: Group) => {
    setEditingId(group.id);
    setName(group.name);
    setDescription(group.description || '');
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este grupo? Los contactos no se borrarán, solo se disolverá el grupo.')) return;
    try {
      await api.groups.delete(id);
      loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  // Abrir la interfaz para agregar/quitar contactos en el grupo
  const handleOpenSync = async (group: Group) => {
    try {
      const detail = await api.groups.get(group.id);
      setSelectedGroup(group);
      setSelectedContactIds(detail.members.map((m) => m.id));
      setSyncSearch('');
      setIsSyncOpen(true);
    } catch (err) {
      alert('Error cargando detalles del grupo: ' + (err as Error).message);
    }
  };

  const toggleContactSelection = (contactId: string) => {
    if (selectedContactIds.includes(contactId)) {
      setSelectedContactIds(selectedContactIds.filter((id) => id !== contactId));
    } else {
      setSelectedContactIds([...selectedContactIds, contactId]);
    }
  };

  const handleSyncSubmit = async () => {
    if (!selectedGroup) return;
    try {
      await api.groups.syncContacts(selectedGroup.id, selectedContactIds);
      setIsSyncOpen(false);
      setSelectedGroup(null);
      loadData();
      alert('Grupo sincronizado con éxito. 👍');
    } catch (err) {
      alert('Error sincronizando contactos: ' + (err as Error).message);
    }
  };

  // Filtrar contactos en el buscador de sincronización
  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(syncSearch.toLowerCase()) ||
    c.phone.includes(syncSearch)
  );

  return (
    <div className="space-y-6">
      {/* Botón de crear arriba */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            setEditingId(null);
            setName('');
            setDescription('');
            setIsFormOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition shadow-lg shadow-emerald-950/20"
        >
          <FolderPlus className="w-4 h-4" />
          Nuevo Grupo
        </button>
      </div>

      {/* Grid de Grupos */}
      {groups.length === 0 ? (
        <div className="backdrop-blur-md bg-slate-900/20 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-500" />
          <h4 className="text-white font-bold mb-1">Sin grupos de contactos</h4>
          <p className="text-sm max-w-sm mx-auto leading-relaxed">
            Los grupos te permiten segmentar tus envíos de menús. Crea uno para comenzar a agregar destinatarios.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <div
              key={group.id}
              className="backdrop-blur-md bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between group"
            >
              {/* Degradado estético en hover */}
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/0 to-emerald-500/0 group-hover:to-emerald-500/5 transition-all duration-300 pointer-events-none"></div>

              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="bg-emerald-500/10 text-emerald-400 p-2.5 rounded-xl border border-emerald-500/20">
                    <Users className="w-5 h-5" />
                  </div>
                  
                  {/* Botones de acción del grupo */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(group)}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-emerald-400 transition"
                      title="Editar metadatos"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(group.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition"
                      title="Eliminar grupo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white mt-4">{group.name}</h3>
                <p className="text-sm text-slate-400 mt-2 line-clamp-2 min-h-[40px]">
                  {group.description || 'Sin descripción.'}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">
                  {group.memberCount || 0} {group.memberCount === 1 ? 'miembro' : 'miembros'}
                </span>
                
                <button
                  onClick={() => handleOpenSync(group)}
                  className="text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 py-1.5 px-3 rounded-lg border border-slate-700 hover:border-slate-600 transition"
                >
                  Gestionar Miembros
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: CREAR / EDITAR GRUPO */}
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
              {editingId ? 'Editar Grupo' : 'Nuevo Grupo'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Nombre del Grupo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Clientes Recurrentes, Oficinas..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Descripción
                </label>
                <textarea
                  placeholder="Ej: Clientes que piden almuerzos ejecutivos de lunes a viernes."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all h-24 resize-none"
                />
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

      {/* MODAL: SINCRONIZAR CONTACTOS / MIEMBROS */}
      {isSyncOpen && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 max-h-[80vh] flex flex-col relative">
            <button
              onClick={() => {
                setIsSyncOpen(false);
                setSelectedGroup(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white mb-1">
              Miembros de: {selectedGroup.name}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Selecciona los contactos que pertenecen a este grupo. Los cambios se aplicarán al hacer clic en Guardar.
            </p>

            {/* Buscador de contactos */}
            <div className="relative w-full mb-4">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar contacto por nombre o teléfono..."
                value={syncSearch}
                onChange={(e) => setSyncSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-800 rounded-xl bg-slate-950 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-all text-sm"
              />
            </div>

            {/* Listado con Checkboxes */}
            <div className="flex-1 overflow-y-auto bg-slate-950 border border-slate-800 rounded-xl p-4 divide-y divide-slate-900">
              {contacts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm py-8">
                  <HelpCircle className="w-8 h-8 mb-2 opacity-40 text-emerald-500" />
                  No tienes contactos guardados.
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-sm">
                  Ningún contacto coincide con la búsqueda.
                </div>
              ) : (
                filteredContacts.map((contact) => {
                  const isChecked = selectedContactIds.includes(contact.id);
                  return (
                    <button
                      key={contact.id}
                      onClick={() => toggleContactSelection(contact.id)}
                      className="w-full flex items-center justify-between py-3 px-2 text-left hover:bg-slate-900/50 transition rounded-lg"
                    >
                      <div>
                        <span className="font-medium text-sm text-white block">{contact.name}</span>
                        <span className="text-xs text-slate-500 font-mono">+{contact.phone}</span>
                      </div>
                      
                      <div className={`p-1 rounded-md transition ${
                        isChecked ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-600'
                      }`}>
                        {isChecked ? (
                          <CheckSquare className="w-5 h-5" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t border-slate-800 mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsSyncOpen(false);
                  setSelectedGroup(null);
                }}
                className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSyncSubmit}
                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Guardar Cambios ({selectedContactIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
