---
id: test-plan-e2e
title: "Plano de Testes E2E"
description: "Estratégia de testes de ponta a ponta (End-to-End) para garantir a integridade dos fluxos críticos do Dindinho."
audience: ["dev", "product"]
visibility: "internal"
status: "draft"
owners: ["engineering", "qa"]
tags: ["testing", "e2e", "playwright", "quality"]
mvp: true
createdAt: "2026-02-03"
---

# 🧪 Plano de Testes E2E (End-to-End)

Este documento define a estratégia, ferramentas e cenários de teste para garantir que o Dindinho funcione perfeitamente do ponto de vista do usuário final.

---

## 🛠️ Ferramentas Recomendadas

- **Playwright**: Escolhido pela sua velocidade, suporte a múltiplos navegadores (Chromium, Firefox, WebKit) e excelente integração com TypeScript.
- **Vitest (Test Runner)**: Para consistência com os testes unitários do backend.
- **Prisma (Test DB)**: Utilização de um banco de dados de teste isolado com seeds específicos para cada cenário.

---

## 🏗️ Estratégia de Execução

1. **Ambiente Isolado**: Os testes devem rodar em um container Docker separado ou em um ambiente de staging que replique a produção.
2. **Data Cleanup**: Antes de cada suíte de teste, o banco de dados deve ser resetado para um estado conhecido.
3. **Seletores Estáveis**: Uso obrigatório de `data-testid` em todos os elementos críticos para evitar que mudanças de layout quebrem os testes.

---

## 🗺️ Jornadas Críticas (Cenários de Teste)

### 1. Autenticação & Onboarding

- **Cenário**: Novo usuário se registra, confirma e-mail e completa o tour inicial.
- **Validação**: Verificar se o perfil foi criado corretamente e se o redirecionamento para o dashboard ocorreu.

### 2. Gestão de Transações

- **Cenário**: Criar uma transação de despesa, editar o valor e depois excluí-la.
- **Validação**: O saldo da conta deve ser atualizado em tempo real no dashboard.

### 3. Sistema de Convites (Colaboração)

- **Cenário**: Usuário A convida Usuário B para compartilhar uma conta. Usuário B aceita o convite via e-mail.
- **Validação**: Ambos os usuários devem visualizar as mesmas transações na conta compartilhada.

### 4. Metas de Economia

- **Cenário**: Definir um limite de gastos para a categoria "Lazer". Adicionar uma transação que ultrapassa esse limite.
- **Validação**: O sistema deve exibir um alerta visual de meta atingida/ultrapassada.

### 5. Responsividade & PWA

- **Cenário**: Abrir o app em resolução mobile e simular modo offline.
- **Validação**: A interface deve se ajustar corretamente e permitir o cadastro offline de transações (sincronização posterior).

---

## 📈 Métricas de Sucesso

- **Cobertura de Fluxos Críticos**: 100% das jornadas descritas acima devem estar automatizadas.
- **Tempo de Execução**: A suíte completa deve rodar em menos de 5 minutos no CI.
- **Flakiness**: Zero tolerância para testes intermitentes. Testes instáveis devem ser corrigidos ou removidos imediatamente.

---

## 🔗 Links Relacionados

- [Padrões de Código](file:///home/vinicius/dev/dindinho/CODING_STANDARDS.md)
- [Roadmap de Evolução](file:///home/vinicius/dev/dindinho/docs/90-backlog/planning/evolucao-roadmap.md)
