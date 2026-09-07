import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (
  senha: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * Hash de senha com scrypt (KDF da biblioteca padrão do Node).
 *
 * Não inventamos criptografia aqui: scrypt é um algoritmo de derivação
 * projetado para senhas, com custo de memória — o que torna ataque por GPU
 * caro. Os parâmetros ficam gravados no próprio hash para que seja possível
 * aumentá-los no futuro sem invalidar as senhas existentes.
 *
 * Formato: scrypt$N$r$p$<salt base64url>$<hash base64url>
 */
const N = 2 ** 15; // 32768
const R = 8;
const P = 1;
const KEYLEN = 64;
const MAXMEM = 128 * N * R * 2;

export async function hashPassword(senha: string): Promise<string> {
  const salt = randomBytes(16);
  const derivado = await scryptAsync(senha.normalize('NFKC'), salt, KEYLEN, {
    N,
    r: R,
    p: P,
    maxmem: MAXMEM,
  });
  return [
    'scrypt',
    N,
    R,
    P,
    salt.toString('base64url'),
    derivado.toString('base64url'),
  ].join('$');
}

export async function verifyPassword(
  senha: string,
  guardado: string,
): Promise<boolean> {
  try {
    const partes = guardado.split('$');
    if (partes.length !== 6 || partes[0] !== 'scrypt') return false;

    const n = Number(partes[1]);
    const r = Number(partes[2]);
    const p = Number(partes[3]);
    const salt = Buffer.from(partes[4], 'base64url');
    const esperado = Buffer.from(partes[5], 'base64url');

    if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) {
      return false;
    }
    // Teto defensivo: um hash adulterado não pode nos fazer alocar 8 GB.
    if (n > 2 ** 17 || r > 32 || p > 16) return false;

    const derivado = await scryptAsync(senha.normalize('NFKC'), salt, esperado.length, {
      N: n,
      r,
      p,
      maxmem: 128 * n * r * 2,
    });

    // Comparação em tempo constante: nunca `===` para segredo.
    if (derivado.length !== esperado.length) return false;
    return timingSafeEqual(derivado, esperado);
  } catch {
    return false;
  }
}

/**
 * Gasta o mesmo tempo de um `verifyPassword` real.
 *
 * Usado quando o e-mail não existe: sem isso, o tempo de resposta diferente
 * revelaria quais e-mails têm conta (enumeração de usuários).
 */
export async function fakeVerifyDelay(): Promise<void> {
  await scryptAsync('senha-descartavel', randomBytes(16), KEYLEN, {
    N,
    r: R,
    p: P,
    maxmem: MAXMEM,
  });
}
