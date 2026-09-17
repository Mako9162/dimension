import Swal from 'sweetalert2';

// Toast flotante compacto y discreto (desaparece rápido en 2 segundos)
export const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2000,
  timerProgressBar: false,
  customClass: {
    popup: 'swal2-compact-toast',
    title: 'swal2-compact-title'
  },
  didOpen: (toastEl) => {
    toastEl.addEventListener('mouseenter', Swal.stopTimer);
    toastEl.addEventListener('mouseleave', Swal.resumeTimer);
  }
});

export function notifySuccess(message) {
  toast.fire({
    icon: 'success',
    title: message,
  });
}

export function notifyError(message) {
  toast.fire({
    icon: 'error',
    title: message,
  });
}

export function notifyInfo(message) {
  toast.fire({
    icon: 'info',
    title: message,
  });
}

// Diálogo de confirmación con SweetAlert2
export async function confirmDelete(title, text) {
  const result = await Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#e11d48',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
    customClass: {
      popup: 'swal2-rounded-modal'
    }
  });
  return result.isConfirmed;
}
