@echo off
chcp 65001 >nul
echo Buscando proceso de PassVault en puerto 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
    echo [OK] Servidor detenido con éxito (PID %%a).
)
echo Proceso finalizado.
pause

