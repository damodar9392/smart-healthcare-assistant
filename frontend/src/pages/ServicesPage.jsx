import { useCallback, useEffect, useState } from 'react';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import ServiceCard from '../components/ServiceCard';
import { servicesService } from '../services/servicesService';
import { CATEGORY_LABELS } from '../utils/categories';

const DISTANCES = [
  { value: 5000, label: 'Within 5 km' },
  { value: 10000, label: 'Within 10 km' },
  { value: 25000, label: 'Within 25 km' },
  { value: 50000, label: 'Within 50 km' },
];

const ServicesPage = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');
  const [maxDistance, setMaxDistance] = useState(25000);
  const [manualMode, setManualMode] = useState(false);
  const [manualCoords, setManualCoords] = useState({ lat: '', lng: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (category) params.category = category;
      if (location && Number.isFinite(Number(location.lat)) && Number.isFinite(Number(location.lng))) {
        params.lat = location.lat;
        params.lng = location.lng;
        params.maxDistance = maxDistance;
      }
      const { data } = await servicesService.list(params);
      setServices(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load services.');
    } finally {
      setLoading(false);
    }
  }, [category, location, maxDistance]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const matches = services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q)) ||
        (CATEGORY_LABELS[s.category] || '').toLowerCase().includes(q)
    );
    setSuggestions(matches.slice(0, 6));
  }, [searchQuery, services]);

  const filteredServices = searchQuery.trim()
    ? services.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (CATEGORY_LABELS[s.category] || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : services;

  const locateMe = () => {
    setLocError('');
    setManualMode(false);
    if (!navigator.geolocation) {
      setLocError('Location is not supported by this browser. Enter coordinates manually below.');
      setManualMode(true);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude.toFixed(5),
          lng: position.coords.longitude.toFixed(5),
        });
        setLocating(false);
      },
      () => {
        setLocating(false);
        setLocError('Location permission denied. Enter coordinates manually below.');
        setManualMode(true);
      }
    );
  };

  const handleApply = (e) => {
    e.preventDefault();
    if (manualMode) {
      if (!Number.isFinite(Number(manualCoords.lat)) || !Number.isFinite(Number(manualCoords.lng))) {
        setLocError('Enter valid latitude and longitude before applying.');
        return;
      }
      setLocError('');
      setLocation({ lat: manualCoords.lat, lng: manualCoords.lng });
    }
    load();
  };

  return (
    <div className="page-container">
      <h1>Optional Healthcare Services</h1>
      <p className="muted">
        Recommended local services — pharmacies, labs, checkup packages, insurance offers
        and online consultations.
      </p>
      <p className="services-note">
        These listings are <strong>optional</strong> and{' '}
        <strong>never influence</strong> the AI specialist recommendation, urgency
        classification or doctor-verified guidance you receive elsewhere on this platform.
        Listings marked <span className="service-tag service-tag-sponsored">Sponsored</span> are paid
        placements.
      </p>

      <div className="card services-search">
        <div className="search-autocomplete">
          <input
            type="text"
            className="search-input"
            placeholder="Search services by name, description, or category..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="suggestions-dropdown">
              {suggestions.map((s) => (
                <li
                  key={s._id}
                  className="suggestion-item"
                  onMouseDown={() => {
                    setSearchQuery(s.name);
                    setShowSuggestions(false);
                  }}
                >
                  <span className="suggestion-name">{s.name}</span>
                  <span className="suggestion-category">
                    {CATEGORY_LABELS[s.category] || s.category}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <form
          className="filter-bar"
          onSubmit={handleApply}
        >
          <div className="form-group">
            <label htmlFor="svc-category-filter">Category</label>
            <select
              id="svc-category-filter"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Distance</label>
            <select
              value={maxDistance}
              onChange={(e) => setMaxDistance(Number(e.target.value))}
              disabled={!location}
            >
              {DISTANCES.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="btn btn-outline" onClick={locateMe} disabled={locating}>
            {locating ? 'Locating…' : location ? '📍 ' + location.lat + ', ' + location.lng + ' — change' : 'Use my location'}
          </button>
          <button type="submit" className="btn btn-primary">
            Apply filters
          </button>
        </form>
        {locError && <p className="alert alert-error">{locError}</p>}
        {manualMode && (
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="manual-lat">Latitude</label>
              <input
                id="manual-lat"
                type="number"
                step="any"
                min={-90}
                max={90}
                value={manualCoords.lat}
                placeholder="e.g. 24.86"
                onChange={(e) => setManualCoords((c) => ({ ...c, lat: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="manual-lng">Longitude</label>
              <input
                id="manual-lng"
                type="number"
                step="any"
                min={-180}
                max={180}
                value={manualCoords.lng}
                placeholder="e.g. 67.01"
                onChange={(e) => setManualCoords((c) => ({ ...c, lng: e.target.value }))}
              />
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorMessage message={error} />
      ) : filteredServices.length === 0 ? (
        <EmptyState
          title={searchQuery.trim() ? 'No matching services' : 'No services found'}
          hint={
            searchQuery.trim()
              ? `Nothing matches "${searchQuery}". Try a different term or category.`
              : location
                ? 'Try a wider distance or a different category.'
                : 'Enable location or pick a category to narrow results.'
          }
        />
      ) : (
        <div className="service-grid">
          {filteredServices.map((service) => (
            <ServiceCard key={service._id} service={service} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ServicesPage;