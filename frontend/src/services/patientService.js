import api from './api';

export const patientService = {
  getAppointments: () => api.get('/appointments/me'),
  getVideoRoom: (appointmentId) => api.get(`/appointments/${appointmentId}/video`),
  cancelAppointment: (id) => api.put(`/appointments/${id}/cancel`),
  rescheduleAppointment: (id, payload) => api.put(`/appointments/${id}/reschedule`, payload),
  getSlots: (doctorId, date) => api.get(`/doctors/${doctorId}/slots`, { params: { date } }),
  getSearches: () => api.get('/symptoms/searches'),
  getSavedDoctors: () => api.get('/doctors/saved'),
  saveDoctor: (doctorId) => api.post(`/doctors/${doctorId}/save`),
  removeSavedDoctor: (doctorId) => api.delete(`/doctors/${doctorId}/save`),
  getNotifications: () => api.get('/notifications/me'),
  markNotificationRead: (id) => api.put(`/notifications/me/read/${id}`),
  markAllNotificationsRead: () => api.put('/notifications/me/read-all'),
  deleteNotification: (id) => api.delete(`/notifications/me/${id}`),
  getEnquiries: () => api.get('/enquiries'),
  createEnquiry: (payload) => api.post('/enquiries', payload),

  getProfile: () => api.get('/patients/profile'),
  updateProfile: (payload) => api.put('/patients/profile', payload),
  getTimeline: () => api.get('/patients/timeline'),
  getVitals: () => api.get('/patients/vitals'),
  addVital: (payload) => api.post('/patients/vitals', payload),
  deleteVital: (id) => api.delete(`/patients/vitals/${id}`),

  getPrescriptions: () => api.get('/prescriptions/mine'),
  getPrescription: (id) => api.get(`/prescriptions/${id}`),

  getInvoices: () => api.get('/payments/me'),
  getInvoice: (id) => api.get(`/payments/me/${id}`),
  payInvoice: (id, method = 'mock') => api.post(`/payments/me/${id}/pay`, { method }),

  checkInteractions: (medications) => api.post('/interactions/check', { medications }),
  getInteractionsCatalog: () => api.get('/interactions/catalog'),

  getVapidKey: () => api.get('/notifications/push/vapid-key'),
  subscribePush: (subscription) => api.post('/notifications/push/subscribe', { subscription }),
  unsubscribePush: (endpoint) => api.delete('/notifications/push/subscribe', { data: { endpoint } }),
};