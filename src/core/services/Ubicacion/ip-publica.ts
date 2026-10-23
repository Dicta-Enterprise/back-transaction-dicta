// Decide si una IP sirve para ubicar a alguien. Las de la propia máquina o de una red interna no tienen país ni ciudad.
// Función pura (sin red) para poder probarla fácil.

function normalizar(ip: string): string {
  const limpia = ip.trim().toLowerCase();
  return limpia.startsWith('::ffff:') ? limpia.substring(7) : limpia;
}

function partesIpv4(ip: string): number[] | null {
  const partes = ip.split('.').map(Number);
  const valida = partes.length === 4 && partes.every((p) => Number.isInteger(p) && p >= 0 && p <= 255);
  return valida ? partes : null;
}

function esIpv4Privada([a, b]: number[]): boolean {
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

export function esIpPublica(ip: string | null | undefined): boolean {
  if (!ip) {
    return false;
  }

  const limpia = normalizar(ip);
  if (limpia === '' || limpia === '::' || limpia === '::1') {
    return false;
  }

  if (limpia.includes(':')) {
    // IPv6: se descartan las únicas locales (fc00::/7) y las de enlace local (fe80::/10)
    return !(limpia.startsWith('fc') || limpia.startsWith('fd') || /^fe[89ab]/.test(limpia));
  }

  const ipv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(limpia) ? partesIpv4(limpia) : null;
  return ipv4 !== null && !esIpv4Privada(ipv4);
}
