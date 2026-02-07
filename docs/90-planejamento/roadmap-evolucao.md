---
id: evolucao-roadmap
title: "Roadmap de Evolução e Backlog"
description: "Planejamento de longo prazo para novas funcionalidades, melhorias de infraestrutura e expansão do ecossistema Dindinho."
audience: ["dev", "produto", "ops"]
visibility: "interno"
status: "v1.0"
owners: ["produto", "engenharia"]
tags: ["roadmap", "planejamento", "estratégia", "visão"]
mvp: false
createdAt: "2026-02-03"
---

# 🚀 Roadmap de Evolução

Este documento centraliza as futuras expansões do Dindinho, detalhando arquitetura, casos de uso e impactos esperados para cada grande iniciativa, ordenados por essencialidade e complexidade (Opção 1: Foco em Acesso e Conversão).

---

## 🏁 Itens em Andamento / Curto Prazo (MVP)

Estes itens já possuem planejamento iniciado ou são essenciais para o fechamento imediato do MVP.

### 0. Refatoração de Roles e Permissões (Infra)

- **Status**: [Concluído](./concluido/refatoracao-roles-permissoes.md)
- **Foco**: Separação de SystemRole e ResourcePermission para suportar convites e multi-contas.

### 1. Sistema de Convites (Colaboração)

- **Status**: [Concluído](./concluido/sistema-convites.md)
- **Foco**: Fluxo de link de convite para compartilhar múltiplas contas com permissões (Viewer/Editor/Admin).

### 2. Plano de Testes E2E (Qualidade)

- **Status**: [Em Andamento](./em-andamento/plano-testes-e2e.md)
- **Foco**: Garantir a integridade dos fluxos críticos (Auth, Transações) com Playwright e MySQL efêmero.

### 3. Metas de Economia Híbridas

- **Status**: [Em Andamento](./em-discussao/planejamento-metas.md)
- **Foco**: Implementação do motor de cálculo para Limites de Gastos e Objetivos de Poupança.

### 4. Perfil do Usuário e Preferências

- **Status**: [Em Discussão](./em-discussao/perfil-usuario.md)
- **Foco**: Gestão de dados cadastrais, avatar e preferências de UI (moeda, tema).

### 5. Portal de Administração Centralizado

- **Status**: [Em Discussão](./em-discussao/portal-admin.md)
- **Foco**: Unificação de Allowlist e monitoramento em uma área restrita.

### 6. PWA Full (Progressive Web App)

- **Status**: [Em Discussão](./em-discussao/pwa-full.md)
- **Foco**: Transformar a aplicação Angular em um PWA completo com suporte a offline, instalação e APIs de hardware (Vibration/Badging). **Assenta a base necessária para o Sistema de Notificações.**

### 7. Sistema de Notificações

- **Status**: [Em Discussão](./em-discussao/notificacoes.md)
- **Foco**: Central de notificações in-app e push para alertas financeiros e convites. **Depende da infraestrutura de Service Worker do PWA.**

### 8. Privacidade e Criptografia E2E

- **Status**: [Em Discussão](./em-discussao/criptografia-privacidade.md)
- **Foco**: Criptografia na camada de aplicação para dados sensíveis.

### 9. Evolução de Roteamento e API

- **Status**: [Pendente](./em-discussao/evolucao-rotas.md)
- **Foco**: Padronização de slugs, versionamento de API e melhorias na navegação do portal.

### 10. Padronização de Versionamento (SemVer)

- **Status**: [Em Discussão](./em-discussao/planejamento-versionamento.md)
- **Foco**: Unificar o versionamento de todos os pacotes do monorepo e automatizar releases.

---

## 🖥️ Experiência Desktop (Responsividade)

Adaptação do app para telas grandes, garantindo que o gerenciamento financeiro seja confortável em qualquer dispositivo.

### 5. Responsividade para PC

- **Descrição**: Adaptação da interface mobile-first para telas grandes, aproveitando o espaço adicional para dashboards mais detalhados.
- **Arquitetura**: Grid layouts (Tailwind CSS), breakpoints específicos e refatoração de componentes de navegação (Sidebar vs Bottom Nav).
- **Impacto**: Melhora a usabilidade para usuários que gerenciam finanças em casa ou no trabalho.

---

## 🔐 Autenticação & Segurança (Fundação)

Funcionalidades críticas para preparar a casa para usuários reais com segurança.

### 6. Login OAuth (Social Login)

- **Descrição**: Permitir login via Google, Apple e Facebook.
- **Arquitetura**: Integração no backend (Fastify) com Passport ou biblioteca de OAuth2.
- **Impacto**: Reduz drasticamente a fricção no onboarding.

### 7. Termos de Privacidade e LGPD

- **Descrição**: Criação de termos reais, política de cookies e mecanismos de exportação/exclusão de dados.
- **Arquitetura**: Tabela de consentimento no banco, endpoints para compliance.
- **Impacto**: Segurança jurídica e confiança do usuário.

---

## 💰 Negócio & Onboarding (Crescimento e Monetização)

Focado em definir o valor do produto e converter visitantes em usuários pagantes.

### 8. Precificação e Compras In-app

- **Descrição**: Definição de níveis de serviço (Free/Premium/Family) e integração de pagamentos.
- **Arquitetura**: Integração com Stripe/Asaas para assinaturas web.
- **Impacto**: **Base do Negócio.** Define o que será vendido antes de criar o marketing.

### 9. Onboarding de Alta Conversão

- **Descrição**: Fluxo inicial de configuração guiado, rápido e visualmente atraente, baseado nos planos definidos.
- **Arquitetura**: Componentes de step-by-step com persistência de progresso.
- **Impacto**: Redução de abandono logo após o registro.

### 10. Landing Page de Alta Conversão

- **Descrição**: Site institucional focado em vendas, SEO e apresentação do mascote Dindinho.
- **Arquitetura**: SSR (Server Side Rendering) para máxima performance e indexação.
- **Impacto**: Atração orgânica de usuários para o produto já precificado.

---

## 🧪 Estratégia de Qualidade & Testes (Manutenibilidade)

Garantindo que a evolução do app não comprometa a estabilidade.

### 11. Testes de Regressão Visual

- **Foco**: Garantir que customizações (cores, skins) não quebrem o layout em diferentes dispositivos.

---

## 🤖 IA & Integrações Externas (Diferenciais de Utilidade)

Funcionalidades de alta complexidade para automação financeira.

### 13. Agente Financeiro WhatsApp (Dindinho Zap)

- **Descrição**: Assistente via WhatsApp para cadastrar transações e pedir resumos.
- **Arquitetura**: Webhooks do WhatsApp Business API.
- **Impacto**: **Onipresença.** Gerenciamento sem abrir o app.

### 14. Filtro de Transações por Notificações

- **Descrição**: Ler notificações de bancos para automatizar entrada de dados.

---

## 🦖 Experiência & Gamificação (Diferenciais de Marca)

Onde o Dindinho ganha vida e cria conexão emocional.

### 15. Dindinho Personalizável

- **Descrição**: Customização de cores e acessórios (skins) do mascote.
- **Impacto**: Diferenciação de mercado e retenção.

### 16. Metas Gamificadas

- **Descrição**: Bater metas faz o Dindinho crescer ou desbloquear itens.

---

## 📈 Brainstorm: Expansão de Escopo & Monetização (Futuro)

### 17. App Nativo (Android/iOS)

- **Descrição**: Builds nativos via **Capacitor**.
- **Impacto**: Presença em lojas. Deixado para o final devido ao custo (Apple Fee/Mac) e complexidade de manutenção.

### 18. Marketplace de Skins & Temas

### 19. Open Banking Integration (Read-only)

---

## 🔗 Links Relacionados

- [Princípios do Produto](../00-geral/principios.md)
- [Arquitetura Atual](../20-arquitetura/intro.md)
