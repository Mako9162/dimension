import { money } from '../api';
import Icon from './Icon';
export default function MetricsChart({ metrics, onFilter }) {
  const cards = [
    { label: 'Cotizaciones', value: metrics?.total, note: 'Todo el historial', icon: 'quotes', filter: '', tone: 'navy' },
    { label: 'Por confirmar', value: metrics?.sent, note: 'Enviadas a tus clientes', icon: 'clock', filter: 'ENVIADA', tone: 'amber' },
    { label: 'Trabajos aprobados', value: metrics && money(metrics.approvedTotal), note: `${metrics?.approved || 0} propuestas aprobadas`, icon: 'check', filter: 'APROBADA', tone: 'green' },
    { label: 'Saldo por cobrar', value: metrics && money(metrics.pendingBalance), note: 'De trabajos aprobados', icon: 'wallet', filter: 'APROBADA', tone: 'blue' },
  ];
  return <div className="stats-grid print-hidden">{cards.map(card => <button key={card.label} className={`stat-card ${card.tone}`} onClick={() => onFilter(card.filter)} aria-label={`Filtrar ${card.label.toLowerCase()}`}><div className="stat-top"><span className="stat-label">{card.label}</span><span className="stat-icon"><Icon name={card.icon}/></span></div><strong className={`stat-value ${metrics ? '' : 'skeleton'}`}>{metrics ? card.value : '—'}</strong><span className="stat-sub">{card.note}<Icon name="arrow" size={14}/></span></button>)}</div>;
}
