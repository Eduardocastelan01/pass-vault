// Content Script para autollenado e intercepción inteligente de credenciales estilo NordPass

interface MatchingLogin {
  id: string;
  name: string;
  data: {
    username: string;
    password: string;
    uris: string[];
  };
}

let activeDropdown: HTMLElement | null = null;
let lastTypedUsername = '';
let lastTypedPassword = '';
let lastInterceptionTime = 0;

function removeDropdown() {
  if (activeDropdown) {
    activeDropdown.remove();
    activeDropdown = null;
  }
}

document.addEventListener('click', (e) => {
  if (activeDropdown && !activeDropdown.contains(e.target as Node)) {
    removeDropdown();
  }
});

/**
 * Dispara eventos input y change de forma compatible con React, Vue, Angular y Web Components
 */
function setNativeValue(element: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
  const prototype = Object.getPrototypeOf(element);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value);
  } else if (valueSetter) {
    valueSetter.call(element, value);
  } else {
    element.value = value;
  }

  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function findUsernameField(passwordInput: HTMLInputElement): HTMLInputElement | null {
  const form = passwordInput.form;
  if (form) {
    const inputs = Array.from(
      form.querySelectorAll('input:not([type="hidden"]):not([type="password"]):not([type="submit"])')
    ) as HTMLInputElement[];
    const usernameInput = inputs.find((i) =>
      /user|email|login|account|usuario|correo|phone|tel/i.test(i.name || i.id || i.type || i.placeholder || i.autocomplete)
    );
    if (usernameInput) return usernameInput;
    if (inputs.length > 0) return inputs[inputs.length - 1];
  }

  // Si no hay form tag envolvente, buscar el input visible anterior más cercano
  const allInputs = Array.from(document.querySelectorAll('input')) as HTMLInputElement[];
  const idx = allInputs.indexOf(passwordInput);
  for (let i = idx - 1; i >= 0; i--) {
    const inp = allInputs[i];
    if (inp.type !== 'hidden' && inp.type !== 'password' && inp.type !== 'submit' && inp.type !== 'checkbox') {
      return inp;
    }
  }

  return null;
}

function attachAutofillToInput(passwordInput: HTMLInputElement, logins: MatchingLogin[]) {
  if (passwordInput.dataset.passvaultAttached) return;
  passwordInput.dataset.passvaultAttached = 'true';

  const badge = document.createElement('div');
  badge.className = 'passvault-icon-badge';
  badge.title = 'PassVault - Autollenar credenciales';
  badge.innerHTML = `
    <svg viewBox="0 0 24 24">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    </svg>
  `;

  function positionBadge() {
    const currentRect = passwordInput.getBoundingClientRect();
    if (currentRect.width === 0 || currentRect.height === 0) return;
    badge.style.top = `${window.scrollY + currentRect.top + (currentRect.height - 24) / 2}px`;
    badge.style.left = `${window.scrollX + currentRect.right - 30}px`;
  }

  positionBadge();
  window.addEventListener('resize', positionBadge);
  window.addEventListener('scroll', positionBadge);
  document.body.appendChild(badge);

  badge.addEventListener('click', (e) => {
    e.stopPropagation();
    if (activeDropdown) {
      removeDropdown();
      return;
    }

    const dropdown = document.createElement('div');
    dropdown.className = 'passvault-dropdown';

    const header = document.createElement('div');
    header.className = 'passvault-dropdown-header';
    header.innerHTML = `<span>PassVault</span><span>${logins.length} cuenta(s)</span>`;
    dropdown.appendChild(header);

    for (const login of logins) {
      const itemEl = document.createElement('div');
      itemEl.className = 'passvault-dropdown-item';
      itemEl.innerHTML = `
        <div class="passvault-item-title">${login.name}</div>
        <div class="passvault-item-user">${login.data.username}</div>
      `;

      itemEl.addEventListener('click', (clickEv) => {
        clickEv.stopPropagation();
        const usernameInput = findUsernameField(passwordInput);
        if (usernameInput) {
          setNativeValue(usernameInput, login.data.username);
        }
        setNativeValue(passwordInput, login.data.password);
        removeDropdown();
      });

      dropdown.appendChild(itemEl);
    }

    const currentRect = passwordInput.getBoundingClientRect();
    dropdown.style.top = `${window.scrollY + currentRect.bottom + 4}px`;
    dropdown.style.left = `${window.scrollX + currentRect.left}px`;

    document.body.appendChild(dropdown);
    activeDropdown = dropdown;
  });
}

// Escanear inputs de contraseña para mostrar el ícono de autollenado
async function scanForPasswordFields() {
  try {
    const res = await chrome.runtime.sendMessage({
      type: 'GET_MATCHING_LOGINS',
      url: window.location.href,
    });

    if (!res || !res.items || res.items.length === 0) return;

    const passwordInputs = document.querySelectorAll('input[type="password"]');
    passwordInputs.forEach((input) => {
      attachAutofillToInput(input as HTMLInputElement, res.items);
    });
  } catch {}
}

// Rastrear en tiempo real lo que el usuario escribe para autoguardado inteligente
document.addEventListener('input', (e) => {
  const target = e.target as HTMLInputElement;
  if (!target) return;

  if (target.type === 'password' && target.value.length > 0) {
    lastTypedPassword = target.value;
    const uField = findUsernameField(target);
    if (uField && uField.value) {
      lastTypedUsername = uField.value.trim();
    }
  } else if (
    /user|email|login|account|usuario|correo/i.test(target.name || target.id || target.type || target.placeholder)
  ) {
    if (target.value) {
      lastTypedUsername = target.value.trim();
    }
  }
});

// Detectar envío de credenciales mediante múltiples disparadores
function attemptSaveDetection() {
  const now = Date.now();
  if (now - lastInterceptionTime < 2500) return; // Evitar disparos duplicados
  lastInterceptionTime = now;

  // Si no tenemos en memoria, buscar en los inputs de la página
  if (!lastTypedPassword) {
    const passInput = document.querySelector('input[type="password"]') as HTMLInputElement;
    if (passInput && passInput.value) {
      lastTypedPassword = passInput.value;
      const uInput = findUsernameField(passInput);
      if (uInput && uInput.value) {
        lastTypedUsername = uInput.value.trim();
      }
    }
  }

  if (lastTypedPassword && lastTypedPassword.length >= 3) {
    const username = lastTypedUsername || 'Cuenta sin usuario';
    showSaveBanner(username, lastTypedPassword);
  }
}

// Disparador 1: Envío tradicional de formulario
document.addEventListener('submit', () => {
  attemptSaveDetection();
});

// Disparador 2: Clic en botones de login / acceder / sign in
document.addEventListener('click', (e) => {
  const target = (e.target as HTMLElement)?.closest('button, input[type="submit"], [role="button"], a');
  if (!target) return;

  const text = (target.textContent || (target as HTMLInputElement).value || '').toLowerCase();
  if (/iniciar|sesi[oó]n|login|sign in|acceder|ingresar|entrar|submit|continuar|continue/i.test(text)) {
    setTimeout(attemptSaveDetection, 300);
  }
});

// Disparador 3: Tecla Enter en el campo de contraseña
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const target = e.target as HTMLInputElement;
    if (target && target.type === 'password') {
      setTimeout(attemptSaveDetection, 300);
    }
  }
});

function showSaveBanner(username: string, password: string) {
  if (document.querySelector('.passvault-save-banner')) return;

  const domain = window.location.hostname.replace(/^www\./, '');
  const banner = document.createElement('div');
  banner.className = 'passvault-save-banner';
  banner.innerHTML = `
    <div class="passvault-banner-header">
      <div class="passvault-banner-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
        ¿Guardar en PassVault?
      </div>
      <button class="passvault-banner-close" id="pv-close" title="Cerrar">✕</button>
    </div>
    <div class="passvault-banner-body">
      <div class="passvault-field-row">
        <span>Sitio web:</span>
        <strong>${domain}</strong>
      </div>
      <div class="passvault-field-row">
        <span>Usuario:</span>
        <strong>${username}</strong>
      </div>
      <div class="passvault-field-row">
        <span>Contraseña:</span>
        <strong>••••••••</strong>
      </div>
    </div>
    <div class="passvault-banner-actions">
      <button class="passvault-btn-secondary" id="pv-cancel">Ahora no</button>
      <button class="passvault-btn-primary" id="pv-save">Guardar Contraseña</button>
    </div>
  `;

  document.body.appendChild(banner);

  const removeBanner = () => {
    banner.style.opacity = '0';
    banner.style.transform = 'translateY(-20px)';
    banner.style.transition = 'all 0.2s ease-in';
    setTimeout(() => banner.remove(), 200);
  };

  banner.querySelector('#pv-close')?.addEventListener('click', removeBanner);
  banner.querySelector('#pv-cancel')?.addEventListener('click', removeBanner);

  banner.querySelector('#pv-save')?.addEventListener('click', async () => {
    const saveBtn = banner.querySelector('#pv-save') as HTMLButtonElement;
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Guardando...';
    }

    try {
      const res = await chrome.runtime.sendMessage({
        type: 'SAVE_ITEM',
        item: {
          type: 'login',
          name: domain,
          data: {
            username,
            password,
            uris: [window.location.origin],
          },
        },
      });

      if (res && res.error) {
        throw new Error(res.error);
      }

      banner.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; color: #4ade80; font-weight: 600; padding: 10px 0;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          ¡Contraseña guardada en tu bóveda!
        </div>
      `;
      setTimeout(removeBanner, 2200);
    } catch {
      banner.innerHTML = `
        <div style="color: #ef4444; font-size: 12px; padding: 8px 0;">
          ⚠️ Desbloquea la extensión de PassVault primero para guardar.
        </div>
      `;
      setTimeout(removeBanner, 3000);
    }
  });
}

// Iniciar escaneo al cargar y en cambios de la página
scanForPasswordFields();
const observer = new MutationObserver(() => {
  scanForPasswordFields();
});
observer.observe(document.body, { childList: true, subtree: true });
