@echo off
rem Laravel API for web + mobile (bind all interfaces on port 8000)
cd /d "%~dp0"
call "%~dp0artisan.cmd" serve --host=0.0.0.0 --port=8000
exit /b %ERRORLEVEL%
