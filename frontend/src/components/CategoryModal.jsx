import { useState } from 'react';
import { api } from '../api';
import { confirmDelete, notifySuccess, notifyError } from '../utils/alerts';

export default function CategoryModal({ categories = [], reload, onClose }) {
  const [newCat, setNewCat] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    if (!newCat.trim()) return;

    setBusy(true);
    try {
      await api('/categories', { method: 'POST', body: { name: newCat.trim() } });
      setNewCat('');
      await reload();
      notifySuccess('Categoría agregada correctamente');
    } catch (err) {
      notifyError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(cat) {
    const confirmed = await confirmDelete(
      `¿Eliminar la categoría "${cat.name}"?`,
      'Los ítems del catálogo existentes conservarán su nombre de categoría.'
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      await api(`/categories/${cat.id}`, { method: 'DELETE' });
      await reload();
      notifySuccess(`Categoría "${cat.name}" eliminada`);
    } catch (err) {
      notifyError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop print-hidden" onClick={onClose}>
      <div className="modal-panel max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-zinc-800">🏷️ Administrar Categorías</h2>
          <button type="button" className="text-zinc-400 hover:text-zinc-600 font-bold" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleAdd} className="flex gap-2 mb-6">
          <input
            type="text"
            placeholder="Ej: Pintura, Detailing, Mecánica..."
            value={newCat}
            onChange={e => setNewCat(e.target.value)}
            disabled={busy}
            className="flex-1"
            style={{ marginTop: 0 }}
          />
          <button type="submit" className="primary" disabled={busy || !newCat.trim()}>
            + Agregar
          </button>
        </form>

        <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-3">Categorías disponibles ({categories.length})</h3>
        
        <div className="max-h-60 overflow-y-auto divide-y divide-zinc-100 border border-zinc-200 rounded-lg bg-zinc-50">
          {!categories.length ? (
            <p className="p-3 text-xs text-zinc-500 text-center">No hay categorías registradas.</p>
          ) : (
            categories.map(cat => (
              <div key={cat.id} className="flex justify-between items-center p-3 hover:bg-white transition-colors">
                <span className="text-sm font-semibold text-zinc-700">{cat.name}</span>
                <button
                  type="button"
                  className="text-rose-600 hover:bg-rose-50 p-1 rounded text-xs"
                  onClick={() => handleDelete(cat)}
                  disabled={busy}
                  title="Eliminar categoría"
                >
                  🗑️
                </button>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button type="button" className="secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
