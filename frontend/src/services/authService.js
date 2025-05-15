import axios from 'axios';
import { API_BASE_URL } from '../config';

// Add token refresh interceptor
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh token
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          // If no refresh token, redirect to login
          window.location.href = '/signin';
          return Promise.reject(error);
        }
        
        // Call token refresh endpoint
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { 
          refresh_token: refreshToken 
        });
        
        // Update tokens in storage
        if (response.data.access_token) {
          localStorage.setItem('token', response.data.access_token);
          
          // Update Authorization header
          axios.defaults.headers.common['Authorization'] = 
            `Bearer ${response.data.access_token}`;
            
          // Retry original request with new token
          originalRequest.headers['Authorization'] = 
            `Bearer ${response.data.access_token}`;
            
          return axios(originalRequest);
        }
      } catch (refreshError) {
        // If refresh fails, redirect to login
        console.error('Token refresh failed:', refreshError);
        window.location.href = '/signin';
        return Promise.reject(error);
      }
    }
    
    return Promise.reject(error);
  }
);

export const login = async (email, password) => {
  const response = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
  if (response.data.access_token) {
    localStorage.setItem('token', response.data.access_token);
    localStorage.setItem('refreshToken', response.data.refresh_token);
  }
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  window.location.href = '/signin';
};

export const getCurrentUser = () => {
  return localStorage.getItem('token');
};