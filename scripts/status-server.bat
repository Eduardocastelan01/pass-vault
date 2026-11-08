@echo off
chcp 65001 >nul
netstat -aon | findstr ":3000" | findstr "LISTENING" >nul
if %ERRORLEVEL% equ 0 (
    echo [OK] PassVault Server está ACTIVO y funcionando silenciosamente en segundo plano.
) else (
    echo [INFO] El servidor está detenido. Ejecuta start-silent.bat para iniciarlo.
)
pause

