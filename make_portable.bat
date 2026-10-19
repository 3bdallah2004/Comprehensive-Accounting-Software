@echo off
setlocal enabledelayedexpansion

rem Build production and prepare a new portable folder without overwriting existing data.

set OUT=portable_updated
echo Building project (production)...
npm run build || (
  echo.
  echo Build failed. Make sure dependencies are installed and the build succeeds.
  pause
  exit /b 1
)

if not exist "%OUT%" mkdir "%OUT%"
if exist "%OUT%\www" rmdir /s /q "%OUT%\www"
mkdir "%OUT%\www"

echo Copying build files to %OUT%\www ...
xcopy /E /I /Y "dist\*" "%OUT%\www\" >nul
echo Copying server and data template...
copy /Y "server.js" "%OUT%\server.cjs" >nul
copy /Y "server.py" "%OUT%\" >nul
copy /Y "portable_default_data.json" "%OUT%\portable_default_data.json" >nul
if not exist "%OUT%\data.json" copy /Y "portable_default_data.json" "%OUT%\data.json" >nul

echo Creating run script in %OUT%...
copy /Y "portable_run.bat" "%OUT%\run.bat" >nul

echo Portable package created in "%CD%\%OUT%".
echo Copy the "%OUT%" folder to your USB drive, then run "run.bat" from the drive.
echo Node.js or Python is required on the target computer for persistent data saving.
pause
