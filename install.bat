@echo off
cd /d c:\Users\32584\CodeBuddy\20260413152945
rmdir /s /q node_modules 2>nul
set PATH=%PATH%;C:\Program Files\nodejs
npm install
echo.
echo Installation completed. Press any key to exit...
pause >nul
