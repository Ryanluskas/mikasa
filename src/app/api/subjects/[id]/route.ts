import { prisma } from '@/lib/prisma';
import { corpoJson, ok, rota, semConteudo } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';
import { materiaSchema } from '@/lib/validation';
import { garantirAfetado } from '@/lib/owned';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = rota(async (req: Request, { params }: Ctx) => {
  const userId = await exigirUsuarioApi(req);
  const { id } = await params;
  const { name } = materiaSchema.parse(await corpoJson(req));

  const { count } = await prisma.subject.updateMany({ where: { id, userId }, data: { name } });
  garantirAfetado(count, 'Essa matéria');

  return ok(await prisma.subject.findFirst({ where: { id, userId } }));
});

export const DELETE = rota(async (req: Request, { params }: Ctx) => {
  const userId = await exigirUsuarioApi(req);
  const { id } = await params;

  // Provas somem junto (cascade). Tarefas e sessões de estudo ficam, apenas
  // perdem o vínculo (SetNull): apagar uma matéria não deve apagar as horas
  // que a pessoa realmente estudou.
  const { count } = await prisma.subject.deleteMany({ where: { id, userId } });
  garantirAfetado(count, 'Essa matéria');

  return semConteudo();
});
