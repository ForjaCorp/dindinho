---
id: planejamento-versionamento
title: "Padronização de Versionamento (SemVer)"
description: "Plano para unificar e padronizar o versionamento do monorepo, workspaces e releases do Dindinho seguindo Semantic Versioning."
audience: ["dev", "arquitetura", "ops"]
visibility: "interno"
status: "em-discussao"
owners: ["engineering"]
tags: ["planejamento", "rfc", "semver", "devops", "versionamento"]
mvp: false
createdAt: "2026-02-06"
---

# Planejamento: Padronização de Versionamento (Monorepo SemVer)

## 📝 Contexto e Problema

- **Cenário Atual**: O monorepo possui versões inconsistentes entre seus componentes:
  - Root: `1.0.0`
  - Backend: `1.0.0`
  - Frontend: `0.0.0`
  - Shared: `0.1.0`
- **Por que agora?**: À medida que avançamos para o MVP e integramos fluxos de CI/CD, a falta de um padrão de versionamento unificado dificulta o rastreamento de mudanças, a geração de changelogs e a sincronização entre frontend e backend. Precisamos de uma "Single Source of Truth" para a versão do ecossistema.

## 🚀 Proposta de Solução

- **Visão Geral**: Implementar um sistema de **Versionamento Unificado (Synchronized Versioning)** para os componentes do monorepo, utilizando o `package.json` da raiz como a versão mestre.
- **Diferenciais Magistrais**:
  1.  **Sincronização Atômica**: Todos os pacotes internos compartilham o mesmo número de versão, garantindo compatibilidade imediata.
  2.  **Changelog Automatizado**: Geração de logs de mudança baseados em Commits Semânticos.
  3.  **Deploy Previsível**: Tags de Git que refletem o estado real de todo o ecossistema.

## 📅 Cronograma de Execução (Fases)

### Fase 1: Alinhamento e Baseline (v1.0.0)

- [ ] Unificar todos os `package.json` para a versão `1.0.0-next.0` (indicando pré-MVP).
- [ ] Definir o `package.json` da raiz como o driver de versão.
- [ ] **Critérios de Aceite**: `npm run version` (ou similar) reporta a mesma versão em todos os workspaces.

### Fase 2: Automatização com Changesets ou Turbo

- [ ] Avaliar e implementar uma ferramenta de gestão de versionamento (ex: `Changesets` ou integração nativa do `Turbo`).
- [ ] Configurar scripts de `version-bump` automatizados que atualizam todos os workspaces simultaneamente.
- [ ] **Critérios de Aceite**: Possibilidade de dar "bump" na versão com um único comando na raiz.

### Fase 3: CI/CD e Tags de Release

- [ ] Integrar o versionamento ao GitHub Actions.
- [ ] Criar workflow que gera tags de Git (ex: `v1.2.3`) automaticamente após merge na `main`.
- [ ] Implementar geração de `CHANGELOG.md` na raiz do projeto.
- [ ] **Critérios de Aceite**: Todo merge na main que altere código resulta em uma nova tag e atualização do changelog.

## 🏗️ Impacto Técnico

- **Arquitetura**: Introdução de ferramentas de gestão de release (Changesets).
- **Processos**: Exigência rigorosa de Commits Semânticos (`feat:`, `fix:`, `chore:`) para alimentar a automação.
- **Workspaces**: Referências entre pacotes (ex: `frontend` dependendo de `shared`) devem usar `workspace:*` para garantir que sempre usem a versão local sincronizada.

## ✅ Definição de Pronto (DoD)

- [ ] Todos os `package.json` possuem a mesma versão.
- [ ] Script de unificação de versão testado e funcional.
- [ ] Documentação de "Como fazer um Release" adicionada ao [Guia de Documentação](../admin/guia-documentacao.md).
- [ ] Primeiro "Release Candidate" gerado com sucesso via CI.

> **STATUS: PLAN READY**
>
> 1. [ ] User: Verify `schema.prisma` relations. (N/A para este plano)
> 2. [ ] User: Verify Zod validation rules in `shared`. (N/A para este plano)
> 3. [ ] Action: Run `npx prisma generate` manually or ask the Builder to proceed. (N/A para este plano)
