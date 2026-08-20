import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import api from '../services/api';

const DISTANCE_OPTIONS = [
  { label: 'Within 5 km', value: 5000 },
  { label: 'Within 10 km', value: 10000 },
  { label: 'Within 25 km', value: 25000 },
  { label: 'Within 50 km', value: 50000 },
];

const DoctorList = () => {
  const [searchParams] = useSearchParams();
  const urlSpecialty = searchParams.get('specialty');
  const [mode, setMode] = useState('location');
  const [position, setPosition] = useState(null);
  const [locationNotice, setLocationNotice] = useState('');
  const [specialization, setSpecialization] = useState(urlSpecialty || '');
  const [maxDistance, setMaxDistance] = useState(10000);
  const [city, setCity] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (urlSpecialty) {
      setMode('manual');
      setLocationNotice(
        `Showing verified ${urlSpecialty} doctors. You can refine the search below.`
      );
      fetchByCity('', urlSpecialty);
    }
  }, [urlSpecialty]);

  const fetchNearby = async (lat, lng, spec, distance) => {
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const { data } = await api.get('/doctors/nearby', {
        params: {
          latitude: lat,
          longitude: lng,
          specialization: spec.trim() || undefined,
          maxDistance: distance,
        },
      });
      setDoctors(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load nearby doctors.');
    } finally {
      setLoading(false);
    }
  };

  const fetchByCity = async (cityName, spec) => {
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const { data } = await api.get('/doctors', {
        params: {
          city: cityName.trim() || undefined,
          specialization: spec.trim() || undefined,
        },
      });
      setDoctors(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load doctors.');
    } finally {
      setLoading(false);
    }
  };

  const switchToManual = (notice) => {
    setMode('manual');
    setPosition(null);
    setLocationNotice(notice);
  };

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) {
      switchToManual('Geolocation is not supported by this browser. Search by city instead.');
      return;
    }
    setLoading(true);
    setError('');
    setLocationNotice('');
    setSearched(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setPosition({ latitude, longitude });
        setMode('location');
        fetchNearby(latitude, longitude, specialization, maxDistance);
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          switchToManual('Location permission was denied. You can search by city below instead.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          switchToManual('Your location could not be determined. Try again or search by city below.');
        } else if (err.code === err.TIMEOUT) {
          switchToManual('The location request timed out. Try again or search by city below.');
        } else {
          switchToManual('Could not get your location. Search by city below instead.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const reSearchNearby = (e) => {
    e.preventDefault();
    if (position) {
      fetchNearby(position.latitude, position.longitude, specialization, maxDistance);
    }
  };

  const searchByCity = (e) => {
    e.preventDefault();
    fetchByCity(city, specialization);
  };

  return (
    <div className="doctor-list-page">
      <h1>Find Doctors</h1>
      <p className="muted">
        Only verified doctors are shown. Allow location access to see doctors near you,
        or search manually by city.
      </p>

      <div className="doctor-list-toolbar">
        <button type="button" className="btn btn-primary" onClick={useMyLocation}>
          Use My Location
        </button>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => switchToManual('Searching by city instead of location.')}
        >
          Search by City
        </button>
      </div>

      {locationNotice && <div className="alert alert-success">{locationNotice}</div>}

      {mode === 'location' && position && (
        <div className="card form-card">
          <form onSubmit={reSearchNearby}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="specialization">Recommended specialty (optional)</label>
                <input
                  id="specialization"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="e.g. Cardiologist"
                />
              </div>
              <div className="form-group">
                <label htmlFor="maxDistance">Search radius</label>
                <select
                  id="maxDistance"
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(Number(e.target.value))}
                >
                  {DISTANCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary">
              Search Near Me
            </button>
          </form>
        </div>
      )}

      {mode === 'manual' && (
        <div className="card form-card">
          <form onSubmit={searchByCity}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="city">City or area</label>
                <input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Lahore"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="manual-specialization">Specialization (optional)</label>
                <input
                  id="manual-specialization"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="e.g. Cardiologist"
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary">
              Search Doctors
            </button>
          </form>
        </div>
      )}

      {loading && <Loading label="Searching for doctors..." />}

      {!loading && error && <ErrorMessage message={error} />}

      {!loading && !error && searched && doctors.length === 0 && (
        <div className="empty-state">
          No verified doctors found{position ? ' near your location' : ''}. Try widening
          the radius or search by city.
        </div>
      )}

      {!loading && doctors.length > 0 && (
        <div className="card-list">
          {doctors.map((doctor) => (
            <div className="card doctor-card" key={doctor._id}>
              <div className="doctor-card-head">
                {doctor.profilePhoto && (
                  <img
                    className="doctor-photo"
                    src={doctor.profilePhoto}
                    alt={doctor.name}
                  />
                )}
                <div>
                  <h3>
                    <Link to={`/doctors/${doctor._id}`}>{doctor.name}</Link>
                  </h3>
                  <p>
                    {doctor.specialization} · {doctor.experience} yrs experience
                  </p>
                  <p className="muted">{doctor.qualification.join(', ')}</p>
                  <p className="muted">
                    {doctor.hospital?.name}
                    {doctor.hospital?.city ? `, ${doctor.hospital.city}` : ''}
                  </p>
                </div>
              </div>
              <div className="doctor-card-meta">
                <span>Consultation fee: Rs. {doctor.consultationFee}</span>
                <span className={`badge ${doctor.rating >= 4 ? 'badge-approved' : 'badge-pending'}`}>
                  ★ {doctor.rating?.toFixed(1) || '0.0'}
                </span>
                {doctor.distanceKm !== undefined && (
                  <span className="badge badge-distance">
                    {doctor.distanceKm} km away
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DoctorList;