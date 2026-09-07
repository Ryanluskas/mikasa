import { spawn, type ChildProcess } from 'node:child_process';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Sobe o Mikasa de verdade para os testes de integração.
 *
 * Poderíamos testar as funções isoladamente e ir mais rápido. Não fazemos
 * isso de propósito: o que precisa ser garantido aqui é que uma REQUISIÇÃO
 * HTTP real de um usuário não alcança os dados de outro — passando por
 * middleware, cookie, rota e banco, exatamente como em produção. Um teste que
 * chama a função interna não provaria isso.
 */

const PORTA = 3111;
export const BASE = `http://127.0.0.1:${PORTA}`;

const RAIZ = path.resolve(__dirname, '..');
const BANCO_TESTE = path.join(RAIZ, 'prisma', 'test.db');

let servidor: ChildProcess | null = null;

export async function subirServidor() {
  // Banco limpo a cada rodada: teste que depende de estado anterior não é teste.
  for (const sufixo of ['', '-journal', '-wal', '-shm']) {
    const arquivo = `${BANCO_TESTE}${sufixo}`;
    if (fs.existsSync(arquivo)) fs.rmSync(arquivo);
  }

  const env = {
    ...process.env,
    NODE_ENV: 'production' as const,
    DATABASE_URL: `file:${BANCO_TESTE.replace(/\\/g, '/')}`,
    AUTH_SECRET: 'segredo-de-teste-com-mais-de-32-caracteres-aqui',
    SESSION_DAYS: '1',
    NEXT_PUBLIC_APP_URL: BASE,
  };

  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    cwd: RAIZ,
    env,
    stdio: 'pipe',
  });

  servidor = spawn('npx', ['next', 'start', '-p', String(PORTA)], {
    cwd: RAIZ,
    env,
    stdio: 'pipe',
    shell: process.platform === 'win32',
  });

  await esperarResposta();
}

export async function derrubarServidor() {
  if (!servidor?.pid) return;

  // No Windows, `next start` roda dentro de um shell: matar o processo pai
  // deixaria o servidor real vivo, segurando o arquivo do banco e a DLL do
  // Prisma — e o próximo `build` falharia com EPERM. Aqui matamos a árvore.
  if (process.platform === 'win32') {
    try {
      execSync(`taskkill /pid ${servidor.pid} /T /F`, { stdio: 'ignore' });
    } catch {
      // Já morreu sozinho: tudo bem.
    }
  } else {
    servidor.kill('SIGTERM');
  }

  servidor = null;
  // Um instante para o sistema soltar os arquivos abertos.
  await new Promise((r) => setTimeout(r, 500));
}

async function esperarResposta(tentativas = 60) {
  for (let i = 0; i < tentativas; i++) {
    try {
      const r = await fetch(`${BASE}/entrar`, { redirect: 'manual' });
      if (r.status < 500) return;
    } catch {
      // servidor ainda subindo
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('O servidor de teste não respondeu a tempo.');
}

// ── Cliente com sessão ───────────────────────────────────────────────────────

export type Cliente = {
  email: string;
  cookie: string;
  pedir: (
    caminho: string,
    opcoes?: { metodo?: string; corpo?: unknown },
  ) => Promise<{ status: number; dados: unknown }>;
};

function clienteCom(email: string, cookie: string): Cliente {
  return {
    email,
    cookie,
    async pedir(caminho, opcoes = {}) {
      const r = await fetch(`${BASE}${caminho}`, {
        method: opcoes.metodo ?? 'GET',
        headers: {
          cookie,
          ...(opcoes.corpo ? { 'content-type': 'application/json' } : {}),
        },
        body: opcoes.corpo ? JSON.stringify(opcoes.corpo) : undefined,
        redirect: 'manual',
      });

      const tipo = r.headers.get('content-type') ?? '';
      const dados = tipo.includes('application/json') ? await r.json() : null;
      return { status: r.status, dados };
    },
  };
}

/** Cria uma conta nova e devolve um cliente já autenticado. */
export async function criarUsuario(apelido: string): Promise<Cliente> {
  const email = `${apelido}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@teste.mikasa`;

  const r = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: apelido,
      email,
      password: 'uma-senha-longa-de-teste',
    }),
  });

  if (r.status !== 201) {
    throw new Error(`Falha ao criar usuário de teste: ${r.status} ${await r.text()}`);
  }

  const setCookie = r.headers.get('set-cookie') ?? '';
  const cookie = setCookie.split(';')[0];
  if (!cookie.startsWith('mikasa_session=')) {
    throw new Error('O registro não devolveu cookie de sessão.');
  }

  const cliente = clienteCom(email, cookie);

  // Fecha o onboarding para que as rotas do app fiquem acessíveis.
  await cliente.pedir('/api/onboarding', {
    metodo: 'POST',
    corpo: {
      displayName: apelido,
      routineTags: ['Academia'],
      modules: ['goals', 'finance', 'workouts', 'habits', 'study', 'work', 'relationships'],
    },
  });

  return cliente;
}
