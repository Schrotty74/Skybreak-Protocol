@echo off
cd /d "%~dp0"
set "PORT=8765"
start "" "http://127.0.0.1:%PORT%/"

where py >nul 2>nul
if %errorlevel%==0 (
  py -3 -m http.server %PORT% --bind 127.0.0.1
  goto :eof
)

where python >nul 2>nul
if %errorlevel%==0 (
  python -m http.server %PORT% --bind 127.0.0.1
  goto :eof
)

echo Python 3 was not found. Install Python 3 and run this starter again.
pause
