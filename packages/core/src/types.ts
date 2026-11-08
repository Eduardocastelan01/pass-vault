/**
 * Tipos y modelos de datos para la bóveda segura Zero-Knowledge
 */

export type ItemType = 'login' | 'card' | 'note' | 'identity';

export interface EncryptedPayload {
  /** Vector de Inicialización en Base64 (12 bytes para AES-GCM) */
  iv: string;
  /** Datos cifrados en Base64 */
  ciphertext: string;
  /** Tag de autenticación en Base64 (16 bytes para AES-GCM) */
  tag: string;
}

export interface VaultItemMeta {
  id: string;
  type: ItemType;
  name: string;
  favorite: boolean;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface EncryptedVaultItem extends VaultItemMeta {
  encryptedPayload: EncryptedPayload;
}

export interface DecryptedVaultItem<T = LoginData | CardData | NoteData | IdentityData> extends VaultItemMeta {
  data: T;
}

export interface LoginData {
  username: string;
  password: string;
  uris: string[];
  totpSecret?: string;
  notes?: string;
}

export interface CardData {
  cardholderName: string;
  brand: 'visa' | 'mastercard' | 'amex' | 'discover' | 'other';
  number: string;
  expMonth: string;
  expYear: string;
  cvv: string;
  pin?: string;
  notes?: string;
}

export interface NoteData {
  text: string;
}

export interface IdentityData {
  title?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  passportOrId?: string;
  notes?: string;
}

export interface Folder {
  id: string;
  name: string;
}

export interface KeyDerivationResult {
  /** Clave maestra cruda de 256 bits derivada de la contraseña maestra */
  masterKeyHex: string;
  /** Clave de cifrado de la bóveda para operaciones AES-256-GCM locales */
  vaultKey: CryptoKey;
  /** Hash de autenticación que se envía al servidor para login (Zero-Knowledge) */
  authHash: string;
}

export interface PasswordGeneratorOptions {
  length: number;
  uppercase?: boolean;
  lowercase?: boolean;
  numbers?: boolean;
  symbols?: boolean;
  excludeAmbiguous?: boolean;
}

