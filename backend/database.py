import sqlite3
import hashlib
import os

def init_database():
    """Initialize SQLite database with dummy data"""
    # Get the directory where this script is located
    current_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(current_dir, 'demo.db')
    
    conn = sqlite3.connect(db_path)
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
    
    # Insert dummy users (UPDATE THIS to use werkzeug hashing)
    from werkzeug.security import generate_password_hash
    
    users = [
        ('admin', generate_password_hash('admin123'), 'admin@demo.com', 'admin'),
        ('john_doe', generate_password_hash('password123'), 'john@demo.com', 'user'),
        ('jane_smith', generate_password_hash('letmein'), 'jane@demo.com', 'user'),
        ('test_user', generate_password_hash('test123'), 'test@demo.com', 'user'),
        ('alice', generate_password_hash('alice2024'), 'alice@demo.com', 'user')
    ]
    
    cursor.executemany(
        'INSERT OR IGNORE INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
        users
    )
    
    # Insert dummy products
    products = [
        ('Laptop', 'High-performance laptop', 999.99, 'Electronics'),
        ('Smartphone', 'Latest smartphone', 699.99, 'Electronics'),
        ('Book', 'Programming guide', 29.99, 'Books'),
        ('Headphones', 'Wireless headphones', 149.99, 'Electronics'),
        ('Coffee Mug', 'Ceramic coffee mug', 12.99, 'Home'),
        ('T-Shirt', 'Cotton t-shirt', 19.99, 'Clothing'),
        ('Desk Lamp', 'LED desk lamp', 39.99, 'Home')
    ]
    
    cursor.executemany(
        'INSERT OR IGNORE INTO products (name, description, price, category) VALUES (?, ?, ?, ?)',
        products
    )
    
    conn.commit()
    conn.close()
    print(f"Database initialized at: {db_path}")

def get_db_connection():
    """Get database connection"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(current_dir, 'demo.db')
    return sqlite3.connect(db_path)

# Remove the old hash_password function since we're using werkzeug now