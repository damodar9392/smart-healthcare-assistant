import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import DoctorMatchCard from '../components/DoctorMatchCard';
import api from '../services/api';

const DISTANCE_OPTIONS = [
  { label: 'Within 5 km', value: 5000 },
  { label: 'Within 10 km', value: 10000 },
  { label: 'Within 25 km', value: 25000 },
  { label: 'Within 50 km', value: 50000 },
];

const matchError = (err) => err.response?.data?.message || 'Failed to load doctors.';

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
  const [scored, setScored] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (urlSpecialty) {
      setMode('manual');
      setLocationNotice(
        `Showing verified ${urlSpecialty} doctors, ranked by match score. You can refine the search below.`
      );
      fetchBySpecialty(urlSpecialty);
    } else {
      setSpecialization('');
      setLocationNotice('');
    }
  }, [urlSpecialty, fetchBySpecialty]);

  const runSearch = useCallback(async (buildParams, fallbackRequest) => {
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const { data } = await api.get('/doctors/match', { params: buildParams() });
      setDoctors(data.data);
      setScored(true);
    } catch (err) {
      if (err.response?.status === 404) {
        try {
          const { data } = await fallbackRequest();
          setDoctors(data.data);
          setScored(false);
        } catch (fallbackErr) {
          setError(matchError(fallbackErr));
        }
      } else {
        setError(matchError(err));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNearby = (lat, lng, spec, distance) =>
    runSearch(
      () => ({
        specialization: spec.trim() || undefined,
        lat,
        lng,
        maxDistance: distance,
      }),
      () =>
        api.get('/doctors/nearby', {
          params: {
            latitude: lat,
            longitude: lng,
            specialization: spec.trim() || undefined,
            maxDistance: distance,
          },
        })
    );

  const fetchByCity = (cityName, spec) =>
    runSearch(
      () => ({
        specialization: spec.trim() || undefined,
        city: cityName.trim() || undefined,
      }),
      () =>
        api.get('/doctors', {
          params: {
            city: cityName.trim() || undefined,
            specialization: spec.trim() || undefined,
          },
        })
    );

  const fetchBySpecialty = useCallback(
    (spec) =>
      runSearch(
        () => ({ specialization: spec.trim() || undefined }),
        () => api.get('/doctors', { params: { specialization: spec.trim() || undefined } })
      ),
    [runSearch]
  );

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
        <>
          {scored && (
            <p className="muted section-intro">
              Ranked by match score: specialty fit, distance, availability, experience and
              patient reviews.
            </p>
          )}
          <div className="card-list">
            {doctors.map((doctor) => (
              <DoctorMatchCard key={doctor._id} doctor={doctor} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default DoctorList;
