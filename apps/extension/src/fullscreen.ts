import {
  generatePassword,
  evaluatePasswordStrength,
  DecryptedVaultItem,
  LoginData,
  CardData,
  NoteData,
} from '@pass-vault/core';

// Referencias del DOM
const searchInput = document.getElementById('fs-search-input') as HTMLInputElement;
const userAvatar = document.getElementById('fs-user-avatar')!;
const btnSync = document.getElementById('fs-btn-sync')!;
const btnSettings = document.getElementById('fs-btn-settings')!;
const btnNotifications = document.getElementById('fs-btn-notifications')!;
const btnCreateItem = document.getElementById('fs-btn-create-item')!;
const btnSyncBanner = document.getElementById('fs-btn-sync-banner')!;

const vaultView = document.getElementById('fs-vault-view')!;
const settingsView = document.getElementById('fs-settings-view')!;
const viewTitle = document.getElementById('fs-view-title')!;
const tableBody = document.getElementById('fs-table-body')!;
const selectAllCheckbox = document.getElementById('fs-select-all') as HTMLInputElement;
const thTitle = document.getElementById('fs-th-title')!;
const thLast = document.getElementById('fs-th-last')!;
const categoryPills = document.querySelectorAll('.fs-pill');

// Sidebar nav
const navItems = document.querySelectorAll('.fs-nav-item');
const toolGen = document.getElementById('tool-gen')!;
const toolHealth = document.getElementById('tool-health')!;
const toolSettings = document.getElementById('tool-settings')!;

// Settings View
const serverUrlInput = document.getElementById('fs-server-url') as HTMLInputElement;
const btnTestServer = document.getElementById('fs-btn-test-server')!;
const btnLockNow = document.getElementById('fs-btn-lock-now')!;
const btnLogoutNow = document.getElementById('fs-btn-logout-now')!;

// Modal: Create Item
const modalCreate = document.getElementById('fs-modal-create')!;
const btnCloseCreate = document.getElementById('fs-btn-close-create')!;
const btnCancelCreate = document.getElementById('fs-btn-cancel-create')!;
const btnSaveCreate = document.getElementById('fs-btn-save-create')!;
const addType = document.getElementById('fs-add-type') as HTMLSelectElement;
const addName = document.getElementById('fs-add-name') as HTMLInputElement;
const addUsername = document.getElementById('fs-add-username') as HTMLInputElement;
const addPassword = document.getElementById('fs-add-password') as HTMLInputElement;
const addUri = document.getElementById('fs-add-uri') as HTMLInputElement;
const addNotes = document.getElementById('fs-add-notes') as HTMLTextAreaElement;
const btnTogglePass = document.getElementById('fs-btn-toggle-pass')!;
const btnGenPass = document.getElementById('fs-btn-gen-pass')!;
const passStrengthEl = document.getElementById('fs-pass-strength')!;

// Modal: Generator
const modalGen = document.getElementById('fs-modal-gen')!;
const btnCloseGen = document.getElementById('fs-btn-close-gen')!;
const genResult = document.getElementById('fs-gen-result')!;
const btnCopyGen = document.getElementById('fs-btn-copy-gen')!;
const genLenSlider = document.getElementById('fs-gen-len') as HTMLInputElement;
const genLenLabel = document.getElementById('fs-gen-len-label')!;
const genUpper = document.getElementById('fs-gen-upper') as HTMLInputElement;
const genLower = document.getElementById('fs-gen-lower') as HTMLInputElement;
const genDigits = document.getElementById('fs-gen-digits') as HTMLInputElement;
const genSymbols = document.getElementById('fs-gen-symbols') as HTMLInputElement;
const btnRefreshGen = document.getElementById('fs-btn-refresh-gen')!;

// Toast
const toastEl = document.getElementById('fs-toast')!;

// Estado
let items: DecryptedVaultItem[] = [];
let currentCategory = 'all';
let currentNav = 'vault';
let sortField: 'title' | 'last_used' = 'last_used';
let sortAscending = false;
let userEmail = '';
let isPassVisible = false;

function showToast(msg: string) {
  toastEl.textContent = msg;
  toastEl.style.display = 'block';
  setTimeout(() => {
    toastEl.style.display = 'none';
  }, 2400);
}

function copyText(text: string, label: string) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(`✓ ${label} copiado al portapapeles`);
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

function formatRelativeTime(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return 'Recently';
  }
}

async function loadData() {
  const status = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });

  if (status.email) {
    userEmail = status.email;
    const parts = status.email.split('@')[0];
    const initials = parts.slice(0, 2).charAt(0).toUpperCase() + parts.slice(0, 2).charAt(1).toLowerCase();
    userAvatar.textContent = initials || 'Je';
  }

  if (status.serverUrl) {
    serverUrlInput.value = status.serverUrl;
  }

  if (!status.isUnlocked) {
    showToast('⚠️ Bóveda bloqueada. Abriendo pantalla de desbloqueo...');
    return;
  }

  const res = await chrome.runtime.sendMessage({ type: 'GET_ITEMS' });
  if (res.items) {
    items = res.items;
    renderTable();
  }
}

function renderTable() {
  const query = searchInput.value.toLowerCase().trim();

  let filtered = items.filter((item) => {
    if (currentNav === 'shared') return false; // Por ahora no hay compartidos
    if (currentNav === 'trash') return false;

    // Filtro por categoría
    if (currentCategory !== 'all') {
      if (currentCategory === 'login' && item.type !== 'login') return false;
      if (currentCategory === 'note' && item.type !== 'note') return false;
      if (currentCategory === 'card' && item.type !== 'card') return false;
      if (currentCategory === 'identity' && item.type !== 'identity') return false;
    }

    if (!query) return true;
    const nameMatch = item.name.toLowerCase().includes(query);
    const userMatch = item.type === 'login' && (item.data as LoginData).username?.toLowerCase().includes(query);
    return nameMatch || userMatch;
  });

  // Ordenación
  filtered.sort((a, b) => {
    if (sortField === 'title') {
      return sortAscending ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    } else {
      const timeA = new Date(a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt).getTime();
      return sortAscending ? timeA - timeB : timeB - timeA;
    }
  });

  tableBody.innerHTML = '';

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 50px 0; font-size: 14px;">
          ${query ? 'No se encontraron elementos coincidentes.' : 'No hay elementos guardados en esta sección.'}
        </td>
      </tr>
    `;
    return;
  }

  for (const item of filtered) {
    const tr = document.createElement('tr');

    let domain = item.name;
    let subtitle = '';
    let copyUserVal = '';
    let copyPassVal = '';

    if (item.type === 'login') {
      const data = item.data as LoginData;
      subtitle = data.username || 'No username';
      domain = (data.uris && data.uris[0]) ? getDomainFromUrl(data.uris[0]) : getDomainFromUrl(item.name);
      copyUserVal = data.username;
      copyPassVal = data.password;
    } else if (item.type === 'card') {
      const data = item.data as CardData;
      subtitle = `•••• ${data.number?.slice(-4) || 'Card'}`;
      copyUserVal = data.number;
    } else if (item.type === 'note') {
      const data = item.data as NoteData;
      subtitle = data.text ? data.text.slice(0, 36) + '...' : 'Secure note';
      copyUserVal = data.text;
    }

    const faviconUrl = getFaviconUrl(domain);
    const relativeTime = formatRelativeTime(item.updatedAt || item.createdAt);

    tr.innerHTML = `
      <td><input type="checkbox" class="fs-item-checkbox" data-id="${item.id}"></td>
      <td>
        <div class="fs-item-cell">
          <img class="fs-item-logo" src="${faviconUrl}" onerror="this.src='icons/icon48.png';" alt="icon">
          <div class="fs-item-title-box">
            <span class="fs-item-title-text">${item.name}</span>
            <span class="fs-item-sub-text">${subtitle}</span>
          </div>
        </div>
      </td>
      <td style="color: var(--text-muted);">${relativeTime}</td>
      <td style="color: var(--text-muted);">-</td>
      <td>
        <div style="display: flex; gap: 6px;">
          ${copyUserVal ? `<button class="fs-btn-secondary" style="padding: 4px 8px; font-size: 11px;" data-copy-u title="Copy username">👤</button>` : ''}
          ${copyPassVal ? `<button class="fs-btn-secondary" style="padding: 4px 8px; font-size: 11px;" data-copy-p title="Copy password">🔑</button>` : ''}
        </div>
      </td>
    `;

    tr.querySelector('[data-copy-u]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      copyText(copyUserVal, 'Username');
    });

    tr.querySelector('[data-copy-p]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      copyText(copyPassVal, 'Password');
    });

    tableBody.appendChild(tr);
  }
}

// Búsqueda en vivo
searchInput.addEventListener('input', renderTable);

// Atajo ctrl + F para enfocar la barra de búsqueda estilo NordPass
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
    e.preventDefault();
    searchInput.focus();
    searchInput.select();
  }
});

// Píldoras de Categoría
categoryPills.forEach((pill) => {
  pill.addEventListener('click', () => {
    categoryPills.forEach((p) => p.classList.remove('active'));
    pill.classList.add('active');
    currentCategory = pill.getAttribute('data-cat') || 'all';
    renderTable();
  });
});

// Ordenación por encabezados de tabla
thTitle.addEventListener('click', () => {
  if (sortField === 'title') {
    sortAscending = !sortAscending;
  } else {
    sortField = 'title';
    sortAscending = true;
  }
  thTitle.textContent = `Title ${sortAscending ? '▲' : '▼'}`;
  thLast.textContent = 'Last Used ⬍';
  renderTable();
});

thLast.addEventListener('click', () => {
  if (sortField === 'last_used') {
    sortAscending = !sortAscending;
  } else {
    sortField = 'last_used';
    sortAscending = false;
  }
  thLast.textContent = `Last Used ${sortAscending ? '▲' : '▼'}`;
  thTitle.textContent = 'Title ⬍';
  renderTable();
});

// Navegación Sidebar
navItems.forEach((item) => {
  item.addEventListener('click', () => {
    const nav = item.getAttribute('data-nav');
    if (!nav) return;

    if (nav === 'add-folder') {
      const folderName = prompt('Nombre de la nueva carpeta:');
      if (folderName) showToast(`✓ Carpeta "${folderName}" creada`);
      return;
    }

    navItems.forEach((i) => i.classList.remove('active'));
    item.classList.add('active');

    currentNav = nav;
    vaultView.style.display = 'block';
    settingsView.style.display = 'none';

    if (nav === 'vault') viewTitle.textContent = 'Vault';
    else if (nav === 'shared') viewTitle.textContent = 'Shared Items';
    else if (nav === 'trash') viewTitle.textContent = 'Trash';

    renderTable();
  });
});

function showSettingsView() {
  vaultView.style.display = 'none';
  settingsView.style.display = 'flex';
  navItems.forEach((i) => i.classList.remove('active'));
}

btnSettings.addEventListener('click', showSettingsView);
toolSettings.addEventListener('click', showSettingsView);

// Herramienta Password Health
toolHealth.addEventListener('click', () => {
  vaultView.style.display = 'block';
  settingsView.style.display = 'none';
  viewTitle.textContent = 'Password Health (At Risk)';
  const weakItems = items.filter((item) => {
    if (item.type !== 'login') return false;
    const pass = (item.data as LoginData).password || '';
    return evaluatePasswordStrength(pass).score < 3;
  });
  items = weakItems;
  renderTable();
});

// Herramienta Generador
function generateNewPasswordFromModal() {
  const length = parseInt(genLenSlider.value, 10);
  const pass = generatePassword({
    length,
    uppercase: genUpper.checked,
    lowercase: genLower.checked,
    digits: genDigits.checked,
    symbols: genSymbols.checked,
  });
  genResult.textContent = pass;
}

toolGen.addEventListener('click', () => {
  generateNewPasswordFromModal();
  modalGen.style.display = 'flex';
});

btnCloseGen.addEventListener('click', () => {
  modalGen.style.display = 'none';
});

genLenSlider.addEventListener('input', () => {
  genLenLabel.textContent = genLenSlider.value;
  generateNewPasswordFromModal();
});

[genUpper, genLower, genDigits, genSymbols].forEach((cb) => {
  cb.addEventListener('change', generateNewPasswordFromModal);
});

btnRefreshGen.addEventListener('click', generateNewPasswordFromModal);

btnCopyGen.addEventListener('click', () => {
  const pass = genResult.textContent || '';
  if (pass && pass !== '-') {
    copyText(pass, 'Password');
  }
});

// Modal Crear Item
btnCreateItem.addEventListener('click', () => {
  addName.value = '';
  addUsername.value = '';
  addPassword.value = '';
  addUri.value = '';
  addNotes.value = '';
  addPassword.type = 'password';
  btnTogglePass.textContent = '👁️';
  isPassVisible = false;
  passStrengthEl.style.display = 'none';
  modalCreate.style.display = 'flex';
});

btnCloseCreate.addEventListener('click', () => {
  modalCreate.style.display = 'none';
});

btnCancelCreate.addEventListener('click', () => {
  modalCreate.style.display = 'none';
});

btnTogglePass.addEventListener('click', () => {
  isPassVisible = !isPassVisible;
  addPassword.type = isPassVisible ? 'text' : 'password';
  btnTogglePass.textContent = isPassVisible ? '🙈' : '👁️';
});

btnGenPass.addEventListener('click', () => {
  const p = generatePassword({ length: 20 });
  addPassword.value = p;
  addPassword.type = 'text'; // Mostrar sugerencia de inmediato
  isPassVisible = true;
  btnTogglePass.textContent = '🙈';
  passStrengthEl.textContent = '✔ Contraseña segura sugerida generada';
  passStrengthEl.style.color = '#10b981';
  passStrengthEl.style.display = 'block';
});

addPassword.addEventListener('input', () => {
  const val = addPassword.value;
  if (!val) {
    passStrengthEl.style.display = 'none';
    return;
  }
  const strength = evaluatePasswordStrength(val);
  if (strength.score >= 3) {
    passStrengthEl.textContent = '✔ Strong Password';
    passStrengthEl.style.color = '#10b981';
  } else {
    passStrengthEl.textContent = '⚠️ Moderate / Weak Password';
    passStrengthEl.style.color = '#eab308';
  }
  passStrengthEl.style.display = 'block';
});

btnSaveCreate.addEventListener('click', async () => {
  const name = addName.value.trim();
  const username = addUsername.value.trim();
  const password = addPassword.value;
  const uri = addUri.value.trim();
  const notes = addNotes.value.trim();
  const type = addType.value;

  if (!name) {
    alert('Por favor ingresa un nombre o título para el elemento.');
    return;
  }

  btnSaveCreate.disabled = true;
  btnSaveCreate.textContent = 'Saving...';

  try {
    const res = await chrome.runtime.sendMessage({
      type: 'SAVE_ITEM',
      item: {
        id: crypto.randomUUID(),
        type,
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

    modalCreate.style.display = 'none';
    showToast('✓ Elemento guardado en tu bóveda');
    await loadData();
  } catch (err: any) {
    alert(err.message || 'Error al guardar');
  } finally {
    btnSaveCreate.disabled = false;
    btnSaveCreate.textContent = 'Save to Vault';
  }
});

// Sincronización
async function triggerSync() {
  btnSync.style.animation = 'spin 1s linear infinite';
  const res = await chrome.runtime.sendMessage({ type: 'SYNC_NOW' });
  btnSync.style.animation = '';
  if (res.success) {
    showToast('✓ Bóveda sincronizada');
    await loadData();
  } else {
    showToast('Modo Offline activo');
  }
}

btnSync.addEventListener('click', triggerSync);
btnSyncBanner.addEventListener('click', triggerSync);

btnNotifications.addEventListener('click', () => {
  showToast('No hay notificaciones pendientes.');
});

// Acciones de Settings
btnTestServer.addEventListener('click', async () => {
  const url = serverUrlInput.value.trim();
  btnTestServer.textContent = 'Probando...';
  try {
    const res = await fetch(`${url}/health`);
    if (res.ok) {
      await chrome.storage.local.set({ serverUrl: url });
      showToast('✓ Conexión exitosa con el servidor');
    } else {
      showToast('⚠️ El servidor respondió con error');
    }
  } catch {
    showToast('❌ Servidor inalcanzable (revisa que esté encendido)');
  } finally {
    btnTestServer.textContent = 'Guardar y Probar';
  }
});

btnLockNow.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'LOCK' });
  showToast('Bóveda bloqueada.');
  setTimeout(() => window.close(), 800);
});

btnLogoutNow.addEventListener('click', async () => {
  const ok = confirm('¿Deseas cerrar sesión en este dispositivo?');
  if (ok) {
    await chrome.runtime.sendMessage({ type: 'LOGOUT' });
    showToast('Sesión cerrada.');
    setTimeout(() => window.close(), 800);
  }
});

// Manejo del hash inicial (#settings)
if (window.location.hash === '#settings') {
  showSettingsView();
}

loadData();
