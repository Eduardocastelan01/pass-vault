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
  email: string | null;
  serverUrl: string;
  token: string | null;
  vaultKey: CryptoKey | null;
  items: DecryptedVaultItem[];
  lastSyncedAt: string | null;
}

let state: SessionState = {
  isUnlocked: false,
  email: null,
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
        state.email = email;
        state.token = data.token;
        state.vaultKey = vaultKey;
        state.items = [];

        connectWebSocket(data.token, state.serverUrl);
        return { success: true };
      }

      case 'LOGIN': {
        const { email, password, serverUrl } = message;
        state.serverUrl = serverUrl || state.serverUrl;
        chrome.storage.local.set({ serverUrl: state.serverUrl, email });

        // 1. Obtener Salt con Prelogin
        const preRes = await fetch(`${state.serverUrl}/api/v1/auth/prelogin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        if (!preRes.ok) throw new Error('Error al conectar con el servidor');
        const { salt } = await preRes.json();

        // 2. Derivar claves localmente (Zero-Knowledge)
        const { vaultKey, authHash } = await deriveKeys(password, salt);

        // 3. Login
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
        state.email = email;
        state.token = loginData.token;
        state.vaultKey = vaultKey;

        // 4. Descargar y descifrar bóveda
        await syncVault();
        connectWebSocket(loginData.token, state.serverUrl);

        return { success: true, count: state.items.length };
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
        if (!state.isUnlocked || !state.vaultKey || !state.token) {
          throw new Error('Bóveda bloqueada');
        }

        const { id = crypto.randomUUID(), type, name, data, favorite = false } = message.item;
        const encryptedPayload = await encryptData(data, state.vaultKey);
        const now = new Date().toISOString();

        const uploadRes = await fetch(`${state.serverUrl}/api/v1/vault/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${state.token}`,
          },
          body: JSON.stringify({
            items: [
              {
                id,
                type,
                name,
                favorite,
                encryptedPayload,
                version: 1,
                updatedAt: now,
              },
            ],
          }),
        });

        if (!uploadRes.ok) throw new Error('Error al sincronizar con el servidor');

        // Actualizar estado local
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

