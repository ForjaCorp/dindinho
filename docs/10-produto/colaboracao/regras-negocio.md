---
id: dominio-colaboracao
title: "Domínio: Colaboração e Compartilhamento"
description: "Gestão de acessos compartilhados, convites entre usuários e permissões de visualização e edição em carteiras."
audience: ["dev", "usuário"]
visibility: "público"
status: "em-progresso"
owners: ["engineering"]
tags: ["colaboração", "convites", "compartilhamento"]
mvp: true
createdAt: "2026-02-03"
---

# Colaboração e Compartilhamento

O domínio de **Colaboração** transforma o Dindinho de uma ferramenta individual em uma plataforma compartilhada, permitindo que casais, famílias e grupos gerenciem suas finanças de forma conjunta e transparente.

## 🎯 Objetivo

- Facilitar a gestão financeira compartilhada sem a necessidade de dividir senhas.
- Garantir segurança e privacidade através de níveis de acesso controlados.
- Centralizar convites e permissões em um fluxo intuitivo de "Enviar e Aceitar".

## 👥 Visão do Usuário (User Guide)

### Fluxos Principais

1. **Convidar Colaborador**:
   - O dono da conta escolhe uma ou mais carteiras (ex: "Casa", "Viagem").
   - Define se o convidado pode apenas visualizar (`VIEWER`) ou também adicionar/editar transações (`EDITOR`).
   - Envia o convite informando o e-mail do colaborador.
2. **Aceitar Convites**:
   - O convidado visualiza uma notificação ou acessa a "Central de Convites".
   - Ao aceitar, as carteiras compartilhadas passam a aparecer em seu Dashboard automaticamente.
3. **Gerenciar Acessos**:
   - O dono da carteira pode remover colaboradores ou alterar permissões a qualquer momento.

### Interface (PWA)

- **Central de Convites**: Localizada nas configurações do perfil, lista convites pendentes, aceitos e enviados.
- **Indicadores de Compartilhamento**: Ícones nas carteiras indicam se ela é própria ou compartilhada, e qual o seu nível de acesso.

## 🛠️ Visão Técnica (Admin/Engineering)

### Modelo de Dados

O sistema utiliza três entidades principais para gerenciar a colaboração:

- `Invite`: Registro do convite pendente.
- `InviteAccount`: Detalhes das contas e roles vinculadas a um convite.
- `AccountAccess`: O registro definitivo de acesso após o aceite do convite.

**Invariantes:**

- Apenas o `OWNER` de uma conta pode gerar convites para ela.
- O e-mail do destinatário deve ser validado (mesmo que ele ainda não tenha conta no sistema).
- Convites expiram após 7 dias por segurança.

### Integração e API

- **Endpoints**:
  - `POST /api/invites`: Criação de convites.
  - `GET /api/invites/pending`: Listagem para o destinatário.
  - `PATCH /api/invites/:id`: Aceite ou rejeição (via campo `status`).
  - `DELETE /api/invites/:id`: Revogação pelo remetente.
- **Contratos**: Referência aos schemas em `@dindinho/shared/src/schemas/invite.schema.ts`.

## 🔗 Links Úteis

- [Planejamento: Sistema de Convites](../../90-planejamento/em-discussao/sistema-convites.md)
- [Esquema de Banco de Dados](../../../backend/prisma/schema.prisma)
- [Domínio: Contas](../contas/regras-negocio.md)
