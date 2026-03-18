---
description: As regras e passos estruturais para criar e registrar uma nova camada, novo módulo ou novo pacote respeitando a arquitetura existente.
---

# Fluxo: Criação de Pacote e Módulos (`/create_package` e `/create_module`)

**Objetivo:** Instrução de boilerplates automatizados ou manuais para criação de workspaces e módulos padronizados.

1. **Para Criar um Pacote de Monorepo (Em `packages/*`):**
   - Todo pacote deverá possuir um `package.json` isolado que referencia `@dindinho/...` como seu nome.
   - Crie um arquivo para exportações, normalmente index.ts em um `src/` ou diretório root.
   - Espelhe (ou integre referências) scripts de typecheck do `@dindinho/shared` como `bash -c 'tsc --noEmit'`.
   - Assegure-se de que os tsconfigs herdem corretamente o fluxo desejado se for puro node type.
2. **Para Criar um Módulo Backend (Em `/backend`):**
   - Respeite as verticais comuns: Se cria-se uma rota separada, declare-a num arquivo `[nome].routes.ts`. Se cria-se a lógica separada baseia-se num `[nome].service.ts`.
   - Incorpore se necessário à configuração Zod compartilhada (`/packages/shared`).
3. **Para Criar Módulos / Páginas Frontend (Em `/frontend`):**
   - Prefira arquivos sufixados com `.component.ts` (reutilizáveis), `.page.ts` (páginas root) ou `.service.ts`.
   - Adicione suporte standalone component `standalone: true`.
   - Configure Lazy load correspondente em rotas Angular para o novo endpoint evitado quebra sistêmica do builder.
