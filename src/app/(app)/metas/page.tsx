import { prisma } from '@/lib/prisma';
import { exigirUsuarioPronto } from '@/lib/auth/guard';
import { ListaDeMetas } from '@/components/metas/ListaDeMetas';
import { Vazio } from '@/components/ui';
import { VOZ } from '@/lib/voice';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Metas' };

export default async function Metas() {
  const user = await exigirUsuarioPronto();

  const metas = await prisma.goal.findMany({
    where: { userId: user.id },
    orderBy: [{ status: 'asc' }, { deadline: 'asc' }, { createdAt: 'desc' }],
    include: { steps: { orderBy: { order: 'asc' } } },
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-display font-semibold text-ink">Metas</h1>
        <p className="mt-1.5 text-[15px] text-muted">
          O que você quer alcançar, um passo de cada vez.
        </p>
      </header>

      {metas.length === 0 ? (
        <Vazio titulo={VOZ.vazio.metas.titulo} texto={VOZ.vazio.metas.texto} />
      ) : (
        <ListaDeMetas
          metas={metas.map((m) => ({
            id: m.id,
            title: m.title,
            description: m.description,
            area: m.area,
            targetCents: m.targetCents,
            currentCents: m.currentCents,
            targetValue: m.targetValue,
            currentValue: m.currentValue,
            unit: m.unit,
            deadline: m.deadline ? m.deadline.toISOString() : null,
            status: m.status,
            steps: m.steps.map((s) => ({ id: s.id, title: s.title, done: s.done })),
          }))}
        />
      )}
    </div>
  );
}
