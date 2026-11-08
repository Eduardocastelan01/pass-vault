import {
  generatePassword,
  evaluatePasswordStrength,
  DecryptedVaultItem,
  LoginData,
  CardData,
  NoteData,
} from '@pass-vault/core';

// Referencias del DOM
const viewAuth = document.getElementById('view-auth')!;
const viewVault = document.getElementById('view-vault')!;
const viewDetail = document.getElementById('view-detail')!;

// Auth
const authServer = document.getElementById('auth-server') as HTMLInputElement;
const authEmail = document.getElementById('auth-email') as HTMLInputElement;
const authPassword = document.getElementById('auth-password') as HTMLInputElement;
const authError = document.getElementById('auth-error')!;
const btnAuthSubmit = document.getElementById('btn-auth-submit')!;
const btnToggleAuthMode = document.getElementById('btn-toggle-auth-mode')!;
const authTitle = document.getElementById('auth-title')!;

// Header NordPass
const btnVaultMenu = document.getElementById('btn-vault-menu')!;
const vaultDropdown = document.getElementById('vault-dropdown')!;
const selectedVaultLabel = document.getElementById('selected-vault-label')!;
const userAvatar = document.getElementById('user-avatar')!;

// Búsqueda y Lista
const vaultSearch = document.getElementById('vault-search') as HTMLInputElement;
const btnSort = document.getElementById('btn-sort')!;
const sortLabel = document.getElementById('sort-label')!;
const itemsCounter = document.getElementById('items-counter')!;
const itemsList = document.getElementById('items-list')!;

// Bottom Bar
const btnSettings = document.getElementById('btn-settings')!;
const btnSync = document.getElementById('btn-sync')!;
const btnAddItem = document.getElementById('btn-add-item')!;
const btnFullscreen = document.getElementById('btn-fullscreen')!;

// Vista de Detalle (Image 2)
const btnDetailBack = document.getElementById('btn-detail-back')!;
const btnDetailEdit = document.getElementById('btn-detail-edit')!;
const detailFavicon = document.getElementById('detail-favicon') as HTMLImageElement;
const detailTitle = document.getElementById('detail-title')!;
const detailUsername = document.getElementById('detail-username')!;
const detailPassword = document.getElementById('detail-password')!;
const detailHealth = document.getElementById('detail-health')!;
const detailUrl = document.getElementById('detail-url') as HTMLAnchorElement;
const detailNotes = document.getElementById('detail-notes')!;
const detailNotesGroup = document.getElementById('detail-notes-group')!;
const btnToggleDetailPass = document.getElementById('btn-toggle-detail-pass')!;
const btnCopyUsername = document.getElementById('btn-copy-username')!;
const btnCopyPassword = document.getElementById('btn-copy-password')!;

// Modal Agregar
const modalAdd = document.getElementById('modal-add')!;
const btnCloseModal = document.getElementById('btn-close-modal')!;
const addName = document.getElementById('add-name') as HTMLInputElement;
const addUsername = document.getElementById('add-username') as HTMLInputElement;
const addPassword = document.getElementById('add-password') as HTMLInputElement;
const addUri = document.getElementById('add-uri') as HTMLInputElement;
const addNotes = document.getElementById('add-notes') as HTMLTextAreaElement;
const btnQuickGen = document.getElementById('btn-quick-gen')!;
const btnSaveNew = document.getElementById('btn-save-new')!;

const toastEl = document.getElementById('toast')!;

let currentItems: DecryptedVaultItem[] = [];
let isRegisterMode = false;
let currentDetailItem: DecryptedVaultItem | null = null;
let isPasswordVisible = false;
let sortAscending = false;
let editingItemId: string | null = null;

function showToast(msg: string) {
  toastEl.textContent = msg;
  toastEl.style.display = 'block';
  setTimeout(() => {
    toastEl.style.display = 'none';
  }, 2200);
}

function copyText(text: string, label: string) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(`✓ ${label} copiado`);
  });
}

function getDomainFromUrl(urlOrName: string): string {
  try {
    let raw = urlOrName.trim();
    if (!raw.includes('://')) raw = 'https://' + raw;
    const u = new URL(raw);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return urlOrName.trim();
  }
}

function getFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}

// Inicialización
async function init() {
  const status = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });

  if (status.serverUrl) authServer.value = status.serverUrl;
  if (status.email) {
    authEmail.value = status.email;
    const parts = status.email.split('@')[0];
    const initials = parts.slice(0, 2).charAt(0).toUpperCase() + parts.slice(0, 2).charAt(1).toLowerCase();
    userAvatar.textContent = initials || 'Je';
  }

  if (status.isUnlocked) {
    showVaultView();
    await loadItems();
  } else {
    showAuthView();
  }

  // Prellenar URL de la pestaña activa en el modal de agregar
  chrome.tabs?.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0]?.url && !tabs[0].url.startsWith('chrome://') && !tabs[0].url.startsWith('brave://')) {
      addUri.value = tabs[0].url;
      try {
        const hostname = new URL(tabs[0].url).hostname.replace(/^www\./, '');
        addName.value = hostname.charAt(0).toUpperCase() + hostname.slice(1);
      } catch {}
    }
  });
}

function showAuthView() {
  viewAuth.style.display = 'flex';
  viewVault.style.display = 'none';
  viewDetail.style.display = 'none';
}

function showVaultView() {
  viewAuth.style.display = 'none';
  viewVault.style.display = 'flex';
  viewDetail.style.display = 'none';
}

// Menú desplegable Vault (Image 1)
btnVaultMenu.addEventListener('click', (e) => {
  e.stopPropagation();
  vaultDropdown.style.display = vaultDropdown.style.display === 'none' ? 'flex' : 'none';
});

document.addEventListener('click', (e) => {
  if (!vaultDropdown.contains(e.target as Node)) {
    vaultDropdown.style.display = 'none';
  }
});

document.querySelectorAll('.nord-menu-item').forEach((item) => {
  item.addEventListener('click', () => {
    const text = item.textContent?.trim() || 'Vault';
    selectedVaultLabel.textContent = text;
    vaultDropdown.style.display = 'none';
    renderItems();
  });
});

// Autenticación
btnToggleAuthMode.addEventListener('click', () => {
  isRegisterMode = !isRegisterMode;
  if (isRegisterMode) {
    authTitle.textContent = 'Crear Nueva Cuenta';
    btnAuthSubmit.textContent = 'Crear Bóveda Segura';
    btnToggleAuthMode.textContent = 'Ya tengo cuenta (Iniciar sesión)';
  } else {
    authTitle.textContent = 'Desbloquear Bóveda';
    btnAuthSubmit.textContent = 'Desbloquear';
    btnToggleAuthMode.textContent = 'Crear nueva cuenta';
  }
});

btnAuthSubmit.addEventListener('click', async () => {
  authError.style.display = 'none';
  const email = authEmail.value.trim();
  const password = authPassword.value;
  const serverUrl = authServer.value.trim();

  if (!email || !password) {
    authError.textContent = 'Completa todos los campos.';
    authError.style.display = 'block';
    return;
  }

  btnAuthSubmit.textContent = 'Derivando claves criptográficas...';
  (btnAuthSubmit as HTMLButtonElement).disabled = true;

  try {
    const actionType = isRegisterMode ? 'REGISTER' : 'LOGIN';
    const res = await chrome.runtime.sendMessage({
      type: actionType,
      email,
      password,
      serverUrl,
    });

    if (res.error) throw new Error(res.error);

    const parts = email.split('@')[0];
    const initials = parts.slice(0, 2).charAt(0).toUpperCase() + parts.slice(0, 2).charAt(1).toLowerCase();
    userAvatar.textContent = initials;

    showVaultView();
    await loadItems();
    showToast(res.offline ? '✓ Bóveda accesible (Modo Offline)' : '✓ Bóveda sincronizada');
  } catch (err: any) {
    authError.textContent = err.message || 'Error al autenticar';
    authError.style.display = 'block';
  } finally {
    (btnAuthSubmit as HTMLButtonElement).disabled = false;
    btnAuthSubmit.textContent = isRegisterMode ? 'Crear Bóveda Segura' : 'Desbloquear';
  }
});

async function loadItems() {
  const res = await chrome.runtime.sendMessage({ type: 'GET_ITEMS' });
  if (res.items) {
    currentItems = res.items;
    renderItems();
  }
}

// Renderizar lista estilo NordPass (Image 1)
function renderItems() {
  const query = vaultSearch.value.toLowerCase().trim();

  let filtered = currentItems.filter((item) => {
    if (!query) return true;
    const nameMatch = item.name.toLowerCase().includes(query);
    const userMatch = item.type === 'login' && (item.data as LoginData).username?.toLowerCase().includes(query);
    return nameMatch || userMatch;
  });

  if (sortAscending) {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  itemsCounter.textContent = `${filtered.length} items`;
  itemsList.innerHTML = '';

  if (filtered.length === 0) {
    itemsList.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 40px 16px; font-size: 13px;">
        ${query ? 'No se encontraron resultados' : 'No hay elementos en tu bóveda aún.<br>Haz clic en el botón <strong>+</strong> para agregar uno.'}
      </div>
    `;
    return;
  }

  for (const item of filtered) {
    const row = document.createElement('div');
    row.className = 'nord-item-row';

    let domain = item.name;
    let sub = '';
    let copyUserVal = '';
    let copyPassVal = '';

    if (item.type === 'login') {
      const data = item.data as LoginData;
      sub = data.username || 'Sin usuario';
      domain = (data.uris && data.uris[0]) ? getDomainFromUrl(data.uris[0]) : getDomainFromUrl(item.name);
      copyUserVal = data.username;
      copyPassVal = data.password;
    } else if (item.type === 'card') {
      const data = item.data as CardData;
      sub = `•••• ${data.number?.slice(-4) || 'Tarjeta'}`;
      copyUserVal = data.number;
    } else if (item.type === 'note') {
      const data = item.data as NoteData;
      sub = data.text ? data.text.slice(0, 32) + '...' : 'Nota cifrada';
      copyUserVal = data.text;
    }

    const faviconUrl = getFaviconUrl(domain);

    row.innerHTML = `
      <img class="nord-item-favicon" src="${faviconUrl}" onerror="this.src='icons/icon48.png';" alt="icon">
      <div class="nord-item-info">
        <div class="nord-item-title">${item.name}</div>
        <div class="nord-item-sub">${sub}</div>
      </div>
      <div class="nord-item-actions">
        ${copyUserVal ? `<button class="nord-btn-icon-sm" data-copy-u title="Copiar usuario">👤</button>` : ''}
        ${copyPassVal ? `<button class="nord-btn-icon-sm" data-copy-p title="Copiar contraseña">🔑</button>` : ''}
      </div>
    `;

    row.querySelector('[data-copy-u]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      copyText(copyUserVal, 'Usuario');
    });

    row.querySelector('[data-copy-p]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      copyText(copyPassVal, 'Contraseña');
    });

    // Abrir vista detallada al hacer clic en el elemento
    row.addEventListener('click', () => {
      openDetailView(item);
    });

    itemsList.appendChild(row);
  }
}

vaultSearch.addEventListener('input', renderItems);

btnSort.addEventListener('click', () => {
  sortAscending = !sortAscending;
  sortLabel.textContent = sortAscending ? 'Sort By Name (A-Z)' : 'Sort By Last Used';
  renderItems();
});

// Abrir Vista de Detalle (Image 2)
function openDetailView(item: DecryptedVaultItem) {
  currentDetailItem = item;
  isPasswordVisible = false;

  let domain = item.name;
  let username = '';
  let password = '';
  let url = '#';
  let notes = '';

  if (item.type === 'login') {
    const data = item.data as LoginData;
    username = data.username || 'Sin usuario';
    password = data.password || '';
    url = (data.uris && data.uris[0]) ? data.uris[0] : `https://${getDomainFromUrl(item.name)}`;
    domain = getDomainFromUrl(url);
    notes = data.notes || '';
  } else if (item.type === 'card') {
    const data = item.data as CardData;
    username = `${data.brand?.toUpperCase() || 'TARJETA'} - Exp: ${data.expMonth}/${data.expYear}`;
    password = data.number || '';
    notes = `CVV: ${data.cvv} | Titular: ${data.cardholderName}`;
  } else if (item.type === 'note') {
    const data = item.data as NoteData;
    username = 'Nota Segura';
    password = '';
    notes = data.text || '';
  }

  detailFavicon.src = getFaviconUrl(domain);
  detailTitle.textContent = item.name;
  detailUsername.textContent = username;
  detailPassword.textContent = password ? '••••••••••••' : '(Sin contraseña)';
  detailUrl.textContent = url;
  detailUrl.href = url;

  if (notes) {
    detailNotes.textContent = notes;
    detailNotesGroup.style.display = 'flex';
  } else {
    detailNotesGroup.style.display = 'none';
  }

  // Evaluar salud de la contraseña estilo NordPass
  if (password) {
    const strength = evaluatePasswordStrength(password);
    if (strength.score >= 3) {
      detailHealth.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg> Strong Password`;
      detailHealth.style.color = '#10b981';
      detailHealth.style.backgroundColor = '#ecfdf5';
    } else {
      detailHealth.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> Moderate Password`;
      detailHealth.style.color = '#eab308';
      detailHealth.style.backgroundColor = '#fefce8';
    }
  }

  viewDetail.style.display = 'flex';
}

btnDetailBack.addEventListener('click', () => {
  viewDetail.style.display = 'none';
});

btnToggleDetailPass.addEventListener('click', () => {
  if (!currentDetailItem) return;
  const pass = (currentDetailItem.data as LoginData).password || '';
  isPasswordVisible = !isPasswordVisible;
  detailPassword.textContent = isPasswordVisible ? pass : '••••••••••••';
  btnToggleDetailPass.textContent = isPasswordVisible ? '🙈' : '👁️';
});

btnCopyUsername.addEventListener('click', () => {
  if (currentDetailItem) {
    const u = (currentDetailItem.data as LoginData).username || '';
    copyText(u, 'Usuario');
  }
});

btnCopyPassword.addEventListener('click', () => {
  if (currentDetailItem) {
    const p = (currentDetailItem.data as LoginData).password || '';
    copyText(p, 'Contraseña');
  }
});

btnDetailEdit.addEventListener('click', () => {
  if (!currentDetailItem) return;
  editingItemId = currentDetailItem.id;
  addName.value = currentDetailItem.name;
  if (currentDetailItem.type === 'login') {
    const data = currentDetailItem.data as LoginData;
    addUsername.value = data.username || '';
    addPassword.value = data.password || '';
    addUri.value = (data.uris && data.uris[0]) || '';
    addNotes.value = data.notes || '';
  }
  btnSaveNew.textContent = 'Actualizar Credencial';
  modalAdd.style.display = 'flex';
});

// Barra Inferior (Image 1)
btnSync.addEventListener('click', async () => {
  btnSync.style.animation = 'spin 1s linear infinite';
  const res = await chrome.runtime.sendMessage({ type: 'SYNC_NOW' });
  btnSync.style.animation = '';
  if (res.success) {
    await loadItems();
    showToast('✓ Bóveda sincronizada');
  } else {
    showToast('Modo Offline activo');
  }
});

btnSettings.addEventListener('click', () => {
  const confirmLock = confirm('¿Deseas bloquear tu bóveda de PassVault ahora? (Por seguridad se mantendrá abierta hasta reiniciar tu laptop si cancelas)');
  if (confirmLock) {
    chrome.runtime.sendMessage({ type: 'LOCK' }).then(() => {
      showAuthView();
      authPassword.value = '';
      showToast('Bóveda bloqueada');
    });
  }
});

btnAddItem.addEventListener('click', () => {
  editingItemId = null;
  addName.value = '';
  addUsername.value = '';
  addPassword.value = '';
  addNotes.value = '';
  btnSaveNew.textContent = 'Guardar en Bóveda';
  modalAdd.style.display = 'flex';
});

btnFullscreen.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
});

// Modal de Agregar
btnCloseModal.addEventListener('click', () => {
  modalAdd.style.display = 'none';
});

btnQuickGen.addEventListener('click', () => {
  addPassword.value = generatePassword({ length: 20 });
  showToast('Contraseña aleatoria generada');
});

btnSaveNew.addEventListener('click', async () => {
  const name = addName.value.trim();
  const username = addUsername.value.trim();
  const password = addPassword.value;
  const uri = addUri.value.trim();
  const notes = addNotes.value.trim();

  if (!name || !password) {
    alert('Ingresa el nombre del sitio y la contraseña');
    return;
  }

  btnSaveNew.disabled = true;
  btnSaveNew.textContent = 'Guardando...';

  try {
    const res = await chrome.runtime.sendMessage({
      type: 'SAVE_ITEM',
      item: {
        id: editingItemId || crypto.randomUUID(),
        type: 'login',
        name,
        data: {
          username,
          password,
          uris: uri ? [uri] : [],
          notes,
        },
      },
    });

    if (res.error) throw new Error(res.error);

    modalAdd.style.display = 'none';
    viewDetail.style.display = 'none';
    await loadItems();
    showToast('✓ Elemento guardado en tu bóveda');
  } catch (err: any) {
    alert(err.message || 'Error al guardar');
  } finally {
    btnSaveNew.disabled = false;
    btnSaveNew.textContent = 'Guardar en Bóveda';
  }
});

init();
