<<<<<<< HEAD
# CRM客户管理系统

基于 Flask 的客户关系管理系统。

## 快速开始

```bash
cd crm-api
pip install -r requirements.txt
python api/index.py
```

## 测试账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 管理员 |
| zhangsan | 123456 | 销售 |

## API 接口

- `GET /api/health` - 健康检查
- `GET /api/customers` - 客户列表
- `POST /api/login` - 用户登录
=======
# CRM客户事件跟进系统

## 纯Python全栈架构

本项目使用**纯Python**构建，包含前端和后端，无需Node.js。

### 技术架构

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | HTML5 + CSS3 + JavaScript | 纯静态页面，SPA架构 |
| 后端 | Python Flask | RESTful API |
| 数据库 | SQLite | 轻量级关系数据库 |
| 服务器 | Flask内置 | 生产环境可用Gunicorn |

### 目录结构

```
├── server/
│   ├── app.py           # Flask后端主程序
│   ├── database.py      # SQLite数据库操作
│   ├── static/
│   │   └── index.html   # 前端页面（纯HTML/CSS/JS）
│   └── crm.db           # SQLite数据库文件
├── requirements.txt    # Python依赖
└── README.md
```

### 启动方式

```bash
# 1. 安装Python依赖
pip install -r requirements.txt

# 2. 启动服务
python server/app.py

# 或使用Gunicorn（生产环境）
pip install gunicorn
python -m gunicorn -w 2 -b 0.0.0.0:3001 server.app:app
```

### 访问地址

**http://localhost:3001**

### 功能特性

1. **客户列表** - 查看所有客户，支持搜索
2. **客户详情** - 含跟进概览卡片和时间轴
3. **跟进记录管理** - 创建/编辑/删除
4. **类型筛选** - 电话、会议、拜访、邮件、IM、其他
5. **KPI统计** - 跟进频次、活跃度等

### 数据库表结构

- `users` - 用户表
- `customers` - 客户表
- `follow_up_records` - 跟进记录表
- `opportunities` - 商机表
- `departments` - 部门表
- `teams` - 团队表
- `reminders` - 提醒待办表
- `operation_logs` - 操作日志

### 虚拟示例数据

系统预置了8家客户、6个用户和10条跟进记录用于功能演示。
>>>>>>> 9a2c669 (Deploy complete CRM system with Supabase PostgreSQL)
