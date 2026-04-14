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
