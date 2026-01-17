import axios from 'axios';

/* ================================
    – WAF CONFIG
================================ */
const API_BASE_URL = 'http://localhost:5000';

const SQLI_PATTERNS = [
  // 1) Boolean-based injections and classic tautologies
  /\bOR\b\s+1=1/i,
  /\bAND\b\s+1=1/i,
  /('|\%27)\s*(OR|AND)\s+['"`0-9]+\s*=\s*['"`0-9]+/i, // ' OR '1'='1, ' AND 2=2, etc.
  /'\s*OR\s*'1'='1/i,                                    // ' OR '1'='1 inside longer strings

  // 2) UNION- and sub-select based data extraction
  /\bUNION\s+(ALL\s+)?SELECT\b/i,
  /\bSELECT\s+.*\bFROM\b/i,
  /\bEXTRACTVALUE\s*\(/i,
  /\bUPDATEXML\s*\(/i,

  // 3) DDL / DML statements and stacked queries
  /\bINSERT\s+INTO\b/i,
  /\bUPDATE\s+\w+\s+SET\b/i,
  /\bDELETE\s+FROM\b/i,
  /\bDROP\s+(TABLE|DATABASE|SCHEMA)\b/i,
  /\bALTER\s+TABLE\b/i,
  /\bCREATE\s+(TABLE|DATABASE|FUNCTION|PROCEDURE)\b/i,
  /;\s*(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC(UTE)?)\b/i, // stacked commands

  // 4) Time-based / resource exhaustion techniques
  /\bSLEEP\s*\(/i,
  /\bBENCHMARK\s*\(/i,
  /\bWAITFOR\s+DELAY\b/i,
  /\bPG_SLEEP\s*\(/i,

  // 5) System tables / metadata access
  /information_schema/i,
  /\bPG_CATALOG\b/i,
  /\bSYS\./i,

  // 6) File / OS interaction
  /(load_file|outfile|into\s+dumpfile)/i,

  // 7) Comment-based truncation commonly used in SQLi
  /(--|#|\/\*)\s*[^\n]*$/i,
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

const isAuthRoute =
  config.url.includes('/api/login') ||
  config.url.includes('/api/register');

if (token && !isAuthRoute) {
  config.headers.Authorization = `Bearer ${token}`;
}

    config.headers['X-Request-Fingerprint'] = btoa(
      navigator.userAgent + Date.now()
    );

    const sqliDetected = detectSQLInjection(config.data);
    if (sqliDetected) {
      console.warn('[WAF] SQL Injection pattern detected (client-side)');
      config.headers['X-WAF-Alert'] = 'SQLI_DETECTED';
      
      // Create a rejected promise with WAF error info
      const error = new Error('Malicious code detected (blocked by client-side WAF)');
      error.wafBlocked = true;
      error.blockedBy = 'WAF pattern';
      error.field = 'request data';
      return Promise.reject(error);
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
        if (errorData?.error === 'Malicious code detected') {
          error.wafBlocked = true;
          error.blockedBy = errorData.blocked_by || 'WAF';
          error.field = errorData.field || 'unknown field';
          error.message = `Malicious code detected in ${error.field} (blocked by ${error.blockedBy})`;
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
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.user.role);
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
    
    // Handle WAF blocked errors
    if (err.wafBlocked) {
      return { 
        success: false, 
        error: err.message,
        wafBlocked: true,
        blockedBy: err.blockedBy
      };
    }
    
    return { 
      success: false, 
      error: err.response?.data?.error || err.message || 'Login failed. Check connection.' 
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
    // Handle WAF blocked errors
    if (err.wafBlocked) {
      return {
        success: false,
        error: err.message,
        wafBlocked: true,
        blockedBy: err.blockedBy
      };
    }
    
    return {
      success: false,
      error: err.response?.data?.error || err.message || 'Registration failed'
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
    // Handle WAF blocked errors
    if (err.wafBlocked) {
      return {
        success: false,
        error: err.message,
        wafBlocked: true,
        blockedBy: err.blockedBy
      };
    }
    
    return {
      success: false,
      error: err.response?.data?.error || err.message || 'Search failed'
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
    if (err.wafBlocked) {
      throw err;
    }
    return { success: false, error: 'Failed to create product' };
  }
};

/* ADMIN UPDATE FUNCTIONS */
export const adminUpdateProduct = async (id, data) => {
  try {
    const res = await api.put(`/api/admin/products/${id}`, data);
    return res.data;
  } catch (err) {
    if (err.wafBlocked) {
      throw err;
    }
    return { success: false, error: 'Failed to update product' };
  }
};

export const adminCreateUser = async (data) => {
  try {
    const res = await api.post('/api/admin/users', data);
    return res.data;
  } catch (err) {
    if (err.wafBlocked) {
      throw err;
    }
    return { success: false, error: 'Failed to create user' };
  }
};

export const adminUpdateUser = async (id, data) => {
  try {
    const res = await api.put(`/api/admin/users/${id}`, data);
    return res.data;
  } catch (err) {
    if (err.wafBlocked) {
      throw err;
    }
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
    const res = await api.delete(`/api/admin/products/${id}`, {
  data: null
});
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

export const scanInput = async (input) => {
  try {
    const res = await api.post('/api/scan', { input: input.trim() });
    return res.data;
  } catch (err) {
    // Handle WAF blocked errors
    if (err.wafBlocked) {
      return {
        is_malicious: true,
        input: input,
        timestamp: new Date().toISOString(),
        blocked_by: err.blockedBy,
        message: err.message
      };
    }
    return { is_malicious: false, input: input, timestamp: new Date().toISOString() };
  }
};

export const getBlacklist = async () => {
  try {
    const res = await api.get('/api/blacklist');
    return res.data;
  } catch (err) {
    return { blacklist: [] };
  }
};