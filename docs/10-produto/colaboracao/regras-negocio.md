---
id: dominio-colaboracao
title: "Domínio: Colaboração e Compartilhamento"
description: "Gestão de acessos compartilhados, convites entre usuários e permissões de visualização e edição em carteiras."
audience: ["dev", "usuário"]
visibility: "público"
status: "concluido"
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

O sistema utiliza quatro entidades principais para gerenciar a colaboração:

- `Invite`: Registro do convite (pendente, aceito, rejeitado ou expirado). Contém um `token` único para links seguros.
- `InviteAccount`: Detalhes das contas e permissões vinculadas a um convite.
- `AccountAccess`: O registro definitivo de acesso após o aceite do convite.
- `AuditLog`: Registra todas as ações críticas (aceite de convites, auto-link no cadastro).

**Invariantes:**

- Apenas o `OWNER` de uma conta pode gerar convites para ela.
- **Idempotência**: Ao criar um novo convite para o mesmo par e-mail/conta, convites pendentes anteriores são invalidados (status `EXPIRED`).
- **Segurança**: Links de convite utilizam tokens criptográficos de 32 bytes, não expondo IDs internos do banco de dados.
- **Auto-link**: Se um usuário se cadastrar com um e-mail que possui convites pendentes válidos, o sistema realiza o vínculo automático às contas.
- Convites expiram após 7 dias por padrão.

### Integração e API

- **Endpoints**:
  - `POST /api/invites`: Criação de convites.
  - `GET /api/invites/pending`: Listagem para o destinatário autenticado.
  - `GET /api/invites/token/:token`: (Público) Busca detalhes de um convite para a página de aceite.
  - `PATCH /api/invites/:id`: Aceite ou rejeição (via campo `status`).
  - `DELETE /api/invites/:id`: Cancelamento pelo remetente.
- **Contratos**: Referência aos schemas em `@dindinho/shared/src/schemas/invite.schema.ts`.

## 🔗 Links Úteis

- [Planejamento: Sistema de Convites](../../90-planejamento/concluido/sistema-convites.md)
- [Esquema de Banco de Dados](../../../backend/prisma/schema.prisma)
- [Domínio: Contas](../contas/regras-negocio.md)
