import { PasswordGeneratorOptions } from './types.js';

const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
const AMBIGUOUS = '0O1lI|';

// Lista de palabras en español/inglés para frases de paso memorables (estilo Diceware)
const MEMORABLE_WORDS = [
  'aguila', 'arbol', 'arena', 'astro', 'azul', 'barco', 'bosque', 'brisa', 'cafe',
  'camino', 'canto', 'cielo', 'claro', 'colina', 'coral', 'cuarzo', 'delta', 'delfin',
  'dorado', 'eco', 'esfera', 'estrella', 'faro', 'fuego', 'galaxia', 'glaciar', 'hierro',
  'hoja', 'horizonte', 'isla', 'jardin', 'lago', 'leon', 'lince', 'luna', 'marfil',
  'marea', 'meta', 'monte', 'nebula', 'nieve', 'nube', 'oasis', 'oceano', 'olivo',
  'onda', 'orquidea', 'palma', 'panal', 'piedra', 'planeta', 'prisma', 'puerto', 'radar',
  'rayo', 'rio', 'roble', 'roca', 'rosal', 'rubi', 'selva', 'sendero', 'sierra',
  'sol', 'sombra', 'sur', 'terra', 'tiempo', 'toro', 'trueno', 'valle', 'viento', 'zorro'
];

/**
 * Obtiene un entero criptográficamente aleatorio en el rango [0, max - 1].
 */
function getSecureRandomInt(max: number): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

/**
 * Genera una contraseña aleatoria con alta entropía.
 */
export function generatePassword(options: Partial<PasswordGeneratorOptions> = {}): string {
  const {
    length = 20,
    uppercase = true,
    lowercase = true,
    numbers = true,
    symbols = true,
    excludeAmbiguous = true,
  } = options;

  let charset = '';
  const mandatoryChars: string[] = [];

  const filterAmbiguous = (str: string) => {
    if (!excludeAmbiguous) return str;
    return str.split('').filter((c) => !AMBIGUOUS.includes(c)).join('');
  };

  const filteredLower = filterAmbiguous(LOWERCASE);
  const filteredUpper = filterAmbiguous(UPPERCASE);
  const filteredNumbers = filterAmbiguous(NUMBERS);
  const filteredSymbols = filterAmbiguous(SYMBOLS);

  if (lowercase && filteredLower) {
    charset += filteredLower;
    mandatoryChars.push(filteredLower[getSecureRandomInt(filteredLower.length)]);
  }
  if (uppercase && filteredUpper) {
    charset += filteredUpper;
    mandatoryChars.push(filteredUpper[getSecureRandomInt(filteredUpper.length)]);
  }
  if (numbers && filteredNumbers) {
    charset += filteredNumbers;
    mandatoryChars.push(filteredNumbers[getSecureRandomInt(filteredNumbers.length)]);
  }
  if (symbols && filteredSymbols) {
    charset += filteredSymbols;
    mandatoryChars.push(filteredSymbols[getSecureRandomInt(filteredSymbols.length)]);
  }

  if (charset.length === 0) {
    charset = filteredLower;
  }

  const remainingLength = Math.max(0, length - mandatoryChars.length);
  const randomChars: string[] = [];

  for (let i = 0; i < remainingLength; i++) {
    randomChars.push(charset[getSecureRandomInt(charset.length)]);
  }

  // Mezclar los caracteres obligatorios con los aleatorios usando Fisher-Yates seguro
  const allChars = [...mandatoryChars, ...randomChars];
  for (let i = allChars.length - 1; i > 0; i--) {
    const j = getSecureRandomInt(i + 1);
    [allChars[i], allChars[j]] = [allChars[j], allChars[i]];
  }

  return allChars.join('');
}

/**
 * Genera una frase de paso memorable (Passphrase) estilo Diceware.
 */
export function generatePassphrase(wordCount = 4, separator = '-'): string {
  const words: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    words.push(MEMORABLE_WORDS[getSecureRandomInt(MEMORABLE_WORDS.length)]);
  }
  return words.join(separator);
}

/**
 * Evalúa la fortaleza y entropía aproximada de una contraseña en bits.
 */
export function evaluatePasswordStrength(password: string): {
  entropy: number;
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Muy Débil' | 'Débil' | 'Media' | 'Fuerte' | 'Excelente';
} {
  if (!password) {
    return { entropy: 0, score: 0, label: 'Muy Débil' };
  }

  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/[0-9]/.test(password)) poolSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) poolSize += 32;

  const entropy = Math.round(password.length * (Math.log2(poolSize || 1)));

  if (entropy < 30) return { entropy, score: 0, label: 'Muy Débil' };
  if (entropy < 50) return { entropy, score: 1, label: 'Débil' };
  if (entropy < 70) return { entropy, score: 2, label: 'Media' };
  if (entropy < 90) return { entropy, score: 3, label: 'Fuerte' };
  return { entropy, score: 4, label: 'Excelente' };
}

