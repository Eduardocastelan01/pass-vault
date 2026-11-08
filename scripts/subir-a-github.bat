@echo off
chcp 65001 >nul
set "PATH=C:\Users\JELop\AppData\Local\Programs\git\cmd;C:\Users\JELop\AppData\Local\Programs\nodejs;%PATH%"
cd /d "C:\Users\JELop\Documents\AntigravityProjects\pass-vault"

echo ====================================================================
echo             PUBLICAR PASSVAULT EN GITHUB PARA OBTAINIUM
echo ====================================================================
echo.

set /p GITHUB_USER="Por favor ingresa tu nombre de usuario de GitHub: "
if "%GITHUB_USER%"=="" (
    echo.
    echo [ERROR] No ingresaste ningun usuario de GitHub.
    pause
    exit /b
)

echo.
echo [1/3] Configurando origen remoto para %GITHUB_USER%...
git remote remove origin >nul 2>&1
git remote add origin https://github.com/%GITHUB_USER%/pass-vault.git
git branch -M main

echo.
echo [2/3] Subiendo codigo principal...
echo (Si es la primera vez, se abrira una ventana de tu navegador para que inicies sesion)
git push -u origin main

if %ERRORLEVEL% neq 0 (
    echo.
    echo [AVISO] Asegurate de haber creado el repositorio vacio en https://github.com/new con el nombre 'pass-vault'.
    pause
    exit /b
)

echo.
echo [3/3] Publicando version v1.0.0 para que GitHub Actions compile la APK...
git tag -f v1.0.0
git push origin v1.0.0 --force

echo.
echo ====================================================================
echo [EXITO] ¡Proyecto subido correctamente a GitHub!
echo.
echo GitHub Actions esta compilando tu APK en este momento.
echo.
echo En tu Samsung Galaxy S25 Ultra:
echo 1. Abre Obtainium.
echo 2. Pulsa en '+' (Anadir App).
echo 3. Pega: https://github.com/%GITHUB_USER%/pass-vault
echo 4. Pulsa Anadir e Instalar.
echo ====================================================================
pause

