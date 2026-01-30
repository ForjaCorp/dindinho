# Plano de Implementação: Página de Relatórios (Frontend)

## Design e UX (Mobile-First/PWA)

1. **Layout Base**:
   - Header com seletor de período (Mês Atual, 3 Meses, 6 Meses, Personalizado).
   - Scroll vertical fluido com "Top Cards" fixos no topo ou em carrossel horizontal.
2. **Componentes de Gráficos**:
   - Utilizar uma biblioteca leve e performática (ex: `ngx-charts` ou `chart.js` com wrapper Angular).
   - **Spending Donut**: Gráfico de rosca com legenda interativa.
   - **Cash Flow Bars**: Gráfico de barras empilhadas ou lado a lado (Receitas vs Despesas).
   - **Balance Line**: Gráfico de linha suave (smooth/monotone) para evolução de saldo.
3. **Interatividade Mobile**:
   - Feedback tátil (Vibration API) ao tocar em fatias do gráfico.
   - Skeleton screens para carregamento suave dos dados de agregação.

## Especificações Técnicas

1. **ReportsService**: Criar serviço Angular para consumir os novos endpoints:
   - `getSpendingByCategory(filters)`
   - `getCashFlow(filters)`
   - `getBalanceHistory(filters)`
2. **Gerenciamento de Estado**: Utilizar Signals para reatividade dos filtros e atualização automática dos gráficos.
3. **Responsividade**: Layout grid que se adapta de 1 coluna (Mobile) para 2 ou 3 colunas (Desktop/Tablet).

## Passos para o Builder:

1. Instalar biblioteca de gráficos selecionada.
2. Implementar `ReportsService`.
3. Criar a `ReportsPage` com os componentes de filtro.
4. Desenvolver os 3 componentes de gráficos específicos.
5. Adicionar estados de loading e erro refinados.
