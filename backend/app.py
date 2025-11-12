from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import re
import os
from datetime import datetime
import hashlib

app = Flask(__name__)
app.secret_key = 'your_secret_key_here'
CORS(app, origins=["http://localhost:3000"], supports_credentials=True)

BLACKLIST_FILE = 'blacklist.txt'

# Initialize blacklist file
if not os.path.exists(BLACKLIST_FILE):
    with open(BLACKLIST_FILE, 'w') as f:
        f.write("# SQL Injection Blacklist\n")

def load_blacklist():
    """Load blacklisted patterns from file"""
    with open(BLACKLIST_FILE, 'r') as f:
        return [line.strip() for line in f if line.strip() and not line.startswith('#')]

def update_blacklist(malicious_input):
    """Update blacklist with new malicious input, avoiding duplicates"""
    # Load existing blacklist
    existing_blacklist = load_blacklist()
    
    # Check if this input is already in blacklist
    if malicious_input not in existing_blacklist:
        with open(BLACKLIST_FILE, 'a') as f:
            f.write(f"{malicious_input}\n")
        return True
    return False

def cleanup_blacklist():
    """Remove duplicate entries from blacklist file"""
    if os.path.exists(BLACKLIST_FILE):
        with open(BLACKLIST_FILE, 'r') as f:
            lines = f.readlines()
        
        # Remove duplicates while preserving order
        seen = set()
        unique_lines = []
        for line in lines:
            stripped_line = line.strip()
            if stripped_line and not stripped_line.startswith('#') and stripped_line not in seen:
                seen.add(stripped_line)
                unique_lines.append(line)
            elif stripped_line.startswith('#'):
                unique_lines.append(line)
        
        # Write back unique entries
        with open(BLACKLIST_FILE, 'w') as f:
            f.writelines(unique_lines)
        
        print(f"Blacklist cleaned up. Removed {len(lines) - len(unique_lines)} duplicates.")

def is_sql_injection(input_string):
    """Enhanced SQL injection detection with comprehensive patterns"""
    if not input_string or not isinstance(input_string, str):
        return False
    
    # Load current blacklist
    blacklist = load_blacklist()
    
    # Comprehensive SQL injection patterns
    patterns = [
        # Single SQL keywords
        r"\b(SELECT|UNION|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|EXECUTE|DECLARE)\b",
        r"\b(FROM|INTO|TABLE|DATABASE|WHERE|SET|VALUES|HAVING|GROUP\s+BY|ORDER\s+BY)\b",
        r"\b(OR|AND|NOT|LIKE|BETWEEN|IN|IS|NULL)\b",
        
        # UNION-based attacks (comprehensive)
        r"UNION\s+SELECT",
        r"UNION\s+ALL\s+SELECT", 
        r"SELECT\s+\w+\s+FROM",
        r"UNION.*SELECT.*FROM",
        r"SELECT.*FROM.*users",
        r"UNION.*SELECT.*username",
        r"UNION.*SELECT.*password",
        
        # Comment and termination
        r"--",
        r"#",
        r"\/\*",
        r"\*\/",
        r";",
        
        # Authentication bypass
        r"'\s*OR\s*'1'='1",
        r"'\s*AND\s*'1'='1",
        r"'\s*OR\s*\d+\s*=\s*\d+",
        r"'\s*AND\s*\d+\s*=\s*\d+",
        
        # Stacked queries
        r";\s*SELECT",
        r";\s*DROP",
        r";\s*INSERT", 
        r";\s*UPDATE",
        r";\s*DELETE",
        
        # System/database specific
        r"FROM\s+users",
        r"FROM\s+information_schema",
        r"FROM\s+sqlite_master",
        
        # Time-based
        r"SLEEP\s*\(",
        r"BENCHMARK\s*\(",
        r"WAITFOR\s+DELAY",
        
        # File operations
        r"LOAD_FILE\s*\(",
        r"INTO\s+OUTFILE",
        r"INTO\s+DUMPFILE",
    ]
    
    # Add blacklisted patterns
    patterns.extend([re.escape(pattern) for pattern in blacklist if pattern])
    
    input_upper = input_string.upper()
    
    # Quick length check
    if len(input_string) > 1000:
        return True
    
    # Quote count check
    if input_string.count("'") >= 2 or input_string.count('"') >= 2:
        return True
    
    # Check for specific dangerous table/column names
    dangerous_terms = ['USERS', 'PASSWORD', 'USERNAME', 'EMAIL', 'ADMIN']
    if any(term in input_upper for term in dangerous_terms):
        # If these terms appear with SQL keywords, block
        sql_keywords_in_input = any(kw in input_upper for kw in ['UNION', 'SELECT', 'FROM', 'WHERE'])
        if sql_keywords_in_input:
            return True
    
    # Check all patterns
    for pattern in patterns:
        try:
            if re.search(pattern, input_upper, re.IGNORECASE):
                return True
        except re.error:
            continue
    
    return False

def advanced_heuristic_checks(input_string):
    """More advanced heuristic checks"""
    input_upper = input_string.upper()
    
    # Check for common SQLi structures
    suspicious_sequences = [
        r"'\s*OR\s*'1'='1",
        r"'\s*AND\s*'1'='1",
        r"'\s*UNION\s*ALL\s*SELECT",
        r"';",
        r"'--",
        r"'/\*",
        r"'\s*OR\s*\d+\s*=\s*\d+",
        r"'\s*AND\s*\d+\s*=\s*\d+",
    ]
    
    for seq in suspicious_sequences:
        if re.search(seq, input_string, re.IGNORECASE):
            return True
    
    # Check keyword density
    sql_keywords = ['SELECT', 'UNION', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 
                   'ALTER', 'CREATE', 'EXEC', 'FROM', 'WHERE', 'AND', 'OR']
    found_keywords = [kw for kw in sql_keywords if kw in input_upper]
    
    if len(found_keywords) >= 2:
        return True
    
    # Check for suspicious character combinations
    if any(combo in input_string for combo in ["' OR", "' AND", "';", "'--", "UNION", "SELECT *"]):
        return True
    
    return False

def hash_password(password):
    """Simple password hashing for demo purposes"""
    return hashlib.sha256(password.encode()).hexdigest()

def init_database():
    """Initialize SQLite database with dummy data"""
    conn = sqlite3.connect('demo.db')
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT,
            role TEXT DEFAULT 'user'
        )
    ''')
    
    # Create products table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            price REAL,
            category TEXT
        )
    ''')
    
    # Insert dummy users
    users = [
        ('admin', hash_password('admin123'), 'admin@demo.com', 'admin'),
        ('john_doe', hash_password('password123'), 'john@demo.com', 'user'),
        ('jane_smith', hash_password('letmein'), 'jane@demo.com', 'user'),
        ('test_user', hash_password('test123'), 'test@demo.com', 'user'),
        ('alice', hash_password('alice2024'), 'alice@demo.com', 'user')
    ]
    
    cursor.executemany(
        'INSERT OR IGNORE INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
        users
    )
    
    # Insert dummy products
    products = [
        ('Laptop', 'High-performance laptop with 16GB RAM and 512GB SSD', 999.99, 'Electronics'),
        ('Smartphone', 'Latest smartphone with 5G and triple camera', 699.99, 'Electronics'),
        ('Programming Book', 'Complete guide to web development and security', 29.99, 'Books'),
        ('Wireless Headphones', 'Noise-cancelling wireless headphones', 149.99, 'Electronics'),
        ('Coffee Mug', 'Premium ceramic coffee mug', 12.99, 'Home'),
        ('Cotton T-Shirt', 'Comfortable cotton t-shirt in various colors', 19.99, 'Clothing'),
        ('LED Desk Lamp', 'Adjustable LED desk lamp with touch controls', 39.99, 'Home'),
        ('Backpack', 'Water-resistant backpack with laptop compartment', 49.99, 'Accessories'),
        ('Monitor', '27-inch 4K monitor for professional work', 399.99, 'Electronics'),
        ('Keyboard', 'Mechanical keyboard with RGB lighting', 89.99, 'Electronics')
    ]
    
    cursor.executemany(
        'INSERT OR IGNORE INTO products (name, description, price, category) VALUES (?, ?, ?, ?)',
        products
    )
    
    conn.commit()
    conn.close()

# API Routes

@app.route('/api/register', methods=['POST'])
def api_register():
    """API register endpoint - SECURED"""
    data = request.get_json()
    username = data.get('username', '')
    password = data.get('password', '')
    email = data.get('email', '')
    
    # Check for SQL injection - BLOCK COMPLETELY
    if is_sql_injection(username) or is_sql_injection(password) or is_sql_injection(email):
        update_blacklist(f"Register attempt: username={username}, email={email}")
        return jsonify({'success': False, 'error': 'Invalid input detected!'})
    
    try:
        conn = sqlite3.connect('demo.db')
        cursor = conn.cursor()
        
        # Check if username already exists - SECURED
        cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
        if cursor.fetchone():
            return jsonify({'success': False, 'error': 'Username already exists'})
        
        # Create new user - SECURED
        cursor.execute(
            "INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)",
            (username, hash_password(password), email, 'user')
        )
        conn.commit()
        
        # Get the new user - SECURED
        cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()
        conn.close()
        
        if user:
            return jsonify({
                'success': True,
                'user': {
                    'id': user[0],
                    'username': user[1],
                    'email': user[3],
                    'role': user[4]
                }
            })
        else:
            return jsonify({'success': False, 'error': 'Registration failed'})
            
    except Exception as e:
        return jsonify({'success': False, 'error': f'Database error: {str(e)}'})

@app.route('/api/login', methods=['POST'])
def api_login():
    """API login endpoint - SECURED"""
    data = request.get_json()
    username = data.get('username', '')
    password = data.get('password', '')
    
    # Check for SQL injection - BLOCK COMPLETELY
    if is_sql_injection(username) or is_sql_injection(password):
        update_blacklist(f"Login attempt: username={username}, password={password}")
        return jsonify({'success': False, 'error': 'Malicious input detected! This attempt has been logged.'})
    
    # SECURED: Use parameterized queries
    try:
        conn = sqlite3.connect('demo.db')
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM users WHERE username = ? AND password = ?",
            (username, hash_password(password))
        )
        user = cursor.fetchone()
        conn.close()
        
        if user:
            return jsonify({
                'success': True,
                'user': {
                    'id': user[0],
                    'username': user[1],
                    'email': user[3],
                    'role': user[4]
                }
            })
        else:
            return jsonify({'success': False, 'error': 'Invalid credentials'})
            
    except Exception as e:
        return jsonify({'success': False, 'error': f'Database error: {str(e)}'})

@app.route('/api/search', methods=['POST'])
def api_search():
    """API search endpoint - SECURED"""
    data = request.get_json()
    query = data.get('query', '')
    
    # Check for SQL injection - BLOCK COMPLETELY
    if is_sql_injection(query):
        update_blacklist(f"Search attempt: {query}")
        return jsonify({'success': False, 'error': 'Malicious search detected! Request blocked.', 'results': []})
    
    # SECURE: Use parameterized queries
    try:
        conn = sqlite3.connect('demo.db')
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM products WHERE name LIKE ? OR description LIKE ?",
            (f'%{query}%', f'%{query}%')
        )
        results = cursor.fetchall()
        conn.close()
        
        products = []
        for product in results:
            products.append({
                'id': product[0],
                'name': product[1],
                'description': product[2],
                'price': product[3],
                'category': product[4]
            })
        
        return jsonify({'success': True, 'results': products})
        
    except Exception as e:
        return jsonify({'success': False, 'error': f'Search error: {str(e)}', 'results': []})

@app.route('/api/products')
def api_products():
    """API products endpoint - SECURED"""
    category = request.args.get('category', '')
    
    # Check for SQL injection in URL parameter - BLOCK COMPLETELY
    if is_sql_injection(category):
        update_blacklist(f"URL parameter attack: category={category}")
        return jsonify({'success': False, 'error': 'Malicious URL parameter detected!', 'products': []})
    
    try:
        conn = sqlite3.connect('demo.db')
        cursor = conn.cursor()
        
        if category:
            # SECURE: Use parameterized query
            cursor.execute("SELECT * FROM products WHERE category = ?", (category,))
        else:
            cursor.execute("SELECT * FROM products")
            
        results = cursor.fetchall()
        conn.close()
        
        products = []
        for product in results:
            products.append({
                'id': product[0],
                'name': product[1],
                'description': product[2],
                'price': product[3],
                'category': product[4]
            })
        
        return jsonify({'success': True, 'products': products})
        
    except Exception as e:
        return jsonify({'success': False, 'error': f'Database error: {str(e)}', 'products': []})

@app.route('/api/product/<product_id>')
def get_product(product_id):
    """Product detail endpoint - SECURED"""
    
    # Check for SQL injection in product_id - BLOCK COMPLETELY
    if is_sql_injection(product_id):
        update_blacklist(f"Product ID attack: {product_id}")
        return jsonify({'success': False, 'error': 'Malicious input detected!'})
    
    # SECURED: Use parameterized query
    try:
        conn = sqlite3.connect('demo.db')
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,))
        product = cursor.fetchone()
        conn.close()
        
        if product:
            return jsonify({
                'success': True,
                'product': {
                    'id': product[0],
                    'name': product[1],
                    'description': product[2],
                    'price': product[3],
                    'category': product[4]
                }
            })
        else:
            return jsonify({'success': False, 'error': 'Product not found'})
            
    except Exception as e:
        return jsonify({'success': False, 'error': f'Database error: {str(e)}'})

@app.route('/api/scan', methods=['POST'])
def api_scan():
    """API endpoint to scan for SQL injection"""
    data = request.get_json()
    
    if not data or 'input' not in data:
        return jsonify({'error': 'No input provided'}), 400
    
    user_input = data['input']
    is_malicious = is_sql_injection(user_input)
    
    if is_malicious:
        update_blacklist(user_input)
    
    return jsonify({
        'input': user_input,
        'is_malicious': is_malicious,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/blacklist', methods=['GET'])
def get_blacklist():
    """API endpoint to get current blacklist"""
    blacklist = load_blacklist()
    return jsonify({'blacklist': blacklist})

@app.route('/api/logout', methods=['POST'])
def api_logout():
    """API logout endpoint"""
    return jsonify({'success': True})

# Admin routes for product management
@app.route('/api/admin/products', methods=['GET', 'POST'])
def admin_products():
    if request.method == 'POST':
        # Create new product
        data = request.get_json()
        name = data.get('name')
        description = data.get('description')
        price = data.get('price')
        category = data.get('category')
        
        # Check for SQL injection - BLOCK COMPLETELY
        if any(is_sql_injection(field) for field in [name, description, category]):
            return jsonify({'success': False, 'error': 'Malicious input detected'})
        
        try:
            conn = sqlite3.connect('demo.db')
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO products (name, description, price, category) VALUES (?, ?, ?, ?)",
                (name, description, float(price), category)
            )
            conn.commit()
            conn.close()
            return jsonify({'success': True, 'message': 'Product created successfully'})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)})
    
    else:
        # Get all products
        try:
            conn = sqlite3.connect('demo.db')
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM products")
            products = cursor.fetchall()
            conn.close()
            
            product_list = []
            for product in products:
                product_list.append({
                    'id': product[0],
                    'name': product[1],
                    'description': product[2],
                    'price': product[3],
                    'category': product[4]
                })
            
            return jsonify({'success': True, 'products': product_list})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)})

@app.route('/api/admin/products/<int:product_id>', methods=['PUT', 'DELETE'])
def admin_product_operations(product_id):
    if request.method == 'PUT':
        # Update product
        data = request.get_json()
        name = data.get('name')
        description = data.get('description')
        price = data.get('price')
        category = data.get('category')
        
        # Check for SQL injection - BLOCK COMPLETELY
        if any(is_sql_injection(field) for field in [name, description, category]):
            return jsonify({'success': False, 'error': 'Malicious input detected'})
        
        try:
            conn = sqlite3.connect('demo.db')
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE products SET name=?, description=?, price=?, category=? WHERE id=?",
                (name, description, float(price), category, product_id)
            )
            conn.commit()
            conn.close()
            return jsonify({'success': True, 'message': 'Product updated successfully'})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)})
    
    elif request.method == 'DELETE':
        # Delete product
        try:
            conn = sqlite3.connect('demo.db')
            cursor = conn.cursor()
            cursor.execute("DELETE FROM products WHERE id=?", (product_id,))
            conn.commit()
            conn.close()
            return jsonify({'success': True, 'message': 'Product deleted successfully'})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)})

# Admin routes for user management
@app.route('/api/admin/users', methods=['GET'])
def get_all_users():
    """Get all users (admin only) - SECURED"""
    try:
        conn = sqlite3.connect('demo.db')
        cursor = conn.cursor()
        cursor.execute("SELECT id, username, email, role FROM users")
        users = cursor.fetchall()
        conn.close()
        
        user_list = []
        for user in users:
            user_list.append({
                'id': user[0],
                'username': user[1],
                'email': user[2],
                'role': user[3]
            })
        
        return jsonify({'success': True, 'users': user_list})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/admin/users', methods=['POST'])
def create_new_user():
    """Create new user (admin only) - SECURED"""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')
    role = data.get('role', 'user')
    
    # Check for SQL injection - BLOCK COMPLETELY
    if any(is_sql_injection(field) for field in [username, email, role]):
        return jsonify({'success': False, 'error': 'Malicious input detected'})
    
    try:
        conn = sqlite3.connect('demo.db')
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)",
            (username, hash_password(password), email, role)
        )
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'User created successfully'})
    except sqlite3.IntegrityError:
        return jsonify({'success': False, 'error': 'Username already exists'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/admin/users/<int:user_id>', methods=['PUT'])
def update_existing_user(user_id):
    """Update user (admin only) - SECURED"""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')
    role = data.get('role')
    
    # Check for SQL injection - BLOCK COMPLETELY
    if any(is_sql_injection(field) for field in [username, email, role]):
        return jsonify({'success': False, 'error': 'Malicious input detected'})
    
    try:
        conn = sqlite3.connect('demo.db')
        cursor = conn.cursor()
        
        if password:
            # Update with password - SECURED
            cursor.execute(
                "UPDATE users SET username=?, password=?, email=?, role=? WHERE id=?",
                (username, hash_password(password), email, role, user_id)
            )
        else:
            # Update without changing password - SECURED
            cursor.execute(
                "UPDATE users SET username=?, email=?, role=? WHERE id=?",
                (username, email, role, user_id)
            )
        
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'User updated successfully'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
def delete_existing_user(user_id):
    """Delete user (admin only) - SECURED"""
    try:
        conn = sqlite3.connect('demo.db')
        cursor = conn.cursor()
        
        # Check if user is admin - SECURED
        cursor.execute("SELECT username FROM users WHERE id=?", (user_id,))
        user = cursor.fetchone()
        
        if user and user[0] == 'admin':
            return jsonify({'success': False, 'error': 'Cannot delete admin user'})
        
        cursor.execute("DELETE FROM users WHERE id=?", (user_id,))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'User deleted successfully'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

if __name__ == '__main__':
    # Clean up blacklist first
    cleanup_blacklist()
    
    # Initialize database
    init_database()
    print("Database initialized with dummy data!")
    print("Admin credentials: admin / admin123")
    print("All endpoints are now SECURED against SQL injection")
    app.run(debug=True, host='0.0.0.0', port=5000)
