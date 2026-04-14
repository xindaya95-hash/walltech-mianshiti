# 🚀 快速启动指南

## 一键启动 (Windows)

**双击运行**: `start_server.bat`

或使用启动检查脚本:
```bash
python start_check.py
```

---

## 手动启动

### 1. 启动后端服务

```bash
# 进入项目目录
cd C:\Users\32584\Desktop\walltech\20260413152945

# 启动服务
python server/app.py
```

### 2. 访问系统

打开浏览器访问: **http://localhost:3001**

或访问启动检查页面: **http://localhost:3001/check**

---

## 常见问题

### ❌ 白屏或无法加载

1. **确认使用正确方式启动**: 必须运行 `python server/app.py`,而不是 `python serve.py`
2. **检查后端是否运行**: 访问 http://localhost:3001/api/health
3. **查看详细排查指南**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

### ❌ 端口被占用

```bash
# 查看端口占用
netstat -ano | findstr ":3001"

# 结束占用进程(替换 <PID>)
taskkill /PID <PID> /F
```

### ❌ 缺少依赖

```bash
pip install -r requirements.txt
```

---

## 功能概览

✅ 客户列表管理  
✅ 跟进记录时间轴  
✅ 6种跟进类型 (电话/会议/拜访/邮件/IM/其他)  
✅ 客户活跃度分析  
✅ KPI统计  
✅ 权限管理  

---

## 账号登录

系统默认用户:
- 👔 **王经理** (管理员) - user-003
- 👤 **张销售** (普通员工) - user-001  
- 👤 **李销售** (普通员工) - user-002

---

**遇到问题?** 查看 [故障排查指南](TROUBLESHOOTING.md)
