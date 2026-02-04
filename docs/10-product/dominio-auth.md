---
id: dominio-auth
title: "Autenticação e Usuários"
description: "Gerenciamento de identidade, sessões e controle de acesso (RBAC) no Dindinho."
audience: ["dev", "user"]
visibility: "público"
status: "em-progresso"
owners: ["engineering"]
tags: ["auth", "segurança", "usuários"]
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

Referência no [schema.prisma](../../backend/prisma/schema.prisma):

- `User`: Entidade central com dados de perfil e hash de senha (Argon2).
- `RefreshToken`: Armazena tokens de atualização em formato binário para segurança e performance.
- `SignupAllowlist`: Tabela de pré-autorização para novos cadastros durante o MVP.
- `Waitlist`: Registro de interessados que ainda não possuem acesso.

**Roles (Enum):**

- `VIEWER`: Acesso apenas para leitura.
- `EDITOR`: Pode criar e editar transações/contas.
- `ADMIN`: Acesso total, incluindo gestão de usuários e sistema.

### Integração e API

- **Endpoints**: Verifique `/auth/*` e `/users/*` na [Referência de API](../30-api/openapi.json).
- **Segurança**: Uso de JWT (Short-lived) e Refresh Tokens (Long-lived, Database-backed).
- **Contratos**: Schemas Zod definidos em `packages/shared/src/schemas/auth.schema.ts`.

## 🔗 Links Úteis

- [Configuração de Segurança](../../backend/src/plugins/auth.ts)
- [Auth Guard (Frontend)](../../frontend/src/app/guards/auth.guard.ts)
