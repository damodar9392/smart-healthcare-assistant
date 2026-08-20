import { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

const STAR_LABELS = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

const ReviewForm = ({ doctorId, onSubmitted }) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  if (!user) {
    return (
      <p className="muted">
        Log in as a patient to review this doctor after a completed appointment.
      </p>
    );
  }

  if (user.role !== 'patient') {
    return <p className="muted">Only patients can review doctors.</p>;
  }

  const submit = async (e) => {
    e.preventDefault();
    if (rating < 1) {
      setError('Please select a star rating.');
      return;
    }
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      await api.post('/reviews', { doctor: doctorId, rating, comment: comment.trim() });
      setMessage('Review submitted. Thank you!');
      setRating(0);
      setComment('');
      onSubmitted();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card form-card review-form">
      <h4>Write a review</h4>
      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={submit}>
        <div className="star-input" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              type="button"
              key={value}
              className={`star-btn${(hoverRating || rating) >= value ? ' active' : ''}`}
              onMouseEnter={() => setHoverRating(value)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(value)}
              aria-label={`${value} star${value > 1 ? 's' : ''}`}
            >
              ★
            </button>
          ))}
          <span className="star-label">
            {rating > 0 ? STAR_LABELS[rating - 1] : 'Select a rating'}
          </span>
        </div>
        <div className="form-group">
          <label htmlFor="review-comment">Comment (optional)</label>
          <textarea
            id="review-comment"
            rows={3}
            maxLength={2000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience (max 2000 characters)"
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Review'}
        </button>
      </form>
    </div>
  );
};

export default ReviewForm;