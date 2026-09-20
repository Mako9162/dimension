import { useEffect, useState } from 'react';
import { api, money } from '../api';
import Icon from './Icon';
import MetricsChart from './MetricsChart';

export default function QuoteList({ revision, onOpen, onCreate, busy }) {
  const [search, setSearch] = useState(''), [status, setStatus] = useState(''), [page, setPage] = useState(1);
  const [result, setResult] = useState(null), [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const [metricsError, setMetricsError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    const timeout = setTimeout(() => {
      const query = new URLSearchParams({ page, limit: 10, search: search.trim(), status });
      api(`/quotes?${query}`, { signal: controller.signal }).then(data => {
        if (page > data.pagination.totalPages) { setPage(data.pagination.totalPages); return; }
        setResult(data);
      }).catch(e => { if (e.name !== 'AbortError') setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, search ? 300 : 0);
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [search, status, page, revision, retry]);
  useEffect(() => {
    const controller = new AbortController();
    setMetricsError(false);
    api('/quotes/metrics', { signal: controller.signal }).then(setMetrics).catch(() => { if (!controller.signal.aborted) setMetricsError(true); });
    return () => controller.abort();
  }, [revision, retry]);
  const labels = { BORRADOR: 'Borrador', ENVIADA: 'Enviada', APROBADA: 'Aprobada' };
  return <>
    <section className="welcome-band"><div><span className="eyebrow">CADA DETALLE CUENTA</span><h2>Tu taller, en una sola vista.</h2><p>Prepara propuestas claras y sigue cada oportunidad.</p></div><div className="welcome-emblem"><Icon name="vehicles" size={60}/></div></section>
    {metricsError ? <div className="notice" role="status">No pudimos actualizar el resumen. <button className="secondary" onClick={() => setRetry(v => v + 1)}>Reintentar</button></div> : <MetricsChart metrics={metrics} onFilter={value => { setStatus(value); setPage(1); }}/>}
    <section className="panel quote-list-panel" aria-busy={loading}>
      <div className="list-heading"><div><h2>Cotizaciones</h2><p className="hint">Busca en todo el historial del taller.</p></div><button className="icon-button" aria-label="Actualizar cotizaciones" onClick={() => setRetry(v => v + 1)} disabled={loading}><Icon name="refresh"/></button></div>
      <div className="list-filters"><div className="search-box"><Icon name="search"/><input aria-label="Buscar cotizaciones" placeholder="N.º, cliente, RUT o patente" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}/>{search && <button className="icon-button" aria-label="Limpiar búsqueda" onClick={() => { setSearch(''); setPage(1); }}><Icon name="close" size={16}/></button>}</div>
        <div className="filter-tabs" aria-label="Filtrar por estado">{[['', 'Todas'], ...Object.entries(labels)].map(([key, label]) => <button key={key} className={status === key ? 'selected' : ''} aria-pressed={status === key} onClick={() => { setStatus(key); setPage(1); }}>{label}</button>)}</div>
      </div>
      <div className="list-feedback" aria-live="polite">{loading ? 'Buscando cotizaciones…' : `${result?.pagination.total || 0} cotizaciones encontradas`}</div>
      {error ? <div className="empty"><Icon name="refresh" size={32}/><h3>No pudimos cargar las cotizaciones</h3><p>{error}</p><button className="secondary" onClick={() => setRetry(v => v + 1)}>Reintentar</button></div> : loading ? <div className="skeleton-rows" aria-hidden="true">{[1,2,3,4,5].map(n => <div className="skeleton" key={n}/>)}</div> : !result?.data.length ? <div className="empty"><div className="empty-icon"><Icon name="quotes" size={28}/></div><h3>{search || status ? 'No hay coincidencias' : 'Dale forma a tu próxima reparación'}</h3><p>{search || status ? 'Prueba otra búsqueda o cambia el estado seleccionado.' : 'Crea tu primera cotización y compártela con tu cliente.'}</p><button className="primary" onClick={search || status ? () => { setSearch(''); setStatus(''); setPage(1); } : onCreate}>{search || status ? 'Limpiar filtros' : 'Crear cotización'}</button></div> : <>
        <div className="table-wrap"><table className="quote-table"><thead><tr><th>Cotización</th><th>Cliente / vehículo</th><th>Estado</th><th>Pago</th><th className="align-right">Total</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{result.data.map(q => {
          const paid = q.receipts.reduce((sum, r) => sum + Number(r.amount), 0), total = Number(q.total);
          const payment = paid >= total ? 'Pagado' : paid > 0 ? 'Abonado' : 'Pendiente';
          return <tr key={q.id}><td data-label="Cotización"><strong className="quote-number">#{String(q.number).padStart(5, '0')}</strong><p>{new Date(q.date).toLocaleDateString('es-CL')}</p></td><td data-label="Cliente / vehículo"><strong>{q.customerSnapshot.name}</strong><p><span className="plate-label">{q.vehicleSnapshot.plate}</span> {q.vehicleSnapshot.brand} {q.vehicleSnapshot.model}</p></td><td data-label="Estado"><span className={`badge ${q.status.toLowerCase()}`}>{labels[q.status]}</span></td><td data-label="Pago"><span className={`badge-payment ${payment.toLowerCase()}`}>{payment}</span></td><td data-label="Total" className="align-right amount-cell">{money(total)}</td><td className="row-action"><button className="secondary" disabled={busy} onClick={() => onOpen(q.id)} aria-label={`Ver cotización ${q.number}`}>Ver detalle <Icon name="arrow" size={16}/></button></td></tr>;
        })}</tbody></table></div>
        <div className="pagination-wrap"><span>Página {page} de {result.pagination.totalPages} · {result.pagination.total} resultados</span><div className="pagination-buttons"><button className="secondary" disabled={page <= 1 || loading} onClick={() => setPage(v => v - 1)}><Icon name="back" size={16}/> Anterior</button><button className="secondary" disabled={page >= result.pagination.totalPages || loading} onClick={() => setPage(v => v + 1)}>Siguiente <Icon name="arrow" size={16}/></button></div></div>
      </>}
    </section>
  </>;
}
