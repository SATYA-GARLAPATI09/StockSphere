@echo off
title StockSphere Launcher
echo ===================================================
echo   Starting StockSphere Full-Stack Application
echo ===================================================
cd /d "%~dp0"

echo [1/2] Starting Backend Server (Port 5000)...
start "StockSphere Backend Server" cmd /k "cd server && npm run dev"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend Client (Port 5173)...
start "StockSphere Frontend Client" cmd /k "cd client && npm run dev"

timeout /t 3 /nobreak >nul

echo Opening browser at http://localhost:5173 ...
start http://localhost:5173

echo Done! Both services are running in separate terminal windows.
