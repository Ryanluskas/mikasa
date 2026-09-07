import { prisma } from '@/lib/prisma';
import { corpoJson, ok, rota } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';
import { relacaoCriarSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export const GET = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);

  const pessoas = await prisma.relationship.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });

  return ok(pessoas);
});

export const POST = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);
  const dados = relacaoCriarSchema.parse(await corpoJson(req));

  const pessoa = await prisma.relationship.create({
    data: {
      userId,
      name: dados.name,
      type: dados.type,
      birthday: dados.birthday ?? null,
      anniversary: dados.anniversary ?? null,
      notes: dados.notes ?? null,
      contactEveryDays: dados.contactEveryDays ?? null,
    },
  });

  return ok(pessoa, 201);
});
