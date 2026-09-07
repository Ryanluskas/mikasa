/**
 * O cliente HTTP do Mikasa.
 *
 * Uma função só para toda a interface. Ela existe para que nenhuma tela
 * precise repetir tratamento de erro, e para que a mensagem que o usuário lê
 * venha sempre do servidor quando ele tiver uma — e do Mikasa quando não tiver.
 */

import { VOZ } from './voice';

export class ErroApi extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

type Opcoes = {
  metodo?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  corpo?: unknown;
  sinal?: AbortSignal;
};

export async function api<T = unknown>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  const { metodo = 'GET', corpo, sinal } = opcoes;

  let resposta: Response;
  try {
    resposta = await fetch(caminho, {
      method: metodo,
      headers: corpo ? { 'content-type': 'application/json' } : undefined,
      body: corpo ? JSON.stringify(corpo) : undefined,
      signal: sinal,
      // O cookie de sessão é httpOnly; `same-origin` é o que o faz viajar.
      credentials: 'same-origin',
    });
  } catch (erro) {
    // Abortar não é erro — é a tela trocando antes da resposta chegar.
    if (erro instanceof DOMException && erro.name === 'AbortError') throw erro;
    throw new ErroApi(0, 'offline', VOZ.erro.rede);
  }

  if (resposta.status === 204) return undefined as T;

  const tipo = resposta.headers.get('content-type') ?? '';
  const dados = tipo.includes('application/json') ? await resposta.json() : null;

  if (!resposta.ok) {
    // Sessão expirada: manda para o login em vez de mostrar um erro seco.
    if (resposta.status === 401 && typeof window !== 'undefined') {
      const atual = window.location.pathname;
      if (!atual.startsWith('/entrar')) {
        window.location.href = `/entrar?proximo=${encodeURIComponent(atual)}`;
      }
    }

    throw new ErroApi(
      resposta.status,
      dados?.code ?? 'erro',
      dados?.error ?? VOZ.erro.generico,
      dados?.fields,
    );
  }

  return dados as T;
}
