import { useCallback, useEffect, useState } from 'react';
import Loading from '../Loading';
import ErrorMessage from '../ErrorMessage';
import EmptyState from '../EmptyState';
import Pagination from '../Pagination';
import { adminService } from '../../services/adminService';
import { formatDate } from '../../utils/format';

const ReviewsSection = () => {
  const [reviews, setReviews] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);
  const [rating, setRating] = useState('');
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 10 };
      if (rating) params.rating = rating;
      if (q) params.q = q;
      const { data } = await adminService.getReviews(params);
      setReviews(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reviews.');
    } finally {
      setLoading(false);
    }
  }, [page, rating, q]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (review) => {
    setError('');
    setMessage('');
    if (!window.confirm('Delete this review permanently?')) return;
    try {
      await adminService.deleteReview(review._id);
      setMessage('Review deleted.');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete review.');
    }
  };

  return (
    <div>
      <h2>Manage Reviews</h2>
      <p className="muted section-intro">
        Remove inappropriate or invalid reviews. Ratings are recomputed automatically.
      </p>
      {message && <div className="alert alert-success">{message}</div>}
      {error && <ErrorMessage message={error} />}
      <form
        className="filter-bar"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          load();
        }}
      >
        <input
          type="search"
          placeholder="Search comments"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={rating} onChange={(e) => setRating(e.target.value)}>
          <option value="">All ratings</option>
          {[1, 2, 3, 4, 5].map((r) => (
            <option key={r} value={r}>
              {r} star{r === 1 ? '' : 's'}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-sm btn-primary">
          Search
        </button>
      </form>
      {loading ? (
        <Loading />
      ) : reviews.length === 0 ? (
        <EmptyState title="No reviews found" hint="Adjust the filters to see more." />
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Doctor</th>
                  <th>Patient</th>
                  <th>Rating</th>
                  <th>Comment</th>
                  <th>Appointment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <tr key={review._id}>
                    <td>{review.doctor?.name || '—'}</td>
                    <td>{review.patient?.name || '—'}</td>
                    <td>
                      <span className="badge badge-approved">
                        ★ {review.rating}
                      </span>
                    </td>
                    <td>{review.comment || '—'}</td>
                    <td>
                      {review.appointment
                        ? `${formatDate(review.appointment.date)} ${review.appointment.startTime}`
                        : '—'}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => remove(review)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={pagination?.page}
            pages={pagination?.pages}
            onPage={(p) => setPage(p)}
          />
        </>
      )}
    </div>
  );
};

export default ReviewsSection;