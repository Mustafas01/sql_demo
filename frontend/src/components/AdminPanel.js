import React, { useState, useEffect } from 'react';
import { 
  getProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct,
  getUsers,
  createUser,
  updateUser,
  deleteUser 
} from '../services/api';

const AdminPanel = ({ user, onBack }) => {
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

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
    if (activeTab === 'products') {
      loadProducts();
    } else if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const result = await getProducts();
      if (result.success) {
        setProducts(result.products);
      } else {
        setMessage(result.error || 'Failed to load products');
      }
    } catch (err) {
      setMessage('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await getUsers();
      if (result.success) {
        setUsers(result.users);
      } else {
        setMessage(result.error || 'Failed to load users');
      }
    } catch (err) {
      setMessage('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    try {
      let result;
      if (editingProduct) {
        result = await updateProduct(editingProduct.id, productForm);
      } else {
        result = await createProduct(productForm);
      }

      if (result.success) {
        setMessage(editingProduct ? 'Product updated successfully!' : 'Product created successfully!');
        setProductForm({ name: '', description: '', price: '', category: '' });
        setEditingProduct(null);
        loadProducts();
      } else {
        setMessage(result.error || 'Operation failed');
      }
    } catch (err) {
      setMessage('Operation failed');
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
        result = await updateUser(editingUser.id, userForm);
      } else {
        result = await createUser(userForm);
      }

      if (result.success) {
        setMessage(editingUser ? 'User updated successfully!' : 'User created successfully!');
        setUserForm({ username: '', password: '', email: '', role: 'user' });
        setEditingUser(null);
        loadUsers();
      } else {
        setMessage(result.error || 'Operation failed');
      }
    } catch (err) {
      setMessage('Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        const result = await deleteProduct(productId);
        if (result.success) {
          setMessage('Product deleted successfully!');
          loadProducts();
        } else {
          setMessage(result.error || 'Delete failed');
        }
      } catch (err) {
        setMessage('Delete failed');
      }
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        const result = await deleteUser(userId);
        if (result.success) {
          setMessage('User deleted successfully!');
          loadUsers();
        } else {
          setMessage(result.error || 'Delete failed');
        }
      } catch (err) {
        setMessage('Delete failed');
      }
    }
  };

  const startEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      category: product.category
    });
  };

  const startEditUser = (user) => {
    setEditingUser(user);
    setUserForm({
      username: user.username,
      password: '', // Don't fill password for security
      email: user.email,
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
      <h2>Admin Panel</h2>
      <p>Manage products and users in the database</p>

      {message && (
        <div className={`message ${message.includes('successfully') ? 'success-message' : 'error-message'}`}>
          {message}
        </div>
      )}

      <div className="admin-tabs">
        <button 
          className={activeTab === 'products' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setActiveTab('products')}
        >
          Products Management
        </button>
        <button 
          className={activeTab === 'users' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setActiveTab('users')}
        >
          Users Management
        </button>
      </div>

      {activeTab === 'products' && (
        <div className="tab-content">
          <div className="form-section">
            <h3>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
            <form onSubmit={handleProductSubmit} className="form">
              <div className="form-group">
                <label>Name:</label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description:</label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                  required
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Price:</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={productForm.price}
                  onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Category:</label>
                <input
                  type="text"
                  value={productForm.category}
                  onChange={(e) => setProductForm({...productForm, category: e.target.value})}
                  required
                />
              </div>
              <div className="form-actions">
                <button type="submit" disabled={loading} className="btn">
                  {loading ? 'Saving...' : (editingProduct ? 'Update Product' : 'Add Product')}
                </button>
                {editingProduct && (
                  <button type="button" onClick={cancelEdit} className="btn secondary">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="list-section">
            <h3>Existing Products ({products.length})</h3>
            {loading ? (
              <div className="loading">Loading products...</div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Description</th>
                      <th>Price</th>
                      <th>Category</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(product => (
                      <tr key={product.id}>
                        <td>{product.id}</td>
                        <td>{product.name}</td>
                        <td className="description-cell">{product.description}</td>
                        <td>${product.price.toFixed(2)}</td>
                        <td>{product.category}</td>
                        <td>
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="tab-content">
          <div className="form-section">
            <h3>{editingUser ? 'Edit User' : 'Add New User'}</h3>
            <form onSubmit={handleUserSubmit} className="form">
              <div className="form-group">
                <label>Username:</label>
                <input
                  type="text"
                  value={userForm.username}
                  onChange={(e) => setUserForm({...userForm, username: e.target.value})}
                  required
                  disabled={editingUser} // Don't allow changing username when editing
                />
              </div>
              <div className="form-group">
                <label>Password:</label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                  required={!editingUser}
                  placeholder={editingUser ? "Leave blank to keep current password" : ""}
                />
              </div>
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Role:</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({...userForm, role: e.target.value})}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="submit" disabled={loading} className="btn">
                  {loading ? 'Saving...' : (editingUser ? 'Update User' : 'Add User')}
                </button>
                {editingUser && (
                  <button type="button" onClick={cancelEdit} className="btn secondary">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="list-section">
            <h3>Existing Users ({users.length})</h3>
            {loading ? (
              <div className="loading">Loading users...</div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id}>
                        <td>{user.id}</td>
                        <td>{user.username}</td>
                        <td>{user.email}</td>
                        <td>
                          <span className={`role-badge ${user.role}`}>
                            {user.role}
                          </span>
                        </td>
                        <td>
                          <button 
                            onClick={() => startEditUser(user)}
                            className="btn small"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            className="btn small danger"
                            disabled={user.username === 'admin'} // Prevent deleting main admin
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      
      <button onClick={onBack} className="btn back">
        Back to Dashboard
      </button>
    </div>
  );
};

export default AdminPanel;
