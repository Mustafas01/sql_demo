import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Header = ({ user, currentView, onNavigate, onLogout }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if (user) {
        navigate('/search', { state: { query: searchQuery } });
      } else {
        navigate('/products', { state: { query: searchQuery } });
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
              className={currentView === 'products' ? 'nav-btn active' : 'nav-btn'}
            >
              Products
            </button>
            {user && (
              <>
                <button 
                  onClick={() => onNavigate('/dashboard')}
                  className={currentView === 'dashboard' ? 'nav-btn active' : 'nav-btn'}
                >
                  Dashboard
                </button>
                {user.role === 'admin' && (
                  <button 
                    onClick={() => onNavigate('/admin')}
                    className={currentView === 'admin' ? 'nav-btn active' : 'nav-btn'}
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
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-btn">
              🔍
            </button>
          </form>
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
