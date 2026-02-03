# Frontend — Dindinho

Este diretório contém o frontend da aplicação, desenvolvido em Angular (PWA).

Resumo rápido:

- Framework: Angular 21
- Tipo: Progressive Web App (PWA)
- Bundler: Angular CLI
- Reatividade: Signals exclusivo (sem RxJS para estado síncrono)
- Componentes: Obrigatório `standalone: true`
- Inputs/Outputs: API de Signals (`input()`, `output()`, `model()`)
- Templates: Control Flow (`@if`, `@for`, `@switch`) - proibido `*ngIf/*ngFor`
- Animações: CSS nativo via PrimeNG v21+ (proibido `provideAnimations()`)
- Rotas: Lazy loading mandatório via `loadComponent`
- Assets: Imagens estáticas devem usar diretiva `NgOptimizedImage`

Visão do projeto (frontend)

- O frontend consome a API do backend localizada em `http://localhost:3333` por padrão em ambiente de desenvolvimento.
- O pacote compartilhado `@dindinho/shared` existe como workspace e contém schemas/DTOs usados pelo frontend e backend.

Pré-requisitos (desenvolvimento)

- Node.js (LTS 20+)
- npm
- Backend rodando localmente (veja `backend/README.md`)

Como rodar (desenvolvimento)

```bash
# no root do monorepo
npm install

# iniciar backend em outro terminal (porta 3333 por padrão)
npm --prefix backend run dev

# iniciar frontend
npm --prefix frontend run dev -- --open
```

Testes

- Unitários (Angular CLI + Vitest):

```bash
npm --prefix frontend run test
```

- Integração/e2e ainda não estão configurados.

Campo `refreshToken`

- Observação: a API de autenticação pode retornar `refreshToken` no momento do login. Em desenvolvimento, os mocks e testes do frontend já foram adaptados para receber esse campo quando aplicável.

Contribuição

- Este projeto usa workspace monorepo; ao desenvolver, prefira executar e testar localmente usando as ferramentas do monorepo.

Mais informações

- Consulte `backend/README.md` para instruções do backend e `CHANGELOG_PTBR.md` para um resumo das mudanças recentes.
- Fluxo de autenticação (frontend + API): [authentication.md](../docs/30-api/authentication.md)
- Plano de documentação (portal + contratos + API): [documentation.md](../docs/90-backlog/planning/documentation.md)
