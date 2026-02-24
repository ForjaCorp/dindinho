---
id: architecture
title: "Arquitetura do Sistema"
description: "Visão geral da arquitetura técnica do ecossistema Dindinho, incluindo serviços, infraestrutura e padrões de comunicação."
audience: ["dev", "arquitetura", "ops"]
visibility: "interno"
status: "estável"
owners: ["engineering"]
tags: ["arquitetura", "técnico", "visão-geral"]
mvp: true
createdAt: "2026-02-04"
---

# Arquitetura do Sistema 🏛️

O Dindinho é construído sobre uma arquitetura de **Monorepo Moderna**, projetada para escala, consistência de dados e alta produtividade no desenvolvimento.

## 🧱 Visão Geral dos Componentes

A arquitetura é dividida em três camadas principais coordenadas por um orquestrador de monorepo (**Turborepo**):

### 💻 Frontend (Angular PWA)

- **App Shell:** Configuração central e roteamento.
- **Pages:** Componentes de página carregados via lazy-loading.
- **Shared Components:** Biblioteca de componentes UI reutilizáveis.
- **Signals State:** Gerenciamento de estado reativo granular.

### 🔄 Shared (@dindinho/shared)

- **Zod Schemas:** Definição de contratos de validação para API e Formulários.
- **TypeScript Interfaces:** Tipagem compartilhada entre front e back.

### ⚙️ Backend (Fastify API)

- **Routes:** Definição de endpoints com validação automática via Zod.
- **Services:** Camada de lógica de negócio pura.
- **Prisma ORM:** Acesso ao banco de dados com tipagem estrita.

### 🗄️ Infraestrutura

- **MySQL DB:** Banco de dados relacional para persistência (MariaDB).
- **Docker/Coolify:** Empacotamento em containers e gerenciamento de deploy automático.
- **CI/CD Quality Gate:** Pipeline paralelo com Sharding E2E e validação automática de PR Previews.

## 🚀 Pilares Arquiteturais

### 1. Monorepo e Turborepo

Utilizamos **npm workspaces** e **Turborepo** para gerenciar o projeto. Isso permite:

- **Compartilhamento de código:** Reutilização real de schemas de validação e tipos entre frontend e backend.
- **Cache Inteligente:** Builds e testes rápidos, executando apenas o que foi alterado.
- **Single Source of Truth:** Uma única versão de dependências críticas em todo o projeto.

### 2. Type Safety Ponta-a-Ponta (Zod)

A segurança de tipos não para no TypeScript. Utilizamos o **Zod** no pacote `@dindinho/shared` para:

- Definir o contrato de entrada e saída das APIs.
- Validar dados no frontend antes do envio.
- Validar dados no backend no recebimento.
- Garantir que o frontend nunca receba dados em um formato inesperado.

### 3. Frontend Reativo com Signals

O frontend utiliza **Angular 21+** com uma arquitetura **Signals-Only**.

- **Performance:** Mudanças no estado disparam atualizações granulares no DOM, sem necessidade de zone.js (Zoneless).
- **Simplicidade:** O fluxo de dados é unidirecional e previsível.
- **Standalone:** Componentes 100% independentes (sem NgModules).

### 4. Backend Fastify e Prisma

O backend é focado em performance e simplicidade:

- **Fastify:** Framework web extremamente rápido com baixo overhead.
- **Prisma ORM:** Tipagem forte para o banco de dados, eliminando erros de SQL em runtime.
- **Stateless:** Autenticação via JWT + Refresh Token, permitindo escalabilidade horizontal.

## 📚 Guias Detalhados

Para aprofundar em cada área, consulte nossos guias específicos:

- [Padrões de Frontend](./padroes-frontend.md)
- [Padrões de Backend](./padroes-backend.md)
- [Convenções de Nomenclatura](./convencoes-nomenclatura.md)
- [Estratégia de Testes](./estrategia-testes.md)

## 📜 Decisões de Arquitetura (ADRs)

Para entender o "porquê" de cada escolha técnica, consulte nossos registros de decisão:

- [Ir para Architectural Decision Records (ADRs)](./adr/intro.md)

## 🌐 Infraestrutura e Deploy

O Dindinho segue a filosofia de **Infraestrutura Imutável**:

- **Docker:** Tudo roda em containers, garantindo que o ambiente de dev seja idêntico ao de produção.
- **Coolify:** Nossa plataforma de PaaS que gerencia o ciclo de vida do deploy, certificados SSL e banco de dados.
- **PWA:** A aplicação é instalável e funciona offline, otimizada para dispositivos móveis.
