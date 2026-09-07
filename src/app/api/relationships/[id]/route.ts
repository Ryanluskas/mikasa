import { prisma } from '@/lib/prisma';
import { corpoJson, ok, rota, semConteudo } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';
import { relacaoAtualizarSchema } from '@/lib/validation';
import { garantirAfetado } from '@/lib/owned';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = rota(async (req: Request, { params }: Ctx) => {
  const userId = await exigirUsuarioApi(req);
  const { id } = await params;
  const dados = relacaoAtualizarSchema.parse(await corpoJson(req));

  const { count } = await prisma.relationship.updateMany({
    where: { id, userId },
    data: {
      ...(dados.name !== undefined ? { name: dados.name } : {}),
      ...(dados.type !== undefined ? { type: dados.type } : {}),
      ...(dados.birthday !== undefined ? { birthday: dados.birthday ?? null } : {}),
      ...(dados.anniversary !== undefined ? { anniversary: dados.anniversary ?? null } : {}),
      ...(dados.notes !== undefined ? { notes: dados.notes ?? null } : {}),
      ...(dados.contactEveryDays !== undefined
        ? { contactEveryDays: dados.contactEveryDays ?? null }
        : {}),
      ...(dados.lastContactAt !== undefined
        ? { lastContactAt: dados.lastContactAt ?? null }
        : {}),
    },
  });

  garantirAfetado(count, 'Essa pessoa');
  return ok(await prisma.relationship.findFirst({ where: { id, userId } }));
});

export const DELETE = rota(async (req: Request, { params }: Ctx) => {
  const userId = await exigirUsuarioApi(req);
  const { id } = await params;
  const { count } = await prisma.relationship.deleteMany({ where: { id, userId } });
  garantirAfetado(count, 'Essa pessoa');
  return semConteudo();
});
