// Content script para autollenado e intercepción inteligente de credenciales

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
 * Dispara eventos input y change de forma compatible con React, Vue y Angular
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
      /user|email|login|account|usuario|correo/i.test(i.name || i.id || i.type || i.placeholder)
    );
    if (usernameInput) return usernameInput;
    if (inputs.length > 0) return inputs[inputs.length - 1];
  }

  // Si no hay form tag envolvente, buscar el input anterior más cercano
  const allInputs = Array.from(document.querySelectorAll('input')) as HTMLInputElement[];
  const idx = allInputs.indexOf(passwordInput);
  for (let i = idx - 1; i >= 0; i--) {
    const inp = allInputs[i];
    if (inp.type !== 'hidden' && inp.type !== 'password' && inp.type !== 'submit') {
      return inp;
    }
  }

  return null;
}

function attachAutofillToInput(passwordInput: HTMLInputElement, logins: MatchingLogin[]) {
  if (passwordInput.dataset.passvaultAttached) return;
  passwordInput.dataset.passvaultAttached = 'true';

  const rect = passwordInput.getBoundingClientRect();
  const badge = document.createElement('div');
  badge.className = 'passvault-icon-badge';
  badge.title = 'PassVault - Autollenar credenciales';
  badge.innerHTML = `
    <svg viewBox="0 0 24 24">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    </svg>
  `;

  // Posicionar el badge flotante dentro del input
  function positionBadge() {
    const currentRect = passwordInput.getBoundingClientRect();
    badge.style.top = `${window.scrollY + currentRect.top + (currentRect.height - 22) / 2}px`;
    badge.style.left = `${window.scrollX + currentRect.right - 28}px`;
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

// Inicializar escaneo de campos
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
  } catch {
    // Si la extensión está cerrada o bloqueada, silenciar
  }
}

// Escuchar envío de formularios para sugerir guardar contraseñas
document.addEventListener('submit', (e) => {
  const form = e.target as HTMLFormElement;
  if (!form) return;

  const passwordInput = form.querySelector('input[type="password"]') as HTMLInputElement;
  if (!passwordInput || !passwordInput.value) return;

  const usernameInput = findUsernameField(passwordInput);
  const username = usernameInput ? usernameInput.value : '';
  const password = passwordInput.value;

  if (username && password) {
    showSaveBanner(username, password);
  }
});

function showSaveBanner(username: string, password: string) {
  if (document.querySelector('.passvault-save-banner')) return;

  const domain = window.location.hostname;
  const banner = document.createElement('div');
  banner.className = 'passvault-save-banner';
  banner.innerHTML = `
    <div><strong>¿Guardar credenciales en PassVault?</strong></div>
    <div style="font-size: 12px; color: #94a3b8;">
      Sitio: <strong>${domain}</strong><br>
      Usuario: <strong>${username}</strong>
    </div>
    <div class="passvault-banner-actions">
      <button class="passvault-btn-secondary" id="pv-cancel">Ahora no</button>
      <button class="passvault-btn-primary" id="pv-save">Guardar</button>
    </div>
  `;

  document.body.appendChild(banner);

  banner.querySelector('#pv-cancel')?.addEventListener('click', () => {
    banner.remove();
  });

  banner.querySelector('#pv-save')?.addEventListener('click', async () => {
    try {
      await chrome.runtime.sendMessage({
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
      banner.innerHTML = `<div style="color: #4ade80;">✓ Guardado con éxito en tu bóveda</div>`;
      setTimeout(() => banner.remove(), 2000);
    } catch {
      banner.innerHTML = `<div style="color: #ef4444;">Error: Desbloquea la bóveda en la extensión primero</div>`;
      setTimeout(() => banner.remove(), 3000);
    }
  });
}

// Ejecutar escaneo al cargar y en mutaciones de DOM (para páginas SPA como React/Vue)
scanForPasswordFields();
const observer = new MutationObserver(() => {
  scanForPasswordFields();
});
observer.observe(document.body, { childList: true, subtree: true });

