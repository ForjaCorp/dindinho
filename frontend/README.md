# Frontend — Dindinho

Este diretório contém o frontend da aplicação, desenvolvido em Angular (PWA).

Resumo rápido:

- Framework: Angular 21
- Tipo: Progressive Web App (PWA)
- Bundler: Angular CLI

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
cd backend
npm run start:dev

# iniciar frontend
cd frontend
ng serve --open
```

Testes

- Unitários (Angular/Jasmine/Karma):
  ```bash
  cd frontend
  ng test --watch=false
  ```
- Os testes de integração e e2e ainda não estão configurados; usar mocks e testes unitários durante desenvolvimento.

Campo `refreshToken`

- Observação: a API de autenticação pode retornar `refreshToken` no momento do login. Em desenvolvimento, os mocks e testes do frontend já foram adaptados para receber esse campo quando aplicável.

Foco atual e próximos passos (MVP)

- Prioridade de desenvolvimento para o frontend:
  - Implementar telas e serviços para `Categorias` (CRUD simples).
  - Implementar telas e serviços para `Transações` (registro, listagem e parcelamento básico).
  - Conectar as rotas e integrar o fluxo de autenticação com rotação de refresh tokens (`/refresh`) quando o backend estiver integrado.

Contribuição

- Este projeto usa workspace monorepo; ao desenvolver, prefira executar e testar localmente usando as ferramentas do monorepo.

Mais informações

- Consulte `backend/README.md` para instruções do backend e `CHANGELOG_PTBR.md` para um resumo das mudanças recentes.
