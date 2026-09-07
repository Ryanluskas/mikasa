/** Junta classes ignorando falsos. Pequeno de propósito: não precisamos de mais. */
export function cn(...partes: (string | false | null | undefined)[]): string {
  return partes.filter(Boolean).join(' ');
}
