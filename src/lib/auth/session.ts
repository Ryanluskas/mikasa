import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { env, isProd } from '@/lib/env';

/**
 * Sessões do Mikasa.
 *
 * Escolha deliberada: token opaco aleatório em vez de JWT autocontido.
 *  - Logout precisa ser real. Com JWT stateless não dá para revogar.
 *  - O banco guarda apenas o SHA-256 do token. Um dump do banco não permite
 *    entrar na conta de ninguém.
 *  - O mesmo token serve para `Authorization: Bearer`, então um futuro app
 *    Android/iOS usa exatamente esta API, sem um segundo sistema de auth.
 */

export const COOKIE_SESSAO = 'mikasa_session';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export type SessaoAtiva = {
  userId: string;
  sessionId: string;
};

export async function criarSessao(
  userId: string,
  userAgent?: string | null,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(
    Date.now() + env().SESSION_DAYS * 24 * 60 * 60 * 1000,
  );

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      // Só o suficiente para o usuário reconhecer o dispositivo na lista de
      // sessões. Não guardamos IP.
      userAgent: userAgent?.slice(0, 200) ?? null,
    },
  });

  return { token, expiresAt };
}

/** Valida um token e devolve a sessão, ou null. Não lança. */
export async function resolverSessao(
  token: string | undefined | null,
): Promise<SessaoAtiva | null> {
  if (!token) return null;

  const sessao = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, userId: true, expiresAt: true, revokedAt: true, lastSeen: true },
  });

  if (!sessao) return null;
  if (sessao.revokedAt) return null;
  if (sessao.expiresAt.getTime() <= Date.now()) return null;

  // Atualiza `lastSeen` no máximo uma vez por hora — escrever a cada request
  // seria custo puro sem informação nova.
  if (Date.now() - sessao.lastSeen.getTime() > 60 * 60 * 1000) {
    await prisma.session
      .update({ where: { id: sessao.id }, data: { lastSeen: new Date() } })
      .catch(() => undefined);
  }

  return { userId: sessao.userId, sessionId: sessao.id };
}

export async function revogarSessao(token: string | undefined | null) {
  if (!token) return;
  await prisma.session
    .updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    })
    .catch(() => undefined);
}

export async function revogarTodasSessoes(userId: string) {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// ── Cookie ───────────────────────────────────────────────────────────────────

export async function gravarCookieSessao(token: string, expiresAt: Date) {
  const jar = await cookies();
  jar.set(COOKIE_SESSAO, token, {
    httpOnly: true, // JavaScript da página não enxerga o token → XSS não rouba sessão
    secure: isProd(), // em produção só trafega por HTTPS
    sameSite: 'lax', // bloqueia CSRF em requisições cross-site
    path: '/',
    expires: expiresAt,
  });
}

export async function limparCookieSessao() {
  const jar = await cookies();
  jar.set(COOKIE_SESSAO, '', {
    httpOnly: true,
    secure: isProd(),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

/** Lê o token do cookie ou do header Authorization (caminho do app mobile). */
export function tokenDaRequisicao(req: Request, cookieValue?: string | null) {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7).trim();
  return cookieValue ?? null;
}

/** Limpeza de sessões vencidas. Chamada de tempos em tempos, sem cron. */
export async function limparSessoesVencidas() {
  await prisma.session
    .deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .catch(() => undefined);
}
