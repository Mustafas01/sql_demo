import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API functions
export const login = async (username, password) => {
  try {
    const response = await api.post('/login', { username, password });
    return response.data;
  } catch (error) {
    return { success: false, error: error.response?.data?.error || 'Login failed' };
  }
};

export const register = async (username, password, email) => {
  try {
    const response = await api.post('/register', { username, password, email });
    return response.data;
  } catch (error) {
    return { success: false, error: error.response?.data?.error || 'Registration failed' };
  }
};

export const getProductById = async (productId) => {
  try {
    const response = await api.get(`/product/${productId}`);
    return response.data;
  } catch (error) {
    return { success: false, error: error.response?.data?.error || 'Failed to load product' };
  }
};

export const searchProducts = async (query) => {
  try {
    const response = await api.post('/search', { query });
    return response.data;
  } catch (error) {
    return { success: false, error: error.response?.data?.error || 'Search failed' };
  }
};

export const getProducts = async (category = '') => {
  try {
    const url = category ? `/products?category=${encodeURIComponent(category)}` : '/products';
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('API Error loading products:', error);
    return { 
      success: false, 
      error: error.response?.data?.error || 'Failed to load products. Please check if the backend server is running.' 
    };
  }
};

export const logout = async () => {
  try {
    await api.post('/logout');
    return { success: true };
  } catch (error) {
    return { success: false };
  }
};

// ADMIN API FUNCTIONS
export const createProduct = async (productData) => {
  try {
    const response = await api.post('/admin/products', productData);
    return response.data;
  } catch (error) {
    return { success: false, error: error.response?.data?.error || 'Failed to create product' };
  }
};

export const updateProduct = async (productId, productData) => {
  try {
    const response = await api.put(`/admin/products/${productId}`, productData);
    return response.data;
  } catch (error) {
    return { success: false, error: error.response?.data?.error || 'Failed to update product' };
  }
};

export const deleteProduct = async (productId) => {
  try {
    const response = await api.delete(`/admin/products/${productId}`);
    return response.data;
  } catch (error) {
    return { success: false, error: error.response?.data?.error || 'Failed to delete product' };
  }
};

export const getUsers = async () => {
  try {
    const response = await api.get('/admin/users');
    return response.data;
  } catch (error) {
    return { success: false, error: error.response?.data?.error || 'Failed to load users' };
  }
};

export const createUser = async (userData) => {
  try {
    const response = await api.post('/admin/users', userData);
    return response.data;
  } catch (error) {
    return { success: false, error: error.response?.data?.error || 'Failed to create user' };
  }
};

export const updateUser = async (userId, userData) => {
  try {
    const response = await api.put(`/admin/users/${userId}`, userData);
    return response.data;
  } catch (error) {
    return { success: false, error: error.response?.data?.error || 'Failed to update user' };
  }
};

export const deleteUser = async (userId) => {
  try {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  } catch (error) {
    return { success: false, error: error.response?.data?.error || 'Failed to delete user' };
  }
};

export default api;
