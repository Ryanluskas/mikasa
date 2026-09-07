import { prisma } from '@/lib/prisma';
import { rota } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';

export const runtime = 'nodejs';

/**
 * Exportação completa dos dados do usuário.
 *
 * Os dados são dele. Ele leva embora quando quiser, num JSON legível, sem
 * pedir para ninguém. O que NÃO vai junto: hash de senha e tokens de sessão —
 * são credenciais, não conteúdo, e um arquivo baixado é fácil de vazar.
 */
export const GET = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);

  const [
    user,
    tasks,
    events,
    habits,
    habitEntries,
    goals,
    transactions,
    budgets,
    workouts,
    subjects,
    exams,
    studySessions,
    projects,
    reminders,
    relationships,
    checkins,
    insights,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        createdAt: true,
        profile: true,
        modules: true,
      },
    }),
    prisma.task.findMany({ where: { userId } }),
    prisma.event.findMany({ where: { userId } }),
    prisma.habit.findMany({ where: { userId } }),
    prisma.habitEntry.findMany({ where: { userId } }),
    prisma.goal.findMany({ where: { userId }, include: { steps: true } }),
    prisma.transaction.findMany({ where: { userId } }),
    prisma.budget.findMany({ where: { userId } }),
    prisma.workout.findMany({ where: { userId }, include: { exercises: true } }),
    prisma.subject.findMany({ where: { userId } }),
    prisma.exam.findMany({ where: { userId } }),
    prisma.studySession.findMany({ where: { userId } }),
    prisma.project.findMany({ where: { userId } }),
    prisma.reminder.findMany({ where: { userId } }),
    prisma.relationship.findMany({ where: { userId } }),
    prisma.checkin.findMany({ where: { userId } }),
    prisma.insight.findMany({ where: { userId } }),
  ]);

  const conteudo = {
    exportadoEm: new Date().toISOString(),
    aplicativo: 'Mikasa',
    observacao:
      'Valores monetários estão em centavos (inteiros). Cargas de treino estão em gramas.',
    conta: user,
    tarefas: tasks,
    eventos: events,
    habitos: habits,
    registrosDeHabito: habitEntries,
    metas: goals,
    transacoes: transactions,
    orcamentos: budgets,
    treinos: workouts,
    materias: subjects,
    provas: exams,
    sessoesDeEstudo: studySessions,
    projetos: projects,
    lembretes: reminders,
    pessoas: relationships,
    checkins,
    observacoes: insights,
  };

  const nome = `mikasa-${new Date().toISOString().slice(0, 10)}.json`;

  return new Response(JSON.stringify(conteudo, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="${nome}"`,
      // Um export de dados pessoais não deve ficar em cache de proxy nenhum.
      'cache-control': 'no-store',
    },
  });
});
