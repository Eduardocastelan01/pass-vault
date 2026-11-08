import {
  generatePassword,
  generatePassphrase,
  evaluatePasswordStrength,
  DecryptedVaultItem,
  LoginData,
  CardData,
  NoteData,
} from '@pass-vault/core';

// Referencias del DOM
const viewAuth = document.getElementById('view-auth')!;
const viewVault = document.getElementById('view-vault')!;
const headerActions = document.getElementById('header-actions')!;
const authTitle = document.getElementById('auth-title')!;
const authServer = document.getElementById('auth-server') as HTMLInputElement;
const authEmail = document.getElementById('auth-email') as HTMLInputElement;
const authPassword = document.getElementById('auth-password') as HTMLInputElement;
const authError = document.getElementById('auth-error')!;
const btnAuthSubmit = document.getElementById('btn-auth-submit')!;
const btnToggleAuthMode = document.getElementById('btn-toggle-auth-mode')!;

const vaultSearch = document.getElementById('vault-search') as HTMLInputElement;
const itemsList = document.getElementById('items-list')!;
const btnSync = document.getElementById('btn-sync')!;
const btnLock = document.getElementById('btn-lock')!;
const tabs = document.querySelectorAll('.tab');

// Modal Agregar
const modalAdd = document.getElementById('modal-add')!;
const btnOpenAdd = document.getElementById('btn-open-add')!;
const btnCloseAdd = document.getElementById('btn-close-add')!;
const addType = document.getElementById('add-type') as HTMLSelectElement;
const addName = document.getElementById('add-name') as HTMLInputElement;
const fieldsLogin = document.getElementById('fields-login')!;
const fieldsCard = document.getElementById('fields-card')!;
const fieldsNote = document.getElementById('fields-note')!;
const btnSaveItem = document.getElementById('btn-save-item')!;

// Campos Login
const addUsername = document.getElementById('add-username') as HTMLInputElement;
const addPassword = document.getElementById('add-password') as HTMLInputElement;
const addUri = document.getElementById('add-uri') as HTMLInputElement;
const btnGenField = document.getElementById('btn-gen-field')!;

// Campos Card
const addCardholder = document.getElementById('add-cardholder') as HTMLInputElement;
const addCardnumber = document.getElementById('add-cardnumber') as HTMLInputElement;
const addCardexp = document.getElementById('add-cardexp') as HTMLInputElement;
const addCardcvv = document.getElementById('add-cardcvv') as HTMLInputElement;

// Campos Note
const addNotetext = document.getElementById('add-notetext') as HTMLTextAreaElement;

// Modal Generador
const modalGen = document.getElementById('modal-gen')!;
const btnOpenGen = document.getElementById('btn-open-generator')!;
const btnCloseGen = document.getElementById('btn-close-gen')!;
const genOutput = document.getElementById('gen-output') as HTMLInputElement;
const btnCopyGen = document.getElementById('btn-copy-gen')!;
const genLength = document.getElementById('gen-length') as HTMLInputElement;
const genLenVal = document.getElementById('gen-len-val')!;
const genScoreText = document.getElementById('gen-score-text')!;
const genMeterFill = document.getElementById('gen-meter-fill')!;
const genBits = document.getElementById('gen-bits')!;
const genUpper = document.getElementById('gen-upper') as HTMLInputElement;
const genLower = document.getElementById('gen-lower') as HTMLInputElement;
const genNum = document.getElementById('gen-num') as HTMLInputElement;
const genSym = document.getElementById('gen-sym') as HTMLInputElement;
const btnRegenerate = document.getElementById('btn-regenerate')!;
const btnGenPassphrase = document.getElementById('btn-gen-passphrase')!;

const toastEl = document.getElementById('toast')!;

let isRegisterMode = false;
let currentItems: DecryptedVaultItem[] = [];
let activeTab = 'all';

function showToast(msg: string) {
  toastEl.textContent = msg;
  toastEl.style.display = 'block';
  setTimeout(() => {
    toastEl.style.display = 'none';
  }, 2000);
}

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(`✓ ${label} copiado`);
  });
}

// Inicialización de estado con Background Worker
async function init() {
  const status = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });

  if (status.serverUrl) authServer.value = status.serverUrl;
  if (status.email) authEmail.value = status.email;

  if (status.isUnlocked) {
    showVaultView();
    loadItems();
  } else {
    showAuthView();
  }

  // Pre-llenar URL actual si estamos agregando un login
  chrome.tabs?.query({ active: true, currentWindow: true }, (tabList) => {
    if (tabList && tabList[0]?.url) {
      addUri.value = tabList[0].url;
      try {
        const urlObj = new URL(tabList[0].url);
        addName.value = urlObj.hostname;
      } catch {}
    }
  });
}

function showAuthView() {
  viewAuth.style.display = 'flex';
  viewVault.style.display = 'none';
  headerActions.style.display = 'none';
}

function showVaultView() {
  viewAuth.style.display = 'none';
  viewVault.style.display = 'flex';
  headerActions.style.display = 'flex';
}

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
    authError.textContent = 'Por favor completa todos los campos.';
    authError.style.display = 'block';
    return;
  }

  btnAuthSubmit.textContent = 'Procesando derivación Argon2id...';
  (btnAuthSubmit as HTMLButtonElement).disabled = true;

  try {
    const actionType = isRegisterMode ? 'REGISTER' : 'LOGIN';
    const res = await chrome.runtime.sendMessage({
      type: actionType,
      email,
      password,
      serverUrl,
    });

    if (res.error) {
      throw new Error(res.error);
    }

    showVaultView();
    await loadItems();
    showToast('✓ Bóveda sincronizada');
  } catch (err: any) {
    authError.textContent = err.message || 'Error al autenticar';
    authError.style.display = 'block';
  } finally {
    (btnAuthSubmit as HTMLButtonElement).disabled = false;
    btnAuthSubmit.textContent = isRegisterMode ? 'Crear Bóveda Segura' : 'Desbloquear';
  }
});

btnLock.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'LOCK' });
  showAuthView();
  authPassword.value = '';
  showToast('Bóveda bloqueada');
});

btnSync.addEventListener('click', async () => {
  btnSync.style.animation = 'spin 1s linear infinite';
  const res = await chrome.runtime.sendMessage({ type: 'SYNC_NOW' });
  btnSync.style.animation = '';
  if (res.success) {
    await loadItems();
    showToast('✓ Bóveda actualizada');
  } else {
    showToast('Error de sincronización');
  }
});

async function loadItems() {
  const res = await chrome.runtime.sendMessage({ type: 'GET_ITEMS' });
  if (res.items) {
    currentItems = res.items;
    renderItems();
  }
}

function renderItems() {
  const query = vaultSearch.value.toLowerCase().trim();
  const filtered = currentItems.filter((item) => {
    if (activeTab !== 'all' && item.type !== activeTab) return false;
    if (!query) return true;
    return (
      item.name.toLowerCase().includes(query) ||
      (item.type === 'login' && (item.data as LoginData).username.toLowerCase().includes(query))
    );
  });

  itemsList.innerHTML = '';

  if (filtered.length === 0) {
    itemsList.innerHTML = `<div class="empty-state">No hay elementos guardados en esta categoría.</div>`;
    return;
  }

  for (const item of filtered) {
    const card = document.createElement('div');
    card.className = 'vault-card';

    let subText = '';
    let actionsHtml = '';

    if (item.type === 'login') {
      const data = item.data as LoginData;
      subText = data.username || 'Sin usuario';
      actionsHtml = `
        <button class="btn-pill" data-copy-user="${data.username}" title="Copiar Usuario">👤</button>
        <button class="btn-pill" data-copy-pass="${data.password}" title="Copiar Contraseña">🔑</button>
      `;
    } else if (item.type === 'card') {
      const data = item.data as CardData;
      subText = `•••• ${data.number.slice(-4)} | Exp: ${data.expMonth}/${data.expYear}`;
      actionsHtml = `
        <button class="btn-pill" data-copy-card="${data.number}" title="Copiar Tarjeta">💳</button>
        <button class="btn-pill" data-copy-cvv="${data.cvv}" title="Copiar CVV">🔒</button>
      `;
    } else if (item.type === 'note') {
      const data = item.data as NoteData;
      subText = data.text ? data.text.slice(0, 30) + '...' : 'Nota vacía';
      actionsHtml = `
        <button class="btn-pill" data-copy-note="${data.text}" title="Copiar Nota">📋</button>
      `;
    }

    card.innerHTML = `
      <div class="card-info">
        <div class="card-title">${item.name}</div>
        <div class="card-sub">${subText}</div>
      </div>
      <div class="card-actions">
        ${actionsHtml}
      </div>
    `;

    // Event listeners para los botones de copia rápida
    card.querySelector('[data-copy-user]')?.addEventListener('click', (e) => {
      const val = (e.currentTarget as HTMLElement).getAttribute('data-copy-user');
      if (val) copyToClipboard(val, 'Usuario');
    });

    card.querySelector('[data-copy-pass]')?.addEventListener('click', (e) => {
      const val = (e.currentTarget as HTMLElement).getAttribute('data-copy-pass');
      if (val) copyToClipboard(val, 'Contraseña');
    });

    card.querySelector('[data-copy-card]')?.addEventListener('click', (e) => {
      const val = (e.currentTarget as HTMLElement).getAttribute('data-copy-card');
      if (val) copyToClipboard(val, 'Número de tarjeta');
    });

    card.querySelector('[data-copy-cvv]')?.addEventListener('click', (e) => {
      const val = (e.currentTarget as HTMLElement).getAttribute('data-copy-cvv');
      if (val) copyToClipboard(val, 'Código CVV');
    });

    card.querySelector('[data-copy-note]')?.addEventListener('click', (e) => {
      const val = (e.currentTarget as HTMLElement).getAttribute('data-copy-note');
      if (val) copyToClipboard(val, 'Nota');
    });

    itemsList.appendChild(card);
  }
}

vaultSearch.addEventListener('input', renderItems);

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    activeTab = tab.getAttribute('data-tab') || 'all';
    renderItems();
  });
});

// Modal de Agregar
btnOpenAdd.addEventListener('click', () => {
  modalAdd.style.display = 'flex';
});

btnCloseAdd.addEventListener('click', () => {
  modalAdd.style.display = 'none';
});

addType.addEventListener('change', () => {
  const type = addType.value;
  fieldsLogin.style.display = type === 'login' ? 'flex' : 'none';
  fieldsCard.style.display = type === 'card' ? 'flex' : 'none';
  fieldsNote.style.display = type === 'note' ? 'flex' : 'none';
});

btnGenField.addEventListener('click', () => {
  addPassword.value = generatePassword({ length: 20 });
  showToast('Contraseña aleatoria generada');
});

btnSaveItem.addEventListener('click', async () => {
  const type = addType.value;
  const name = addName.value.trim();

  if (!name) {
    alert('Ingresa un nombre para este elemento');
    return;
  }

  let data: any = {};
  if (type === 'login') {
    data = {
      username: addUsername.value.trim(),
      password: addPassword.value,
      uris: addUri.value.trim() ? [addUri.value.trim()] : [],
    };
  } else if (type === 'card') {
    const [expMonth, expYear] = (addCardexp.value || '').split('/');
    data = {
      cardholderName: addCardholder.value.trim(),
      brand: 'visa',
      number: addCardnumber.value.replace(/\s+/g, ''),
      expMonth: expMonth || '',
      expYear: expYear || '',
      cvv: addCardcvv.value,
    };
  } else if (type === 'note') {
    data = {
      text: addNotetext.value,
    };
  }

  btnSaveItem.textContent = 'Cifrando...';
  try {
    const res = await chrome.runtime.sendMessage({
      type: 'SAVE_ITEM',
      item: { type, name, data },
    });

    if (res.error) throw new Error(res.error);

    modalAdd.style.display = 'none';
    addName.value = '';
    addUsername.value = '';
    addPassword.value = '';
    addNotetext.value = '';
    await loadItems();
    showToast('✓ Elemento cifrado y guardado');
  } catch (err: any) {
    alert(err.message || 'Error al guardar');
  } finally {
    btnSaveItem.textContent = 'Guardar y Cifrar';
  }
});

// Modal Generador
btnOpenGen.addEventListener('click', () => {
  modalGen.style.display = 'flex';
  updateGenerator();
});

btnCloseGen.addEventListener('click', () => {
  modalGen.style.display = 'none';
});

function updateGenerator() {
  const len = parseInt(genLength.value, 10);
  genLenVal.textContent = len.toString();

  const pwd = generatePassword({
    length: len,
    uppercase: genUpper.checked,
    lowercase: genLower.checked,
    numbers: genNum.checked,
    symbols: genSym.checked,
  });

  genOutput.value = pwd;
  const strength = evaluatePasswordStrength(pwd);

  genScoreText.textContent = strength.label;
  genBits.textContent = `${strength.entropy} bits`;

  const percent = Math.min(100, Math.round((strength.entropy / 120) * 100));
  genMeterFill.style.width = `${percent}%`;

  if (strength.score <= 1) {
    genMeterFill.style.backgroundColor = '#ef4444';
  } else if (strength.score === 2) {
    genMeterFill.style.backgroundColor = '#eab308';
  } else {
    genMeterFill.style.backgroundColor = '#10b981';
  }
}

genLength.addEventListener('input', updateGenerator);
[genUpper, genLower, genNum, genSym].forEach((el) => el.addEventListener('change', updateGenerator));
btnRegenerate.addEventListener('click', updateGenerator);

btnGenPassphrase.addEventListener('click', () => {
  const phrase = generatePassphrase(4, '-');
  genOutput.value = phrase;
  const strength = evaluatePasswordStrength(phrase);
  genScoreText.textContent = strength.label;
  genBits.textContent = `${strength.entropy} bits`;
  genMeterFill.style.width = '85%';
  genMeterFill.style.backgroundColor = '#10b981';
});

btnCopyGen.addEventListener('click', () => {
  if (genOutput.value) {
    copyToClipboard(genOutput.value, 'Contraseña generada');
  }
});

init();

