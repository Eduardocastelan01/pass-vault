/**
 * Utilidades para coincidencia de dominios y URLs para el motor de autollenado
 */

/**
 * Extrae el dominio raíz (ej: "github.com" desde "https://sub.login.github.com/path?query=1")
 */
export function extractBaseDomain(urlOrHostname: string): string {
  try {
    let hostname = urlOrHostname.trim();

    // Manejar esquemas comunes de Android como "android://com.app.example"
    if (hostname.startsWith('android://')) {
      const pkg = hostname.replace('android://', '');
      return pkg;
    }

    if (!hostname.includes('://')) {
      hostname = 'https://' + hostname;
    }

    const parsed = new URL(hostname);
    const parts = parsed.hostname.toLowerCase().split('.');

    if (parts.length <= 2) {
      return parsed.hostname.toLowerCase();
    }

    // Manejar TLDs de dos partes comunes (ej. .co.uk, .com.mx, .org.es)
    const secondLevelTlds = ['co', 'com', 'org', 'net', 'edu', 'gob', 'gov'];
    const lastPart = parts[parts.length - 1];
    const secondLastPart = parts[parts.length - 2];

    if (parts.length >= 3 && secondLevelTlds.includes(secondLastPart) && lastPart.length === 2) {
      return parts.slice(-3).join('.');
    }

    // Dominio estándar de 2 partes
    return parts.slice(-2).join('.');
  } catch {
    return urlOrHostname.toLowerCase();
  }
}

/**
 * Determina si la URL de una página web coincide con alguna de las URIs guardadas en un login.
 * Previene ataques de phishing asegurando que dominios como 'phishing-github.com' no coincidan con 'github.com'.
 */
export function matchesUri(targetUrl: string, savedUris: string[]): boolean {
  if (!targetUrl || !savedUris || savedUris.length === 0) return false;

  const targetDomain = extractBaseDomain(targetUrl);

  return savedUris.some((savedUri) => {
    if (!savedUri) return false;
    const savedDomain = extractBaseDomain(savedUri);
    return targetDomain === savedDomain || targetDomain.endsWith('.' + savedDomain);
  });
}
