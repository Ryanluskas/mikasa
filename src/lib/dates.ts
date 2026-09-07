/**
 * Datas do Mikasa.
 *
 * O app raciocina em DIAS, não em instantes. "Hoje" e "ontem" são as unidades
 * que importam para uma rotina. Por isso datas de check-in e de hábito são
 * sempre normalizadas para 00:00 local, e comparações usam a chave `YYYY-MM-DD`.
 */

export const DIA_MS = 86_400_000;

/** Zera as horas mantendo o dia local. */
export function startOfDay(d: Date | string | number): Date {
  const data = new Date(d);
  data.setHours(0, 0, 0, 0);
  return data;
}

export function endOfDay(d: Date | string | number): Date {
  const data = new Date(d);
  data.setHours(23, 59, 59, 999);
  return data;
}

/** Chave estável de dia — a forma segura de comparar duas datas. */
export function dayKey(d: Date | string | number): string {
  const data = new Date(d);
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

export function addDays(d: Date, dias: number): Date {
  const data = new Date(d);
  data.setDate(data.getDate() + dias);
  return data;
}

export function diffDays(a: Date, b: Date): number {
  return Math.round(
    (startOfDay(a).getTime() - startOfDay(b).getTime()) / DIA_MS,
  );
}

export function startOfWeek(d: Date, weekStart = 1): Date {
  const data = startOfDay(d);
  const delta = (data.getDay() - weekStart + 7) % 7;
  return addDays(data, -delta);
}

export function startOfMonth(d: Date): Date {
  const data = startOfDay(d);
  data.setDate(1);
  return data;
}

export function endOfMonth(d: Date): Date {
  const data = startOfMonth(d);
  data.setMonth(data.getMonth() + 1);
  return new Date(data.getTime() - 1);
}

export function isSameDay(a: Date, b: Date): boolean {
  return dayKey(a) === dayKey(b);
}

export function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

// ── Formatação em português ──────────────────────────────────────────────────

const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const DIAS_LONGOS = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
];
const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

export const nomeDiaCurto = (d: Date) => DIAS_CURTOS[d.getDay()];
export const nomeDiaLongo = (d: Date) => DIAS_LONGOS[d.getDay()];
export const nomeMes = (d: Date) => MESES[d.getMonth()];

export function formatHora(d: Date | string): string {
  const data = new Date(d);
  return `${String(data.getHours()).padStart(2, '0')}:${String(
    data.getMinutes(),
  ).padStart(2, '0')}`;
}

export function formatDataCurta(d: Date | string): string {
  const data = new Date(d);
  return `${data.getDate()} de ${nomeMes(data)}`;
}

/** "hoje", "amanhã", "em 3 dias", "há 2 dias" — a linguagem que uma pessoa usa. */
export function formatRelativo(d: Date | string): string {
  const dias = diffDays(new Date(d), new Date());
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'amanhã';
  if (dias === -1) return 'ontem';
  if (dias > 1 && dias <= 7) return `em ${dias} dias`;
  if (dias < -1 && dias >= -7) return `há ${Math.abs(dias)} dias`;
  return formatDataCurta(d);
}

/** Saudação pelo horário. Sem exclamação — o Mikasa não grita. */
export function saudacao(d = new Date()): string {
  const h = d.getHours();
  if (h < 5) return 'Boa madrugada';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** Duração em minutos → "2h30", "45 min". */
export function formatDuracao(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

/** Minutos desde a meia-noite → "09:00". */
export function minutosParaHora(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Converte um `<input type="datetime-local">` em Date local. */
export function parseLocalInput(valor: string): Date | null {
  if (!valor) return null;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

/** Converte Date em valor para `<input type="datetime-local">`. */
export function toLocalInput(d: Date | string): string {
  const data = new Date(d);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(
    data.getDate(),
  )}T${pad(data.getHours())}:${pad(data.getMinutes())}`;
}

/** Converte Date em valor para `<input type="date">`. */
export function toDateInput(d: Date | string): string {
  return dayKey(d);
}
