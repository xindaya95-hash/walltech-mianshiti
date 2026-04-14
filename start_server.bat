@echo off
chcp 65001 > nul
title CRM客户事件跟进系统

echo.
echo ========================================
echo     CRM客户事件跟进系统 - 快速启动
echo ========================================
echo.

:: 检查Python是否安装
python --version > nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到Python,请先安装Python 3.x
    echo 下载地址: https://www.python.org/downloads/
    pause
    exit /b 1
)

:: 检查依赖
echo [1/3] 检查Python依赖...
pip show flask > nul 2>&1
if errorlevel 1 (
    echo         发现缺少依赖,正在安装...
    pip install -r requirements.txt
)

:: 检查端口
echo [2/3] 检查端口3002...
netstat -ano | findstr ":3002" > nul 2>&1
if not errorlevel 1 (
    echo         端口3002已被占用,正在检查服务状态...
    curl -s http://localhost:3002/api/health > nul 2>&1
    if not errorlevel 1 (
        echo         ✅ 服务已在运行!
    ) else (
        echo         ⚠️  端口被占用但服务无响应,请检查是否需要关闭占用程序
    )
) else (
    echo         ✅ 端口可用
)

:: 启动服务
echo [3/3] 启动服务...
echo.
echo ========================================
echo.
start /b python "%~dp0server\app.py" > nul 2>&1 &
timeout /t 3 /nobreak > nul

:: 打开浏览器
echo ✅ 服务启动中,正在打开浏览器...
start http://localhost:3002

echo.
echo ========================================
echo     🎉 启动完成!
echo.
echo     访问地址: http://localhost:3002
echo.
echo     如遇问题请查看:
echo     - 控制台错误信息
echo     - 启动检查脚本: start_check.py
echo.
echo ========================================
echo.
pause
