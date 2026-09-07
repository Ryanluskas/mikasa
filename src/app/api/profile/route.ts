import { prisma } from '@/lib/prisma';
import { corpoJson, ok, rota } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';
import { perfilSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export const GET = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);
  const perfil = await prisma.profile.findUnique({ where: { userId } });
  return ok(perfil);
});

export const PATCH = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);
  const dados = perfilSchema.parse(await corpoJson(req));

  // `where: { userId }` e não `where: { id }`: o cliente nunca escolhe qual
  // perfil está editando.
  const perfil = await prisma.profile.update({
    where: { userId },
    data: dados,
  });

  return ok(perfil);
});
