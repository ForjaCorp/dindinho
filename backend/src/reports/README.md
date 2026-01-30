# Módulo de Relatórios (Reports)

Este módulo é responsável por processar e agregar dados financeiros para visualização em gráficos e exportação.

## Lógica de Competência (`invoiceMonth`)

Diferente de outros aplicativos financeiros que mostram gastos apenas pela data da compra, o Dindinho utiliza o conceito de **Mês de Competência da Fatura** para cartões de crédito.

### Como funciona:

1. **Transações Comuns**: Utilizam a data da transação (`date`) para agrupamento no Fluxo de Caixa.
2. **Cartão de Crédito**:
   - Quando uma transação de cartão é criada, o sistema calcula o `invoiceMonth` baseado no `closingDay` (dia de fechamento) da conta.
   - Se a compra for feita _após_ o fechamento, ela é empurrada para o próximo mês.
   - Os relatórios de **Fluxo de Caixa** e **Gastos por Categoria** priorizam o `invoiceMonth`. Isso garante que o gráfico de despesas reflita quando você realmente terá o impacto financeiro (o pagamento da fatura), e não apenas o ato da compra.

## Drill-down

A funcionalidade de Drill-down permite que o usuário clique em elementos dos gráficos para ver os detalhes:

- **Gráfico de Pizza**: Filtra transações pela Categoria e Período selecionado.
- **Gráfico de Barras**: Filtra transações pelo Tipo (Receita/Despesa) e Mês específico da barra clicada.

## Exportação CSV

O endpoint `/api/reports/export/csv` gera um relatório tabular das transações respeitando todos os filtros de tela (Data, Contas, Pendentes). A geração é feita via stream de texto para garantir performance.
