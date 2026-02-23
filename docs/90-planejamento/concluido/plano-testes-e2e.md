---
id: test-plan-e2e
title: "Plano de Testes E2E"
description: "Estratégia de testes de ponta a ponta (End-to-End) para garantir a integridade dos fluxos críticos do Dindinho."
audience: ["dev", "produto"]
visibility: "interno"
status: "estável"
owners: ["engineering"]
tags: ["testes", "e2e", "playwright", "qualidade"]
mvp: true
createdAt: "2026-02-03"
---

# Planejamento: Plano de Testes E2E (End-to-End) [CONCLUÍDO]

Este documento define a estratégia, ferramentas e cenários de teste para garantir que o Dindinho funcione perfeitamente do ponto de vista do usuário final.

## � Contexto e Problema

- **Cenário Atual**: O projeto possui testes unitários e de integração, mas carece de uma validação completa que simule a jornada real do usuário no navegador.
- **Por que agora?**: Com a evolução do sistema de convites e multi-contas, a complexidade dos fluxos aumentou, exigindo uma rede de segurança que valide a integração entre Frontend, Backend e Banco de Dados em tempo real.

## 🚀 Proposta de Solução

- **Visão Geral**: Implementar uma suíte de testes E2E robusta utilizando **Playwright Test Runner**, integrada ao Turborepo e rodando contra uma instância efêmera de **MySQL** via Docker.
- **Diferencial**: Uso de **API-First Setup** para preparação de dados e **reuso de estado de autenticação** para máxima velocidade.

## 📅 Cronograma de Execução (Fases)

### Fase 1: Infraestrutura e Base Técnica

- [x] Configurar `@playwright/test` na raiz do monorepo.
- [x] Criar `docker-compose.test.yml` com imagem MySQL 8.0.
- [x] Implementar `global-setup.ts` para orquestração de ambiente (Migrate + Services Check).
- [x] Configurar scripts de execução no `package.json` principal via Turbo.
- **Critérios de Aceite**:
  - [x] Comando `npm run test:e2e` sobe o ambiente, roda um teste "smoke" e encerra com sucesso.
  - [x] Traces e Vídeos são gerados corretamente em caso de falha.

### Fase 2: Autenticação e Onboarding

- [x] Implementar script de setup de autenticação (`storageState`).
- [x] Criar testes para o fluxo de Registro de Novo Usuário.
- [x] Criar testes para Login e Redirecionamento Pós-Auth.
- [x] Validar tour inicial e criação da primeira conta.
- **Critérios de Aceite**:
  - [x] Fluxo de onboarding validado (do form ao dashboard).
  - [x] Persistência de sessão verificada entre recarregamentos de página no repositório.

### Fase 3: Jornadas de Transações e Colaboração

- [x] Implementar testes para criação, edição e exclusão de Transações.
- [x] Validar atualização de saldo em tempo real no Dashboard.
- [x] Criar testes para o Sistema de Convites (Gerar link -> Aceitar -> Ver conta compartilhada).
- **Critérios de Aceite**:
  - [x] CRUD de transações validado com sucesso.
  - [x] Fluxo de colaboração (convites) testado entre dois usuários distintos.

## 🏗️ Impacto Técnico

- **Banco de Dados**: Necessário garantir que as migrações Prisma sejam aplicadas ao MySQL efêmero antes dos testes.
- **API**: O backend deve ser iniciado em modo `test` (se necessário) para mocks de e-mail/Mailpit.
- **Frontend**: Exigência rigorosa de atributos `data-testid` em todos os elementos interativos.

## ✅ Definição de Pronto (DoD)

- [x] Código testado (unitário/integração).
- [x] Documentação atualizada (Tier User/Admin).
- [x] Lint/Typecheck sem erros.
- [x] Revisado por outro par.

## ▶️ Como rodar (scaffold inicial)

- **Instalar dependências** (root):

```bash
npm install
```

- **Subir infra de teste (MySQL efêmero) e rodar a suíte E2E**:

```bash
npm run test:e2e
```

- **Execução CI (sem HTML artifacts interativos)**:

```bash
npm run test:e2e:ci
```

## ⚙️ Observações de implementação e Decisões

- Usar seletores `data-testid` para todos os elementos interativos (kebab-case).
- `global-setup.ts` aplica migrações Prisma e utiliza Headless UI Login para capturar o `storageState`, garantindo que os fluxos críticos de Auth dependem de um comportamento real e não de uma API exclusiva para testes.
- Usuários E2E (ex: `e2e@example.com`) são populados utilizando diretamente o script de seed backend com a flag `AUTO_SEED=true`. Tests de exemplo e setup assumem que estes usuários foram introduzidos com sucesso no db via script sem acoplamento à requests dinâmicas.
- Tests em cenários deslogados, como `smoke.spec.ts` utilizam `test.use({ storageState: { cookies: [], origins: [] } })` para invalidar propositalmente as sessões populadas pelo `global-setup.ts`.
