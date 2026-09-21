import { useState } from 'react';
import { money, downloadPdf, assetUrl } from './api';
import ReceiptModal from './components/ReceiptModal';
import { companyLogo } from './brand';
import QuoteAcceptance from './components/QuoteAcceptance';

export default function QuoteDocument({ quote: q, onAddReceipt, onDeleteReceipt, isPublic = false, publicToken }) {
  const company = q.companySnapshot || {};
  const customer = q.customerSnapshot || {};
  const vehicle = q.vehicleSnapshot || {};
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [downloadingReceipt, setDownloadingReceipt] = useState(null);

  async function downloadReceipt(receipt) {
    setDownloadError(''); setDownloadingReceipt(receipt.id);
    try {
      const path = isPublic ? `/public/quotes/${publicToken}/receipts/${receipt.id}/pdf` : `/quotes/receipts/${receipt.id}/pdf`;
      await downloadPdf(path, receipt.number);
    } catch (e) { setDownloadError(e.message); }
    finally { setDownloadingReceipt(null); }
  }

  const ownerStr = company.ownerName ? ` · Representante: ${company.ownerName}` : '';
  const companyDisplayName = `${company.name || 'Taller Dimensión'}`;

  const totalPaid = (q.receipts || []).reduce((sum, r) => sum + Number(r.amount), 0);
  const total = Number(q.total);
  const remainingBalance = Math.max(0, total - totalPaid);
  const paymentStatus = totalPaid >= total ? 'PAGADO' : totalPaid > 0 ? 'ABONADO' : 'PENDIENTE';

  const methodsMap = {
    EFECTIVO: 'Efectivo',
    TRANSFERENCIA: 'Transferencia bancaria',
    TARJETA_DEBITO: 'Tarjeta de débito',
    TARJETA_CREDITO: 'Tarjeta de crédito',
    CHEQUE: 'Cheque',
    OTRO: 'Otro medio'
  };

  return (
    <article className="document">
      <header className="document-head">
        <div>
          <img className="logo" src={assetUrl(companyLogo(company.logoUrl))} alt={`Logo de ${companyDisplayName}`} />
          <h2>{companyDisplayName}</h2>
          {company.ownerName && <p className="font-semibold text-ink">{company.ownerName}</p>}
          <p>{company.taxId}</p>
          <p>{company.address}</p>
          <p>{company.phone} {company.email}</p>
        </div>
        <div className="text-right">
          <span className="eyebrow">COTIZACIÓN DE REPARACIÓN</span>
          <h2>N.º {String(q.number).padStart(5, '0')}</h2>
          <p>{new Date(q.date).toLocaleDateString('es-CL')}</p>
          <div className="mt-2 flex justify-end gap-2">
            <span className={`badge ${q.status.toLowerCase()}`}>{q.status}</span>
            <span className={`badge-payment ${paymentStatus.toLowerCase()}`}>{paymentStatus}</span>
          </div>
        </div>
      </header>

      <QuoteAcceptance quote={q} isPublic={isPublic}/>

      <section className="grid gap-8 sm:grid-cols-2 my-8">
        <div>
          <span className="eyebrow">DATOS DEL CLIENTE</span>
          <h3 className="text-base text-ink mt-1">{customer.name}</h3>
          <p className="text-xs text-zinc-600 mt-1">RUT: <strong>{customer.taxId}</strong></p>
          {customer.address && <p className="text-xs text-zinc-600">Dirección: {customer.address}</p>}
          {customer.phone && <p className="text-xs text-zinc-600">Teléfono: {customer.phone}</p>}
          {customer.email && <p className="text-xs text-zinc-600">Correo: {customer.email}</p>}
        </div>
        <div>
          <span className="eyebrow">DATOS DEL VEHÍCULO</span>
          <h3 className="text-base text-ink mt-1">{vehicle.brand} {vehicle.model} · {vehicle.year}</h3>
          <p className="text-xs text-zinc-600 mt-1">Patente: <strong>{vehicle.plate}</strong> {vehicle.color ? `· Color: ${vehicle.color}` : ''}</p>
          {vehicle.vin && <p className="text-xs text-zinc-600">VIN: {vehicle.vin}</p>}
        </div>
      </section>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Descripción del trabajo / material</th>
              <th>Cantidad</th>
              <th>Precio neto</th>
              <th>Total neto</th>
            </tr>
          </thead>
          <tbody>
            {q.lines.map(l => (
              <tr key={l.position}>
                <td>
                  <strong>{l.name}</strong>
                  {l.description && <p>{l.description}</p>}
                </td>
                <td>{Number(l.quantity)}</td>
                <td>{money(l.unitPrice)}</td>
                <td>{money(l.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="totals">
        <p><span>Subtotal neto</span><b>{money(q.subtotal)}</b></p>
        <p><span>IVA ({Number(q.taxRate)}%)</span><b>{money(q.tax)}</b></p>
        <p className="grand-total"><span>Total CLP</span><b>{money(q.total)}</b></p>
        {totalPaid > 0 && (
          <>
            <p className="text-emerald-700 font-bold border-t border-zinc-200 mt-2 pt-2 flex justify-between">
              <span>Total Abonado:</span><b>{money(totalPaid)}</b>
            </p>
            <p className="text-rose-700 font-bold flex justify-between">
              <span>Saldo Pendiente:</span><b>{money(remainingBalance)}</b>
            </p>
          </>
        )}
      </div>

      {/* Historial de Recibos y Abonos */}
      <section className="payment-receipts-section mt-8 pt-6 border-t border-zinc-200 print-hidden">
        {downloadError && <p role="alert" className="error">{downloadError}</p>}
        <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
          <div>
            <h3 className="text-base font-bold text-zinc-800 inline-flex items-center gap-2">
              <span>🧾 Recibos de Dinero y Abonos</span>
              <span className={`badge-payment ${paymentStatus.toLowerCase()}`}>{paymentStatus}</span>
            </h3>
            <p className="text-xs text-zinc-500">
              Monto Pagado: <strong className="text-emerald-700">{money(totalPaid)}</strong> · Saldo Pendiente: <strong className="text-rose-600">{money(remainingBalance)}</strong>
            </p>
          </div>

          {!isPublic && remainingBalance > 0 && (
            <button className="primary" onClick={() => setShowReceiptModal(true)}>
              + Registrar Abono / Recibo
            </button>
          )}
        </div>

        {(!q.receipts || q.receipts.length === 0) ? (
          <p className="text-xs text-zinc-400 italic bg-zinc-50 p-4 rounded-lg border border-zinc-200 text-center">
            No se han registrado abonos para esta cotización aún.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="text-xs">
              <thead>
                <tr>
                  <th>Recibo N.º</th>
                  <th>Fecha</th>
                  <th>Entregado por</th>
                  <th>Recibido por</th>
                  <th>Medio de Pago</th>
                  <th>Monto</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {q.receipts.map(r => (
                  <tr key={r.id}>
                    <td><strong>Recibo N.º {String(r.number).padStart(5, '0')}</strong></td>
                    <td>{new Date(r.date).toLocaleDateString('es-CL')}</td>
                    <td>{r.paidBy || customer.name || '-'}</td>
                    <td>{r.receivedBy || company.ownerName || company.name || '-'}</td>
                    <td>{methodsMap[r.paymentMethod] || r.paymentMethod}</td>
                    <td className="font-bold text-emerald-700">{money(r.amount)}</td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          className="secondary"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          disabled={downloadingReceipt !== null}
                          onClick={() => downloadReceipt(r)}
                        >
                          {downloadingReceipt === r.id ? 'Descargando…' : 'Descargar PDF 📄'}
                        </button>
                        {!isPublic && onDeleteReceipt && (
                          <button
                            className="secondary text-rose-600 border-rose-200 hover:bg-rose-50"
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                            onClick={() => onDeleteReceipt(r.id)}
                          >
                            Anular ✕
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {q.observations && (
        <section className="document-notes mt-6">
          <h3>Observaciones de daños y plazo estimado</h3>
          <p>{q.observations}</p>
        </section>
      )}

      {q.terms && (
        <section className="document-notes mt-4">
          <h3>Términos y condiciones</h3>
          <p>{q.terms}</p>
        </section>
      )}

      {company.signatureUrl && (
        <div className="mt-6 flex flex-col items-start">
          <img src={assetUrl(company.signatureUrl)} alt="Firma digital" className="h-14 object-contain" />
          <span className="text-xs font-semibold text-zinc-700 border-t border-zinc-300 pt-1 mt-1">
            {company.ownerName || company.name}
          </span>
        </div>
      )}

      <footer className="mt-8 text-center text-xs text-zinc-500 pt-4 border-t border-zinc-200">
        Gracias por confiar en {company.name}.
      </footer>

      {showReceiptModal && (
        <ReceiptModal
          quote={q}
          onClose={() => setShowReceiptModal(false)}
          onSaved={async receiptData => {
            await onAddReceipt(receiptData);
            setShowReceiptModal(false);
          }}
        />
      )}
    </article>
  );
}
