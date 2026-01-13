from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt_identity
)
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
from waf import waf_inspect_request

# ======================
# APP INIT
# ======================
app = Flask(__name__)

# CORS configuration for React frontend on port 3000
CORS(app, 
     origins=["http://localhost:3000", "http://127.0.0.1:3000"],
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization", "X-Request-Fingerprint", "X-WAF-Alert"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

app.config["JWT_SECRET_KEY"] = "super-secret-key"
jwt = JWTManager(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "demo.db")

# ======================
# DATABASE CONNECTION
# ======================
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# ======================
# INITIALIZE DATABASE
# ======================
def init_database():
    if not os.path.exists(DB_PATH):
        print(f"Creating database at {DB_PATH}")
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Create users table
        cursor.execute('''
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                email TEXT,
                role TEXT DEFAULT 'user'
            )
        ''')
        
        # Create products table
        cursor.execute('''
            CREATE TABLE products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                price REAL,
                category TEXT
            )
        ''')
        
        # Insert admin user
        admin_hash = generate_password_hash('admin123')
        cursor.execute(
            "INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)",
            ('admin', admin_hash, 'admin@demo.com', 'admin')
        )
        
        # Insert regular user
        user_hash = generate_password_hash('password123')
        cursor.execute(
            "INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)",
            ('john_doe', user_hash, 'john@demo.com', 'user')
        )
        
        # Insert sample products
        products = [
            ('Laptop', 'High-performance laptop', 999.99, 'Electronics'),
            ('Smartphone', 'Latest smartphone', 699.99, 'Electronics'),
            ('Headphones', 'Wireless headphones', 149.99, 'Electronics'),
            ('Coffee Mug', 'Ceramic coffee mug', 12.99, 'Home'),
            ('T-Shirt', 'Cotton t-shirt', 19.99, 'Clothing')
        ]
        
        for product in products:
            cursor.execute(
                "INSERT INTO products (name, description, price, category) VALUES (?, ?, ?, ?)",
                product
            )
        
        conn.commit()
        conn.close()
        print("Database initialized successfully!")
    else:
        print(f"Database already exists at {DB_PATH}")

# Initialize database
init_database()

# ======================
# HELPER FUNCTIONS
# ======================
def admin_required():
    identity = get_jwt_identity()
    if not identity or identity.get("role") != "admin":
        return jsonify({"error": "Admin access required"}), 403
    return None

# ======================
# CORS PRE-FLIGHT HANDLER & WAF
# ======================
@app.before_request
def handle_cors_and_waf():
    # Run WAF inspection
    waf_result = waf_inspect_request()
    if waf_result:
        return waf_result

    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers["Access-Control-Allow-Origin"] = "http://localhost:3000"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Request-Fingerprint, X-WAF-Alert"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        return response

# ======================
# AUTH ROUTES
# ======================
@app.route("/api/login", methods=["POST", "OPTIONS"])
def login():
    try:
        if request.method == "OPTIONS":
            return jsonify({"status": "ok"})
            
        if not request.is_json:
            return jsonify({"error": "Missing JSON in request"}), 400
            
        data = request.get_json()
        username = data.get("username", "").strip()
        password = data.get("password", "").strip()
        
        print(f"🔐 Login attempt - Username: '{username}'")
        
        if not username or not password:
            return jsonify({"error": "Username and password required"}), 400
        
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE username = ?", (username,))
        user = cur.fetchone()
        conn.close()
        
        if not user:
            print(f"[ERROR] User '{username}' not found")
            return jsonify({"error": "Invalid credentials"}), 401

        print(f"[OK] User found: {user['username']}")

        if check_password_hash(user["password"], password):
            print(f"[OK] Password correct for {username}")
            token = create_access_token(identity={
                "id": user["id"],
                "username": user["username"],
                "role": user["role"]
            })
            return jsonify({
                "success": True,
                "token": token,
                "user": {
                    "id": user["id"],
                    "username": user["username"],
                    "role": user["role"]
                }
            })
        else:
            print(f"[ERROR] Password incorrect for {username}")
            return jsonify({"error": "Invalid credentials"}), 401

    except Exception as e:
        print(f"[ERROR] Login error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/register", methods=["POST", "OPTIONS"])
def register():
    try:
        if request.method == "OPTIONS":
            return jsonify({"status": "ok"})
            
        data = request.get_json()
        username = data.get("username", "").strip()
        password = data.get("password", "").strip()
        email = data.get("email", "")
        
        print(f"[INFO] Registration attempt - Username: '{username}'")

        if not username or not password:
            return jsonify({"error": "Username and password required"}), 400

        if len(password) < 3:
            return jsonify({"error": "Password too short"}), 400

        hashed_pw = generate_password_hash(password)

        conn = get_db()
        cur = conn.cursor()

        try:
            cur.execute(
                "INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)",
                (username, hashed_pw, email, "user")
            )
            conn.commit()
            print(f"[OK] User registered: {username}")
            return jsonify({
                "success": True,
                "message": "User registered successfully"
            }), 201

        except sqlite3.IntegrityError:
            return jsonify({"error": "Username already exists"}), 409
        finally:
            conn.close()

    except Exception as e:
        print(f"[ERROR] Registration error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/auth/me", methods=["GET", "OPTIONS"])
@jwt_required()
def me():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"})
    return jsonify(get_jwt_identity())

# ======================
# PRODUCT ROUTES
# ======================
@app.route("/api/products", methods=["GET", "OPTIONS"])
def get_products():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"})
        
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM products")
    products = [dict(row) for row in cur.fetchall()]
    conn.close()
    return jsonify(products)

@app.route("/api/products/<int:pid>", methods=["GET", "OPTIONS"])
def get_product(pid):
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"})
        
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM products WHERE id = ?", (pid,))
    product = cur.fetchone()
    conn.close()

    if not product:
        return jsonify({"error": "Product not found"}), 404

    return jsonify(dict(product))

@app.route("/api/search", methods=["POST", "OPTIONS"])
def search_products():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"})
        
    try:
        data = request.get_json()
        query = data.get("query", "").strip()
        
        if not query:
            return jsonify([])
        
        conn = get_db()
        cur = conn.cursor()
        
        cur.execute(
            "SELECT * FROM products WHERE name LIKE ? OR description LIKE ?",
            (f'%{query}%', f'%{query}%')
        )
        
        products = [dict(row) for row in cur.fetchall()]
        conn.close()
        
        return jsonify(products)
        
    except Exception as e:
        print(f"Search error: {str(e)}")
        return jsonify({"error": "Search failed"}), 500

# ======================
# ADMIN ROUTES
# ======================
@app.route("/api/admin/users", methods=["POST", "OPTIONS"])
@jwt_required()
def admin_create_user():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"})
        
    guard = admin_required()
    if guard:
        return guard

    try:
        data = request.get_json()
        username = data.get("username", "").strip()
        password = data.get("password", "").strip()
        email = data.get("email", "")
        role = data.get("role", "user")
        
        if not username or not password:
            return jsonify({"error": "Username and password required"}), 400
        
        hashed_pw = generate_password_hash(password)
        
        conn = get_db()
        cur = conn.cursor()
        
        try:
            cur.execute(
                "INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)",
                (username, hashed_pw, email, role)
            )
            conn.commit()
            return jsonify({"message": "User created successfully"}), 201
        except sqlite3.IntegrityError:
            return jsonify({"error": "Username already exists"}), 409
        finally:
            conn.close()
            
    except Exception as e:
        print(f"Admin create user error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/admin/users/<int:uid>", methods=["PUT", "OPTIONS"])
@jwt_required()
def admin_update_user(uid):
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"})
        
    guard = admin_required()
    if guard:
        return guard

    try:
        data = request.get_json()
        
        conn = get_db()
        cur = conn.cursor()
        
        # Check if user exists
        cur.execute("SELECT * FROM users WHERE id = ?", (uid,))
        if not cur.fetchone():
            conn.close()
            return jsonify({"error": "User not found"}), 404
        
        # Update user
        update_fields = []
        update_values = []
        
        if "username" in data:
            update_fields.append("username = ?")
            update_values.append(data["username"])
        
        if "email" in data:
            update_fields.append("email = ?")
            update_values.append(data["email"])
        
        if "role" in data:
            update_fields.append("role = ?")
            update_values.append(data["role"])
        
        if "password" in data and data["password"]:
            update_fields.append("password = ?")
            update_values.append(generate_password_hash(data["password"]))
        
        if not update_fields:
            conn.close()
            return jsonify({"error": "No fields to update"}), 400
        
        update_values.append(uid)
        query = f"UPDATE users SET {', '.join(update_fields)} WHERE id = ?"
        
        cur.execute(query, update_values)
        conn.commit()
        conn.close()
        
        return jsonify({"message": "User updated"})
        
    except Exception as e:
        print(f"Admin update user error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500
@app.route("/api/admin/users", methods=["GET", "OPTIONS"])
def admin_get_users():
    # NOTE: For this SQL injection demo, we rely on the frontend to restrict
    # access to the admin panel based on the logged-in user role. Removing
    # jwt_required here avoids confusing JWT 4xx errors so the focus stays
    # on the SQLi/WAF behaviour.
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"})

    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, username, email, role FROM users")
    users = [dict(row) for row in cur.fetchall()]
    conn.close()

    return jsonify(users)

@app.route("/api/admin/products", methods=["POST", "OPTIONS"])
@jwt_required()
def admin_create_product():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"})
        
    guard = admin_required()
    if guard:
        return guard

    data = request.get_json()
    
    if not data.get("name") or not data.get("price"):
        return jsonify({"error": "Name and price are required"}), 400

    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO products (name, price, description, category) VALUES (?, ?, ?, ?)",
        (data["name"], data["price"], data.get("description", ""), data.get("category", "General"))
    )
    conn.commit()
    conn.close()

    return jsonify({"message": "Product created"}), 201

@app.route("/api/admin/products/<int:pid>", methods=["PUT", "OPTIONS"])
@jwt_required()
def admin_update_product(pid):
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"})

    guard = admin_required()
    if guard:
        return guard

    try:
        data = request.get_json()

        conn = get_db()
        cur = conn.cursor()

        cur.execute("SELECT * FROM products WHERE id = ?", (pid,))
        if not cur.fetchone():
            conn.close()
            return jsonify({"error": "Product not found"}), 404

        update_fields = []
        update_values = []

        if "name" in data:
            update_fields.append("name = ?")
            update_values.append(data["name"])

        if "description" in data:
            update_fields.append("description = ?")
            update_values.append(data["description"])

        if "price" in data:
            update_fields.append("price = ?")
            update_values.append(data["price"])

        if "category" in data:
            update_fields.append("category = ?")
            update_values.append(data["category"])

        if not update_fields:
            conn.close()
            return jsonify({"error": "No fields to update"}), 400

        update_values.append(pid)
        query = f"UPDATE products SET {', '.join(update_fields)} WHERE id = ?"

        cur.execute(query, update_values)
        conn.commit()
        conn.close()

        return jsonify({"message": "Product updated"})

    except Exception as e:
        print(f"Admin update product error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/admin/products/<int:pid>", methods=["DELETE", "OPTIONS"])
@jwt_required()
def admin_delete_product(pid):
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"})
        
    guard = admin_required()
    if guard:
        return guard

    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM products WHERE id = ?", (pid,))
    conn.commit()
    conn.close()

    return jsonify({"message": "Product deleted"})

# ======================
# TEST ROUTES
# ======================
@app.route("/api/test-db", methods=["GET", "OPTIONS"])
def test_db():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"})
        
    try:
        conn = get_db()
        cur = conn.cursor()
        
        cur.execute("SELECT COUNT(*) as count FROM users")
        user_count = cur.fetchone()["count"]
        
        cur.execute("SELECT username, role FROM users")
        users = cur.fetchall()
        
        cur.execute("SELECT COUNT(*) as count FROM products")
        product_count = cur.fetchone()["count"]
        
        conn.close()
        
        return jsonify({
            "database": DB_PATH,
            "database_exists": os.path.exists(DB_PATH),
            "users_count": user_count,
            "users": [dict(user) for user in users],
            "products_count": product_count,
            "status": "ok"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ======================
# HEALTH CHECK
# ======================
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy", "service": "sql_demo_api"})

# ======================
# MAIN
# ======================
if __name__ == "__main__":
    print(f"\n{'='*60}")
    print("SQL Injection Demo - Flask Backend")
    print(f"{'='*60}")
    print(f"Database: {DB_PATH}")
    print(f"Backend API: http://127.0.0.1:5000")
    print(f"Frontend: http://localhost:3000")
    print(f"\nAPI Endpoints:")
    print(f"   POST /api/login          - User login")
    print(f"   POST /api/register       - User registration")
    print(f"   GET  /api/products       - List all products")
    print(f"   GET  /api/admin/users    - Admin: List users (JWT required)")
    print(f"   GET  /api/test-db        - Test database connection")
    print(f"\nTest Credentials:")
    print(f"   Admin:    admin / admin123")
    print(f"   Regular:  john_doe / password123")
    print(f"\nIMPORTANT: Make sure React frontend is running on port 3000")
    print(f"   Run in another terminal: cd frontend && npm start")
    print(f"{'='*60}\n")
    
    app.run(debug=True, host="127.0.0.1", port=5000)