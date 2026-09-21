export function formatAcceptanceDate(value) {
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Santiago' }).format(new Date(value));
}

export default function QuoteAcceptance({ quote, isPublic }) {
  const current = quote.acceptance || quote.acceptances?.find(a => a.revision === quote.revision);
  const previous = isPublic ? [] : (quote.acceptances || []).filter(a => a.revision !== quote.revision);
  return <>
    {current && <div className="acceptance-record" role="status">
      <strong>Aceptada por el cliente</strong>
      <p>{current.acceptedBy} · {formatAcceptanceDate(current.acceptedAt)} (hora de Chile)</p>
    </div>}
    {previous.length > 0 && <details className="acceptance-history print-hidden">
      <summary>Aceptaciones de versiones anteriores ({previous.length})</summary>
      <p>Estas confirmaciones corresponden a propuestas anteriores, no a la versión actual.</p>
      <ul>{previous.map(a => <li key={a.revision}>Versión {a.revision} · {a.acceptedBy} · {formatAcceptanceDate(a.acceptedAt)}</li>)}</ul>
    </details>}
  </>;
}
