---
id: backend-standards
title: "Padrões de Desenvolvimento Backend"
description: "Diretrizes de arquitetura, padrões de código e boas práticas para a API do Dindinho."
audience: ["dev"]
visibility: "interno"
status: "estável"
owners: ["engineering"]
tags: ["backend", "arquitetura", "fastify", "prisma", "zod"]
mvp: true
createdAt: "2026-02-05"
---

# Padrões de Desenvolvimento Backend 🚀

Este documento estabelece as diretrizes técnicas para o desenvolvimento da API do Dindinho, garantindo consistência, segurança e performance.

## 🏗️ Arquitetura (Service Pattern)

Seguimos uma separação clara de responsabilidades para facilitar testes e manutenção:

1.  **Controllers (Routes):** Apenas extração de parâmetros e chamada de serviços.
2.  **Services:** Onde reside toda a lógica de negócio. Não devem lidar com detalhes de HTTP.
3.  **Data Access (Prisma):** Interação direta com o banco de dados via Prisma Client.

## 🛡️ Validação de Dados (Zod)

O uso de schemas **Zod** é obrigatório para todos os pontos de entrada de dados.

- **Body/Params/Querystring:** Devem ser validados no nível da rota.
- **Contratos Compartilhados:** Use `@dindinho/shared` para tipos que trafegam entre frontend e backend.
- **OpenAPI:** A documentação (Swagger) é gerada automaticamente a partir desses schemas.

## 🚨 Tratamento de Erros

Nunca retorne erros genéricos 500 para falhas de validação ou lógica.

- **400 (Bad Request):** Erros de sintaxe ou payload malformado.
- **401 (Unauthorized):** Falha na autenticação (token inválido/expirado).
- **403 (Forbidden):** Usuário autenticado mas sem permissão para o recurso.
- **404 (Not Found):** Recurso não encontrado.
- **422 (Unprocessable Entity):** Erros de regra de negócio (ex: saldo insuficiente).
- **429 (Too Many Requests):** Limite de requisições excedido (Rate Limiting).

## 🛡️ Segurança e Resiliência (Rate Limiting)

Para proteger a API contra abusos e ataques de força bruta, implementamos **Rate Limiting** no nível da aplicação usando o plugin `@fastify/rate-limit`.

- **Escopo:** Aplicado globalmente em rotas sensíveis e especificamente em módulos críticos (ex: Convites).
- **Identificação:** O limite é controlado por IP, respeitando o header `X-Real-IP` quando disponível (atrás de proxy).
- **Configuração:** Os limites são parametrizáveis via variáveis de ambiente:
  - `RATE_LIMIT_MAX`: Limite global (default: 100 req/min).
  - `INVITE_RATE_LIMIT_MAX`: Limite para o sistema de convites (default: 20 req/min).
- **Resposta:** Quando o limite é excedido, a API retorna um erro 429 com uma mensagem amigável e o código `TOO_MANY_REQUESTS`.

## 📊 Banco de Dados (Prisma & MariaDB)

- **Migrations:** Sempre use `prisma migrate dev` para alterações de schema.
- **N+1 Queries:** Evite loops que fazem queries individuais. Use `include` ou `select` do Prisma para buscar relações de forma otimizada.
- **Transações:** Use `$transaction` quando múltiplas operações de escrita precisarem ser atômicas.

## 📝 Logging e Monitoramento

- **Níveis de Log:**
  - `INFO`: Fluxos normais de sucesso.
  - `WARN`: Situações inesperadas mas recuperáveis.
  - `ERROR`: Falhas críticas que exigem intervenção.
- **Padrão:** Mensagens claras em Português ou Inglês (seja consistente no arquivo).

## 🧪 Estratégia de Testes

- **Unitários:** Testam serviços de forma isolada com mocks de banco de dados.
- **Integração:** Testam rotas reais usando `vitest` + `supertest` contra um banco efêmero.

---

> **Dica:** Sempre execute `npm run lint` antes de realizar o commit para garantir que os padrões estão sendo seguidos.
