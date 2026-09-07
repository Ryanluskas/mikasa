/**
 * Dinheiro no Mikasa.
 *
 * Regra única e sem exceção: valores monetários circulam como INTEIROS em
 * centavos. Nenhuma soma, subtração ou comparação acontece em float.
 * `10.50` nunca vira `10.499999999` porque `10.50` nunca existe — existe 1050.
 *
 * Float aparece apenas nas bordas: quando o usuário digita e quando exibimos.
 */

export const MAX_CENTS = 9_999_999_999; // ~R$ 99.999.999,99 — limite sanitário

/** Converte a entrada do usuário ("1.234,56", "1234.56", 1234.56) em centavos. */
export function parseCents(input: string | number): number | null {
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return null;
    return Math.round(input * 100);
  }

  const limpo = input.trim().replace(/\s|R\$/g, '');
  if (!limpo) return null;

  // Aceita tanto "1.234,56" (pt-BR) quanto "1234.56" (padrão de máquina).
  let normalizado: string;
  const temVirgula = limpo.includes(',');
  const temPonto = limpo.includes('.');

  if (temVirgula && temPonto) {
    // O último separador é o decimal.
    normalizado =
      limpo.lastIndexOf(',') > limpo.lastIndexOf('.')
        ? limpo.replace(/\./g, '').replace(',', '.')
        : limpo.replace(/,/g, '');
  } else if (temVirgula) {
    normalizado = limpo.replace(',', '.');
  } else {
    normalizado = limpo;
  }

  if (!/^-?\d*\.?\d*$/.test(normalizado)) return null;
  if (normalizado === '' || normalizado === '-' || normalizado === '.') return null;

  // A conversão é feita sobre os DÍGITOS, não sobre um float.
  //
  // `Math.round(1.005 * 100)` devolve 100, porque 1.005 não existe em ponto
  // flutuante — o valor real armazenado é 1.00499999999999989. Trabalhando
  // com o texto, "1,005" vira 100 inteiros e 5 décimos de centavo, e o
  // arredondamento acontece exatamente onde deve.
  const negativo = normalizado.startsWith('-');
  const semSinal = negativo ? normalizado.slice(1) : normalizado;
  const [inteiraBruta, fracionaria = ''] = semSinal.split('.');

  const inteira = inteiraBruta || '0';
  if (inteira.length > 15) return null;

  const centavosTexto = (fracionaria + '00').slice(0, 2);
  const terceiraCasa = fracionaria[2];

  let cents = Number(inteira) * 100 + Number(centavosTexto);
  // Meia unidade para cima, como manda a intuição de quem digita dinheiro.
  if (terceiraCasa && Number(terceiraCasa) >= 5) cents += 1;

  if (!Number.isFinite(cents)) return null;
  if (cents > MAX_CENTS) return null;

  return negativo ? -cents : cents;
}

/** Formata centavos como moeda brasileira. */
export function formatCents(cents: number, opts?: { sinal?: boolean }): string {
  const valor = cents / 100;
  const texto = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Math.abs(valor));
  if (!opts?.sinal) return cents < 0 ? `-${texto}` : texto;
  return `${cents < 0 ? '−' : '+'}${texto}`;
}

/** Formata centavos sem o símbolo — para gráficos e resumos compactos. */
export function formatCentsShort(cents: number): string {
  const valor = Math.abs(cents) / 100;
  if (valor >= 1000) {
    return `R$ ${(valor / 1000).toLocaleString('pt-BR', {
      maximumFractionDigits: 1,
    })} mil`;
  }
  return formatCents(cents);
}

/** Percentual inteiro e seguro (nunca divide por zero, nunca passa de 100). */
export function pct(atual: number, alvo: number): number {
  if (alvo <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((atual / alvo) * 100)));
}

/** Percentual sem teto — usado quando ultrapassar a meta é informação útil. */
export function pctRaw(atual: number, alvo: number): number {
  if (alvo <= 0) return 0;
  return Math.max(0, Math.round((atual / alvo) * 100));
}
