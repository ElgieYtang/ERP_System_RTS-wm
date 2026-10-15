@echo off
setlocal EnableExtensions
cd /d "%~dp0"
call "%~dp0bin\_resolve-php.cmd"
if errorlevel 1 exit /b 1
"%PHP_EXE%" "%~dp0artisan" %*
exit /b %ERRORLEVEL%
