import { prisma } from '@/lib/prisma';
import { ok, rota } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';
import { lerVida, sincronizarInsights } from '@/lib/life/engine';
import type { AreaModulo } from '@/lib/validation';

export const runtime = 'nodejs';

/**
 * A leitura de vida do usuário.
 *
 * Esta é a rota que responde "como as coisas estão afetando minha vida como
 * um todo" — a razão de o Mikasa existir como um app só, e não como cinco.
 */
export const GET = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);
  const url = new URL(req.url);

  const dias = Math.min(Math.max(Number(url.searchParams.get('dias')) || 30, 7), 90);

  const [modulos, perfil] = await Promise.all([
    prisma.modulePref.findMany({ where: { userId, enabled: true } }),
    prisma.profile.findUnique({
      where: { userId },
      select: { lifeLayerEnabled: true },
    }),
  ]);

  // A camada de vida é desligável. Quem não quer ser observado não é.
  if (perfil && !perfil.lifeLayerEnabled) {
    return ok({ desativada: true });
  }

  const leitura = await lerVida(
    userId,
    modulos.map((m) => m.key as AreaModulo),
    dias,
  );

  // Guarda os achados para que possam ser dispensados individualmente.
  await sincronizarInsights(userId, leitura.achados, dias);

  const dispensados = await prisma.insight.findMany({
    where: { userId, dismissedAt: { not: null } },
    select: { key: true },
  });
  const escondidos = new Set(dispensados.map((d) => d.key));

  return ok({
    ...leitura,
    achados: leitura.achados.filter((a) => !escondidos.has(a.key)),
  });
});
