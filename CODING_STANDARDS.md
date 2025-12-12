# Padrões de Código - Dindinho

## Estrutura do Projeto

### Frontend (`/frontend`)

- `/src`
  - `/app` - Configuração e componente raiz da aplicação
  - `/pages` - Componentes de página (ex: dashboard, login, etc.)
  - `index.html` - Ponto de entrada HTML
  - `styles.css` - Estilos globais
  - `main.ts` - Ponto de entrada da aplicação

### Backend (`/backend`)

- `/prisma` - Esquema do banco de dados e migrações
- `/src`
  - `server.ts` - Ponto de entrada da aplicação backend
- `prisma.config.ts` - Configuração do Prisma
- `.env` - Variáveis de ambiente

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
- **Arquivos de Rota**: `nome.router.ts`
- **Arquivos de Modelo**: `nome.model.ts`

### Nomes de Arquivos

- **Componentes Angular**: `nome-do-componente.component.ts`
- **Componentes de Página**: `nome-da-pagina.page.ts` (para routing components)
- **Serviços**: `nome-do-servico.service.ts`
- **Testes**: `nome-do-arquivo.spec.ts`
- **Estilos**: `nome-do-componente.css`

## Estrutura Detalhada

### Frontend (`/frontend`)

- `/src`
  - `/app` - Configuração e componente raiz da aplicação
  - `/pages` - Componentes de página (ex: dashboard, login, etc.)
  - `index.html` - Ponto de entrada HTML
  - `styles.css` - Estilos globais
  - `main.ts` - Ponto de entrada da aplicação

### Backend (`/backend`)

- `/prisma` - Esquema do banco de dados e migrações
- `/src`
  - `server.ts` - Ponto de entrada da aplicação backend
- `prisma.config.ts` - Configuração do Prisma
- `.env` - Variáveis de ambiente

## Convenções de Código

### Frontend

- **Componentes**: Usar a sintaxe de componentes standalone do Angular
- **Serviços**: Usar `providedIn: 'root'` para serviços globais
- **Estados**: Usar Signals para gerenciamento de estado reativo
- **Testes**: Usar `data-testid` para selecionar elementos nos testes

### Backend

- **Banco de Dados**: Usar Prisma como ORM
- **Variáveis de Ambiente**: Usar `process.env` através do `dotenv`
- **Tipagem**: Usar TypeScript estrito
- **Erros**: Usar classes de erro personalizadas para diferentes tipos de erros

### Tipos e Interfaces

- Usar `interface` para definir contratos
- Nomes em PascalCase: `interface UserData { ... }`
- Prefixar tipos com `I` apenas em casos específicos (ex: quando implementar padrões como Strategy)

### Variáveis e Funções

- **camelCase** para variáveis e funções: `const userData`, `function calculateTotal()`
- **PascalCase** para classes e componentes: `class UserService`, `@Component()`
- **UPPER_CASE** para constantes: `const MAX_ITEMS = 10`

### Testes

- Usar `data-testid` para selecionar elementos nos testes
- Nomes descritivos em português: `it('deve exibir o saldo corretamente', ...)`
- Um `describe` por arquivo de teste
- Organização dos testes:

  ```typescript
  describe('Componente', () => {
    // Configuração
    beforeEach(() => { ... });

    // Casos de teste
    it('deve fazer algo', () => { ... });
  });
  ```

## Documentação

### JSDoc

- Documentar todas as funções públicas, classes e métodos
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

- Usar aspas simples (`'`) para strings
- Ponto e vírgula ao final das instruções
- 2 espaços para indentação
- Chaves na mesma linha da declaração
- Espaço após palavras-chave: `if (condition) {`

## Commits

- Mensagens em português
- Formato: `tipo: descrição breve`
- Tipos: feat, fix, docs, style, refactor, test, chore
- Exemplo: `feat: adiciona autenticação de usuário`

## Padrões de Teste

- Usar `data-testid` para selecionar elementos
- Nomes de testes em português
- Um `expect` por teste quando possível
- Usar `describe` para agrupar testes relacionados

### Convenção de data-testid

- Usar kebab-case: `user-avatar`, `transaction-list`
- Prefixar com o nome do componente quando necessário: `dashboard-user-menu`
- Ser específico: `submit-button` em vez de apenas `button`

## Linting e Formatação

- Usar ESLint e Prettier configurados
- Corrigir todos os avisos do linter
- Formatar o código antes de cada commit
