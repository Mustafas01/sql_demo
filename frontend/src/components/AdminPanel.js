import React, { useState, useEffect } from 'react';
import {
  getProducts,
  adminCreateProduct,
  adminDeleteProduct,
  adminGetUsers,
  adminDeleteUser,
  adminCreateUser,
  adminUpdateUser,
  adminUpdateProduct
} from '../services/api';
import { useNavigate } from 'react-router-dom';

const AdminPanel = ({ user, onBack }) => {
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const navigate = useNavigate();

  // Product management states
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    category: ''
  });
  const [editingProduct, setEditingProduct] = useState(null);

  // User management states
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    email: '',
    role: 'user'
  });
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    if (user?.role !== 'admin') {
      console.warn("[SECURITY] Unauthorized admin panel access attempt");
      setMessage("Access denied. Admin privileges required.");
      setTimeout(() => {
        navigate("/");
      }, 1500);
      return;
    }

    if (activeTab === 'products') {
      loadProducts();
    } else if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab, user, navigate]);

  const loadProducts = async () => {
    setLoading(true);
    setMessage('');
    try {
      const result = await getProducts();

      // getProducts() now returns { success, products }
      if (result && result.success && Array.isArray(result.products)) {
        setProducts(result.products);
      } else if (Array.isArray(result)) {
        // Backwards compatibility if getProducts ever returns a raw array
        setProducts(result);
      } else {
        setMessage(result?.error || 'Failed to load products');
      }
    } catch (err) {
      if (err?.response?.status === 401) {
        console.warn("[AUTH] JWT expired or invalid");
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        setMessage("Session expired. Redirecting to login...");
        setTimeout(() => navigate("/"), 1500);
        return;
      }
      setMessage('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    setMessage('');
    try {
      const result = await adminGetUsers();
      if (Array.isArray(result)) {
        setUsers(result);
      } else {
        setMessage(result?.error || 'Failed to load users');
      }
    } catch (err) {
      if (err?.response?.status === 401) {
        console.warn("[AUTH] JWT expired or invalid");
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        setMessage("Session expired. Redirecting to login...");
        setTimeout(() => navigate("/"), 1500);
        return;
      }
      if (err?.wafBlocked) {
        setMessage(err.message || 'Malicious input logged and block the attempt');
      } else {
        setMessage('Failed to load users');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const productData = {
        ...productForm,
        price: parseFloat(productForm.price) || 0
      };

      let result;
      if (editingProduct) {
        result = await adminUpdateProduct(editingProduct.id, productData);
        if (result && result.message) {
          setMessage('Product updated successfully!');
        }
      } else {
        result = await adminCreateProduct(productData);
        if (result && result.message) {
          setMessage('Product created successfully!');
        }
      }

      if (result && result.message) {
        setProductForm({ name: '', description: '', price: '', category: '' });
        setEditingProduct(null);
        loadProducts();
      } else {
        setMessage(result?.error || 'Operation failed');
      }
    } catch (err) {
      if (err?.wafBlocked) {
        setMessage(err.message || 'Malicious input logged and block the attempt');
      } else {
        setMessage('Operation failed');
      }
      console.error('Product operation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      let result;
      if (editingUser) {
        result = await adminUpdateUser(editingUser.id, userForm);
        if (result && result.message) {
          setMessage('User updated successfully!');
        }
      } else {
        result = await adminCreateUser(userForm);
        if (result && result.message) {
          setMessage('User created successfully!');
        }
      }

      if (result && result.message) {
        setUserForm({ username: '', password: '', email: '', role: 'user' });
        setEditingUser(null);
        loadUsers();
      } else {
        setMessage(result?.error || 'Operation failed');
      }
    } catch (err) {
      if (err?.wafBlocked) {
        setMessage(err.message || 'Malicious input logged and block the attempt');
      } else {
        setMessage('Operation failed');
      }
      console.error('User operation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      setLoading(true);
      try {
        const result = await adminDeleteProduct(productId);
        if (result && result.message) {
          setMessage('Product deleted successfully!');
          loadProducts();
        } else if (result?.error) {
          setMessage(result.error);
        } else {
          setMessage('Delete failed');
        }
      } catch (err) {
        if (err?.wafBlocked) {
          setMessage(err.message || 'Malicious input logged and block the attempt');
        } else if (err?.response?.status === 401) {
          setMessage('Session expired. Redirecting to login...');
          setTimeout(() => navigate("/"), 1500);
        } else {
          setMessage('Delete failed');
        }
        console.error('Delete product error:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      setLoading(true);
      try {
        const result = await adminDeleteUser(userId);
        if (result && result.message) {
          setMessage('User deleted successfully!');
          loadUsers();
        } else if (result?.error) {
          setMessage(result.error);
        } else {
          setMessage('Delete failed');
        }
      } catch (err) {
        if (err?.wafBlocked) {
          setMessage(err.message || 'Malicious input logged and block the attempt');
        } else if (err?.response?.status === 401) {
          setMessage('Session expired. Redirecting to login...');
          setTimeout(() => navigate("/"), 1500);
        } else {
          setMessage('Delete failed');
        }
        console.error('Delete user error:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const startEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      category: product.category || ''
    });
  };

  const startEditUser = (user) => {
    setEditingUser(user);
    setUserForm({
      username: user.username,
      password: '',
      email: user.email || '',
      role: user.role
    });
  };

  const cancelEdit = () => {
    setEditingProduct(null);
    setEditingUser(null);
    setProductForm({ name: '', description: '', price: '', category: '' });
    setUserForm({ username: '', password: '', email: '', role: 'user' });
    setMessage('');
  };

  if (user?.role !== 'admin') {
    return (
      <div className="admin-container">
        <div className="error-message">
          ⚠️ Access Denied: Admin privileges required
        </div>
        <button onClick={onBack} className="btn back">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Admin Panel</h1>
        <p>Welcome, {user?.username} (Admin)</p>
        <button onClick={onBack} className="btn back">
          Back to Dashboard
        </button>
      </div>

      <div className="admin-tabs">
        <button 
          className={`tab ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          Products
        </button>
        <button 
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
      </div>

      {message && (
        <div className={`message ${message.includes('successfully') ? 'success-message' : 'error-message'}`}>
          {message}
        </div>
      )}

      {loading && <div className="loading">Loading...</div>}

      {activeTab === 'products' && (
        <div className="admin-section">
          <h2>Product Management</h2>
          
          <form onSubmit={handleProductSubmit} className="admin-form">
            <h3>{editingProduct ? 'Edit Product' : 'Create New Product'}</h3>
            <div className="form-group">
              <input
                type="text"
                placeholder="Product Name"
                value={productForm.name}
                onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <textarea
                placeholder="Description"
                value={productForm.description}
                onChange={(e) => setProductForm({...productForm, description: e.target.value})}
              />
            </div>
            <div className="form-group">
              <input
                type="number"
                placeholder="Price"
                value={productForm.price}
                onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                required
                step="0.01"
                min="0"
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                placeholder="Category"
                value={productForm.category}
                onChange={(e) => setProductForm({...productForm, category: e.target.value})}
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn primary" disabled={loading}>
                {editingProduct ? 'Update Product' : 'Create Product'}
              </button>
              {editingProduct && (
                <button type="button" className="btn secondary" onClick={cancelEdit}>
                  Cancel
                </button>
              )}
            </div>
          </form>

          <h3>Existing Products ({products.length})</h3>
          <div className="admin-list">
            {products.map(product => (
              <div key={product.id} className="admin-item">
                <div className="item-info">
                  <strong>{product.name}</strong>
                  <p>{product.description}</p>
                  <span className="price">${product.price}</span>
                  <span className="category">{product.category}</span>
                </div>
                <div className="item-actions">
                  <button 
                    onClick={() => startEditProduct(product)}
                    className="btn small"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDeleteProduct(product.id)}
                    className="btn small danger"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="admin-section">
          <h2>User Management</h2>
          
          <form onSubmit={handleUserSubmit} className="admin-form">
            <h3>{editingUser ? 'Edit User' : 'Create New User'}</h3>
            <div className="form-group">
              <input
                type="text"
                placeholder="Username"
                value={userForm.username}
                onChange={(e) => setUserForm({...userForm, username: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <input
                type="password"
                placeholder="Password"
                value={userForm.password}
                onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                required={!editingUser}
              />
            </div>
            <div className="form-group">
              <input
                type="email"
                placeholder="Email"
                value={userForm.email}
                onChange={(e) => setUserForm({...userForm, email: e.target.value})}
              />
            </div>
            <div className="form-group">
              <select
                value={userForm.role}
                onChange={(e) => setUserForm({...userForm, role: e.target.value})}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn primary" disabled={loading}>
                {editingUser ? 'Update User' : 'Create User'}
              </button>
              {editingUser && (
                <button type="button" className="btn secondary" onClick={cancelEdit}>
                  Cancel
                </button>
              )}
            </div>
          </form>

          <h3>Existing Users ({users.length})</h3>
          <div className="admin-list">
            {users.map(user => (
              <div key={user.id} className="admin-item">
                <div className="item-info">
                  <strong>{user.username}</strong>
                  <p>{user.email}</p>
                  <span className={`role ${user.role}`}>{user.role}</span>
                </div>
                <div className="item-actions">
                  <button 
                    onClick={() => startEditUser(user)}
                    className="btn small"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDeleteUser(user.id)}
                    className="btn small danger"
                    disabled={user.username === 'admin'} // Prevent deleting admin
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;