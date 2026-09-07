import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import {
  BASE,
  criarUsuario,
  derrubarServidor,
  subirServidor,
  type Cliente,
} from './servidor';

/**
 * O teste mais importante do Mikasa.
 *
 * O aplicativo guarda dinheiro, rotina, relacionamentos e como a pessoa está
 * se sentindo. Um vazamento entre contas aqui não é um bug de produtividade —
 * é um problema sério na vida de alguém.
 *
 * A regra verificada: com um ID válido de OUTRA conta em mãos, o usuário A
 * não consegue ler, alterar nem apagar nada do usuário B. A resposta esperada
 * é 404 (e não 403), porque confirmar que o recurso existe já seria vazamento.
 */

let ana: Cliente;
let bruno: Cliente;

beforeAll(async () => {
  await subirServidor();
  ana = await criarUsuario('ana');
  bruno = await criarUsuario('bruno');
}, 180_000);

afterAll(async () => {
  await derrubarServidor();
});

/** Cria um recurso na conta da Ana e devolve o id. */
async function idDeRecursoDaAna(
  caminho: string,
  corpo: unknown,
  extrair: (d: never) => string = (d: never) => (d as { id: string }).id,
): Promise<string> {
  const r = await ana.pedir(caminho, { metodo: 'POST', corpo });
  expect(r.status, `criação em ${caminho}`).toBe(201);
  return extrair(r.dados as never);
}

describe('isolamento de dados entre contas', () => {
  it('tarefa: Bruno não lê, não altera e não apaga a tarefa da Ana', async () => {
    const id = await idDeRecursoDaAna('/api/tasks', { title: 'Tarefa privada da Ana' });

    const leitura = await bruno.pedir(`/api/tasks/${id}`);
    expect(leitura.status).toBe(404);

    const alteracao = await bruno.pedir(`/api/tasks/${id}`, {
      metodo: 'PATCH',
      corpo: { title: 'invadido' },
    });
    expect(alteracao.status).toBe(404);

    const exclusao = await bruno.pedir(`/api/tasks/${id}`, { metodo: 'DELETE' });
    expect(exclusao.status).toBe(404);

    // E, principalmente: a tarefa da Ana continua intacta.
    const conferencia = await ana.pedir(`/api/tasks/${id}`);
    expect(conferencia.status).toBe(200);
    expect((conferencia.dados as { title: string }).title).toBe('Tarefa privada da Ana');
  });

  it('meta: o ID de outra conta não abre nada', async () => {
    const id = await idDeRecursoDaAna('/api/goals', {
      title: 'Comprar meu primeiro carro',
      area: 'finance',
      targetCents: 4_000_000,
    });

    expect((await bruno.pedir(`/api/goals/${id}`)).status).toBe(404);
    expect(
      (await bruno.pedir(`/api/goals/${id}`, { metodo: 'PATCH', corpo: { currentCents: 1 } }))
        .status,
    ).toBe(404);
    expect((await bruno.pedir(`/api/goals/${id}`, { metodo: 'DELETE' })).status).toBe(404);
  });

  it('financeiro: lançamentos não atravessam contas', async () => {
    const id = await idDeRecursoDaAna('/api/finance/transactions', {
      type: 'expense',
      amountCents: 12_345,
      category: 'alimentacao',
      occurredAt: new Date().toISOString(),
    });

    expect((await bruno.pedir(`/api/finance/transactions/${id}`)).status).toBe(404);
    expect(
      (
        await bruno.pedir(`/api/finance/transactions/${id}`, {
          metodo: 'PATCH',
          corpo: { amountCents: 1 },
        })
      ).status,
    ).toBe(404);

    // O resumo do Bruno não enxerga o gasto da Ana.
    const resumo = await bruno.pedir('/api/finance/summary');
    expect(resumo.status).toBe(200);
    expect((resumo.dados as { saidasCents: number }).saidasCents).toBe(0);
  });

  it('evento, treino, hábito e pessoa: mesma regra', async () => {
    const agora = new Date().toISOString();
    const daquiUmaHora = new Date(Date.now() + 3_600_000).toISOString();

    const evento = await idDeRecursoDaAna('/api/events', {
      title: 'Jiu-jitsu',
      startAt: agora,
      endAt: daquiUmaHora,
    });
    const habito = await idDeRecursoDaAna('/api/habits', { name: 'Beber água' });
    const pessoa = await idDeRecursoDaAna('/api/relationships', { name: 'Alguém' });

    const treinoResp = await ana.pedir('/api/workouts', {
      metodo: 'POST',
      corpo: { kind: 'gym', startedAt: agora, durationMin: 60, intensity: 2 },
    });
    expect(treinoResp.status).toBe(201);
    const treino = (treinoResp.dados as { treino: { id: string } }).treino.id;

    expect((await bruno.pedir(`/api/events/${evento}`)).status).toBe(404);
    expect((await bruno.pedir(`/api/workouts/${treino}`)).status).toBe(404);
    expect((await bruno.pedir(`/api/habits/${habito}`, { metodo: 'DELETE' })).status).toBe(404);
    expect(
      (await bruno.pedir(`/api/relationships/${pessoa}`, { metodo: 'PATCH', corpo: { name: 'x' } }))
        .status,
    ).toBe(404);
  });

  it('vínculos: não dá para pendurar uma tarefa no projeto de outra pessoa', async () => {
    const projeto = await idDeRecursoDaAna('/api/projects', { name: 'Projeto da Ana' });

    // Mass assignment: o Bruno manda um projectId que não é dele.
    const r = await bruno.pedir('/api/tasks', {
      metodo: 'POST',
      corpo: { title: 'Tentativa', projectId: projeto },
    });

    expect(r.status).toBe(422);
  });

  it('etapas de meta: só o dono acrescenta', async () => {
    const meta = await idDeRecursoDaAna('/api/goals', {
      title: 'Meta da Ana',
      area: 'personal',
    });

    const r = await bruno.pedir(`/api/goals/${meta}/steps`, {
      metodo: 'POST',
      corpo: { title: 'etapa intrusa' },
    });

    expect(r.status).toBe(404);
  });

  it('listagens só devolvem o que é da própria conta', async () => {
    await ana.pedir('/api/tasks', { metodo: 'POST', corpo: { title: 'Só da Ana' } });

    const lista = await bruno.pedir('/api/tasks');
    expect(lista.status).toBe(200);

    const titulos = (lista.dados as { title: string }[]).map((t) => t.title);
    expect(titulos).not.toContain('Só da Ana');
  });

  it('exportação de dados devolve apenas a própria conta', async () => {
    const r = await fetch(`${BASE}/api/account/export`, {
      headers: { cookie: bruno.cookie },
    });
    expect(r.status).toBe(200);

    const conteudo = await r.text();
    expect(conteudo).not.toContain(ana.email);
    expect(conteudo).toContain(bruno.email);

    // O hash da senha nunca sai da máquina.
    expect(conteudo).not.toContain('passwordHash');
    expect(conteudo).not.toContain('scrypt$');
  });
});

describe('autenticação', () => {
  it('sem sessão, a API responde 401 e não 500', async () => {
    const r = await fetch(`${BASE}/api/tasks`, { redirect: 'manual' });
    expect(r.status).toBe(401);
  });

  it('rota protegida sem cookie redireciona para o login', async () => {
    const r = await fetch(`${BASE}/inicio`, { redirect: 'manual' });
    expect([302, 307]).toContain(r.status);
    expect(r.headers.get('location')).toContain('/entrar');
  });

  it('senha errada não diferencia de e-mail inexistente', async () => {
    const inexistente = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'ninguem@teste.mikasa', password: 'seja-la-o-que-for' }),
    });

    const senhaErrada = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: ana.email, password: 'senha-completamente-errada' }),
    });

    expect(inexistente.status).toBe(401);
    expect(senhaErrada.status).toBe(401);
    expect(await inexistente.json()).toEqual(await senhaErrada.json());
  });

  it('logout revoga a sessão de verdade', async () => {
    const carlos = await criarUsuario('carlos');
    const cookieAntigo = carlos.cookie;

    expect((await carlos.pedir('/api/tasks')).status).toBe(200);

    await fetch(`${BASE}/api/auth/logout`, {
      method: 'POST',
      headers: { cookie: cookieAntigo },
    });

    // O mesmo token, reaproveitado depois do logout, não vale mais nada.
    const depois = await fetch(`${BASE}/api/tasks`, {
      headers: { cookie: cookieAntigo },
      redirect: 'manual',
    });
    expect(depois.status).toBe(401);
  });

  it('o cookie de sessão é httpOnly e SameSite', async () => {
    const r = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: ana.email, password: 'uma-senha-longa-de-teste' }),
    });

    const cookie = r.headers.get('set-cookie') ?? '';
    expect(cookie.toLowerCase()).toContain('httponly');
    expect(cookie.toLowerCase()).toContain('samesite=lax');
  });
});

describe('validação de entrada', () => {
  it('valor financeiro negativo é recusado', async () => {
    const r = await ana.pedir('/api/finance/transactions', {
      metodo: 'POST',
      corpo: {
        type: 'expense',
        amountCents: -5000,
        category: 'alimentacao',
        occurredAt: new Date().toISOString(),
      },
    });
    expect(r.status).toBe(422);
  });

  it('categoria inventada é recusada', async () => {
    const r = await ana.pedir('/api/finance/transactions', {
      metodo: 'POST',
      corpo: {
        type: 'expense',
        amountCents: 1000,
        category: 'categoria-que-nao-existe',
        occurredAt: new Date().toISOString(),
      },
    });
    expect(r.status).toBe(422);
  });

  it('evento que termina antes de começar é recusado', async () => {
    const r = await ana.pedir('/api/events', {
      metodo: 'POST',
      corpo: {
        title: 'Impossível',
        startAt: new Date(Date.now() + 3_600_000).toISOString(),
        endAt: new Date().toISOString(),
      },
    });
    expect(r.status).toBe(422);
  });

  it('data inválida não derruba o servidor', async () => {
    const r = await ana.pedir('/api/events', {
      metodo: 'POST',
      corpo: { title: 'x', startAt: 'não é uma data', endAt: 'nem isso' },
    });
    expect(r.status).toBe(422);
  });

  it('erro nunca expõe stack trace', async () => {
    const r = await fetch(`${BASE}/api/tasks`, {
      method: 'POST',
      headers: { cookie: ana.cookie, 'content-type': 'application/json' },
      body: '{ isto não é json válido',
    });

    const texto = await r.text();
    expect(r.status).toBe(422);
    expect(texto).not.toContain('at ');
    expect(texto).not.toContain('node_modules');
  });
});
