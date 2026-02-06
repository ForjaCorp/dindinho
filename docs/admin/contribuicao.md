---
id: contribuicao
title: "Guia de Contribuição"
description: "Fluxo de trabalho, padrões e diretrizes para o time interno contribuir com o monorepo Dindinho."
audience: ["dev", "arquitetura"]
visibility: "interno"
status: "estável"
owners: ["engineering"]
tags: ["contribuição", "fluxo", "git", "padrões"]
mvp: true
createdAt: "2026-02-05"
---

# Guia de Contribuição 🚀

Bem-vindo ao coração técnico do Dindinho! Este guia é destinado exclusivamente aos membros do time interno para garantir que nossas contribuições mantenham o alto nível de qualidade e consistência que o projeto exige.

## 🛠️ Setup do Ambiente

O Dindinho é um monorepo que utiliza npm workspaces (futuramente pnpm).

1. **Requisitos:**
   - Node.js (v20+)
   - PostgreSQL (Rodando localmente ou via Docker)
   - Git

2. **Instalação:**

   ```bash
   git clone <repo-url>
   npm install
   ```

3. **Backend:**

   ```bash
   cd backend
   cp .env.example .env # Configure sua DATABASE_URL
   npx prisma migrate dev
   npm run dev
   ```

4. **Frontend:**
   ```bash
   cd frontend
   npm run start
   ```

## 🔄 Fluxo de Trabalho (Git)

Seguimos um fluxo baseado em **Trunk Based Development** para agilidade, com revisões rigorosas.

- **Branches:** Use o padrão `tipo/breve-descricao` (ex: `feat/validação-transacao`, `fix/erro-login`).
- **Pull Requests:**
  - Devem passar em todos os testes e lint antes do merge.
  - Requerem pelo menos uma aprovação de outro membro do time.
  - Devem ter descrições claras do que foi alterado e por quê.

## 📏 Padrões de Código

Consulte o [Guia de Nomenclatura](../20-arquitetura/convencoes-nomenclatura.md) para detalhes técnicos. Resumo dos nossos pilares:

1. **Zero-Tolerance Policy:**
   - Proibido o uso de `any` (use tipos específicos ou `unknown`).
   - Proibido suprimir erros com `@ts-ignore` (corrija a lógica).
   - Proibido deixar `console.log` no código de produção.
2. **Qualidade em Primeiro Lugar:**
   - Use **Angular Signals** para reatividade no frontend.
   - Escreva testes em **Português** para descrever o comportamento do negócio.
   - Mantenha a documentação JSDoc em **Português** para lógicas complexas.

## 🧪 Testes e Qualidade

Antes de abrir um PR, certifique-se de que tudo está verde:

- **Lint:** `npm run lint` (no frontend e backend).
- **Testes Unitários/Integração:** `npm run test`.
- **Documentação:** Se alterou lógica de negócio ou API, atualize o arquivo `.md` correspondente em `/docs`.

## 🆘 Precisa de Ajuda?

Se encontrar problemas no setup ou tiver dúvidas arquiteturais, consulte os [ADRs](../20-arquitetura/adr/intro.md) ou fale com o time no canal de engenharia.

---

**Lembre-se:** Código limpo é código que o seu colega (ou você daqui a 6 meses) consegue ler e manter sem sofrimento.
