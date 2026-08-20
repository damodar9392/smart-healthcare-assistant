const EmptyState = ({ title, hint, action }) => (
  <div className="empty-state">
    {title && <strong>{title}</strong>}
    {hint && <p className="muted">{hint}</p>}
    {action}
  </div>
);

export default EmptyState;