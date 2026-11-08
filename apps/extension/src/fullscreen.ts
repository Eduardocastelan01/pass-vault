import {
  generatePassword,
  evaluatePasswordStrength,
  DecryptedVaultItem,
  LoginData,
  CardData,
  NoteData,
  IdentityData,
  Folder,
} from '@pass-vault/core';

// Referencias del DOM
const searchInput = document.getElementById('fs-search-input') as HTMLInputElement;
const userAvatar = document.getElementById('fs-user-avatar')!;
const btnSync = document.getElementById('fs-btn-sync')!;
const btnSettings = document.getElementById('fs-btn-settings')!;
const btnNotifications = document.getElementById('fs-btn-notifications')!;
const btnCreateItem = document.getElementById('fs-btn-create-item')!;
const createDropdown = document.getElementById('fs-create-dropdown')!;
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
const foldersSection = document.querySelector('.fs-folders-section')!;
const toolGen = document.getElementById('tool-gen')!;
const toolHealth = document.getElementById('tool-health')!;
const toolSettings = document.getElementById('tool-settings')!;

// Settings View
const serverUrlInput = document.getElementById('fs-server-url') as HTMLInputElement;
const btnTestServer = document.getElementById('fs-btn-test-server')!;
const btnLockNow = document.getElementById('fs-btn-lock-now')!;
const btnLogoutNow = document.getElementById('fs-btn-logout-now')!;

// Modal: Create Item Especializado
const modalCreate = document.getElementById('fs-modal-create')!;
const btnCloseCreate = document.getElementById('fs-btn-close-create')!;
const btnCancelCreate = document.getElementById('fs-btn-cancel-create')!;
const btnSaveCreate = document.getElementById('fs-btn-save-create') as HTMLButtonElement;
const createBadgeIcon = document.getElementById('fs-create-badge-icon')!;
const badgeSvg = document.getElementById('fs-badge-svg')!;
const modalTitle = document.getElementById('fs-modal-title')!;
const itemTitle = document.getElementById('fs-item-title') as HTMLInputElement;

// Campos Login
const fieldsLogin = document.getElementById('fs-fields-login')!;
const loginUsername = document.getElementById('fs-login-username') as HTMLInputElement;
const loginPassword = document.getElementById('fs-login-password') as HTMLInputElement;
const loginUrl = document.getElementById('fs-login-url') as HTMLInputElement;
const btnToggleLoginPass = document.getElementById('fs-btn-toggle-login-pass')!;
const btnGenLoginPass = document.getElementById('fs-btn-gen-login-pass')!;
const loginStrengthEl = document.getElementById('fs-login-strength')!;

// Campos Card (Image 3 y 4)
const fieldsCard = document.getElementById('fs-fields-card')!;
const cardHolder = document.getElementById('fs-card-holder') as HTMLInputElement;
const cardNumber = document.getElementById('fs-card-number') as HTMLInputElement;
const cardExp = document.getElementById('fs-card-exp') as HTMLInputElement;
const cardCvv = document.getElementById('fs-card-cvv') as HTMLInputElement;
const cardPin = document.getElementById('fs-card-pin') as HTMLInputElement;
const cardZip = document.getElementById('fs-card-zip') as HTMLInputElement;
const btnToggleCvv = document.getElementById('fs-btn-toggle-cvv')!;
const btnTogglePin = document.getElementById('fs-btn-toggle-pin')!;

// Campos Note
const fieldsNote = document.getElementById('fs-fields-note')!;
const noteText = document.getElementById('fs-note-text') as HTMLTextAreaElement;

// Campos Identity
const fieldsIdentity = document.getElementById('fs-fields-identity')!;
const idFirst = document.getElementById('fs-id-first') as HTMLInputElement;
const idLast = document.getElementById('fs-id-last') as HTMLInputElement;
const idEmail = document.getElementById('fs-id-email') as HTMLInputElement;
const idPhone = document.getElementById('fs-id-phone') as HTMLInputElement;
const idAddress = document.getElementById('fs-id-address') as HTMLInputElement;

// Campos Comunes (Other)
const itemFolder = document.getElementById('fs-item-folder') as HTMLSelectElement;
const itemNotes = document.getElementById('fs-item-notes') as HTMLTextAreaElement;
const commonNotesGroup = document.getElementById('fs-common-notes-group')!;

// Modal: Add New Folder (Image 5)
const modalFolder = document.getElementById('fs-modal-folder')!;
const btnCloseFolder = document.getElementById('fs-btn-close-folder')!;
const folderNameInput = document.getElementById('fs-folder-name-input') as HTMLInputElement;
const btnSaveFolder = document.getElementById('fs-btn-save-folder')!;

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
let folders: Folder[] = [];
let currentCategory = 'all';
let currentNav = 'vault';
let currentFolderId: string | null = null;
let sortField: 'title' | 'last_used' = 'last_used';
let sortAscending = false;
let userEmail = '';
let activeCreateType: 'login' | 'card' | 'note' | 'identity' = 'login';
let isLoginPassVisible = false;

function showToast(msg: string) {
  toastEl.textContent = msg;
  toastEl.style.display = 'block';
  setTimeout(() => {
    toastEl.style.display = 'none';
  }, 2400);
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

async function loadFolders() {
  const res = await new Promise<{ folders?: Folder[] }>((resolve) => {
    chrome.storage.local.get(['folders'], (data) => resolve(data));
  });
  folders = res.folders || [];
  renderFoldersList();
  populateFolderSelect();
}

function renderFoldersList() {
  // Limpiar carpetas dinámicas existentes conservando título y botón "Add New Folder"
  const existingDynamic = foldersSection.querySelectorAll('.fs-dynamic-folder');
  existingDynamic.forEach((el) => el.remove());

  const addFolderItem = foldersSection.querySelector('[data-nav="add-folder"]');

  for (const f of folders) {
    const el = document.createElement('div');
    el.className = 'fs-nav-item fs-dynamic-folder';
    if (currentNav === `folder-${f.id}`) el.classList.add('active');
    el.setAttribute('data-folder-id', f.id);
    el.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
      </svg>
      <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${f.name}</span>
    `;

    el.addEventListener('click', () => {
      document.querySelectorAll('.fs-nav-item').forEach((i) => i.classList.remove('active'));
      el.classList.add('active');
      currentNav = `folder-${f.id}`;
      currentFolderId = f.id;
      viewTitle.textContent = f.name;
      vaultView.style.display = 'block';
      settingsView.style.display = 'none';
      renderTable();
    });

    if (addFolderItem) {
      foldersSection.insertBefore(el, addFolderItem);
    } else {
      foldersSection.appendChild(el);
    }
  }
}

function populateFolderSelect() {
  itemFolder.innerHTML = '<option value="">- No Folder -</option>';
  for (const f of folders) {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = f.name;
    itemFolder.appendChild(opt);
  }
}

async function loadData() {
  await loadFolders();

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
    showToast('⚠️ Bóveda bloqueada');
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
    if (currentNav === 'shared') return false;
    if (currentNav === 'trash') return false;

    // Filtro por carpeta
    if (currentNav.startsWith('folder-')) {
      if (item.folderId !== currentFolderId) return false;
    }

    // Filtro por píldora de categoría
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
    let iconContent = '';

    if (item.type === 'login') {
      const data = item.data as LoginData;
      subtitle = data.username || 'No username';
      domain = (data.uris && data.uris[0]) ? getDomainFromUrl(data.uris[0]) : getDomainFromUrl(item.name);
      copyUserVal = data.username;
      copyPassVal = data.password;
      const faviconUrl = getFaviconUrl(domain);
      iconContent = `<img class="fs-item-logo" src="${faviconUrl}" onerror="this.src='icons/icon48.png';" alt="icon">`;
    } else if (item.type === 'card') {
      const data = item.data as CardData;
      subtitle = `•••• ${data.number?.slice(-4) || 'Card'}`;
      copyUserVal = data.number;
      copyPassVal = data.cvv || '';
      iconContent = `
        <div class="fs-item-logo" style="background: #8b5cf6; display: flex; align-items: center; justify-content: center; color: white;">
          💳
        </div>
      `;
    } else if (item.type === 'note') {
      const data = item.data as NoteData;
      subtitle = data.text ? data.text.slice(0, 36) + '...' : 'Secure note';
      copyUserVal = data.text;
      iconContent = `
        <div class="fs-item-logo" style="background: #f59e0b; display: flex; align-items: center; justify-content: center; color: white;">
          📝
        </div>
      `;
    } else if (item.type === 'identity') {
      const data = item.data as IdentityData;
      subtitle = `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email || 'Contact Info';
      copyUserVal = data.email || '';
      copyPassVal = data.phone || '';
      iconContent = `
        <div class="fs-item-logo" style="background: #10b981; display: flex; align-items: center; justify-content: center; color: white;">
          👤
        </div>
      `;
    }

    const folderObj = folders.find((f) => f.id === item.folderId);
    const folderLabel = folderObj ? folderObj.name : '-';
    const relativeTime = formatRelativeTime(item.updatedAt || item.createdAt);

    tr.innerHTML = `
      <td><input type="checkbox" class="fs-item-checkbox" data-id="${item.id}"></td>
      <td>
        <div class="fs-item-cell">
          ${iconContent}
          <div class="fs-item-title-box">
            <span class="fs-item-title-text">${item.name}</span>
            <span class="fs-item-sub-text">${subtitle}</span>
          </div>
        </div>
      </td>
      <td style="color: var(--text-muted);">${relativeTime}</td>
      <td style="color: var(--text-muted);">${folderLabel}</td>
      <td>
        <div style="display: flex; gap: 6px;">
          ${copyUserVal ? `<button class="fs-btn-secondary" style="padding: 4px 8px; font-size: 11px;" data-copy-u title="Copy data">📋</button>` : ''}
          ${copyPassVal ? `<button class="fs-btn-secondary" style="padding: 4px 8px; font-size: 11px;" data-copy-p title="Copy secret">🔑</button>` : ''}
        </div>
      </td>
    `;

    tr.querySelector('[data-copy-u]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      copyText(copyUserVal, 'Dato');
    });

    tr.querySelector('[data-copy-p]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      copyText(copyPassVal, 'Secreto');
    });

    tableBody.appendChild(tr);
  }
}

// Búsqueda en vivo
searchInput.addEventListener('input', renderTable);

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

// ================= NAVEGACIÓN SIDEBAR =================
navItems.forEach((item) => {
  item.addEventListener('click', () => {
    const nav = item.getAttribute('data-nav');
    if (!nav) return;

    if (nav === 'add-folder') {
      openFolderModal();
      return;
    }

    navItems.forEach((i) => i.classList.remove('active'));
    item.classList.add('active');

    currentNav = nav;
    currentFolderId = null;
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

// ================= DROPDOWN CREAR ELEMENTO (Image 2) =================
btnCreateItem.addEventListener('click', (e) => {
  e.stopPropagation();
  createDropdown.style.display = createDropdown.style.display === 'none' ? 'flex' : 'none';
});

document.addEventListener('click', (e) => {
  if (!createDropdown.contains(e.target as Node) && !btnCreateItem.contains(e.target as Node)) {
    createDropdown.style.display = 'none';
  }
});

document.querySelectorAll('[data-create-type]').forEach((opt) => {
  opt.addEventListener('click', () => {
    const type = opt.getAttribute('data-create-type') as 'login' | 'card' | 'note' | 'identity';
    createDropdown.style.display = 'none';
    openSpecializedCreateModal(type);
  });
});

// ================= FORMULARIOS ESPECIALIZADOS (Image 3 y 4) =================
function openSpecializedCreateModal(type: 'login' | 'card' | 'note' | 'identity') {
  activeCreateType = type;

  // Resetear campos comunes
  itemTitle.value = '';
  itemNotes.value = '';
  itemFolder.value = currentFolderId || '';

  // Configurar insignia visual y título según el tipo
  createBadgeIcon.className = `fs-type-badge-icon ${type}`;
  fieldsLogin.style.display = 'none';
  fieldsCard.style.display = 'none';
  fieldsNote.style.display = 'none';
  fieldsIdentity.style.display = 'none';

  if (type === 'login') {
    modalTitle.textContent = 'Create Password';
    badgeSvg.innerHTML = `<circle cx="8" cy="15" r="4"></circle><line x1="10.85" y1="12.15" x2="19" y2="4"></line><line x1="18" y1="5" x2="20" y2="7"></line><line x1="15" y1="8" x2="17" y2="10"></line>`;
    fieldsLogin.style.display = 'flex';
    loginUsername.value = '';
    loginPassword.value = '';
    loginUrl.value = '';
    loginPassword.type = 'password';
    isLoginPassVisible = false;
    btnToggleLoginPass.textContent = '👁️';
    loginStrengthEl.style.display = 'none';
    commonNotesGroup.style.display = 'flex';
  } else if (type === 'card') {
    modalTitle.textContent = 'Create Credit Card';
    badgeSvg.innerHTML = `<rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line>`;
    fieldsCard.style.display = 'flex';
    cardHolder.value = '';
    cardNumber.value = '';
    cardExp.value = '';
    cardCvv.value = '';
    cardPin.value = '';
    cardZip.value = '';
    commonNotesGroup.style.display = 'flex';
  } else if (type === 'note') {
    modalTitle.textContent = 'Create Secure Note';
    badgeSvg.innerHTML = `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line>`;
    fieldsNote.style.display = 'flex';
    noteText.value = '';
    commonNotesGroup.style.display = 'none'; // La nota ya tiene su área principal
  } else if (type === 'identity') {
    modalTitle.textContent = 'Create Contact Info';
    badgeSvg.innerHTML = `<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>`;
    fieldsIdentity.style.display = 'flex';
    idFirst.value = '';
    idLast.value = '';
    idEmail.value = '';
    idPhone.value = '';
    idAddress.value = '';
    commonNotesGroup.style.display = 'flex';
  }

  modalCreate.style.display = 'flex';
  setTimeout(() => itemTitle.focus(), 50);
}

btnCloseCreate.addEventListener('click', () => {
  modalCreate.style.display = 'none';
});

btnCancelCreate.addEventListener('click', () => {
  modalCreate.style.display = 'none';
});

// Toggles para contraseña, CVV y PIN
btnToggleLoginPass.addEventListener('click', () => {
  isLoginPassVisible = !isLoginPassVisible;
  loginPassword.type = isLoginPassVisible ? 'text' : 'password';
  btnToggleLoginPass.textContent = isLoginPassVisible ? '🙈' : '👁️';
});

btnGenLoginPass.addEventListener('click', () => {
  const p = generatePassword({ length: 20 });
  loginPassword.value = p;
  loginPassword.type = 'text';
  isLoginPassVisible = true;
  btnToggleLoginPass.textContent = '🙈';
  loginStrengthEl.textContent = '✔ Contraseña segura sugerida generada';
  loginStrengthEl.style.color = '#10b981';
  loginStrengthEl.style.display = 'block';
});

loginPassword.addEventListener('input', () => {
  const val = loginPassword.value;
  if (!val) {
    loginStrengthEl.style.display = 'none';
    return;
  }
  const strength = evaluatePasswordStrength(val);
  if (strength.score >= 3) {
    loginStrengthEl.textContent = '✔ Strong Password';
    loginStrengthEl.style.color = '#10b981';
  } else {
    loginStrengthEl.textContent = '⚠️ Moderate / Weak Password';
    loginStrengthEl.style.color = '#eab308';
  }
  loginStrengthEl.style.display = 'block';
});

btnToggleCvv.addEventListener('click', () => {
  cardCvv.type = cardCvv.type === 'password' ? 'text' : 'password';
  btnToggleCvv.textContent = cardCvv.type === 'password' ? '👁️' : '🙈';
});

btnTogglePin.addEventListener('click', () => {
  cardPin.type = cardPin.type === 'password' ? 'text' : 'password';
  btnTogglePin.textContent = cardPin.type === 'password' ? '👁️' : '🙈';
});

// Guardar Elemento Especializado
btnSaveCreate.addEventListener('click', async () => {
  const name = itemTitle.value.trim();
  const notes = itemNotes.value.trim();
  const folderId = itemFolder.value || null;

  if (!name) {
    alert('El título es obligatorio.');
    return;
  }

  let dataPayload: any = {};

  if (activeCreateType === 'login') {
    const password = loginPassword.value;
    if (!password) {
      alert('Ingresa una contraseña.');
      return;
    }
    const username = loginUsername.value.trim();
    const uri = loginUrl.value.trim();
    dataPayload = {
      username,
      password,
      uris: uri ? [uri] : [],
      notes,
    } as LoginData;
  } else if (activeCreateType === 'card') {
    const number = cardNumber.value.trim();
    if (!number) {
      alert('El número de tarjeta es obligatorio.');
      return;
    }
    const cardholderName = cardHolder.value.trim();
    const exp = cardExp.value.trim();
    const [expMonth = '', expYear = ''] = exp.split('/');
    const cvv = cardCvv.value.trim();
    const pin = cardPin.value.trim();
    dataPayload = {
      cardholderName,
      brand: 'other',
      number,
      expMonth,
      expYear,
      cvv,
      pin,
      notes: [cardZip.value ? `ZIP: ${cardZip.value}` : '', notes].filter(Boolean).join('\n'),
    } as CardData;
  } else if (activeCreateType === 'note') {
    const text = noteText.value.trim();
    dataPayload = {
      text,
    } as NoteData;
  } else if (activeCreateType === 'identity') {
    const firstName = idFirst.value.trim();
    const lastName = idLast.value.trim();
    const email = idEmail.value.trim();
    const phone = idPhone.value.trim();
    const address = idAddress.value.trim();
    dataPayload = {
      firstName,
      lastName,
      email,
      phone,
      address,
      notes,
    } as IdentityData;
  }

  btnSaveCreate.disabled = true;
  btnSaveCreate.textContent = 'Saving...';

  try {
    const res = await chrome.runtime.sendMessage({
      type: 'SAVE_ITEM',
      item: {
        id: crypto.randomUUID(),
        type: activeCreateType,
        name,
        folderId,
        data: dataPayload,
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

// ================= MODAL ADD NEW FOLDER (Image 5) =================
function openFolderModal() {
  folderNameInput.value = '';
  modalFolder.style.display = 'flex';
  setTimeout(() => folderNameInput.focus(), 50);
}

btnCloseFolder.addEventListener('click', () => {
  modalFolder.style.display = 'none';
});

btnSaveFolder.addEventListener('click', async () => {
  const name = folderNameInput.value.trim();
  if (!name) {
    alert('Ingresa el nombre de la carpeta.');
    return;
  }

  const newFolder: Folder = {
    id: crypto.randomUUID(),
    name,
  };

  folders.push(newFolder);
  await chrome.storage.local.set({ folders });
  renderFoldersList();
  populateFolderSelect();

  modalFolder.style.display = 'none';
  showToast(`✓ Carpeta "${name}" creada`);
});

// ================= MODAL GENERADOR =================
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

// Acciones Settings
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

if (window.location.hash === '#settings') {
  showSettingsView();
}

loadData();
