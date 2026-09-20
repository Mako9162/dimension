export const WORKSHOP_LOGO = '/brand/taller-dimension.png';
export const WORKSHOP_LOGO_DARK = '/brand/taller-dimension-dark.png';

// La ruta estable recibe la marca actual; los logos personalizados se conservan.
export function companyLogo(value, dark = false) {
  if (!value || value.includes('taller-dimension')) {
    return dark ? WORKSHOP_LOGO_DARK : WORKSHOP_LOGO;
  }
  return value;
}
