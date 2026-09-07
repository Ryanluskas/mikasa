import { prisma } from '@/lib/prisma';
import { ok, rota } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';

export const runtime = 'nodejs';

/** Quem está logado. Devolve só o que a interface precisa — nada além. */
export const GET = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      createdAt: true,
      profile: true,
      modules: { orderBy: { order: 'asc' } },
    },
  });

  if (!user) return ok({ user: null }, 401);

  return ok({
    id: user.id,
    email: user.email,
    membroDesde: user.createdAt,
    perfil: user.profile,
    modulos: user.modules,
  });
});
