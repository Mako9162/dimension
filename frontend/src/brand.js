export const WORKSHOP_LOGO = '/brand/taller-dimension-v3.webp';

// La ruta estable recibe la marca actual; los logos personalizados se conservan.
export function companyLogo(value) {
  return !value || value === '/brand/taller-dimension.png' ? WORKSHOP_LOGO : value;
}
