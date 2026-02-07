---
id: portal-admin-centralizado
title: "Portal de Administração Centralizado"
description: "Unificação das ferramentas administrativas (Allowlist, Status do Backend) em uma única página dedicada para administradores."
audience: ["dev", "ops"]
visibility: "interno"
status: "em-discussao"
owners: ["engineering"]
tags: ["planejamento", "rfc", "admin", "dashboard"]
mvp: false
createdAt: "2026-02-06"
---

# Planejamento: Portal de Administração Centralizado

## 📝 Contexto e Problema

- **Cenário Atual**: As ferramentas administrativas (Allowlist e Status do Backend) estão espalhadas ou exibidas diretamente no Dashboard do usuário quando ele é ADMIN.
- **Por que agora?**: Polui o Dashboard principal e dificulta a expansão de ferramentas de gestão. Precisamos de um local único para governança do sistema, seguindo o pilar de **Transparência & Confiança**.

## 🚀 Proposta de Solução

- **Visão Geral**: Criar uma rota dedicada `/admin` (protegida pelo `AdminGuard`) que centralize:
  1.  **Visão Geral do Sistema**: Status da API, latência do banco e versões.
  2.  **Gestão de Acesso**: Interface completa para a Allowlist de e-mails.
  3.  **Auditoria**: Visualização dos logs de auditoria do sistema.
  4.  **Métricas**: Gráficos básicos de uso e crescimento.

## 📅 Cronograma de Execução (Fases)

### Fase 1: Estrutura e Roteamento

- [ ] Criar `AdminPageComponent` e configurar rota `/admin`.
- [ ] Implementar `AdminGuard` para garantir que apenas `SystemRole.ADMIN` acesse.
- [ ] Remover componentes admin do `DashboardComponent`.
- **Critérios de Aceite**: Acesso restrito e Dashboard limpo para administradores.

### Fase 2: Migração de Ferramentas

- [ ] Mover `BackendStatusCard` para o novo portal.
- [ ] Integrar a gestão de Allowlist diretamente na página (sem depender apenas de diálogos).
- **Critérios de Aceite**: Funcionalidades existentes operando normalmente no novo local.

### Fase 3: Novos Dashboards Admin

- [ ] Implementar visualização de logs de auditoria com filtros.
- [ ] Adicionar estatísticas de usuários e convites.
- **Critérios de Aceite**: Informações úteis para operação do sistema disponíveis.

## 🏗️ Impacto Técnico

- **Banco de Dados**: Nenhuma mudança imediata.
- **API**: Endpoints existentes de `/admin/*` permanecem.
- **Frontend**: Nova rota `/admin`, refatoração do `DashboardComponent` e criação de layouts administrativos.

## ✅ Definição de Pronto (DoD)

- [ ] Código testado (permissões de rota e visibilidade).
- [ ] Documentação interna de operação atualizada.
- [ ] Lint/Typecheck sem erros.
