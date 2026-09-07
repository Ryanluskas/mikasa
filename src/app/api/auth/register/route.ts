import { prisma } from '@/lib/prisma';
import { corpoJson, invalido, ok, rota } from '@/lib/api';
import { registroSchema } from '@/lib/validation';
import { hashPassword } from '@/lib/auth/password';
import { criarSessao, gravarCookieSessao } from '@/lib/auth/session';
import { identificador, limitar, limparBaldesAntigos, REGRAS } from '@/lib/ratelimit';
import { MODULOS } from '@/lib/modules';

export const runtime = 'nodejs';

export const POST = rota(async (req: Request) => {
  await limitar(
    identificador(req, 'registro'),
    REGRAS.registro,
    'Muitas contas criadas a partir deste dispositivo. Tente mais tarde.',
  );

  const { name, email, password } = registroSchema.parse(await corpoJson(req));

  const jaExiste = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  // Aqui a enumeração de usuários é inevitável — não dá para criar duas contas
  // com o mesmo e-mail e fingir que deu certo. O que fazemos é limitar a
  // frequência (acima) para que isso não vire uma ferramenta de varredura.
  if (jaExiste) {
    throw invalido('Esse e-mail já tem uma conta.', {
      email: 'Esse e-mail já tem uma conta.',
    });
  }

  const passwordHash = await hashPassword(password);

  // Tudo que define uma conta nasce junto, numa transação: usuário, perfil e
  // as áreas iniciais. Nunca deixamos um usuário sem perfil no banco.
  const user = await prisma.$transaction(async (tx) => {
    const criado = await tx.user.create({
      data: {
        email,
        passwordHash,
        profile: { create: { displayName: name } },
      },
      select: { id: true },
    });

    await tx.modulePref.createMany({
      data: MODULOS.map((m, i) => ({
        userId: criado.id,
        key: m.key,
        // Nada vem ligado por padrão: o onboarding é quem decide.
        enabled: false,
        order: i,
      })),
    });

    return criado;
  });

  const { token, expiresAt } = await criarSessao(user.id, req.headers.get('user-agent'));
  await gravarCookieSessao(token, expiresAt);
  void limparBaldesAntigos();

  return ok({ id: user.id, proximo: '/comecar' }, 201);
});
