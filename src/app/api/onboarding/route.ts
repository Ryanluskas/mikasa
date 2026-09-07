import { prisma } from '@/lib/prisma';
import { corpoJson, ok, rota } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';
import { onboardingSchema } from '@/lib/validation';
import { MODULOS } from '@/lib/modules';

export const runtime = 'nodejs';

/**
 * Fecha o onboarding.
 *
 * O que o usuário respondeu aqui define a cara do app para ele: quais áreas
 * existem, o que aparece na Home, o que a camada de vida observa.
 */
export const POST = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);
  const dados = onboardingSchema.parse(await corpoJson(req));

  const escolhidos = new Set(dados.modules);

  await prisma.$transaction(async (tx) => {
    await tx.profile.update({
      where: { userId },
      data: {
        displayName: dados.displayName,
        routineTags: JSON.stringify(dados.routineTags),
        mainGoal: dados.mainGoal ?? null,
        weekShape: dados.weekShape ?? null,
        onboardingDone: true,
      },
    });

    // `upsert` por área: uma conta criada antes de um módulo novo existir
    // continua funcionando quando o módulo aparecer numa versão futura.
    for (const [i, m] of MODULOS.entries()) {
      await tx.modulePref.upsert({
        where: { userId_key: { userId, key: m.key } },
        create: { userId, key: m.key, enabled: escolhidos.has(m.key), order: i },
        update: { enabled: escolhidos.has(m.key) },
      });
    }
  });

  return ok({ proximo: '/inicio' });
});
