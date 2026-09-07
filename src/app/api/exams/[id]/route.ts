import { prisma } from '@/lib/prisma';
import { corpoJson, ok, rota, semConteudo } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';
import { provaAtualizarSchema } from '@/lib/validation';
import { garantirAfetado } from '@/lib/owned';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = rota(async (req: Request, { params }: Ctx) => {
  const userId = await exigirUsuarioApi(req);
  const { id } = await params;
  const dados = provaAtualizarSchema.parse(await corpoJson(req));

  const { count } = await prisma.exam.updateMany({
    where: { id, userId },
    data: {
      ...(dados.title !== undefined ? { title: dados.title } : {}),
      ...(dados.date !== undefined ? { date: dados.date } : {}),
      ...(dados.status !== undefined ? { status: dados.status } : {}),
    },
  });

  garantirAfetado(count, 'Essa prova');
  return ok(await prisma.exam.findFirst({ where: { id, userId } }));
});

export const DELETE = rota(async (req: Request, { params }: Ctx) => {
  const userId = await exigirUsuarioApi(req);
  const { id } = await params;
  const { count } = await prisma.exam.deleteMany({ where: { id, userId } });
  garantirAfetado(count, 'Essa prova');
  return semConteudo();
});
