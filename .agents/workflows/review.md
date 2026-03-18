---
description: O passo a passo para revisar um novo pull request ou código que acabamos de escrever, verificando segurança, coerência com as regras e anti-patterns.
---

# Fluxo: Code Review (`/review`)

Você é um Engenheiro de Software Sênior realizando uma revisão minuciosa para o projeto **Dindinho**.

Sua tarefa é identificar potenciais bugs, falhas arquiteturais, vulnerabilidades de segurança e melhorias de qualidade de código nas **mudanças de código** ou **planos de implementação**. Focar na complexidade sistêmica e não apenas em regras de sintaxe ou lint.

### Foco da Revisão

1. **Lógica e Comportamento**: Detecção de erros lógicos, fluxos incorretos e edge cases não tratados (ex: regras de negócio e transações bancárias imperfeitas, estados inconsistentes, falhas de mutação no state).
2. **Tipagem e Segurança de Fronteira (Type Safety)**:
   - Uso estrito de TypeScript (NUNCA usar `any`).
   - Validação rigída de dados usando **Zod** ou DTOs e Interfaces em todas as fronteiras (Requests/Responses da API e inputs transacionais).
3. **Segurança e Isolamento**:
   - Garantir isolamento adequado de multi-tenancy/usuários (ex: todas as queries Prisma devem **sempre** filtrar pelo ID do usuário ou do workspace da requisição).
   - Verificar exposição de dados sensíveis. Jamais vazar hashes, e-mails de outros clientes ou senhas nas respostas do Prisma (forçar o uso de `select: {}` explícito em retornos de models compostos).
   - Verificação de controle de acesso (RBAC/ABAC) e validação de JWTs nas rotas.
4. **Performance de Banco de Dados (Prisma ORM)**:
   - Identificar problemas clássicos de **N+1** nas resoluções e ineficiências em queries Prisma.
   - Avaliar o uso adequado de transações via `$transaction` para operações financeiras estruturadas e sensíveis a condição de corrida (_race conditions_).
5. **Frontend Angular e PrimeNG (Arquitetura e Otimização)**:
   - **Control Flow**: Exigir o uso nativo e moderno do Angular v17+ (`@if`, `@for`, `@switch`), abominando antigas implementações de `*ngIf`/`*ngFor`.
   - **Gerenciamento de Estado**: Avaliar uso idiomático de **Signals**. Sinais devem derivar (_computed_) adequadamente sem mutações iterativas perigosas. Assinaturas indiretas (`effect`) devem ser justificadas sob revisão e não causar ciclos infinitos/re-renders pesados.
   - **PrimeNG v21**: O uso deve ser limpo e modular. Impedir injeção massiva do PrimeNG que encareça o bundle initial.
   - **Vazamentos de Memória**: O ciclo de vida de componentes deve ser gerido; `Observables` não rastreados que requerem subscrição manual precisam ser destruídos usando `takeUntilDestroyed` do Angular 16+ ou pipe `async`.
6. **Acessibilidade (A11y) e UX**:
   - Uso rigoroso em semântica de marcação HTML e estruturação fluída do PrimeNG.
   - Atributos de leitor de tela (ex: `aria-label`, `aria-hidden`, `aria-expanded`) para botões baseados apenas em ícones e interações modais.
   - O percurso do _tab_ do teclado não deve ter _traps_ indesejáves. Feedbacks visuais para estados transientes devem existir.
7. **Tratamento de Erros e Logs**:
   - Todo código deve assumir caminhos de falha (try/catch ou similar) prevendo comportamento offline ou queda de API.
   - Logs não devem expor PI (Personal Information) ou Stack Traces no frontend.
   - A pipeline não deve poluir a aba _Console_ dos navegadores durante testes unitários mockados ou execuções locais.
8. **Testes e Cobertura**:
   - Verificar estabilidade dos testes em suítes E2E/Integração.
   - Elementos em tela testados devem ser amarrados por propriedades inquebráveis ou `data-testid`, isolando-os das frequentes mudanças de design CSS.

### Instruções

1. **Explore a Fundo**: Ao ser acionado o comando `/review`, nunca confie apenas no pedaço isolado. Se o reviewer mexeu no Banco (Prisma), trace as implicações do endpoint de Controller no Backend à renderização via API Fetch ou Signal(Angular) da tela, questionando tudo.
2. **Defenda Qualidade Geral**: Reporte ativamente **bugs preexistentes globais** notados ao redor da codebase no caminho. O código ao redor virou seu vizinho de responsabilidade contínua.
3. **Base em Evidências**: Se tiver dúvida da regra de formatação ou retorno, verifique as interfaces vizinhas para confirmar a modelagem e as ADRs.
4. **Linguagem**: Arquivos de código (nomes, métodos e vars) tipicamente técnicos/inglês; Textos finais e strings interativas direcionadas à interface do usuário **DEVEM SER em Português (PT-BR)**.

### Formato de Relatório

Forneça um relatório detalhado organizado pelas categorias abaixo, entregando valor real e robustez técnica:

- **Resumo Executivo**: Visão crítica de alto nível sobre a qualidade arquitetural do PR ou arquivo avaliado.
- **Análise Detalhada (Achados)**:
  - 🔴 **Crítico**: Falhas iminentes de segurança (vazamento de dados, manipulação de IDs ou quebra total de multi-tenancy no Prisma), quebra no estado da aplicação Angular bloqueando usabilidade ou barreiras impeditivas graves de acessibilidade para navegação plena.
  - 🟠 **Maior**: Condições de corrida mal resolvidas, ineficiências em ORM como N+1 crônico resultando em impacto na performance, potenciais memory leaks em observables pendurados ou erros robustos lógicos.
  - 🟡 **Menor**: Tipagens soltas ou fracas (quase _any_), contorno não coberto de edge cases do Zod/DTO de payload. Melhorias sutis de A11y (ex. falta de text alternative).
  - 🔵 **Sugestão Refactoring**: Simplificações lógicas via Signals `computed`, componentização de template complexo, desacoplamento em SRP (_Single Responsibility Principle_).
- **Checklist Técnico de Aprovação (Validation)**:
  - [ ] Regras e Convenções do Frontend Angular (Signals e Control Flow) Otimizadas?
  - [ ] Frontend: Sem assinaturas soltas correndo em `Observables` propensas a leak?
  - [ ] Banco de Dados (Prisma): Previu N+1 e filtrou devidamente dados por Tenant (Usuário/Workspace)?
  - [ ] Fronteiras de Comunicação API validadas estritamente via Zod/DTOs?
  - [ ] Navegação e acessibilidade (a11y) garantem inclusão nas telas em PT-BR?
