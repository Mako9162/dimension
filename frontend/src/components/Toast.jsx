import { useEffect } from 'react';

export default function Toast({ toasts, removeToast }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container print-hidden" aria-live="polite">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove();
    }, toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast, onRemove]);

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  };

  return (
    <div className={`toast-item ${toast.type || 'info'}`}>
      <span className="toast-icon">{icons[toast.type || 'info']}</span>
      <span className="toast-message">{toast.message}</span>
      <button className="toast-close" onClick={onRemove} aria-label="Cerrar notificación">×</button>
    </div>
  );
}
