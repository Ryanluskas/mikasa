<div align="center">
  <img src="public/icon-192.png" width="88" alt="" />

  # Mikasa

  **Sua vida é complexa. Sua organização não precisa ser.**

  Finanças, treinos, estudos, trabalho, metas e rotina em um único lugar —
  e, principalmente, como tudo isso se conecta.
</div>

---

## O que o Mikasa é

Existem centenas de aplicativos que anotam quanto você gastou. Existem
centenas que anotam que você treinou. O Mikasa reúne essas áreas num lugar só,
mas não é isso que ele faz de diferente.

O diferencial é a **camada de vida**: a parte que olha para todas as áreas
juntas e responde a pergunta que nenhum app isolado consegue responder —

> **"Como essas coisas estão afetando a minha vida como um todo?"**

Na prática, é isso:

> **Sono e disposição andam juntos**
> Você costuma marcar mais energia nos dias em que dormiu mais.
> *Observado em 18 dias com sono e energia registrados.*

> **Dias cheios deixam menos espaço**
> Nos dias com três ou mais compromissos, você conclui menos tarefas do que nos
> dias mais livres. Talvez valha colocar menos coisas nesses dias.
> *Observado em 9 dias cheios e 14 dias comuns.*

> **Pessoas ficou de lado**
> Faz 21 dias que você não registra nada nessa área. Não é cobrança — às vezes
> é só a fase. Mas ficou fora do seu equilíbrio.
> *Observado em 30 dias.*

### Três regras que a camada de vida nunca quebra

1. **Amostra mínima.** Nenhum padrão aparece antes de haver dias suficientes.
   Duas observações não são um padrão, são duas observações.
2. **Nunca causalidade.** O texto diz *"nos dias em que"*, jamais *"porque"*.
   O Mikasa mostra o que apareceu junto; a conclusão é sua.
3. **Sempre a base.** Todo achado carrega, visível na tela, em quantos dias ele
   se apoia. Um padrão sem denominador é um palpite disfarçado.

E, quando não há dado suficiente, o app **diz que não há** — em vez de inventar
um número bonito. Existe uma seção chamada *"O que o Mikasa ainda não sabe"*.

O código dessa parte está em [`src/lib/life/`](src/lib/life/), dividido em
sinais (`signals.ts`), conexões (`correlate.ts`), equilíbrio (`balance.ts`) e a
leitura final (`engine.ts`).

---

## O que tem dentro

| Área | O que faz |
| --- | --- |
| **Início** | O resumo do seu dia. Muda conforme as áreas que você ligou. |
| **Hoje** | Eventos, tarefas, treinos, provas e hábitos numa lista só, em ordem de relógio. |
| **Vida** | A camada que conecta tudo: retrato da semana, padrões, equilíbrio. |
| **Agenda** | Calendário com visões de mês, semana e dia, e eventos recorrentes. |
| **Financeiro** | Entradas, gastos, categorias, orçamento mensal e comparação com o mês anterior. |
| **Treinos** | Academia, jiu-jitsu, muay thai, corrida. Séries, cargas e evolução. |
| **Estudos** | Matérias, provas e sessões de estudo. |
| **Trabalho** | Hoje / Esta semana / Projetos, separado do resto da vida. |
| **Metas** | Financeiras ou não, com etapas e progresso. |
| **Hábitos** | Consistência dos últimos 14 dias, sem virar competição. |
| **Pessoas** | Datas importantes e cadência de contato. 100% opcional. |
| **Check-in** | Duas perguntas por dia. É o que dá sentido a todo o resto. |
| **Perfil** | Tema, áreas ativas, silêncio, exportar dados, excluir conta. |

Cada área é ligável e desligável. Quem não usa financeiro nunca vê saldo — nem
na Home, nem na navegação, nem no botão "+".

---

## Rodando o projeto

Requisitos: **Node 20+**.

```bash
git clone <url-do-repositorio>
cd mikasa
npm install
cp .env.example .env
```

Abra o `.env` e gere um segredo de sessão:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Cole o resultado em `AUTH_SECRET`. Depois:

```bash
npm run db:push     # cria o banco
npm run db:seed     # opcional: 6 semanas de dados de exemplo
npm run dev
```

Abra <http://localhost:3000>.

Se você rodou o seed, entre com:

```
e-mail: exemplo@mikasa.app
senha:  exemplo-mikasa-2026
```

### Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm start` | Sobe o build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm test` | Testes (inclui os de isolamento entre contas) |
| `npm run db:push` | Aplica o schema no banco |
| `npm run db:seed` | Popula com dados de exemplo |
| `npm run db:studio` | Abre o Prisma Studio |

---

## Como o projeto é organizado

```
src/
  app/
    (auth)/          entrar, criar conta
    (app)/           o aplicativo — protegido pelo layout
    api/             a API REST, consumível também por um app mobile
    page.tsx         landing page
  components/
    ui/              o design system (Button, Field, Sheet, Card…)
    shell/           navegação e o botão "+"
    life/            os componentes da camada de vida
    <area>/          componentes de cada área
  lib/
    auth/            senha, sessão e o portão único de autorização
    life/            sinais, conexões, equilíbrio, leitura
    money.ts         centavos inteiros — nunca float
    voice.ts         todas as frases do Mikasa, num arquivo só
    validation.ts    todos os schemas Zod
prisma/
  schema.prisma      o banco
  seed.ts            dados de exemplo
tests/               testes, com foco em isolamento entre contas
```

### Decisões que valem explicação

**A lógica não mora nos componentes.** A cadeia é
`UI → hooks/services → API → banco`. É o que permite um futuro app mobile
consumir exatamente a mesma API, sem reescrever regra de negócio.

**Dinheiro é sempre inteiro em centavos.** Nenhuma soma monetária acontece em
ponto flutuante em lugar nenhum do código. Até a conversão do texto digitado é
feita sobre os dígitos, não sobre um `Number` — veja
[`src/lib/money.ts`](src/lib/money.ts).

**A voz do produto está centralizada.** Todas as frases ficam em
[`src/lib/voice.ts`](src/lib/voice.ts). Isso não é organização por organização:
é o que impede o app de ter dez tons diferentes conforme quem escreveu a tela.

**Autorização acontece num lugar só.** Toda rota chama `exigirUsuarioApi`, e
todo acesso a recurso usa `where: { id, userId }` na mesma consulta. Detalhes
em [`src/lib/owned.ts`](src/lib/owned.ts).

---

## Segurança

O aplicativo guarda dinheiro, rotina, relacionamentos e como a pessoa está se
sentindo. A postura adotada está descrita em detalhe em
[**AUDITORIA.md**](AUDITORIA.md), incluindo o que foi corrigido, o que ficou de
fora e os riscos que permanecem.

Resumo:

- Senhas com **scrypt** (KDF da biblioteca padrão do Node), nunca em texto puro.
- Sessão por **token opaco**; o banco guarda só o SHA-256 dele. Logout revoga
  de verdade.
- Cookie `HttpOnly`, `SameSite=Lax`, `Secure` em produção.
- **Isolamento por usuário testado**: existe uma suíte que tenta, de propósito,
  acessar os dados de outra conta e exige 404.
- Toda entrada validada com **Zod** no servidor.
- **Rate limiting** persistido no banco em login, cadastro e troca de senha.
- Headers de segurança e **CSP com nonce por requisição**.
- Exportação completa dos dados e exclusão definitiva da conta.

Nenhuma aplicação complexa é "100% segura", e este README não vai afirmar isso.

---

## Preparado para virar aplicativo

A versão atual é **web**, e é assim de propósito: primeiro o produto precisa
funcionar bem no navegador do celular. Mas a arquitetura já está pronta para o
próximo passo.

- **PWA**: manifest, ícones (incluindo *maskable*), theme color e
  `display: standalone`. Instalável na tela inicial.
- **Mobile first**: desenhado para 390×844, testado de 360px a 1440px+.
- **API separada**: as rotas em `/api` não sabem que existe um front web. A
  autenticação aceita `Authorization: Bearer`, então um cliente Android/iOS usa
  a mesma API sem um segundo sistema de login.
- **Rotas pensadas para deep link**: `/hoje`, `/vida`, `/metas`, `/financeiro`.

Quando fizer sentido, o caminho (Capacitor, React Native ou PWA na Play Store)
será escolhido com base no projeto real — e não agora, sem necessidade.

---

## Identidade

A ilustração da marca fica em `public/brand/mikasa.png`. Para trocá-la:

```bash
# substitua o arquivo e regenere favicon, ícones PWA e apple-touch-icon
node scripts/gerar-icones.mjs
```

A paleta e a tipografia estão em [`tailwind.config.ts`](tailwind.config.ts) e
[`src/app/globals.css`](src/app/globals.css). Nenhum componente escreve
hexadecimal — sempre token, e é isso que faz o dark mode funcionar sem remendo.

---

## Filosofia

O Mikasa não tenta transformar ninguém numa pessoa perfeita, e não tenta
controlar a vida de ninguém. Ele existe para ajudar você a **enxergar** a sua.

Sem mensagens em caixa alta. Sem "VOCÊ PERDEU SUA SEQUÊNCIA". Sem moeda
virtual. Quando uma sequência termina, o app diz *"Sua sequência terminou. Tudo
bem. Vamos começar outra?"* — e quando você some por uns dias, ele diz
*"Bom te ver por aqui."*

**Organizar. Acompanhar. Evoluir.** Tudo de maneira leve.
