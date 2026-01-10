import axios from 'axios';

/* ================================
    – WAF CONFIG
================================ */
const API_BASE_URL = 'http://localhost:5000';

const SQLI_PATTERNS = [
  // Look for SQL injection with context, not just special characters
  /('|\%27)\s*(OR|AND)\s*('|\%27)?[0-9=]/i,  // ' OR '1'='1 or ' OR 1=1
  /('|\%27)\s*(;|--|\#)/i,  // '; DROP or '-- comment
  /UNION\s+(ALL\s+)?SELECT/i,  // UNION SELECT attacks
  /SELECT\s+.*\s+FROM\s+/i,  // SELECT ... FROM (must have FROM)
  /INSERT\s+INTO\s+/i,  // INSERT INTO attacks
  /DROP\s+(TABLE|DATABASE)/i,  // DROP TABLE/DATABASE
  /UPDATE\s+\w+\s+SET/i,  // UPDATE table SET
  /DELETE\s+FROM\s+/i,  // DELETE FROM attacks
  /EXEC(UTE)?\s*\(/i,  // EXECUTE commands
  /;\s*(DROP|DELETE|UPDATE|INSERT)/i  // Command chaining
];

const detectSQLInjection = (payload) => {
  if (!payload) return false;
  const data = JSON.stringify(payload);

  // Only flag if we see actual SQL injection patterns with context
  // Not just the presence of quotes or dashes
  return SQLI_PATTERNS.some((pattern) => pattern.test(data));
};

/* ================================
    – AXIOS INSTANCE
================================ */
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true  // IMPORTANT: Send cookies for CORS
});

/* ================================
    – REQUEST INTERCEPTOR
================================ */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    config.headers['X-Request-Fingerprint'] = btoa(
      navigator.userAgent + Date.now()
    );

    if (detectSQLInjection(config.data)) {
      console.warn('[WAF] SQL Injection pattern detected (client-side)');
      config.headers['X-WAF-Alert'] = 'SQLI_DETECTED';
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response) {
      const status = error.response.status;
      if (status === 401) {
        console.warn('[AUTH] JWT expired or invalid');
        localStorage.removeItem('token');
        localStorage.removeItem('role');
      }
      if (status === 403) {
        console.warn('[SECURITY] Access forbidden – possible WAF block');
      }
      if (status === 429) {
        console.warn('[WAF] Rate limit triggered');
      }
    }
    return Promise.reject(error);
  }
);

/* ================================
    API FUNCTIONS 
================================ */
export const login = async (username, password) => {
  try {
    console.log('Attempting login for:', username);
    const res = await api.post('/api/login', { 
      username: username.trim(), 
      password: password.trim() 
    });
    
    console.log('Login response:', res.data);
    
    if (res.data.success) {
      return {
        success: true,
        access_token: res.data.token,
        user: res.data.user
      };
    } else {
      return {
        success: false,
        error: res.data.error || 'Login failed'
      };
    }
    
  } catch (err) {
    console.error('Login error:', err.response?.data || err.message);
    return { 
      success: false, 
      error: err.response?.data?.error || 'Login failed. Check connection.' 
    };
  }
};

export const register = async (username, password, email) => {
  try {
    const res = await api.post('/api/register', { 
      username: username.trim(), 
      password: password.trim(), 
      email: email.trim() 
    });
    return {
      success: res.data.success || false,
      message: res.data.message || 'Registration successful'
    };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.error || 'Registration failed'
    };
  }
};

export const getProducts = async () => {
  try {
    const res = await api.get('/api/products');
    return res.data;
  } catch (err) {
    return { success: false, error: 'Failed to load products' };
  }
};

export const getProductById = async (productId) => {
  try {
    const res = await api.get(`/api/products/${productId}`);
    return res.data;
  } catch (err) {
    return { success: false, error: 'Failed to load product' };
  }
};

export const searchProducts = async (query) => {
  try {
    const res = await api.post('/api/search', { query: query.trim() });
    return res.data;
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.error || 'Search failed'
    };
  }
};

export const adminGetUsers = async () => {
  try {
    const res = await api.get('/api/admin/users');
    return res.data;
  } catch (err) {
    return { success: false, error: 'Failed to load users' };
  }
};

export const adminCreateProduct = async (data) => {
  try {
    const res = await api.post('/api/admin/products', data);
    return res.data;
  } catch (err) {
    return { success: false, error: 'Failed to create product' };
  }
};

/* ADMIN UPDATE FUNCTIONS */
export const adminUpdateProduct = async (id, data) => {
  try {
    const res = await api.put(`/api/admin/products/${id}`, data);
    return res.data;
  } catch (err) {
    return { success: false, error: 'Failed to update product' };
  }
};

export const adminCreateUser = async (data) => {
  try {
    const res = await api.post('/api/admin/users', data);
    return res.data;
  } catch (err) {
    return { success: false, error: 'Failed to create user' };
  }
};

export const adminUpdateUser = async (id, data) => {
  try {
    const res = await api.put(`/api/admin/users/${id}`, data);
    return res.data;
  } catch (err) {
    return { success: false, error: 'Failed to update user' };
  }
};
export const adminDeleteProduct = async (id) => {
  try {
    const res = await api.delete(`/api/admin/products/${id}`);
    return res.data;
  } catch (err) {
    return { success: false, error: 'Failed to delete product' };
  }
};

export const adminDeleteUser = async (id) => {
  try {
    const res = await api.delete(`/api/admin/users/${id}`);
    return res.data;
  } catch (err) {
    return { success: false, error: 'Failed to delete user' };
  }
};

// Other functions (optional - add as needed)
export const createProduct = async (data) => {
  try {
    const res = await api.post('/api/products', data);
    return res.data;
  } catch (err) {
    return { success: false, error: 'Failed to create product' };
  }
};

export const updateProduct = async (id, data) => {
  try {
    const res = await api.put(`/api/products/${id}`, data);
    return res.data;
  } catch (err) {
    return { success: false, error: 'Failed to update product' };
  }
};

export const deleteProduct = async (id) => {
  try {
    const res = await api.delete(`/api/products/${id}`);
    return res.data;
  } catch (err) {
    return { success: false, error: 'Failed to delete product' };
  }
};

export const testApi = async () => {
  try {
    const res = await api.get('/api/test-db');
    return res.data;
  } catch (err) {
    return { success: false, error: 'API connection failed' };
  }
};