import api from './api';

export const servicesService = {
  list: (params) => api.get('/sponsored-services', { params }),
};