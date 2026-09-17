import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('fixflow_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('fixflow_token');
          localStorage.removeItem('fixflow_user');
          window.location.href = '/login';
        }
      } else if (status === 403) {
        console.warn('FixFlow Access Denied (403): Current user does not have permission for this resource.');
      }
    }
    return Promise.reject(error);
  }
);

export default api;