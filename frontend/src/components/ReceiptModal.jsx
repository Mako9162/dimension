import { useState } from 'react';
import { money } from '../api';

export default function ReceiptModal({ quote, onClose, onSaved }) {
  const totalPaid = (quote.receipts || []).reduce((sum, r) => sum + Number(r.amount), 0);
  const total = Number(quote.total);
  const maxBalance = Math.max(0, total - totalPaid);

  const [amount, setAmount] = useState(maxBalance ? String(maxBalance) : '');
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
  const [paidBy, setPaidBy] = useState(quote.customerSnapshot?.name || '');
  const [receivedBy, setReceivedBy] = useState(quote.companySnapshot?.ownerName || quote.companySnapshot?.name || '');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const methods = [
    ['EFECTIVO', 'Efectivo'],
    ['TRANSFERENCIA', 'Transferencia bancaria'],
    ['TARJETA_DEBITO', 'Tarjeta de débito'],
    ['TARJETA_CREDITO', 'Tarjeta de crédito'],
    ['CHEQUE', 'Cheque'],
    ['OTRO', 'Otro medio']
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError('El monto del abono debe ser mayor a 0.');
      return;
    }
    if (numAmount > maxBalance) {
      setError(`El monto no puede superar el saldo pendiente (${money(maxBalance)}).`);
      return;
    }

    setBusy(true);
    try {
      await onSaved({ amount: numAmount, paymentMethod, paidBy, receivedBy, notes });
    } catch (err) {
      setError(err.message || 'Error al registrar el recibo');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop print-hidden">
      <div className="modal-panel">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">Registrar Recibo de Dinero / Abono</h2>
          <button className="text-slate-400 hover:text-slate-600 text-xl font-bold" onClick={onClose}>×</button>
        </div>

        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4 text-xs space-y-1">
          <div className="flex justify-between"><span>Total Cotización N.º {String(quote.number).padStart(5, '0')}:</span> <strong>{money(total)}</strong></div>
          <div className="flex justify-between text-emerald-700"><span>Abonado a la fecha:</span> <strong>{money(totalPaid)}</strong></div>
          <div className="flex justify-between text-rose-700 font-bold border-t border-slate-200 pt-1"><span>Saldo Pendiente Actual:</span> <strong>{money(maxBalance)}</strong></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Monto del Abono (CLP)*</label>
            <input
              type="number"
              required
              min="1"
              max={maxBalance}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full p-2 border rounded-lg"
              placeholder="Ej: 50000"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Quien Entrega El Dinero</label>
              <input
                type="text"
                required
                value={paidBy}
                onChange={e => setPaidBy(e.target.value)}
                className="w-full p-2 border rounded-lg text-xs"
                placeholder="Nombre de quien paga"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Quien Recibe El Dinero (Editable)</label>
              <input
                type="text"
                required
                value={receivedBy}
                onChange={e => setReceivedBy(e.target.value)}
                className="w-full p-2 border rounded-lg text-xs"
                placeholder="Nombre de quien recibe"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Medio de Pago*</label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              className="w-full p-2 border rounded-lg bg-white text-xs"
            >
              {methods.map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Observaciones / N.º de Comprobante</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej: N.º transferencia 482910"
              className="w-full p-2 border rounded-lg text-xs"
            />
          </div>

          {error && <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded border border-rose-200">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="secondary" onClick={onClose} disabled={busy}>Cancelar</button>
            <button type="submit" className="primary" disabled={busy}>
              {busy ? 'Guardando...' : 'Emitir Recibo 🧾'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
