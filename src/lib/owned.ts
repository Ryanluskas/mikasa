import { naoEncontrado } from './api';

/**
 * A regra de ouro do isolamento de dados.
 *
 * Todo acesso a um recurso do usuário segue exatamente um destes dois padrões:
 *
 *   leitura:  findFirst({ where: { id, userId } })
 *   escrita:  updateMany/deleteMany({ where: { id, userId } })
 *
 * O `userId` entra sempre no MESMO `where` da consulta — nunca é verificado
 * depois, em JavaScript. Isso elimina a janela entre "ler" e "checar dono",
 * e faz com que um ID de outra pessoa simplesmente não encontre nada.
 *
 * Escritas usam `updateMany`/`deleteMany` de propósito, mesmo para um único
 * registro: `update({ where: { id } })` só aceita campos únicos e não deixa
 * filtrar por dono na mesma operação.
 */

/** Traduz "nenhuma linha afetada" em 404. Nunca em 403: veja `naoEncontrado`. */
export function garantirAfetado(count: number, oQue = 'Isso'): void {
  if (count === 0) throw naoEncontrado(oQue);
}

/** Traduz "não achei" em 404, com a mensagem certa. */
export function garantirExiste<T>(valor: T | null | undefined, oQue = 'Isso'): T {
  if (valor === null || valor === undefined) throw naoEncontrado(oQue);
  return valor;
}

/** Paginação segura: o cliente não escolhe quanto o banco vai varrer. */
export function paginacao(url: URL, padrao = 50, teto = 200) {
  const bruto = Number(url.searchParams.get('limit'));
  const limit = Number.isFinite(bruto) && bruto > 0 ? Math.min(bruto, teto) : padrao;

  const brutoSkip = Number(url.searchParams.get('skip'));
  const skip = Number.isFinite(brutoSkip) && brutoSkip > 0 ? Math.min(brutoSkip, 10_000) : 0;

  return { take: limit, skip };
}

/** Intervalo de datas vindo da query string, já validado. */
export function intervalo(url: URL): { gte?: Date; lte?: Date } | undefined {
  const de = url.searchParams.get('de');
  const ate = url.searchParams.get('ate');
  const faixa: { gte?: Date; lte?: Date } = {};

  if (de) {
    const d = new Date(de);
    if (!Number.isNaN(d.getTime())) faixa.gte = d;
  }
  if (ate) {
    const d = new Date(ate);
    if (!Number.isNaN(d.getTime())) faixa.lte = d;
  }

  return Object.keys(faixa).length ? faixa : undefined;
}
