import { useEffect } from 'react';
import Swal from 'sweetalert2';
export default function useIdleSession(logged, onLogout) {
  useEffect(() => {
    if (!logged) return;
    let lastActivity = Date.now(), warning = false, disposed = false;
    const activity = () => { if (!warning) lastActivity = Date.now(); };
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(name => window.addEventListener(name, activity, { passive: true }));
    const timer = setInterval(async () => {
      if (warning || Date.now() - lastActivity < 15 * 60000) return;
      warning = true;
      const answer = await Swal.fire({ title: '¿Sigues trabajando?', text: 'Tu sesión se cerrará en 5 minutos por inactividad. Puedes seguir trabajando sin perder esta vista.', icon: 'info', showCancelButton: true, confirmButtonText: 'Seguir trabajando', cancelButtonText: 'Cerrar sesión', timer: 5 * 60000, timerProgressBar: true, allowOutsideClick: false, allowEscapeKey: false, confirmButtonColor: '#12685c' });
      warning = false; lastActivity = Date.now();
      if (!disposed && !answer.isConfirmed) onLogout();
    }, 10000);
    return () => { disposed = true; clearInterval(timer); events.forEach(name => window.removeEventListener(name, activity)); if (warning) Swal.close(); };
  }, [logged, onLogout]);
}
