import {
  deriveKeys,
  encryptData,
  decryptData,
  matchesUri,
  generateSalt,
  DecryptedVaultItem,
  EncryptedVaultItem,
  LoginData,
  CardData,
  NoteData,
} from '@pass-vault/core';

interface SessionState {
  isUnlocked: boolean;
  isOfflineMode: boolean;
  email: string | null;
  salt: string | null;
  authHash: string | null;
  serverUrl: string;
  token: string | null;
  vaultKey: CryptoKey | null;
  items: DecryptedVaultItem[];
  lastSyncedAt: string | null;
}

interface LocalVaultCache {
  email: string;
  salt: string;
  authHash: string;
  items: EncryptedVaultItem[];
  lastSyncedAt: string;
}

let state: SessionState = {
  isUnlocked: false,
  isOfflineMode: false,
  email: null,
  salt: null,
  authHash: null,
  serverUrl: 'http://localhost:3000',
  token: null,
  vaultKey: null,
  items: [],
  lastSyncedAt: null,
};

let syncWebSocket: WebSocket | null = null;

// Inicializar configuración guardada (servidor y último email)
chrome.storage.local.get(['serverUrl', 'email'], (result) => {
  if (result.serverUrl) state.serverUrl = result.serverUrl;
  if (result.email) state.email = result.email;
});

function connectWebSocket(token: string, serverUrl: string) {
  if (syncWebSocket) {
    syncWebSocket.close();
  }

  try {
    const wsUrl = serverUrl.replace(/^http/, 'ws') + `/api/v1/ws?token=${encodeURIComponent(token)}`;
    syncWebSocket = new WebSocket(wsUrl);

    syncWebSocket.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'sync:needed') {
          console.log('[PassVault] Sincronización en tiempo real recibida');
          await syncVault();
        }
      } catch (err) {
        console.error('[PassVault WS]', err);
      }
    };

    syncWebSocket.onclose = () => {
      syncWebSocket = null;
    };
  } catch (err) {
    console.error('[PassVault WS Connect]', err);
  }
}

async function syncVault(): Promise<boolean> {
  if (!state.isUnlocked || !state.vaultKey || !state.token) return false;

  try {
    const url = `${state.serverUrl}/api/v1/vault/sync`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${state.token}` },
    });

    if (!res.ok) return false;

    const data = await res.json();
    const rawItems: EncryptedVaultItem[] = data.items || [];

    const decryptedList: DecryptedVaultItem[] = [];
    for (const raw of rawItems) {
      if (raw.deleted) continue;
      try {
        const itemData = await decryptData(raw.encryptedPayload, state.vaultKey);
        decryptedList.push({
          id: raw.id,
          type: raw.type,
          name: raw.name,
          favorite: raw.favorite,
          folderId: raw.folderId,
          createdAt: raw.createdAt,
          updatedAt: raw.updatedAt,
          version: raw.version,
          data: itemData,
        });
      } catch (err) {
        console.error(`[PassVault] Error al descifrar elemento ${raw.id}`, err);
      }
    }

    state.items = decryptedList;
    state.lastSyncedAt = data.serverTime;

    // Guardar copia local cifrada en el dispositivo para acceso 100% offline
    if (state.email && state.salt && state.authHash) {
      chrome.storage.local.set({
        cachedVault: {
          email: state.email,
          salt: state.salt,
          authHash: state.authHash,
          items: rawItems,
          lastSyncedAt: data.serverTime,
        },
      });
    }

    return true;
  } catch (err) {
    console.error('[PassVault Sync Error]', err);
    return false;
  }
}

// Receptor de mensajes desde Popup y Content Scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handleAsync = async () => {
    switch (message.type) {
      case 'GET_STATUS': {
        return {
          isUnlocked: state.isUnlocked,
          isOfflineMode: state.isOfflineMode,
          email: state.email,
          serverUrl: state.serverUrl,
          itemsCount: state.items.length,
          lastSyncedAt: state.lastSyncedAt,
        };
      }

      case 'REGISTER': {
        const { email, password, serverUrl } = message;
        state.serverUrl = serverUrl || state.serverUrl;
        chrome.storage.local.set({ serverUrl: state.serverUrl, email });

        const salt = generateSalt();
        const { vaultKey, authHash } = await deriveKeys(password, salt);

        const res = await fetch(`${state.serverUrl}/api/v1/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, salt, authHash }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Fallo el registro');
        }

        const data = await res.json();
        state.isUnlocked = true;
        state.isOfflineMode = false;
        state.email = email;
        state.salt = salt;
        state.authHash = authHash;
        state.token = data.token;
        state.vaultKey = vaultKey;
        state.items = [];

        // Guardar copia local inicial cifrada para acceso offline
        chrome.storage.local.set({
          cachedVault: {
            email,
            salt,
            authHash,
            items: [],
            lastSyncedAt: new Date().toISOString(),
          },
        });

        connectWebSocket(data.token, state.serverUrl);
        return { success: true };
      }

      case 'LOGIN': {
        const { email, password, serverUrl } = message;
        state.serverUrl = serverUrl || state.serverUrl;
        chrome.storage.local.set({ serverUrl: state.serverUrl, email });

        // Intentar conectar con el servidor
        let isOnline = true;
        let salt = '';

        try {
          const preRes = await fetch(`${state.serverUrl}/api/v1/auth/prelogin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });

          if (preRes.ok) {
            const preData = await preRes.json();
            salt = preData.salt;
          } else {
            isOnline = false;
          }
        } catch {
          // Servidor apagado o inalcanzable (laptop apagada, sin red, etc.)
          isOnline = false;
        }

        if (isOnline && salt) {
          // MODO ONLINE: Derivar claves con el salt del servidor
          const { vaultKey, authHash } = await deriveKeys(password, salt);

          const loginRes = await fetch(`${state.serverUrl}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, authHash }),
          });

          if (!loginRes.ok) {
            const err = await loginRes.json();
            throw new Error(err.error || 'Credenciales inválidas');
          }

          const loginData = await loginRes.json();
          state.isUnlocked = true;
          state.isOfflineMode = false;
          state.email = email;
          state.salt = salt;
          state.authHash = authHash;
          state.token = loginData.token;
          state.vaultKey = vaultKey;

          // Descargar y sincronizar
          await syncVault();
          connectWebSocket(loginData.token, state.serverUrl);

          return { success: true, count: state.items.length, offline: false };
        } else {
          // MODO OFFLINE: El servidor está apagado (laptop apagada) o no hay internet
          const cached = await new Promise<LocalVaultCache | null>((resolve) => {
            chrome.storage.local.get(['cachedVault'], (res) => {
              resolve(res.cachedVault || null);
            });
          });

          if (!cached || cached.email.toLowerCase() !== email.toLowerCase()) {
            throw new Error(
              'El servidor está inalcanzable o apagado. Para iniciar sesión por primera vez se requiere conexión con el servidor.'
            );
          }

          // Derivar claves localmente con el salt guardado
          const { vaultKey, authHash } = await deriveKeys(password, cached.salt);

          if (authHash !== cached.authHash) {
            throw new Error('Contraseña maestra incorrecta.');
          }

          // Descifrar elementos de la copia local
          const decryptedList: DecryptedVaultItem[] = [];
          for (const raw of cached.items || []) {
            if (raw.deleted) continue;
            try {
              const itemData = await decryptData(raw.encryptedPayload, vaultKey);
              decryptedList.push({
                id: raw.id,
                type: raw.type,
                name: raw.name,
                favorite: raw.favorite,
                folderId: raw.folderId,
                createdAt: raw.createdAt,
                updatedAt: raw.updatedAt,
                version: raw.version,
                data: itemData,
              });
            } catch (err) {
              console.error('Error al descifrar offline', err);
            }
          }

          state.isUnlocked = true;
          state.isOfflineMode = true;
          state.email = email;
          state.salt = cached.salt;
          state.authHash = authHash;
          state.token = null;
          state.vaultKey = vaultKey;
          state.items = decryptedList;
          state.lastSyncedAt = cached.lastSyncedAt;

          return { success: true, count: state.items.length, offline: true };
        }
      }

      case 'LOCK': {
        state.isUnlocked = false;
        state.token = null;
        state.vaultKey = null;
        state.items = [];
        if (syncWebSocket) syncWebSocket.close();
        return { success: true };
      }

      case 'GET_ITEMS': {
        if (!state.isUnlocked) return { error: 'Locked', items: [] };
        return { items: state.items };
      }

      case 'GET_MATCHING_LOGINS': {
        if (!state.isUnlocked) return { items: [] };
        const url = message.url || '';
        const matching = state.items.filter((item) => {
          if (item.type !== 'login') return false;
          const loginData = item.data as LoginData;
          return matchesUri(url, loginData.uris || []);
        });
        return { items: matching };
      }

      case 'SAVE_ITEM': {
        if (!state.isUnlocked || !state.vaultKey) {
          throw new Error('Bóveda bloqueada');
        }

        const { id = crypto.randomUUID(), type, name, data, favorite = false } = message.item;
        const encryptedPayload = await encryptData(data, state.vaultKey);
        const now = new Date().toISOString();

        const encryptedItem: EncryptedVaultItem = {
          id,
          type,
          name,
          favorite,
          folderId: null,
          createdAt: now,
          updatedAt: now,
          version: 1,
          encryptedPayload,
        };

        // Si tenemos conexión y token, sincronizar con el servidor
        if (!state.isOfflineMode && state.token) {
          try {
            await fetch(`${state.serverUrl}/api/v1/vault/sync`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${state.token}`,
              },
              body: JSON.stringify({
                items: [encryptedItem],
              }),
            });
          } catch (syncErr) {
            console.warn('[PassVault] No se pudo sincronizar inmediatamente, guardando localmente', syncErr);
          }
        }

        // Actualizar estado en memoria
        const existingIndex = state.items.findIndex((i) => i.id === id);
        const newItem: DecryptedVaultItem = {
          id,
          type,
          name,
          favorite,
          folderId: null,
          createdAt: now,
          updatedAt: now,
          version: 1,
          data,
        };

        if (existingIndex >= 0) {
          state.items[existingIndex] = newItem;
        } else {
          state.items.unshift(newItem);
        }

        // Actualizar caché local cifrada
        chrome.storage.local.get(['cachedVault'], (res) => {
          const cached: LocalVaultCache = res.cachedVault || {
            email: state.email || '',
            salt: state.salt || '',
            authHash: state.authHash || '',
            items: [],
            lastSyncedAt: now,
          };
          const rawIndex = cached.items.findIndex((i) => i.id === id);
          if (rawIndex >= 0) {
            cached.items[rawIndex] = encryptedItem;
          } else {
            cached.items.unshift(encryptedItem);
          }
          cached.lastSyncedAt = now;
          chrome.storage.local.set({ cachedVault: cached });
        });

        return { success: true, item: newItem };
      }

      case 'SYNC_NOW': {
        const ok = await syncVault();
        return { success: ok, count: state.items.length };
      }

      default:
        return { error: 'Acción desconocida' };
    }
  };

  handleAsync()
    .then(sendResponse)
    .catch((err) => sendResponse({ error: err.message }));

  return true; // Asynchronous sendResponse
});

