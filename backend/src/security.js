export const DEFAULT_FRONTEND = 'https://dimension-frontend-sage.vercel.app';
export function allowedOrigins() {
  const configured = [DEFAULT_FRONTEND, process.env.FRONTEND_URL, ...(process.env.ALLOWED_ORIGINS || '').split(',')].filter(Boolean);
  if (process.env.NODE_ENV !== 'production') configured.push('http://localhost:5173', 'http://localhost:3001', 'http://127.0.0.1:5173', 'http://127.0.0.1:3001');
  return new Set(configured.map(value => new URL(value.trim()).origin));
}

// Limitadores acotados en memoria: no conservan contraseñas ni datos de clientes.
export function createLimiter({ limit, windowMs, maxKeys = 10000 }) {
  const entries = new Map();
  return key => {
    const now = Date.now();
    for (const [k, v] of entries) if (v.until <= now) entries.delete(k);
    let value = entries.get(key);
    if (!value) {
      if (entries.size >= maxKeys) return false;
      value = { count: 0, until: now + windowMs }; entries.set(key, value);
    }
    return ++value.count <= limit;
  };
}
