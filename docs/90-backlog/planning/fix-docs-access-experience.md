---
id: fix-docs-access-experience
title: "Correção da Experiência de Acesso à Documentação e Redirecionamento"
description: "Melhoria no fluxo de redirecionamento pós-login para documentação e isolamento do subdomínio de docs."
audience: ["dev", "ops", "produto"]
visibility: "interno"
status: "em-progresso"
owners: ["engineering"]
tags: ["planejamento", "ux", "autenticação", "roteamento"]
mvp: true
createdAt: "2026-02-04"
updatedAt: "2026-02-04"
---

# Planejamento: Correção da Experiência de Acesso à Documentação

## 🚧 Status: Em Revisão (Fase 3 Adicionada)

A implementação inicial foi concluída, mas novos problemas de UX foram identificados na experiência do portal de documentação.

## 📝 Contexto e Problema

Atualmente, a experiência de acesso à documentação através do subdomínio `docs.dindinho.forjacorp.com` apresenta falhas críticas de UX e segurança lógica:

1.  **Redirecionamento Inexistente**: Ao tentar acessar uma página protegida da documentação sem estar logado, o usuário é levado ao login, mas o parâmetro `returnUrl` chega vazio ou não é respeitado corretamente no redirecionamento final.
2.  **Vazamento de Escopo**: O subdomínio destinado à documentação permite o acesso e uso pleno da aplicação principal (dashboard, etc.), o que dilui a proposta de valor do subdomínio e pode confundir o usuário.
3.  **Dificuldade de Acesso Público**: Não há um redirecionamento automático para a documentação pública quando o usuário acessa a raiz do subdomínio sem estar autenticado.
4.  **Inconsistência de Layout (Novo)**: Ao acessar `/docs` após o login, o sistema utiliza o layout principal do aplicativo em vez do layout especializado de documentação.
5.  **Página Inicial Inadequada (Novo)**: A página inicial da documentação está exibindo um arquivo de planejamento interno (`documentation.md`) em vez de uma introdução amigável.

## 🚀 Proposta de Solução

A solução consiste em quatro pilares:

1.  **Isolamento de Subdomínio**: Implementar lógica no `AppModule` ou em um inicializador de rotas que detecte se a aplicação está rodando no subdomínio `docs`. Se estiver, qualquer tentativa de acessar rotas que não comecem com `/docs` ou `/login`/`/signup` deve ser redirecionada para a raiz da documentação ou para o domínio principal da aplicação.
2.  **Correção do Deep Linking**: Ajustar o `AuthGuard` e o `LoginComponent` para garantir que a URL original (ex: `/docs/admin/api-ref`) seja preservada no `returnUrl` e que o `AuthService.login` a utilize fielmente.
3.  **Landing Page de Docs**: Se o usuário acessar a raiz do subdomínio `docs`, ele deve cair na documentação pública por padrão, em vez de ser forçado ao login da aplicação.
4.  **Especialização de Layout e Navegação**: Garantir que todas as rotas de `/docs` utilizem layouts específicos (`UserDocsLayout` ou `AdminDocsLayout`) e que links de saída para o app principal respeitem a mudança de domínio.

## 📅 Cronograma de Execução (Fases)

### Fase 1: Correção do Fluxo de Autenticação e Redirecionamento (Concluída)

- [x] Revisar `AuthGuard` para garantir a captura correta da URL completa (incluindo fragmentos e query params) no `returnUrl`.
- [x] Ajustar `LoginComponent` para ler e propagar o `returnUrl` corretamente para o `AuthService`.
- [x] Validar no `AuthService` o redirecionamento pós-login.

### Fase 2: Restrição de Escopo do Subdomínio Docs (Concluída)

- [x] Implementar um `SubdomainGuard` ou lógica no `app.component.ts` que identifique o host `docs.dindinho.*`.
- [x] Se o host for `docs`, redirecionar acessos a rotas não-docs (ex: `/dashboard`, `/transactions`) para o domínio principal `dindinho.forjacorp.com` ou exibir uma página de "Direcionamento".
- [x] Configurar a rota raiz (`/`) no subdomínio de docs para apontar para a introdução da documentação pública.

### Fase 3: Refinamento de UX e Layout do Portal (Concluída)

- [x] Ajustar `app.routes.ts` para que a rota `/docs` utilize o `UserDocsLayoutComponent` por padrão.
- [x] Alterar o fallback de conteúdo no `DocsPage` de `documentation.md` para `00-overview/principles.md`.
- [x] Corrigir o botão "Voltar para o App" nos layouts de documentação para forçar a navegação para o domínio principal (sem prefixo `docs.`).
- [x] Garantir que o subdomínio `docs.` não exiba componentes do dashboard ou menus do app principal.
- [x] Atualizar ícone de "Metas de Economia" para `pi-briefcase` (PrimeIcons) para melhor representação visual.

### Fase 4: Estabilização de Testes e Reatividade (Concluída)

- [x] Refatorar `DocsPage` para usar `Signals` reativos (`toSignal`) em vez de snapshots estáticos de rota.
- [x] Atualizar `docs.page.spec.ts` para suportar testes assíncronos de navegação usando `Subject` e `Observable`.
- [x] Eliminar avisos de lint e garantir conformidade com `ts-ignore` e `any` (Zero Tolerance).
- [x] Validar reação a mudanças sucessivas de parâmetros de rota no portal de documentação.

## 🏗️ Impacto Técnico

- **Banco de Dados**: Nenhum impacto.
- **API**: Configuração de CORS ajustada no `app.ts` para permitir `*.localhost`.
- **Frontend**:
  - Mudanças no `AuthGuard`.
  - Novo `SubdomainGuard` injetado nas rotas.
  - Ajustes na configuração de rotas (`app.routes.ts`) com redirecionamentos inteligentes por hostname.

## ✅ Definição de Pronto (DoD)

- [x] Fluxo de redirecionamento `returnUrl` testado e funcionando para docs internos.
- [x] Acesso à aplicação principal bloqueado/redirecionado quando no subdomínio `docs`.
- [x] Documentação atualizada refletindo as novas regras de acesso.
- [x] Lint/Typecheck sem erros.

## 🔍 Evidências de Validação (Chrome MCP)

1. **Redirecionamento Raiz**: `docs.localhost:4200/` -> `docs.localhost:4200/docs/public/principles` (OK)
2. **Isolamento**: `docs.localhost:4200/dashboard` -> `docs.localhost:4200/docs` (OK)
3. **Deep Link**: Acesso a `/docs/user/intro` deslogado -> Login -> Redirecionamento para `/docs/user/intro` (OK)
4. **CORS**: Chamadas ao backend `localhost:3333` a partir de `docs.localhost:4200` (OK)
