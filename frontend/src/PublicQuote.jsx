import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { api, downloadPdf, money } from './api';
import QuoteDocument from './QuoteDocument';
import Icon from './components/Icon';

export default function PublicQuote({ token }) {
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState('');
  const [acceptanceError, setAcceptanceError] = useState('');
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [retry, setRetry] = useState(0);
  const [name, setName] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const endpoint = `/public/quotes/${token}`;

  useEffect(() => {
    const controller = new AbortController();
    setError(''); setQuote(null); setConfirmed(false);
    api(endpoint, { signal: controller.signal }).then(setQuote).catch(e => {
      if (e.name !== 'AbortError') setError(e.message);
    });
    return () => controller.abort();
  }, [endpoint, retry]);

  async function download() {
    setDownloading(true); setError('');
    try { await downloadPdf(`${endpoint}/pdf`, quote.number); }
    catch (e) { setError(e.message); }
    finally { setDownloading(false); }
  }

  async function accept(event) {
    event.preventDefault();
    if (busy || !confirmed || name.trim().length < 2) return;
    setBusy(true); setError(''); setAcceptanceError('');
    try {
      const answer = await Swal.fire({
        titleText: '¿Confirmas esta cotización?',
        text: `Aceptarás los trabajos y condiciones de la cotización N.º ${String(quote.number).padStart(5, '0')} por ${money(quote.total)} (IVA incluido).`,
        icon: 'question', showCancelButton: true, focusCancel: true,
        confirmButtonText: 'Sí, aceptar cotización', cancelButtonText: 'Seguir revisando',
        customClass: { confirmButton: 'brand-confirm' },
      });
      if (!answer.isConfirmed) return;
      const accepted = await api(`${endpoint}/accept`, {
        method: 'POST', body: { revision: quote.revision, acceptedBy: name.trim(), confirmed: true },
      });
      setQuote(accepted); setConfirmed(false);
    } catch (e) {
      setConfirmed(false);
      // Una conexión interrumpida puede ocurrir después de guardar la aceptación.
      // Consultar el estado evita repetirla o mostrar un fallo falso.
      try {
        const latest = await api(endpoint);
        setQuote(latest);
        if (latest.status !== 'APROBADA') setAcceptanceError(e.message);
      } catch (refreshError) {
        if (refreshError.status === 404) setQuote(null);
        if (refreshError.status === 404) setError(refreshError.message);
        else setAcceptanceError(e.message);
      }
    } finally { setBusy(false); }
  }

  return <main className="public-page">
    <div className="public-toolbar print-hidden">
      <span><Icon name="shield" size={18}/> Una propuesta preparada para ti</span>
      {quote && <button className="secondary" onClick={download} disabled={downloading || busy}>
        <Icon name="download"/>{downloading ? 'Preparando PDF…' : 'Descargar PDF'}
      </button>}
    </div>
    {error && <div role="alert" className="error">{error} {!quote && <button className="secondary" onClick={() => setRetry(v => v + 1)}>Reintentar</button>}</div>}
    {quote ? <>
      {quote.status === 'ENVIADA' && <div className="public-review-hint print-hidden"><Icon name="check" size={18}/><p>Revisa los trabajos, el total y las condiciones. Puedes aceptar la propuesta al final de esta página.</p><a href="#accept-quote">Ir a la aceptación</a></div>}
      <QuoteDocument quote={quote} isPublic publicToken={token}/>
      <section id="accept-quote" className={`acceptance-panel print-hidden ${quote.status === 'APROBADA' ? 'is-accepted' : ''}`} aria-labelledby="acceptance-title" aria-live="polite">
        {acceptanceError && <p className="error" role="alert">{acceptanceError}</p>}
        {quote.status === 'APROBADA' ? <>
          <Icon name="check" size={28}/><div><h2 id="acceptance-title">Cotización aprobada</h2>
            <p>{quote.acceptance ? 'Tu aceptación quedó registrada y el taller ya puede verla. No necesitas volver a enviarla.' : 'El taller ya registró esta cotización como aprobada.'}</p>
          </div>
        </> : quote.status === 'ENVIADA' ? <form onSubmit={accept}>
          <span className="eyebrow">EL SIGUIENTE PASO</span><h2 id="acceptance-title">Aceptar esta cotización</h2>
          <p>Confirma la propuesta para que el taller pueda coordinar contigo los trabajos.</p>
          <div className="acceptance-total"><span>Total a aceptar <small>IVA incluido</small></span><strong>{money(quote.total)}</strong></div>
          <label htmlFor="acceptance-name">Tu nombre completo</label>
          <input id="acceptance-name" name="acceptedBy" autoComplete="name" minLength={2} maxLength={120} required disabled={busy} value={name} onChange={e => setName(e.target.value)} placeholder="Nombre de quien acepta"/>
          <label className="acceptance-check"><input type="checkbox" checked={confirmed} disabled={busy} required onChange={e => setConfirmed(e.target.checked)}/><span>{quote.acceptanceConsent}</span></label>
          <button type="submit" className="primary" disabled={busy || !confirmed || name.trim().length < 2}>{busy ? <><span className="spinner"/> Registrando aceptación…</> : <><Icon name="check"/> Aceptar cotización</>}</button>
          <p className="acceptance-note">Se registrarán tu nombre y la fecha de confirmación. No se realizará ningún cobro.</p>
        </form> : <div><h2 id="acceptance-title">Propuesta en preparación</h2><p>El taller debe habilitar esta cotización antes de que puedas aceptarla.</p></div>}
      </section>
    </> : !error && <div className="loading-state" role="status"><span className="spinner"/> Preparando tu cotización…</div>}
  </main>;
}
