export async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'TallerDimension', ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) throw new Error(data.details?.map(d => `${d.path.join('.')}: ${d.message}`).join(' · ') || data.error || 'Error de conexión');
  return data;
}
export async function downloadPdf(path, number) {
  const response = await fetch(`/api${path}`, { credentials: 'same-origin' });
  if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'No se pudo descargar el PDF'); }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url; link.download = `Cotizacion-${String(number).padStart(5, '0')}.pdf`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export const money = value => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
export const categories = { REPUESTO: 'Repuesto', INSUMO: 'Insumo', MANO_OBRA: 'Mano de obra' };
