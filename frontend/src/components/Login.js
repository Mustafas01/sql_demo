import React, { useState } from 'react';
import { login } from '../services/api';

const Login = ({ onLogin, onBack }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [securityAlert, setSecurityAlert] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Reset security alert when user types
    if (securityAlert) {
      setSecurityAlert(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSecurityAlert(false);

    try {
      const result = await login(formData.username, formData.password);
      if (result.success) {
        onLogin(result.user);
      } else {
        setError(result.error);
        // Show security alert for SQL injection attempts
        if (result.error.includes('Malicious input detected') || result.error.includes('logged')) {
          setSecurityAlert(true);
        }
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Login to Your Account</h2>
        <p>Welcome back! Please enter your credentials</p>
        
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
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label htmlFor="username">Username:</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              className={securityAlert ? 'input-warning' : ''}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className={securityAlert ? 'input-warning' : ''}
            />
          </div>
          
          <button type="submit" disabled={loading} className="btn primary">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="demo-info">
          <h4>Demo Information</h4>
          <div className="demo-credentials">
            <div className="credential-item">
              <strong>Admin User:</strong> admin / admin123
            </div>
            <div className="credential-item">
              <strong>Regular User:</strong> john_doe / password123
            </div>
          </div>
          
          <div className="sql-demo-info">
            <h5>SQL Injection Protection Demo</h5>
            <p>Try these inputs to see security protection in action:</p>
            <div className="sql-examples">
              <code>admin' OR '1'='1</code>
              <code>' UNION SELECT * FROM users--</code>
              <code>admin'--</code>
            </div>
            <p className="demo-note">Malicious attempts are automatically logged and blacklisted.</p>
          </div>
        </div>

        <div className="auth-footer">
          <p>Don't have an account? <button onClick={onBack} className="text-btn">Back to Home</button></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
