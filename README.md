# 💸 Dindinho

[![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.io/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
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
- **Framework**: Fastify
- **ORM**: Prisma
- **Banco de Dados**: MySQL

### Infraestrutura

- **Containerização**: Docker
- **Orquestração/Deploy**: Coolify (Apps Docker)

### Notas de API

Todas as rotas do backend são prefixadas com `/api`. Por exemplo:

- Login: `POST /api/auth/login`
- Transações: `GET /api/transactions`
- Relatórios: `GET /api/reports`

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

### Gestão de Estado e URL

Para garantir uma experiência de usuário consistente e compartilhável:

- O estado dos filtros (período, contas selecionadas) é sincronizado unidirecionalmente com a URL (Query Params).
- Utilizamos um serviço centralizado `UrlSyncService` e utilitários puros para converter o estado complexo da aplicação em parâmetros de URL e vice-versa.
- Isso permite que qualquer visualização (Transações ou Relatórios) seja compartilhada via link mantendo o mesmo contexto.

## 🛠️ Configuração do Ambiente

### Pré-requisitos

- Node.js (LTS v20+)
- Docker & Docker Compose
- npm (workspaces)

### Variáveis de Ambiente (Backend)

Crie um arquivo `.env` na raiz do backend:

```env
# Conexão com o Banco de Dados
DATABASE_URL="mysql://usuario:senha@localhost:3306/dindinho_dev"

# Segurança (JWT)
JWT_SECRET="segredo_para_gerar_tokens_de_autenticacao"

# Configuração do Servidor
PORT=3333
```

### Scripts Disponíveis

#### Scripts do Monorepo (Raiz)

```bash
# Setup completo do ambiente
npm run setup:dev      # Setup para desenvolvimento
npm run setup:prod     # Setup para produção

# Banco de dados
npm run db:up          # Inicia o banco com Docker
npm run db:down        # Para o banco
npm run db:logs        # Ver logs do banco

# Desenvolvimento
npm run dev            # Inicia backend + frontend
npm run build          # Build de todos os projetos
npm run test           # Executa todos os testes
```

#### Scripts do Backend

```bash
# Seed e setup
npm run seed           # Cria dados iniciais (dev)
npm run seed:prod      # Cria dados iniciais (prod)
npm run check:dev-user # Verifica usuário de desenvolvimento

# Prisma
npm run prisma:generate # Gera cliente Prisma
npm run prisma:migrate  # Executa migrações
npm run prisma:deploy   # Deploy de migrações (prod)

# Manutenção
npm run cleanup:refresh-tokens # Limpa tokens expirados
```

## 📅 Planejamento e Status

O desenvolvimento do Dindinho é guiado por um plano de execução estruturado em fases.

| Fase   | Descrição                                   | Status       |
| :----- | :------------------------------------------ | :----------- |
| **D0** | Inventário e pontos de entrada              | ✅ Concluído |
| **D1** | Padrões de contrato e compatibilidade       | ✅ Concluído |
| **D2** | Metadados de docs e backlog estruturado     | ✅ Concluído |
| **D3** | Geração de OpenAPI (Zod -> Swagger)         | ✅ Concluído |
| **D4** | Portal de documentação (Angular + Markdown) | ✅ Concluído |
| **D5** | Deploy no Coolify e infraestrutura          | ✅ Concluído |
| **D6** | Separação em 3 Tiers (Public/User/Admin)    | ✅ Concluído |
| **D7** | Domínios e Especialização de Conteúdo       | ✅ Concluído |
| **D8** | Operações, Persistência e Erros             | ✅ Concluído |

Para detalhes técnicos sobre o progresso e próximos passos, consulte o [Plano de Execução de Documentação](docs/90-backlog/planning/documentation.md).

## 🚀 Iniciando o Projeto

### Instalação

```bash
npm install
```

### Setup Rápido (Recomendado)

Execute o comando completo de setup para configurar o ambiente de desenvolvimento:

```bash
npm run setup:dev
```

Este comando executa:

1. Inicia o banco de dados com Docker
2. Gera o cliente Prisma
3. Executa as migrações
4. Cria dados iniciais (usuário dev e categorias)

### Executando Localmente (Passo a Passo)

Se preferir executar manualmente:

1. Inicie o banco de dados com Docker:

   ```bash
   npm run db:up
   ```

2. Execute as migrações do Prisma:

   ```bash
   npm --prefix backend run prisma:migrate
   ```

3. Crie dados iniciais (opcional, mas recomendado):

   ```bash
   npm --prefix backend run seed
   ```

4. Verifique se o usuário de desenvolvimento foi criado:

   ```bash
   npm --prefix backend run check:dev-user
   ```

5. Inicie backend + frontend (Turbo):

   ```bash
   npm run dev
   ```

6. Acesse:

- Frontend: [http://localhost:4200](http://localhost:4200)
- Backend: [http://localhost:3333](http://localhost:3333)

**Credenciais padrão de desenvolvimento:**

- Email: `dev@dindinho.com`
- Senha: `Password123!`

## 📦 Deploy e Infraestrutura

O projeto é entregue via aplicações Docker organizadas pelo Coolify, separando a aplicação em:

- Backend (Node/Fastify)
- Frontend (Nginx)
- Banco de dados MySQL persistente (serviço gerenciado ou container dedicado)

Referência de orquestração: `docker-compose.coolify.yml` demonstra a configuração de serviços e healthchecks para ambientes gerenciados pelo Coolify.

## 📚 Documentação

- [Padrões de Código](CODING_STANDARDS.md)
- [Autenticação](docs/30-api/authentication.md)
- [Scripts de Seed e Setup](docs/30-api/seed-scripts-setup.md)
- [Relatórios (módulo)](backend/src/reports/README.md)
- [Design: Página de Relatórios (Frontend)](docs/40-clients/pwa/reports-frontend.md)

## 📅 Planejamentos

- [TimeFilter — Iteração de melhorias (Concluído)](docs/90-backlog/planning/time-filter.md)
- [Filtro por conta unificado (Relatórios + Transações) (Concluído)](docs/90-backlog/planning/account-filter.md)
- [Refatoração: Sincronização de URL (Concluído)](docs/90-backlog/planning/refactor-url-sync.md)
- [Documentação — Plano de execução (Em andamento)](docs/90-backlog/planning/documentation.md)
- [Metas de Economia Híbridas (Em andamento)](docs/90-backlog/planning/planejamento-metas.md)
- [Sistema de Convites (Colaboração Multi-contas) (Pendente)](docs/90-backlog/planning/sistema-convites.md)
- [Plano de Testes E2E (Pendente)](docs/90-backlog/planning/test-plan-e2e.md)
- [Roadmap de Evolução e Backlog (Pendente)](docs/90-backlog/planning/evolucao-roadmap.md)
- [Evolução de Roteamento e API (Pendente)](docs/90-backlog/planning/ROUTING_EVOLUTION_PLAN.md)

## 🤝 Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e enviar pull requests.

---

Desenvolvido com ❤️ por Forja Corp
