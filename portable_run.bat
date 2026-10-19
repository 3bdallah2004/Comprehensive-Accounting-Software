@echo off
setlocal
set PORT=5173
cd /d "%~dp0"

where node >nul 2>&1
if %ERRORLEVEL%==0 goto start_node

where python >nul 2>&1
if %ERRORLEVEL%==0 goto start_python

echo Node.js or Python is required for persistent data saving.
echo Install either one, then run this file again.
pause
exit /b 1

:start_node
start "Accounting server" /min cmd /c "node server.cjs"
goto open_browser

:start_python
start "Accounting server" /min cmd /c "python server.py"

:open_browser
timeout /t 2 >nul
start "" "http://127.0.0.1:%PORT%/"
