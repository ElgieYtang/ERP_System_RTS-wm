@echo off
setlocal EnableExtensions
set "PHP_EXE="

if defined ERP_PHP (
  if exist "%ERP_PHP%" set "PHP_EXE=%ERP_PHP%" & goto :done
  echo [resolve-php] ERP_PHP is set but not found: %ERP_PHP%
  exit /b 1
)

rem --- WAMP (preferred versions for Laravel 8.2+) ---
call :try "C:\wamp64\bin\php\php8.3.28\php.exe"
if defined PHP_EXE goto :done
call :try "C:\wamp64\bin\php\php8.4.15\php.exe"
if defined PHP_EXE goto :done
call :try "C:\wamp64\bin\php\php8.2.29\php.exe"
if defined PHP_EXE goto :done
call :try "C:\wamp\bin\php\php8.3.28\php.exe"
if defined PHP_EXE goto :done

rem --- Newest php8.x folder under WAMP64 ---
if exist "C:\wamp64\bin\php\" (
  for /f "delims=" %%D in ('dir /b /ad /o-n "C:\wamp64\bin\php\php8.*" 2^>nul') do (
    call :try "C:\wamp64\bin\php\%%D\php.exe"
    if defined PHP_EXE goto :done
  )
)

rem --- Laragon / XAMPP ---
call :try "C:\laragon\bin\php\php-8.3.28-Win32-vs16-x64\php.exe"
if defined PHP_EXE goto :done
if exist "C:\laragon\bin\php\" (
  for /f "delims=" %%D in ('dir /b /ad /o-n "C:\laragon\bin\php\php-*" 2^>nul') do (
    call :try "C:\laragon\bin\php\%%D\php.exe"
    if defined PHP_EXE goto :done
  )
)
call :try "C:\xampp\php\php.exe"
call :try "C:\php\php.exe"

rem --- PHP on PATH (if configured) ---
for /f "delims=" %%P in ('where php 2^>nul') do (
  call :try "%%P"
  if defined PHP_EXE goto :done
)

echo.
echo PHP was not found. This project expects WAMP or another local PHP install.
echo.
echo Fix one of these:
echo   1. Start WAMP and ensure PHP is installed (e.g. C:\wamp64\bin\php\php8.3.28\php.exe)
echo   2. Set a permanent user env var ERP_PHP to your php.exe path
echo   3. Add PHP to your system PATH
echo.
exit /b 1

:try
if exist "%~1" set "PHP_EXE=%~1"
exit /b 0

:done
endlocal & set "PHP_EXE=%PHP_EXE%"
exit /b 0
