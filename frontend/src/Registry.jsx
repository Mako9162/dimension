import { useState } from 'react';
import { api, categories, money } from './api';
import ChangePasswordModal from './components/ChangePasswordModal';

const definitions = {
  customers: {
    title: 'cliente',
    fields: [
      ['name', 'Nombre', 'text', true],
      ['taxId', 'RUT / identificador', 'text', true],
      ['address', 'Dirección'],
      ['phone', 'Teléfono'],
      ['email', 'Correo', 'email']
    ]
  },
  vehicles: {
    title: 'vehículo',
    fields: [
      ['customerId', 'Cliente', 'customer', true],
      ['brand', 'Marca', 'text', true],
      ['model', 'Modelo', 'text', true],
      ['year', 'Año', 'number', true],
      ['plate', 'Patente', 'text', true],
      ['color', 'Color'],
      ['vin', 'VIN']
    ]
  },
  items: {
    title: 'ítem',
    fields: [
      ['name', 'Nombre', 'text', true],
      ['description', 'Descripción', 'textarea'],
      ['category', 'Categoría', 'category', true],
      ['cost', 'Costo interno neto (CLP)', 'number', true],
      ['price', 'Precio de venta neto (CLP)', 'number', true]
    ]
  }
};

export default function Registry({ type, records, customers, reload }) {
  const company = type === 'company';
  const config = definitions[type] || {};
  
  const blank = () => company
    ? { name: '', ownerName: '', taxId: '', logoUrl: '', signatureUrl: '', address: '', phone: '', email: '', terms: '' }
    : Object.fromEntries(config.fields.map(([key, , kind]) => [key, kind === 'category' ? 'MANO_OBRA' : '']));

  const [form, setForm] = useState(company ? records || blank() : blank());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api(`/${type}${!company && form.id ? `/${form.id}` : ''}`, {
        method: company || form.id ? 'PUT' : 'POST',
        body: form
      });
      await reload();
      if (!company) setForm(blank());
      setMessage('Datos guardados exitosamente');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!form.id || company) return;
    const confirmMsg = `¿Estás seguro de que deseas eliminar este ${config.title}?`;
    if (!window.confirm(confirmMsg)) return;

    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api(`/${type}/${form.id}`, { method: 'DELETE' });
      await reload();
      setForm(blank());
      setMessage(`${config.title.charAt(0).toUpperCase() + config.title.slice(1)} eliminado correctamente`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function handleFileUpload(key, e) {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('La imagen no debe superar 5 MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = async uploadEvent => {
        try {
          setBusy(true);
          const res = await api('/upload', {
            method: 'POST',
            body: { image: uploadEvent.target.result, name: key }
          });
          setForm(prev => ({ ...prev, [key]: res.url }));
          setError('');
          setMessage('Imagen subida correctamente');
        } catch (err) {
          setError('Error al subir la imagen: ' + err.message);
        } finally {
          setBusy(false);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  const [page, setPage] = useState(1);

  const filteredRecords = !company && search.trim() ? records.filter(row => {
    const term = search.toLowerCase();
    const name = (row.name || '').toLowerCase();
    const plate = (row.plate || '').toLowerCase();
    const brand = (row.brand || '').toLowerCase();
    const model = (row.model || '').toLowerCase();
    const taxId = (row.taxId || '').toLowerCase();
    return name.includes(term) || plate.includes(term) || brand.includes(term) || model.includes(term) || taxId.includes(term);
  }) : records;

  const pageSize = 7;
  const totalPages = Math.ceil((filteredRecords?.length || 0) / pageSize) || 1;
  const paginatedRecords = (!company && filteredRecords) ? filteredRecords.slice((page - 1) * pageSize, page * pageSize) : [];

  async function handleDeleteRecord(recordToDelete) {
    if (!recordToDelete?.id || company) return;
    const confirmMsg = `¿Estás seguro de que deseas eliminar este ${config.title}?`;
    if (!window.confirm(confirmMsg)) return;

    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api(`/${type}/${recordToDelete.id}`, { method: 'DELETE' });
      await reload();
      if (form.id === recordToDelete.id) setForm(blank());
      setMessage(`${config.title.charAt(0).toUpperCase() + config.title.slice(1)} eliminado correctamente`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <form onSubmit={save} className="panel self-start space-y-6">
        <h2 className="mb-2">{company ? 'Datos de mi empresa' : `${form.id ? 'Editar' : 'Nuevo'} ${config.title}`}</h2>
        
        {company ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="block text-xs font-semibold text-slate-700 mb-1">Nombre del taller</span>
                <input
                  type="text"
                  required
                  value={form.name ?? ''}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </label>

              <label>
                <span className="block text-xs font-semibold text-slate-700 mb-1">Nombre del encargado / representante</span>
                <input
                  type="text"
                  value={form.ownerName ?? ''}
                  onChange={e => setForm({ ...form, ownerName: e.target.value })}
                />
              </label>

              <label>
                <span className="block text-xs font-semibold text-slate-700 mb-1">RUT / Identificador fiscal</span>
                <input
                  type="text"
                  value={form.taxId ?? ''}
                  onChange={e => setForm({ ...form, taxId: e.target.value })}
                />
              </label>

              <label>
                <span className="block text-xs font-semibold text-slate-700 mb-1">Dirección</span>
                <input
                  type="text"
                  value={form.address ?? ''}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                />
              </label>

              <label>
                <span className="block text-xs font-semibold text-slate-700 mb-1">Teléfono</span>
                <input
                  type="text"
                  value={form.phone ?? ''}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                />
              </label>

              <label>
                <span className="block text-xs font-semibold text-slate-700 mb-1">Correo electrónico</span>
                <input
                  type="email"
                  value={form.email ?? ''}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </label>
            </div>

            <div className="border-t border-slate-200 pt-5">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4">Imágenes Institucionales</h3>
              <div className="grid gap-6 sm:grid-cols-2">
                <ImageField
                  id="file-logo"
                  label="Logo del taller (URL o subida)"
                  value={form.logoUrl}
                  onChange={val => setForm({ ...form, logoUrl: val })}
                  onUpload={e => handleFileUpload('logoUrl', e)}
                />
                <ImageField
                  id="file-sig"
                  label="Firma digital / Timbre (URL o subida)"
                  value={form.signatureUrl}
                  onChange={val => setForm({ ...form, signatureUrl: val })}
                  onUpload={e => handleFileUpload('signatureUrl', e)}
                />
              </div>
            </div>

            <div className="border-t border-slate-200 pt-5">
              <label className="block">
                <span className="block text-xs font-semibold text-slate-700 mb-1">Términos y condiciones por defecto</span>
                <textarea
                  rows={4}
                  maxLength={10000}
                  className="w-full"
                  placeholder="Ej: Cotización válida por 15 días..."
                  value={form.terms ?? ''}
                  onChange={e => setForm({ ...form, terms: e.target.value })}
                />
              </label>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {config.fields.map(([key, label, kind = 'text', required]) => (
              <label key={key} className={kind === 'textarea' ? 'sm:col-span-2' : ''}>
                <span className="block text-xs font-semibold text-slate-700 mb-1">{label}</span>
                {kind === 'textarea' ? (
                  <textarea
                    value={form[key] ?? ''}
                    rows={5}
                    maxLength={10000}
                    className="w-full"
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                  />
                ) : kind === 'category' || kind === 'customer' ? (
                  <select
                    required={required}
                    value={form[key] ?? ''}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                  >
                    <option value="">Seleccionar</option>
                    {(kind === 'category' ? Object.entries(categories) : customers.map(c => [c.id, c.name])).map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={kind}
                    required={required}
                    value={form[key] ?? ''}
                    min={kind === 'number' ? (key === 'year' ? 1900 : 0) : undefined}
                    max={kind === 'number' ? (key === 'year' ? new Date().getFullYear() + 2 : 100000000) : undefined}
                    step={key === 'year' ? '1' : '0.01'}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                  />
                )}
              </label>
            ))}
          </div>
        )}

        {error && <p role="alert" className="error">{error}</p>}
        {message && <p role="status" className="success">{message}</p>}

        <div className="flex gap-3 pt-4 flex-wrap">
          <button className="primary" disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar datos'}
          </button>
          {!company && form.id && (
            <>
              <button
                type="button"
                className="secondary text-rose-600 border-rose-200 hover:bg-rose-50"
                onClick={handleDelete}
                disabled={busy}
              >
                🗑️ Eliminar {config.title}
              </button>
              <button type="button" className="secondary" onClick={() => { setForm(blank()); setMessage(''); }}>
                Cancelar
              </button>
            </>
          )}
        </div>
      </form>

      {!company ? (
        <section className="panel">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
            <h2>Registros ({filteredRecords.length})</h2>
            <div className="search-box">
              <input
                type="text"
                placeholder={`Buscar ${config.title}…`}
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
              <span className="search-icon">🔍</span>
            </div>
          </div>
          {!filteredRecords.length ? (
            <p className="hint">No se encontraron registros.</p>
          ) : (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      {type === 'customers' && (
                        <>
                          <th>Nombre / RUT</th>
                          <th>Contacto</th>
                          <th>Acciones</th>
                        </>
                      )}
                      {type === 'vehicles' && (
                        <>
                          <th>Patente</th>
                          <th>Vehículo</th>
                          <th>Cliente</th>
                          <th>Acciones</th>
                        </>
                      )}
                      {type === 'items' && (
                        <>
                          <th>Nombre</th>
                          <th>Categoría</th>
                          <th>Precio Venta</th>
                          <th>Acciones</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRecords.map(row => (
                      <tr key={row.id} className={form.id === row.id ? 'bg-slate-50 font-medium' : ''}>
                        {type === 'customers' && (
                          <>
                            <td>
                              <strong>{row.name}</strong>
                              <p>RUT: {row.taxId}</p>
                            </td>
                            <td>
                              <span className="text-xs text-slate-700 block">{row.phone || row.email || 'Sin contacto'}</span>
                              {row.address && <p className="truncate max-w-[150px]">{row.address}</p>}
                            </td>
                          </>
                        )}
                        {type === 'vehicles' && (
                          <>
                            <td>
                              <strong>{row.plate}</strong>
                            </td>
                            <td>
                              <span>{row.brand} {row.model}</span>
                              <p>{row.year} · {row.color || 'Sin color'}</p>
                            </td>
                            <td>
                              <span className="text-xs text-slate-700">
                                {customers.find(c => c.id === row.customerId)?.name || '-'}
                              </span>
                            </td>
                          </>
                        )}
                        {type === 'items' && (
                          <>
                            <td>
                              <strong>{row.name}</strong>
                              {row.description && <p className="truncate max-w-[180px]">{row.description}</p>}
                            </td>
                            <td>
                              <span className="badge">{categories[row.category]}</span>
                            </td>
                            <td>
                              <strong>{money(row.price)}</strong>
                              <p className="text-xs text-slate-400">Costo: {money(row.cost)}</p>
                            </td>
                          </>
                        )}
                        <td>
                          <div className="flex gap-2 items-center">
                            <button
                              type="button"
                              className="secondary text-xs"
                              style={{ padding: '5px 9px' }}
                              onClick={() => { setForm(row); setError(''); setMessage(''); }}
                            >
                              Editar ↗
                            </button>
                            <button
                              type="button"
                              className="secondary text-rose-600 border-rose-200 hover:bg-rose-50 text-xs"
                              style={{ padding: '5px 9px' }}
                              title={`Eliminar ${config.title}`}
                              onClick={() => handleDeleteRecord(row)}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="pagination-wrap">
                  <span>Página {page} de {totalPages}</span>
                  <div className="pagination-buttons">
                    <button
                      type="button"
                      className="secondary"
                      disabled={page <= 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                      ← Anterior
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      disabled={page >= totalPages}
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    >
                      Siguiente →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      ) : (
        <div className="space-y-6">
          <div className="panel">
            <span className="eyebrow">IDENTIDAD DEL TALLER</span>
            <h2 className="mt-2">Tu taller, en cada cotización</h2>
            <p className="hint mt-1">Estos datos se incorporan al guardar una nueva cotización. Las cotizaciones anteriores conservan sus datos originales.</p>
          </div>

          <div className="panel bg-slate-50 border border-slate-200">
            <h3 className="font-bold text-slate-800 text-sm mb-2">🔒 Seguridad de la cuenta</h3>
            <p className="text-xs text-slate-600 mb-4">
              Puedes cambiar la contraseña de acceso al sistema en cualquier momento.
            </p>
            <button
              type="button"
              className="secondary"
              onClick={() => setShowPasswordModal(true)}
            >
              🔑 Cambiar contraseña de usuario
            </button>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <ChangePasswordModal
          onClose={() => setShowPasswordModal(false)}
          onSuccess={msg => setMessage(msg)}
        />
      )}
    </div>
  );
}

function ImageField({ label, value, onChange, onUpload, id }) {
  return (
    <div className="space-y-2">
      <span className="block text-xs font-semibold text-slate-700">{label}</span>
      <div className="flex gap-2 items-center">
        <input
          type="text"
          placeholder="URL o sube una imagen..."
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          className="flex-1"
          style={{ marginTop: 0 }}
        />
        <label
          htmlFor={id}
          className="secondary text-xs cursor-pointer inline-flex items-center gap-1.5 shrink-0"
          style={{ margin: 0, padding: '10px 14px' }}
        >
          <span>📁</span> Subir
        </label>
        <input
          id={id}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={onUpload}
        />
      </div>
      {value && (
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-2.5 mt-2">
          <div className="flex items-center gap-3 overflow-hidden">
            <img src={value} alt="Vista previa" className="h-10 w-auto max-w-[140px] object-contain border bg-white rounded p-1 shadow-sm" />
            <span className="text-xs text-slate-600 truncate max-w-[140px]">
              {value.startsWith('data:') ? 'Imagen cargada' : value}
            </span>
          </div>
          <button
            type="button"
            className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2.5 py-1.5 rounded transition-colors"
            onClick={() => onChange('')}
          >
            ✕ Quitar
          </button>
        </div>
      )}
    </div>
  );
}
