---
id: adr-0013-separacao-roles-permissoes
title: "ADR 0013: Separação de Papéis de Sistema e Permissões de Recurso"
description: "Introdução de SystemRole (Global) e ResourcePermission (Recurso) para garantir o princípio de menor privilégio e segurança granular."
audience: ["dev", "arquitetura"]
visibility: "interno"
status: "proposto"
owners: ["engineering"]
tags: ["arquitetura", "segurança", "rbac", "permissões"]
mvp: true
createdAt: "2026-02-06"
---

# ADR 0013: Separação de Papéis de Sistema e Permissões de Recurso

## Status

**Proposto** (Em discussão/Implementado)

## Contexto

Anteriormente, o sistema utilizava um único `enum Role` para definir tanto o acesso global (Admin) quanto o acesso a recursos específicos (Editor de uma conta). Essa ambiguidade permitia que um usuário com permissão de "Editor" em uma conta pudesse, acidentalmente, ter acesso a áreas administrativas do sistema, ou que um "Admin" do sistema tivesse acesso automático a dados privados de contas de terceiros sem um registro explícito de colaboração.

## Decisão

Adotamos a separação clara de responsabilidades através de dois enums distintos:

1.  **SystemRole (Global):** Define o nível de acesso do usuário ao ecossistema Dindinho.
    - `USER`: Acesso padrão às funcionalidades de usuário final (PWA).
    - `ADMIN`: Acesso ao Portal Administrativo e documentação técnica interna. **Não concede acesso automático a dados privados de outros usuários.**

2.  **ResourcePermission (Recurso):** Define o que um usuário pode fazer dentro de um recurso compartilhado (ex: uma Conta/Carteira).
    - `VIEWER`: Acesso apenas para leitura dos dados do recurso.
    - `EDITOR`: Permissão para criar e editar transações no recurso.
    - `OWNER`: Controle total sobre o recurso, incluindo exclusão e gestão de outros colaboradores.

### Implementação Técnica

- O `SystemRole` é armazenado na tabela `User` e incluído no payload do JWT para validação rápida em rotas administrativas.
- O `ResourcePermission` é gerenciado através da tabela `AccountAccess`, vinculando um `User` a um `Account`.
- O proprietário original de uma conta é identificado pela coluna `ownerId` na tabela `Account`, o que implicitamente concede a permissão de `OWNER`.

## Consequências

### Prós

- **Princípio de Menor Privilégio:** Usuários só possuem as permissões necessárias para as tarefas que realizam.
- **Segurança:** Isolação de dados privados mesmo contra usuários com perfil administrativo global.
- **Clareza Semântica:** Facilita o desenvolvimento e manutenção ao remover a ambiguidade sobre o que uma "role" representa.
- **Escalabilidade da Colaboração:** Prepara o terreno para o sistema de convites e compartilhamento multi-contas.

### Contras

- **Complexidade de Validação:** Exige que o backend verifique tanto a role global quanto a permissão específica do recurso em operações de escrita.
- **Migração de Dados:** Exigiu a atualização do schema do banco de dados e mapeamento de roles antigas para os novos enums.
