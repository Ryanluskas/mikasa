import { ok, rota } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';
import { resumoDoMes } from '@/lib/finance';

export const runtime = 'nodejs';

export const GET = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);
  const url = new URL(req.url);

  // `?mes=2026-09` — se vier lixo, caímos no mês atual em vez de quebrar.
  const mes = url.searchParams.get('mes');
  let referencia = new Date();
  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    const [ano, m] = mes.split('-').map(Number);
    const candidata = new Date(ano, m - 1, 1);
    if (!Number.isNaN(candidata.getTime())) referencia = candidata;
  }

  return ok(await resumoDoMes(userId, referencia));
});
