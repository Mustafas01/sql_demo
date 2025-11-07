import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProductById } from '../services/api';

const ProductDetail = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      console.log('Loading product with ID:', id);
      const result = await getProductById(id);
      console.log('Product API response:', result);
      
      if (result.success) {
        setProduct(result.product);
      } else {
        setError(result.error || 'Product not found');
        // If API fails, use sample product for demo
        if (result.error.includes('Failed to load product')) {
          setProduct(getSampleProduct(id));
          setError(''); // Clear error since we're using sample data
        }
      }
    } catch (err) {
      console.error('Error loading product:', err);
      setError('Failed to load product details. Using demo data.');
      // Use sample product as fallback
      setProduct(getSampleProduct(id));
    } finally {
      setLoading(false);
    }
  };

  // Sample product data for demo
  const getSampleProduct = (productId) => {
    const sampleProducts = {
      1: {
        id: 1,
        name: 'Laptop',
        description: 'High-performance laptop with 16GB RAM and 512GB SSD, perfect for development and gaming',
        price: 999.99,
        category: 'Electronics'
      },
      2: {
        id: 2,
        name: 'Smartphone',
        description: 'Latest smartphone with 5G connectivity, triple camera setup, and all-day battery life',
        price: 699.99,
        category: 'Electronics'
      },
      3: {
        id: 3,
        name: 'Programming Book',
        description: 'Complete guide to web development and security, covering modern frameworks and best practices',
        price: 29.99,
        category: 'Books'
      },
      4: {
        id: 4,
        name: 'Wireless Headphones',
        description: 'Noise-cancelling wireless headphones with premium sound quality and comfortable fit',
        price: 149.99,
        category: 'Electronics'
      },
      5: {
        id: 5,
        name: 'Coffee Mug',
        description: 'Premium ceramic coffee mug with ergonomic handle and large capacity',
        price: 12.99,
        category: 'Home'
      },
      6: {
        id: 6,
        name: 'Cotton T-Shirt',
        description: 'Comfortable cotton t-shirt in various colors, made from 100% organic cotton',
        price: 19.99,
        category: 'Clothing'
      }
    };
    
    return sampleProducts[productId] || sampleProducts[1]; // Default to first product if not found
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

  const getProductGallery = (product) => {
    const mainIcon = getProductImage(product);
    return [mainIcon, '📸', '🎬', '📊']; // Multiple "images" for the gallery
  };

  // Function to get related products
  const getRelatedProducts = () => {
    const currentProductId = parseInt(id);
    const relatedIds = [1, 2, 3, 4, 5, 6].filter(productId => productId !== currentProductId);
    
    // Return 3 random related products
    return relatedIds
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(productId => getSampleProduct(productId));
  };

  if (loading) {
    return (
      <div className="product-detail-container">
        <div className="loading">Loading product details...</div>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="product-detail-container">
        <div className="error-message">
          {error}
          <div style={{ marginTop: '1rem' }}>
            <button onClick={() => navigate('/products')} className="btn primary">
              Browse All Products
            </button>
          </div>
        </div>
      </div>
    );
  }

  const galleryImages = getProductGallery(product);
  const relatedProducts = getRelatedProducts();

  return (
    <div className="product-detail-container">
      <nav className="breadcrumb">
        <button onClick={() => navigate('/')} className="breadcrumb-link">Home</button>
        <span className="breadcrumb-separator">/</span>
        <button onClick={() => navigate('/products')} className="breadcrumb-link">Products</button>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">{product.name}</span>
      </nav>

      {error && (
        <div className="demo-notice">
          <div className="demo-notice-icon">💡</div>
          <div className="demo-notice-content">
            <strong>Demo Mode</strong>
            <p>Showing sample product data. The backend API might not be available.</p>
          </div>
        </div>
      )}

      <div className="product-detail">
        <div className="product-gallery">
          <div className="main-image">
            <div className="product-icon xlarge">
              {galleryImages[selectedImage]}
            </div>
          </div>
          <div className="image-thumbnails">
            {galleryImages.map((icon, index) => (
              <button
                key={index}
                className={`thumbnail ${selectedImage === index ? 'active' : ''}`}
                onClick={() => setSelectedImage(index)}
              >
                <div className="thumbnail-icon">{icon}</div>
              </button>
            ))}
          </div>
        </div>
        
        <div className="product-info">
          <div className="product-header">
            <h1>{product.name}</h1>
            <div className="product-meta">
              <span className="product-category">{product.category}</span>
              <span className="product-rating">⭐️⭐️⭐️⭐️⭐️ (24)</span>
            </div>
          </div>
          
          <div className="product-price-section">
            <p className="product-price">${product.price.toFixed(2)}</p>
            <p className="product-shipping">Free Shipping • 30-Day Returns</p>
          </div>

          <div className="product-description-section">
            <h3>Description</h3>
            <p className="product-description">{product.description}</p>
          </div>

          <div className="product-features">
            <h3>Features</h3>
            <ul className="features-list">
              <li>✅ High quality materials</li>
              <li>✅ 1-year warranty included</li>
              <li>✅ Eco-friendly packaging</li>
              <li>✅ Fast and free shipping</li>
            </ul>
          </div>

          <div className="product-actions">
            <div className="quantity-selector">
              <label htmlFor="quantity">Quantity:</label>
              <select id="quantity" className="quantity-select">
                {[1,2,3,4,5].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
            
            <div className="action-buttons">
              <button className="btn primary large">
                🛒 Add to Cart
              </button>
              <button className="btn secondary large">
                ❤️ Add to Wishlist
              </button>
            </div>
          </div>

          <div className="product-specs">
            <h3>Specifications</h3>
            <div className="specs-grid">
              <div className="spec-item">
                <strong>Product ID:</strong> {product.id}
              </div>
              <div className="spec-item">
                <strong>Category:</strong> {product.category}
              </div>
              <div className="spec-item">
                <strong>Availability:</strong> <span className="in-stock">In Stock</span>
              </div>
              <div className="spec-item">
                <strong>Shipping:</strong> 2-3 business days
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products Section */}
      <section className="related-products">
        <div className="container">
          <h2>You Might Also Like</h2>
          <div className="products-grid">
            {relatedProducts.map(relatedProduct => (
              <div 
                key={relatedProduct.id} 
                className="product-card"
                onClick={() => navigate(`/product/${relatedProduct.id}`)}
              >
                <div className="product-image">
                  <div className="product-icon">
                    {getProductImage(relatedProduct)}
                  </div>
                </div>
                <div className="product-info">
                  <div className="product-header">
                    <h4>{relatedProduct.name}</h4>
                    <span className="product-category-tag">{relatedProduct.category}</span>
                  </div>
                  <p className="product-description">{relatedProduct.description}</p>
                  <div className="product-footer">
                    <p className="product-price">${relatedProduct.price.toFixed(2)}</p>
                    <div className="product-actions">
                      <button className="btn small primary">Add to Cart</button>
                      <button className="btn small secondary">❤️</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProductDetail;
