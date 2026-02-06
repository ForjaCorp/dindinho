---
id: privacidade-criptografia-e2e
title: "Melhoria na Privacidade: Criptografia Ponta-a-Ponta"
description: "Implementação de criptografia na camada de aplicação para dados sensíveis, garantindo privacidade real conforme prometido."
audience: ["dev", "arquitetura"]
visibility: "interno"
status: "em-discussao"
owners: ["engineering"]
tags: ["planejamento", "rfc", "privacidade", "criptografia", "segurança"]
mvp: false
createdAt: "2026-02-06"
---

# Planejamento: Melhoria na Privacidade (Criptografia E2E)

## 📝 Contexto e Problema

- **Cenário Atual**: O app menciona criptografia ponta-a-ponta em placeholders, mas os dados financeiros (transações, nomes de contas) são armazenados em texto claro no banco de dados.
- **Por que agora?**: Para honrar o pilar de **Transparência & Confiança** e garantir que nem mesmo os administradores do banco de dados tenham acesso aos valores e descrições privadas dos usuários.

## 🚀 Proposta de Solução

- **Visão Geral**: Implementar criptografia na camada de aplicação (Client-Side Encryption ou Server-Side Encryption com chaves geradas pelo usuário).
- **Abordagem Técnica**:
  - Usar o padrão AES-256-GCM para campos sensíveis (`Transaction.description`, `Transaction.amount`, `Account.name`).
  - A chave mestra de criptografia é derivada da senha do usuário (via Argon2/PBKDF2) e nunca é armazenada em texto claro no servidor.
  - O backend processa os dados, mas não consegue "ler" o conteúdo sem a chave enviada temporariamente na sessão ou descriptografada no cliente.

## 📅 Cronograma de Execução (Fases)

### Fase 1: POC e Definição de Algoritmos

- [ ] Validar performance de criptografia AES no Frontend (Web Crypto API).
- [ ] Definir quais campos exatos serão criptografados (Princípio do Menor Privilégio).
- **Critérios de Aceite**: ADR aprovado com a estratégia de gestão de chaves.

### Fase 2: Implementação no Backend

- [ ] Atualizar schema para suportar dados binários/base64 nos campos sensíveis.
- [ ] Implementar middleware de descriptografia transparente para o usuário logado.
- **Critérios de Aceite**: Dados persistidos de forma ilegível no banco de dados.

### Fase 3: Integração no Frontend

- [ ] Implementar derivação de chave no login.
- [ ] Atualizar formulários para criptografar antes do envio.
- **Critérios de Aceite**: UX permanece fluida (transparente para o usuário).

## 🏗️ Impacto Técnico

- **Banco de Dados**: Alteração de tipos de coluna (String -> Text/Blob) para armazenar payloads criptografados.
- **API**: Mudança no processamento de payloads sensíveis.
- **Segurança**: Risco de perda de dados se o usuário esquecer a senha (necessidade de Recovery Kit/Chave de Recuperação).

## ✅ Definição de Pronto (DoD)

- [ ] Auditoria de segurança interna realizada.
- [ ] Testes de performance (latência de criptografia).
- [ ] Documentação de privacidade atualizada (LGPD).
- [ ] Lint/Typecheck sem erros.
