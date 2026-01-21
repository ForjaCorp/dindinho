# Padrões de Código - Dindinho

## Visão Geral

- Monorepo com npm workspaces e orquestração via Turbo
- Frontend: Angular (standalone) + PrimeNG + Tailwind
- Backend: Fastify + Prisma + Zod (schemas compartilhados)

## Estrutura do Projeto

### Frontend (`/frontend`)

- `src/app` - Configuração e shell da aplicação
- `src/pages` - Páginas (rotas)
- `src/environments` - Configuração por ambiente
- `src/main.ts` - Ponto de entrada
- `src/styles.css` - Estilos globais

### Backend (`/backend`)

- `src` - App e módulos de domínio
- `src/lib` - Infra compartilhada (ex: prisma)
- `prisma` - Schema e migrações
- `prisma.config.ts` - Configuração do Prisma
- `.env` - Variáveis de ambiente (não commitar segredos)

### Shared (`/packages/shared`)

- Schemas/DTOs usados por frontend e backend (`@dindinho/shared`)

## Convenções de Nomenclatura

### Frontend

- **Componentes de Página**: `nome-da-pagina.page.ts` (ex: `login.page.ts`, `dashboard.page.ts`)
- **Componentes Reutilizáveis**: `nome-do-componente.component.ts` (ex: `header.component.ts`)
- **Testes**: `nome-do-arquivo.spec.ts` (ex: `dashboard.spec.ts`)
- **Componente Raiz**: `app.ts`
- **Rotas**: `app.routes.ts`
- **Configuração**: `app.config.ts`

### Backend

- **Arquivos de Configuração**: `nome.config.ts` (ex: `prisma.config.ts`)
- **Arquivos de Serviço**: `nome.service.ts`
- **Arquivos de Rota**: `nome.routes.ts`
- **Arquivos de Modelo**: `nome.model.ts`

### Nomes de Arquivos

- **Componentes Angular**: `nome-do-componente.component.ts`
- **Componentes de Página**: `nome-da-pagina.page.ts` (para routing components)
- **Serviços**: `nome-do-servico.service.ts`
- **Testes**: `nome-do-arquivo.spec.ts`
- **Estilos**: `nome-do-componente.css`

## Convenções de Código

### Frontend

- **Componentes**: Usar a sintaxe de componentes standalone do Angular
- **Serviços**: Usar `providedIn: 'root'` para serviços globais
- **Estados**: Usar Signals para gerenciamento de estado reativo
- **Testes**: Usar `data-testid` para selecionar elementos nos testes
- **Rotas**: Preferir `loadComponent` em páginas para manter bundles menores
  - Evitar importar módulos pesados no app-shell quando não necessários

### Backend

- **Banco de Dados**: Usar Prisma como ORM
- **Variáveis de Ambiente**: Usar `process.env` através do `dotenv`
- **Tipagem**: Usar TypeScript estrito
- **Erros**: Usar classes de erro personalizadas para diferentes tipos de erros

### Monorepo e Scripts

- Rodar tarefas no root via Turbo: `npm run dev`, `npm run build`, `npm run lint`, `npm run test`
- No backend, gerar Prisma Client antes do typecheck/build: `npm run prisma:generate`

### Dependências e Segurança

- `npm audit` deve ficar em 0 vulnerabilities no root
- Para vulnerabilidades transitivas sem upgrade compatível, usar `overrides` no root
- Evitar `--force`/`--legacy-peer-deps` como solução permanente

### Tipos e Interfaces

- Usar `interface` para definir contratos
- Nomes em PascalCase: `interface UserData { ... }`
- Prefixar tipos com `I` apenas em casos específicos (ex: quando implementar padrões como Strategy)

### Variáveis e Funções

- **camelCase** para variáveis e funções: `const userData`, `function calculateTotal()`
- **PascalCase** para classes e componentes: `class UserService`, `@Component()`
- **UPPER_CASE** para constantes: `const MAX_ITEMS = 10`

## Testes

- Nomes descritivos em português: `it('deve exibir o saldo corretamente', ...)`
- Usar `data-testid` para selecionar elementos nos testes
- Um `describe` por arquivo de teste quando fizer sentido
- Organização sugerida:

```typescript
describe("Componente", () => {
  beforeEach(() => {
    // setup
  });

  it("deve fazer algo", () => {
    // teste
  });
});
```

### Framework de testes

- Frontend: `ng test --watch=false` (Vitest via builder) e specs em `vitest`
- Backend: Vitest (`vitest run` no workspace)

### Console nos testes

- Evitar ruído no output: quando o teste exercita cenários de erro, stub de `console.error`/`console.warn`

### Convenção de data-testid

- Usar kebab-case: `user-avatar`, `transaction-list`
- Prefixar com o nome do componente quando necessário: `dashboard-user-menu`
- Ser específico: `submit-button` em vez de apenas `button`

## Documentação

### JSDoc

- Meta: cobertura alta de documentação em APIs públicas, contratos e fluxos críticos
- Documentar 100% do código raramente é custo-efetivo e tende a virar ruído/desatualizar
- Documentar sempre:
  - Funções/classes exportadas usadas por outros módulos
  - Serviços e rotas (o “contrato” de entrada/saída e erros)
  - Lógicas não óbvias (invariantes, edge-cases, decisões e trade-offs)
  - Efeitos colaterais e expectativas (ex: escreve em storage, cache, rede)
- Evitar documentação redundante:
  - Getters triviais, mapeamentos óbvios, wrappers sem lógica
  - Repetir o que a assinatura e os tipos já deixam claro
- Incluir `@param`, `@returns` e `@example` quando aplicável
- Manter a documentação em português

### Exemplo de Documentação

```typescript
/**
 * Calcula o total com base nos itens fornecidos.
 * @param items - Array de itens com valor numérico
 * @returns O valor total da soma dos itens
 * @example
 * const total = calculateTotal([{ value: 10 }, { value: 20 }]);
 * // Retorna: 30
 */
function calculateTotal(items: { value: number }[]): number {
  return items.reduce((sum, item) => sum + item.value, 0);
}
```

## Estilo de Código

- Manter consistência com o formatter/linter do pacote
- Frontend: aspas simples (`'`) (prettier) e componentes standalone
- Backend/Shared: seguir a configuração do TypeScript/formatter do pacote
- Ponto e vírgula ao final das instruções
- 2 espaços para indentação
- Chaves na mesma linha da declaração
- Espaço após palavras-chave: `if (condition) {`

## Commits

- Mensagens em português
- Formato: `tipo: descrição breve`
- Tipos: feat, fix, docs, style, refactor, test, chore
- Exemplo: `feat: adiciona autenticação de usuário`

## Linting e Formatação

- Usar ESLint e Prettier configurados
- Corrigir todos os avisos do linter
- Formatar o código antes de cada commit

## IDE

- Usar o TypeScript do workspace para evitar falsos erros de resolução de módulos
- Configuração recomendada: [.vscode/settings.json](file:///home/vinicius/dev/dindinho/.vscode/settings.json)
