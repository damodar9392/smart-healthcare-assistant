import { useState } from 'react';
import { Link } from 'react-router-dom';

const CRITERIA = [
  { key: 'specialization', label: 'Specialization' },
  { key: 'distance', label: 'Distance' },
  { key: 'availability', label: 'Availability' },
  { key: 'experience', label: 'Experience' },
  { key: 'rating', label: 'Rating' },
];

const CRITERION_COPY = {
  'exact-canonical-match': 'Correct specialization',
  'related-token-match': 'Closely related specialization',
  'substring-match': 'Closely related specialization',
  'different-specialty': 'Different specialization',
  'no-match': 'Different specialization',
  'within-full-credit': 'Very close by',
  'linear-decay': 'Within your search radius',
  'at-max-distance': 'At the edge of your search radius',
  'available-today': 'Available today',
  'available-within-48h': 'Available within 48 hours',
  'available-within-horizon': 'Available later this week',
  'all-slots-booked-in-horizon': 'Fully booked this week',
  'no-availability-declared': 'No availability published',
  saturated: 'Highly experienced',
  proportional: 'Experience counts toward the score',
  'unknown-experience': 'Experience not published',
  'shrunk-average': 'Consistently well reviewed',
  'no-reviews-prior': 'No reviews yet',
};

const SKIP_COPY = {
  'no-specialty-requested': 'No specialty was requested',
  'no-origin-supplied': 'Not scored, no location was used for this search',
  'no-distance-available': 'Not scored, distance unavailable',
};

const scoreTone = (score) => {
  if (score >= 75) return 'match-score-high';
  if (score >= 50) return 'match-score-mid';
  return 'match-score-low';
};

const describe = (entry) => {
  if (!entry) return 'Not scored';
  if (entry.skipped) return SKIP_COPY[entry.reason] || 'Not scored';
  return CRITERION_COPY[entry.reason] || 'Scored';
};

const DoctorMatchCard = ({ doctor, actions, linkProfile = true }) => {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const hasScore = typeof doctor.matchScore === 'number';
  const name = doctor.user?.name || doctor.name || 'Doctor';

  return (
    <div className="card doctor-card">
      <div className="doctor-card-head">
        {doctor.profilePhoto && (
          <img className="doctor-photo" src={doctor.profilePhoto} alt={name} />
        )}
        <div>
          <h3>
            {linkProfile ? <Link to={`/doctors/${doctor._id}`}>{name}</Link> : name}
          </h3>
          <p>
            {doctor.specialization}
            {doctor.experience ? ` · ${doctor.experience} yrs experience` : ''}
          </p>
          {doctor.qualification?.length > 0 && (
            <p className="muted">{doctor.qualification.join(', ')}</p>
          )}
          <p className="muted">
            {doctor.hospital?.name}
            {doctor.hospital?.city ? `, ${doctor.hospital.city}` : ''}
          </p>
        </div>
      </div>

      <div className="doctor-card-meta">
        {doctor.consultationFee !== undefined && (
          <span>Consultation fee: Rs. {doctor.consultationFee}</span>
        )}
        <span
          className={`badge ${doctor.rating >= 4 ? 'badge-approved' : 'badge-pending'}`}
        >
          ★ {doctor.rating?.toFixed(1) || '0.0'}
          {doctor.ratingCount !== undefined && doctor.ratingCount > 0
            ? ` (${doctor.ratingCount})`
            : ''}
        </span>
        {doctor.distanceKm !== undefined && (
          <span className="badge badge-distance">{doctor.distanceKm} km away</span>
        )}
        {hasScore && (
          <span className={`match-score ${scoreTone(doctor.matchScore)}`}>
            Match {doctor.matchScore}%
          </span>
        )}
      </div>

      {hasScore && (
        <div className="match-details">
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={() => setShowBreakdown((prev) => !prev)}
            aria-expanded={showBreakdown}
          >
            {showBreakdown ? 'Hide match details' : 'Why this match?'}
          </button>

          {showBreakdown && (
            <ul className="match-breakdown">
              {CRITERIA.map(({ key, label }) => {
                const entry = doctor.matchBreakdown?.[key];
                const skipped = entry?.skipped;
                return (
                  <li key={key} className={skipped ? 'match-row match-row-skipped' : 'match-row'}>
                    <span className="match-row-label">{label}</span>
                    <span className="match-row-value">{describe(entry)}</span>
                    <span className="match-row-score">
                      {skipped || !entry
                        ? '—'
                        : `${Math.round(entry.score * 100)}% (weight ${Math.round(
                            entry.weight * 100
                          )}%)`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="muted match-note">
            The score reflects specialty fit and practical booking factors only. Sponsored
            listings never affect it. It is not a clinical judgement about this doctor.
          </p>
        </div>
      )}

      {actions && <div className="card-actions">{actions}</div>}
    </div>
  );
};

export default DoctorMatchCard;
