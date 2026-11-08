import { argon2id } from 'hash-wasm';
import { EncryptedPayload, KeyDerivationResult } from './types.js';

// Utilitarios de codificación
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Deriva una clave maestra usando PBKDF2 nativo de WebCrypto (600,000 iteraciones SHA-256).
 * Cumple con la recomendación oficial OWASP 2023+ y el estándar Bitwarden.
 * Al ejecutarse 100% en el motor C++ del navegador, NUNCA viola CSP de extensiones ni requiere WebAssembly.
 */
export async function deriveWithPBKDF2(
  password: string,
  saltBytes: Uint8Array,
  iterations = 600000
): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes as unknown as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    256 // 256 bits = 32 bytes
  );

  return new Uint8Array(derivedBits);
}

/**
 * Deriva las claves criptográficas a partir de la Contraseña Maestra y el Salt del usuario.
 * Utiliza PBKDF2 nativo (OWASP) o Argon2id y HKDF para separar
 * la clave de cifrado local de la clave de autenticación que se envía al servidor.
 */
export async function deriveKeys(
  masterPassword: string,
  saltHex: string,
  algorithm: 'pbkdf2' | 'argon2id' = 'pbkdf2'
): Promise<KeyDerivationResult> {
  const saltBytes = hexToUint8Array(saltHex);
  let masterKeyBytes: Uint8Array;

  if (algorithm === 'argon2id') {
    try {
      const masterKeyHex = await argon2id({
        password: masterPassword,
        salt: saltBytes,
        parallelism: 4,
        iterations: 3,
        memorySize: 65536, // 64 MB
        hashLength: 32, // 256 bits
        outputType: 'hex',
      });
      masterKeyBytes = hexToUint8Array(masterKeyHex);
    } catch {
      // Fallback transparente a PBKDF2 nativo si el navegador restringe WebAssembly por CSP
      masterKeyBytes = await deriveWithPBKDF2(masterPassword, saltBytes);
    }
  } else {
    // PBKDF2 nativo de WebCrypto: 100% compatible con extensiones, cero violaciones de CSP
    masterKeyBytes = await deriveWithPBKDF2(masterPassword, saltBytes);
  }

  const masterKeyHex = bufferToHex(masterKeyBytes.buffer as ArrayBuffer);

  // 2. Importar como clave base para HKDF
  const baseKey = await crypto.subtle.importKey(
    'raw',
    masterKeyBytes as unknown as BufferSource,
    'HKDF',
    false,
    ['deriveKey', 'deriveBits']
  );

  // 3. Clave para cifrado de la bóveda local (AES-256-GCM)
  const vaultKey = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0),
      info: new TextEncoder().encode('vault-encryption'),
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  // 4. Clave de autenticación para el servidor (Zero-Knowledge)
  const authKeyBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0),
      info: new TextEncoder().encode('server-auth'),
    },
    baseKey,
    256
  );

  // Hashing final de la clave de autenticación para enviar al servidor
  const authHashBuffer = await crypto.subtle.digest('SHA-256', authKeyBits);
  const authHash = bufferToHex(authHashBuffer);

  return {
    masterKeyHex,
    vaultKey,
    authHash,
  };
}

/**
 * Genera un salt criptográfico aleatorio seguro de 128 bits (16 bytes).
 */
export function generateSalt(): string {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return bufferToHex(salt.buffer);
}

/**
 * Cifra cualquier objeto JavaScript utilizando AES-256-GCM.
 * Garantiza confidencialidad e integridad (AEAD).
 */
export async function encryptData<T>(
  data: T,
  vaultKey: CryptoKey
): Promise<EncryptedPayload> {
  // Vector de inicialización único de 12 bytes por operación
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  const encodedPlaintext = new TextEncoder().encode(JSON.stringify(data));

  // En WebCrypto AES-GCM, el tag de autenticación (16 bytes) se concatena al final del ciphertext
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      tagLength: 128,
    },
    vaultKey,
    encodedPlaintext
  );

  const encryptedBytes = new Uint8Array(encryptedBuffer);
  const tagLengthInBytes = 16;
  const ciphertextBytes = encryptedBytes.slice(0, encryptedBytes.length - tagLengthInBytes);
  const tagBytes = encryptedBytes.slice(encryptedBytes.length - tagLengthInBytes);

  return {
    iv: uint8ArrayToBase64(iv),
    ciphertext: uint8ArrayToBase64(ciphertextBytes),
    tag: uint8ArrayToBase64(tagBytes),
  };
}

/**
 * Descifra un payload cifrado con AES-256-GCM.
 * Si el contenido fue manipulado, arrojará un error de integridad.
 */
export async function decryptData<T>(
  payload: EncryptedPayload,
  vaultKey: CryptoKey
): Promise<T> {
  const iv = base64ToUint8Array(payload.iv);
  const ciphertext = base64ToUint8Array(payload.ciphertext);
  const tag = base64ToUint8Array(payload.tag);

  // Reensamblar ciphertext + tag para WebCrypto
  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext, 0);
  combined.set(tag, ciphertext.length);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
      tagLength: 128,
    },
    vaultKey,
    combined as unknown as BufferSource
  );

  const decodedJson = new TextDecoder().decode(decryptedBuffer);
  return JSON.parse(decodedJson) as T;
}
