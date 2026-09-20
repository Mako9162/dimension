import { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { api, downloadPdf } from './api';
import QuoteForm from './QuoteForm';
import QuoteDocument from './QuoteDocument';
import Registry from './Registry';
import Login from './Login';
import { WORKSHOP_LOGO } from './brand';
import Icon from './components/Icon';
import QuoteList from './components/QuoteList';
import WhatsAppButton from './components/WhatsAppButton';
import useIdleSession from './hooks/useIdleSession';
import { confirmDelete, notifySuccess, notifyError, notifyInfo } from './utils/alerts';
const navigation = [['quotes', 'Cotizaciones'], ['customers', 'Clientes'], ['vehicles', 'Vehículos'], ['items', 'Catálogo'], ['company', 'Mi empresa']];

function PublicView({ token }) {
  const [quote, setQuote] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setError('');
    api(`/public/quotes/${token}`, { signal: controller.signal }).then(setQuote).catch(e => { if (e.name !== 'AbortError') setError(e.message); });
    return () => controller.abort();
  }, [token, retry]);
  async function download() { setBusy(true); try { await downloadPdf(`/public/quotes/${token}/pdf`, quote.number); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  return <main className="public-page"><div className="public-toolbar print-hidden"><span><Icon name="shield" size={18}/> Una propuesta preparada para ti</span>{quote && <button className="primary" onClick={download} disabled={busy}><Icon name="download"/>{busy ? 'Preparando PDF…' : 'Descargar PDF'}</button>}</div>{error && <div role="alert" className="error">{error} {!quote && <button className="secondary" onClick={() => setRetry(v => v + 1)}>Reintentar</button>}</div>}{quote ? <QuoteDocument quote={quote} isPublic/> : !error && <div className="loading-state" role="status"><span className="spinner"/> Preparando tu cotización…</div>}</main>;
}
export default function App() {
  const match = location.pathname.match(/^\/q\/([a-f0-9]{64})$/);
  return match ? <PublicView token={match[1]}/> : <Admin/>;
}
function Admin() {
  const [logged, setLogged] = useState(false), [username, setUsername] = useState(''), [password, setPassword] = useState('');
  const [checking, setChecking] = useState(true), [data, setData] = useState(null), [tab, setTab] = useState('quotes');
  const [creating, setCreating] = useState(false), [editingQuote, setEditingQuote] = useState(null), [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [sharePath, setSharePath] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false), [dirty, setDirty] = useState(false), [revision, setRevision] = useState(0);
  const reset = useCallback(() => { setLogged(false); setData(null); setSelected(null); setCreating(false); setEditingQuote(null); setSharePath(''); setDirty(false); setMobileMenuOpen(false); }, []);
  const reload = useCallback(async (signal) => {
    const keys = ['company', 'customers', 'vehicles', 'items', 'categories'];
    const values = await Promise.all(keys.map(key => api(`/${key}`, { signal })));
    setData(Object.fromEntries(keys.map((key, i) => [key, values[i]])));
  }, []);
  const logout = useCallback(async () => { try { await api('/auth/logout', { method: 'POST' }); reset(); } catch (e) { setError(e.message); } }, [reset]);
  useIdleSession(logged, logout);
  useEffect(() => {
    const controller = new AbortController();
    api('/auth/me', { signal: controller.signal }).then(async user => { await reload(controller.signal); setUsername(user.username); setLogged(true); }).catch(e => { if (e.status !== 401 && e.name !== 'AbortError') setError(e.message); }).finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => controller.abort();
  }, [reload]);
  useEffect(() => {
    const expired = () => { reset(); setError('Tu sesión terminó. Vuelve a ingresar para continuar.'); };
    window.addEventListener('session-expired', expired);
    return () => window.removeEventListener('session-expired', expired);
  }, [reset]);
  useEffect(() => { if (!mobileMenuOpen) return; const close = e => { if (e.key === 'Escape') setMobileMenuOpen(false); }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, [mobileMenuOpen]);
  async function login(event) { event.preventDefault(); setBusy(true); setError(''); try { const user = await api('/auth/login', { method: 'POST', body: { username, password } }); await reload(); setUsername(user.username); setLogged(true); setPassword(''); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  async function action(fn) { setBusy(true); setError(''); try { await fn(); } catch (e) { setError(e.message); notifyError(e.message); } finally { setBusy(false); } }
  async function mayLeave() { if (!dirty) return true; const answer = await Swal.fire({ titleText: 'Tienes cambios sin guardar', text: 'Si sales ahora, se perderán los cambios de esta cotización.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Salir sin guardar', cancelButtonText: 'Seguir editando', customClass: { confirmButton: 'brand-confirm' } }); return answer.isConfirmed; }
  async function navigate(key) { if (!await mayLeave()) return; setTab(key); setCreating(false); setEditingQuote(null); setSelected(null); setSharePath(''); setDirty(false); setError(''); setMobileMenuOpen(false); window.scrollTo({ top: 0 }); }
  async function newQuote() { if (!await mayLeave()) return; setTab('quotes'); setSelected(null); setEditingQuote(null); setDirty(false); setCreating(true); }
  function openQuote(id) { action(async () => { const q = await api(`/quotes/${id}`); setSelected(q); setSharePath(q.publicToken ? `${location.origin}/q/${q.publicToken}` : ''); }); }
  async function refreshQuote() { setSelected(await api(`/quotes/${selected.id}`)); setRevision(v => v + 1); }
  async function removeQuote() { if (!await confirmDelete(`¿Eliminar cotización N.º ${selected.number}?`, 'Esta acción no se puede deshacer.')) return; action(async () => { await api(`/quotes/${selected.id}`, { method: 'DELETE' }); setSelected(null); setRevision(v => v + 1); notifyInfo('Cotización eliminada'); }); }
  if (checking) return <main className="loading-page" role="status"><img src={WORKSHOP_LOGO} alt="Taller Dimensión"/><span className="spinner"/> Abriendo tu espacio de trabajo…</main>;
  if (!logged) return <Login {...{ username, setUsername, password, setPassword, busy, error }} onSubmit={login}/>;
  const title = creating ? editingQuote ? `Editar cotización #${String(editingQuote.number).padStart(5, '0')}` : 'Nueva cotización' : selected ? `Cotización #${String(selected.number).padStart(5, '0')}` : navigation.find(([key]) => key === tab)[1];
  return <div className="app-shell">
    <a href="#main-content" className="skip-link">Saltar al contenido</a>
    <div className="mobile-header print-hidden"><button className="mobile-toggle" aria-expanded={mobileMenuOpen} aria-controls="main-navigation" aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}><Icon name={mobileMenuOpen ? 'close' : 'menu'}/></button><strong>Taller Dimensión</strong><span className="mobile-monogram">TD</span></div>
    {mobileMenuOpen && <button className="sidebar-backdrop active print-hidden" aria-label="Cerrar menú" onClick={() => setMobileMenuOpen(false)}/>}
    <aside className={`sidebar print-hidden ${mobileMenuOpen ? 'mobile-open' : ''}`}><div className="brand"><img src={WORKSHOP_LOGO} alt="Taller Dimensión" className="sidebar-logo" width="1774" height="887"/><span className="brand-caption">DESABOLLADURA & PINTURA</span></div><span className="nav-caption">ADMINISTRACIÓN</span><nav id="main-navigation" aria-label="Navegación principal">{navigation.map(([key, label]) => <button key={key} aria-current={tab === key ? 'page' : undefined} className={tab === key ? 'active' : ''} onClick={() => navigate(key)}><Icon name={key}/>{label}{tab === key && <span className="nav-active-dot"/>}</button>)}</nav><div className="sidebar-note"><Icon name="shield"/><p>El cuidado se nota<br/><strong>en cada detalle.</strong></p></div><div className="sidebar-bottom"><div className="user-summary"><span className="user-avatar">{username.slice(0,2).toUpperCase()}</span><div><strong>{username}</strong><small>Administración del taller</small></div></div><button disabled={busy} onClick={async () => { if (await mayLeave()) logout(); }}><Icon name="logout" size={17}/> Cerrar sesión</button></div></aside>
    <main className="workspace" id="main-content"><div className="workspace-topbar print-hidden"><span><span className="status-dot"/> Taller Dimensión</span><time>{new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</time></div><header className="page-header print-hidden"><div><span className="eyebrow">MI TALLER / {tab === 'quotes' ? 'GESTIÓN COMERCIAL' : 'ADMINISTRACIÓN'}</span><h1>{title}</h1><p>{creating ? 'Una propuesta clara es el primer paso de un gran trabajo.' : selected ? 'Gestiona esta propuesta, sus documentos y abonos.' : 'Más orden para trabajar. Más tiempo para tus clientes.'}</p></div>{!creating && !selected && <button className="primary" onClick={newQuote}><Icon name="plus"/> Nueva cotización</button>}{(creating || selected) && <button className="secondary" onClick={() => navigate('quotes')}><Icon name="back" size={17}/> Volver al listado</button>}</header>
      {error && <p className="error print-hidden" role="alert">{error}</p>}
      {tab !== 'quotes' ? <Registry key={tab} type={tab} records={data[tab]} customers={data.customers} categoriesList={data.categories || []} reload={() => reload()}/> : creating ? <QuoteForm key={editingQuote?.id || 'new'} {...data} categoriesList={data.categories} editingQuote={editingQuote} onDirtyChange={setDirty} onCancel={async () => { if (await mayLeave()) { setCreating(false); setEditingQuote(null); setDirty(false); } }} onSaved={q => { setDirty(false); setCreating(false); setEditingQuote(null); setSelected(q); setSharePath(q.publicToken ? `${location.origin}/q/${q.publicToken}` : ''); setRevision(v => v + 1); notifySuccess('Cotización guardada'); }}/> : selected ? <>
        <div className="quote-toolbar print-hidden"><label>Estado<select aria-label="Estado de la cotización" value={selected.status} disabled={busy} onChange={e => action(async () => { await api(`/quotes/${selected.id}/status`, { method: 'PATCH', body: { status: e.target.value } }); await refreshQuote(); notifySuccess('Estado actualizado'); })}>{[['BORRADOR','Borrador'],['ENVIADA','Enviada'],['APROBADA','Aprobada']].map(([v,l]) => <option value={v} key={v}>{l}</option>)}</select></label><button className="secondary" disabled={busy} onClick={() => { setEditingQuote(selected); setCreating(true); }}><Icon name="edit" size={17}/> Editar</button><button className="secondary" disabled={busy} onClick={() => action(() => downloadPdf(`/quotes/${selected.id}/pdf`, selected.number))}><Icon name="download" size={17}/> Descargar PDF</button><button className="primary" disabled={busy} onClick={() => action(async () => { const result = await api(`/quotes/${selected.id}/share`, { method: 'POST' }); setSharePath(`${location.origin}${result.path}`); notifySuccess('Enlace listo para compartir'); })}><Icon name="link" size={17}/> {sharePath ? 'Ver enlace' : 'Compartir'}</button><button className="icon-button danger" aria-label="Eliminar cotización" title="Eliminar cotización" disabled={busy} onClick={removeQuote}><Icon name="trash" size={18}/></button></div>
        {sharePath && <div className="share print-hidden"><div><strong>Enlace para tu cliente</strong><a href={sharePath} target="_blank" rel="noreferrer">{sharePath}</a></div><button className="secondary" onClick={() => action(async () => { await navigator.clipboard.writeText(sharePath); notifySuccess('Enlace copiado'); })}>Copiar</button><WhatsAppButton quote={selected} shareUrl={sharePath}/><button className="text-button" disabled={busy} onClick={() => action(async () => { await api(`/quotes/${selected.id}/share`, { method: 'DELETE' }); setSharePath(''); setSelected({ ...selected, publicToken: null }); notifyInfo('Enlace revocado'); })}>Revocar</button></div>}
        {busy && <div className="operation-status print-hidden" role="status"><span className="spinner"/> Procesando solicitud…</div>}
        <QuoteDocument quote={selected} onAddReceipt={async body => { await api(`/quotes/${selected.id}/receipts`, { method: 'POST', body }); await refreshQuote(); notifySuccess('Abono registrado'); }} onDeleteReceipt={async id => { await api(`/quotes/receipts/${id}`, { method: 'DELETE' }); await refreshQuote(); notifyInfo('Recibo anulado'); }}/>
      </> : <QuoteList revision={revision} onOpen={openQuote} onCreate={newQuote} busy={busy}/>}
    </main>
  </div>;
}
