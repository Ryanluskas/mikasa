import { cookies } from 'next/headers';
import { ok, rota } from '@/lib/api';
import { COOKIE_SESSAO, limparCookieSessao, revogarSessao } from '@/lib/auth/session';

export const runtime = 'nodejs';

/**
 * Logout de verdade: a sessão é revogada no banco, não apenas apagada do
 * navegador. Um token copiado antes do logout para de funcionar.
 */
export const POST = rota(async () => {
  const jar = await cookies();
  await revogarSessao(jar.get(COOKIE_SESSAO)?.value);
  await limparCookieSessao();
  return ok({ ok: true });
});
