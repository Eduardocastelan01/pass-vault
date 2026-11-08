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

// Bottom Bar
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

// Modal Agregar / Editar Especializado
const modalAdd = document.getElementById('modal-add')!;
const popupAddModalTitle = document.getElementById('popup-add-modal-title')!;
const btnCloseModal = document.getElementById('btn-close-modal')!;
const popupTypeTabs = document.querySelectorAll('.popup-type-tab');

// Campos Comunes
const addName = document.getElementById('add-name') as HTMLInputElement;
const addFolderSelect = document.getElementById('add-folder-select') as HTMLSelectElement;
const addNotes = document.getElementById('add-notes') as HTMLTextAreaElement;
const popupGroupNotes = document.getElementById('popup-group-notes')!;
const btnSaveNew = document.getElementById('btn-save-new') as HTMLButtonElement;

// 1. Login
const popupFieldsLogin = document.getElementById('popup-fields-login')!;
const addUsername = document.getElementById('add-username') as HTMLInputElement;
const addPassword = document.getElementById('add-password') as HTMLInputElement;
const addUri = document.getElementById('add-uri') as HTMLInputElement;
const btnToggleAddPass = document.getElementById('btn-toggle-add-pass')!;
const btnQuickGen = document.getElementById('btn-quick-gen')!;
const addStrengthFeedback = document.getElementById('add-strength-feedback')!;

// 2. Card (Image 3 y 4)
const popupFieldsCard = document.getElementById('popup-fields-card')!;
const addCardHolder = document.getElementById('add-card-holder') as HTMLInputElement;
const addCardNumber = document.getElementById('add-card-number') as HTMLInputElement;
const addCardExp = document.getElementById('add-card-exp') as HTMLInputElement;
const addCardCvv = document.getElementById('add-card-cvv') as HTMLInputElement;
const addCardPin = document.getElementById('add-card-pin') as HTMLInputElement;
const addCardZip = document.getElementById('add-card-zip') as HTMLInputElement;
const btnToggleAddCvv = document.getElementById('btn-toggle-add-cvv')!;
const btnToggleAddPin = document.getElementById('btn-toggle-add-pin')!;

// 3. Note
const popupFieldsNote = document.getElementById('popup-fields-note')!;
const addNoteContent = document.getElementById('add-note-content') as HTMLTextAreaElement;

// 4. Identity
const popupFieldsIdentity = document.getElementById('popup-fields-identity')!;
const addIdFirst = document.getElementById('add-id-first') as HTMLInputElement;
const addIdLast = document.getElementById('add-id-last') as HTMLInputElement;
const addIdEmail = document.getElementById('add-id-email') as HTMLInputElement;
const addIdPhone = document.getElementById('add-id-phone') as HTMLInputElement;
const addIdAddress = document.getElementById('add-id-address') as HTMLInputElement;

// Modal Carpeta en Popup (Image 5)
const popupModalFolder = document.getElementById('popup-modal-folder')!;
const btnClosePopupFolder = document.getElementById('btn-close-popup-folder')!;
const popupFolderNameInput = document.getElementById('popup-folder-name-input') as HTMLInputElement;
const btnSavePopupFolder = document.getElementById('btn-save-popup-folder')!;

const toastEl = document.getElementById('toast')!;

// Modal Confirmación Integrada en Popup
const popupModalConfirm = document.getElementById('popup-modal-confirm') as HTMLDivElement;
const popupConfirmIconBox = document.getElementById('popup-confirm-icon-box') as HTMLDivElement;
const popupConfirmTitle = document.getElementById('popup-confirm-title') as HTMLElement;
const popupConfirmMessage = document.getElementById('popup-confirm-message') as HTMLElement;
const btnPopupConfirmCancel = document.getElementById('btn-popup-confirm-cancel') as HTMLButtonElement;
const btnPopupConfirmAction = document.getElementById('btn-popup-confirm-action') as HTMLButtonElement;

let popupConfirmCallback: (() => Promise<void> | void) | null = null;

function openPopupConfirmModal(opts: {
  title: string;
  message: string;
  actionText: string;
  isDanger?: boolean;
  icon?: string;
  onConfirm: () => Promise<void> | void;
}) {
  popupConfirmTitle.textContent = opts.title;
  popupConfirmMessage.textContent = opts.message;
  btnPopupConfirmAction.textContent = opts.actionText;
  btnPopupConfirmAction.style.background = opts.isDanger !== false ? '#dc2626' : 'var(--nord-blue)';
  popupConfirmIconBox.style.background = opts.isDanger !== false ? '#fee2e2' : '#e0f2fe';
  popupConfirmIconBox.style.color = opts.isDanger !== false ? '#dc2626' : '#0284c7';
  popupConfirmIconBox.textContent = opts.icon || (opts.isDanger !== false ? '🗑️' : 'ℹ️');
  popupConfirmCallback = opts.onConfirm;
  popupModalConfirm.style.display = 'flex';
}

btnPopupConfirmCancel.addEventListener('click', () => {
  popupModalConfirm.style.display = 'none';
  popupConfirmCallback = null;
});

btnPopupConfirmAction.addEventListener('click', async () => {
  if (popupConfirmCallback) {
    const cb = popupConfirmCallback;
    popupConfirmCallback = null;
    popupModalConfirm.style.display = 'none';
    await cb();
  } else {
    popupModalConfirm.style.display = 'none';
  }
});

// Estado
let currentItems: DecryptedVaultItem[] = [];
let popupFolders: Folder[] = [];
let isRegisterMode = false;
let currentDetailItem: DecryptedVaultItem | null = null;
let isPasswordVisibleInDetail = false;
let isPasswordVisibleInAdd = false;
let editingItemId: string | null = null;
let currentVaultSection = 'vault'; // 'vault' | 'shared' | 'trash' | 'folders'
let activePopupAddType: 'login' | 'card' | 'note' | 'identity' = 'login';
let sortField: 'title' | 'last_used' = 'last_used';
let sortOrder: 'asc' | 'desc' = 'desc';

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
  const parts = email.split('@')[0];
  const initials = parts.slice(0, 2).charAt(0).toUpperCase() + parts.slice(0, 2).charAt(1).toLowerCase();
  const displayInitials = initials || 'Je';
  userAvatar.textContent = displayInitials;
  accountAvatarLarge.textContent = displayInitials;
  accountEmailDisplay.textContent = email;
}

async function loadPopupFolders() {
  const res = await new Promise<{ folders?: Folder[] }>((resolve) => {
    chrome.storage.local.get(['folders'], (data) => resolve(data));
  });
  popupFolders = res.folders || [];
  populatePopupFolderSelect();
}

function populatePopupFolderSelect() {
  addFolderSelect.innerHTML = '<option value="">- Sin Carpeta -</option>';
  for (const f of popupFolders) {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = f.name;
    addFolderSelect.appendChild(opt);
  }
}

// Inicialización
async function init() {
  await loadPopupFolders();

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

  // Prellenar URL de la pestaña activa en el modal de agregar si está en modo login
  chrome.tabs?.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0]?.url && !tabs[0].url.startsWith('chrome://') && !tabs[0].url.startsWith('brave://')) {
      addUri.value = tabs[0].url;
      try {
        const hostname = new URL(tabs[0].url).hostname.replace(/^www\./, '');
        if (!addName.value) {
          addName.value = hostname.charAt(0).toUpperCase() + hostname.slice(1);
        }
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

btnAccountLogout.addEventListener('click', () => {
  openPopupConfirmModal({
    title: 'Cerrar Sesión',
    message: '¿Deseas cerrar sesión en esta extensión? Deberás ingresar tu contraseña maestra para volver a entrar.',
    actionText: 'Cerrar Sesión',
    isDanger: true,
    icon: '🔒',
    onConfirm: async () => {
      await chrome.runtime.sendMessage({ type: 'LOGOUT' });
      showAuthView();
      authPassword.value = '';
      showToast('Sesión cerrada');
    },
  });
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
    showToast('Ingresa tu correo electrónico primero.');
    return;
  }

  openPopupConfirmModal({
    title: 'Restablecer Cuenta',
    message: `¿Deseas restablecer tu cuenta para ${email}? Esto te permitirá registrar una nueva contraseña maestra que recuerdes.`,
    actionText: 'Restablecer Cuenta',
    isDanger: true,
    icon: '⚠️',
    onConfirm: async () => {
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
        showToast(err.message || 'Error al restablecer');
      } finally {
        btnForgotCreds.textContent = '¿Olvidaste tu contraseña maestra? Restablecer cuenta';
      }
    },
  });
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
    itemsCounter.textContent = `${popupFolders.length} folders`;
    if (popupFolders.length === 0) {
      itemsList.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 40px 16px; font-size: 13px;">
          <div style="font-size: 28px; margin-bottom: 8px;">📁</div>
          <strong>No hay carpetas creadas</strong>
          <p style="margin-top: 6px; font-size: 12px; margin-bottom: 16px;">Crea carpetas para organizar tus contraseñas y notas.</p>
          <button id="btn-popup-add-folder-empty" class="nord-btn-main" style="width: auto; padding: 8px 16px;">+ Nueva Carpeta</button>
        </div>
      `;
      itemsList.querySelector('#btn-popup-add-folder-empty')?.addEventListener('click', openPopupFolderModal);
    } else {
      itemsList.innerHTML = `
        <div style="display: flex; justify-content: flex-end; padding: 6px 8px;">
          <button id="btn-popup-add-folder-action" style="background: transparent; border: none; color: var(--accent-blue); font-weight: 600; cursor: pointer; font-size: 12px;">+ Nueva Carpeta</button>
        </div>
      `;
      itemsList.querySelector('#btn-popup-add-folder-action')?.addEventListener('click', openPopupFolderModal);

      for (const f of popupFolders) {
        const count = currentItems.filter((i) => i.folderId === f.id).length;
        const row = document.createElement('div');
        row.className = 'nord-item-row';
        row.innerHTML = `
          <div class="nord-item-favicon" style="background: #e0f2fe; color: #0284c7;">📁</div>
          <div class="nord-item-info">
            <div class="nord-item-title">${f.name}</div>
            <div class="nord-item-sub">${count} elementos</div>
          </div>
          <div class="nord-item-actions" style="display: flex;">
            <button class="nord-btn-icon-sm" data-delete-f="${f.id}" title="Eliminar carpeta" style="color: var(--danger-red);">🗑️</button>
          </div>
        `;

        row.querySelector(`[data-delete-f="${f.id}"]`)?.addEventListener('click', (e) => {
          e.stopPropagation();
          openPopupConfirmModal({
            title: `Eliminar Carpeta "${f.name}"`,
            message: `¿Deseas eliminar la carpeta "${f.name}"? Las credenciales dentro de ella se mantendrán en tu bóveda general.`,
            actionText: 'Eliminar Carpeta',
            isDanger: true,
            icon: '🗑️',
            onConfirm: async () => {
              // Desvincular items
              const affected = currentItems.filter((i) => i.folderId === f.id);
              for (const item of affected) {
                item.folderId = null;
                await chrome.runtime.sendMessage({
                  type: 'SAVE_ITEM',
                  item: {
                    id: item.id,
                    type: item.type,
                    name: item.name,
                    favorite: item.favorite,
                    folderId: null,
                    data: item.data,
                  },
                });
              }

              popupFolders = popupFolders.filter((item) => item.id !== f.id);
              await chrome.storage.local.set({ folders: popupFolders });
              populatePopupFolderSelect();
              renderItems();
              showToast(`✓ Carpeta "${f.name}" eliminada`);
            },
          });
        });

        itemsList.appendChild(row);
      }
    }
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
    let iconHtml = '';

    if (item.type === 'login') {
      const data = item.data as LoginData;
      sub = data.username || 'Sin usuario';
      domain = (data.uris && data.uris[0]) ? getDomainFromUrl(data.uris[0]) : getDomainFromUrl(item.name);
      copyUserVal = data.username;
      copyPassVal = data.password;
      const faviconUrl = getFaviconUrl(domain);
      iconHtml = `<img class="nord-item-favicon" src="${faviconUrl}" onerror="this.src='icons/icon48.png';" alt="icon">`;
    } else if (item.type === 'card') {
      const data = item.data as CardData;
      sub = `•••• ${data.number?.slice(-4) || 'Tarjeta'}`;
      copyUserVal = data.number;
      copyPassVal = data.cvv || '';
      iconHtml = `<div class="nord-item-favicon" style="background: #ede9fe; color: #8b5cf6;">💳</div>`;
    } else if (item.type === 'note') {
      const data = item.data as NoteData;
      sub = data.text ? data.text.slice(0, 32) + '...' : 'Nota cifrada';
      copyUserVal = data.text;
      iconHtml = `<div class="nord-item-favicon" style="background: #fef3c7; color: #f59e0b;">📝</div>`;
    } else if (item.type === 'identity') {
      const data = item.data as IdentityData;
      sub = `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email || 'Contacto';
      copyUserVal = data.email || '';
      copyPassVal = data.phone || '';
      iconHtml = `<div class="nord-item-favicon" style="background: #d1fae5; color: #10b981;">👤</div>`;
    }

    row.innerHTML = `
      ${iconHtml}
      <div class="nord-item-info">
        <div class="nord-item-title">${item.name}</div>
        <div class="nord-item-sub">${sub}</div>
      </div>
      <div class="nord-item-actions">
        ${copyUserVal ? `<button class="nord-btn-icon-sm" data-copy-u title="Copiar dato">📋</button>` : ''}
        ${copyPassVal ? `<button class="nord-btn-icon-sm" data-copy-p title="Copiar secreto">🔑</button>` : ''}
      </div>
    `;

    row.querySelector('[data-copy-u]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      copyText(copyUserVal, 'Dato');
    });

    row.querySelector('[data-copy-p]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      copyText(copyPassVal, 'Secreto');
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
    detailFavicon.src = getFaviconUrl(domain);
  } else if (item.type === 'card') {
    const data = item.data as CardData;
    username = `Titular: ${data.cardholderName || 'No indicado'}`;
    password = `No: ${data.number} | CVV: ${data.cvv} | Exp: ${data.expMonth}/${data.expYear}`;
    notes = data.notes || '';
    detailFavicon.src = 'icons/icon48.png';
  } else if (item.type === 'note') {
    const data = item.data as NoteData;
    username = 'Nota Segura';
    password = '';
    notes = data.text || '';
    detailFavicon.src = 'icons/icon48.png';
  } else if (item.type === 'identity') {
    const data = item.data as IdentityData;
    username = `${data.firstName || ''} ${data.lastName || ''}`.trim();
    password = `${data.email || ''} | ${data.phone || ''}`;
    notes = [data.address ? `Dirección: ${data.address}` : '', data.notes || ''].filter(Boolean).join('\n');
    detailFavicon.src = 'icons/icon48.png';
  }

  detailTitle.textContent = item.name;
  detailUsername.textContent = username;
  detailPassword.textContent = password ? '••••••••••••' : '(Sin secreto)';
  detailUrl.textContent = url;
  detailUrl.href = url;

  const folderObj = popupFolders.find((f) => f.id === item.folderId);
  const detailFolderName = document.getElementById('detail-folder-name');
  if (detailFolderName) {
    detailFolderName.textContent = folderObj ? folderObj.name : '- Sin Carpeta -';
  }

  if (notes) {
    detailNotes.textContent = notes;
    detailNotesGroup.style.display = 'flex';
  } else {
    detailNotesGroup.style.display = 'none';
  }

  if (password && item.type === 'login') {
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
  } else {
    detailHealth.style.display = 'none';
  }

  viewDetail.style.display = 'flex';
}

btnDetailBack.addEventListener('click', () => {
  viewDetail.style.display = 'none';
});

btnToggleDetailPass.addEventListener('click', () => {
  if (!currentDetailItem) return;
  let pass = '';
  if (currentDetailItem.type === 'login') pass = (currentDetailItem.data as LoginData).password || '';
  else if (currentDetailItem.type === 'card') {
    const d = currentDetailItem.data as CardData;
    pass = `No: ${d.number} | CVV: ${d.cvv} | PIN: ${d.pin || '-'}`;
  }
  isPasswordVisibleInDetail = !isPasswordVisibleInDetail;
  detailPassword.textContent = isPasswordVisibleInDetail ? pass : '••••••••••••';
  btnToggleDetailPass.textContent = isPasswordVisibleInDetail ? '🙈' : '👁️';
});

btnCopyUsername.addEventListener('click', () => {
  if (currentDetailItem) {
    const u = detailUsername.textContent || '';
    copyText(u, 'Usuario');
  }
});

btnCopyPassword.addEventListener('click', () => {
  if (currentDetailItem) {
    let p = '';
    if (currentDetailItem.type === 'login') p = (currentDetailItem.data as LoginData).password || '';
    else if (currentDetailItem.type === 'card') p = (currentDetailItem.data as CardData).number || '';
    copyText(p, 'Secreto');
  }
});

btnActionShare.addEventListener('click', () => {
  showToast('Compartir: Próximamente');
});

btnActionAttach.addEventListener('click', () => {
  showToast('Adjuntos: Próximamente');
});

btnActionMore.addEventListener('click', () => {
  showToast('Opciones adicionales');
});

btnDetailEdit.addEventListener('click', () => {
  if (!currentDetailItem) return;
  editingItemId = currentDetailItem.id;
  setPopupFormType(currentDetailItem.type);
  addName.value = currentDetailItem.name;
  addFolderSelect.value = currentDetailItem.folderId || '';

  if (currentDetailItem.type === 'login') {
    const data = currentDetailItem.data as LoginData;
    addUsername.value = data.username || '';
    addPassword.value = data.password || '';
    addUri.value = (data.uris && data.uris[0]) || '';
    addNotes.value = data.notes || '';
  } else if (currentDetailItem.type === 'card') {
    const data = currentDetailItem.data as CardData;
    addCardHolder.value = data.cardholderName || '';
    addCardNumber.value = data.number || '';
    addCardExp.value = `${data.expMonth}/${data.expYear}`;
    addCardCvv.value = data.cvv || '';
    addCardPin.value = data.pin || '';
    addNotes.value = data.notes || '';
  } else if (currentDetailItem.type === 'note') {
    const data = currentDetailItem.data as NoteData;
    addNoteContent.value = data.text || '';
  } else if (currentDetailItem.type === 'identity') {
    const data = currentDetailItem.data as IdentityData;
    addIdFirst.value = data.firstName || '';
    addIdLast.value = data.lastName || '';
    addIdEmail.value = data.email || '';
    addIdPhone.value = data.phone || '';
    addIdAddress.value = data.address || '';
    addNotes.value = data.notes || '';
  }

  btnSaveNew.textContent = 'Actualizar Elemento';
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

btnFullscreen.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('fullscreen.html') });
});

btnSettingsOpen.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('fullscreen.html#settings') });
});

btnAddItem.addEventListener('click', () => {
  editingItemId = null;
  setPopupFormType('login');
  addName.value = '';
  addUsername.value = '';
  addPassword.value = '';
  addUri.value = '';
  addCardHolder.value = '';
  addCardNumber.value = '';
  addCardExp.value = '';
  addCardCvv.value = '';
  addCardPin.value = '';
  addCardZip.value = '';
  addNoteContent.value = '';
  addIdFirst.value = '';
  addIdLast.value = '';
  addIdEmail.value = '';
  addIdPhone.value = '';
  addIdAddress.value = '';
  addNotes.value = '';
  addPassword.type = 'password';
  isPasswordVisibleInAdd = false;
  btnToggleAddPass.textContent = '👁️';
  addStrengthFeedback.style.display = 'none';
  btnSaveNew.textContent = 'Guardar en Bóveda';
  modalAdd.style.display = 'flex';
});

// ================= MODAL AGREGAR: PESTAÑAS ESPECIALIZADAS =================
function setPopupFormType(type: 'login' | 'card' | 'note' | 'identity') {
  activePopupAddType = type;
  popupTypeTabs.forEach((tab) => {
    tab.classList.toggle('active', tab.getAttribute('data-popup-type') === type);
  });

  popupFieldsLogin.style.display = 'none';
  popupFieldsCard.style.display = 'none';
  popupFieldsNote.style.display = 'none';
  popupFieldsIdentity.style.display = 'none';

  if (type === 'login') {
    popupAddModalTitle.textContent = 'Nueva Contraseña';
    popupFieldsLogin.style.display = 'flex';
    popupGroupNotes.style.display = 'flex';
  } else if (type === 'card') {
    popupAddModalTitle.textContent = 'Nueva Tarjeta';
    popupFieldsCard.style.display = 'flex';
    popupGroupNotes.style.display = 'flex';
  } else if (type === 'note') {
    popupAddModalTitle.textContent = 'Nueva Nota Segura';
    popupFieldsNote.style.display = 'flex';
    popupGroupNotes.style.display = 'none';
  } else if (type === 'identity') {
    popupAddModalTitle.textContent = 'Nuevo Contacto';
    popupFieldsIdentity.style.display = 'flex';
    popupGroupNotes.style.display = 'flex';
  }
}

popupTypeTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const t = tab.getAttribute('data-popup-type') as 'login' | 'card' | 'note' | 'identity';
    setPopupFormType(t);
  });
});

btnCloseModal.addEventListener('click', () => {
  modalAdd.style.display = 'none';
});

btnToggleAddPass.addEventListener('click', () => {
  isPasswordVisibleInAdd = !isPasswordVisibleInAdd;
  addPassword.type = isPasswordVisibleInAdd ? 'text' : 'password';
  btnToggleAddPass.textContent = isPasswordVisibleInAdd ? '🙈' : '👁️';
});

btnQuickGen.addEventListener('click', () => {
  const p = generatePassword({ length: 20 });
  addPassword.value = p;
  addPassword.type = 'text';
  isPasswordVisibleInAdd = true;
  btnToggleAddPass.textContent = '🙈';
  addStrengthFeedback.textContent = '✔ Contraseña segura sugerida generada';
  addStrengthFeedback.style.display = 'block';
  showToast('Contraseña aleatoria generada');
});

btnToggleAddCvv.addEventListener('click', () => {
  addCardCvv.type = addCardCvv.type === 'password' ? 'text' : 'password';
  btnToggleAddCvv.textContent = addCardCvv.type === 'password' ? '👁️' : '🙈';
});

btnToggleAddPin.addEventListener('click', () => {
  addCardPin.type = addCardPin.type === 'password' ? 'text' : 'password';
  btnToggleAddPin.textContent = addCardPin.type === 'password' ? '👁️' : '🙈';
});

btnSaveNew.addEventListener('click', async () => {
  const name = addName.value.trim();
  const folderId = addFolderSelect.value || null;
  const notes = addNotes.value.trim();

  if (!name) {
    showToast('Ingresa el título o nombre del elemento');
    return;
  }

  let dataPayload: any = {};

  if (activePopupAddType === 'login') {
    const password = addPassword.value;
    if (!password) {
      showToast('Ingresa la contraseña');
      return;
    }
    const username = addUsername.value.trim();
    const uri = addUri.value.trim();
    dataPayload = {
      username,
      password,
      uris: uri ? [uri] : [],
      notes,
    } as LoginData;
  } else if (activePopupAddType === 'card') {
    const number = addCardNumber.value.trim();
    if (!number) {
      showToast('Ingresa el número de tarjeta');
      return;
    }
    const cardholderName = addCardHolder.value.trim();
    const exp = addCardExp.value.trim();
    const [expMonth = '', expYear = ''] = exp.split('/');
    const cvv = addCardCvv.value.trim();
    const pin = addCardPin.value.trim();
    dataPayload = {
      cardholderName,
      brand: 'other',
      number,
      expMonth,
      expYear,
      cvv,
      pin,
      notes: [addCardZip.value ? `ZIP: ${addCardZip.value}` : '', notes].filter(Boolean).join('\n'),
    } as CardData;
  } else if (activePopupAddType === 'note') {
    const text = addNoteContent.value.trim();
    dataPayload = {
      text,
    } as NoteData;
  } else if (activePopupAddType === 'identity') {
    const firstName = addIdFirst.value.trim();
    const lastName = addIdLast.value.trim();
    const email = addIdEmail.value.trim();
    const phone = addIdPhone.value.trim();
    const address = addIdAddress.value.trim();
    dataPayload = {
      firstName,
      lastName,
      email,
      phone,
      address,
      notes,
    } as IdentityData;
  }

  btnSaveNew.disabled = true;
  btnSaveNew.textContent = 'Guardando...';

  try {
    const res = await chrome.runtime.sendMessage({
      type: 'SAVE_ITEM',
      item: {
        id: editingItemId || crypto.randomUUID(),
        type: activePopupAddType,
        name,
        folderId,
        data: dataPayload,
      },
    });

    if (res.error) throw new Error(res.error);

    modalAdd.style.display = 'none';
    viewDetail.style.display = 'none';
    await loadItems();
    showToast('✓ Elemento guardado en tu bóveda');
  } catch (err: any) {
    showToast(err.message || 'Error al guardar');
  } finally {
    btnSaveNew.disabled = false;
    btnSaveNew.textContent = 'Guardar en Bóveda';
  }
});

// ================= MODAL ADD FOLDER POPUP (Image 5) =================
function openPopupFolderModal() {
  popupFolderNameInput.value = '';
  popupModalFolder.style.display = 'flex';
  setTimeout(() => popupFolderNameInput.focus(), 50);
}

btnClosePopupFolder.addEventListener('click', () => {
  popupModalFolder.style.display = 'none';
});

btnSavePopupFolder.addEventListener('click', async () => {
  const name = popupFolderNameInput.value.trim();
  if (!name) {
    showToast('Ingresa el nombre de la carpeta');
    return;
  }

  const newFolder: Folder = {
    id: crypto.randomUUID(),
    name,
  };

  popupFolders.push(newFolder);
  await chrome.storage.local.set({ folders: popupFolders });
  populatePopupFolderSelect();
  popupModalFolder.style.display = 'none';
  renderItems();
  showToast(`✓ Carpeta "${name}" creada`);
});

init();
