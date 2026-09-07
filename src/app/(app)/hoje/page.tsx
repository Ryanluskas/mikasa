import { exigirUsuarioPronto } from '@/lib/auth/guard';
import { montarDia } from '@/lib/today';
import { nomeDiaLongo, formatDataCurta } from '@/lib/dates';
import { ListaDoDia } from '@/components/hoje/ListaDoDia';
import { CheckinDoDia } from '@/components/life/CheckinDoDia';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Hoje' };

/**
 * O modo "Hoje".
 *
 * Só o que importa neste dia, em uma lista única — eventos, tarefas, treinos,
 * provas e hábitos juntos, em ordem de relógio. O usuário não deveria precisar
 * abrir cinco telas para saber o que tem pela frente.
 */
export default async function Hoje() {
  const user = await exigirUsuarioPronto();
  const dia = await montarDia(user.id);

  const hoje = new Date();

  return (
    <div className="space-y-8">
      <header>
        <p className="secao">{formatDataCurta(hoje)}</p>
        <h1 className="mt-1 text-display font-semibold text-ink first-letter:uppercase">
          {nomeDiaLongo(hoje)}
        </h1>
      </header>

      {!dia.checkinFeito && <CheckinDoDia compacto />}

      <ListaDoDia itens={dia.itens} />
    </div>
  );
}
