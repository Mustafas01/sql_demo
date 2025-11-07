import React, { useState, useEffect } from 'react';
import { getProducts } from '../services/api';
import { useNavigate } from 'react-router-dom';

const Dashboard = ({ user, onLogout, onNavigate }) => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadFeaturedProducts();
  }, []);

  const loadFeaturedProducts = async () => {
    try {
      const result = await getProducts();
      if (result.success) {
        // Get 8 random products for the dashboard
        const shuffled = [...result.products].sort(() => 0.5 - Math.random());
        setFeaturedProducts(shuffled.slice(0, 8));
      }
    } catch (err) {
      console.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleProductClick = (productId) => {
    navigate(`/product/${productId}`);
  };

  const getProductImage = (product) => {
    const imageMap = {
      'Laptop': '💻',
      'Smartphone': '📱',
      'Programming Book': '📚',
      'Wireless Headphones': '🎧',
      'Coffee Mug': '☕',
      'Cotton T-Shirt': '👕',
      'LED Desk Lamp': '💡',
      'Backpack': '🎒',
      'Monitor': '🖥️',
      'Keyboard': '⌨️'
    };
    return imageMap[product.name] || '📦';
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Welcome back, {user.username}!</h2>
        <p>Here's what's new in your store</p>
      </div>
      
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <h3>24</h3>
            <p>Orders Today</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <h3>$1,248</h3>
            <p>Revenue</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <h3>156</h3>
            <p>Customers</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-info">
            <h3>42</h3>
            <p>Products</p>
          </div>
        </div>
      </div>

      <div className="dashboard-cards">
        <div className="card">
          <h3>Search Products</h3>
          <p>Find products in our catalog</p>
          <button onClick={() => onNavigate('search')} className="btn">
            Go to Search
          </button>
        </div>
        
        <div className="card">
          <h3>Browse Products</h3>
          <p>View all available products</p>
          <button onClick={() => onNavigate('products')} className="btn">
            View Products
          </button>
        </div>

        {user.role === 'admin' && (
          <div className="card admin-card">
            <h3>Admin Panel</h3>
            <p>Manage products and users</p>
            <button onClick={() => onNavigate('admin')} className="btn admin-btn">
              Admin Panel
            </button>
          </div>
        )}
      </div>

      <div className="featured-products-dashboard">
        <h3>Featured Products</h3>
        <p>Popular items in your store</p>
        
        {loading ? (
          <div className="loading">Loading products...</div>
        ) : (
          <div className="products-grid dashboard-grid">
            {featuredProducts.map(product => (
              <div 
                key={product.id} 
                className="product-card"
                onClick={() => handleProductClick(product.id)}
              >
                <div className="product-image">
                  <div className="product-icon">
                    {getProductImage(product)}
                  </div>
                </div>
                <div className="product-info">
                  <div className="product-header">
                    <h4>{product.name}</h4>
                    <span className="product-category-tag">{product.category}</span>
                  </div>
                  <p className="product-description">{product.description}</p>
                  <div className="product-footer">
                    <p className="product-price">${product.price.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="user-info">
        <h3>Your Information</h3>
        <div className="user-details">
          <p><strong>Username:</strong> {user.username}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Role:</strong> <span className={`role-badge ${user.role}`}>{user.role}</span></p>
        </div>
      </div>

      <button onClick={onLogout} className="btn logout">
        Logout
      </button>
    </div>
  );
};

export default Dashboard;
