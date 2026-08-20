import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import ReviewForm from '../components/ReviewForm';
import SaveButton from '../components/SaveButton';
import { useAuth } from '../hooks/useAuth';
import { formatDate } from '../utils/format';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DoctorDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState('');

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [profileRes, availabilityRes] = await Promise.all([
        api.get(`/doctors/${id}`),
        api.get(`/doctors/${id}/availability`),
      ]);
      setProfile(profileRes.data.data);
      setAvailability(availabilityRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load doctor profile.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadReviews = useCallback(
    async (page = 1, append = false) => {
      setReviewsLoading(true);
      setReviewsError('');
      try {
        const { data } = await api.get(`/reviews/doctor/${id}`, {
          params: { page, limit: 10 },
        });
        setReviews(append ? (prev) => [...prev, ...data.data] : data.data);
        setPagination(data.pagination);
      } catch (err) {
        setReviewsError(err.response?.data?.message || 'Failed to load reviews.');
      } finally {
        setReviewsLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    loadReviews(1, false);
  }, [loadReviews]);

  const handleReviewSubmitted = () => {
    loadReviews(1, false);
    loadProfile();
  };

  const loadMore = () => {
    if (pagination && pagination.page < pagination.pages) {
      loadReviews(pagination.page + 1, true);
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  const availabilityByDay = availability.reduce((groups, slot) => {
    const day = slot.dayOfWeek;
    if (!groups[day]) groups[day] = [];
    groups[day].push(slot);
    return groups;
  }, {});

  return (
    <div className="doctor-detail-page">
      <Link to="/doctors" className="back-link">
        ← Back to doctors
      </Link>

      <div className="card doctor-header">
        <div className="doctor-card-head">
          {profile.profilePhoto && (
            <img className="doctor-photo" src={profile.profilePhoto} alt={profile.user?.name} />
          )}
          <div>
            <h1>{profile.user?.name}</h1>
            <p>
              {profile.specialization} · {profile.experience} yrs experience
            </p>
            <span className={`badge badge-${profile.verificationStatus}`}>
              {profile.verificationStatus}
            </span>
          </div>
        </div>
        <div className="doctor-card-meta">
          <span>Consultation fee: Rs. {profile.consultationFee}</span>
          <span className="badge badge-approved">
            ★ {profile.rating?.toFixed(1) || '0.0'}
          </span>
          <span className="muted">
            {pagination?.total || 0} review{pagination?.total === 1 ? '' : 's'}
          </span>
        </div>
        {user?.role === 'patient' && (
          <div className="doctor-header-actions">
            <SaveButton doctorId={id} />
            <Link to={`/doctors/${id}/book`} className="btn btn-primary">
              Book Appointment
            </Link>
          </div>
        )}
      </div>

      <div className="card">
        <h3>About</h3>
        <p className="muted">{profile.about || 'No description provided.'}</p>
        <h3>Qualifications</h3>
        <ul className="qualification-list">
          {profile.qualification.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
        <h3>Hospital / Clinic</h3>
        <p>
          {profile.hospital?.name}
          {profile.hospital?.address ? `, ${profile.hospital.address}` : ''}
          {profile.hospital?.city ? `, ${profile.hospital.city}` : ''}
        </p>
        <p className="muted">
          Location: {profile.location?.coordinates?.[1]}, {profile.location?.coordinates?.[0]}
        </p>
      </div>

      <div className="card">
        <h3>Available Appointment Times</h3>
        {availability.length === 0 ? (
          <p className="muted">No availability slots listed yet.</p>
        ) : (
          <div className="availability-groups">
            {Object.keys(availabilityByDay).map((day) => (
              <div className="availability-group" key={day}>
                <strong>{DAY_NAMES[Number(day)]}</strong>
                {availabilityByDay[day].map((slot) => (
                  <span className="badge badge-confirmed" key={slot._id}>
                    {slot.startTime} - {slot.endTime}
                  </span>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3>Reviews</h3>
        {reviewsLoading ? (
          <Loading label="Loading reviews..." />
        ) : reviewsError ? (
          <ErrorMessage message={reviewsError} />
        ) : reviews.length === 0 ? (
          <p className="muted">No reviews yet. Be the first to review after your visit.</p>
        ) : (
          <div className="review-list">
            {reviews.map((review) => (
              <div className="review-item" key={review._id}>
                <div className="review-head">
                  <strong>{review.patient?.name || 'Patient'}</strong>
                  <span className="badge badge-approved">
                    {'★'.repeat(review.rating)}
                    <span className="muted">{'☆'.repeat(5 - review.rating)}</span>
                  </span>
                  <span className="muted">{formatDate(review.createdAt)}</span>
                </div>
                {review.comment && <p>{review.comment}</p>}
              </div>
            ))}
            {pagination && pagination.page < pagination.pages && (
              <button type="button" className="btn btn-outline" onClick={loadMore}>
                Load more reviews
              </button>
            )}
          </div>
        )}
      </div>

      <ReviewForm doctorId={profile.user?._id} onSubmitted={handleReviewSubmitted} />
    </div>
  );
};

export default DoctorDetail;