import { money } from '../api';

export default function MetricsChart({ quotes = [] }) {
  const totalCount = quotes.length;
  const drafts = quotes.filter(q => q.status === 'BORRADOR').length;
  const sent = quotes.filter(q => q.status === 'ENVIADA').length;
  const approved = quotes.filter(q => q.status === 'APROBADA').length;

  const totalApprovedMoney = quotes
    .filter(q => q.status === 'APROBADA')
    .reduce((sum, q) => sum + Number(q.total), 0);

  const conversionRate = totalCount > 0 ? Math.round((approved / totalCount) * 100) : 0;

  const draftPct = totalCount > 0 ? (drafts / totalCount) * 100 : 0;
  const sentPct = totalCount > 0 ? (sent / totalCount) * 100 : 0;
  const approvedPct = totalCount > 0 ? (approved / totalCount) * 100 : 0;

  return (
    <div className="metrics-dashboard print-hidden mb-6">
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Cotizaciones</span>
          <strong className="stat-value">{totalCount}</strong>
          <span className="stat-sub font-medium">Recientes en sistema</span>
        </div>

        <div className="stat-card warning">
          <span className="stat-label">Pendientes / Enviadas</span>
          <strong className="stat-value text-amber-600">{sent}</strong>
          <span className="stat-sub text-amber-600 font-medium">En espera de cliente</span>
        </div>

        <div className="stat-card success">
          <span className="stat-label">Total Aprobado</span>
          <strong className="stat-value text-emerald-600">{money(totalApprovedMoney)}</strong>
          <span className="stat-sub text-emerald-600 font-medium">{approved} cotización(es) aprobada(s)</span>
        </div>

        <div className="stat-card info">
          <span className="stat-label">Tasa de Conversión</span>
          <strong className="stat-value text-blue-600">{conversionRate}%</strong>
          <span className="stat-sub text-blue-600 font-medium">Cierre de propuestas</span>
        </div>
      </div>

      {totalCount > 0 && (
        <div className="status-progress-panel mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Distribución de Estados</span>
            <div className="flex gap-4 text-xs">
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span> Borrador ({drafts})</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Enviada ({sent})</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Aprobada ({approved})</span>
            </div>
          </div>
          <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
            {draftPct > 0 && <div style={{ width: `${draftPct}%` }} className="bg-slate-400 transition-all duration-500" title={`Borrador: ${drafts}`} />}
            {sentPct > 0 && <div style={{ width: `${sentPct}%` }} className="bg-amber-500 transition-all duration-500" title={`Enviada: ${sent}`} />}
            {approvedPct > 0 && <div style={{ width: `${approvedPct}%` }} className="bg-emerald-500 transition-all duration-500" title={`Aprobada: ${approved}`} />}
          </div>
        </div>
      )}
    </div>
  );
}
