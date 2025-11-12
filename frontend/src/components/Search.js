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

    console.log("🔍 FRONTEND: Starting search with query:", query);

    try {
      const result = await searchProducts(query);
      console.log("🔍 FRONTEND: Search API response:", result);
      
      if (result.success) {
        setResults(result.results);
        setError('');
        console.log("🔍 FRONTEND: Found", result.results.length, "results");
      } else {
        setError(result.error);
        setResults([]);
        console.log("🔍 FRONTEND: Search failed:", result.error);
        if (result.error.includes('Malicious') || result.error.includes('logged')) {
          setSecurityAlert(true);
        }
      }
    } catch (err) {
      console.error("🔍 FRONTEND: Search error:", err);
      setError('An error occurred during search');
      setResults([]);
    } finally {
      setLoading(false);
    }
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
        <h4>SQL Injection Test</h4>
        <p>Try these payloads to test security:</p>
        <div className="sql-examples">
          <button type="button" onClick={() => setQuery("' OR '1'='1")} className="test-btn">
            Test: ' OR '1'='1
          </button>
          <button type="button" onClick={() => setQuery("' UNION SELECT username,password,email FROM users--")} className="test-btn">
            Test: UNION SELECT
          </button>
          <button type="button" onClick={() => setQuery("test")} className="test-btn">
            Test: Normal Search
          </button>
        </div>
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

// Helper function
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

export default Search;
