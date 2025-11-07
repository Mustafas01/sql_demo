import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Search from './components/Search';
import Products from './components/Products';
import ProductDetail from './components/ProductDetail';
import AdminPanel from './components/AdminPanel';
import './styles/App.css';

function AppContent() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    navigate('/dashboard');
    setError('');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    navigate('/');
    setError('');
  };

  return (
    <div className="App">
      <Header 
        user={user}
        onNavigate={navigate}
        onLogout={handleLogout}
      />
      
      <div className="main-content">
        {error && <div className="error-message">{error}</div>}
        
        <Routes>
          <Route path="/" element={<HomePage user={user} navigate={navigate} />} />
          <Route path="/login" element={<Login onLogin={handleLogin} onBack={() => navigate('/')} />} />
          <Route path="/register" element={<Register onLogin={handleLogin} onBack={() => navigate('/')} />} />
          <Route path="/dashboard" element={user ? <Dashboard user={user} onNavigate={navigate} /> : <div>Please log in first</div>} />
          <Route path="/search" element={user ? <Search onBack={() => navigate('/dashboard')} /> : <div>Please log in first</div>} />
          <Route path="/products" element={<Products user={user} onBack={user ? () => navigate('/dashboard') : () => navigate('/')} />} />
          <Route path="/product/:id" element={<ProductDetail user={user} />} />
          <Route path="/admin" element={user ? <AdminPanel user={user} onBack={() => navigate('/dashboard')} /> : <div>Please log in first</div>} />
        </Routes>
      </div>
    </div>
  );
}

// HomePage component for better organization
function HomePage({ user, navigate }) {
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Welcome to TechStore</h1>
          <p>Discover amazing products at great prices</p>
          <div className="hero-buttons">
            <button onClick={() => navigate('/products')} className="btn primary">
              Shop Now
            </button>
            {!user && (
              <button onClick={() => navigate('/register')} className="btn secondary">
                Create Account
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="featured-products">
        <div className="container">
          <h2>Featured Products</h2>
          <p className="section-subtitle">Check out our most popular items</p>
          <div className="products-grid">
            {/* Sample featured products */}
            {[
              { id: 1, name: 'Laptop', description: 'High-performance laptop with 16GB RAM', price: 999.99, category: 'Electronics' },
              { id: 2, name: 'Smartphone', description: 'Latest smartphone with 5G', price: 699.99, category: 'Electronics' },
              { id: 3, name: 'Programming Book', description: 'Complete guide to web development', price: 29.99, category: 'Books' },
              { id: 4, name: 'Wireless Headphones', description: 'Noise-cancelling wireless headphones', price: 149.99, category: 'Electronics' },
              { id: 5, name: 'Coffee Mug', description: 'Premium ceramic coffee mug', price: 12.99, category: 'Home' },
              { id: 6, name: 'Cotton T-Shirt', description: 'Comfortable cotton t-shirt', price: 19.99, category: 'Clothing' }
            ].map(product => (
              <div 
                key={product.id} 
                className="product-card"
                onClick={() => navigate(`/product/${product.id}`)}
              >
                <div className="product-image">
                  <div className="product-icon">
                    {getProductImage(product)}
                  </div>
                </div>
                <div className="product-info">
                  <h4>{product.name}</h4>
                  <p className="product-description">{product.description}</p>
                  <div className="product-footer">
                    <p className="product-price">${product.price.toFixed(2)}</p>
                    <span className="product-category-tag">{product.category}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="categories-section">
        <div className="container">
          <h2>Shop by Category</h2>
          <div className="categories-grid">
            <div className="category-card" onClick={() => navigate('/products?category=Electronics')}>
              <div className="category-icon">📱</div>
              <h3>Electronics</h3>
              <p>Latest gadgets and devices</p>
            </div>
            <div className="category-card" onClick={() => navigate('/products?category=Home')}>
              <div className="category-icon">🏠</div>
              <h3>Home & Living</h3>
              <p>Everything for your home</p>
            </div>
            <div className="category-card" onClick={() => navigate('/products?category=Books')}>
              <div className="category-icon">📚</div>
              <h3>Books</h3>
              <p>Knowledge and entertainment</p>
            </div>
            <div className="category-card" onClick={() => navigate('/products?category=Clothing')}>
              <div className="category-icon">👕</div>
              <h3>Clothing</h3>
              <p>Style and comfort</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits-section">
        <div className="container">
          <h2>Why Shop With Us?</h2>
          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon">🚚</div>
              <h3>Free Shipping</h3>
              <p>Free delivery on orders over $50</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">🔒</div>
              <h3>Secure Payment</h3>
              <p>Your payment information is safe</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">↩️</div>
              <h3>Easy Returns</h3>
              <p>30-day return policy</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">📞</div>
              <h3>24/7 Support</h3>
              <p>We're here to help anytime</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// Helper function for product images in HomePage
function getProductImage(product) {
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
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
