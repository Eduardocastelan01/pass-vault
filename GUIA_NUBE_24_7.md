# ☁️ Guía de Disponibilidad 24/7 y Despliegue en la Nube Gratuito

Para que tu gestor de contraseñas funcione en todo momento en tu **Samsung Galaxy S25 Ultra** y en tu laptop sin depender de tener la laptop encendida, PassVault cuenta con **dos mecanismos complementarios**:

---

## 1. Funcionamiento Offline-First (Ya implementado)

No necesitas tener internet ni el servidor encendido para ver tus contraseñas:
- Cada vez que sincronizas en tu celular o en tu navegador, una copia cifrada con tu clave maestra se almacena localmente en el dispositivo.
- **Si tu laptop está apagada**: Abres la extensión o la app en tu S25 Ultra, ingresas tu contraseña maestra y la aplicación descifra la copia local en memoria.
- Podrás buscar, copiar contraseñas, tarjetas y notas **al 100% en modo offline** (incluso en modo avión).

---

## 2. Servidor en la Nube 24/7 Gratuito (Para sincronizar sin tu laptop)

Si quieres que las contraseñas que agregues en tu S25 Ultra o en tu laptop se sincronicen entre sí en cualquier momento y desde cualquier lugar (red móvil 5G o Wi-Fi), puedes hospedar el servidor en la nube sin costo.

### Opción Recomendada: Render.com (100% Gratuito y 24/7)

1. **Crear cuenta gratuita**: Entra a [render.com](https://render.com) y regístrate con tu cuenta de GitHub o correo.
2. **Subir tu proyecto a GitHub**:
   - Crea un repositorio privado en tu GitHub llamado `pass-vault`.
   - Vincula tu carpeta local ejecutando en PowerShell:
     ```powershell
     git remote add origin https://github.com/TU_USUARIO/pass-vault.git
     git push -u origin main
     ```
3. **Crear Web Service en Render**:
   - En el panel de Render, haz clic en **New +** > **Web Service**.
   - Conecta tu repositorio `pass-vault`.
   - Configura:
     - **Runtime**: `Node`
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `node apps/server/dist/server.js`
     - **Plan**: `Free` (Gratis)
4. **Obtener tu URL Segura**:
   - Render te dará una URL HTTPS como:
     `https://mi-passvault.onrender.com`
5. **Usar tu nueva URL**:
   - En la extensión de Brave/Chrome y en tu Samsung Galaxy S25 Ultra, en lugar de `http://localhost:3000`, ingresa tu URL:
     `https://mi-passvault.onrender.com`
   - ¡A partir de ese momento, el servidor estará encendido los 365 días del año en la nube, y tu laptop podrá estar apagada sin interrumpir el funcionamiento de tu celular!

