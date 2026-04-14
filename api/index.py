from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import hashlib
import urllib.request
import urllib.parse
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Supabase 配置
SUPABASE_URL = "https://ofafepulhajvmbosmmqt.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("DATABASE_URL")

def supabase_query(table, filters=None):
    """使用 Supabase REST API 查询数据"""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    if filters:
        query = urllib.parse.urlencode(filters)
        url = f"{url}?{query}"
    
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        return None

def supabase_rpc(func_name, params):
    """调用 Supabase RPC 函数"""
    url = f"{SUPABASE_URL}/rest/v1/rpc/{func_name}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
    data = json.dumps(params).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        return None

@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "timestamp": datetime.now().isoformat()})

@app.route("/api/customers", methods=["GET"])
def get_customers():
    try:
        customers = supabase_query("customers")
        if customers is None:
            return jsonify({"success": False, "error": "Failed to fetch customers"}), 500
        return jsonify({"success": True, "data": customers})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        password_hash = hashlib.md5(data.get("password", "").encode()).hexdigest()
        
        # 使用 Supabase REST API 查询用户
        users = supabase_query("users", {
            "username": f"eq.{data.get('username')}",
            "password": f"eq.{password_hash}"
        })
        
        if users and len(users) > 0:
            user = users[0]
            return jsonify({"success": True, "user": {
                "id": user["id"],
                "username": user["username"],
                "role": user["role"],
                "name": user["name"]
            }})
        return jsonify({"success": False, "error": "Invalid credentials"}), 401
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/")
def index():
    with open("static/index.html", "r", encoding="utf-8") as f:
        return f.read()
