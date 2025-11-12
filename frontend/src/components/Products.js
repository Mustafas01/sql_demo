import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getProducts } from '../services/api';

const Products = ({ onBack, user, isFeatured = false }) => {
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if we have search results from header
    const searchResults = location.state?.searchResults;
    const searchQuery = location.state?.searchQuery;
    
    if (searchResults) {
      console.log("📦 PRODUCTS: Displaying search results from header");
      setProducts(searchResults);
      setError('');
    } else {
      loadProducts();
    }
  }, [category, location]);

  // ... rest of your Products component remains the same

  const loadProducts = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('Loading products with category:', category);
      const result = await getProducts(category);
      console.log('Products API response:', result);
      
      if (result.success) {
        const displayProducts = isFeatured ? result.products.slice(0, 6) : result.products;
        setProducts(displayProducts);
        setError('');
      } else {
        setError(result.error || 'Failed to load products');
        setProducts([]);
      }
    } catch (err) {
      console.error('Error loading products:', err);
      setError('An error occurred while loading products. Please check if the backend server is running on port 5000.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query) => {
    setLoading(true);
    try {
      const result = await getProducts('');
      if (result.success) {
        const filteredProducts = result.products.filter(product =>
          product.name.toLowerCase().includes(query.toLowerCase()) ||
          product.description.toLowerCase().includes(query.toLowerCase())
        );
        setProducts(filteredProducts);
      }
    } catch (err) {
      setError('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleProductClick = (productId) => {
    navigate(`/product/${productId}`);
  };

  const categories = ['', 'Electronics', 'Books', 'Home', 'Clothing', 'Accessories'];

  // Function to get product image based on category and name
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

    return imageMap[product.name] || getCategoryIcon(product.category);
  };

  const getCategoryIcon = (category) => {
    const categoryIcons = {
      'Electronics': '🔌',
      'Books': '📖',
      'Home': '🏠',
      'Clothing': '👔',
      'Accessories': '🛍️'
    };
    return categoryIcons[category] || '📦';
  };

  // Sample products for demo if API fails
  const sampleProducts = [
    {
      id: 1,
      name: 'Laptop',
      description: 'High-performance laptop with 16GB RAM and 512GB SSD',
      price: 999.99,
      category: 'Electronics'
    },
    {
      id: 2,
      name: 'Smartphone',
      description: 'Latest smartphone with 5G and triple camera',
      price: 699.99,
      category: 'Electronics'
    },
    {
      id: 3,
      name: 'Programming Book',
      description: 'Complete guide to web development and security',
      price: 29.99,
      category: 'Books'
    },
    {
      id: 4,
      name: 'Wireless Headphones',
      description: 'Noise-cancelling wireless headphones',
      price: 149.99,
      category: 'Electronics'
    },
    {
      id: 5,
      name: 'Coffee Mug',
      description: 'Premium ceramic coffee mug',
      price: 12.99,
      category: 'Home'
    },
    {
      id: 6,
      name: 'Cotton T-Shirt',
      description: 'Comfortable cotton t-shirt in various colors',
      price: 19.99,
      category: 'Clothing'
    }
  ];

  const displayProducts = products.length > 0 ? products : (isFeatured ? sampleProducts.slice(0, 6) : sampleProducts);

  if (isFeatured) {
    return (
      <div className="products-section">
        {loading ? (
          <div className="loading">Loading products...</div>
        ) : error ? (
          <div className="error-message">
            {error}
            <div style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
              <strong>Demo Mode:</strong> Showing sample products
            </div>
          </div>
        ) : (
          <div className="products-grid featured-grid">
            {displayProducts.map(product => (
              <div 
                key={product.id} 
                className="product-card featured-card"
                onClick={() => handleProductClick(product.id)}
              >
                <div className="product-image">
                  <div className="product-icon large">
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
        )}
      </div>
    );
  }

  return (
    <div className="products-container">
      <div className="products-header">
        <h2>Our Products</h2>
        <p>Discover our amazing collection of products</p>
      </div>
      
      {error && (
        <div className="error-message">
          {error}
          <div style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
            <strong>Note:</strong> Make sure the backend server is running on http://localhost:5000
          </div>
        </div>
      )}
      
      <div className="categories-filter">
        <h3>Filter by Category</h3>
        <div className="categories">
          {categories.map(cat => (
            <button
              key={cat || 'all'}
              onClick={() => setCategory(cat)}
              className={`category-filter-btn ${category === cat ? 'active' : ''}`}
            >
              <span className="category-icon">{getCategoryIcon(cat)}</span>
              {cat || 'All Products'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading products...</div>
      ) : (
        <div className="products-results">
          <div className="results-header">
            <h3>{category ? `${category} Products` : 'All Products'} ({displayProducts.length})</h3>
            <div className="sort-options">
              <select className="sort-select">
                <option>Sort by: Featured</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Name: A to Z</option>
              </select>
            </div>
          </div>
          
          {displayProducts.length === 0 ? (
            <div className="no-products">
              <div className="no-products-icon">📦</div>
              <h3>No products found</h3>
              <p>Try changing your filters or search terms</p>
            </div>
          ) : (
            <div className="products-grid">
              {displayProducts.map(product => (
                <div 
                  key={product.id} 
                  className="product-card"
                  onClick={() => handleProductClick(product.id)}
                >
                  <div className="product-image">
                    <div className="product-icon">
                      {getProductImage(product)}
                    </div>
                    <div className="product-overlay">
                      <button className="view-details-btn">Quick View</button>
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
                      <div className="product-actions">
                        <button className="btn small primary">Add to Cart</button>
                        <button className="btn small secondary">❤️</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {onBack && (
        <button onClick={onBack} className="btn back">
          {user ? 'Back to Dashboard' : 'Back to Home'}
        </button>
      )}
    </div>
  );
};

export default Products;
