import { useCallback, useEffect, useState } from 'react';
import Loading from '../Loading';
import ErrorMessage from '../ErrorMessage';
import EmptyState from '../EmptyState';
import Pagination from '../Pagination';
import { adminService } from '../../services/adminService';

const CATEGORIES = [
  'pharmacy',
  'diagnostics',
  'checkup',
  'insurance',
  'consultation',
  'clinic',
  'wellness',
  'emergency',
  'other',
];

const EMPTY_FORM = {
  name: '',
  description: '',
  category: 'pharmacy',
  price: '',
  lat: '',
  lng: '',
  phone: '',
  email: '',
  website: '',
  sponsor: '',
  isSponsored: false,
  isActive: true,
};

const SponsoredServicesSection = () => {
  const [services, setServices] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [isActive, setIsActive] = useState('');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 10 };
      if (category) params.category = category;
      if (isActive) params.isActive = isActive;
      if (q) params.q = q;
      const { data } = await adminService.getSponsoredServices(params);
      setServices(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load sponsored services.');
    } finally {
      setLoading(false);
    }
  }, [page, category, isActive, q]);

  useEffect(() => {
    load();
  }, [load]);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };

  const buildPayload = () => ({
    name: form.name.trim(),
    description: form.description.trim(),
    category: form.category,
    price: Number(form.price) || 0,
    location: {
      type: 'Point',
      coordinates: [Number(form.lng), Number(form.lat)],
    },
    contact: {
      phone: form.phone.trim(),
      email: form.email.trim(),
      website: form.website.trim(),
    },
    sponsor: form.sponsor.trim(),
    isSponsored: form.isSponsored,
    isActive: form.isActive,
  });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      if (editing) {
        await adminService.updateSponsoredService(editing._id, buildPayload());
        setMessage('Service updated.');
      } else {
        await adminService.createSponsoredService(buildPayload());
        setMessage('Service created.');
      }
      setEditing(null);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save service.');
    }
  };

  const startEdit = (service) => {
    setEditing(service);
    setError('');
    setForm({
      name: service.name,
      description: service.description || '',
      category: service.category,
      price: service.price || '',
      lat: service.location?.coordinates?.[1] ?? '',
      lng: service.location?.coordinates?.[0] ?? '',
      phone: service.contact?.phone || '',
      email: service.contact?.email || '',
      website: service.contact?.website || '',
      sponsor: service.sponsor || '',
      isSponsored: service.isSponsored || false,
      isActive: service.isActive,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const toggleActive = async (service) => {
    setError('');
    setMessage('');
    try {
      await adminService.updateSponsoredService(service._id, { isActive: !service.isActive });
      setMessage(service.isActive ? 'Service hidden from public listings.' : 'Service published.');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update service.');
    }
  };

  const removeService = async (service) => {
    setError('');
    setMessage('');
    if (!window.confirm(`Delete "${service.name}" permanently?`)) return;
    try {
      await adminService.deleteSponsoredService(service._id);
      setMessage('Service deleted.');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete service.');
    }
  };

  return (
    <div>
      <h2>Sponsored Services</h2>
      <p className="muted section-intro">
        Clinics, pharmacies and other services shown to patients in emergency results.
      </p>
      {message && <div className="alert alert-success">{message}</div>}
      {error && <ErrorMessage message={error} />}

      <div className="card form-card">
        <h3>{editing ? 'Edit service' : 'Add service'}</h3>
        <form onSubmit={submit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="svc-name">Name</label>
              <input
                id="svc-name"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="svc-category">Category</label>
              <select id="svc-category" name="category" value={form.category} onChange={handleChange}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="svc-price">Price (Rs.)</label>
              <input
                id="svc-price"
                name="price"
                type="number"
                min={0}
                value={form.price}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="svc-desc">Description</label>
            <textarea
              id="svc-desc"
              name="description"
              rows={3}
              value={form.description}
              onChange={handleChange}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="svc-lat">Latitude</label>
              <input
                id="svc-lat"
                name="lat"
                type="number"
                step="any"
                min={-90}
                max={90}
                value={form.lat}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="svc-lng">Longitude</label>
              <input
                id="svc-lng"
                name="lng"
                type="number"
                step="any"
                min={-180}
                max={180}
                value={form.lng}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="svc-phone">Phone</label>
              <input id="svc-phone" name="phone" value={form.phone} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="svc-email">Email</label>
              <input
                id="svc-email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="svc-website">Website</label>
              <input
                id="svc-website"
                name="website"
                type="url"
                value={form.website}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="svc-sponsor">Sponsor name (required if sponsored)</label>
              <input id="svc-sponsor" name="sponsor" value={form.sponsor} onChange={handleChange} />
            </div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="isSponsored"
                checked={form.isSponsored}
                onChange={handleChange}
              />
              Sponsored placement
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="isActive"
                checked={form.isActive}
                onChange={handleChange}
              />
              Visible to patients
            </label>
          </div>
          <div className="card-actions">
            <button type="submit" className="btn btn-sm btn-primary">
              {editing ? 'Save Changes' : 'Create Service'}
            </button>
            {editing && (
              <button type="button" className="btn btn-sm btn-outline" onClick={cancelEdit}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

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
          placeholder="Search by name"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={isActive} onChange={(e) => setIsActive(e.target.value)}>
          <option value="">Active & hidden</option>
          <option value="true">Active only</option>
          <option value="false">Hidden only</option>
        </select>
        <button type="submit" className="btn btn-sm btn-primary">
          Search
        </button>
      </form>

      {loading ? (
        <Loading />
      ) : services.length === 0 ? (
        <EmptyState title="No services found" hint="Add one or adjust the filters." />
      ) : (
        <>
          <div className="card-list">
            {services.map((service) => (
              <div className="card" key={service._id}>
                <div className="appointment-card-head">
                  <div>
                    <h3>{service.name}</h3>
                    <p className="muted">
                      {service.category} · Rs. {service.price}
                      {service.sponsor ? ` · Sponsored by ${service.sponsor}` : ''}
                    </p>
                  </div>
                  <div className="service-tags">
                    {service.isSponsored && (
                      <span className="tag tag-sponsored">Sponsored</span>
                    )}
                    <span className={`badge ${service.isActive ? 'badge-confirmed' : 'badge-cancelled'}`}>
                      {service.isActive ? 'Active' : 'Hidden'}
                    </span>
                  </div>
                </div>
                {service.description && <p className="muted">{service.description}</p>}
                <p className="muted">
                  {service.contact?.phone || 'No phone'} · {service.contact?.email || 'No email'}
                  {service.contact?.website ? ` · ${service.contact.website}` : ''}
                </p>
                <div className="card-actions">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => startEdit(service)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => toggleActive(service)}
                  >
                    {service.isActive ? 'Hide' : 'Publish'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => removeService(service)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
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

export default SponsoredServicesSection;