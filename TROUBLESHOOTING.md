# CRM系统常见问题排查指南

## 白屏问题排查

### 1. 确认使用正确的启动方式

**❌ 错误方式**:
```bash
# 使用静态文件服务器(不会启动API服务)
python serve.py
# 或使用Vite开发服务器
npm run dev
```

**✅ 正确方式**:
```bash
# 方式1: 使用启动脚本(推荐)
start_server.bat

# 方式2: 方式1失败时使用
python server/app.py

# 方式3: 使用启动检查脚本
python start_check.py
```

### 2. 检查后端服务是否正常运行

**方法1**: 访问健康检查端点
```bash
curl http://localhost:3001/api/health
```

**期望响应**:
```json
{"status": "ok", "timestamp": "2026-04-14T00:00:00.000000Z", "database": "SQLite"}
```

**方法2**: 打开浏览器控制台
1. 按 `F12` 打开开发者工具
2. 切换到 **Console** (控制台) 标签
3. 查看是否有红色错误信息

**方法3**: 检查端口占用
```bash
# Windows
netstat -ano | findstr ":3001"

# Linux/Mac
lsof -i :3001
```

### 3. 常见错误及解决方案

#### 错误1: "无法连接到服务器"

**原因**: 后端服务未启动

**解决**:
1. 确保使用正确方式启动: `python server/app.py`
2. 检查是否有错误信息
3. 确认端口3001未被占用

#### 错误2: "API返回格式错误"

**原因**: 服务器返回了非JSON格式

**解决**:
1. 检查Flask服务器控制台输出
2. 可能是数据库连接问题
3. 查看日志中的详细错误信息

#### 错误3: 页面一直显示"加载中"

**原因**: API请求超时或失败

**解决**:
1. 打开浏览器控制台查看网络请求
2. 确认请求URL是否正确
3. 检查是否有跨域(CORS)问题

### 4. 数据库问题

#### 初始化数据库
```bash
curl -X POST http://localhost:3001/api/init-db
```

#### 重置数据库
```bash
curl -X POST "http://localhost:3001/api/init-db?action=reset"
```

### 5. 浏览器缓存问题

如果修改了代码后页面没有更新:

1. **强制刷新**: `Ctrl + Shift + R` (Windows) 或 `Cmd + Shift + R` (Mac)
2. **清除缓存**: `Ctrl + Shift + Delete`
3. **无痕模式**: 使用无痕/隐私窗口测试

### 6. 跨域问题

如果遇到跨域错误:

1. 确认 `server/app.py` 中已启用CORS
2. 检查浏览器控制台的CORS错误信息
3. 确认前端请求的API地址正确

### 7. 端口冲突解决

如果端口3001被占用:

```bash
# Windows: 查找占用端口的进程
netstat -ano | findstr ":3001"
# 然后使用taskkill结束进程
taskkill /PID <进程ID> /F

# 或使用其他端口启动(需要修改代码)
```

### 8. 依赖安装问题

```bash
# 重新安装依赖
pip uninstall flask flask-cors python-dateutil
pip install -r requirements.txt
```

### 9. 获取帮助

如果以上方法都无法解决问题:

1. 收集错误信息:
   - 浏览器控制台截图
   - 后端服务器完整输出
   - 操作步骤说明

2. 检查环境:
   - Python版本: `python --version`
   - 依赖版本: `pip list`
   - 操作系统和版本

## 快速诊断清单

- [ ] 使用正确方式启动了服务?
- [ ] 能访问 http://localhost:3001/api/health ?
- [ ] 浏览器控制台有错误吗?
- [ ] 数据库文件存在吗? (`server/crm.db`)
- [ ] 尝试过清除浏览器缓存吗?
- [ ] 端口3001没有被其他程序占用?

## 联系方式

如需帮助,请提供:
1. 完整的错误信息截图
2. 使用的启动命令
3. 操作步骤描述
4. 环境信息 (Python版本、操作系统等)
