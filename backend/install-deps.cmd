@echo off
setlocal EnableExtensions
cd /d "%~dp0"
call "%~dp0bin\_resolve-php.cmd"
if errorlevel 1 exit /b 1

echo Using PHP: %PHP_EXE%
echo.

where composer >nul 2>&1
if %ERRORLEVEL% equ 0 (
  composer install --no-interaction
  exit /b %ERRORLEVEL%
)

if exist "%~dp0composer.phar" (
  "%PHP_EXE%" "%~dp0composer.phar" install --no-interaction
  exit /b %ERRORLEVEL%
)

echo Composer was not found on PATH and composer.phar is missing in backend\.
echo Install Composer from https://getcomposer.org/download/ then run install-deps.cmd again.
exit /b 1
