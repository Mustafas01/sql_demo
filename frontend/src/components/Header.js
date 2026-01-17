import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchProducts } from '../services/api';

const Header = ({ user, onNavigate, onLogout }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log("🔍 HEADER SEARCH: Searching for:", searchQuery);
      
      try {
        const result = await searchProducts(searchQuery);
        console.log("🔍 HEADER SEARCH: Result:", result);
        
        if (result.success) {
          // Navigate to products page with search results
          navigate('/products', { state: { searchResults: result.results, searchQuery } });
          setSearchError('');
        } else {
          setSearchError(result.error);
          console.log("🔍 HEADER SEARCH: Error:", result.error);
        }
      } catch (err) {
        console.error("🔍 HEADER SEARCH: Exception:", err);
        setSearchError('Search failed');
      }
      
      setSearchQuery('');
    }
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <h1 onClick={() => onNavigate('/')} className="header-title">
            TechStore
          </h1>
          <nav className="nav">
            <button 
              onClick={() => onNavigate('/products')}
              className="nav-btn"
            >
              Products
            </button>
            {user && (
              <>
                <button 
                  onClick={() => onNavigate('/dashboard')}
                  className="nav-btn"
                >
                  Dashboard
                </button>
                {user.role === 'admin' && (
                  <button 
                    onClick={() => onNavigate('/admin')}
                    className="nav-btn"
                  >
                    Admin
                  </button>
                )}
              </>
            )}
          </nav>
        </div>

        <div className="header-center">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchError('');
              }}
              className="search-input"
            />
            <button type="submit" className="search-btn">
              🔍
            </button>
          </form>
          {searchError && (
            <div className="header-search-error">
              {searchError}
            </div>
          )}
        </div>
        
        <div className="header-right">
          {user ? (
            <div className="user-menu">
              <span className="user-info">Welcome, {user.username}</span>
              <button onClick={onLogout} className="nav-btn logout">
                Logout
              </button>
            </div>
          ) : (
            <div className="auth-buttons">
              <button 
                onClick={() => onNavigate('/login')}
                className="nav-btn"
              >
                Login
              </button>
              <button 
                onClick={() => onNavigate('/register')}
                className="nav-btn primary"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
