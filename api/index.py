import os
import sys
from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime
import database

app = Flask(__name__, static_folder='../crm-public')
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        "database": "SQLite",
        "status": "ok",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/api/customers', methods=['GET'])
def get_customers():
    try:
        customers = database.get_all_customers()
        return jsonify({"success": True, "data": customers})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username', '')
    password = data.get('password', '')

    user = database.verify_user(username, password)
    if user:
        return jsonify({"success": True, "user": user})
    return jsonify({"success": False, "error": "Invalid credentials"}), 401

@app.route('/api/customers', methods=['POST'])
def add_customer():
    data = request.get_json()
    try:
        customer_id = database.add_customer(data)
        return jsonify({"success": True, "id": customer_id})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/', methods=['GET'])
def index():
    return app.send_static_file('index.html')

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3002))
    app.run(host="0.0.0.0", port=port, debug=False)
