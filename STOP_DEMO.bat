@echo off
setlocal EnableExtensions
cd /d "%~dp0"

if not exist "tmp\responda-demo.pid" (
  echo No launcher-started demo server is running.
  pause
  exit /b 0
)

for /f "usebackq delims=" %%P in ("tmp\responda-demo.pid") do taskkill /PID %%P /T /F >nul 2>&1
del /q "tmp\responda-demo.pid" >nul 2>&1
echo The local demo website and API have been stopped.
pause
