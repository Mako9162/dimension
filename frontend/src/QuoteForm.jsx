import { useEffect, useRef, useState } from 'react';
import Decimal from 'decimal.js';
import { api, money } from './api';

export default function QuoteForm({ customers, vehicles, items, categoriesList = [], company, editingQuote, onSaved, onCancel, onDirtyChange }) {
  const isEditing = Boolean(editingQuote);
  const activeCategories = categoriesList.length
    ? categoriesList.map(c => typeof c === 'string' ? c : c.name)
    : ['Repuesto', 'Insumo', 'Mano de obra', 'Pintura', 'Desabolladura', 'Mecánica', 'Electricidad'];
  const defaultCategory = activeCategories[0] || 'Mano de obra';

  const [customerId, setCustomer] = useState(editingQuote?.customerId || '');
  const [vehicleId, setVehicle] = useState(editingQuote?.vehicleId || '');
  const [lines, setLines] = useState(
    editingQuote?.lines?.map(l => ({
      key: crypto.randomUUID(),
      itemId: l.itemId || undefined,
      name: l.name || '',
      category: l.category || defaultCategory,
      description: l.description || '',
      quantity: String(l.quantity),
      unitPrice: String(l.unitPrice)
    })) || []
  );
  const [taxRate, setTaxRate] = useState(editingQuote ? String(editingQuote.taxRate) : '19');
  const [observations, setObservations] = useState(editingQuote?.observations || '');
  const [terms, setTerms] = useState(editingQuote ? (editingQuote.terms || '') : (company?.terms || ''));

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const initial = useRef(JSON.stringify({ customerId, vehicleId, lines, taxRate, observations, terms }));
  const current = JSON.stringify({ customerId, vehicleId, lines, taxRate, observations, terms });
  const dirty = current !== initial.current;
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => {
    if (!dirty) return;
    const warn = e => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const safe = value => { try { const n = new Decimal(value || 0); return n.isFinite() ? n : new Decimal(0); } catch { return new Decimal(0); } };
  const lineTotals = lines.map(l => safe(l.quantity).mul(safe(l.unitPrice)).toDecimalPlaces(0, Decimal.ROUND_HALF_UP));
  const subtotal = lineTotals.reduce((a, b) => a.plus(b), new Decimal(0));
  const tax = subtotal.mul(safe(taxRate)).div(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);

  function add(item) {
    setLines([...lines, { key: crypto.randomUUID(), itemId: item?.id, name: item?.name || '', category: item?.category || defaultCategory, description: item?.description || '', quantity: '1', unitPrice: item?.price || '0' }]);
  }

  function change(key, name, value) { setLines(lines.map(l => l.key === key ? { ...l, [name]: value } : l)); }

  async function save(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const endpoint = isEditing ? `/quotes/${editingQuote.id}` : '/quotes';
      const method = isEditing ? 'PUT' : 'POST';
      const quote = await api(endpoint, {
        method,
        body: { customerId, vehicleId, taxRate, observations, terms, lines: lines.map(({ key, ...l }) => l) }
      });
      initial.current = current;
      onDirtyChange?.(false);
      await onSaved(quote);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  return <form onSubmit={save} className="quote-form">
    <section className="panel"><div className="section-title"><span className="step">01</span><div><h2>Cliente y vehículo</h2><p>Selecciona a quién va dirigida la cotización.</p></div></div>
      <div className="grid gap-5 md:grid-cols-2"><label>Cliente<select required value={customerId} onChange={e => { setCustomer(e.target.value); setVehicle(''); }}><option value="">Seleccionar cliente</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name} · {c.taxId}</option>)}</select></label><label>Vehículo<select required value={vehicleId} disabled={!customerId} onChange={e => setVehicle(e.target.value)}><option value="">Seleccionar vehículo</option>{vehicles.filter(v => v.customerId === customerId).map(v => <option key={v.id} value={v.id}>{v.plate} · {v.brand} {v.model}</option>)}</select></label></div>
      {!customers.length && <p className="hint">Registra un cliente y su vehículo en las secciones correspondientes.</p>}
    </section>
    <section className="panel"><div className="section-title"><span className="step">02</span><div><h2>Detalle de trabajos</h2><p>Precios netos en pesos chilenos. Puedes ajustarlos para esta cotización.</p></div></div>
      <div className="flex flex-wrap gap-3 mb-5"><select aria-label="Agregar desde catálogo" className="flex-1" value="" onChange={e => { const item = items.find(i => i.id === e.target.value); if (item) add(item); }}><option value="">+ Agregar desde el catálogo</option>{items.map(i => <option key={i.id} value={i.id}>{i.category} · {i.name} · {money(i.price)}</option>)}</select><button type="button" className="secondary" onClick={() => add()}>+ Ítem libre</button></div>
      {!lines.length ? <div className="empty"><span>＋</span><h3>Comienza con el primer trabajo</h3><p>Agrega repuestos, insumos o mano de obra.</p></div> : <div className="table-wrap"><table className="editor"><thead><tr><th>Ítem / categoría</th><th>Cantidad</th><th>Precio neto</th><th>Total</th><th></th></tr></thead><tbody>{lines.map((l, index) => <tr key={l.key}><td>{l.itemId ? <><strong>{l.name}</strong><p>{l.category}</p></> : <><input aria-label={`Nombre ítem ${index + 1}`} required maxLength={300} placeholder="Descripción del trabajo" value={l.name} onChange={e => change(l.key, 'name', e.target.value)}/><select aria-label={`Categoría ítem ${index + 1}`} value={l.category} onChange={e => change(l.key, 'category', e.target.value)}>{activeCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></>}</td><td><input aria-label={`Cantidad ítem ${index + 1}`} type="number" required min="0.01" max="10000" step="0.01" value={l.quantity} onChange={e => change(l.key, 'quantity', e.target.value)}/></td><td><input aria-label={`Precio ítem ${index + 1}`} type="number" required min="0" max="100000000" step="0.01" value={l.unitPrice} onChange={e => change(l.key, 'unitPrice', e.target.value)}/></td><td className="whitespace-nowrap">{money(lineTotals[index])}</td><td><button type="button" className="remove" aria-label={`Eliminar ${l.name || 'ítem'}`} onClick={() => setLines(lines.filter(row => row.key !== l.key))}>×</button></td></tr>)}</tbody></table></div>}
      <div className="totals"><p><span>Subtotal</span><b>{money(subtotal)}</b></p><label className="tax-field">IVA (%)<input aria-label="Porcentaje IVA" type="number" required min="0" max="100" step="0.01" value={taxRate} onChange={e => setTaxRate(e.target.value)}/><b>{money(tax)}</b></label><p className="grand-total"><span>Total CLP</span><b>{money(subtotal.plus(tax))}</b></p></div>
    </section>
    <section className="panel"><div className="section-title"><span className="step">03</span><h2>Información adicional</h2></div><div className="grid gap-5 md:grid-cols-2"><label>Observaciones de daños y plazo estimado<textarea rows={4} maxLength={10000} placeholder="Ej. Daño en parachoques delantero. Entrega estimada: 3 días hábiles." value={observations} onChange={e => setObservations(e.target.value)}/></label><label>Términos y condiciones<textarea rows={4} maxLength={10000} value={terms} onChange={e => setTerms(e.target.value)}/></label></div></section>
    {error && <p role="alert" className="error">{error}</p>}
    <div className="form-save-bar"><span>{dirty ? 'Cambios sin guardar' : 'Completa los datos de tu propuesta'}</span>
      {onCancel && <button type="button" className="secondary" onClick={onCancel}>Cancelar</button>}
      <button disabled={busy || !lines.length} className="primary">{busy ? 'Guardando…' : isEditing ? 'Guardar Cambios 💾' : 'Guardar cotización →'}</button>
    </div>
  </form>;
}
