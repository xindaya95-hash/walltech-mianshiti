-- Vercel Postgres 数据库初始化脚本
-- 运行此脚本创建必要的表和测试数据

-- 创建 users 表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    name VARCHAR(255)
);

-- 创建 customers 表
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    company TEXT,
    status TEXT DEFAULT '潜在客户',
    owner_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入测试用户（密码为 MD5 哈希）
INSERT INTO users (username, password, role, name) VALUES
    ('admin', '0192023a7bbd73250516f069df18b500', '管理员', '管理员'),
    ('zhangsan', 'e10adc3949ba59abbe56e057f20f883e', '销售', '张三')
ON CONFLICT (username) DO NOTHING;

-- 插入测试客户数据
INSERT INTO customers (name, phone, email, company, status, owner_id) VALUES
    ('李客户', '13800138001', 'li@example.com', 'ABC公司', '意向客户', 2),
    ('王客户', '13800138002', 'wang@example.com', 'XYZ公司', '潜在客户', 2),
    ('张客户', '13800138003', 'zhang@example.com', 'DEF公司', '成交客户', 2);
