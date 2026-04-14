# -*- coding: utf-8 -*-
"""
CRM客户事件跟进模块 - Python后端 (Flask + PostgreSQL + 静态文件服务)
纯Python全栈架构 - Supabase PostgreSQL版
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from flask import Flask, request, jsonify, g, send_from_directory, send_file
from flask_cors import CORS
from datetime import datetime, timedelta, timezone
from dateutil import parser as date_parser
from dateutil import tz as dateutil_tz
import uuid
import json
import os
import hashlib
import psycopg2
from psycopg2.extras import RealDictCursor

from database import get_db, init_db, generate_sample_data, reset_database

# 获取当前目录
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, 'static')

app = Flask(__name__)  # 不设置 static_folder，让 send_file 处理静态文件
CORS(app)

# ==================== 请求前后处理 ====================

def get_db_conn():
    """获取数据库连接"""
    DATABASE_URL = os.environ.get("DATABASE_URL")
    if not DATABASE_URL:
        raise Exception("DATABASE_URL environment variable is not set")
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    conn.autocommit = True
    return conn

# ==================== 工具函数 ====================

def get_user_by_id(user_id):
    """获取用户信息"""
    conn = get_db_conn()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE id = %s', (user_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_user_name(user_id):
    """获取用户名称"""
    user = get_user_by_id(user_id)
    return user['name'] if user else "未知用户"

def get_customer(customer_id):
    """获取客户信息"""
    conn = get_db_conn()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM customers WHERE id = %s', (customer_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_team_members(manager_id):
    """获取团队成员（包括下属）"""
    members = [manager_id]
    conn = get_db_conn()
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM users WHERE manager_id = %s', (manager_id,))
    for row in cursor.fetchall():
        members.append(row['id'])
        members.extend(get_team_members(row['id']))
    conn.close()
    return list(set(members))

def can_access_customer(user_id, customer_id):
    """检查用户是否有权限访问客户"""
    user = get_user_by_id(user_id)
    customer = get_customer(customer_id)

    if not user or not customer:
        return False

    # admin可以访问所有客户
    if user['role'] == 'admin':
        return True

    # manager可以访问所有客户（方便管理）
    if user['role'] == 'manager':
        return True

    # 客户负责人可以访问
    if customer['owner_id'] == user_id:
        return True

    return False

def can_view_user_follow_ups(viewer_id, target_user_id):
    """检查用户是否可以查看目标用户的跟进记录"""
    if viewer_id == target_user_id:
        return True

    viewer = get_user_by_id(viewer_id)
    if not viewer:
        return False

    if viewer['role'] == 'admin':
        return True

    if viewer['role'] == 'manager':
        target = get_user_by_id(target_user_id)
        if target and target.get('manager_id') == viewer_id:
            return True

    return False

def check_duplicate_submission(user_id, customer_id, minutes=5):
    """检查是否重复提交"""
    conn = get_db_conn()
    cursor = conn.cursor()
    time_threshold = (datetime.now() - timedelta(minutes=minutes)).strftime('%Y-%m-%dT%H:%M:%S')
    cursor.execute('''
        SELECT id FROM follow_up_records
        WHERE created_by = %s AND customer_id = %s AND is_deleted = 0 AND created_at > %s
        ORDER BY created_at DESC LIMIT 1
    ''', (user_id, customer_id, time_threshold))
    row = cursor.fetchone()
    conn.close()
    if row:
        return {
            "valid": False,
            "error": "检测到5分钟内已有跟进记录，确认是否重复录入",
            "recent_record_id": row['id']
        }
    return {"valid": True}

def row_to_dict(row):
    """将数据库行转换为字典"""
    if not row:
        return None
    return dict(row)

def parse_json_field(value, default=None):
    """解析JSON字段"""
    if not value:
        return default
    if isinstance(value, (list, dict)):
        return value
    try:
        return json.loads(value)
    except:
        return default

# ==================== 静态文件服务 & API ====================

# API路由必须放在静态文件路由之前！
@app.route("/api/health", methods=["GET"])
def health_check():
    """健康检查"""
    return jsonify({
        "status": "ok",
        "timestamp": datetime.now().strftime('%Y-%m-%dT%H:%M:%S'),
        "database": "SQLite"
    })

@app.route("/")
def serve_index():
    """提供前端页面"""
    response = send_file(os.path.join(STATIC_DIR, 'index.html'))
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@app.route("/check")
def serve_check():
    """提供启动检查页面"""
    return send_file(os.path.join(STATIC_DIR, 'check.html'))

@app.route("/<path:filename>")
def serve_static(filename):
    """提供静态文件"""
    # 排除API路径
    if filename.startswith('api/'):
        return jsonify({"error": "Not found"}), 404
    file_path = os.path.join(STATIC_DIR, filename)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return send_file(file_path)
    # 否则返回 index.html (SPA路由)
    return send_file(os.path.join(STATIC_DIR, 'index.html'))

# ==================== 初始化 ====================

@app.route("/api/init-db", methods=["POST"])
def initialize_database():
    """初始化/重置数据库"""
    action = request.args.get('action', 'init')
    if action == 'reset':
        reset_database()
    else:
        init_db()
        generate_sample_data()
    return jsonify({"message": f"数据库{'重置' if action == 'reset' else '初始化'}完成"})

# ==================== 认证相关 ====================

@app.route("/api/v1/auth/login", methods=["POST"])
def login():
    """用户登录"""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "用户名和密码不能为空"}), 400

    conn = get_db_conn()
    cursor = conn.cursor()
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    cursor.execute(
        'SELECT * FROM users WHERE username = %s AND password_hash = %s AND is_active = 1',
        (username, password_hash)
    )
    user = cursor.fetchone()
    conn.close()

    if not user:
        return jsonify({"error": "用户名或密码错误"}), 401

    user_dict = dict(user)
    del user_dict['password_hash']
    return jsonify(user_dict)

# ==================== 用户相关 ====================

@app.route("/api/v1/crm/users", methods=["GET"])
def get_users():
    """获取用户列表"""
    conn = get_db_conn()
    cursor = conn.cursor()
    cursor.execute('SELECT id, username, name, role, team_id, manager_id, email, phone, avatar, is_active FROM users WHERE is_active = 1')
    users = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(users)

@app.route("/api/v1/crm/users/<user_id>", methods=["GET"])
def get_user_by_id_route(user_id):
    """获取单个用户"""
    user = get_user_by_id(user_id)
    if not user:
        return jsonify({"error": "用户不存在"}), 404
    del user['password_hash']
    return jsonify(user)

@app.route("/api/v1/crm/users/search", methods=["GET"])
def search_users():
    """搜索用户（用于@提及）"""
    query = request.args.get("q", "").lower()
    conn = get_db_conn()
    cursor = conn.cursor()

    if not query:
        cursor.execute('SELECT id, username, name, role, avatar FROM users WHERE is_active = 1')
    else:
        cursor.execute(
            'SELECT id, username, name, role, avatar FROM users WHERE is_active = 1 AND (name LIKE %s OR username LIKE %s)',
            (f'%{query}%', f'%{query}%')
        )

    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(results)

@app.route("/api/v1/crm/users/current", methods=["GET"])
def get_current_user():
    """获取当前用户（默认user-001）"""
    user_id = request.headers.get("X-User-Id", "user-001")
    user = get_user_by_id(user_id)
    if not user:
        return jsonify({"error": "用户不存在"}), 404
    del user['password_hash']
    return jsonify(user)

# ==================== 客户相关 ====================

@app.route("/api/v1/crm/customers", methods=["GET"])
def get_customers():
    """获取客户列表"""
    user_id = request.headers.get("X-User-Id", "user-001")
    user_role = request.headers.get("X-User-Role", "sales")
    conn = get_db_conn()
    cursor = conn.cursor()

    if user_role == "admin":
        cursor.execute('''
            SELECT c.*, u.name as owner_name
            FROM customers c
            LEFT JOIN users u ON c.owner_id = u.id
            WHERE c.status = 'active'
        ''')
    elif user_role == "sales":
        cursor.execute('''
            SELECT c.*, u.name as owner_name
            FROM customers c
            LEFT JOIN users u ON c.owner_id = u.id
            WHERE c.owner_id = %s AND c.status = 'active'
        ''', (user_id,))
    else:
        team_members = get_team_members(user_id)
        placeholders = ','.join(['%s'] * len(team_members))
        cursor.execute(f'''
            SELECT c.*, u.name as owner_name
            FROM customers c
            LEFT JOIN users u ON c.owner_id = u.id
            WHERE c.owner_id IN ({placeholders}) AND c.status = 'active'
        ''', team_members)

    customers = [dict(row) for row in cursor.fetchall()]

    # 为每个客户计算跟进次数、最后跟进时间和热度评分
    for c in customers:
        cursor.execute('''
            SELECT COUNT(*) as cnt, MAX(follow_up_time) as last_time
            FROM follow_up_records
            WHERE customer_id = %s AND is_deleted = 0
        ''', (c['id'],))
        result = cursor.fetchone()
        c['follow_up_count'] = result['cnt'] if result else 0
        c['last_follow_up_time'] = result['last_time'] if result else None

        # 计算热度评分：基于最后跟进时间
        if c['last_follow_up_time']:
            try:
                last_str = c['last_follow_up_time'].replace('Z', '+00:00')
                last = datetime.fromisoformat(last_str)
                # 转换为本地时间比较
                now = datetime.now()
                # 如果last有时区信息，转换本地时间
                if last.tzinfo is not None:
                    last = last.replace(tzinfo=None) - last.utcoffset()
                days_since = (now - last).days
                if days_since <= 3:
                    c['heat_score'] = 90
                elif days_since <= 7:
                    c['heat_score'] = 75
                elif days_since <= 14:
                    c['heat_score'] = 60
                elif days_since <= 30:
                    c['heat_score'] = 40
                else:
                    c['heat_score'] = 20
            except:
                c['heat_score'] = 0
        else:
            c['heat_score'] = 0

    conn.close()
    return jsonify(customers)


@app.route("/api/v1/crm/customers", methods=["POST"])
def create_customer():
    """创建新客户"""
    user_id = request.headers.get("X-User-Id", "user-001")

    data = request.get_json() or {}

    # 必填校验
    required_fields = ["name"]
    for field in required_fields:
        if not data.get(field):
            return jsonify({"error": f"缺少必填字段: {field}"}), 400

    # 生成客户编码
    conn = get_db_conn()
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) as cnt FROM customers')
    count = cursor.fetchone()['cnt']
    customer_code = f"C{datetime.now().year}{str(count + 1).zfill(5)}"

    # 创建客户
    now = datetime.now().strftime('%Y-%m-%dT%H:%M:%S')
    new_id = str(uuid.uuid4())

    cursor.execute('''
        INSERT INTO customers (
            id, customer_code, name, industry, scale, contact_name,
            contact_phone, contact_email, address, owner_id, status,
            source, level, annual_revenue, employee_count, website,
            description, created_at, updated_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    ''', (
        new_id,
        customer_code,
        data.get("name", ""),
        data.get("industry", ""),
        data.get("scale", ""),
        data.get("contact_name", ""),
        data.get("contact_phone", ""),
        data.get("contact_email", ""),
        data.get("address", ""),
        user_id,  # 负责人默认为当前用户
        "active",
        data.get("source", ""),
        data.get("level", "C"),
        data.get("annual_revenue", 0),
        data.get("employee_count", 0),
        data.get("website", ""),
        data.get("description", ""),
        now,
        now
    ))

    # 返回创建的客户
    cursor.execute('SELECT c.*, u.name as owner_name FROM customers c LEFT JOIN users u ON c.owner_id = u.id WHERE c.id = %s', (new_id,))
    customer = dict(cursor.fetchone())
    conn.close()
    return jsonify(customer), 201


@app.route("/api/v1/crm/customers/<customer_id>", methods=["PUT"])
def update_customer(customer_id):
    """更新客户信息"""
    user_id = request.headers.get("X-User-Id", "user-001")
    user_role = request.headers.get("X-User-Role", "sales")

    conn = get_db_conn()
    cursor = conn.cursor()

    # 检查客户是否存在
    cursor.execute('SELECT * FROM customers WHERE id = %s', (customer_id,))
    customer = cursor.fetchone()
    if not customer:
        conn.close()
        return jsonify({"error": "客户不存在"}), 404

    # 权限检查：只有管理员或负责人可以更新
    if user_role != "admin" and customer['owner_id'] != user_id:
        conn.close()
        return jsonify({"error": "无权修改此客户信息"}), 403

    data = request.get_json() or {}

    # 更新客户信息
    now = datetime.now().strftime('%Y-%m-%dT%H:%M:%S')
    cursor.execute('''
        UPDATE customers SET
            name = %s,
            industry = %s,
            scale = %s,
            contact_name = %s,
            contact_phone = %s,
            contact_email = %s,
            address = %s,
            source = %s,
            level = %s,
            annual_revenue = %s,
            employee_count = %s,
            website = %s,
            description = %s,
            updated_at = %s
        WHERE id = %s
    ''', (
        data.get("name", customer['name']),
        data.get("industry", customer['industry']),
        data.get("scale", customer['scale']),
        data.get("contact_name", customer['contact_name']),
        data.get("contact_phone", customer['contact_phone']),
        data.get("contact_email", customer['contact_email']),
        data.get("address", customer['address']),
        data.get("source", customer['source']),
        data.get("level", customer['level']),
        data.get("annual_revenue", customer['annual_revenue']),
        data.get("employee_count", customer['employee_count']),
        data.get("website", customer['website']),
        data.get("description", customer['description']),
        now,
        customer_id
    ))

    # 返回更新后的客户
    cursor.execute('SELECT c.*, u.name as owner_name FROM customers c LEFT JOIN users u ON c.owner_id = u.id WHERE c.id = %s', (customer_id,))
    updated_customer = dict(cursor.fetchone())
    conn.close()
    return jsonify(updated_customer)


@app.route("/api/v1/crm/customers/<customer_id>", methods=["DELETE"])
def delete_customer(customer_id):
    """删除客户（软删除）"""
    user_id = request.headers.get("X-User-Id", "user-001")
    user_role = request.headers.get("X-User-Role", "sales")

    conn = get_db_conn()
    cursor = conn.cursor()

    # 检查客户是否存在
    cursor.execute('SELECT * FROM customers WHERE id = %s AND status = \'active\'', (customer_id,))
    customer = cursor.fetchone()
    if not customer:
        conn.close()
        return jsonify({"error": "客户不存在"}), 404

    # 权限检查：只有管理员或负责人可以删除
    if user_role != "admin" and customer['owner_id'] != user_id:
        conn.close()
        return jsonify({"error": "无权删除此客户"}), 403

    # 软删除：修改状态
    now = datetime.now().strftime('%Y-%m-%dT%H:%M:%S')
    cursor.execute('UPDATE customers SET status = \'deleted\', updated_at = %s WHERE id = %s', (now, customer_id))

    conn.close()
    return jsonify({"message": "客户已删除"})


@app.route("/api/v1/crm/customers/<customer_id>", methods=["GET"])
def get_customer_detail(customer_id):
    """获取客户详情"""
    user_id = request.headers.get("X-User-Id", "user-001")

    if not can_access_customer(user_id, customer_id):
        return jsonify({"error": "无权访问此客户"}), 403

    conn = get_db_conn()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT c.*, u.name as owner_name
        FROM customers c
        LEFT JOIN users u ON c.owner_id = u.id
        WHERE c.id = %s
    ''', (customer_id,))
    customer = cursor.fetchone()

    if not customer:
        conn.close()
        return jsonify({"error": "客户不存在"}), 404

    customer_dict = dict(customer)

    # 获取跟进记录
    cursor.execute('''
        SELECT f.*, u.name as creator_name
        FROM follow_up_records f
        LEFT JOIN users u ON f.created_by = u.id
        WHERE f.customer_id = %s AND f.is_deleted = 0
        ORDER BY f.follow_up_time DESC
    ''', (customer_id,))
    follow_ups = [dict(row) for row in cursor.fetchall()]

    # 解析JSON字段
    for f in follow_ups:
        f['participants'] = parse_json_field(f.get('participants'), [])
        f['attachments'] = parse_json_field(f.get('attachments'), [])
        f['custom_fields'] = parse_json_field(f.get('custom_fields'), {})

    customer_dict['follow_ups'] = follow_ups
    customer_dict['follow_up_count'] = len(follow_ups)
    customer_dict['last_follow_up_time'] = follow_ups[0]['follow_up_time'] if follow_ups else None

    conn.close()
    return jsonify(customer_dict)

# ==================== 跟进记录CRUD ====================

@app.route("/api/v1/crm/customers/<customer_id>/follow-ups", methods=["POST"])
def create_follow_up(customer_id):
    """创建跟进记录"""
    user_id = request.headers.get("X-User-Id", "user-001")
    processing_time = request.headers.get("X-Processing-Time", "0")

    if not can_access_customer(user_id, customer_id):
        return jsonify({"error": "无权在此客户下创建跟进记录"}), 403

    customer = get_customer(customer_id)
    if not customer:
        return jsonify({"error": "客户不存在"}), 404

    data = request.get_json() or {}

    # 必填校验
    required_fields = ["follow_up_type", "follow_up_time", "content"]
    for field in required_fields:
        if not data.get(field):
            return jsonify({"error": f"缺少必填字段: {field}"}), 400

    # 跟进时间校验 - 统一使用naive datetime进行比较
    follow_up_time_str = data["follow_up_time"]
    customer_created_str = customer["created_at"]
    
    # 解析时间并转换为naive datetime（去掉时区信息）
    follow_up_time = date_parser.parse(follow_up_time_str)
    customer_created = date_parser.parse(customer_created_str)
    
    # 移除时区信息，转换为naive datetime
    if follow_up_time.tzinfo is not None:
        follow_up_time = follow_up_time.replace(tzinfo=None) - (follow_up_time.utcoffset() or timedelta(0))
    if customer_created.tzinfo is not None:
        customer_created = customer_created.replace(tzinfo=None) - (customer_created.utcoffset() or timedelta(0))
    
    # 使用naive datetime进行比较
    max_time = datetime.now() + timedelta(days=1)

    if follow_up_time < customer_created:
        return jsonify({"error": "跟进时间不能早于客户创建时间"}), 400

    if follow_up_time > max_time:
        return jsonify({"error": "跟进时间不能晚于当前时间+1天"}), 400

    # 下次提醒时间校验
    if data.get("next_reminder_time"):
        next_reminder = date_parser.parse(data["next_reminder_time"])
        # 移除时区信息
        if next_reminder.tzinfo is not None:
            next_reminder = next_reminder.replace(tzinfo=None) - (next_reminder.utcoffset() or timedelta(0))
        if next_reminder <= follow_up_time:
            return jsonify({"error": "下次提醒时间必须晚于跟进时间"}), 400

    # 上门拜访必须填写地址
    if data["follow_up_type"] == "onsite_visit":
        custom_fields = data.get("custom_fields", {})
        if not custom_fields.get("address"):
            return jsonify({"error": "上门拜访类型必须填写拜访地址"}), 400

    # 防重复校验
    force_submit = data.get("force_submit", False)
    if not force_submit:
        duplicate_check = check_duplicate_submission(user_id, customer_id)
        if not duplicate_check["valid"]:
            return jsonify({
                "error": duplicate_check["error"],
                "is_duplicate": True,
                "recent_record_id": duplicate_check["recent_record_id"]
            }), 409

    # 创建记录
    now = datetime.now().strftime('%Y-%m-%dT%H:%M:%S')
    new_id = str(uuid.uuid4())

    # 将跟进时间转换为naive datetime格式保存（移除时区信息）
    follow_up_time_for_db = date_parser.parse(data["follow_up_time"])
    if follow_up_time_for_db.tzinfo is not None:
        follow_up_time_for_db = follow_up_time_for_db.replace(tzinfo=None) - (follow_up_time_for_db.utcoffset() or timedelta(0))
    follow_up_time_for_db = follow_up_time_for_db.strftime('%Y-%m-%dT%H:%M:%S')

    # 处理下次提醒时间
    next_reminder_for_db = None
    if data.get("next_reminder_time"):
        next_reminder_dt = date_parser.parse(data["next_reminder_time"])
        if next_reminder_dt.tzinfo is not None:
            next_reminder_dt = next_reminder_dt.replace(tzinfo=None) - (next_reminder_dt.utcoffset() or timedelta(0))
        next_reminder_for_db = next_reminder_dt.strftime('%Y-%m-%dT%H:%M:%S')

    conn = get_db_conn()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO follow_up_records (
            id, customer_id, follow_up_type, follow_up_time, created_by,
            participants, content, customer_feedback, next_reminder_time,
            related_opportunity_id, attachments, duration_minutes,
            custom_fields, processing_time, created_at, updated_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    ''', (
        new_id,
        customer_id,
        data["follow_up_type"],
        follow_up_time_for_db,
        user_id,
        json.dumps(data.get("participants", [])),
        data["content"],
        data.get("customer_feedback", ""),
        next_reminder_for_db,
        data.get("related_opportunity_id"),
        json.dumps(data.get("attachments", [])),
        data.get("duration_minutes", 0),
        json.dumps(data.get("custom_fields", {})),
        int(processing_time) if processing_time.isdigit() else 0,
        now,
        now
    ))

    # 如果设置了下次提醒，加入提醒队列
    if next_reminder_for_db:
        cursor.execute('''
            INSERT INTO reminders (id, user_id, customer_id, follow_up_id, title, reminder_time, status, priority)
            VALUES (%s, %s, %s, %s, %s, %s, 'pending', 'normal')
        ''', (
            str(uuid.uuid4()),
            user_id,
            customer_id,
            new_id,
            f"跟进提醒 - {customer['name']}",
            next_reminder_for_db
        ))

    # 返回创建的记录
    cursor.execute('SELECT * FROM follow_up_records WHERE id = %s', (new_id,))
    record = dict(cursor.fetchone())
    record['creator_name'] = get_user_name(user_id)
    conn.close()
    return jsonify(record), 201


@app.route("/api/v1/crm/customers/<customer_id>/follow-ups", methods=["GET"])
def get_follow_ups(customer_id):
    """获取客户的跟进记录列表"""
    user_id = request.headers.get("X-User-Id", "user-001")
    user_role = request.headers.get("X-User-Role", "sales")

    if not can_access_customer(user_id, customer_id):
        return jsonify({"error": "无权访问此客户"}), 403

    # 查询参数
    follow_type = request.args.get("type")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    page = int(request.args.get("page", 1))
    page_size = min(int(request.args.get("page_size", 20)), 100)

    conn = get_db_conn()
    cursor = conn.cursor()

    # 构建查询
    sql = '''
        SELECT f.*, u.name as creator_name
        FROM follow_up_records f
        LEFT JOIN users u ON f.created_by = u.id
        WHERE f.customer_id = %s AND f.is_deleted = 0
    '''
    params = [customer_id]

    # 按跟进人过滤
    if user_role == "sales":
        team_members = get_team_members(user_id)
        placeholders = ','.join(['%s'] * len(team_members))
        sql += f' AND f.created_by IN ({placeholders})'
        params.extend(team_members)

    # 按类型筛选
    if follow_type:
        sql += ' AND f.follow_up_type = %s'
        params.append(follow_type)

    # 按时间范围筛选
    if start_date:
        sql += ' AND f.follow_up_time >= %s'
        params.append(start_date)

    if end_date:
        sql += ' AND f.follow_up_time <= %s'
        params.append(end_date)

    # 统计总数
    cursor.execute(sql.replace('f.*, u.name as creator_name', 'COUNT(*) as cnt'), params)
    total = cursor.fetchone()['cnt']

    # 按时间倒序
    sql += ' ORDER BY f.follow_up_time DESC'

    # 分页
    sql += ' LIMIT %s OFFSET %s'
    params.extend([page_size, (page - 1) * page_size])

    cursor.execute(sql, params)
    records = [dict(row) for row in cursor.fetchall()]

    # 构建响应，添加content_preview，并解析JSON字段
    result_items = []
    for item in records:
        content_text = item['content'].replace('<p>', '').replace('</p>', '').replace('<strong>', '').replace('</strong>', '').replace('<ul>', '').replace('</ul>', '').replace('<li>', '').replace('</li>', '')
        item['content_preview'] = content_text[:100] + ('...' if len(content_text) > 100 else '')
        # 解析JSON字段
        item['participants'] = parse_json_field(item.get('participants'), [])
        item['attachments'] = parse_json_field(item.get('attachments'), [])
        item['custom_fields'] = parse_json_field(item.get('custom_fields'), {})
        result_items.append(item)

    conn.close()
    return jsonify({
        "total": total,
        "items": result_items,
        "has_more": (page * page_size) < total,
        "page": page,
        "page_size": page_size
    })


@app.route("/api/v1/crm/follow-ups/<record_id>", methods=["GET"])
def get_follow_up_detail(record_id):
    """获取跟进记录详情"""
    user_id = request.headers.get("X-User-Id", "user-001")

    conn = get_db_conn()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT f.*, u.name as creator_name
        FROM follow_up_records f
        LEFT JOIN users u ON f.created_by = u.id
        WHERE f.id = %s
    ''', (record_id,))
    record = cursor.fetchone()

    if not record:
        conn.close()
        return jsonify({"error": "跟进记录不存在"}), 404

    record_dict = dict(record)

    if record_dict['is_deleted']:
        conn.close()
        return jsonify({"error": "已删除的记录"}), 400

    if not can_access_customer(user_id, record_dict["customer_id"]):
        conn.close()
        return jsonify({"error": "无权访问此记录"}), 403

    # 解析JSON字段
    record_dict['participants'] = parse_json_field(record_dict.get('participants'), [])
    record_dict['attachments'] = parse_json_field(record_dict.get('attachments'), [])
    record_dict['custom_fields'] = parse_json_field(record_dict.get('custom_fields'), {})

    conn.close()
    return jsonify(record_dict)


@app.route("/api/v1/crm/follow-ups/<record_id>", methods=["PUT"])
def update_follow_up(record_id):
    """更新跟进记录"""
    user_id = request.headers.get("X-User-Id", "user-001")
    user_role = request.headers.get("X-User-Role", "sales")

    conn = get_db_conn()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM follow_up_records WHERE id = %s', (record_id,))
    record = cursor.fetchone()

    if not record:
        conn.close()
        return jsonify({"error": "跟进记录不存在"}), 404

    record = dict(record)

    if record['is_deleted']:
        conn.close()
        return jsonify({"error": "已删除的记录无法修改"}), 400

    # 乐观锁检查
    version = request.headers.get("If-Match") or request.get_json().get("version")
    if version and record['updated_at'] != version:
        conn.close()
        return jsonify({
            "error": "记录已被修改，请刷新后重试",
            "currentVersion": record['updated_at'],
            "yourVersion": version
        }), 409

    # 24小时编辑限制 - 统一使用naive datetime
    created_at = date_parser.parse(record['created_at'])
    # 移除时区信息
    if created_at.tzinfo is not None:
        created_at = created_at.replace(tzinfo=None) - (created_at.utcoffset() or timedelta(0))
    hours_diff = (datetime.now() - created_at).total_seconds() / 3600

    is_creator = record['created_by'] == user_id
    is_admin = user_role == "admin"

    if not is_creator and not is_admin:
        conn.close()
        return jsonify({"error": "仅创建者或管理员可修改此记录"}), 403

    if hours_diff > 24 and not is_admin:
        conn.close()
        return jsonify({"error": "超过24小时的记录无法修改"}), 403

    data = request.get_json() or {}

    # 更新时间 - 使用naive datetime
    now = datetime.now().strftime('%Y-%m-%dT%H:%M:%S')

    # 处理跟进时间
    follow_up_time_input = data.get("follow_up_time", record["follow_up_time"])
    follow_up_time_for_db = date_parser.parse(follow_up_time_input)
    if follow_up_time_for_db.tzinfo is not None:
        follow_up_time_for_db = follow_up_time_for_db.replace(tzinfo=None) - (follow_up_time_for_db.utcoffset() or timedelta(0))
    follow_up_time_for_db = follow_up_time_for_db.strftime('%Y-%m-%dT%H:%M:%S')

    # 处理下次提醒时间
    next_reminder_input = data.get("next_reminder_time", record["next_reminder_time"])
    next_reminder_for_db = None
    if next_reminder_input:
        next_reminder_dt = date_parser.parse(next_reminder_input)
        if next_reminder_dt.tzinfo is not None:
            next_reminder_dt = next_reminder_dt.replace(tzinfo=None) - (next_reminder_dt.utcoffset() or timedelta(0))
        next_reminder_for_db = next_reminder_dt.strftime('%Y-%m-%dT%H:%M:%S')

    cursor.execute('''
        UPDATE follow_up_records SET
            follow_up_type = %s,
            follow_up_time = %s,
            participants = %s,
            content = %s,
            customer_feedback = %s,
            next_reminder_time = %s,
            related_opportunity_id = %s,
            attachments = %s,
            duration_minutes = %s,
            custom_fields = %s,
            updated_at = %s
        WHERE id = %s
    ''', (
        data.get("follow_up_type", record["follow_up_type"]),
        follow_up_time_for_db,
        json.dumps(data.get("participants", json.loads(record["participants"]))),
        data.get("content", record["content"]),
        data.get("customer_feedback", record["customer_feedback"]),
        next_reminder_for_db,
        data.get("related_opportunity_id", record["related_opportunity_id"]),
        json.dumps(data.get("attachments", json.loads(record["attachments"]))),
        data.get("duration_minutes", record["duration_minutes"]),
        json.dumps(data.get("custom_fields", json.loads(record["custom_fields"]))),
        now,
        record_id
    ))

    cursor.execute('SELECT * FROM follow_up_records WHERE id = %s', (record_id,))
    result = dict(cursor.fetchone())
    conn.close()
    return jsonify(result)


@app.route("/api/v1/crm/follow-ups/<record_id>", methods=["DELETE"])
def delete_follow_up(record_id):
    """删除跟进记录（软删除）"""
    user_id = request.headers.get("X-User-Id", "user-001")
    user_role = request.headers.get("X-User-Role", "sales")

    conn = get_db_conn()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM follow_up_records WHERE id = %s', (record_id,))
    record = cursor.fetchone()

    if not record:
        conn.close()
        return jsonify({"error": "跟进记录不存在"}), 404

    record = dict(record)

    if record['is_deleted']:
        conn.close()
        return jsonify({"error": "记录已删除"}), 400

    # 权限检查
    is_creator = record['created_by'] == user_id
    is_admin = user_role == "admin"

    if not is_creator and not is_admin:
        conn.close()
        return jsonify({"error": "仅创建者或管理员可删除此记录"}), 403

    # 软删除
    now = datetime.now().strftime('%Y-%m-%dT%H:%M:%S')
    cursor.execute('''
        UPDATE follow_up_records SET is_deleted = 1, deleted_at = %s, deleted_by = %s WHERE id = %s
    ''', (now, user_id, record_id))

    conn.close()
    return jsonify({"message": "删除成功", "id": record_id})


# ==================== 商机相关 ====================

@app.route("/api/v1/crm/opportunities", methods=["GET"])
def get_opportunities():
    """获取商机列表"""
    customer_id = request.args.get("customer_id")
    conn = get_db_conn()
    cursor = conn.cursor()

    if customer_id:
        cursor.execute('''
            SELECT o.*, c.name as customer_name, u.name as owner_name
            FROM opportunities o
            LEFT JOIN customers c ON o.customer_id = c.id
            LEFT JOIN users u ON o.owner_id = u.id
            WHERE o.customer_id = %s
        ''', (customer_id,))
    else:
        cursor.execute('''
            SELECT o.*, c.name as customer_name, u.name as owner_name
            FROM opportunities o
            LEFT JOIN customers c ON o.customer_id = c.id
            LEFT JOIN users u ON o.owner_id = u.id
        ''')

    opportunities = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(opportunities)


@app.route("/api/v1/crm/opportunities/<opp_id>", methods=["GET"])
def get_opportunity(opp_id):
    """获取商机详情"""
    conn = get_db_conn()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT o.*, c.name as customer_name, u.name as owner_name
        FROM opportunities o
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN users u ON o.owner_id = u.id
        WHERE o.id = %s
    ''', (opp_id,))
    opp = cursor.fetchone()
    conn.close()

    if not opp:
        return jsonify({"error": "商机不存在"}), 404
    return jsonify(dict(opp))


# ==================== KPI统计 ====================

@app.route("/api/v1/crm/analytics/follow-up-stats", methods=["GET"])
def get_follow_up_stats():
    """获取跟进统计（KPI用）"""
    user_id = request.headers.get("X-User-Id", "user-001")
    target_user_id = request.args.get("user_id") or user_id
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    if not start_date or not end_date:
        return jsonify({"error": "start_date和end_date为必填参数"}), 400

    start_dt = date_parser.parse(start_date)
    end_dt = date_parser.parse(end_date)

    conn = get_db_conn()
    cursor = conn.cursor()

    # 按用户筛选
    if target_user_id:
        if not can_view_user_follow_ups(user_id, target_user_id):
            conn.close()
            return jsonify({"error": "无权查看此用户的统计数据"}), 403
        user_filter = target_user_id
    else:
        user_filter = None

    # 查询记录
    if user_filter:
        cursor.execute('''
            SELECT follow_up_type, duration_minutes, customer_id
            FROM follow_up_records
            WHERE created_by = %s AND is_deleted = 0
            AND follow_up_time >= %s AND follow_up_time <= %s
        ''', (user_filter, start_date, end_date))
    else:
        cursor.execute('''
            SELECT follow_up_type, duration_minutes, customer_id
            FROM follow_up_records
            WHERE is_deleted = 0
            AND follow_up_time >= %s AND follow_up_time <= %s
        ''', (start_date, end_date))

    records = cursor.fetchall()

    # 统计计算
    total_count = len(records)
    by_type = {}
    total_duration = 0
    customer_ids = set()

    for record in records:
        ft = record['follow_up_type']
        by_type[ft] = by_type.get(ft, 0) + 1
        total_duration += record['duration_minutes'] or 0
        customer_ids.add(record['customer_id'])

    avg_duration = total_duration / total_count if total_count > 0 else 0
    customer_coverage_count = len(customer_ids)

    conn.close()
    return jsonify({
        "total_count": total_count,
        "by_type": by_type,
        "customer_coverage_count": customer_coverage_count,
        "avg_duration_minutes": round(avg_duration, 1),
        "start_date": start_date,
        "end_date": end_date,
        "user_id": target_user_id if target_user_id != user_id else None
    })

@app.route("/api/v1/crm/analytics/team-stats", methods=["GET"])
def get_team_stats():
    """获取团队统计"""
    user_id = request.headers.get("X-User-Id", "user-001")
    user = get_user_by_id(user_id)

    if not user or user['role'] != 'manager':
        return jsonify({"error": "仅管理员可查看团队统计"}), 403

    conn = get_db_conn()
    cursor = conn.cursor()
    team_members = get_team_members(user_id)

    placeholders = ','.join(['%s'] * len(team_members))

    # 团队客户数
    cursor.execute(f'SELECT COUNT(*) as cnt FROM customers WHERE owner_id IN ({placeholders})', team_members)
    customer_count = cursor.fetchone()['cnt']

    # 团队跟进数（本月）
    month_start = datetime.now().replace(day=1).strftime('%Y-%m-%dT%H:%M:%S')
    cursor.execute(f'''
        SELECT COUNT(*) as cnt FROM follow_up_records
        WHERE created_by IN ({placeholders}) AND is_deleted = 0 AND created_at >= %s
    ''', team_members + [month_start])
    followup_count = cursor.fetchone()['cnt']

    # 团队商机数
    cursor.execute(f'SELECT COUNT(*) as cnt FROM opportunities WHERE owner_id IN ({placeholders})', team_members)
    opportunity_count = cursor.fetchone()['cnt']

    conn.close()
    return jsonify({
        "team_member_count": len(team_members),
        "customer_count": customer_count,
        "followup_count_this_month": followup_count,
        "opportunity_count": opportunity_count
    })

# ==================== 提醒相关 ====================

@app.route("/api/v1/crm/reminders", methods=["GET"])
def get_reminders():
    """获取当前用户的待办提醒"""
    user_id = request.headers.get("X-User-Id", "user-001")

    conn = get_db_conn()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT r.*, c.name as customer_name, f.follow_up_type
        FROM reminders r
        LEFT JOIN customers c ON r.customer_id = c.id
        LEFT JOIN follow_up_records f ON r.follow_up_id = f.id
        WHERE r.user_id = %s AND r.status = 'pending'
        ORDER BY r.reminder_time ASC
    ''', (user_id,))

    reminders = []
    now = datetime.now()

    for row in cursor.fetchall():
        reminder = dict(row)
        reminder_time = date_parser.parse(reminder['reminder_time'])
        # 移除时区信息进行比较
        if reminder_time.tzinfo is not None:
            reminder_time = reminder_time.replace(tzinfo=None) - (reminder_time.utcoffset() or timedelta(0))
        reminder['is_due'] = reminder_time <= now
        reminder['is_near'] = (reminder_time - now).total_seconds() <= 900
        reminders.append(reminder)

    conn.close()
    return jsonify(reminders)

@app.route("/api/v1/crm/reminders/<reminder_id>/complete", methods=["POST"])
def complete_reminder(reminder_id):
    """完成提醒"""
    user_id = request.headers.get("X-User-Id", "user-001")

    conn = get_db_conn()
    cursor = conn.cursor()
    cursor.execute('UPDATE reminders SET status = %s WHERE id = %s AND user_id = %s',
                   ('done', reminder_id, user_id))
    conn.close()

    return jsonify({"message": "提醒已完成"})

# ==================== 客户统计概览 ====================

@app.route("/api/v1/crm/customers/<customer_id>/overview", methods=["GET"])
def get_customer_overview(customer_id):
    """获取客户跟进概览"""
    user_id = request.headers.get("X-User-Id", "user-001")

    if not can_access_customer(user_id, customer_id):
        return jsonify({"error": "无权访问此客户"}), 403

    conn = get_db_conn()
    cursor = conn.cursor()
    now = datetime.now()

    # 总跟进次数
    cursor.execute('''
        SELECT COUNT(*) as cnt FROM follow_up_records
        WHERE customer_id = %s AND is_deleted = 0
    ''', (customer_id,))
    total_count = cursor.fetchone()['cnt']

    # 最近跟进时间
    cursor.execute('''
        SELECT follow_up_time FROM follow_up_records
        WHERE customer_id = %s AND is_deleted = 0
        ORDER BY follow_up_time DESC LIMIT 1
    ''', (customer_id,))
    row = cursor.fetchone()
    last_followup_time = row['follow_up_time'] if row else None

    # 下次跟进提醒
    cursor.execute('''
        SELECT reminder_time FROM reminders
        WHERE customer_id = %s AND status = 'pending'
        ORDER BY reminder_time ASC LIMIT 1
    ''', (customer_id,))
    row = cursor.fetchone()
    next_reminder_time = row['reminder_time'] if row else None

    # 计算活跃度评分（基于近30天跟进频次）
    thirty_days_ago = (now - timedelta(days=30)).strftime('%Y-%m-%dT%H:%M:%S')
    cursor.execute('''
        SELECT COUNT(*) as cnt FROM follow_up_records
        WHERE customer_id = %s AND is_deleted = 0 AND created_at >= %s
    ''', (customer_id, thirty_days_ago))
    recent_count = cursor.fetchone()['cnt']

    # 评分规则：30天内1次=30分，2次=60分，3次=80分，4次=90分，5次+=100分
    if recent_count == 0:
        activity_score = 0
    elif recent_count == 1:
        activity_score = 30
    elif recent_count == 2:
        activity_score = 60
    elif recent_count == 3:
        activity_score = 80
    elif recent_count == 4:
        activity_score = 90
    else:
        activity_score = min(100, 90 + (recent_count - 4) * 2)

    conn.close()
    return jsonify({
        "customer_id": customer_id,
        "total_followup_count": total_count,
        "last_followup_time": last_followup_time,
        "next_reminder_time": next_reminder_time,
        "activity_score": activity_score,
        "recent_followup_count_30d": recent_count
    })

# ==================== 启动 ====================

if __name__ == "__main__":
    # 确保数据库已初始化
    print("🚀 CRM后端服务启动中...")
    print("📍 API地址: http://localhost:3002")
    print("📚 健康检查: http://localhost:3002/api/health")
    app.run(host="0.0.0.0", port=3002, debug=True)
