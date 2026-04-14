@echo off
cd /d c:\Users\32584\CodeBuddy\20260413152945
set PATH=%PATH%;C:\Program Files\nodejs;C:\Python313;C:\Python313\Scripts

echo Installing npm dependencies...
call npm install 2>&1
if errorlevel 1 (
    echo npm install failed!
    pause
    exit /b 1
)

echo.
echo Starting Python backend on port 3001...
start /b python server\app.py >nul 2>&1

echo Starting Vite dev server on port 5173...
call npm run dev
