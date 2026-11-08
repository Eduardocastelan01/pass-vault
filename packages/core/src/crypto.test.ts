import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveKeys,
  generateSalt,
  encryptData,
  decryptData,
  generatePassword,
  generatePassphrase,
  evaluatePasswordStrength,
  extractBaseDomain,
  matchesUri,
  LoginData,
  CardData,
} from './index.js';

test('Zero-Knowledge Key Derivation con Argon2id y HKDF', async () => {
  const salt = generateSalt();
  assert.equal(salt.length, 32, 'El salt en hex debe ser de 32 caracteres (16 bytes)');

  const keys1 = await deriveKeys('MiSuperPassword123!', salt);
  assert.ok(keys1.masterKeyHex, 'Debe generar masterKeyHex');
  assert.ok(keys1.vaultKey, 'Debe generar vaultKey CryptoKey');
  assert.ok(keys1.authHash, 'Debe generar authHash para el servidor');
  assert.equal(keys1.authHash.length, 64, 'authHash SHA-256 debe tener 64 caracteres hex');

  // Comprobar determinismo: con la misma contraseña y salt, los resultados deben ser idénticos
  const keys2 = await deriveKeys('MiSuperPassword123!', salt);
  assert.equal(keys1.masterKeyHex, keys2.masterKeyHex);
  assert.equal(keys1.authHash, keys2.authHash);

  // Con diferente salt, deben ser totalmente distintos
  const differentSalt = generateSalt();
  const keys3 = await deriveKeys('MiSuperPassword123!', differentSalt);
  assert.notEqual(keys1.masterKeyHex, keys3.masterKeyHex);
  assert.notEqual(keys1.authHash, keys3.authHash);
});

test('Cifrado y Descifrado AEAD (AES-256-GCM) de Credenciales y Tarjetas', async () => {
  const salt = generateSalt();
  const { vaultKey } = await deriveKeys('MasterKey987!', salt);

  const loginSecret: LoginData = {
    username: 'usuario_demo@gmail.com',
    password: 'P@ssw0rdMuySegura$2026',
    uris: ['https://github.com/login', 'https://github.com'],
    notes: 'Nota privada de cuenta de desarrollo',
  };

  // Cifrar datos
  const encrypted = await encryptData(loginSecret, vaultKey);
  assert.ok(encrypted.iv, 'Debe incluir vector de inicialización');
  assert.ok(encrypted.ciphertext, 'Debe incluir texto cifrado');
  assert.ok(encrypted.tag, 'Debe incluir tag de autenticación');

  // Descifrar datos
  const decrypted = await decryptData<LoginData>(encrypted, vaultKey);
  assert.deepEqual(decrypted, loginSecret);

  // Probar con tarjeta bancaria
  const cardSecret: CardData = {
    cardholderName: 'JUAN LOPEZ',
    brand: 'visa',
    number: '4111222233334444',
    expMonth: '12',
    expYear: '2028',
    cvv: '789',
  };

  const encryptedCard = await encryptData(cardSecret, vaultKey);
  const decryptedCard = await decryptData<CardData>(encryptedCard, vaultKey);
  assert.deepEqual(decryptedCard, cardSecret);
});

test('Seguridad contra Manipulación (Tampering) en AES-256-GCM', async () => {
  const salt = generateSalt();
  const { vaultKey } = await deriveKeys('MasterKey987!', salt);

  const payload = await encryptData({ secreto: 'informacion_critica' }, vaultKey);

  // Manipular un caracter del texto cifrado
  const tamperedCiphertext =
    payload.ciphertext.slice(0, -2) + (payload.ciphertext.slice(-1) === 'A' ? 'B' : 'A') + '=';
  const tamperedPayload = { ...payload, ciphertext: tamperedCiphertext };

  await assert.rejects(
    async () => {
      await decryptData(tamperedPayload, vaultKey);
    },
    /operation failed|OperationError/i,
    'Debe rechazar datos manipulados debido al tag de integridad'
  );
});

test('Generador de Contraseñas y Entropía', () => {
  const pass = generatePassword({ length: 24, symbols: true, numbers: true });
  assert.equal(pass.length, 24);

  const strength = evaluatePasswordStrength(pass);
  assert.ok(strength.entropy >= 100, 'Una clave de 24 chars debe tener alta entropía');
  assert.equal(strength.label, 'Excelente');

  const passphrase = generatePassphrase(4, '-');
  const words = passphrase.split('-');
  assert.equal(words.length, 4);
});

test('Utilidades de Dominio y Coincidencia para Autollenado', () => {
  assert.equal(extractBaseDomain('https://subdomain.login.github.com/session'), 'github.com');
  assert.equal(extractBaseDomain('https://banco.santander.com.mx/login'), 'santander.com.mx');
  assert.equal(extractBaseDomain('android://com.twitter.android'), 'com.twitter.android');

  const uris = ['https://github.com', 'https://github.com/login'];
  assert.ok(matchesUri('https://gist.github.com/new', uris));
  assert.ok(!matchesUri('https://phishing-github.com', uris));
});

