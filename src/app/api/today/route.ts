import { ok, rota } from '@/lib/api';
import { exigirUsuarioApi } from '@/lib/auth/guard';
import { montarDia } from '@/lib/today';

export const runtime = 'nodejs';

export const GET = rota(async (req: Request) => {
  const userId = await exigirUsuarioApi(req);
  const url = new URL(req.url);

  const dataParam = url.searchParams.get('data');
  let referencia = new Date();
  if (dataParam) {
    const d = new Date(dataParam);
    if (!Number.isNaN(d.getTime())) referencia = d;
  }

  return ok(await montarDia(userId, referencia));
});
