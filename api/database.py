import sqlite3
import hashlib
from datetime import datetime
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'crm.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL,
            name TEXT
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            company TEXT,
            status TEXT DEFAULT '潜在客户',
            owner_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (owner_id) REFERENCES users(id)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS interactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER,
            type TEXT,
            content TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id)
        )
    ''')

    try:
        cursor.execute("INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)",
                      ('admin', hashlib.md5('admin123'.encode()).hexdigest(), '管理员', '管理员'))
        cursor.execute("INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)",
                      ('zhangsan', hashlib.md5('123456'.encode()).hexdigest(), '销售', '张三'))
    except:
        pass
    conn.commit()
    conn.close()

def verify_user(username, password):
    conn = get_db_connection()
    cursor = conn.cursor()
    password_hash = hashlib.md5(password.encode()).hexdigest()
    cursor.execute("SELECT * FROM users WHERE username = ? AND password = ?",
                  (username, password_hash))
    user = cursor.fetchone()
    conn.close()
    if user:
        return {"id": user[0], "username": user[1], "role": user[3], "name": user[4]}
    return None

def get_all_customers():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM customers ORDER BY created_at DESC')
    customers = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return customers

def add_customer(data):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO customers (name, phone, email, company, status, owner_id)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (data.get('name'), data.get('phone'), data.get('email'),
          data.get('company'), data.get('status', '潜在客户'), data.get('owner_id')))
    conn.commit()
    customer_id = cursor.lastrowid
    conn.close()
    return customer_id

init_db()
