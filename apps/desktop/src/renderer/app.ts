import {
  deriveKeys,
  encryptData,
  decryptData,
  generatePassword,
  DecryptedVaultItem,
  LoginData,
  CardData,
  NoteData,
} from '@pass-vault/core';

declare global {
  interface Window {
    passvaultDesktop: {
      copyToClipboard: (text: string) => Promise<boolean>;
    };
  }
}

// Elementos del DOM
const desktopAuth = document.getElementById('desktop-auth')!;
const desktopMain = document.getElementById('desktop-main')!;
const authServer = document.getElementById('auth-server') as HTMLInputElement;
const authEmail = document.getElementById('auth-email') as HTMLInputElement;
const authPassword = document.getElementById('auth-password') as HTMLInputElement;
const authMsg = document.getElementById('auth-msg')!;
const btnLogin = document.getElementById('btn-login')!;

const searchInput = document.getElementById('search-input') as HTMLInputElement;
const itemListContainer = document.getElementById('item-list-container')!;
const detailsColumn = document.getElementById('details-column')!;
const btnSyncDesk = document.getElementById('btn-sync-desk')!;
const btnLockDesk = document.getElementById('btn-lock-desk')!;
const btnNewItem = document.getElementById('btn-new-item')!;
const navItems = document.querySelectorAll('.nav-item');

let sessionState = {
  token: '',
  vaultKey: null as CryptoKey | null,
  items: [] as DecryptedVaultItem[],
  selectedId: null as string | null,
  filter: 'all',
  serverUrl: 'http://localhost:3000',
};

async function copyText(text: string) {
  if (window.passvaultDesktop?.copyToClipboard) {
    await window.passvaultDesktop.copyToClipboard(text);
  } else {
    navigator.clipboard.writeText(text);
  }
}

btnLogin.addEventListener('click', async () => {
  authMsg.style.display = 'none';
  const email = authEmail.value.trim();
  const password = authPassword.value;
  const serverUrl = authServer.value.trim();

  if (!email || !password) {
    authMsg.textContent = 'Ingresa correo y contraseña';
    authMsg.style.display = 'block';
    return;
  }

  btnLogin.textContent = 'Derivando claves con Argon2id...';
  (btnLogin as HTMLButtonElement).disabled = true;

  try {
    sessionState.serverUrl = serverUrl;

    // 1. Prelogin
    const preRes = await fetch(`${serverUrl}/api/v1/auth/prelogin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!preRes.ok) throw new Error('No se pudo conectar con el servidor');
    const { salt } = await preRes.json();

    // 2. Derivación Zero-Knowledge
    const { vaultKey, authHash } = await deriveKeys(password, salt);

    // 3. Login
    const loginRes = await fetch(`${serverUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, authHash }),
    });

    if (!loginRes.ok) throw new Error('Credenciales inválidas');
    const loginData = await loginRes.json();

    sessionState.token = loginData.token;
    sessionState.vaultKey = vaultKey;

    desktopAuth.style.display = 'none';
    desktopMain.style.display = 'flex';

    await syncItems();
  } catch (err: any) {
    authMsg.textContent = err.message || 'Error al iniciar sesión';
    authMsg.style.display = 'block';
  } finally {
    btnLogin.textContent = 'Desbloquear Bóveda';
    (btnLogin as HTMLButtonElement).disabled = false;
  }
});

btnLockDesk.addEventListener('click', () => {
  sessionState.token = '';
  sessionState.vaultKey = null;
  sessionState.items = [];
  sessionState.selectedId = null;
  authPassword.value = '';
  desktopMain.style.display = 'none';
  desktopAuth.style.display = 'flex';
});

btnSyncDesk.addEventListener('click', async () => {
  btnSyncDesk.textContent = 'Sincronizando...';
  await syncItems();
  btnSyncDesk.textContent = '🔄 Sincronizar';
});

async function syncItems() {
  if (!sessionState.token || !sessionState.vaultKey) return;

  try {
    const res = await fetch(`${sessionState.serverUrl}/api/v1/vault/sync`, {
      headers: { Authorization: `Bearer ${sessionState.token}` },
    });

    if (!res.ok) return;

    const data = await res.json();
    const decryptedList: DecryptedVaultItem[] = [];

    for (const raw of data.items || []) {
      if (raw.deleted) continue;
      try {
        const itemData = await decryptData<any>(raw.encryptedPayload, sessionState.vaultKey);
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
      } catch (e) {
        console.error('Error al descifrar elemento', e);
      }
    }

    sessionState.items = decryptedList;
    renderItemList();

    if (sessionState.selectedId) {
      renderDetails(sessionState.selectedId);
    }
  } catch (err) {
    console.error('Error al sincronizar', err);
  }
}

function renderItemList() {
  const query = searchInput.value.toLowerCase().trim();
  const filtered = sessionState.items.filter((item) => {
    if (sessionState.filter !== 'all' && item.type !== sessionState.filter) return false;
    if (!query) return true;
    return item.name.toLowerCase().includes(query);
  });

  itemListContainer.innerHTML = '';

  for (const item of filtered) {
    const row = document.createElement('div');
    row.className = `item-row ${item.id === sessionState.selectedId ? 'selected' : ''}`;

    let sub = '';
    if (item.type === 'login') sub = (item.data as LoginData).username || 'Login';
    else if (item.type === 'card') sub = `•••• ${(item.data as CardData).number?.slice(-4) || 'Tarjeta'}`;
    else if (item.type === 'note') sub = 'Nota segura cifrada';

    row.innerHTML = `
      <div class="item-row-title">${item.name}</div>
      <div class="item-row-sub">${sub}</div>
    `;

    row.addEventListener('click', () => {
      sessionState.selectedId = item.id;
      renderItemList();
      renderDetails(item.id);
    });

    itemListContainer.appendChild(row);
  }
}

function renderDetails(itemId: string) {
  const item = sessionState.items.find((i) => i.id === itemId);
  if (!item) {
    detailsColumn.innerHTML = `<div style="color: var(--text-sub); text-align: center; margin-top: 100px;">Elemento no encontrado.</div>`;
    return;
  }

  let contentHtml = '';

  if (item.type === 'login') {
    const data = item.data as LoginData;
    contentHtml = `
      <div class="field-block">
        <label class="field-label">Nombre del Sitio</label>
        <div class="details-title">${item.name}</div>
      </div>
      <div class="field-block">
        <label class="field-label">Usuario / Correo</label>
        <div class="field-value-box">
          <input type="text" value="${data.username}" readonly>
          <button class="btn-secondary" id="btn-copy-u">Copiar</button>
        </div>
      </div>
      <div class="field-block">
        <label class="field-label">Contraseña</label>
        <div class="field-value-box">
          <input type="password" value="${data.password}" id="dt-pass" readonly>
          <button class="btn-secondary" id="btn-toggle-p">👁️</button>
          <button class="btn-secondary" id="btn-copy-p">Copiar</button>
        </div>
      </div>
      <div class="field-block">
        <label class="field-label">Direcciones Web (URIs)</label>
        <input type="text" value="${(data.uris || []).join(', ')}" readonly>
      </div>
      <div class="field-block">
        <label class="field-label">Notas Adicionales</label>
        <textarea rows="4" readonly>${data.notes || ''}</textarea>
      </div>
    `;
  } else if (item.type === 'card') {
    const data = item.data as CardData;
    contentHtml = `
      <div class="credit-card-preview">
        <div style="font-size: 16px; font-weight: 700; color: #38bdf8;">${data.brand?.toUpperCase() || 'TARJETA'}</div>
        <div class="card-number-display">${data.number.replace(/(\d{4})/g, '$1 ').trim()}</div>
        <div class="card-bottom-display">
          <div>TITULAR<br><strong>${data.cardholderName || 'VALUED CLIENT'}</strong></div>
          <div>EXPIRA<br><strong>${data.expMonth}/${data.expYear}</strong></div>
        </div>
      </div>
      <div class="field-block">
        <label class="field-label">Número Completo</label>
        <div class="field-value-box">
          <input type="text" value="${data.number}" readonly>
          <button class="btn-secondary" id="btn-copy-card">Copiar</button>
        </div>
      </div>
      <div class="field-block">
        <label class="field-label">CVV / Código de Seguridad</label>
        <div class="field-value-box">
          <input type="password" value="${data.cvv}" id="dt-cvv" readonly>
          <button class="btn-secondary" id="btn-copy-cvv">Copiar</button>
        </div>
      </div>
    `;
  } else if (item.type === 'note') {
    const data = item.data as NoteData;
    contentHtml = `
      <div class="field-block">
        <label class="field-label">Título</label>
        <div class="details-title">${item.name}</div>
      </div>
      <div class="field-block">
        <label class="field-label">Nota Cifrada</label>
        <textarea rows="14" readonly>${data.text || ''}</textarea>
        <button class="btn-secondary" id="btn-copy-note" style="margin-top: 8px;">Copiar Nota</button>
      </div>
    `;
  }

  detailsColumn.innerHTML = contentHtml;

  // Event handlers para los botones de copia
  document.getElementById('btn-copy-u')?.addEventListener('click', () => copyText((item.data as LoginData).username));
  document.getElementById('btn-copy-p')?.addEventListener('click', () => copyText((item.data as LoginData).password));
  document.getElementById('btn-copy-card')?.addEventListener('click', () => copyText((item.data as CardData).number));
  document.getElementById('btn-copy-cvv')?.addEventListener('click', () => copyText((item.data as CardData).cvv));
  document.getElementById('btn-copy-note')?.addEventListener('click', () => copyText((item.data as NoteData).text));

  const toggleP = document.getElementById('btn-toggle-p');
  if (toggleP) {
    toggleP.addEventListener('click', () => {
      const passInp = document.getElementById('dt-pass') as HTMLInputElement;
      passInp.type = passInp.type === 'password' ? 'text' : 'password';
    });
  }
}

searchInput.addEventListener('input', renderItemList);

navItems.forEach((nav) => {
  nav.addEventListener('click', () => {
    navItems.forEach((n) => n.classList.remove('active'));
    nav.classList.add('active');
    sessionState.filter = nav.getAttribute('data-filter') || 'all';
    renderItemList();
  });
});

