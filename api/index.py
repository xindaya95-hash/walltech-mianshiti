from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import hashlib
from datetime import datetime
import psycopg2
from urllib.parse import urlparse

app = Flask(__name__)
CORS(app)

# 数据库连接配置
DATABASE_URL = os.environ.get("DATABASE_URL")

def get_db_connection():
    """获取数据库连接"""
    return psycopg2.connect(DATABASE_URL)

@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "timestamp": datetime.now().isoformat()})

@app.route("/api/customers", methods=["GET"])
def get_customers():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id, name, phone, email, company, status, created_at FROM customers")
        columns = [desc[0] for desc in cur.description]
        customers = [dict(zip(columns, row)) for row in cur.fetchall()]
        cur.close()
        conn.close()
        return jsonify({"success": True, "data": customers})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        password_hash = hashlib.md5(data.get("password", "").encode()).hexdigest()
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id, username, role, name FROM users WHERE username = %s AND password = %s",
                   (data.get("username"), password_hash))
        user = cur.fetchone()
        cur.close()
        conn.close()
        if user:
            return jsonify({"success": True, "user": {"id": user[0], "username": user[1], "role": user[2], "name": user[3]}})
        return jsonify({"success": False, "error": "Invalid credentials"}), 401
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/")
def index():
    with open("static/index.html", "r", encoding="utf-8") as f:
        return f.read()
