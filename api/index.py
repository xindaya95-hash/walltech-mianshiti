import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime
import database

app = Flask(__name__, static_folder='../crm-public')
CORS(app)

@app.route('/api/health')
def health():
    return jsonify({"database": "SQLite", "status": "ok", "timestamp": datetime.now().isoformat()})

@app.route('/api/customers')
def get_customers():
    try:
        return jsonify({"success": True, "data": database.get_all_customers()})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    user = database.verify_user(data.get('username', ''), data.get('password', ''))
    if user:
        return jsonify({"success": True, "user": user})
    return jsonify({"success": False, "error": "Invalid credentials"}), 401

@app.route('/api/customers', methods=['POST'])
def add_customer():
    try:
        return jsonify({"success": True, "id": database.add_customer(request.get_json())})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/')
def index():
    return app.send_static_file('index.html')

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 3002)), debug=False)
