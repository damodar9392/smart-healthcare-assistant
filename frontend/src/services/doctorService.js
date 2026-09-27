import api from './api';

export const doctorService = {
  getAppointments: () => api.get('/appointments/me'),
  getVideoRoom: (appointmentId) => api.get(`/appointments/${appointmentId}/video`),
  updateStatus: (id, status) => api.put(`/appointments/${id}/status`, { status }),
  cancelAppointment: (id) => api.put(`/appointments/${id}/cancel`),
  getAvailability: () => api.get('/doctors/me/availability'),
  addAvailability: (payload) => api.post('/doctors/me/availability', payload),
  updateAvailability: (slotId, payload) =>
    api.put(`/doctors/me/availability/${slotId}`, payload),
  deleteAvailability: (slotId) => api.delete(`/doctors/me/availability/${slotId}`),
  getSymptomCatalog: () => api.get('/symptoms'),
  getRemedies: (params) => api.get('/remedies', { params }),
  createRemedy: (payload) => api.post('/remedies', payload),
  deleteRemedy: (id) => api.delete(`/remedies/${id}`),
  getMyProfile: () => api.get('/doctors/me'),
  createProfile: (payload) => api.post('/doctors/me', payload),
  updateProfile: (payload) => api.put('/doctors/me', payload),
  submitVerification: (payload) => api.put('/doctors/me/verification', payload),

  createPrescription: (payload) => api.post('/prescriptions', payload),
  updatePrescription: (id, payload) => api.put(`/prescriptions/${id}`, payload),
  getPrescriptionForAppointment: (appointmentId) =>
    api.get(`/prescriptions/appointment/${appointmentId}`),
};