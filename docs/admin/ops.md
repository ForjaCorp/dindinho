---
id: ops-guide
title: "Guia de Operações"
description: "Manual de manutenção, deploy e gerenciamento da infraestrutura do Dindinho."
audience: ["ops", "dev"]
visibility: "internal"
status: "wip"
owners: ["engineering"]
tags: ["ops", "deploy", "prisma", "maintenance"]
mvp: true
createdAt: "2026-02-03"
---

# 🛠️ Guia de Operações

Este documento centraliza as operações críticas para manter o Dindinho rodando, desde o setup inicial até o deploy em produção.

## 🚀 Setup Inicial

Para rodar o projeto localmente pela primeira vez:

1. **Instalar dependências**:

   ```bash
   npm install
   ```

2. **Configurar Ambiente**:
   Copie os arquivos `.env.example` para `.env` no backend e frontend.
   Certifique-se de que a `DATABASE_URL` aponta para uma instância MySQL válida.

3. **Preparar Banco**:
   ```bash
   cd backend
   npx prisma migrate dev
   npm run seed
   ```

## 🗄️ Banco de Dados (Prisma)

O Dindinho utiliza **MySQL** como banco de dados principal e **Prisma ORM** para modelagem e migrações.

### Comandos Comuns

- **Criar nova migração**: `npx prisma migrate dev --name <nome_da_migracao>`
- **Resetar banco**: `npx prisma migrate reset` (CUIDADO: Apaga todos os dados!)
- **Visualizar dados (Studio)**: `npx prisma studio`
- **Rodar Seeds**: `npm run seed` (Localizado em `backend/prisma/seed.ts`)

### Estratégia de Seeds

As seeds são idempotentes sempre que possível. Elas criam o usuário admin padrão (`admin@dindinho.com.br`) e categorias base para novos usuários.

## 🧹 Manutenção e Limpeza

### Token Cleanup Job

O sistema gera Refresh Tokens que são armazenados no banco. Para evitar crescimento indefinido da tabela `RefreshToken`:

- **Script**: `npm run cleanup:refresh-tokens`
- **Frequência recomendada**: Diariamente ou semanalmente.
- **Implementação**: O script remove tokens expirados há mais de 7 dias.

## 🚢 Deploy (Coolify / Docker)

O deploy é automatizado via **Coolify** utilizando o arquivo `docker-compose.coolify.yml`.

### Healthchecks

Cada serviço possui um healthcheck configurado:

- **Backend**: Verifica o endpoint `/health`.
- **Frontend/Docs**: Verifica a disponibilidade da porta HTTP.

### Variáveis de Produção Obrigatórias

- `DATABASE_URL`: String de conexão MySQL.
- `JWT_SECRET`: Chave secreta para tokens.
- `FRONTEND_URL`: URL base do frontend para CORS.
- `NODE_ENV`: Deve ser `production`.

## 📈 Monitoramento

Atualmente o monitoramento é feito via logs do Docker e painel do Coolify. Logs estruturados (Pino) são enviados para o stdout.
