@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Responda Demo Launcher

echo.
echo  Responda - local academic demonstration
echo  This demo does not contact real emergency services.
echo.

where node >nul 2>&1
if errorlevel 1 goto missing_node
where npm >nul 2>&1
if errorlevel 1 goto missing_npm

echo Node version:
node --version
echo.

if not exist "node_modules\prisma\build\index.js" (
  echo Installing project dependencies. This can take a few minutes the first time...
  call npm ci
  if errorlevel 1 goto setup_failed
)

if not exist "server\.env" (
  echo Creating the local server settings file...
  copy /y "server\.env.example" "server\.env" >nul
  if errorlevel 1 goto setup_failed
)

if not exist "server\prisma\dev.db" (
  echo Creating and seeding the demo database...
  call npm run db:setup
  if errorlevel 1 goto setup_failed
) else (
  echo Preparing the existing demo database...
  call npm run db:generate
  if errorlevel 1 goto setup_failed
  call npm run db:migrate
  if errorlevel 1 goto setup_failed
)

if not exist "tmp" mkdir "tmp"
if not exist "tmp\demo.stdin" type nul > "tmp\demo.stdin"

set "READY="
set "API_READY="
set "WEB_READY="
curl.exe --silent --fail --max-time 3 "http://127.0.0.1:4000/api/health" >nul 2>&1
if not errorlevel 1 set "API_READY=1"
curl.exe --silent --fail --max-time 3 "http://127.0.0.1:5173/" >nul 2>&1
if not errorlevel 1 set "WEB_READY=1"
if defined API_READY if defined WEB_READY set "READY=1"
if defined API_READY if not defined WEB_READY goto partial_server
if not defined API_READY if defined WEB_READY goto partial_server

if not defined READY (
  echo Starting the website and API...
  powershell.exe -NoProfile -Command "$p = Start-Process -FilePath $env:ComSpec -ArgumentList '/d /c npm run dev' -WorkingDirectory '%CD%' -WindowStyle Hidden -RedirectStandardInput '%CD%\tmp\demo.stdin' -RedirectStandardOutput '%CD%\tmp\responda-demo.log' -RedirectStandardError '%CD%\tmp\responda-demo-error.log' -PassThru; Set-Content -LiteralPath '%CD%\tmp\responda-demo.pid' -Value $p.Id"
  if errorlevel 1 goto setup_failed
  for /L %%i in (1,1,60) do (
    if not defined READY (
      set "API_READY="
      set "WEB_READY="
      curl.exe --silent --fail --max-time 3 "http://127.0.0.1:4000/api/health" >nul 2>&1
      if not errorlevel 1 set "API_READY=1"
      curl.exe --silent --fail --max-time 3 "http://127.0.0.1:5173/" >nul 2>&1
      if not errorlevel 1 set "WEB_READY=1"
      if defined API_READY if defined WEB_READY set "READY=1"
      if not defined READY timeout /t 1 /nobreak >nul
    )
  )
)

if not defined READY goto startup_failed

echo.
echo Opening the caller pages and role sign-in tabs in your default browser...
start "" "http://localhost:5173/"
start "" "http://localhost:5173/request/emergency"
start "" "http://localhost:5173/request/requirements"
start "" "http://localhost:5173/request/status"
start "" "http://localhost:5173/login?email=operator1%40demo.local"
start "" "http://localhost:5173/login?email=hospital1%40demo.local"
start "" "http://localhost:5173/login?email=admin%40demo.local"

echo.
echo The demo is ready. Sample password: DemoAccess!2026
echo The operator, hospital and admin tabs have their email prefilled.
echo This browser profile can use one staff role at a time; sign out before switching roles.
echo The website and API are running in the background.
echo Run STOP_DEMO.bat to stop them.
echo Logs: tmp\responda-demo.log and tmp\responda-demo-error.log
echo.
pause
exit /b 0

:missing_node
echo Node.js was not found. Install Node.js 20.19 or newer, then run this file again.
pause
exit /b 1

:missing_npm
echo npm was not found. Reinstall Node.js with npm included, then run this file again.
pause
exit /b 1

:partial_server
echo Only one required local port is responding. A partial server may already be running.
echo Close that process or restart Windows, then run START_DEMO.bat again.
echo The launcher did not start a duplicate server.
pause
exit /b 1

:setup_failed
echo Setup did not finish. Review the error above and run START_DEMO.bat again.
pause
exit /b 1

:startup_failed
echo The website did not become ready. Check the logs in the tmp folder for details.
if exist "tmp\responda-demo.log" type "tmp\responda-demo.log"
if exist "tmp\responda-demo-error.log" type "tmp\responda-demo-error.log"
pause
exit /b 1
