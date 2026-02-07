---
id: test-plan-e2e
title: "Plano de Testes E2E"
description: "Estratégia de testes de ponta a ponta (End-to-End) para garantir a integridade dos fluxos críticos do Dindinho."
audience: ["dev", "produto"]
visibility: "interno"
status: "andamento"
owners: ["engineering"]
tags: ["testes", "e2e", "playwright", "qualidade"]
mvp: true
createdAt: "2026-02-03"
---

# Planejamento: Plano de Testes E2E (End-to-End) [EM ANDAMENTO]

Este documento define a estratégia, ferramentas e cenários de teste para garantir que o Dindinho funcione perfeitamente do ponto de vista do usuário final.

## � Contexto e Problema

- **Cenário Atual**: O projeto possui testes unitários e de integração, mas carece de uma validação completa que simule a jornada real do usuário no navegador.
- **Por que agora?**: Com a evolução do sistema de convites e multi-contas, a complexidade dos fluxos aumentou, exigindo uma rede de segurança que valide a integração entre Frontend, Backend e Banco de Dados em tempo real.

## 🚀 Proposta de Solução

- **Visão Geral**: Implementar uma suíte de testes E2E robusta utilizando **Playwright Test Runner**, integrada ao Turborepo e rodando contra uma instância efêmera de **MySQL** via Docker.
- **Diferencial**: Uso de **API-First Setup** para preparação de dados e **reuso de estado de autenticação** para máxima velocidade.

## 📅 Cronograma de Execução (Fases)

### Fase 1: Infraestrutura e Base Técnica

- [ ] Configurar `@playwright/test` na raiz do monorepo.
- [ ] Criar `docker-compose.test.yml` com imagem MySQL 8.0.
- [ ] Implementar `global-setup.ts` para orquestração de ambiente (Migrate + Services Check).
- [ ] Configurar scripts de execução no `package.json` principal via Turbo.
- **Critérios de Aceite**:
  - [ ] Comando `npm run test:e2e` sobe o ambiente, roda um teste "smoke" e encerra com sucesso.
  - [ ] Traces e Vídeos são gerados corretamente em caso de falha.

### Fase 2: Autenticação e Onboarding

- [ ] Implementar script de setup de autenticação (`storageState`).
- [ ] Criar testes para o fluxo de Registro de Novo Usuário.
- [ ] Criar testes para Login e Redirecionamento Pós-Auth.
- [ ] Validar tour inicial e criação da primeira conta.
- **Critérios de Aceite**:
  - [ ] Fluxo de onboarding validado 100% (do form ao dashboard).
  - [ ] Persistência de sessão verificada entre recarregamentos de página.

### Fase 3: Jornadas de Transações e Colaboração

- [ ] Implementar testes para criação, edição e exclusão de Transações.
- [ ] Validar atualização de saldo em tempo real no Dashboard.
- [ ] Criar testes para o Sistema de Convites (Gerar link -> Aceitar -> Ver conta compartilhada).
- **Critérios de Aceite**:
  - [ ] CRUD de transações validado com sucesso.
  - [ ] Fluxo de colaboração (convites) testado entre dois usuários distintos.

## 🏗️ Impacto Técnico

- **Banco de Dados**: Necessário garantir que as migrações Prisma sejam aplicadas ao MySQL efêmero antes dos testes.
- **API**: O backend deve ser iniciado em modo `test` (se necessário) para mocks de e-mail/Mailpit.
- **Frontend**: Exigência rigorosa de atributos `data-testid` em todos os elementos interativos.

## ✅ Definição de Pronto (DoD)

- [ ] Código testado (unitário/integração).
- [ ] Documentação atualizada (Tier User/Admin).
- [ ] Lint/Typecheck sem erros.
- [ ] Revisado por outro par.
