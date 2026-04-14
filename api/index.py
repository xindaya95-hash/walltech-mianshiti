from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import sqlite3
import hashlib
from datetime import datetime

app = Flask(__name__)
CORS(app)

@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "timestamp": datetime.now().isoformat()})

@app.route("/api/customers", methods=["GET"])
def get_customers():
    try:
        conn = sqlite3.connect("crm.db")
        conn.row_factory = sqlite3.Row
        customers = [dict(row) for row in conn.execute("SELECT * FROM customers")]
        conn.close()
        return jsonify({"success": True, "data": customers})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        conn = sqlite3.connect("crm.db")
        conn.row_factory = sqlite3.Row
        password_hash = hashlib.md5(data.get("password", "").encode()).hexdigest()
        user = conn.execute("SELECT * FROM users WHERE username = ? AND password = ?",
                          (data.get("username"), password_hash)).fetchone()
        conn.close()
        if user:
            return jsonify({"success": True, "user": dict(user)})
        return jsonify({"success": False, "error": "Invalid credentials"}), 401
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/")
def index():
    with open("static/index.html", "r", encoding="utf-8") as f:
        return f.read()
