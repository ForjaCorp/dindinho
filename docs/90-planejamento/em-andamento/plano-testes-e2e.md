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

# 🧪 Plano de Testes E2E (End-to-End) [EM ANDAMENTO]

Este documento define a estratégia, ferramentas e cenários de teste para garantir que o Dindinho funcione perfeitamente do ponto de vista do usuário final.

---

## 🛠️ Ferramentas Recomendadas

- **Playwright Test Runner**: Escolhido pela sua velocidade nativa, suporte a múltiplos navegadores (Chromium, Firefox, WebKit), sharding nativo e geração de artefatos (vídeos/traces).
- **Prisma (Test DB)**: Utilização de um banco de dados de teste isolado (MySQL efêmero via Docker).
- **Turborepo**: Orquestração da execução paralela entre frontend e backend durante o ciclo de testes.

---

## 🏗️ Arquitetura Técnica e Infraestrutura

Para que os testes sejam confiáveis e rápidos, a arquitetura deve suportar:

1.  **Orquestração de Ambiente:**
    - Uso de `docker-compose.test.yml` para subir Frontend, Backend e um banco MySQL efêmero.
    - **Global Setup/Teardown:** O Playwright gerencia o ciclo de vida do ambiente, garantindo que o banco de dados seja migrado e os serviços estejam saudáveis antes de iniciar.
2.  **Estratégia de Dados (State Management):**
    - **API-First Setup:** Usar chamadas de API (via `request` do Playwright) para criar o estado necessário (usuário, contas) antes de testar a UI, acelerando a execução.
    - **Banco de Dados Isolado:** Cada worker do Playwright pode operar em um esquema/instância isolada para evitar conflitos de dados em execuções paralelas.
3.  **Autenticação Eficiente:**
    - Reuso de estado de autenticação (`storageState`) para evitar login repetitivo em cada teste, economizando ~5s por cenário.

## 🗺️ Jornadas Críticas (Cenários de Teste)

### 1. Autenticação & Onboarding

- **Cenário**: Novo usuário se registra, confirma e-mail e completa o tour inicial.
- **Validação**: Verificar se o perfil foi criado corretamente e se o redirecionamento para o dashboard ocorreu.
- **Técnico**: Validar persistência no banco e disparo de e-mail (mock/Mailpit).

### 2. Gestão de Transações (Otimizado)

- **Cenário**: Criar uma transação de despesa, editar o valor e depois excluí-la.
- **Validação**: O saldo da conta deve ser atualizado em tempo real no dashboard.
- **Técnico**: Interceptar chamadas via `page.route` para simular falhas de rede e verificar resiliência.

---

## 🚀 Integração com CI/CD

- **Artifacts:** Gravação de vídeo e trace (Playwright Trace Viewer) apenas em falhas no GitHub Actions.
- **Sharding:** Divisão dos testes em múltiplos containers no CI caso o tempo ultrapasse 5 min.

---

## 📈 Métricas de Sucesso

- **Cobertura de Fluxos Críticos**: 100% das jornadas descritas acima devem estar automatizadas.
- **Tempo de Execução**: A suíte completa deve rodar em menos de 5 minutos no CI.
- **Flakiness**: Zero tolerância para testes intermitentes. Testes instáveis devem ser corrigidos ou removidos imediatamente.

---

## 🔗 Links Relacionados

- [Padrões de Frontend](../../20-arquitetura/padroes-frontend.md)
- [Padrões de Backend](../../20-arquitetura/padroes-backend.md)
- [Roadmap de Evolução](../roadmap-evolucao.md)

---

> **Nota:** A implementação deste plano depende da estabilização da Fase 5 do projeto.
