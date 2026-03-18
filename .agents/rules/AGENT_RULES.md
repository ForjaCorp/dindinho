# Regras do Assistente de IA - Projeto Dindinho

## 1. Comportamento e Postura
- **Seja Direto e Profissional:** Responda de forma objetiva, focada na resolução técnica.
- **Ações Destrutivas:** NUNCA execute refatorações massivas, deleção de arquivos críticos ou *drop* em banco de dados sem pedir confirmação explícita.
- **Contexto:** Lembre-se que este é um Monorepo com npm workspaces e orquestração via Turbo.

## 2. Idiomas Oficiais
- **Código-Fonte (variáveis, classes, funções):** Use Inglês (ex: `UserService`, `calculateTotal()`).
- **Comentários, JSDoc e Nomes de Testes:** 100% em Português-BR (PT-BR) (ex: `it('deve calcular o total')`, `/** Calcula o total... */`).
- **Respostas e Documentação:** Sempre em Português-BR (PT-BR). Emojis são permitidos para facilitar a leitura.
- **Commits:** Mensagens sempre em Português-BR, seguindo o padrão Conventional Commits (ex: `feat: adiciona autenticação`).

## 3. Qualidade de Código & Stack
- **Stack Principal:** Angular (Frontend), Hono/Fastify + Prisma (Backend), TurboRepo.
- **TypeScript:** Tipagem estrita é obrigatória. Evite `any` (use `unknown` se necessário).
- **Frontend (Angular):** Componentes standalone obrigatórios. Use Signals (`input()`, `output()`, `computed()`) em vez de decorators antigos e control flow nativo (`@if`, `@for`). Priorize TailwindCSS, CSS Modules ou PrimeNG (v21+, sem animações legadas).
- **Backend:** Retornos devem basear-se em contratos compartilhados (Zod) disponíveis em `@dindinho/shared`.
- **Boas Práticas:** Siga DRY e SOLID. Agrupe rotas e serviços mantendo o acoplamento baixo.

## 4. Padrões de Commit
- **Conventional Commits Obrigatório:** `tipo: descrição breve` (`feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`).
- Respeite os hooks de pré-commit do Husky (que executam `lint-staged` e formatação `prettier`).

## 5. Documentação e ADRs
- Toda nova escolha arquitetural de impacto deve ser registrada em um ADR em `docs/` ou seguindo as regras de `docs/90-backlog/planning/documentation.md`.
- Mantenha `README.md` e a documentação JSDoc em APIs públicas e rotas consistentes e claras.

## 6. Falhas e Debug
- **Prevenção de Loop de Erro:** Se testar uma solução ou comando 2 a 3 vezes sem sucesso, PARE.
- Gere um resumo do erro, cite o que foi tentado, liste os logs principais e peça instrução humana ou aprovação antes de tentar uma nova rota drástica.
