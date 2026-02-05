---
id: guia-operacoes
title: "Guia de Operações"
description: "Documentação técnica sobre infraestrutura, banco de dados, deploy e manutenção do Dindinho."
audience: ["ops", "dev"]
visibility: "interno"
status: "em-progresso"
owners: ["engineering"]
tags: ["ops", "infra", "deploy", "banco-de-dados"]
mvp: true
createdAt: "2026-02-03"
---

# 🛠️ Guia de Operações

Este guia centraliza as informações necessárias para manter o ecossistema do Dindinho funcionando em produção e desenvolvimento.

## 🗄️ Banco de Dados (Prisma + MariaDB/MySQL)

O Dindinho utiliza o Prisma ORM para gerenciar o esquema e as migrações.

### Comandos Comuns

- **Gerar Cliente**: `npm run prisma:generate` (Executado automaticamente no build)
- **Criar Migração (Dev)**: `npm run prisma:migrate` (Abre prompt para nome da migração)
- **Aplicar Migrações (Prod)**: `npm run prisma:deploy` (Ideal para pipelines de CI/CD)

### Estado Atual

O banco de dados está configurado para MariaDB/MySQL. As migrações são armazenadas em `backend/prisma/migrations`.

## 🚀 Deploy e Infraestrutura

A infraestrutura é baseada em Docker e otimizada para ser gerenciada via [Coolify](https://coolify.io/).

### Arquivos de Configuração

- `docker-compose.coolify.yml`: Configuração principal para o deploy no Coolify.
- `backend/Dockerfile`: Build da imagem da API.
- `frontend/Dockerfile`: Build da imagem do PWA (Angular).

### Variáveis de Ambiente Críticas

| Variável       | Descrição                       | Exemplo                          |
| :------------- | :------------------------------ | :------------------------------- |
| `DATABASE_URL` | String de conexão com o banco   | `mysql://user:pass@host:3306/db` |
| `JWT_SECRET`   | Chave para assinatura de tokens | `super-secret-key`               |
| `FRONTEND_URL` | URL do frontend (para CORS)     | `https://app.dindinho.com.br`    |

## 🧹 Manutenção e Jobs

### Limpeza de Refresh Tokens

Para evitar o crescimento indefinido da tabela `RefreshToken`, existe um script de limpeza:

- **Comando**: `npm run cleanup:refresh-tokens`
- **Frequência Sugerida**: Diariamente (via Cron job).

## 🔍 Monitoramento e Saúde

### Endpoints de Health Check

- **API**: `/api/health` - Verifica conectividade com banco e status do processo.
- **Frontend**: Servido via Nginx (porta 80 no container).

### Logs

O backend utiliza o `pino` para logging estruturado em formato JSON.

- **Produção**: `LOG_LEVEL=info`
- **Desenvolvimento**: `LOG_LEVEL=debug`
