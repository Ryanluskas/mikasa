import { prisma } from '@/lib/prisma';
import { corpoJson, ok, rota } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';
import { modulosSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export const GET = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);
  const modulos = await prisma.modulePref.findMany({
    where: { userId },
    orderBy: { order: 'asc' },
  });
  return ok(modulos);
});

/** Liga, desliga e reordena as áreas do usuário. */
export const PUT = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);
  const { modules } = modulosSchema.parse(await corpoJson(req));

  await prisma.$transaction(
    modules.map((m) =>
      prisma.modulePref.upsert({
        where: { userId_key: { userId, key: m.key } },
        create: { userId, key: m.key, enabled: m.enabled, order: m.order },
        update: { enabled: m.enabled, order: m.order },
      }),
    ),
  );

  const atualizados = await prisma.modulePref.findMany({
    where: { userId },
    orderBy: { order: 'asc' },
  });

  return ok(atualizados);
});
