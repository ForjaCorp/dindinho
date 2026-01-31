# Design: Página de Relatórios (Frontend)

## Objetivo

Definir diretrizes de UX e implementação para a página de Relatórios no frontend (mobile-first/PWA).

## UX (Mobile-first)

- Header com seletor de período (presets + custom).
- Scroll vertical com cards de resumo no topo (fixos ou carrossel horizontal em telas menores).
- Estados de carregamento com skeleton e tratamento de erro claro.

## Gráficos

Biblioteca recomendada no projeto: `chart.js` via `ng2-charts`.

- Spending (donut): gráfico de rosca com legenda interativa.
- Cash Flow: barras (empilhadas ou lado a lado) para receitas vs despesas.
- Balance: linha (suave/monótona) para evolução do saldo.

## Interatividade

- Drill-down a partir de elementos do gráfico (fatia/barra/ponto) para filtrar/abrir detalhes.
- Priorizar feedbacks visuais; vibração (Vibration API) é opcional.

## Estado e serviços

- `ReportsService`: buscar agregações e histórico a partir dos endpoints de relatórios.
- UI: usar Signals para reatividade dos filtros e atualização automática dos gráficos.

## Passos sugeridos

1. Consolidar contratos de filtro (período vs competência) no shared.
2. Garantir que a page aplique filtros consistentes em todos os gráficos.
3. Implementar estados de loading/erro padronizados nos cards de gráficos.
