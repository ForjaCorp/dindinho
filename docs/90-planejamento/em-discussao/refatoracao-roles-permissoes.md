---
id: refatoracao-roles-permissoes
title: "Refatoração de Roles e Permissões"
description: "Plano para separar roles de sistema (RBAC global) de permissões de recursos (contas compartilhadas)."
audience: ["dev", "arquitetura"]
visibility: "interno"
status: "em-andamento"
owners: ["engineering"]
tags: ["arquitetura", "segurança", "rbac", "refatoração"]
mvp: false
createdAt: "2026-02-05"
---

# Planejamento: Refatoração de Roles e Permissões

## 📝 Contexto e Problema

- **Cenário Atual**: O ecossistema Dindinho utiliza um único `enum Role` (VIEWER, EDITOR, ADMIN) tanto para níveis de sistema (acesso administrativo global) quanto para níveis de recurso (permissões dentro de uma conta específica).
- **Necessidade de Mudança**: Esta ambiguidade semântica impede o princípio de menor privilégio. Um usuário que é "Editor" de uma conta não deveria ter sua role global confundida com permissões administrativas do sistema (como acesso ao Docs Admin). Precisamos de uma separação clara entre "quem o usuário é no sistema" e "o que o usuário pode fazer em um recurso".

## 🚀 Proposta de Solução

- **Visão Geral**: Criar dois domínios distintos de autorização:
  1.  **SystemRole**: Define o papel global do usuário (USER, ADMIN).
  2.  **ResourcePermission**: Define a capacidade do usuário sobre um recurso/conta (VIEWER, EDITOR, OWNER).
- **Matriz de Permissões (ResourcePermission)**:
  - `VIEWER`: Visualização de saldos, transações e relatórios.
  - `EDITOR`: Tudo de Viewer + Criar/Editar/Excluir transações e categorias.
  - `OWNER`: Tudo de Editor + Convidar/Remover membros, editar detalhes da conta e excluir a conta.
- **Hierarquia de Sistema (SystemRole)**:
  - `USER`: Acesso padrão à plataforma.
  - `ADMIN`: Acesso ao Portal Administrativo, Documentação Interna e gestão global (sem acesso automático aos dados privados de outros usuários por padrão).
- **Alternativas Consideradas**: Manter o enum atual e adicionar prefixos (ex: `SYS_ADMIN`, `ACC_EDITOR`). No entanto, a separação em enums distintos no TypeScript e colunas distintas no banco de dados é mais robusta e evita erros de atribuição acidental.

## 🏗️ Impacto Técnico e Decisões de Design

- **Banco de Dados**:
  - Manteremos `Account.ownerId` como o dono legal da conta.
  - Adicionaremos `AccountAccess.permission` para gerenciar colaboradores.
  - O `ownerId` terá permissão implícita de `OWNER`, mas para consistência em queries de listagem, criaremos um registro em `AccountAccess` para o dono no momento da criação da conta.
- **API & JWT**:
  - O JWT passará a conter apenas o `systemRole`.
  - Permissões de recurso (`ResourcePermission`) serão validadas em tempo de execução via middleware, consultando a tabela `AccountAccess`.
- **Contratos (Shared)**:
  - Definição de enums nativos TypeScript no pacote `@dindinho/shared` para evitar dependência direta do Prisma no Frontend.

## 📅 Cronograma de Execução (Fases)

### Fase 1: Contratos e Shared Package

- [x] Definir `SystemRole` e `ResourcePermission` no `auth.schema.ts`.
- [x] Atualizar o `loginResponseSchema` para refletir a nova estrutura.
- **Critérios de Aceite**: O pacote `@dindinho/shared` exporta os novos enums e os tipos de resposta de login estão atualizados.

### Fase 2: Backend e Banco de Dados

- [x] Criar migração Prisma para alterar `User.role` e `AccountAccess.role`.
- [x] Implementar script de migração de dados (mapear ADMIN local para OWNER).
- [x] Atualizar middlewares de autorização para validar o domínio correto (System vs Resource).
- **Critérios de Aceite**: Banco de dados atualizado e testes de integração do backend passando com a nova estrutura.

### Fase 3: Frontend e UX

- [x] Atualizar `AuthService` e o signal de usuário logado.
- [x] Refatorar Guards de rota para usar `SystemRole`.
- [x] Atualizar componentes de UI (layouts de admin e dashboard) para validar permissões específicas.
- **Critérios de Aceite**: Navegação funcional e componentes administrativos visíveis apenas para `SystemRole.ADMIN`.

## 🏗️ Impacto Técnico

- **Banco de Dados**: Migração necessária para renomear enums e converter dados existentes na tabela `User` e `AccountAccess`.
- **API**: Mudança no contrato do objeto `user` retornado no login/me (quebra de contrato controlada).
- **Frontend**: Mudança na lógica de visibilidade de componentes e guards de rota.

## ✅ Definição de Pronto (DoD)

- [ ] Código testado (unitário/integração).
- [ ] Testes de Segurança: Validar que `SystemRole.ADMIN` não possui acesso a dados de `Account` sem um registro explícito em `AccountAccess`.
- [ ] Documentação atualizada (Tier User/Admin).
- [ ] Migração de dados executada com sucesso em ambiente de staging/desenvolvimento.
- [ ] Lint/Typecheck sem erros.
- [ ] Revisado por outro par.
