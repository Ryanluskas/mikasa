/**
 * A voz do Mikasa.
 *
 * Todas as frases que o produto diz ao usuário nascem aqui, num arquivo só.
 * Isso não é organização por organização: é o que impede o app de ter dez
 * tons diferentes conforme quem escreveu cada tela.
 *
 * Regras da voz:
 *  - Fala como um amigo organizado, nunca como coach e nunca como robô.
 *  - Não usa exclamação. Não usa caixa alta. Não usa emoji.
 *  - Nunca pune. "Sua sequência terminou. Tudo bem." e não "VOCÊ PERDEU".
 *  - Nunca presume sentimento. Descreve o que foi registrado, não o que a
 *    pessoa deve estar sentindo.
 *  - Nunca diagnostica. Não é linguagem clínica, não é ferramenta de saúde.
 */

/** Escolhe de forma estável para a mesma semente — não muda a cada render. */
function escolher(opcoes: string[], semente?: number): string {
  if (semente === undefined) return opcoes[Math.floor(Math.random() * opcoes.length)];
  return opcoes[Math.abs(Math.trunc(semente)) % opcoes.length];
}

export const VOZ = {
  // ── Conclusões ─────────────────────────────────────────────────────────────
  tarefaConcluida: (n = 0) => escolher(['Feito.', 'Boa.', 'Mais uma.'], n),

  diaProdutivo: (concluidas: number) =>
    concluidas >= 5 ? 'Olha só. Hoje rendeu.' : 'Você fez bastante hoje.',

  metaConcluida: () => 'Parabéns. Você conseguiu.',
  etapaConcluida: () => 'Boa. Mais uma etapa concluída.',
  treinoRegistrado: (total: number) =>
    total >= 7
      ? `${total} treinos. Está criando consistência.`
      : 'Treino registrado.',
  estudoConcluido: (min: number) => `Boa. ${min} minutos feitos.`,
  metaFinanceiraAtingida: () => 'Você chegou lá.',

  // ── Faltas, sem culpa ──────────────────────────────────────────────────────
  naoDeuHoje: () => 'Não deu hoje. Tudo bem.',
  amanhaEhOutroDia: () => 'Tudo bem. Amanhã é um novo dia.',
  aindaDaTempo: () => 'Você ainda tem tempo para resolver isso.',
  sequenciaTerminou: () => 'Sua sequência terminou. Tudo bem. Vamos começar outra?',
  voltouDepoisDeDias: (dias: number) =>
    dias > 14 ? 'Bom te ver por aqui.' : 'Bom te ver de novo.',
  semRegistroHaDias: () =>
    'Faz alguns dias que você não registra nada. Tudo bem. Quando quiser, continuamos.',

  // ── Estados vazios ─────────────────────────────────────────────────────────
  vazio: {
    financeiro: {
      titulo: 'Seu dinheiro começa aqui.',
      texto: 'Adicione sua primeira entrada ou despesa.',
    },
    metas: {
      titulo: 'Qual é a primeira coisa que você quer conquistar?',
      texto: 'Uma meta por vez já é o suficiente.',
    },
    treinos: {
      titulo: 'Vamos registrar seu primeiro treino?',
      texto: 'Academia, luta, corrida — o que você faz.',
    },
    tarefas: {
      titulo: 'Nada pendente por aqui.',
      texto: 'Quando aparecer alguma coisa, ela fica nesta lista.',
    },
    hoje: {
      titulo: 'Hoje está livre.',
      texto: 'Nenhum compromisso registrado. Aproveite.',
    },
    calendario: {
      titulo: 'Nenhum evento neste dia.',
      texto: 'Aulas, treinos, reuniões — tudo cabe aqui.',
    },
    estudos: {
      titulo: 'Suas matérias ficam aqui.',
      texto: 'Adicione uma e o Mikasa acompanha as provas com você.',
    },
    trabalho: {
      titulo: 'Nenhum projeto ainda.',
      texto: 'Separe o que é trabalho do resto da sua vida.',
    },
    habitos: {
      titulo: 'As pequenas coisas do dia.',
      texto: 'Beber água, ler, dormir cedo. Escolha uma para começar.',
    },
    pessoas: {
      titulo: 'Quem importa para você.',
      texto: 'Datas, lembretes e momentos. Totalmente opcional.',
    },
    vida: {
      titulo: 'Ainda estamos nos conhecendo.',
      texto:
        'Conforme você registrar seus dias, o Mikasa começa a mostrar como as coisas se conectam.',
    },
    lembretes: {
      titulo: 'Nenhum lembrete configurado.',
      texto: 'Você escolhe o que quer lembrar, e a que horas.',
    },
  },

  // ── Check-in ───────────────────────────────────────────────────────────────
  checkin: {
    pergunta: 'Como você está hoje?',
    perguntaEnergia: 'Como está sua energia?',
    perguntaNota: 'Quer deixar uma nota para você mesmo?',
    placeholderNota: 'Hoje estou cansado, mas quero treinar.',
    obrigado: 'Anotado.',
    jaFeito: 'Você já fez seu check-in hoje.',
  },

  humor: ['Péssimo', 'Não muito bem', 'Normal', 'Bem', 'Muito bem'],
  energia: ['Baixa', 'Normal', 'Alta'],

  // ── Erros, em português de gente ───────────────────────────────────────────
  erro: {
    generico: 'Não conseguimos concluir isso agora. Tente novamente.',
    rede: 'Parece que você está sem conexão.',
    redeVoltou: 'Conexão restaurada.',
    sessao: 'Sua sessão expirou. Entre novamente.',
    naoEncontrado: 'Não encontramos o que você procurava.',
    semPermissao: 'Isso não está disponível para você.',
  },
} as const;

/** Resumo do dia na Home. Conta o que existe, sem adjetivo. */
export function resumoDoDia(quantidade: number): string {
  if (quantidade === 0) return 'Hoje está livre.';
  if (quantidade === 1) return 'Você tem uma coisa importante hoje.';
  if (quantidade <= 3) return `Hoje está tranquilo. Você tem ${quantidade} coisas importantes.`;
  return `Você tem ${quantidade} coisas importantes hoje.`;
}
