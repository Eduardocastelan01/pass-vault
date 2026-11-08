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
const viewAccount = document.getElementById('view-account')!;

// Auth
const authServer = document.getElementById('auth-server') as HTMLInputElement;
const authEmail = document.getElementById('auth-email') as HTMLInputElement;
const authPassword = document.getElementById('auth-password') as HTMLInputElement;
const authError = document.getElementById('auth-error')!;
const btnAuthSubmit = document.getElementById('btn-auth-submit') as HTMLButtonElement;
const btnToggleAuthMode = document.getElementById('btn-toggle-auth-mode')!;
const authTitle = document.getElementById('auth-title')!;
const btnForgotCreds = document.getElementById('btn-forgot-creds')!;

// Header NordPass
const nordHeader = document.getElementById('nord-header')!;
const btnVaultMenu = document.getElementById('btn-vault-menu')!;
const vaultDropdown = document.getElementById('vault-dropdown')!;
const selectedVaultLabel = document.getElementById('selected-vault-label')!;
const userAvatar = document.getElementById('user-avatar')!;

// Submenú Cuenta (Image 4)
const btnAccountBack = document.getElementById('btn-account-back')!;
const accountAvatarLarge = document.getElementById('account-avatar-large')!;
const accountEmailDisplay = document.getElementById('account-email-display')!;
const btnAccountAddNew = document.getElementById('btn-account-add-new')!;
const btnAccountLock = document.getElementById('btn-account-lock')!;
const btnAccountLogout = document.getElementById('btn-account-logout')!;

// Búsqueda y Filtros de Ordenación (Image 5)
const vaultSearch = document.getElementById('vault-search') as HTMLInputElement;
const btnSortToggle = document.getElementById('btn-sort-toggle')!;
const sortLabel = document.getElementById('sort-label')!;
const sortDropdownMenu = document.getElementById('sort-dropdown-menu')!;
const checkOrderAsc = document.getElementById('check-order-asc')!;
const checkOrderDesc = document.getElementById('check-order-desc')!;
const checkSortTitle = document.getElementById('check-sort-title')!;
const checkSortLast = document.getElementById('check-sort-last')!;
const itemsCounter = document.getElementById('items-counter')!;
const itemsList = document.getElementById('items-list')!;

// Bottom Bar (Image 1 y 3)
const btnSettingsOpen = document.getElementById('btn-settings-open')!;
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
const btnActionShare = document.getElementById('btn-action-share')!;
const btnActionAttach = document.getElementById('btn-action-attach')!;
const btnActionMore = document.getElementById('btn-action-more')!;

// Modal Agregar / Editar
const modalAdd = document.getElementById('modal-add')!;
const btnCloseModal = document.getElementById('btn-close-modal')!;
const addName = document.getElementById('add-name') as HTMLInputElement;
const addUsername = document.getElementById('add-username') as HTMLInputElement;
const addPassword = document.getElementById('add-password') as HTMLInputElement;
const addUri = document.getElementById('add-uri') as HTMLInputElement;
const addNotes = document.getElementById('add-notes') as HTMLTextAreaElement;
const btnToggleAddPass = document.getElementById('btn-toggle-add-pass')!;
const btnQuickGen = document.getElementById('btn-quick-gen')!;
const addStrengthFeedback = document.getElementById('add-strength-feedback')!;
const btnSaveNew = document.getElementById('btn-save-new') as HTMLButtonElement;

const toastEl = document.getElementById('toast')!;

// Estado
let currentItems: DecryptedVaultItem[] = [];
let isRegisterMode = false;
let currentDetailItem: DecryptedVaultItem | null = null;
let isPasswordVisibleInDetail = false;
let isPasswordVisibleInAdd = false;
let editingItemId: string | null = null;
let currentVaultSection = 'vault'; // 'vault' | 'shared' | 'trash' | 'folders'
let sortField: 'title' | 'last_used' = 'last_used';
let sortOrder: 'asc' | 'desc' = 'desc';
let userEmailAddress = '';

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

function updateUserInitials(email: string) {
  userEmailAddress = email;
  const parts = email.split('@')[0];
  const initials = parts.slice(0, 2).charAt(0).toUpperCase() + parts.slice(0, 2).charAt(1).toLowerCase();
  const displayInitials = initials || 'Je';
  userAvatar.textContent = displayInitials;
  accountAvatarLarge.textContent = displayInitials;
  accountEmailDisplay.textContent = email;
}

// Inicialización
async function init() {
  const status = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });

  if (status.serverUrl) authServer.value = status.serverUrl;
  if (status.email) {
    authEmail.value = status.email;
    updateUserInitials(status.email);
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
  nordHeader.style.display = 'none';
  viewAuth.style.display = 'flex';
  viewVault.style.display = 'none';
  viewDetail.style.display = 'none';
  viewAccount.style.display = 'none';
}

function showVaultView() {
  nordHeader.style.display = 'flex';
  viewAuth.style.display = 'none';
  viewVault.style.display = 'flex';
  viewDetail.style.display = 'none';
  viewAccount.style.display = 'none';
}

function showAccountView() {
  nordHeader.style.display = 'none';
  viewAuth.style.display = 'none';
  viewVault.style.display = 'none';
  viewDetail.style.display = 'none';
  viewAccount.style.display = 'flex';
}

// ================= MENÚ VAULT (Image 1) =================
btnVaultMenu.addEventListener('click', (e) => {
  e.stopPropagation();
  sortDropdownMenu.style.display = 'none';
  vaultDropdown.style.display = vaultDropdown.style.display === 'none' ? 'flex' : 'none';
});

document.querySelectorAll('.nord-menu-item').forEach((item) => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nord-menu-item').forEach((i) => i.classList.remove('active'));
    item.classList.add('active');

    const view = item.getAttribute('data-view') || 'vault';
    currentVaultSection = view;

    const labelMap: Record<string, string> = {
      vault: 'Vault',
      shared: 'Shared Items',
      trash: 'Trash',
      folders: 'Folders',
    };
    selectedVaultLabel.textContent = labelMap[view] || 'Vault';
    vaultDropdown.style.display = 'none';
    renderItems();
  });
});

// ================= CUENTA DE USUARIO (Image 4) =================
userAvatar.addEventListener('click', () => {
  vaultDropdown.style.display = 'none';
  sortDropdownMenu.style.display = 'none';
  showAccountView();
});

btnAccountBack.addEventListener('click', () => {
  showVaultView();
});

btnAccountLock.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'LOCK' });
  showAuthView();
  authPassword.value = '';
  showToast('Bóveda bloqueada');
});

btnAccountLogout.addEventListener('click', async () => {
  const ok = confirm('¿Deseas cerrar sesión en esta extensión?');
  if (ok) {
    await chrome.runtime.sendMessage({ type: 'LOGOUT' });
    showAuthView();
    authPassword.value = '';
    showToast('Sesión cerrada');
  }
});

btnAccountAddNew.addEventListener('click', () => {
  isRegisterMode = true;
  authTitle.textContent = 'Crear Nueva Cuenta';
  btnAuthSubmit.textContent = 'Crear Bóveda Segura';
  btnToggleAuthMode.textContent = 'Ya tengo cuenta (Iniciar sesión)';
  authEmail.value = '';
  authPassword.value = '';
  showAuthView();
});

// ================= ORDENACIÓN (Image 5) =================
btnSortToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  vaultDropdown.style.display = 'none';
  sortDropdownMenu.style.display = sortDropdownMenu.style.display === 'none' ? 'flex' : 'none';
});

// Opciones de orden: Ascending / Descending
document.querySelectorAll('.nord-sort-option[data-order]').forEach((opt) => {
  opt.addEventListener('click', (e) => {
    e.stopPropagation();
    const order = opt.getAttribute('data-order') as 'asc' | 'desc';
    sortOrder = order;

    if (order === 'asc') {
      checkOrderAsc.style.visibility = 'visible';
      checkOrderDesc.style.visibility = 'hidden';
    } else {
      checkOrderAsc.style.visibility = 'hidden';
      checkOrderDesc.style.visibility = 'visible';
    }

    sortDropdownMenu.style.display = 'none';
    renderItems();
  });
});

// Opciones de orden: Title / Last Used
document.querySelectorAll('.nord-sort-option[data-sort]').forEach((opt) => {
  opt.addEventListener('click', (e) => {
    e.stopPropagation();
    const sort = opt.getAttribute('data-sort') as 'title' | 'last_used';
    sortField = sort;

    if (sort === 'title') {
      checkSortTitle.style.visibility = 'visible';
      checkSortLast.style.visibility = 'hidden';
      sortLabel.textContent = 'Sort By Title';
    } else {
      checkSortTitle.style.visibility = 'hidden';
      checkSortLast.style.visibility = 'visible';
      sortLabel.textContent = 'Sort By Last Used';
    }

    sortDropdownMenu.style.display = 'none';
    renderItems();
  });
});

// Cerrar menús al hacer clic fuera
document.addEventListener('click', (e) => {
  const target = e.target as Node;
  if (!vaultDropdown.contains(target) && !btnVaultMenu.contains(target)) {
    vaultDropdown.style.display = 'none';
  }
  if (!sortDropdownMenu.contains(target) && !btnSortToggle.contains(target)) {
    sortDropdownMenu.style.display = 'none';
  }
});

// ================= AUTENTICACIÓN =================
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

btnForgotCreds.addEventListener('click', async () => {
  const email = authEmail.value.trim();
  if (!email) {
    alert('Por favor ingresa tu correo electrónico primero.');
    return;
  }

  const confirmReset = confirm(
    `¿Deseas restablecer tu cuenta para ${email}?\n\nEsto te permitirá registrar una nueva contraseña maestra que recuerdes.`
  );

  if (!confirmReset) return;

  btnForgotCreds.textContent = 'Restableciendo...';
  try {
    await chrome.runtime.sendMessage({
      type: 'RESET_ACCOUNT',
      email,
      serverUrl: authServer.value.trim(),
    });

    isRegisterMode = true;
    authTitle.textContent = 'Crear Nueva Cuenta';
    btnAuthSubmit.textContent = 'Crear Bóveda Segura';
    btnToggleAuthMode.textContent = 'Ya tengo cuenta (Iniciar sesión)';
    authPassword.value = '';
    authError.style.display = 'none';
    showToast('✓ Cuenta restablecida. Crea tu nueva contraseña.');
  } catch (err: any) {
    alert(err.message || 'Error al restablecer');
  } finally {
    btnForgotCreds.textContent = '¿Olvidaste tu contraseña maestra? Restablecer cuenta';
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
  btnAuthSubmit.disabled = true;

  try {
    const actionType = isRegisterMode ? 'REGISTER' : 'LOGIN';
    const res = await chrome.runtime.sendMessage({
      type: actionType,
      email,
      password,
      serverUrl,
    });

    if (res.error) throw new Error(res.error);

    updateUserInitials(email);
    showVaultView();
    await loadItems();
    showToast(res.offline ? '✓ Bóveda accesible (Modo Offline)' : '✓ Bóveda sincronizada');
  } catch (err: any) {
    authError.textContent = err.message || 'Error al autenticar';
    authError.style.display = 'block';
  } finally {
    btnAuthSubmit.disabled = false;
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

// ================= RENDERIZADO DE ELEMENTOS =================
function renderItems() {
  if (currentVaultSection === 'shared') {
    itemsCounter.textContent = '0 items';
    itemsList.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 48px 16px; font-size: 13px;">
        <div style="font-size: 28px; margin-bottom: 8px;">👥</div>
        <strong>Shared Items</strong>
        <p style="margin-top: 6px; font-size: 12px;">No tienes elementos compartidos todavía.</p>
      </div>
    `;
    return;
  }

  if (currentVaultSection === 'trash') {
    itemsCounter.textContent = '0 items';
    itemsList.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 48px 16px; font-size: 13px;">
        <div style="font-size: 28px; margin-bottom: 8px;">🗑️</div>
        <strong>Trash</strong>
        <p style="margin-top: 6px; font-size: 12px;">La papelera está vacía.</p>
      </div>
    `;
    return;
  }

  if (currentVaultSection === 'folders') {
    itemsCounter.textContent = '0 items';
    itemsList.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 48px 16px; font-size: 13px;">
        <div style="font-size: 28px; margin-bottom: 8px;">📁</div>
        <strong>Folders</strong>
        <p style="margin-top: 6px; font-size: 12px;">No has creado carpetas aún.</p>
      </div>
    `;
    return;
  }

  const query = vaultSearch.value.toLowerCase().trim();

  let filtered = currentItems.filter((item) => {
    if (!query) return true;
    const nameMatch = item.name.toLowerCase().includes(query);
    const userMatch = item.type === 'login' && (item.data as LoginData).username?.toLowerCase().includes(query);
    return nameMatch || userMatch;
  });

  filtered.sort((a, b) => {
    if (sortField === 'title') {
      return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    } else {
      const timeA = new Date(a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt).getTime();
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    }
  });

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

    row.addEventListener('click', () => {
      openDetailView(item);
    });

    itemsList.appendChild(row);
  }
}

vaultSearch.addEventListener('input', renderItems);

// ================= VISTA DE DETALLE (Image 2) =================
function openDetailView(item: DecryptedVaultItem) {
  currentDetailItem = item;
  isPasswordVisibleInDetail = false;

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
  isPasswordVisibleInDetail = !isPasswordVisibleInDetail;
  detailPassword.textContent = isPasswordVisibleInDetail ? pass : '••••••••••••';
  btnToggleDetailPass.textContent = isPasswordVisibleInDetail ? '🙈' : '👁️';
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

btnActionShare.addEventListener('click', () => {
  showToast('Compartir: Próximamente disponible');
});

btnActionAttach.addEventListener('click', () => {
  showToast('Adjuntos cifrados: Próximamente disponible');
});

btnActionMore.addEventListener('click', () => {
  showToast('Opciones adicionales');
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

// ================= BOTTOM BAR =================
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

// Abre pantalla completa en pestaña dedicada (Image 2)
btnFullscreen.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('fullscreen.html') });
});

// Botón de Ajustes: Lleva a la pantalla completa en la sección de Settings
btnSettingsOpen.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('fullscreen.html#settings') });
});

btnAddItem.addEventListener('click', () => {
  editingItemId = null;
  addName.value = '';
  addUsername.value = '';
  addPassword.value = '';
  addNotes.value = '';
  addPassword.type = 'password';
  isPasswordVisibleInAdd = false;
  btnToggleAddPass.textContent = '👁️';
  addStrengthFeedback.style.display = 'none';
  btnSaveNew.textContent = 'Guardar en Bóveda';
  modalAdd.style.display = 'flex';
});

// ================= MODAL AGREGAR / EDITAR =================
btnCloseModal.addEventListener('click', () => {
  modalAdd.style.display = 'none';
});

// Botón de ver / ocultar contraseña sugerida (feedback del usuario)
btnToggleAddPass.addEventListener('click', () => {
  isPasswordVisibleInAdd = !isPasswordVisibleInAdd;
  addPassword.type = isPasswordVisibleInAdd ? 'text' : 'password';
  btnToggleAddPass.textContent = isPasswordVisibleInAdd ? '🙈' : '👁️';
});

// Botón de generación rápida de contraseña sugerida (⚡)
btnQuickGen.addEventListener('click', () => {
  const p = generatePassword({ length: 20 });
  addPassword.value = p;
  // Hacerla visible inmediatamente para que el usuario pueda verla
  addPassword.type = 'text';
  isPasswordVisibleInAdd = true;
  btnToggleAddPass.textContent = '🙈';
  addStrengthFeedback.textContent = '✔ Contraseña segura sugerida generada';
  addStrengthFeedback.style.display = 'block';
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
