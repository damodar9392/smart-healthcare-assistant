const Loading = ({ label = 'Loading...' }) => (
  <div className="loading">
    <div className="spinner" />
    <p>{label}</p>
  </div>
);

export default Loading;