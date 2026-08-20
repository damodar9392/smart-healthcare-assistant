const Pagination = ({ page, pages, onPage }) => {
  if (pages <= 1) return null;
  return (
    <div className="pagination">
      <button
        type="button"
        className="btn btn-sm btn-outline"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        ← Prev
      </button>
      <span className="pagination-info">
        Page {page} of {pages}
      </span>
      <button
        type="button"
        className="btn btn-sm btn-outline"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
      >
        Next →
      </button>
    </div>
  );
};

export default Pagination;