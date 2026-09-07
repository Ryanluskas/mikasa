import { describe, expect, it } from 'vitest';
import { formatCents, parseCents, pct, MAX_CENTS } from '@/lib/money';

/**
 * Dinheiro.
 *
 * O prompt trouxe um exemplo direto: R$ 10,50 não pode virar 10.499999999.
 * Estes testes existem para que isso continue verdade depois de qualquer
 * refatoração futura.
 */

describe('leitura de valores digitados', () => {
  it('entende o formato brasileiro', () => {
    expect(parseCents('10,50')).toBe(1050);
    expect(parseCents('1.234,56')).toBe(123456);
    expect(parseCents('0,01')).toBe(1);
    expect(parseCents('R$ 89,90')).toBe(8990);
  });

  it('entende o formato de máquina', () => {
    expect(parseCents('10.50')).toBe(1050);
    expect(parseCents('1234.56')).toBe(123456);
    expect(parseCents(10.5)).toBe(1050);
  });

  it('não perde centavos em valores problemáticos de ponto flutuante', () => {
    // 0.1 + 0.2 em float dá 0.30000000000000004. Em centavos, dá 30.
    expect(parseCents('0,10')! + parseCents('0,20')!).toBe(30);
    expect(parseCents('19,99')).toBe(1999);
    expect(parseCents('0,07')).toBe(7);
    expect(parseCents('8,15')).toBe(815);
    expect(parseCents('1,005')).toBe(101); // arredonda uma única vez
  });

  it('recusa o que não é valor', () => {
    expect(parseCents('')).toBeNull();
    expect(parseCents('abc')).toBeNull();
    expect(parseCents('10,,5')).toBeNull();
    expect(parseCents(Number.NaN)).toBeNull();
    expect(parseCents(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it('tem teto: valores absurdos não passam', () => {
    expect(parseCents('999999999999')).toBeNull();
    expect(parseCents(MAX_CENTS / 100)).toBe(MAX_CENTS);
  });

  it('aceita zero e negativo na leitura — quem decide o sinal é a validação', () => {
    expect(parseCents('0')).toBe(0);
    expect(parseCents('-10,50')).toBe(-1050);
  });
});

describe('exibição de valores', () => {
  it('formata como moeda brasileira', () => {
    // O Intl usa espaço não separável entre "R$" e o número.
    expect(formatCents(1050).replace(/ /g, ' ')).toBe('R$ 10,50');
    expect(formatCents(0).replace(/ /g, ' ')).toBe('R$ 0,00');
    expect(formatCents(123456).replace(/ /g, ' ')).toBe('R$ 1.234,56');
  });

  it('mantém o sinal de valores negativos', () => {
    expect(formatCents(-1050).replace(/ /g, ' ')).toBe('-R$ 10,50');
  });

  it('ida e volta preserva o valor', () => {
    for (const entrada of ['0,01', '10,50', '1.234,56', '99,99', '1.000,00']) {
      const cents = parseCents(entrada)!;
      const formatado = formatCents(cents);
      const devolta = parseCents(formatado.replace(/[R$ \s]/g, ''));
      expect(devolta).toBe(cents);
    }
  });
});

describe('percentual', () => {
  it('nunca divide por zero', () => {
    expect(pct(100, 0)).toBe(0);
    expect(pct(0, 0)).toBe(0);
  });

  it('fica entre 0 e 100', () => {
    expect(pct(50, 100)).toBe(50);
    expect(pct(150, 100)).toBe(100);
    expect(pct(-10, 100)).toBe(0);
  });
});
