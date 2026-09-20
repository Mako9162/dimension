const paths = {
  quotes: 'M8 3h8l4 4v14H4V3h4m6 0v6h6M8 13h8M8 17h5',
  customers: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m14-14a4 4 0 0 1 0 8m6 6v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  vehicles: 'm5 7 2-4h10l2 4 2 4v7H3v-7l2-4zm-2 4h18M6 18v3m12-3v3M6 14h2m8 0h2M5 7h14',
  items: 'm12 3 9 5-9 5-9-5 9-5zm-9 5v10l9 5 9-5V8M12 13v10M7 5l9 5',
  company: 'M3 21h18M5 21V3h14v18M9 7h2m2 0h2M9 11h2m2 0h2M9 15h2m2 0h2M10 21v-3h4v3',
  search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  plus: 'M12 5v14M5 12h14',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  back: 'M19 12H5m6-6-6 6 6 6',
  check: 'm5 12 4 4L19 6',
  clock: 'M12 7v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  link: 'm10 13 4-4m-6 7-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 1 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0',
  edit: 'm16 3 5 5-12 12-6 1 1-6L16 3zm-3 3 5 5',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'm6 6 12 12M6 18 18 6',
  shield: 'm12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4zm-4 9 3 3 5-5',
  eye: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  logout: 'M9 3H3v18h6m6-14 5 5-5 5M8 12h12',
  refresh: 'M20 7a9 9 0 1 0 1 8M20 2v6h-6',
  wallet: 'M3 5h16v15H3V5zm0 0V3h13v2m-1 7h6v5h-6v-5',
};
export default function Icon({ name, size = 20, ...props }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name] || paths.quotes}/></svg>;
}
