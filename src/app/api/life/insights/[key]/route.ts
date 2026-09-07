import { prisma } from '@/lib/prisma';
import { ok, rota } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';
import { garantirAfetado } from '@/lib/owned';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ key: string }> };

/** Dispensa uma observação. Ela não volta a aparecer. */
export const DELETE = rota(async (req: Request, { params }: Ctx) => {
  const userId = await exigirUsuarioApi(req);
  const { key } = await params;

  const { count } = await prisma.insight.updateMany({
    where: { userId, key, dismissedAt: null },
    data: { dismissedAt: new Date() },
  });

  garantirAfetado(count, 'Essa observação');
  return ok({ ok: true });
});

/** Traz de volta tudo que foi dispensado — fica em Configurações. */
export const POST = rota(async (req: Request, { params }: Ctx) => {
  const userId = await exigirUsuarioApi(req);
  const { key } = await params;

  if (key === 'todas') {
    const { count } = await prisma.insight.updateMany({
      where: { userId, dismissedAt: { not: null } },
      data: { dismissedAt: null },
    });
    return ok({ restauradas: count });
  }

  const { count } = await prisma.insight.updateMany({
    where: { userId, key },
    data: { dismissedAt: null },
  });

  garantirAfetado(count, 'Essa observação');
  return ok({ ok: true });
});
