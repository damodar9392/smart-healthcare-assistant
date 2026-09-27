import axios from 'axios';
import { getToken, clearAuth } from '../utils/token';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isPublicAuth = url.includes('/auth/login') || url.includes('/auth/register');
      if (!isPublicAuth) {
        clearAuth();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (payload) => api.post('/auth/register', payload),
  login: (payload) => api.post('/auth/login', payload),
  me: () => api.get('/auth/me'),
};

export const assistantApi = {
  chat: (message, conversationId) => {
    const payload = { message };
    if (conversationId) payload.conversationId = conversationId;
    return api.post('/assistant/chat', payload);
  },
  getConversations: (page = 1, limit = 20) =>
    api.get('/assistant/conversations', { params: { page, limit } }),
  getConversation: (id) => api.get(`/assistant/conversations/${id}`),
  deleteConversation: (id) => api.delete(`/assistant/conversations/${id}`),
  purgeConversation: (id) => api.delete(`/assistant/conversations/${id}/purge`),
};

export default api;