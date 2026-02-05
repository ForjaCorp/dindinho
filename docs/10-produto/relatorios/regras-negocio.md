---
id: dominio-relatorios
title: "Relatórios e Insights"
description: "Visualização de dados e análise de saúde financeira através de gráficos e métricas."
audience: ["dev", "usuário"]
visibility: "público"
status: "em-progresso"
owners: ["engineering"]
tags: ["relatórios", "análise", "gráficos"]
mvp: true
createdAt: "2026-02-03"
---

# Relatórios e Insights

Este domínio transforma dados brutos de transações em informações acionáveis, ajudando o usuário a entender seus hábitos de consumo e planejar seu futuro financeiro.

## 🎯 Objetivo

- Fornecer uma visão clara do fluxo de caixa mensal.
- Analisar a distribuição de gastos por categoria.
- Acompanhar a evolução do patrimônio (saldo consolidado) ao longo do tempo.
- Identificar anomalias ou oportunidades de economia.

## 👥 Visão do Usuário (User Guide)

### Fluxos Principais

1.  **Dashboard Mensal**: Resumo de "Quanto ganhei" vs "Quanto gastei" no mês atual.
2.  **Gráfico de Pizza (Categorias)**: Visualização percentual dos maiores ralos de dinheiro.
3.  **Evolução de Saldo**: Gráfico de linha mostrando o crescimento (ou queda) das economias nos últimos meses.

### Interface (PWA)

- **Widgets Interativos**: Gráficos que permitem clicar para ver detalhes das transações.
- **Seletores de Período**: Troca rápida entre mensal, trimestral ou anual.
- **Empty States**: Orientações claras quando ainda não há dados suficientes para gerar relatórios.

## 🛠️ Visão Técnica (Admin/Engineering)

### Modelo de Dados

Referência no [schema.prisma](../../../backend/prisma/schema.prisma):

- `DailySnapshot`: Esta é a tabela crítica para performance. Em vez de recalcular o saldo histórico somando milhares de transações, consultamos snapshots diários.
- **Processo de Snapshot**: Atualizado via triggers ou jobs periódicos após mudanças significativas em transações passadas.

### Integração e API

- **Endpoints**: `/reports/*` na [Referência de API](../../30-api/openapi.json).
- **Performance**: Uso intensivo de agregações SQL (`GROUP BY`, `SUM`) e cache para garantir carregamento instantâneo.
- **Visualização**: Frontend utiliza bibliotecas de gráficos (ex: Chart.js ou Ngx-charts) integradas com Signals do Angular.

## 🔗 Links Úteis

- [Cálculo de Agregações](../../../backend/src/reports/reports.service.ts)
- [Dashboard Component](../../../frontend/src/pages/dashboard.page.ts)
