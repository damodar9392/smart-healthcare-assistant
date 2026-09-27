const NotificationToaster = ({ toasts = [], onDismiss }) => {
  if (!toasts.length) return null;

  return (
    <div className="toaster" aria-live="polite">
      {toasts.map((toast) => (
        <div className="toast-card" key={toast.id} role="status">
          <div className="toast-content">
            <strong>{toast.title}</strong>
            <p className="muted">{toast.message}</p>
          </div>
          <button
            type="button"
            className="toast-close"
            aria-label="Dismiss notification"
            onClick={() => onDismiss(toast.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationToaster;