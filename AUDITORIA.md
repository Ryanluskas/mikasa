# Relatório de auditoria — Mikasa

Data: 7 de setembro de 2026
Escopo: aplicação inteira (banco, API, autenticação, interface, build).

Este documento existe porque o Mikasa guarda informação financeira, rotina,
relacionamentos e registros de como a pessoa está se sentindo. Um problema aqui
não é um bug de produtividade.

**Não há nenhuma afirmação de que a aplicação é "100% segura".** Nenhuma
aplicação complexa deveria receber essa garantia. O que existe abaixo é o que
foi feito, o que foi encontrado e o que continua em aberto.

---

## 1. Postura adotada

### Autenticação

| Item | Decisão |
| --- | --- |
| Hash de senha | `scrypt` (`node:crypto`), N=32768, r=8, p=1, salt de 16 bytes por senha |
| Parâmetros | Gravados dentro do próprio hash, para poderem ser aumentados sem invalidar senhas existentes |
| Comparação | `timingSafeEqual` — nunca `===` |
| Sessão | Token opaco aleatório de 32 bytes; o banco guarda apenas o SHA-256 |
| Logout | Revoga a sessão no banco. Um token copiado antes do logout para de funcionar |
| Troca de senha | Exige a senha atual e revoga **todas** as outras sessões |
| Cookie | `HttpOnly`, `SameSite=Lax`, `Secure` em produção, com expiração |
| Enumeração de usuários | Login responde igual e **gasta o mesmo tempo** para e-mail inexistente e senha errada (`fakeVerifyDelay`) |

**Por que token opaco e não JWT:** logout precisa ser real. Com JWT
autocontido não há como revogar antes do vencimento. O mesmo token funciona
como `Authorization: Bearer`, então um futuro app mobile usa esta API sem um
segundo sistema de autenticação.

### Isolamento de dados

Esta foi a prioridade máxima. A regra, aplicada sem exceção:

```ts
// leitura
findFirst({ where: { id, userId } })

// escrita
updateMany / deleteMany ({ where: { id, userId } })
```

O `userId` entra no **mesmo `where`** da consulta — nunca é verificado depois,
em JavaScript. Isso elimina a janela entre "ler" e "checar dono", e faz com que
um ID de outra conta simplesmente não encontre nada.

Escritas usam `updateMany`/`deleteMany` mesmo para um único registro, porque
`update({ where: { id } })` não aceita filtrar por dono na mesma operação.

Recursos cobertos: tarefas, eventos, metas, etapas de meta, transações,
orçamentos, treinos, exercícios, matérias, provas, sessões de estudo, projetos,
lembretes, relacionamentos, hábitos, registros de hábito, check-ins, insights,
perfil e preferências de módulo.

**404, e não 403.** Responder 403 confirmaria que o ID existe e pertence a
outra pessoa. Para quem não é dono, o recurso não existe.

**Mass assignment.** Campos como `projectId` e `subjectId` são verificados
contra a conta do requisitante antes de criar o vínculo. Sem isso, mandar o ID
de um projeto alheio criaria uma ligação entre contas.

### Validação

Toda entrada passa por Zod (`src/lib/validation.ts`) antes de tocar no banco:
valores, datas, IDs, textos com teto de tamanho, categorias como listas
fechadas. Dado inválido vira **422 com mensagem humana**; corpo malformado
também. Stack trace nunca atravessa a resposta.

### Dinheiro

Valores monetários são **inteiros em centavos**, sem exceção. Não existe soma
monetária em ponto flutuante no código.

A conversão do texto digitado (`parseCents`) opera sobre os **dígitos**, não
sobre um `Number`: `Math.round(1.005 * 100)` devolve `100`, porque `1.005` não
existe em ponto flutuante. Trabalhando com o texto, o arredondamento acontece
onde deve. Coberto por testes.

### Rate limiting

Persistido no banco (tabela `RateLimit`), e não em memória: um limitador em
memória some a cada deploy e não vale nada com mais de uma instância —
exatamente o cenário em que a força bruta funcionaria.

- Login: 8 tentativas / 15 min, em **dois baldes** (por dispositivo e por conta)
- Cadastro: 5 / hora
- Troca de senha e exclusão de conta: mesma regra do login

Falha aberta de propósito: se a tabela estiver indisponível, ninguém fica
impedido de entrar por causa disso.

### Headers e CSP

`X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`,
`Permissions-Policy` e `Strict-Transport-Security` (só em produção).

A CSP é montada por requisição, com nonce novo, no middleware.

### Privacidade

- **Exportar tudo**: JSON completo da conta, sem hash de senha e sem tokens de
  sessão — são credenciais, não conteúdo, e um arquivo baixado é fácil de vazar.
- **Excluir conta**: exige senha atual **e** a palavra `EXCLUIR` digitada.
  O `onDelete: Cascade` do schema leva junto absolutamente tudo. Não guardamos
  cópia "por precaução".
- **Camada de vida desligável**: quem não quer ser observado não é.
- **Logs**: nunca registram senha, token, cookie ou valores financeiros.

---

## 2. Problemas encontrados e corrigidos

Todos foram encontrados durante esta auditoria, por testes automatizados ou
inspeção no navegador.

### ALTO — CSP bloqueava o próprio script do aplicativo

**Sintoma:** o tema escuro não era aplicado. O console mostrava
`Executing inline script violates the following Content Security Policy`.

**Causa raiz:** a CSP incluía `'strict-dynamic'`, que **desliga o allowlist por
host**. Com ele presente, nem `'self'` vale — os arquivos servidos pelo próprio
Mikasa passavam a ser bloqueados.

**Correção:** `'strict-dynamic'` removido. `'strict-dynamic'` existe para quem
precisa liberar vários CDNs de terceiros; o Mikasa não carrega script de fora
do próprio domínio, então `'self'` + nonce já é o mais estrito possível. Os
scripts inline que o Next gera continuam recebendo nonce automaticamente.

O script de tema virou um arquivo estático (`public/tema.js`) em vez de inline —
assim não precisa de nonce, não torna toda página dinâmica e não gera aviso de
hidratação no React.

### ALTO — data inválida derrubava a rota com 500

**Sintoma:** `POST /api/events` com `startAt: "não é uma data"` respondia
**500** em vez de 422.

**Causa raiz:** os refinamentos de objeto do Zod rodam **mesmo quando um campo
individual já falhou**. Com `startAt` inválido, o refinamento chamava
`.getTime()` num valor que não era `Date` e lançava `TypeError`.

**Correção:** cada refinamento cruzado confirma o tipo antes de comparar. O erro
do campo em si já foi registrado pelo schema de data, então o refinamento só
não pode explodir.

**Encontrado por:** `tests/isolamento.test.ts` → *"data inválida não derruba o
servidor"*.

### MÉDIO — perda de centavos na leitura de valores

**Sintoma:** `parseCents('1,005')` devolvia `100` em vez de `101`.

**Causa raiz:** `Math.round(1.005 * 100)` = `100`, porque o valor realmente
armazenado é `1.00499999999999989`.

**Correção:** conversão feita sobre os dígitos do texto, sem multiplicação em
float.

**Encontrado por:** `tests/dinheiro.test.ts`.

### MÉDIO — o app cobrava uma conta recém-criada

**Sintoma:** uma conta nova, sem nenhum registro, recebia o aviso
*"Faz alguns dias que você não registra nada"*.

**Causa raiz:** o detector de ausência contava dias sem registro sem verificar
se algum dia já houve registro.

**Correção:** o achado só aparece para quem já registrou alguma coisa na janela.
Cobrar de alguém algo que a pessoa nunca começou é o oposto do tom do produto.

**Encontrado por:** `tests/vida.test.ts`.

### MÉDIO — o servidor de teste sobrevivia à suíte no Windows

**Sintoma:** `npm run build` falhava com `EPERM ... query_engine-windows.dll`
depois de rodar os testes.

**Causa raiz:** no Windows o `next start` roda dentro de um shell; matar o
processo pai deixava o servidor real vivo, segurando o banco e a DLL do Prisma.

**Correção:** `taskkill /T /F` na árvore de processos.

### BAIXO — legenda descrevia uma métrica e a barra media outra

**Sintoma:** a Home mostrava *"1 de 2 etapas"* ao lado de uma barra em **59%**.

**Causa raiz:** a legenda caía no ramo de etapas quando a meta tinha
`targetValue`, mas a barra calculava pelo valor.

**Correção:** a legenda passou a cobrir os três casos, na mesma ordem em que a
barra decide.

### BAIXO — metas sem prazo apareciam antes das com prazo

**Causa raiz:** o SQLite ordena `NULL` primeiro em `ORDER BY ... ASC`.

**Correção:** `orderBy: { deadline: { sort: 'asc', nulls: 'last' } }`.

### BAIXO — nome do dia com capitalização errada

**Sintoma:** *"Segunda-Feira"* em vez de *"Segunda-feira"*.

**Causa raiz:** a classe `capitalize` do Tailwind capitaliza **cada palavra**.

**Correção:** `first-letter:uppercase`.

---

## 3. Testes realizados

```
Test Files  4 passed (4)
     Tests  51 passed (51)
```

| Arquivo | O que cobre |
| --- | --- |
| `tests/isolamento.test.ts` | 18 testes de integração contra o servidor real |
| `tests/dinheiro.test.ts` | 11 testes de precisão monetária |
| `tests/vida.test.ts` | 12 testes da camada de vida |
| `tests/recorrencia.test.ts` | 10 testes de eventos recorrentes |

**Os testes de isolamento sobem o Mikasa de verdade** (`next start` com banco
próprio) e fazem requisições HTTP reais, passando por middleware, cookie, rota
e banco. Um teste que chamasse a função interna não provaria o que precisa ser
provado.

O que eles verificam, entre outros:

- Bruno **não** lê, altera ou apaga tarefa, meta, transação, evento, treino,
  hábito ou pessoa da Ana — sempre 404
- Bruno **não** pendura tarefa no projeto da Ana (mass assignment)
- Bruno **não** acrescenta etapa na meta da Ana
- Listagens e resumo financeiro não vazam entre contas
- A exportação de dados do Bruno não contém nada da Ana, nem `passwordHash`
- Login com senha errada e com e-mail inexistente devolvem **exatamente** a
  mesma resposta
- Logout revoga a sessão: o token antigo devolve 401
- O cookie é `HttpOnly` e `SameSite`
- Erro nunca expõe stack trace nem caminho de `node_modules`

Na camada de vida, a maioria dos testes verifica o **silêncio**: com 3 dias de
check-in, ou com um grupo de menos de 4 dias, nenhum padrão pode ser afirmado.
Há também um teste que varre todos os achados gerados e falha se algum texto
contiver `porque`, `causa`, `faz com que`, `provoca` ou vocabulário clínico.

### Verificação manual no navegador

Testado em 375×812 (mobile) e 1280×820 (desktop), nos dois temas: entrar,
Home, Hoje, Vida, navegação inferior e sidebar, e o console limpo de erros da
aplicação.

### Comandos

```bash
npm run lint        # ✔ sem avisos ou erros
npm run typecheck   # ✔ sem erros
npm test            # ✔ 51 testes
npm run build       # ✔ compila
```

---

## 4. Riscos e limitações que permanecem

Nomeados de propósito, em vez de omitidos.

### O middleware não é segurança

O middleware redireciona quem não tem cookie, mas roda no Edge e **não fala com
o banco** — ele só sabe que existe um cookie, não se ele é válido. A
verificação real acontece em `exigirUsuario`/`exigirUsuarioApi`, junto do acesso
aos dados. Isso está correto, mas é uma armadilha para quem for mexer no código
depois: **não adicione uma rota protegida só à lista do middleware.**

### Não há recuperação de senha

Quem esquecer a senha perde o acesso. Implementar isso exige envio de e-mail
(tokens de uso único, com expiração, sem nunca reenviar a senha existente) e
essa infraestrutura não faz parte desta entrega.

### Não há verificação de e-mail

Qualquer endereço pode ser cadastrado sem confirmação.

### Não há segundo fator

### Rate limiting depende de headers de proxy

O identificador usa `x-forwarded-for`, que pode ser forjado. Ele é apenas
hasheado e usado como chave de balde — **nunca como decisão de autorização** —
mas atrás de um proxy mal configurado o limite fica menos eficaz. O balde por
conta (que não depende de IP) continua valendo.

### SQLite como banco padrão

O schema usa SQLite para que o projeto rode sem instalar nada. Serve bem para
desenvolvimento e para um único usuário, mas **não** para produção com
concorrência. Para migrar: trocar `provider` para `"postgresql"` em
`prisma/schema.prisma`, ajustar `DATABASE_URL` e gerar a migração. O código da
aplicação não muda — nenhuma query usa SQL específico de dialeto.

### Sem backup automatizado

A infraestrutura de backup depende de onde o projeto for hospedado. Com
PostgreSQL gerenciado (Neon, Supabase, RDS) o backup vem do provedor e deve ser
**testado restaurando**, não apenas configurado.

### Notificações push não implementadas

O modelo `Reminder` e as *quiet hours* existem no banco e na interface, mas não
há entrega de push. O backend está estruturado para receber isso depois.

### Sem `.exe` / Tauri nesta versão

O terceiro prompt pede explicitamente **web primeiro**, e diz para não
implementar Tauri/Electron agora. Foi seguido. A arquitetura
(cliente → API → banco) mantém esse caminho aberto: um empacotamento futuro
consumiria a mesma API, sem credencial administrativa dentro do cliente.

### Dependência de imagem sem otimização de tamanho

A ilustração da marca é um PNG de ~1 MB em `public/brand/`. Os ícones gerados
são bem menores, e o `next/image` redimensiona no uso — mas o arquivo original
podia ser um WebP.

---

## 5. Decisões técnicas que valem registro

**Por que o `'strict-dynamic'` saiu da CSP.** Ver seção 2. Resumo: ele parece
mais rígido, mas desliga o allowlist por host e quebra os arquivos do próprio
app. Com apenas `'self'` no allowlist, ele não agregava nada.

**Por que dinheiro nunca é float.** Ver seção 1 e `src/lib/money.ts`.

**Por que a camada de vida guarda os achados no banco.** Para que o usuário
possa dispensar um card e ele não volte no dia seguinte. `dismissedAt` é
preservado quando o conteúdo do achado é atualizado.

**Por que a autorização usa 404 e não 403.** Ver seção 1.

**Por que os testes sobem o servidor de verdade.** Ver seção 3.

**Por que o script de tema é síncrono e bloqueante.** Se carregasse de forma
assíncrona, o navegador pintaria a tela clara antes de saber que o usuário
escolheu tema escuro. A regra do ESLint foi desabilitada **pontualmente, nessa
linha, com a razão escrita ao lado** — e não globalmente.

---

## 6. Como preparar produção

1. **Banco**: trocar `provider` para `"postgresql"` no schema, apontar
   `DATABASE_URL` para o servidor gerenciado e rodar `npx prisma migrate deploy`.
2. **Segredo**: gerar `AUTH_SECRET` novo, com no mínimo 32 caracteres. Nunca
   reaproveitar o de desenvolvimento.
3. **HTTPS obrigatório**: o cookie de sessão só recebe `Secure` quando
   `NODE_ENV=production`, e o HSTS só é enviado nesse caso.
4. **`NEXT_PUBLIC_APP_URL`**: apontar para o domínio real.
5. **Build**: `npm run build && npm start`.
6. **Antes de publicar**: `npm run lint && npm run typecheck && npm test`.
7. **Backups**: configurar **e testar uma restauração**.
8. **Nunca** versionar o `.env`. O `.gitignore` já cobre isso, e o
   `.env.example` documenta as variáveis sem valores reais.
