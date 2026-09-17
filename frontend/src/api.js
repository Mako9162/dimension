const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export async function api(path, options = {}) {
  const url = `${BASE_URL.replace(/\/$/, '')}${path.startsWith('/') ? path : '/' + path}`;
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'TallerDimension', ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Error de conexión con el servidor backend');
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.details?.map(d => `${d.path.join('.')}: ${d.message}`).join(' · ') || data.error || 'Error de conexión');
  return data;
}

export async function downloadPdf(path, number) {
  const url = `${BASE_URL.replace(/\/$/, '')}${path.startsWith('/') ? path : '/' + path}`;
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    let errorMsg = 'No se pudo descargar el PDF';
    try { const data = await response.json(); errorMsg = data.error || errorMsg; } catch (e) {}
    throw new Error(errorMsg);
  }
  const blobUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = blobUrl; link.download = `Cotizacion-${String(number).padStart(5, '0')}.pdf`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
}

export const money = value => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
export const categories = { REPUESTO: 'Repuesto', INSUMO: 'Insumo', MANO_OBRA: 'Mano de obra' };
