import sqlite3
import hashlib
import os

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

def hash_password(password):
    """Simple password hashing for demo purposes"""
    return hashlib.sha256(password.encode()).hexdigest()

def get_db_connection():
    """Get database connection"""
    return sqlite3.connect('demo.db')
