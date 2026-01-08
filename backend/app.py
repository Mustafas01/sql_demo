from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from flask import Blueprint
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
CORS(app)
CORS(app, supports_credentials=True)
app.config["JWT_SECRET_KEY"] = "super-secret-key"  # change in prod
jwt = JWTManager(app)
if not os.path.exists(DB_PATH):
    print(f"Initializing database at {DB_PATH}...")
    # Make sure database.py is in the same directory
    try:
        import database
        database.init_database()
        print("Database initialized successfully!")
    except ImportError as e:
        print(f"Error importing database module: {e}")
    except Exception as e:
        print(f"Error initializing database: {e}")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "demo.db")
# ======================
# API BLUEPRINT
# ======================
api = Blueprint('api', __name__, url_prefix='/api')

@api.route("/login", methods=["POST"])
def api_login():
    data = request.get_json()

    username = data.get("username")
    password = data.get("password")

    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE username = ?", (username,))
    user = cur.fetchone()
    conn.close()

    if not user or not check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_access_token(identity={
        "id": user["id"],
        "username": user["username"],
        "role": user["role"]
    })

    return jsonify({"token": token})

# Register the blueprint
app.register_blueprint(api)
# ======================
# DATABASE
# ======================
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# ======================
# WAF MIDDLEWARE
# ======================
@app.before_request
def run_waf():
    result = waf_inspect_request()
    if result:
        return result

# ======================
# HELPERS
# ======================
def admin_required():
    identity = get_jwt_identity()
    if not identity or identity.get("role") != "admin":
        return jsonify({"error": "Admin access required"}), 403
    return None

# ======================
# AUTH
# ======================
@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Missing fields"}), 400

    hashed_pw = generate_password_hash(password)

    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute(
            "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
            (username, hashed_pw, "user")
        )
        conn.commit()
    except sqlite3.IntegrityError:
        return jsonify({"error": "User already exists"}), 409
    finally:
        conn.close()

    return jsonify({"message": "User registered"}), 201


# ======================
# CORS PRE-FLIGHT HANDLER 
#=======================

@app.before_request
def handle_options():
    if request.method == "OPTIONS":
        response = app.make_response("")
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        return response

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    username = data.get("username")
    password = data.get("password")

    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE username = ?", (username,))
    user = cur.fetchone()
    conn.close()

    if not user or not check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid credentials"}), 401

    # 🔑 FIXED JWT IDENTITY
    token = create_access_token(identity={
        "id": user["id"],
        "username": user["username"],
        "role": user["role"]
    })

    return jsonify({"token": token})


@app.route("/auth/me", methods=["GET"])
@jwt_required()
def me():
    return jsonify(get_jwt_identity())

# ======================
# PRODUCTS (PUBLIC)
# ======================
@app.route("/products", methods=["GET"])
def get_products():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM products")
    products = [dict(row) for row in cur.fetchall()]
    conn.close()
    return jsonify(products)


@app.route("/products/<int:pid>", methods=["GET"])
def get_product(pid):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM products WHERE id = ?", (pid,))
    product = cur.fetchone()
    conn.close()

    if not product:
        return jsonify({"error": "Product not found"}), 404

    return jsonify(dict(product))

# ======================
# ADMIN – USERS
# ======================
@app.route("/admin/users", methods=["GET"])
@jwt_required()
def admin_get_users():
    guard = admin_required()
    if guard:
        return guard

    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, username, role FROM users")
    users = [dict(row) for row in cur.fetchall()]
    conn.close()

    return jsonify(users)

# ======================
# ADMIN – PRODUCTS
# ======================
@app.route("/admin/products", methods=["POST"])
@jwt_required()
def admin_create_product():
    guard = admin_required()
    if guard:
        return guard

    data = request.get_json()

    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO products (name, price, description) VALUES (?, ?, ?)",
        (data["name"], data["price"], data.get("description"))
    )
    conn.commit()
    conn.close()

    return jsonify({"message": "Product created"}), 201


@app.route("/admin/products/<int:pid>", methods=["DELETE"])
@jwt_required()
def admin_delete_product(pid):
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
if not os.path.exists("demo.db"):
    print("Initializing database...")
    import database
    database.init_database()
# ======================
# MAIN
# ======================
if __name__ == "__main__":
    app.run(debug=True)
