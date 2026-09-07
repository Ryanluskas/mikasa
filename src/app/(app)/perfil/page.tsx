import { prisma } from '@/lib/prisma';
import { exigirUsuarioPronto } from '@/lib/auth/guard';
import { PainelDePerfil } from '@/components/perfil/PainelDePerfil';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Perfil' };

export default async function Perfil() {
  const user = await exigirUsuarioPronto();

  const [perfil, contagens] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: user.id } }),
    Promise.all([
      prisma.task.count({ where: { userId: user.id } }),
      prisma.event.count({ where: { userId: user.id } }),
      prisma.transaction.count({ where: { userId: user.id } }),
      prisma.workout.count({ where: { userId: user.id } }),
      prisma.checkin.count({ where: { userId: user.id } }),
      prisma.goal.count({ where: { userId: user.id } }),
    ]),
  ]);

  const [tarefas, eventos, transacoes, treinos, checkins, metas] = contagens;

  return (
    <PainelDePerfil
      email={user.email}
      perfil={{
        displayName: perfil?.displayName ?? user.displayName,
        theme: perfil?.theme ?? 'system',
        streaksEnabled: perfil?.streaksEnabled ?? true,
        remindersEnabled: perfil?.remindersEnabled ?? true,
        lifeLayerEnabled: perfil?.lifeLayerEnabled ?? true,
        reducedMotion: perfil?.reducedMotion ?? false,
        quietHoursStart: perfil?.quietHoursStart ?? 22,
        quietHoursEnd: perfil?.quietHoursEnd ?? 7,
      }}
      modulos={user.modules.map((m) => ({
        key: m.key,
        enabled: m.enabled,
        order: m.order,
      }))}
      dados={{ tarefas, eventos, transacoes, treinos, checkins, metas }}
    />
  );
}
