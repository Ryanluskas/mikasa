import { prisma } from '@/lib/prisma';
import { ApiError, corpoJson, ok, rota } from '@/lib/api';
import { loginSchema } from '@/lib/validation';
import { fakeVerifyDelay, verifyPassword } from '@/lib/auth/password';
import { criarSessao, gravarCookieSessao, limparSessoesVencidas } from '@/lib/auth/session';
import { identificador, limitar, REGRAS } from '@/lib/ratelimit';

export const runtime = 'nodejs';

export const POST = rota(async (req: Request) => {
  const corpo = loginSchema.parse(await corpoJson(req));

  // Dois baldes: um por dispositivo e um por conta. O primeiro barra alguém
  // testando muitas senhas; o segundo barra um ataque distribuído mirando
  // uma conta específica.
  await limitar(identificador(req, 'login'), REGRAS.login);
  await limitar(`conta:${corpo.email}`, REGRAS.login);

  const user = await prisma.user.findUnique({
    where: { email: corpo.email },
    select: { id: true, passwordHash: true },
  });

  // Mesma resposta e mesmo tempo para "e-mail não existe" e "senha errada".
  // Sem o delay artificial, o tempo de resposta entregaria quais e-mails
  // têm conta no Mikasa.
  if (!user) {
    await fakeVerifyDelay();
    throw new ApiError(401, 'bad_credentials', 'E-mail ou senha não conferem.');
  }

  const senhaConfere = await verifyPassword(corpo.password, user.passwordHash);
  if (!senhaConfere) {
    throw new ApiError(401, 'bad_credentials', 'E-mail ou senha não conferem.');
  }

  const { token, expiresAt } = await criarSessao(user.id, req.headers.get('user-agent'));
  await gravarCookieSessao(token, expiresAt);
  void limparSessoesVencidas();

  const perfil = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { onboardingDone: true },
  });

  return ok({ proximo: perfil?.onboardingDone ? '/inicio' : '/comecar' });
});
