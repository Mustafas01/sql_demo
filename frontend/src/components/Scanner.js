import React, { useState } from 'react';
import { scanInput, getBlacklist } from '../services/api';

const Scanner = ({ onBack }) => {
  const [input, setInput] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [blacklist, setBlacklist] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    setLoading(true);
    setScanResult(null);

    try {
      const result = await scanInput(input);
      setScanResult(result);
      await loadBlacklist();
    } catch (err) {
      setScanResult({ error: 'Scan failed' });
    } finally {
      setLoading(false);
    }
  };

  const loadBlacklist = async () => {
    try {
      const result = await getBlacklist();
      setBlacklist(result.blacklist);
    } catch (err) {
      console.error('Failed to load blacklist');
    }
  };

  const quickTest = (payload) => {
    setInput(payload);
  };

  React.useEffect(() => {
    loadBlacklist();
  }, []);

  const testPayloads = [
    "' OR '1'='1",
    "' UNION SELECT * FROM users--",
    "'; DROP TABLE users--",
    "' AND 1=1--",
    "admin'--",
    "1' OR '1'='1",
    "1; INSERT INTO users (username, password) VALUES ('hacker', 'pass')--"
  ];

  return (
    <div className="scanner-container">
      <h2>SQL Injection Scanner</h2>
      <p className="scanner-description">
        This scanner checks inputs for SQL injection patterns without executing them.
        It uses pattern matching to detect malicious inputs.
      </p>
      
      <form onSubmit={handleScan} className="form">
        <div className="form-group">
          <label htmlFor="scan-input">Input to Scan:</label>
          <textarea
            id="scan-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter text to check for SQL injection patterns..."
            rows="4"
            required
          />
        </div>
        <button type="submit" disabled={loading || !input.trim()} className="btn">
          {loading ? 'Scanning...' : 'Scan for SQL Injection'}
        </button>
      </form>

      {scanResult && (
        <div className={`scan-result ${scanResult.is_malicious ? 'malicious' : 'clean'}`}>
          <h3>Scan Result:</h3>
          <p><strong>Input:</strong> <code>{scanResult.input}</code></p>
          <p><strong>Status:</strong> 
            <span className={scanResult.is_malicious ? 'status-malicious' : 'status-clean'}>
              {scanResult.is_malicious ? '🚨 MALICIOUS - SQL Injection Detected!' : '✅ CLEAN - No SQL Injection'}
            </span>
          </p>
          <p><strong>Timestamp:</strong> {new Date(scanResult.timestamp).toLocaleString()}</p>
          {scanResult.is_malicious && (
            <p className="warning">⚠️ This input has been added to the blacklist!</p>
          )}
        </div>
      )}

      <div className="quick-tests">
        <h4>Quick Test Payloads:</h4>
        <div className="quick-buttons">
          {testPayloads.map((payload, index) => (
            <button
              key={index}
              type="button"
              onClick={() => quickTest(payload)}
              className="btn secondary"
            >
              Test: {payload.substring(0, 20)}...
            </button>
          ))}
        </div>
      </div>

      <div className="blacklist-section">
        <h4>Current Blacklist Patterns ({blacklist.length}):</h4>
        {blacklist.length > 0 ? (
          <ul className="blacklist">
            {blacklist.map((pattern, index) => (
              <li key={index}><code>{pattern}</code></li>
            ))}
          </ul>
        ) : (
          <p>No patterns in blacklist yet. Try scanning some malicious inputs!</p>
        )}
      </div>
      
      <button onClick={onBack} className="btn back">
        Back to Home
      </button>
    </div>
  );
};

export default Scanner;
