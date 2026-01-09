import axios from 'axios';

/* ================================
    – WAF CONFIG
================================ */

const API_BASE_URL = 'http://localhost:5000/api';

const SQLI_PATTERNS = [
  /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
  /(\bOR\b|\bAND\b).*(=|LIKE)/i,
  /UNION(\s)+SELECT/i,
  /SELECT.*FROM/i,
  /INSERT(\s)+INTO/i,
  /DROP(\s)+TABLE/i,
  /UPDATE(\s)+.*SET/i,
  /DELETE(\s)+FROM/i
];

const detectSQLInjection = (payload) => {
  if (!payload) return false;

  const data = JSON.stringify(payload);
  return SQLI_PATTERNS.some((pattern) => pattern.test(data));
};

/* ================================
    – AXIOS INSTANCE
================================ */

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

/* ================================
    – REQUEST INTERCEPTOR
================================ */

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    /* Attach JWT */
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    /* Request fingerprint */
    config.headers['X-Request-Fingerprint'] = btoa(
      navigator.userAgent + Date.now()
    );

    /* SQLi detection (frontend WAF layer) */
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
    EXISTING API FUNCTIONS 
================================ */

export const login = async (username, password) => {
  try {
    const res = await api.post('/login', { username, password });
    return res.data;
  } catch (err) {
    return { success: false, error: err.response?.data?.error || 'Login failed' };
  }
};

export const getProducts = async () => {
  try {
    const res = await api.get('/products');
    return res.data;
  } catch {
    return { success: false };
  }
};

export const createProduct = async (data) => {
  try {
    const res = await api.post('/products', data);
    return res.data;
  } catch {
    return { success: false };
  }
};

export const updateProduct = async (id, data) => {
  try {
    const res = await api.put(`/products/${id}`, data);
    return res.data;
  } catch {
    return { success: false };
  }
};

export const deleteProduct = async (id) => {
  try {
    const res = await api.delete(`/products/${id}`);
    return res.data;
  } catch {
    return { success: false };
  }
};

export const getUsers = async () => {
  try {
    const res = await api.get('/users');
    return res.data;
  } catch {
    return { success: false };
  }
};

export const createUser = async (data) => {
  try {
    const res = await api.post('/users', data);
    return res.data;
  } catch {
    return { success: false };
  }
};

export const updateUser = async (id, data) => {
  try {
    const res = await api.put(`/users/${id}`, data);
    return res.data;
  } catch {
    return { success: false };
  }
};

export const deleteUser = async (id) => {
  try {
    const res = await api.delete(`/users/${id}`);
    return res.data;
  } catch {
    return { success: false };
  }
};
