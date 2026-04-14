"""
CRM数据库模块 - Supabase PostgreSQL
用于存储客户、用户、跟进记录等核心业务数据
"""
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta
import uuid
import hashlib
import json

# Supabase 连接配置
DATABASE_URL = os.environ.get("DATABASE_URL")

def get_db():
    """获取数据库连接"""
    if not DATABASE_URL:
        raise Exception("DATABASE_URL environment variable is not set")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    return conn

def init_db():
    """初始化数据库表结构"""
    conn = get_db()
    cursor = conn.cursor()

    # ==================== 用户表 ====================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'sales')),
            team_id TEXT,
            manager_id TEXT,
            email TEXT,
            phone TEXT,
            avatar TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # ==================== 客户表 ====================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS customers (
            id TEXT PRIMARY KEY,
            customer_code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            industry TEXT,
            scale TEXT,
            contact_name TEXT,
            contact_phone TEXT,
            contact_email TEXT,
            address TEXT,
            owner_id TEXT NOT NULL,
            status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'blocked')),
            source TEXT,
            level TEXT CHECK(level IN ('A', 'B', 'C', 'D')),
            annual_revenue REAL,
            employee_count INTEGER,
            website TEXT,
            description TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (owner_id) REFERENCES users(id)
        )
    ''')

    # ==================== 跟进记录表 ====================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS follow_up_records (
            id TEXT PRIMARY KEY,
            customer_id TEXT NOT NULL,
            follow_up_type TEXT NOT NULL CHECK(follow_up_type IN ('phone_call', 'online_meeting', 'onsite_visit', 'email', 'im_chat', 'other')),
            follow_up_time TEXT NOT NULL,
            created_by TEXT NOT NULL,
            participants TEXT DEFAULT '[]',
            content TEXT NOT NULL,
            customer_feedback TEXT,
            next_reminder_time TEXT,
            related_opportunity_id TEXT,
            attachments TEXT DEFAULT '[]',
            duration_minutes INTEGER DEFAULT 0,
            custom_fields TEXT DEFAULT '{}',
            processing_time INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            is_deleted INTEGER DEFAULT 0,
            deleted_at TEXT,
            deleted_by TEXT,
            FOREIGN KEY (customer_id) REFERENCES customers(id),
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    ''')

    # ==================== 商机表 ====================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS opportunities (
            id TEXT PRIMARY KEY,
            opportunity_code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            customer_id TEXT NOT NULL,
            owner_id TEXT NOT NULL,
            stage TEXT DEFAULT 'prospecting' CHECK(stage IN ('prospecting', 'qualification', 'proposal', 'negotiation', 'contract', 'closed_won', 'closed_lost')),
            amount REAL DEFAULT 0,
            probability INTEGER DEFAULT 0,
            expected_close_date TEXT,
            actual_close_date TEXT,
            description TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id),
            FOREIGN KEY (owner_id) REFERENCES users(id)
        )
    ''')

    # ==================== 部门表 ====================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS departments (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            code TEXT UNIQUE NOT NULL,
            parent_id TEXT,
            manager_id TEXT,
            description TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_id) REFERENCES departments(id)
        )
    ''')

    # ==================== 团队表 ====================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS teams (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            department_id TEXT NOT NULL,
            leader_id TEXT,
            description TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (department_id) REFERENCES departments(id)
        )
    ''')

    # ==================== 任务/提醒表 ====================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS reminders (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            customer_id TEXT,
            follow_up_id TEXT,
            title TEXT NOT NULL,
            description TEXT,
            reminder_time TEXT NOT NULL,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'done', 'cancelled')),
            priority TEXT DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent')),
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (customer_id) REFERENCES customers(id),
            FOREIGN KEY (follow_up_id) REFERENCES follow_up_records(id)
        )
    ''')

    # ==================== 操作日志表（审计用） ====================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS operation_logs (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            action TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT,
            old_value TEXT,
            new_value TEXT,
            ip_address TEXT,
            user_agent TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')

    # ==================== 创建索引 ====================
    # 客户索引
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_customers_owner ON customers(owner_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status)')

    # 跟进记录索引
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_followups_customer_time ON follow_up_records(customer_id, follow_up_time)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_followups_creator_time ON follow_up_records(created_by, follow_up_time)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_followups_next_reminder ON follow_up_records(next_reminder_time)')

    # 商机索引
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_opportunities_customer ON opportunities(customer_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_opportunities_owner ON opportunities(owner_id)')

    # 提醒索引
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_reminders_user_time ON reminders(user_id, reminder_time)')

    conn.close()
    print(f"✅ 数据库初始化完成")

def generate_sample_data():
    """生成示例数据"""
    conn = get_db()
    cursor = conn.cursor()

    # 检查是否已有数据
    cursor.execute('SELECT COUNT(*) FROM users')
    if cursor.fetchone()[0] > 0:
        print("📋 示例数据已存在，跳过生成")
        conn.close()
        return

    print("📝 正在生成示例数据...")

    # ==================== 部门数据 ====================
    departments = [
        ('dept-001', '销售部', 'SALES', None, '负责客户开拓与跟进'),
        ('dept-002', '客服部', 'SERVICE', None, '负责客户服务与维护'),
        ('dept-003', '市场部', 'MARKETING', None, '负责市场推广活动'),
    ]
    cursor.executemany(
        'INSERT INTO departments (id, name, code, description) VALUES (%s, %s, %s, %s)',
        [(d[0], d[1], d[2], d[4]) for d in departments]
    )

    # ==================== 团队数据 ====================
    teams = [
        ('team-001', '华南销售组', 'dept-001', 'user-003', '负责华南地区客户'),
        ('team-002', '华东销售组', 'dept-001', 'user-005', '负责华东地区客户'),
        ('team-003', 'VIP客服组', 'dept-002', 'user-006', '负责VIP客户服务'),
    ]
    cursor.executemany(
        'INSERT INTO teams (id, name, department_id, leader_id, description) VALUES (%s, %s, %s, %s, %s)',
        teams
    )

    # ==================== 用户数据 ====================
    def hash_password(password):
        return hashlib.sha256(password.encode()).hexdigest()

    users = [
        ('user-001', 'zhangsan', hash_password('123456'), '张三', 'sales', 'team-001', 'user-003', 'zhangsan@company.com', '13800138001', 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhangsan'),
        ('user-002', 'lisi', hash_password('123456'), '李四', 'sales', 'team-001', 'user-003', 'lisi@company.com', '13800138002', 'https://api.dicebear.com/7.x/avataaars/svg?seed=lisi'),
        ('user-003', 'wangwu', hash_password('123456'), '王五', 'manager', 'team-001', None, 'wangwu@company.com', '13800138003', 'https://api.dicebear.com/7.x/avataaars/svg?seed=wangwu'),
        ('user-004', 'admin', hash_password('admin123'), '系统管理员', 'admin', 'team-001', None, 'admin@company.com', '13800138004', 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin'),
        ('user-005', 'zhaoliu', hash_password('123456'), '赵六', 'manager', 'team-002', None, 'zhaoliu@company.com', '13800138005', 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhaoliu'),
        ('user-006', 'sunqi', hash_password('123456'), '孙七', 'sales', 'team-003', 'user-005', 'sunqi@company.com', '13800138006', 'https://api.dicebear.com/7.x/avataaars/svg?seed=sunqi'),
    ]
    cursor.executemany(
        'INSERT INTO users (id, username, password_hash, name, role, team_id, manager_id, email, phone, avatar) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)',
        users
    )

    # ==================== 客户数据 ====================
    now = datetime.utcnow()
    customers = [
        ('cust-001', 'C20240001', '深圳星火科技有限公司', '电子制造', '中型企业', '陈总', '+86 755 12345678', 'chen@sparksh.com', '深圳市南山区科技园', 'user-001', 'active', '官网获客', 'A', 50000000, 500, 'https://www.sparksh.com', '专注跨境电商物流服务'),
        ('cust-002', 'C20240002', '广州蓝海贸易有限公司', '进出口贸易', '大型企业', '刘总', '+86 20 87654321', 'liu@blueocean.cn', '广州市天河区珠江新城', 'user-001', 'active', '展会获客', 'A', 200000000, 1200, 'https://www.blueocean.cn', '年进出口额超10亿美元'),
        ('cust-003', 'C20240003', '东莞智造科技有限公司', '智能制造', '小型企业', '周总', '+86 769 11112222', 'zhou@zhizhao.com', '东莞市松山湖高新区', 'user-002', 'active', '客户推荐', 'B', 8000000, 150, 'https://www.zhizhao.com', '智能工厂解决方案提供商'),
        ('cust-004', 'C20240004', '佛山鼎盛家具有限公司', '家具制造', '中型企业', '吴总', '+86 757 33334444', 'wu@dingsheng.com', '佛山市顺德区乐从镇', 'user-002', 'active', '电话营销', 'B', 30000000, 800, None, '家具出口为主'),
        ('cust-005', 'C20240005', '中山宏达电子有限公司', '电子产品', '小型企业', '郑总', '+86 760 55556666', 'zheng@hongda.com', '中山市火炬开发区', 'user-003', 'inactive', '展会获客', 'C', 5000000, 80, None, '正在考虑合作'),
        ('cust-006', 'C20240006', '珠海盛世物流有限公司', '物流运输', '中型企业', '冯总', '+86 756 77778888', 'feng@shengshi.com', '珠海市香洲区', 'user-001', 'active', '客户推荐', 'A', 45000000, 600, None, '需要仓储一体化服务'),
        ('cust-007', 'C20240007', '江门金桥纺织有限公司', '纺织服装', '大型企业', '钱总', '+86 750 99990000', 'qian@jinqiao.com', '江门市新会区', 'user-002', 'active', '官网获客', 'B', 80000000, 2000, None, '纺织原料进口商'),
        ('cust-008', 'C20240008', '惠州德邦化工有限公司', '化工', '中型企业', '孙总', '+86 752 22223333', 'sun@debang.com', '惠州市大亚湾区', 'user-003', 'active', '电话营销', 'C', 25000000, 400, None, '危化品运输资质'),
    ]

    for cust in customers:
        created_date = (now - timedelta(days=90)).isoformat() + 'Z'
        cursor.execute('''
            INSERT INTO customers (id, customer_code, name, industry, scale, contact_name, contact_phone, contact_email, address, owner_id, status, source, level, annual_revenue, employee_count, website, description, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ''', (*cust, created_date))

    # ==================== 商机数据 ====================
    opportunities = [
        ('opp-001', 'OPP20240001', '星火科技集装箱物流合同', 'cust-001', 'user-001', 'negotiation', 500000, 70, (now + timedelta(days=30)).isoformat() + 'Z', None, '预计月出货量200TEU'),
        ('opp-002', 'OPP20240002', '蓝海贸易全年物流服务', 'cust-002', 'user-001', 'proposal', 2000000, 50, (now + timedelta(days=60)).isoformat() + 'Z', None, '综合物流解决方案'),
        ('opp-003', 'OPP20240003', '智造科技仓储合作', 'cust-003', 'user-002', 'qualification', 150000, 30, (now + timedelta(days=45)).isoformat() + 'Z', None, '原材料仓储租赁'),
        ('opp-004', 'OPP20240004', '鼎盛家具出口运输', 'cust-004', 'user-002', 'closed_won', 800000, 100, (now - timedelta(days=15)).isoformat() + 'Z', (now - timedelta(days=15)).isoformat() + 'Z', '家具海运出口北美'),
        ('opp-005', 'OPP20240005', '宏达电子危化品运输', 'cust-005', 'user-003', 'prospecting', 100000, 20, (now + timedelta(days=90)).isoformat() + 'Z', None, '危化品公路运输'),
    ]
    cursor.executemany(
        'INSERT INTO opportunities (id, opportunity_code, name, customer_id, owner_id, stage, amount, probability, expected_close_date, actual_close_date, description) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)',
        opportunities
    )

    # ==================== 跟进记录数据 ====================
    follow_ups = [
        # 星火科技跟进
        (str(uuid.uuid4()), 'cust-001', 'phone_call', (now - timedelta(days=2)).isoformat() + 'Z', 'user-001', '["user-001"]',
         '<p>📞 电话沟通了关于下季度物流需求的增长情况。客户表示业务量预计增长<strong>30%</strong>，需要我们提前做好准备。</p><p>主要需求：</p><ul><li>深圳港出口为主</li><li>月均200TEU</li><li>需要专属客服对接</li></ul>',
         '积极反馈，有明确合作意向', (now + timedelta(days=3)).isoformat() + 'Z', 'opp-001', '[]', 25, '{"call_result": "有效通话", "phone_number": "+86 138xxxx1234"}', 120),
        (str(uuid.uuid4()), 'cust-001', 'online_meeting', (now - timedelta(days=5)).isoformat() + 'Z', 'user-001', '["user-001", "user-003"]',
         '<p>💻 线上会议讨论了合同条款细节，双方就价格和服务范围达成初步一致。</p><p>会议结论：</p><ul><li>基础运费优惠5%</li><li>提供专属仓位保障</li><li>结算周期月结30天</li></ul>',
         '条款需进一步确认', None, 'opp-001', '[]', 60, '{"meeting_link": "https://meeting.example.com/abc123", "meeting_platform": "腾讯会议"}', 180),
        (str(uuid.uuid4()), 'cust-001', 'onsite_visit', (now - timedelta(days=15)).isoformat() + 'Z', 'user-001', '["user-001"]',
         '<p>🏢 上门拜访了客户总部，与物流负责人进行深入交流。</p><p>参观了他们新的仓库设施，对方的规模化运营给我们留下了深刻印象。</p>',
         '对我们的服务能力表示认可', None, None, '[]', 90, '{"visit_address": "深圳市南山区科技园南区A栋", "visit_purpose": "需求调研"}', 200),
        # 蓝海贸易跟进
        (str(uuid.uuid4()), 'cust-002', 'email', (now - timedelta(days=1)).isoformat() + 'Z', 'user-001', '["user-001"]',
         '<p>✉️ 发送了综合物流解决方案PPT和报价单。</p><p>邮件主题：蓝海贸易-2024年度物流服务方案</p>',
         '等待内部评审', (now + timedelta(days=7)).isoformat() + 'Z', 'opp-002', '["/uploads/proposal_2024.pdf", "/uploads/price_list.xlsx"]', 15, '{"email_subject": "蓝海贸易-2024年度物流服务方案", "email_reply_expected": "5个工作日内"}', 60),
        (str(uuid.uuid4()), 'cust-002', 'im_chat', (now - timedelta(days=8)).isoformat() + 'Z', 'user-001', '["user-001", "user-002"]',
         '<p>💬 通过企业微信沟通，了解到客户近期有个紧急订单需要出运。</p><p>客户询问能否在一周内安排10个集装箱到盐田港。</p>',
         '紧急需求，需快速响应', None, None, '[]', 10, '{"im_platform": "企业微信", "im_account": "liu_business"}', 45),
        # 智造科技跟进
        (str(uuid.uuid4()), 'cust-003', 'phone_call', (now - timedelta(days=3)).isoformat() + 'Z', 'user-002', '["user-002"]',
         '<p>📞 了解到客户正在扩建厂房，需要短期仓储空间。</p><p>需求：约2000平仓库，租期6个月。</p>',
         '有明确需求', (now + timedelta(days=5)).isoformat() + 'Z', 'opp-003', '[]', 20, '{"call_result": "有效通话", "phone_number": "+86 769 xxxx2222"}', 90),
        # 鼎盛家具跟进
        (str(uuid.uuid4()), 'cust-004', 'online_meeting', (now - timedelta(days=20)).isoformat() + 'Z', 'user-002', '["user-002", "user-003", "user-005"]',
         '<p>💻 合同签约会议，正式达成合作。</p><p>合同要点：</p><ul><li>年度合同</li><li>月均出货30TEU</li><li>提供门到门服务</li></ul>',
         '合作愉快', None, 'opp-004', '["/uploads/contract_signed.pdf"]', 45, '{"meeting_link": "https://meeting.example.com/contract", "meeting_platform": "腾讯会议"}', 150),
        # 盛世物流跟进
        (str(uuid.uuid4()), 'cust-006', 'onsite_visit', (now - timedelta(days=7)).isoformat() + 'Z', 'user-001', '["user-001"]',
         '<p>🏢 参观客户仓库，探讨仓储合作可能性。</p><p>客户现有仓库10000平，使用率80%，有意将部分业务外包。</p>',
         '有合作意向', (now + timedelta(days=14)).isoformat() + 'Z', None, '["/uploads/warehouse_photo.jpg"]', 120, '{"visit_address": "珠海市香洲区前山镇物流园", "visit_purpose": "业务洽谈"}', 180),
        (str(uuid.uuid4()), 'cust-006', 'phone_call', (now - timedelta(days=1)).isoformat() + 'Z', 'user-001', '["user-001"]',
         '<p>📞 跟进仓储合作进展，客户表示正在内部评估。</p><p>预计下周给反馈。</p>',
         '等待内部决策', (now + timedelta(days=7)).isoformat() + 'Z', None, '[]', 15, '{"call_result": "有效通话", "phone_number": "+86 756 xxxx8888"}', 60),
        # 金桥纺织跟进
        (str(uuid.uuid4()), 'cust-007', 'other', (now - timedelta(days=10)).isoformat() + 'Z', 'user-002', '["user-002"]',
         '<p>📋 参加客户年会，建立更深的人脉关系。</p><p>在年会上了解到客户明年计划开拓欧洲市场。</p>',
         '关系维护良好', None, None, '[]', 180, '{"activity_type": "客户活动"}', 60),
    ]

    for fu in follow_ups:
        cursor.execute('''
            INSERT INTO follow_up_records (
                id, customer_id, follow_up_type, follow_up_time, created_by, participants,
                content, customer_feedback, next_reminder_time, related_opportunity_id,
                attachments, duration_minutes, custom_fields, processing_time
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ''', fu)

    # ==================== 提醒数据 ====================
    reminders = [
        (str(uuid.uuid4()), 'user-001', 'cust-001', None, '跟进星火科技合同条款确认', '需要与客户确认最终合同条款', (now + timedelta(days=3)).isoformat() + 'Z', 'pending', 'high'),
        (str(uuid.uuid4()), 'user-001', 'cust-002', None, '蓝海贸易邮件回复跟进', '等待客户对物流方案邮件的回复', (now + timedelta(days=7)).isoformat() + 'Z', 'pending', 'normal'),
        (str(uuid.uuid4()), 'user-002', 'cust-003', None, '智造科技仓储需求跟进', '跟进2000平仓库需求', (now + timedelta(days=5)).isoformat() + 'Z', 'pending', 'high'),
        (str(uuid.uuid4()), 'user-001', 'cust-006', None, '盛世物流仓储合作反馈', '客户内部评估后的反馈', (now + timedelta(days=7)).isoformat() + 'Z', 'pending', 'normal'),
    ]
    cursor.executemany(
        'INSERT INTO reminders (id, user_id, customer_id, follow_up_id, title, description, reminder_time, status, priority) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)',
        reminders
    )

    conn.close()
    print("✅ 示例数据生成完成！")
    print(f"   - {len(users)} 个用户")
    print(f"   - {len(customers)} 个客户")
    print(f"   - {len(opportunities)} 个商机")
    print(f"   - {len(follow_ups)} 条跟进记录")
    print(f"   - {len(reminders)} 个待办提醒")

def reset_database():
    """重置数据库（删除并重新初始化）"""
    conn = get_db()
    cursor = conn.cursor()
    
    # 删除所有表
    cursor.execute('''
        DROP TABLE IF EXISTS operation_logs CASCADE;
        DROP TABLE IF EXISTS reminders CASCADE;
        DROP TABLE IF EXISTS follow_up_records CASCADE;
        DROP TABLE IF EXISTS opportunities CASCADE;
        DROP TABLE IF EXISTS teams CASCADE;
        DROP TABLE IF EXISTS departments CASCADE;
        DROP TABLE IF EXISTS customers CASCADE;
        DROP TABLE IF EXISTS users CASCADE;
    ''')
    conn.close()
    
    print(f"🗑️ 已重置数据库")
    init_db()
    generate_sample_data()

if __name__ == '__main__':
    reset_database()
