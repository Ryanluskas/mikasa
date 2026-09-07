import { prisma } from '@/lib/prisma';
import { exigirUsuarioPronto } from '@/lib/auth/guard';
import { PainelDePessoas } from '@/components/pessoas/PainelDePessoas';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Pessoas' };

/**
 * Relacionamentos.
 *
 * A área mais delicada do Mikasa, e por isso a mais opcional de todas: se o
 * usuário não ligou, ela nem aparece na navegação. Nada aqui é cobrado, e o
 * app nunca inventa uma pessoa que você "deveria" contatar.
 */
export default async function Pessoas() {
  const user = await exigirUsuarioPronto();

  const pessoas = await prisma.relationship.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'asc' },
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-display font-semibold text-ink">Pessoas</h1>
        <p className="mt-1.5 text-[15px] text-muted">
          Quem importa para você, e as datas que você não quer esquecer.
        </p>
      </header>

      <PainelDePessoas
        pessoas={pessoas.map((p) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          birthday: p.birthday?.toISOString() ?? null,
          anniversary: p.anniversary?.toISOString() ?? null,
          contactEveryDays: p.contactEveryDays,
          lastContactAt: p.lastContactAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
