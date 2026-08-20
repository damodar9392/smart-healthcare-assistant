const ErrorMessage = ({ message, onRetry }) => (
  <div className="alert alert-error">
    <p>{message}</p>
    {onRetry && (
      <button type="button" className="btn btn-sm btn-outline" onClick={onRetry}>
        Retry
      </button>
    )}
  </div>
);

export default ErrorMessage;