# 🔐 PassVault — Bóveda de Contraseñas Zero-Knowledge Multiplataforma

PassVault es un ecosistema completo, privado y de código abierto para el almacenamiento seguro de contraseñas, notas confidenciales, tarjetas bancarias e identidades, con sincronización en tiempo real entre laptop (Windows), navegadores (Brave/Chrome) y celular (Samsung Galaxy S25 Ultra con servicio de autollenado nativo).

---

## 🌟 Características Principales

- **Criptografía Zero-Knowledge**:
  - Derivación de claves con **Argon2id** (64MB memoria, 3 iteraciones, 4 paralelismos).
  - Cifrado autenticado **AES-256-GCM** para cada registro.
  - La contraseña maestra y las claves de descifrado **nunca salen de tu dispositivo**.
  - El servidor solo almacena texto cifrado ininteligible y un hash de autenticación derivado por una vía unidireccional (HKDF + SHA-256).
- **Extensión Manifest V3 (Brave & Chrome)**:
  - Autollenado inteligente con detección de formularios y sugerencias flotantes.
  - Generador de contraseñas de alta entropía (8-64 caracteres) y frases de paso Diceware.
  - Captura automática de credenciales al iniciar sesión en nuevos sitios.
  - Sincronización instantánea mediante WebSockets.
- **Aplicación de Escritorio (Windows)**:
  - Interfaz de 3 columnas (Categorías, Lista y Detalles/Edición).
  - Previsualizador visual de tarjetas bancarias.
  - Copia rápida al portapapeles.
- **Aplicación Móvil (Samsung Galaxy S25 Ultra)**:
  - Integración con el **Android Autofill Framework** (`AutofillService` nativo).
  - Desbloqueo mediante sensor de huella ultrasónica en pantalla (`BiometricPrompt.BIOMETRIC_STRONG`).
  - Sincronización en segundo plano con WorkManager.

---

## 📁 Estructura del Proyecto

```
pass-vault/
├── packages/
│   └── core/            # Librería criptográfica (Argon2id, AES-GCM, generador, url-matcher)
├── apps/
│   ├── server/          # Servidor de sincronización en tiempo real (Fastify, WebSockets, SQLite)
│   ├── extension/       # Extensión Manifest V3 para Chrome y Brave (Vite + React/TS)
│   ├── desktop/         # Aplicación nativa de escritorio para Windows (Electron)
│   └── mobile/          # Aplicación Android con servicio de autollenado para Samsung S25 Ultra
```

---

## 🚀 Guía de Inicio Rápido

### 1. Iniciar el Servidor de Sincronización
En una terminal de PowerShell dentro de `pass-vault`:
```powershell
npm run dev:server
```
El servidor quedará escuchando en `http://localhost:3000` con la base de datos local SQLite cifrada en `data/vault.sqlite`.

---

### 2. Instalar la Extensión en Brave o Chrome

1. Abre tu navegador (**Brave** o **Chrome**).
2. Dirígete a la barra de direcciones y escribe:
   - En Brave: `brave://extensions`
   - En Chrome: `chrome://extensions`
3. Activa el interruptor **"Modo de desarrollador"** (Developer mode) en la esquina superior derecha.
4. Haz clic en el botón **"Cargar descomprimida"** (Load unpacked).
5. Selecciona la carpeta:
   ```
   C:\Users\JELop\Documents\AntigravityProjects\pass-vault\apps\extension\dist
   ```
6. ¡Listo! Verás el escudo de **PassVault** en la barra de extensiones. Haz clic en él, escribe tu correo y contraseña maestra para crear tu bóveda.

---

### 3. Iniciar la Aplicación de Escritorio (Windows)

En una terminal de PowerShell dentro de `pass-vault`:
```powershell
npm run dev --workspace=@pass-vault/desktop
```
Se abrirá la ventana de escritorio con acceso a todos tus elementos, visor de tarjetas de crédito y notas seguras.

---

### 4. Probar la Sincronización en Tiempo Real

1. Abre la extensión en **Brave**.
2. Agrega una nueva credencial (ej. Nombre: `GitHub`, Usuario: `mi_usuario`, Contraseña: generada).
3. Abre la app de escritorio o la extensión en **Chrome**: verás cómo el nuevo registro aparece al instante gracias a las notificaciones WebSocket del servidor.

---

## 🧪 Pruebas Automatizadas

Para validar todos los módulos criptográficos y la API de sincronización:
```powershell
npm test
```
Ejecuta:
- Vectores de prueba de **Argon2id** y **HKDF**.
- Cifrado y descifrado **AES-256-GCM**.
- Pruebas de resistencia a manipulación (tampering).
- Motor de entropía del generador de claves.
- Heurísticas anti-phishing de dominios para autollenado.
- Pruebas de integración del handshake Zero-Knowledge del servidor.

