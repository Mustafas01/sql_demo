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

/*  PATCH  – ADDITIVE IMPORT */
import { useNavigate } from 'react-router-dom';

const AdminPanel = ({ user, onBack }) => {
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  /*  PATCH  – navigation hook */
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
    if (activeTab === 'products') {
      loadProducts();
    } else if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab]);

  /*  PATCH  – AUTH GUARD (ADDITIVE, SEAMLESS) */
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || role !== "admin") {
      console.warn("[SECURITY] Unauthorized admin panel access attempt");
      setMessage("Session expired or unauthorized. Redirecting...");
      setTimeout(() => {
        navigate("/");
      }, 1500);
    }
  }, []);

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
      /*  PATCH  – JWT FAILURE HANDLING */
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
    try {
      const result = await getUsers();
      if (result.success) {
        setUsers(result.users);
      } else {
        setMessage(result.error || 'Failed to load users');
      }
    } catch (err) {
      /*  PATCH  – JWT FAILURE HANDLING */
      if (err?.response?.status === 401) {
        console.warn("[AUTH] JWT expired or invalid");
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        setMessage("Session expired. Redirecting to login...");
        setTimeout(() => navigate("/"), 1500);
        return;
      }
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
      password: '',
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
      {/* UI UNCHANGED */}
    </div>
  );
};

export default AdminPanel;
