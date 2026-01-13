import axios from 'axios';

/* ================================
    – WAF CONFIG
================================ */
const API_BASE_URL = 'http://localhost:5000';

const SQLI_PATTERNS = [
  // Only match actual SQL injection patterns, not normal text/numbers
  /('|\%27)\s*(OR|AND)\s+\d+\s*=/i,  // ' OR 1= or ' AND 1=
  /'\s*OR\s*'1'='1/i,                  // classic demo: ' OR '1'='1 (also matches inside longer strings)
  /('|\%27)\s*(;|--)\s*/i,            // '; or '-- (semicolon or double dash followed by space)
  /\bUNION\s+(ALL\s+)?SELECT\b/i,     // UNION SELECT
  /\bSELECT\s+.*\s+FROM\s+/i,         // SELECT ... FROM
  /\bINSERT\s+INTO\b/i,                // INSERT INTO
  /\bDROP\s+(TABLE|DATABASE)\b/i,      // DROP TABLE/DATABASE
  /\bUPDATE\s+\w+\s+SET\b/i,         // UPDATE table SET
  /\bDELETE\s+FROM\b/i,               // DELETE FROM
  /\bEXEC(UTE)?\s*\(/i,               // EXECUTE
  /;\s*(DROP|DELETE|UPDATE|INSERT|CREATE)\b/i  // Command chaining
];

const detectSQLInjection = (payload) => {
  if (!payload) return false;
  const dataStr = typeof payload === 'string' ? payload : JSON.stringify(payload);

  return SQLI_PATTERNS.some((pattern) => pattern.test(dataStr));
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
        const errorData = error.response.data;
        if (errorData?.error === 'Blocked by WAF') {
          error.wafBlocked = true;
          error.message = 'Malicious input logged and block the attempt';
        }
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
    // Backend returns a plain array of products; wrap it in a consistent shape
    if (Array.isArray(res.data)) {
      return { success: true, products: res.data };
    }
    return { success: false, error: 'Unexpected products response format' };
  } catch (err) {
    return { success: false, error: 'Failed to load products' };
  }
};

export const getProductById = async (productId) => {
  try {
    const res = await api.get(`/api/products/${productId}`);
    // Backend returns a single product object
    if (res.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
      return { success: true, product: res.data };
    }
    return { success: false, error: 'Unexpected product response format' };
  } catch (err) {
    return { success: false, error: 'Failed to load product' };
  }
};

export const searchProducts = async (query) => {
  try {
    const res = await api.post('/api/search', { query: query.trim() });
    // Backend returns an array of matching products
    if (Array.isArray(res.data)) {
      return { success: true, results: res.data };
    }
    return { success: false, error: 'Unexpected search response format' };
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

export const createUser = async (data) => {
  try {
    const res = await api.post('/api/users', data);
    return res.data;
  } catch (err) {
    return { success: false, error: 'Failed to create user' };
  }
};

export const updateUser = async (id, data) => {
  try {
    const res = await api.put(`/api/users/${id}`, data);
    return res.data;
  } catch (err) {
    return { success: false, error: 'Failed to update user' };
  }
};

export const getUsers = async () => {
  try {
    const res = await api.get('/api/users');
    return res.data;
  } catch (err) {
    return { success: false, error: 'Failed to load users' };
  }
};

export const deleteUser = async (id) => {
  try {
    const res = await api.delete(`/api/users/${id}`);
    return res.data;
  } catch (err) {
    return { success: false, error: 'Failed to delete user' };
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