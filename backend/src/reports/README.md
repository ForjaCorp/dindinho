# Módulo de Relatórios (Reports)

Este módulo é responsável por processar e agregar dados financeiros para visualização em gráficos e exportação.

## Lógica de Competência (`invoiceMonth`)

Diferente de outros aplicativos financeiros que mostram gastos apenas pela data da compra, o Dindinho utiliza o conceito de **Mês de Competência da Fatura** para cartões de crédito.

### Como funciona:

1. **Transações Comuns**: Utilizam a data da transação (`date`) para agrupamento.
2. **Cartão de Crédito**:
   - Quando uma transação de cartão é criada, o sistema calcula o `invoiceMonth` baseado no `closingDay` (dia de fechamento) da conta.
   - Se a compra for feita _após_ o fechamento, ela é empurrada para o próximo mês.
   - O relatório de **Fluxo de Caixa** prioriza o `invoiceMonth` quando presente. Isso garante que o gráfico reflita quando o impacto financeiro acontece (pagamento da fatura), e não apenas o ato da compra.

> Observação: no momento, **Gastos por Categoria** é filtrado por `date` (data da transação). Se quisermos refletir competência para cartões também nesse gráfico, é uma melhoria a ser implementada.

## Drill-down

A funcionalidade de Drill-down permite que o usuário clique em elementos dos gráficos para ver os detalhes:

- **Gráfico de Pizza**: Filtra transações pela Categoria e Período selecionado.
- **Gráfico de Barras**: Filtra transações pelo Tipo (Receita/Despesa) e Mês específico da barra clicada.

## Evolução do Saldo (Snapshots)

Atualmente, o histórico de saldo é alimentado por `DailySnapshot` (saldo diário materializado) para evitar recalcular toda a linha do tempo a partir das transações em cada request.

### Regras de cálculo

- `INCOME`/`EXPENSE`: o cálculo usa a magnitude do valor (ex.: `-100` em `INCOME` vira `+100`).
- `TRANSFER`: o cálculo respeita o sinal do valor (valor positivo aumenta, negativo reduz).

### Versionamento de cálculo (`calcVersion`)

Os snapshots persistidos carregam um `calcVersion` para permitir recalcular saldos quando a lógica muda. Se o banco estiver sem a coluna ou com valores antigos, o relatório pode falhar ou exibir dados inconsistentes.

- Garanta que as migrations do backend foram aplicadas antes de usar o endpoint de evolução do saldo.

### TODO (Escala)

- Migrar o relatório de evolução do saldo para ter fallback sem snapshots (calcular via transações quando o cache estiver frio/incompleto).

## Exportação CSV

O endpoint `/api/reports/export/csv` gera um relatório tabular das transações respeitando todos os filtros de tela (Data, Contas, Pendentes).
