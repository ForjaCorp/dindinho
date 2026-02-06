---
id: planejamento-sistema-convites
title: "Sistema de Convites (Colaboração Multi-contas)"
description: "Planejamento para implementação do sistema de convites por e-mail, permitindo compartilhar múltiplas carteiras com diferentes permissões."
audience: ["dev", "ops"]
visibility: "interno"
status: "rascunho"
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

O sistema permite que um usuário convide outros colaboradores para compartilhar uma ou mais carteiras através de um fluxo de e-mail com estado.

## 📅 Cronograma de Execução (Fases)

### Fase 1: Infraestrutura e Modelo de Dados

- [ ] Criar tabelas `Invite` e `InviteAccount` no Prisma.
- [ ] Implementar as relações no `User` e `Account`.
- [ ] Criar migração e atualizar o cliente Prisma.
- **Critérios de Aceite**: Banco de Dados pronto para armazenar convites vinculados a múltiplas contas.

### Fase 2: API de Gestão de Convites (Backend)

- [ ] Endpoint `POST /api/invites`: Enviar convite (valida se o remetente é dono das contas).
- [ ] Endpoint `GET /api/invites/pending`: Listar convites recebidos pelo usuário logado.
- [ ] Endpoint `POST /api/invites/:id/accept`: Converte `InviteAccount` em registros de `AccountAccess`.
- [ ] Endpoint `POST /api/invites/:id/reject`: Marca convite como rejeitado.
- **Critérios de Aceite**: Fluxo completo de criação, listagem e aceite via API.

### Fase 3: Interface de Colaboração (Frontend)

- [ ] Modal de "Compartilhar Carteira" com seleção múltipla e roles.
- [ ] Central de Convites no Perfil/Configurações.
- [ ] Feedback visual de "Carteira Compartilhada" na listagem de contas.
- **Critérios de Aceite**: Usuário consegue convidar e aceitar convites de forma intuitiva no PWA.

## 🏗️ Impacto Técnico

- **Banco de Dados**:
  - Nova tabela `Invite`: Cabeçalho do convite (de, para, status, expiração).
  - Nova tabela `InviteAccount`: Detalhes de cada conta incluída no convite (id_conta, role).
- **API**:
  - Novos contratos Zod em `@dindinho/shared`.
  - Lógica de transação: Ao aceitar, deve-se criar N registros em `AccountAccess` e marcar o convite como `ACCEPTED`.
- **Frontend**:
  - Novo serviço `InviteService`.
  - Atualização do `AccountService` para lidar com permissões de edição/exclusão baseadas na role.

## ✅ Definição de Pronto (DoD)

- [ ] Código testado (unitário no backend para lógica de aceite).
- [ ] Documentação de domínio atualizada em `docs/10-product/dominio-colaboracao.md`.
- [ ] Lint/Typecheck sem erros.
- [ ] Validação de permissões: Um `VIEWER` não pode editar transações de uma conta compartilhada.
