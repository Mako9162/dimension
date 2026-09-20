// En producción Vercel actúa como proxy: cookies propias, sin cookies de terceros.
const BASE_URL = import.meta.env.DEV ? (import.meta.env.VITE_API_URL || '/api') : '/api';
const endpoint = path => `${BASE_URL.replace(/\/$/, '')}${path.startsWith('/') ? path : '/' + path}`;
export class ApiError extends Error { constructor(message, status) { super(message); this.status = status; } }
async function request(path, options = {}) {
  const timeout = AbortSignal.timeout(path.endsWith('/pdf') ? 90000 : 60000);
  const signal = options.signal ? AbortSignal.any([timeout, options.signal]) : timeout;
  let response;
  try {
    response = await fetch(endpoint(path), { ...options, signal, credentials: 'include', headers: { ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }), 'X-Requested-With': 'TallerDimension', ...options.headers }, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError(timeout.aborted ? 'El servidor está tardando en responder. Intenta nuevamente en unos segundos.' : 'No pudimos conectar. Revisa tu conexión e intenta nuevamente.', 0);
  }
  if (!response.ok) {
    if (response.status === 401 && !['/auth/login', '/auth/me'].includes(path)) window.dispatchEvent(new Event('session-expired'));
    const data = await response.json().catch(() => ({}));
    throw new ApiError(data.details?.map(d => d.message).join(' · ') || data.error || 'No fue posible completar la operación.', response.status);
  }
  return response;
}
export async function api(path, options = {}) {
  const response = await request(path, options);
  if (response.status === 204) return null;
  if (!response.headers.get('content-type')?.includes('application/json')) throw new ApiError('El servidor no devolvió una respuesta válida.', 502);
  return response.json();
}
export async function downloadPdf(path, number) {
  const response = await request(path);
  if (!response.headers.get('content-type')?.includes('application/pdf')) throw new ApiError('No se recibió un PDF válido.', 502);
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url; link.download = `${path.includes('receipts') ? 'Recibo' : 'Cotizacion'}-${String(number).padStart(5, '0')}.pdf`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export function assetUrl(value) {
  if (!value) return '';
  if (value.startsWith('/brand/') || value.startsWith('data:image/')) return value;
  if (value.startsWith('/uploads/')) return import.meta.env.DEV && BASE_URL.startsWith('http') ? `${new URL(BASE_URL).origin}${value}` : value;
  try { return new URL(value).protocol === 'https:' ? value : ''; } catch { return ''; }
}
export const money = value => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
export const categories = { REPUESTO: 'Repuesto', INSUMO: 'Insumo', MANO_OBRA: 'Mano de obra' };
