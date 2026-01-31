# 💸 Dindinho

[![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.io/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=for-for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![MySQL](https://img.shields.io/badge/MySQL-005C84?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)

O Dindinho é um PWA (Progressive Web App) focado em organização financeira pessoal e familiar. O objetivo é ser um facilitador minimalista, eficiente e colaborativo, permitindo o gerenciamento de carteiras, cartões de crédito e despesas compartilhadas com foco na experiência mobile.

## 🚀 Stack Tecnológica

### Frontend

- **Framework**: Angular 21 (Standalone Components, Signals, Zoneless)
- **UI Components**: PrimeNG
- **Estilização**: Tailwind CSS
- **Tipo**: Progressive Web App (PWA)

### Backend

- **Runtime**: Node.js
- **Framework**: Express/Fastify
- **ORM**: Prisma
- **Banco de Dados**: MySQL

### Infraestrutura

- **Containerização**: Docker
- **Orquestração**: Kubernetes
- **Orquestração**: Coolify (Apps Docker)

## 🌟 Funcionalidades Principais (MVP)

### 1. Gestão de Carteiras e Contas

O sistema utiliza uma abordagem simplificada para ativos:

- **STANDARD**: Para contas correntes, dinheiro em espécie, vale-refeição ou poupança. O saldo é atualizado imediatamente.
- **CREDIT**: Para cartões de crédito. Possui lógica específica de dia de fechamento e vencimento.

### 2. Cartão de Crédito Inteligente

- Controle de Dia de Fechamento (Melhor dia de compra) e Dia de Vencimento
- Gestão de faturas baseada na data da transação vs. dia de fechamento

### 3. Colaboração (Família e Grupos)

- Usuários possuem contas individuais
- Sistema de Convites para compartilhar carteiras específicas
- Controle de permissões (Visualização ou Edição) por carteira

### 4. Categorização

- Categorias padrão do sistema
- Possibilidade de o usuário criar categorias e subcategorias personalizadas

## 🏗️ Arquitetura e Decisões de Design

### Modelagem de Dados: Tabela de Extensão

Para garantir organização e performance, utilizamos uma estratégia de composição no banco de dados:

- A tabela `Wallet` contém dados comuns (Nome, Cor, Ícone, Dono)
- A tabela `CreditCardInfo` é uma extensão (1:1) vinculada apenas às carteiras do tipo CREDIT, armazenando dados específicos como dias de corte e vencimento

### Estratégia de Parcelamento: "Explosão de Parcelas"

Para otimizar a geração de relatórios mensais e evitar cálculos complexos em tempo de execução:

- Ao registrar uma despesa parcelada (ex: R$ 1000 em 10x), o sistema gera imediatamente 10 registros no banco de dados
- Todos os registros compartilham um `recurrenceId` único
- Permite edições em lote (ex: "Alterar esta e as próximas")
- Torna a consulta de "Gastos do Mês X" uma soma simples no banco de dados

## 🛠️ Configuração do Ambiente

### Pré-requisitos

- Node.js (LTS v20+)
- Docker & Docker Compose
- npm ou yarn

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do backend:

```env
# Conexão com o Banco de Dados
DATABASE_URL="mysql://usuario:senha@localhost:3306/dindinho_dev"

# Segurança (JWT)
JWT_SECRET="segredo_para_gerar_tokens_de_autenticacao"

# Configuração do Servidor
PORT=3000
```

## 🚀 Iniciando o Projeto

### Instalação

1. Clone o repositório:

   ```bash
   git clone [URL_DO_REPOSITÓRIO]
   cd dindinho
   ```

2. Instale as dependências do backend:

   ```bash
   cd backend
   npm install
   ```

3. Instale as dependências do frontend:
   ```bash
   cd ../frontend
   npm install
   ```

### Executando Localmente

1. Inicie o banco de dados com Docker:

   ```bash
   docker-compose up -d
   ```

2. Execute as migrações do Prisma:

   ```bash
   cd ../backend
   npx prisma migrate dev
   ```

3. Inicie o servidor de desenvolvimento do backend:

   ```bash
   npm run start:dev
   ```

4. Em outro terminal, inicie o frontend:

   ```bash
   cd ../frontend
   ng serve
   ```

5. Acesse a aplicação em [http://localhost:4200](http://localhost:4200)

## 📦 Deploy e Infraestrutura

O projeto é entregue via aplicações Docker organizadas pelo Coolify, separando a aplicação em:

- Backend (Node/Fastify)
- Frontend (Nginx)
- Banco de dados MySQL persistente (serviço gerenciado ou container dedicado)

Referência de orquestração: `docker-compose.coolify.yml` demonstra a configuração de serviços e healthchecks para ambientes gerenciados pelo Coolify.

## 📅 Planejamento: TimeFilter unificado (Relatórios + Transações)

### Objetivo

Unificar a experiência de filtro temporal nas telas de **Relatórios** e **Transações**, com duas “lentes”:

- **Período (DAY_RANGE)**: presets (Hoje, Ontem, Esta semana, etc.) e intervalo custom.
- **Fatura (INVOICE_MONTH)**: seleção de competência `YYYY-MM` para cartões, com UX de month-picker.

O filtro deve ser **componentizado de verdade** (um único componente reaproveitável), com UX mobile (bottom sheet) e datepickers funcionando (incluindo o bug histórico do modo Fatura).

### Contratos e Data Contracts (Shared)

- `TimeFilterSelectionDTO` e `PeriodSelectionDTO` (lógica de seleção) em [report.schema.ts](file:///home/vinicius/dev/dindinho/packages/shared/src/schemas/report.schema.ts).
- `ReportFilterDTO` suporta `startDay/endDay/tzOffsetMinutes` e também `invoiceMonth` (mutuamente exclusivo) em [report.schema.ts](file:///home/vinicius/dev/dindinho/packages/shared/src/schemas/report.schema.ts).
- `ListTransactionsQueryDTO` suporta `startDay/endDay/tzOffsetMinutes` além de `invoiceMonth`, com regras de exclusão para evitar combinações inválidas em [transaction.schema.ts](file:///home/vinicius/dev/dindinho/packages/shared/src/schemas/transaction.schema.ts).

Critério: o frontend sempre envia **exatamente um** dos modos (ou por `invoiceMonth` ou por range), nunca ambos.

### Backend (planejamento)

#### Fase B1 — Relatórios: filtro por `invoiceMonth`

- Atualizar `ReportsService.buildBaseWhere` para aceitar `filters.invoiceMonth` e filtrar transações por competência.
- Regra de competência:
  - incluir transações com `invoiceMonth === filters.invoiceMonth`.
  - incluir transações sem `invoiceMonth` (não cartão) dentro do intervalo UTC do mês (start inclusive, endExclusive).
- Precedência do filtro temporal:
  - se `invoiceMonth` existir, ignorar `startDay/endDay/startDate/endDate`.
  - senão, manter a normalização existente via `startDay/endDay/tzOffsetMinutes` (já implementada).

Arquivos-alvo:

- [reports.service.ts](file:///home/vinicius/dev/dindinho/backend/src/reports/reports.service.ts)

Critérios:

- `getSpendingByCategory`, `getCashFlow`, `getBalanceHistory` e export CSV respeitam a lente selecionada.

#### Fase B2 — Transações: suportar `startDay/endDay/tzOffsetMinutes`

- Atualizar `TransactionsService.list` para aceitar range por dia (startDay/endDay) além de `from/to`.
- Quando vier `startDay/endDay`, aplicar `date.gte = startUtc` e `date.lt = endExclusiveUtc` (padrão endExclusive, consistente com relatórios).
- Manter `invoiceMonth` como mutuamente exclusivo.

Arquivos-alvo:

- [transactions.service.ts](file:///home/vinicius/dev/dindinho/backend/src/transactions/transactions.service.ts)
- [transactions.routes.ts](file:///home/vinicius/dev/dindinho/backend/src/transactions/transactions.routes.ts)

Critérios:

- A rota `GET /api/transactions` aceita filtros do TimeFilter e retorna paginação consistente.

#### Fase B3 — Testes de backend

- Cobrir `ReportsService` com casos de `invoiceMonth` (cartão + não-cartão).
- Cobrir `TransactionsService.list` com `startDay/endDay/tzOffsetMinutes` (inclui normalização e inversão start/end).

### Frontend (planejamento)

#### Fase F1 — Componente unificado (UI/UX)

- Centralizar o seletor no `TimeFilterComponent` com:
  - botão-resumo (pill de modo + label do período/fatura).
  - editor em **bottom sheet**.
  - abas para alternar modo (Período/Fatura), preservando última seleção por modo.
  - presets de período e seleção custom via range picker.
  - seleção de mês no modo Fatura via month-picker.

Arquivos-alvo:

- [time-filter.component.ts](file:///home/vinicius/dev/dindinho/frontend/src/app/components/time-filter.component.ts)
- [time-filter.util.ts](file:///home/vinicius/dev/dindinho/frontend/src/app/utils/time-filter.util.ts)

Requisitos de UX (não esquecer):

- Month-picker do modo Fatura deve abrir acima de overlays/containers (configurar `appendTo="body"` e `baseZIndex` quando necessário).
- Bottom sheet deve ser acessível (fechar via backdrop/ESC, foco coerente, sem travar scroll indevidamente).

#### Fase F2 — Integração em Transações

- Substituir o picker legado (`month-year-picker`) pelo `TimeFilterComponent`.
- Fonte de verdade: `TimeFilterSelectionDTO` em state local da página.
- Ao aplicar:
  - se modo Fatura: sincronizar query param `invoiceMonth=YYYY-MM`.
  - se modo Período: sincronizar query params `startDay/endDay/tzOffsetMinutes` (ou um formato equivalente definido pela página).
- Garantir que alternar entre modos atualiza lista/paginação corretamente, sem misturar filtros.

Arquivos-alvo:

- [transactions.page.ts](file:///home/vinicius/dev/dindinho/frontend/src/pages/transactions/transactions.page.ts)

Critérios:

- A UI fica “bonita” e consistente com Relatórios: mesmo componente, mesmos estilos, mesma semântica.

#### Fase F3 — Integração em Relatórios

- Trocar o estado atual baseado apenas em `dateRange` por `TimeFilterSelectionDTO`.
- Converter seleção → `ReportFilterDTO`:
  - `INVOICE_MONTH`: enviar `invoiceMonth`.
  - `DAY_RANGE`: enviar `startDay/endDay/tzOffsetMinutes`.
- Garantir que:
  - gráficos e queries reagem apenas ao “Apply” do bottom sheet.
  - presets atualizam período com label correto no resumo.

Arquivos-alvo:

- [reports.page.ts](file:///home/vinicius/dev/dindinho/frontend/src/pages/reports/reports.page.ts)
- [reports.service.ts](file:///home/vinicius/dev/dindinho/frontend/src/app/services/reports.service.ts)

#### Fase F4 — Testes e polimento visual

- Testes unitários do `TimeFilterComponent` (switch de modo, persistência, emissão de eventos).
- Testes unitários de `time-filter.util` (presets, normalização, serialização para query).
- Ajustes finais de layout:
  - espaçamentos, bordas, foco (ring), e consistência de altura em inputs.
  - garantir que o bottom sheet não “pula” ao abrir o datepicker.

### Critérios de aceite (checklist)

- Mesma UI/UX de filtro em Relatórios e Transações.
- Modo Fatura abre o month-picker corretamente (input e ícone).
- Modo Período abre range-picker corretamente e aplica start/end.
- Não existe combinação inválida de filtros (Fatura + Período no mesmo request).
- Backend retorna dados coerentes com a lente selecionada.
- Query params funcionam (recarregar página mantém filtro ativo).

### Planejamento: Filtro por conta unificado (Relatórios + Transações)

#### Contexto

- Em **Relatórios**, o filtro por conta é mais avançado (multi-select com chips) e está acoplado à página.
- Em **Transações**, o filtro por conta é simples (select) e a UX fica inconsistente.
- Existe um bug reportado: ao selecionar **apenas 1 conta** no multi-select, o filtro não funciona.

Hipótese mais provável do bug:

- Serialização de query params de array: com 1 item, o parâmetro pode chegar como `string` ao invés de `string[]` (ex.: `accountIds=uuid`), quebrando validação/normalização e resultando em request inválido ou filtro ignorado.

#### Fase A1 — Contratos/serialização (definição única)

- Padronizar o contrato para filtros por conta em requests:
  - Preferencial: `accountIds: string[]` (multi) para **ambas** as páginas.
  - Compatibilidade: aceitar `accountId: string` legado onde necessário (principalmente em transações/drilldown).
- Definir uma estratégia de serialização consistente no frontend:
  - Enviar `accountIds` como array sempre (mesmo com 1 item), usando repetição de chave (`accountIds=...&accountIds=...`) ou formato `accountIds[]` (definir e manter em todo o app).
  - Nunca enviar `accountIds` como string simples.
- Definir tolerância no backend (defensivo):
  - Aceitar `accountIds` como `string | string[]` e normalizar para `string[]`.

Critério:

- O caso “1 conta selecionada” funciona idêntico a “N contas selecionadas”.

#### Fase A2 — Backend

- Relatórios:
  - Garantir que `accountIds` aceite `string` e normalize para array antes de montar `where.accountId in (...)`.
- Transações:
  - Evoluir `GET /api/transactions` para aceitar `accountIds` (multi) além de `accountId` (single).
  - Regra: se `accountIds` vier, ele tem precedência sobre `accountId`.

Arquivos-alvo:

- [reports.routes.ts](file:///home/vinicius/dev/dindinho/backend/src/reports/reports.routes.ts)
- [reports.service.ts](file:///home/vinicius/dev/dindinho/backend/src/reports/reports.service.ts)
- [transactions.routes.ts](file:///home/vinicius/dev/dindinho/backend/src/transactions/transactions.routes.ts)
- [transactions.service.ts](file:///home/vinicius/dev/dindinho/backend/src/transactions/transactions.service.ts)

#### Fase A3 — Frontend (componentização real)

- Criar um componente único de filtro por conta (ex.: `AccountFilterComponent`) com:
  - suporte a single-select ou multi-select via input (configurável), mas com visual consistente.
  - opção de exibir chips (padrão de Relatórios) e placeholder “Todas as contas”.
  - eventos claros: `selectionChange(accountIds: string[])` e util para derivar `accountId` quando houver exatamente 1 selecionada.
- Integrar o componente:
  - **Relatórios**: substituir o bloco atual do multi-select por esse componente.
  - **Transações**: substituir o select simples e alinhar UX (inclusive no painel de filtros).
- Garantir sincronização de query params:
  - Preferir `accountIds` sempre; opcionalmente manter `accountId` só para deep-link legado.
  - Drilldown de Relatórios → Transações deve manter filtros selecionados.

Arquivos-alvo:

- [reports.page.ts](file:///home/vinicius/dev/dindinho/frontend/src/pages/reports/reports.page.ts)
- [transactions.page.ts](file:///home/vinicius/dev/dindinho/frontend/src/pages/transactions/transactions.page.ts)

#### Fase A4 — Testes e critérios de aceite

- Unit tests do componente de filtro por conta (single, multi, empty, 1 item).
- Testes e2e/integração (se existirem) para:
  - selecionar 1 conta e confirmar filtro aplicado.
  - selecionar 2+ contas e confirmar filtro aplicado.
  - recarregar página preserva seleção via query params.

Critérios:

- A UX de filtro por conta é a mesma em Relatórios e Transações.
- O bug de “1 conta selecionada” deixa de existir.

## 🤝 Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e enviar pull requests.

---

Desenvolvido com ❤️ por Forja Corp
