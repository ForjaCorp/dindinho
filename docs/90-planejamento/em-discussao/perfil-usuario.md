---
id: pagina-perfil-preferencias
title: "Perfil do Usuário e Preferências"
description: "Criação da página de perfil para gestão de dados pessoais, configurações de conta e preferências de uso."
audience: ["dev", "ux"]
visibility: "interno"
status: "em-discussao"
owners: ["engineering"]
tags: ["planejamento", "rfc", "perfil", "configurações"]
mvp: true
createdAt: "2026-02-06"
---

# Planejamento: Perfil do Usuário e Preferências

## 📝 Contexto e Problema

- **Cenário Atual**: O Dindinho não possui uma página centralizada para o usuário gerenciar suas informações (nome, avatar, senha) ou preferências (moeda, idioma, tema).
- **Por que agora?**: À medida que o app cresce, o usuário precisa de autonomia para personalizar sua experiência e manter seus dados atualizados, seguindo o princípio de **Minimalismo Eficiente**.

## 🚀 Proposta de Solução

- **Visão Geral**: Criar uma nova rota `/profile` com seções claras para:
  1.  **Dados Pessoais**: Edição de nome, e-mail e avatar.
  2.  **Segurança**: Alteração de senha e gestão de sessões ativas.
  3.  **Preferências**: Moeda padrão, formato de data e modo escuro/claro.
  4.  **Conta**: Opção de exportação de dados (LGPD) e exclusão de conta.

## 📅 Cronograma de Execução (Fases)

### Fase 1: Backend e API de Perfil

- [ ] Endpoint `PATCH /api/users/me`: Atualização de dados cadastrais.
- [ ] Endpoint `PATCH /api/users/me/password`: Alteração segura de senha.
- [ ] Implementar upload de avatar (Storage local ou S3).
- **Critérios de Aceite**: Endpoints validados e protegidos por autenticação.

### Fase 2: Interface de Perfil (Frontend)

- [ ] Criar página de Perfil com componentes PrimeNG.
- [ ] Implementar upload de imagem com preview.
- [ ] Adicionar feedback visual de sucesso/erro nas atualizações.
- **Critérios de Aceite**: Interface responsiva e funcional conforme os princípios de design do projeto.

### Fase 3: Preferências e Persistência

- [ ] Implementar signal de `UserPreferences` no frontend.
- [ ] Persistir preferências no banco de dados (`User.preferences` como JSON).
- **Critérios de Aceite**: Mudanças de tema e moeda aplicadas instantaneamente em todo o app.

## 🏗️ Impacto Técnico

- **Banco de Dados**: Adicionar coluna `preferences` (JSON) na tabela `User`.
- **API**: Novos endpoints em `UsersController`.
- **Frontend**: Nova rota `/profile` e serviços de atualização de perfil.

## ✅ Definição de Pronto (DoD)

- [ ] Código testado (unitário no backend e frontend).
- [ ] Documentação de usuário atualizada.
- [ ] Acessibilidade validada (Aria labels, contraste).
- [ ] Lint/Typecheck sem erros.
