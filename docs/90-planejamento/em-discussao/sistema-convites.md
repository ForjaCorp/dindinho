---
id: planejamento-sistema-convites
title: "Sistema de Convites (Colaboração Multi-contas)"
description: "Planejamento para implementação do sistema de convites por e-mail, permitindo compartilhar múltiplas carteiras com diferentes permissões."
audience: ["dev", "ops"]
visibility: "interno"
status: "em-andamento"
owners: ["engineering"]
tags: ["planejamento", "rfc", "colaboração", "convites"]
mvp: true
createdAt: "2026-02-03"
---

# Planejamento: Sistema de Convites (Colaboração Multi-contas)

## 📝 Contexto e Problema

- **Cenário Atual**: O Dindinho é majoritariamente de uso individual. Embora existam `AccountAccess` no banco, não há uma forma amigável de um usuário convidar outro para colaborar em suas carteiras.
- **Por que agora?**: A colaboração (casais, famílias, grupos) é um dos pilares do MVP do Dindinho para se diferenciar de apps de finanças puramente pessoais.

## 🚀 Proposta de Solução

O sistema permite que um usuário convide outros colaboradores para compartilhar uma ou mais carteiras. Para o MVP, utilizaremos um fluxo baseado em **Links de Convite** em vez de disparos diretos de e-mail, garantindo agilidade e simplicidade.

### 🛠️ Decisões de Arquitetura (MVP)

1.  **Identificação por E-mail**: O convite é vinculado ao e-mail do destinatário.
2.  **Fluxo de Link**: O sistema gera um link único contendo o `inviteId`. O remetente compartilha este link manualmente (WhatsApp, E-mail, etc).
3.  **Segurança por Autenticação**: O link só pode ser "reivindicado" por um usuário logado cujo e-mail coincida com o e-mail do convite.
4.  **Auto-link no Signup**: No momento do cadastro, o sistema verifica proativamente se existem convites pendentes para o e-mail recém-criado e gera os `AccountAccess` automaticamente.

## 📅 Cronograma de Execução (Fases)

### Fase 0: Pré-requisito (Refatoração de Roles)

- [x] Implementar [Refatoração de Roles e Permissões](refatoracao-roles-permissoes.md) para separar `SystemRole` de `ResourcePermission`.
- [x] Definir ADR 0013: [Separação de Papéis de Sistema e Permissões de Recurso](../../20-arquitetura/adr/0013-separacao-roles-permissoes.md).

### Fase 1: Infraestrutura e Modelo de Dados

- [x] Criar tabelas `Invite` e `InviteAccount` no Prisma.
- [x] Implementar as relações no `User` e `Account`.
- [x] Criar migração e atualizar o cliente Prisma.
- **Critérios de Aceite**: Banco de Dados pronto para armazenar convites vinculados a múltiplas contas com as novas roles de recurso (`ResourcePermission`).

### Fase 2: API de Gestão de Convites (Backend)

- [ ] Endpoint `POST /api/invites`: Criação de convite e geração do link/ID.
- [ ] Endpoint `GET /api/invites/pending`: Listar convites recebidos pelo usuário logado.
- [ ] Endpoint `POST /api/invites/:id/accept`: Converte `InviteAccount` em registros de `AccountAccess` com as permissões de `ResourcePermission`.
- [ ] Endpoint `POST /api/invites/:id/reject`: Marca convite como rejeitado.
- [ ] Endpoint `DELETE /api/invites/:id`: Permite ao `OWNER` revogar um convite pendente.
- **Critérios de Aceite**: Fluxo completo de criação, listagem, aceite e revogação via API respeitando os novos enums.

### Fase 3: Interface de Colaboração (Frontend)

- [ ] Modal de "Compartilhar Carteira" com seleção múltipla, `ResourcePermission` (VIEWER/EDITOR) e geração de link.
- [ ] Central de Convites no Perfil/Configurações.
- [ ] Feedback visual de "Carteira Compartilhada" na listagem de contas.
- [ ] Atualização da listagem de contas para incluir contas compartilhadas via `AccountAccess`.
- **Critérios de Aceite**: Usuário consegue convidar e aceitar convites de forma intuitiva no PWA usando a nova arquitetura de permissões.

## 🏗️ Impacto Técnico

- **Banco de Dados**:
  - Nova tabela `Invite`: Cabeçalho do convite (de, para, status, expiração).
  - Nova tabela `InviteAccount`: Detalhes de cada conta incluída no convite (id_conta, role).
- **API**:
  - Novos contratos Zod em `@dindinho/shared`.
  - Lógica de transação: Ao aceitar, deve-se criar N registros em `AccountAccess` e marcar o convite como `ACCEPTED`.
  - Atualização do `AccountsService.findAllByUserId` para incluir acessos compartilhados.
- **Frontend**:
  - Novo serviço `InviteService`.
  - Atualização do `AccountService` para lidar com permissões de edição/exclusão baseadas na role.
  - Lógica de captura de convite via URL query params.

## ✅ Definição de Pronto (DoD)

- [ ] Código testado (unitário no backend para lógica de aceite e auto-link no signup).
- [ ] Documentação de domínio atualizada em `docs/10-product/colaboracao/regras-negocio.md`.
- [ ] Validação de segurança: Impedir self-invite e garantir que apenas o `OWNER` da conta pode convidar.
- [ ] Validação de permissões: Um `VIEWER` não pode editar transações de uma conta compartilhada.
- [ ] Lint/Typecheck sem erros.
