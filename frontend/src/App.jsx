import { useEffect, useState } from 'react';
import { api, downloadPdf, money } from './api';
import QuoteForm from './QuoteForm';
import QuoteDocument from './QuoteDocument';
import Registry from './Registry';
import Login from './Login';
import Toast from './components/Toast';
import MetricsChart from './components/MetricsChart';
import WhatsAppButton from './components/WhatsAppButton';
const navigation = [['quotes', 'Cotizaciones'], ['customers', 'Clientes'], ['vehicles', 'Vehículos'], ['items', 'Catálogo'], ['company', 'Mi empresa']];

function PublicView({ token }) {
  const [quote, setQuote] = useState(null), [error, setError] = useState('');
  useEffect(() => { api(`/public/quotes/${token}`).then(setQuote).catch(e => setError(e.message)); }, [token]);
  return <main className="public-page">{error ? <p className="error" role="alert">{error}</p> : quote ? <><div className="print-hidden flex justify-end mb-5"><button className="primary" onClick={() => downloadPdf(`/public/quotes/${token}/pdf`, quote.number).catch(e => setError(e.message))}>Descargar PDF</button></div><QuoteDocument quote={quote} isPublic={true}/></> : <p>Cargando cotización…</p>}</main>;
}

export default function App() {
  const publicMatch = location.pathname.match(/^\/q\/([a-f0-9]{64})$/);
  return publicMatch ? <PublicView token={publicMatch[1]}/> : <Admin/>;
}

function Admin() {
  const [logged, setLogged] = useState(false), [password, setPassword] = useState('');
  const [username, setUsername] = useState(''), [checking, setChecking] = useState(true);
  const [data, setData] = useState(null), [tab, setTab] = useState('quotes');
  const [creating, setCreating] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [sharePath, setSharePath] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Búsqueda y paginación de cotizaciones
  const [quoteSearch, setQuoteSearch] = useState('');
  const [quoteStatusFilter, setQuoteStatusFilter] = useState('');
  const [quotePage, setQuotePage] = useState(1);

  async function handleDeleteQuote(quoteToDelete) {
    if (!quoteToDelete?.id) return;
    const numStr = String(quoteToDelete.number).padStart(5, '0');
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la Cotización N.º ${numStr}? Esta acción no se puede deshacer.`)) return;

    action(async () => {
      await api(`/quotes/${quoteToDelete.id}`, { method: 'DELETE' });
      if (selected?.id === quoteToDelete.id) {
        setSelected(null);
      }
      await reload();
      addToast(`Cotización N.º ${numStr} eliminada correctamente`, 'info');
    });
  }

  // Sistema de Notificaciones Toast
  const [toasts, setToasts] = useState([]);
  function addToast(message, type = 'info', duration = 4000) {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }
  function removeToast(id) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  async function reload() {
    const keys = ['company', 'customers', 'vehicles', 'items', 'quotes'];
    const values = await Promise.all(keys.map(key => api(`/${key}`)));
    setData(Object.fromEntries(keys.map((key, index) => [key, values[index]])));
  }

  async function login(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await api('/auth/login', { method: 'POST', body: { username, password } });
      await reload();
      setLogged(true);
      setPassword('');
      addToast('Sesión iniciada con éxito', 'success');
    } catch (err) {
      setError(err.message);
      addToast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function action(fn) {
    setError(''); setBusy(true);
    try { await fn(); } catch (e) { setError(e.message); addToast(e.message, 'error'); } finally { setBusy(false); }
  }

  useEffect(() => {
    let mounted = true;
    api('/auth/me').then(async () => { await reload(); if (mounted) setLogged(true); }).catch(() => {}).finally(() => { if (mounted) setChecking(false); });
    return () => { mounted = false; };
  }, []);

  if (checking) return <main className="login"><p>Abriendo Taller Dimensión…</p></main>;
  if (!logged) return <Login {...{username, setUsername, password, setPassword, busy, error}} onSubmit={login}/>;

  const title = editingQuote ? `Editar Cotización N.º ${String(editingQuote.number).padStart(5, '0')}` : creating ? 'Nueva cotización' : selected ? `Cotización N.º ${String(selected.number).padStart(5, '0')}` : navigation.find(([key]) => key === tab)[1];

  // Filtrado de cotizaciones locales
  const filteredQuotes = (data.quotes || []).filter(q => {
    if (quoteStatusFilter && q.status !== quoteStatusFilter) return false;
    if (quoteSearch.trim()) {
      const term = quoteSearch.toLowerCase();
      const numberStr = String(q.number);
      const customer = (q.customerSnapshot?.name || '').toLowerCase();
      const taxId = (q.customerSnapshot?.taxId || '').toLowerCase();
      const plate = (q.vehicleSnapshot?.plate || '').toLowerCase();
      const brand = (q.vehicleSnapshot?.brand || '').toLowerCase();
      const model = (q.vehicleSnapshot?.model || '').toLowerCase();
      return numberStr.includes(term) || customer.includes(term) || taxId.includes(term) || plate.includes(term) || brand.includes(term) || model.includes(term);
    }
    return true;
  });

  return (
    <div className="app-shell">
      <Toast toasts={toasts} removeToast={removeToast} />
      
      <div className="mobile-header print-hidden">
        <button className="mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? '✕ Cerrar' : '☰ Menú'}
        </button>
        <span className="font-bold text-emerald-900 text-sm">{data?.company?.name || 'Mi Taller'}</span>
      </div>

      <aside className={`sidebar print-hidden ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="brand">
          <img src="/brand/taller-dimension.png" alt="Taller Dimensión" className="sidebar-logo"/>
          <div><strong>{data.company?.name || 'Mi Taller'}</strong><small>DESABOLLADURA & PINTURA</small></div>
        </div>
        <span className="nav-caption">ESPACIO DE TRABAJO</span>
        <nav>
          {navigation.map(([key, name], i) => (
            <button key={key} className={tab === key ? 'active' : ''} onClick={() => { setTab(key); setCreating(false); setEditingQuote(null); setSelected(null); setSharePath(''); setError(''); setMobileMenuOpen(false); }}>
              <span>{['▤', '♙', '▱', '⊞', '⚙'][i]}</span>{name}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="status-dot"/> Administración privada
          <button onClick={() => action(async () => { await api('/auth/logout', { method: 'POST' }); setLogged(false); setData(null); setSelected(null); setCreating(false); setEditingQuote(null); setSharePath(''); addToast('Sesión cerrada', 'info'); })}>Cerrar sesión</button>
        </div>
      </aside>

      <main className="workspace">
        <header className="page-header print-hidden">
          <div>
            <span className="eyebrow">TALLER / {tab === 'quotes' ? 'COTIZACIONES' : 'ADMINISTRACIÓN'}</span>
            <h1>{title}</h1>
            <p>{creating ? 'Define los trabajos y entrega una propuesta clara a tu cliente.' : 'Todo lo que necesitas para cotizar con confianza.'}</p>
          </div>
          {tab === 'quotes' && !creating && !selected && (
            <button className="primary" onClick={() => { setEditingQuote(null); setCreating(true); }}>+ Nueva cotización</button>
          )}
          {(creating || selected) && (
            <button className="secondary" onClick={() => { setCreating(false); setEditingQuote(null); setSelected(null); setSharePath(''); }}>← Volver</button>
          )}
        </header>

        {error && <p role="alert" className="error print-hidden">{error}</p>}

        {tab === 'quotes' ? (
          creating ? (
            <QuoteForm
              {...data}
              editingQuote={editingQuote}
              onCancel={() => { setCreating(false); setEditingQuote(null); }}
              onSaved={async q => {
                setCreating(false);
                setEditingQuote(null);
                setSelected(q);
                await reload();
                addToast(`Cotización N.º ${String(q.number).padStart(5, '0')} ${editingQuote ? 'actualizada' : 'creada'} con éxito`, 'success');
              }}
            />
          ) : selected ? (
            <>
              <div className="quote-toolbar print-hidden">
                <label>
                  Estado
                  <select value={selected.status} disabled={busy} onChange={e => action(async () => {
                    const q = await api(`/quotes/${selected.id}/status`, { method: 'PATCH', body: { status: e.target.value } });
                    setSelected({ ...selected, status: q.status });
                    await reload();
                    addToast(`Estado actualizado a ${q.status}`, 'success');
                  })}>
                    {['BORRADOR', 'ENVIADA', 'APROBADA'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </label>

                <button className="secondary" disabled={busy} onClick={() => {
                  setEditingQuote(selected);
                  setCreating(true);
                }}>✏️ Editar cotización</button>

                <button className="secondary text-rose-600 border-rose-200 hover:bg-rose-50" disabled={busy} onClick={() => handleDeleteQuote(selected)}>
                  🗑️ Eliminar cotización
                </button>

                <button className="secondary" disabled={busy} onClick={() => action(async () => {
                  await downloadPdf(`/quotes/${selected.id}/pdf`, selected.number);
                  addToast('PDF descargado', 'success');
                })}>Descargar PDF</button>

                <button className="primary" disabled={busy} onClick={() => action(async () => {
                  const result = await api(`/quotes/${selected.id}/share`, { method: 'POST' });
                  const url = `${location.origin}${result.path}`;
                  setSharePath(url);
                  addToast('Enlace público generado', 'success');
                })}>Generar enlace</button>

                {sharePath && (
                  <WhatsAppButton quote={selected} shareUrl={sharePath} />
                )}

                <button className="secondary" disabled={busy} onClick={() => action(async () => {
                  await api(`/quotes/${selected.id}/share`, { method: 'DELETE' });
                  setSharePath('');
                  addToast('Enlace revocado', 'info');
                })}>Revocar enlace</button>
              </div>

              {sharePath && (
                <div className="share print-hidden">
                  <span>Enlace para el cliente: <a href={sharePath} target="_blank" rel="noreferrer">{sharePath}</a></span>
                  <button className="secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => {
                    navigator.clipboard.writeText(sharePath);
                    addToast('Enlace copiado al portapapeles', 'success');
                  }}>Copiar enlace 📋</button>
                </div>
              )}

              <QuoteDocument
                quote={selected}
                onAddReceipt={async receiptData => {
                  await api(`/quotes/${selected.id}/receipts`, { method: 'POST', body: receiptData });
                  const updated = await api(`/quotes/${selected.id}`);
                  setSelected(updated);
                  await reload();
                  addToast('Recibo de dinero emitido exitosamente', 'success');
                }}
                onDeleteReceipt={async receiptId => {
                  await api(`/quotes/receipts/${receiptId}`, { method: 'DELETE' });
                  const updated = await api(`/quotes/${selected.id}`);
                  setSelected(updated);
                  await reload();
                  addToast('Recibo anulado', 'info');
                }}
              />
            </>
          ) : (
            <>
              <MetricsChart quotes={data.quotes || []} />

              <section className="panel">
                <div className="flex justify-between items-center mb-5 flex-wrap gap-4">
                  <h2>Últimas cotizaciones ({filteredQuotes.length})</h2>
                  <div className="toolbar-actions">
                    <div className="search-box">
                      <input
                        type="text"
                        placeholder="Buscar por número, cliente, RUT o patente…"
                        value={quoteSearch}
                        onChange={e => { setQuoteSearch(e.target.value); setQuotePage(1); }}
                      />
                      <span className="search-icon">🔍</span>
                    </div>
                    <select
                      className="w-auto"
                      style={{ marginTop: 0 }}
                      value={quoteStatusFilter}
                      onChange={e => { setQuoteStatusFilter(e.target.value); setQuotePage(1); }}
                    >
                      <option value="">Todos los estados</option>
                      <option value="BORRADOR">BORRADOR</option>
                      <option value="ENVIADA">ENVIADA</option>
                      <option value="APROBADA">APROBADA</option>
                    </select>
                  </div>
                </div>

                {!filteredQuotes.length ? (
                  <div className="empty">
                    <span>▤</span>
                    <h3>{quoteSearch || quoteStatusFilter ? 'No se encontraron cotizaciones' : 'Tu próxima reparación empieza aquí'}</h3>
                    <p>{quoteSearch || quoteStatusFilter ? 'Intenta modificar el término de búsqueda o filtro.' : 'Crea una cotización con los trabajos y repuestos necesarios.'}</p>
                    {!data.quotes.length && (
                      <button className="primary mt-5" onClick={() => { setEditingQuote(null); setCreating(true); }}>Crear mi primera cotización</button>
                    )}
                  </div>
                ) : (() => {
                  const quotePageSize = 10;
                  const totalQuotePages = Math.ceil(filteredQuotes.length / quotePageSize) || 1;
                  const paginatedQuotesList = filteredQuotes.slice((quotePage - 1) * quotePageSize, quotePage * quotePageSize);
                  return (
                    <>
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Número / fecha</th>
                              <th>Cliente</th>
                              <th>Vehículo</th>
                              <th>Estado</th>
                              <th>Pago</th>
                              <th>Total</th>
                              <th>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedQuotesList.map(q => {
                              const totalPaid = (q.receipts || []).reduce((sum, r) => sum + Number(r.amount), 0);
                              const total = Number(q.total);
                              const paymentStatus = totalPaid >= total ? 'PAGADO' : totalPaid > 0 ? 'ABONADO' : 'PENDIENTE';
                              return (
                                <tr key={q.id}>
                                  <td>
                                    <strong>#{String(q.number).padStart(5, '0')}</strong>
                                    <p>{new Date(q.date).toLocaleDateString('es-CL')}</p>
                                  </td>
                                  <td>{q.customerSnapshot.name}</td>
                                  <td>{q.vehicleSnapshot.plate}</td>
                                  <td><span className={`badge ${q.status.toLowerCase()}`}>{q.status}</span></td>
                                  <td><span className={`badge-payment ${paymentStatus.toLowerCase()}`}>{paymentStatus}</span></td>
                                  <td>{money(q.total)}</td>
                                  <td>
                                    <div className="flex gap-2 items-center">
                                      <button className="secondary text-xs" style={{ padding: '5px 9px' }} disabled={busy} onClick={() => action(async () => {
                                        setSelected(await api(`/quotes/${q.id}`));
                                        setSharePath('');
                                      })}>Ver ↗</button>
                                      <button
                                        type="button"
                                        className="secondary text-rose-600 border-rose-200 hover:bg-rose-50 text-xs"
                                        style={{ padding: '5px 9px' }}
                                        title="Eliminar cotización"
                                        disabled={busy}
                                        onClick={() => handleDeleteQuote(q)}
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {totalQuotePages > 1 && (
                        <div className="pagination-wrap">
                          <span>Página {quotePage} de {totalQuotePages}</span>
                          <div className="pagination-buttons">
                            <button
                              type="button"
                              className="secondary"
                              disabled={quotePage <= 1}
                              onClick={() => setQuotePage(p => Math.max(1, p - 1))}
                            >
                              ← Anterior
                            </button>
                            <button
                              type="button"
                              className="secondary"
                              disabled={quotePage >= totalQuotePages}
                              onClick={() => setQuotePage(p => Math.min(totalQuotePages, p + 1))}
                            >
                              Siguiente →
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </section>
            </>
          )
        ) : (
          <Registry key={tab} type={tab} records={data[tab]} customers={data.customers} reload={reload}/>
        )}
      </main>
    </div>
  );
}
