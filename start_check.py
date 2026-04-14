#!/usr/bin/env python3
"""
CRM系统快速启动脚本
自动检查环境并启动服务
"""
import sys
import os
import socket
import subprocess
import webbrowser
import time
import urllib.request
import urllib.error

def check_port(port):
    """检查端口是否被占用"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    result = sock.connect_ex(('localhost', port))
    sock.close()
    return result == 0

def check_python_deps():
    """检查Python依赖"""
    required = ['flask', 'flask_cors']
    missing = []
    
    for package in required:
        try:
            __import__(package.replace('-', '_'))
        except ImportError:
            missing.append(package)
    
    return missing

def check_server_health():
    """检查服务器健康状态"""
    try:
        response = urllib.request.urlopen('http://localhost:3001/api/health', timeout=2)
        return response.status == 200
    except:
        return False

def main():
    print("=" * 50)
    print("CRM客户事件跟进系统 - 启动检查")
    print("=" * 50)
    
    # 检查Python依赖
    print("\n[1/4] 检查Python依赖...")
    missing = check_python_deps()
    if missing:
        print(f"  ❌ 缺少依赖: {', '.join(missing)}")
        print(f"  → 请运行: pip install -r requirements.txt")
        return False
    print("  ✅ 依赖检查通过")
    
    # 检查端口3001
    print("\n[2/4] 检查端口3001...")
    if check_port(3001):
        if check_server_health():
            print("  ✅ 服务器已在运行中")
        else:
            print("  ⚠️  端口3001被占用,但服务可能未正常响应")
    else:
        print("  ✅ 端口3001可用")
    
    # 检查数据库
    print("\n[3/4] 检查数据库...")
    db_path = os.path.join(os.path.dirname(__file__), 'server', 'crm.db')
    if os.path.exists(db_path):
        print(f"  ✅ 数据库文件已存在")
    else:
        print(f"  ⚠️  数据库文件不存在,将在首次启动时自动创建")
    
    # 启动服务
    print("\n[4/4] 启动服务...")
    if check_port(3001) and check_server_health():
        print("  ✅ 服务已在运行,正在打开浏览器...")
    else:
        print("  → 正在启动Flask服务器...")
        try:
            # 在后台启动服务器
            server_process = subprocess.Popen(
                [sys.executable, 'server/app.py'],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                creationflags=subprocess.CREATE_NEW_CONSOLE if sys.platform == 'win32' else 0
            )
            
            # 等待服务器启动
            print("  → 等待服务器启动...")
            for i in range(10):
                time.sleep(1)
                if check_server_health():
                    print("  ✅ 服务器启动成功!")
                    break
                if i == 9:
                    print("  ⚠️  服务器启动可能遇到问题,请检查控制台输出")
        except Exception as e:
            print(f"  ❌ 启动失败: {e}")
            return False
    
    # 打开浏览器
    print("\n" + "=" * 50)
    print("✅ 启动完成!")
    print("📍 访问地址: http://localhost:3001")
    print("=" * 50)
    
    try:
        webbrowser.open('http://localhost:3001')
    except:
        print("请手动打开浏览器访问: http://localhost:3001")
    
    return True

if __name__ == '__main__':
    try:
        success = main()
        if not success:
            print("\n❌ 启动检查失败,请解决上述问题后重试")
            input("\n按Enter键退出...")
            sys.exit(1)
        else:
            print("\n🎉 系统已就绪!")
            input("\n按Ctrl+C停止服务器...")
    except KeyboardInterrupt:
        print("\n\n已停止服务")
        sys.exit(0)
