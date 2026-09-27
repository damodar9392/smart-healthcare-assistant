import api from './api';

export const adminService = {
  getStats: () => api.get('/admin/stats'),
  getAnalytics: (days = 30) => api.get('/admin/stats/analytics', { params: { days } }),
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUserRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getPendingDoctors: (status) =>
    api.get('/admin/doctors/verification', { params: { status } }),
  verifyDoctor: (id, payload) => api.put(`/admin/doctors/verification/${id}`, payload),
  getPendingGuidance: () => api.get('/admin/remedies/pending'),
  decideGuidance: (id, status, notes) => {
    const action = status === 'approved' ? 'approve' : status === 'rejected' ? 'reject' : status;
    return api.put(`/admin/remedies/${id}/${action}`, { notes });
  },
  getAppointments: (params) => api.get('/admin/appointments', { params }),
  getReviews: (params) => api.get('/admin/reviews', { params }),
  deleteReview: (id) => api.delete(`/admin/reviews/${id}`),
  getSponsoredServices: (params) => api.get('/admin/sponsored-services', { params }),
  createSponsoredService: (payload) => api.post('/admin/sponsored-services', payload),
  updateSponsoredService: (id, payload) => api.put(`/admin/sponsored-services/${id}`, payload),
  deleteSponsoredService: (id) => api.delete(`/admin/sponsored-services/${id}`),
};