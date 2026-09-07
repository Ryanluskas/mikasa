import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Contrato de erro da API.
 *
 * Duas audiências, duas mensagens:
 *  - o usuário recebe uma frase humana;
 *  - o log do servidor recebe o detalhe técnico.
 * Stack trace jamais atravessa a fronteira da resposta.
 */
export class ApiError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: Record<string, string>,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export const naoAutenticado = () =>
  new ApiError(401, 'unauthenticated', 'Sua sessão expirou. Entre novamente.');

/**
 * 404 — e não 403 — quando o recurso não é do usuário.
 *
 * Responder 403 confirmaria que o ID existe e pertence a outra pessoa.
 * Para quem não é dono, o recurso simplesmente não existe.
 */
export const naoEncontrado = (o = 'Isso') =>
  new ApiError(404, 'not_found', `${o} não foi encontrado.`);

export const invalido = (message: string, fields?: Record<string, string>) =>
  new ApiError(422, 'invalid', message, fields);

export const excedeuLimite = (message: string) =>
  new ApiError(429, 'rate_limited', message);

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function semConteudo() {
  return new NextResponse(null, { status: 204 });
}

function logErro(erro: unknown, contexto: string) {
  // Nunca logamos corpo de requisição: ele carrega senha, valores financeiros
  // e notas pessoais. Só o suficiente para achar o problema.
  const detalhe = erro instanceof Error ? `${erro.name}: ${erro.message}` : String(erro);
  console.error(`[mikasa][erro] ${contexto} — ${detalhe}`);
  if (erro instanceof Error && erro.stack && process.env.NODE_ENV !== 'production') {
    console.error(erro.stack);
  }
}

/**
 * Envelopa um route handler e converte qualquer falha em resposta segura.
 * Toda rota da API passa por aqui — é o único lugar que produz erro 500.
 */
export function rota<Args extends unknown[]>(
  fn: (...args: Args) => Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (erro) {
      if (erro instanceof ApiError) {
        return NextResponse.json(
          { error: erro.message, code: erro.code, fields: erro.fields },
          { status: erro.status },
        );
      }

      if (erro instanceof ZodError) {
        const fields: Record<string, string> = {};
        for (const i of erro.issues) {
          const chave = i.path.join('.') || '_';
          if (!fields[chave]) fields[chave] = i.message;
        }
        return NextResponse.json(
          {
            error: 'Alguns campos precisam de atenção.',
            code: 'invalid',
            fields,
          },
          { status: 422 },
        );
      }

      logErro(erro, 'rota');
      return NextResponse.json(
        {
          error: 'Não conseguimos concluir isso agora. Tente novamente.',
          code: 'internal',
        },
        { status: 500 },
      );
    }
  };
}

/** Lê e valida o corpo JSON. Corpo malformado vira 422, não 500. */
export async function corpoJson(req: Request): Promise<unknown> {
  const tipo = req.headers.get('content-type') ?? '';
  if (!tipo.includes('application/json')) {
    throw invalido('Formato de requisição não suportado.');
  }
  try {
    return await req.json();
  } catch {
    throw invalido('Não conseguimos ler os dados enviados.');
  }
}
