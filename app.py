import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__, static_folder='static')
CORS(app)

def get_db():
    import sqlite3
    DB_PATH = os.path.join(os.path.dirname(__file__), 'crm.db')
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    import sqlite3, hashlib
    DB_PATH = os.path.join(os.path.dirname(__file__), 'crm.db')
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT, role TEXT, name TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY, name TEXT, phone TEXT, email TEXT, company TEXT,
        status TEXT DEFAULT '潜在客户', owner_id INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    try:
        c.execute("INSERT INTO users VALUES (?, ?, ?, ?, ?)",
            (1, 'admin', hashlib.md5('admin123'.encode()).hexdigest(), '管理员', '管理员'))
        c.execute("INSERT INTO users VALUES (?, ?, ?, ?, ?)",
            (2, 'zhangsan', hashlib.md5('123456'.encode()).hexdigest(), '销售', '张三'))
    except: pass
    conn.commit()
    conn.close()

init_db()

@app.route('/api/health')
def health():
    return jsonify({"database": "SQLite", "status": "ok", "timestamp": datetime.now().isoformat()})

@app.route('/api/customers')
def get_customers():
    try:
        conn = get_db()
        customers = [dict(row) for row in conn.execute('SELECT * FROM customers ORDER BY created_at DESC')]
        conn.close()
        return jsonify({"success": True, "data": customers})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    import hashlib
    data = request.get_json()
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE username = ? AND password = ?",
        (data.get('username'), hashlib.md5(data.get('password','').encode()).hexdigest())).fetchone()
    conn.close()
    if user:
        return jsonify({"success": True, "user": dict(user)})
    return jsonify({"success": False, "error": "Invalid credentials"}), 401

@app.route('/api/customers', methods=['POST'])
def add_customer():
    try:
        data = request.get_json()
        conn = get_db()
        cur = conn.execute("INSERT INTO customers (name, phone, email, company, status) VALUES (?, ?, ?, ?, ?)",
            (data.get('name'), data.get('phone'), data.get('email'), data.get('company'), '潜在客户'))
        conn.commit()
        conn.close()
        return jsonify({"success": True, "id": cur.lastrowid})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/')
def index():
    return app.send_static_file('index.html')
