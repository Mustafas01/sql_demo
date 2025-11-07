import React, { useState } from 'react';
import { searchProducts } from '../services/api';

const Search = ({ onBack }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [securityAlert, setSecurityAlert] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSecurityAlert(false);

    try {
      const result = await searchProducts(query);
      if (result.success) {
        setResults(result.results);
        setError('');
      } else {
        setError(result.error);
        setResults([]);
        // Show security alert for SQL injection attempts
        if (result.error.includes('Malicious') || result.error.includes('logged')) {
          setSecurityAlert(true);
        }
      }
    } catch (err) {
      setError('An error occurred during search');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Function to get product image
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
    <div className="search-container">
      <h2>Search Products</h2>
      
      {error && (
        <div className={`message ${error.includes('Malicious') ? 'sql-error-message' : 'error-message'}`}>
          {error}
        </div>
      )}
      
      {securityAlert && (
        <div className="security-log-alert">
          <div className="security-log-header">
            <span className="security-log-icon">📋</span>
            <strong>Security Event Logged</strong>
          </div>
          <p>The attempt was logged and blacklisted inputs updated.</p>
          <div className="security-log-details">
            <span className="log-timestamp">Timestamp: {new Date().toLocaleString()}</span>
            <span className="log-query">Query: "{query}"</span>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSearch} className="form">
        <div className="form-group">
          <label htmlFor="search">Search Query:</label>
          <input
            type="text"
            id="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (securityAlert) setSecurityAlert(false);
            }}
            placeholder="Enter product name or description"
            required
            className={securityAlert ? 'input-warning' : ''}
          />
        </div>
        <button type="submit" disabled={loading} className="btn">
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      <div className="search-demo-info">
        <h4>Search Security Demo</h4>
        <p>Try these SQL injection attempts to see the security system in action:</p>
        <div className="sql-examples">
          <code>' OR 1=1--</code>
          <code>' UNION SELECT * FROM users--</code>
          <code>'; DROP TABLE products--</code>
        </div>
        <p className="demo-note">All malicious search attempts are logged and the blacklist is automatically updated.</p>
      </div>

      {results.length > 0 && (
        <div className="results">
          <h3>Search Results ({results.length}):</h3>
          <div className="products-grid">
            {results.map(product => (
              <div key={product.id} className="product-card">
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
        </div>
      )}
      
      <button onClick={onBack} className="btn back">
        Back to Dashboard
      </button>
    </div>
  );
};

export default Search;
