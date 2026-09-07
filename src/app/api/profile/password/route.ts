import { prisma } from '@/lib/prisma';
import { ApiError, corpoJson, ok, rota } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';
import { trocarSenhaSchema } from '@/lib/validation';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { criarSessao, gravarCookieSessao, revogarTodasSessoes } from '@/lib/auth/session';
import { identificador, limitar, REGRAS } from '@/lib/ratelimit';

export const runtime = 'nodejs';

export const POST = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);
  await limitar(identificador(req, `senha:${userId}`), REGRAS.login);

  const { atual, nova } = trocarSenhaSchema.parse(await corpoJson(req));

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) throw new ApiError(401, 'unauthenticated', 'Sua sessão expirou.');

  // Trocar senha exige provar que você é o dono da sessão agora — não basta
  // ter um cookie válido no navegador de alguém que ficou logado.
  if (!(await verifyPassword(atual, user.passwordHash))) {
    throw new ApiError(403, 'bad_password', 'A senha atual não confere.', {
      atual: 'A senha atual não confere.',
    });
  }

  const passwordHash = await hashPassword(nova);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  // Trocar a senha derruba todas as sessões — inclusive a de quem estava com
  // acesso indevido. Em seguida abrimos uma nova para quem fez a troca.
  await revogarTodasSessoes(userId);

  const { token, expiresAt } = await criarSessao(userId, req.headers.get('user-agent'));
  await gravarCookieSessao(token, expiresAt);

  return ok({ ok: true, mensagem: 'Senha alterada. As outras sessões foram encerradas.' });
});
