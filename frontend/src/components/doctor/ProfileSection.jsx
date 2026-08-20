import { useCallback, useEffect, useState } from 'react';
import Loading from '../Loading';
import ErrorMessage from '../ErrorMessage';
import { doctorService } from '../../services/doctorService';
import { formatDate } from '../../utils/format';

const EMPTY_FORM = {
  profilePhoto: '',
  qualification: '',
  specialization: '',
  experience: '',
  hospitalName: '',
  hospitalAddress: '',
  hospitalCity: '',
  consultationFee: '',
  lat: '',
  lng: '',
  about: '',
  licenseNumber: '',
  issuingAuthority: '',
};

const ProfileSection = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await doctorService.getMyProfile();
      setProfile(data.data);
      setForm({
        profilePhoto: data.data.profilePhoto || '',
        qualification: (data.data.qualification || []).join('\n'),
        specialization: data.data.specialization || '',
        experience: data.data.experience || '',
        hospitalName: data.data.hospital?.name || '',
        hospitalAddress: data.data.hospital?.address || '',
        hospitalCity: data.data.hospital?.city || '',
        consultationFee: data.data.consultationFee || '',
        lat: data.data.location?.coordinates?.[1] ?? '',
        lng: data.data.location?.coordinates?.[0] ?? '',
        about: data.data.about || '',
        licenseNumber: data.data.verificationDetails?.licenseNumber || '',
        issuingAuthority: data.data.verificationDetails?.issuingAuthority || '',
      });
    } catch (err) {
      if (err.response?.status === 404) {
        setProfile(null);
      } else {
        setError(err.response?.data?.message || 'Failed to load profile.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const splitLines = (text) =>
    text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

  const buildPayload = () => ({
    profilePhoto: form.profilePhoto.trim(),
    qualification: splitLines(form.qualification),
    specialization: form.specialization.trim(),
    experience: Number(form.experience),
    hospital: {
      name: form.hospitalName.trim(),
      address: form.hospitalAddress.trim(),
      city: form.hospitalCity.trim(),
    },
    consultationFee: Number(form.consultationFee),
    location: {
      type: 'Point',
      coordinates: [Number(form.lng), Number(form.lat)],
    },
    about: form.about.trim(),
  });

  const saveProfile = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      if (profile) {
        await doctorService.updateProfile(buildPayload());
        setMessage('Profile saved.');
      } else {
        await doctorService.createProfile(buildPayload());
        setMessage('Profile created. Submit verification details to start review.');
      }
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save profile.');
    }
  };

  const submitVerification = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await doctorService.submitVerification({
        licenseNumber: form.licenseNumber.trim(),
        issuingAuthority: form.issuingAuthority.trim(),
      });
      setMessage('Verification details submitted for admin review.');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit verification details.');
    }
  };

  return (
    <div>
      <h2>My Profile</h2>
      {message && <div className="alert alert-success">{message}</div>}
      {error && <ErrorMessage message={error} />}
      {loading ? (
        <Loading />
      ) : (
        <>
          <div className="card form-card">
            <form onSubmit={saveProfile}>
              <div className="form-group">
                <label htmlFor="profilePhoto">Profile photo URL</label>
                <input
                  id="profilePhoto"
                  name="profilePhoto"
                  type="url"
                  value={form.profilePhoto}
                  onChange={handleChange}
                  placeholder="https://example.com/photo.jpg"
                />
              </div>
              <div className="form-group">
                <label htmlFor="qualification">Qualifications (one per line)</label>
                <textarea
                  id="qualification"
                  name="qualification"
                  rows={3}
                  value={form.qualification}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="specialization">Specialization</label>
                  <input
                    id="specialization"
                    name="specialization"
                    value={form.specialization}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="experience">Years of experience</label>
                  <input
                    id="experience"
                    name="experience"
                    type="number"
                    min={0}
                    max={70}
                    value={form.experience}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="consultationFee">Consultation fee (Rs.)</label>
                  <input
                    id="consultationFee"
                    name="consultationFee"
                    type="number"
                    min={0}
                    value={form.consultationFee}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="hospitalName">Hospital or clinic name</label>
                <input
                  id="hospitalName"
                  name="hospitalName"
                  value={form.hospitalName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="hospitalAddress">Address</label>
                  <input
                    id="hospitalAddress"
                    name="hospitalAddress"
                    value={form.hospitalAddress}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="hospitalCity">City</label>
                  <input
                    id="hospitalCity"
                    name="hospitalCity"
                    value={form.hospitalCity}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="lat">Latitude</label>
                  <input
                    id="lat"
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
                  <label htmlFor="lng">Longitude</label>
                  <input
                    id="lng"
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
              <div className="form-group">
                <label htmlFor="about">About</label>
                <textarea
                  id="about"
                  name="about"
                  rows={4}
                  maxLength={1000}
                  value={form.about}
                  onChange={handleChange}
                  placeholder="Short professional summary (max 1000 characters)"
                />
              </div>
              <button type="submit" className="btn btn-primary">
                {profile ? 'Save Profile' : 'Create Profile'}
              </button>
            </form>
          </div>

          <div className="card form-card">
            <h3>Verification</h3>
            {profile && (
              <p className="muted">
                Status:{' '}
                <span className={`badge badge-${profile.verificationStatus}`}>
                  {profile.verificationStatus}
                </span>
                {profile.verificationStatus === 'rejected' && (
                  <span className="muted">
                    {' '}
                    — update your details and resubmit for review.
                  </span>
                )}
              </p>
            )}
            <form onSubmit={submitVerification}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="licenseNumber">Medical license number</label>
                  <input
                    id="licenseNumber"
                    name="licenseNumber"
                    value={form.licenseNumber}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="issuingAuthority">Issuing authority</label>
                  <input
                    id="issuingAuthority"
                    name="issuingAuthority"
                    value={form.issuingAuthority}
                    onChange={handleChange}
                    required
                    placeholder="e.g. Medical Council"
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary">
                Submit Verification Details
              </button>
            </form>
            {profile?.verificationHistory?.length > 0 && (
              <div className="history-list">
                <h4>Verification history</h4>
                {profile.verificationHistory.map((entry, index) => (
                  <div className="history-item" key={index}>
                    <span className={`badge badge-${entry.status}`}>{entry.status}</span>
                    <span className="muted">
                      {' '}
                      {formatDate(entry.changedAt)}
                      {entry.notes ? ` — ${entry.notes}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ProfileSection;