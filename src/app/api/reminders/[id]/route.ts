import { prisma } from '@/lib/prisma';
import { corpoJson, ok, rota, semConteudo } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';
import { lembreteAtualizarSchema } from '@/lib/validation';
import { garantirAfetado } from '@/lib/owned';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = rota(async (req: Request, { params }: Ctx) => {
  const userId = await exigirUsuarioApi(req);
  const { id } = await params;
  const dados = lembreteAtualizarSchema.parse(await corpoJson(req));

  const { count } = await prisma.reminder.updateMany({
    where: { id, userId },
    data: {
      ...(dados.title !== undefined ? { title: dados.title } : {}),
      ...(dados.message !== undefined ? { message: dados.message ?? null } : {}),
      ...(dados.category !== undefined ? { category: dados.category } : {}),
      ...(dados.timeMin !== undefined ? { timeMin: dados.timeMin } : {}),
      ...(dados.daysOfWeek !== undefined
        ? {
            daysOfWeek: JSON.stringify(
              [...new Set(dados.daysOfWeek)].sort((a, b) => a - b),
            ),
          }
        : {}),
      ...(dados.enabled !== undefined ? { enabled: dados.enabled } : {}),
    },
  });

  garantirAfetado(count, 'Esse lembrete');

  const lembrete = await prisma.reminder.findFirst({ where: { id, userId } });
  return ok(
    lembrete
      ? { ...lembrete, daysOfWeek: JSON.parse(lembrete.daysOfWeek) as number[] }
      : null,
  );
});

export const DELETE = rota(async (req: Request, { params }: Ctx) => {
  const userId = await exigirUsuarioApi(req);
  const { id } = await params;
  const { count } = await prisma.reminder.deleteMany({ where: { id, userId } });
  garantirAfetado(count, 'Esse lembrete');
  return semConteudo();
});
