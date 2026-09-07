import { prisma } from '@/lib/prisma';
import { exigirUsuarioPronto } from '@/lib/auth/guard';
import { addDays, startOfDay } from '@/lib/dates';
import { PainelDeHabitos } from '@/components/habitos/PainelDeHabitos';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Hábitos' };

export default async function Habitos() {
  const user = await exigirUsuarioPronto();

  // 5 semanas: o suficiente para ver consistência sem virar um calendário.
  const desde = addDays(startOfDay(new Date()), -34);

  const habitos = await prisma.habit.findMany({
    where: { userId: user.id, archived: false },
    orderBy: { createdAt: 'asc' },
    include: {
      entries: {
        where: { date: { gte: desde }, done: true },
        select: { date: true },
      },
    },
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-display font-semibold text-ink">Hábitos</h1>
        <p className="mt-1.5 text-[15px] text-muted">
          As pequenas coisas que sustentam o resto.
        </p>
      </header>

      <PainelDeHabitos
        streaksLigados={user.streaksEnabled}
        habitos={habitos.map((h) => ({
          id: h.id,
          name: h.name,
          targetPerWeek: h.targetPerWeek,
          dias: h.entries.map((e) => e.date.toISOString()),
        }))}
      />
    </div>
  );
}
