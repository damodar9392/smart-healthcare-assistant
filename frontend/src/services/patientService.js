import api from './api';

export const patientService = {
  getAppointments: () => api.get('/appointments/me'),
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
};