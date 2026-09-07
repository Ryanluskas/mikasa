import { prisma } from '@/lib/prisma';
import { corpoJson, ok, rota, semConteudo } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';
import { orcamentoSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export const GET = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);
  const orcamentos = await prisma.budget.findMany({
    where: { userId },
    orderBy: { category: 'asc' },
  });
  return ok(orcamentos);
});

/** Define (ou zera) o limite mensal de uma categoria. */
export const PUT = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);
  const { category, limitCents } = orcamentoSchema.parse(await corpoJson(req));

  // Limite zero significa "não quero mais orçamento aqui" — apagamos a linha
  // em vez de deixar um orçamento de R$ 0,00 que dispararia alerta sempre.
  if (limitCents === 0) {
    await prisma.budget.deleteMany({ where: { userId, category } });
    return semConteudo();
  }

  const orcamento = await prisma.budget.upsert({
    where: { userId_category: { userId, category } },
    create: { userId, category, limitCents },
    update: { limitCents },
  });

  return ok(orcamento);
});
