import { prisma } from '@/lib/prisma';
import { ApiError, corpoJson, ok, rota } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';
import { excluirContaSchema } from '@/lib/validation';
import { verifyPassword } from '@/lib/auth/password';
import { limparCookieSessao } from '@/lib/auth/session';
import { identificador, limitar, REGRAS } from '@/lib/ratelimit';

export const runtime = 'nodejs';

/**
 * Exclusão de conta. Permanente e completa.
 *
 * Duas travas antes de apagar: a senha atual e a palavra EXCLUIR digitada.
 * Depois disso, o `onDelete: Cascade` do schema leva junto absolutamente
 * tudo — tarefas, dinheiro, treinos, check-ins, sessões. Não guardamos uma
 * cópia "por precaução": isso seria o contrário do que o usuário pediu.
 */
export const DELETE = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);
  await limitar(identificador(req, `excluir:${userId}`), REGRAS.login);

  const { password } = excluirContaSchema.parse(await corpoJson(req));

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) throw new ApiError(401, 'unauthenticated', 'Sua sessão expirou.');

  if (!(await verifyPassword(password, user.passwordHash))) {
    throw new ApiError(403, 'bad_password', 'A senha não confere.', {
      password: 'A senha não confere.',
    });
  }

  await prisma.user.delete({ where: { id: userId } });
  await limparCookieSessao();

  return ok({ ok: true });
});
