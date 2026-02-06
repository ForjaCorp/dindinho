---
id: dominio-auth
title: "Autenticação e Usuários"
description: "Gerenciamento de identidade, sessões e controle de acesso (RBAC) no Dindinho."
audience: ["dev", "usuário"]
visibility: "público"
status: "em-progresso"
owners: ["engineering"]
tags: ["autenticação", "segurança", "usuários"]
mvp: true
createdAt: "2026-02-03"
---

# Autenticação e Usuários

Este domínio é o alicerce de segurança do Dindinho, garantindo que apenas usuários autorizados acessem seus dados financeiros e definindo o que cada um pode fazer através de papéis (Roles).

## 🎯 Objetivo

- Permitir que usuários criem contas e façam login de forma segura.
- Gerenciar sessões persistentes via Refresh Tokens.
- Controlar permissões de acesso (Leitor, Editor, Admin).
- Gerenciar a lista de espera (Waitlist) e convites (Signup Allowlist).

## 👥 Visão do Usuário (User Guide)

### Fluxos Principais

1.  **Cadastro e Login**: O usuário pode se cadastrar (se estiver na allowlist) e realizar login usando e-mail e senha.
2.  **Gestão de Perfil**: Alteração de nome, telefone e foto de perfil (avatar).
3.  **Segurança**: Logout de todos os dispositivos ou da sessão atual.

### Interface (PWA)

- **Páginas de Login/Cadastro**: Design focado em conversão e facilidade de uso.
- **Configurações de Conta**: Local centralizado para edição de dados pessoais.
- **Feedback Visual**: Mensagens claras de erro em caso de credenciais inválidas.

## 🛠️ Visão Técnica (Admin/Engineering)

### Modelo de Dados

Referência no [schema.prisma](../../../backend/prisma/schema.prisma):

- `User`: Entidade central com dados de perfil e hash de senha (Argon2).
- `RefreshToken`: Armazena tokens de atualização em formato binário para segurança e performance.
- `SignupAllowlist`: Tabela de pré-autorização para novos cadastros durante o MVP.
- `Waitlist`: Registro de interessados que ainda não possuem acesso.

**Níveis de Acesso (Tiers):**

O sistema utiliza dois enums distintos para garantir o princípio de menor privilégio:

1.  **SystemRole (Global):** Define o que o usuário é no ecossistema.
    - `USER`: Acesso padrão ao PWA e funcionalidades de usuário final.
    - `ADMIN`: Acesso ao Portal Administrativo, Documentação Interna e gestão global.
2.  **ResourcePermission (Recurso):** Define o que o usuário pode fazer em um recurso específico (ex: Conta).
    - `VIEWER`: Apenas leitura dos dados.
    - `EDITOR`: Pode criar e editar transações.
    - `OWNER`: Controle total, incluindo exclusão e gestão de colaboradores.

### Backend (Business Logic)

- **Auth Plugin**: `backend/src/plugins/auth.ts` gerencia JWT e RBAC.
- **Service**: `backend/src/modules/auth/auth.service.ts` contém a lógica de login/refresh.
- **Zod Schemas**: Contratos em `@dindinho/shared/src/schemas/auth.schema.ts`.

### Frontend (Integration)

- **AuthGuard**: Proteção de rotas em `frontend/src/app/guards/auth.guard.ts`.
- **Interceptador**: Injeção de JWT e tratamento de 401 (refresh automático).

## 🔗 Links Úteis

- [Referência de API](../../30-api/openapi.json)
- [Padrões de Segurança](../../20-arquitetura/padroes-backend.md)
