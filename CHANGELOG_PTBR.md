# CHANGELOG — Resumo em Português (PT-BR)

Última atualização: 2025-12-12

## 1.0.0 - 2025-12-12

Nota: esta tag `v1.0.0` representa o primeiro release/snapshot do projeto — um baseline inicial do MVP em desenvolvimento.

**Observação**: também mantemos referência a `0.1.0` como versão do pacote compartilhado `@dindinho/shared`.

## Principais mudanças

- feat(auth): implementação de refresh tokens seguros
  - Refresh tokens agora são gerados como tokens randomizados, retornados raw ao cliente apenas no login e armazenados no servidor como hash SHA-256 binário (BINARY(32)).
  - Tokens são rotacionados no endpoint `/refresh`: o token antigo é validado e revogado; um novo refresh token é criado e retornado.

- refactor(db): migração e tipos Prisma
  - A coluna `RefreshToken.token` foi convertida para `BINARY(32)` no banco e o `schema.prisma` atualizado para usar `Bytes @db.Binary(32)`.
  - Prisma Client foi gerado localmente; consumidores do pacote Prisma precisam regenerar o client após aplicar migrations.

- infra/ops: limpeza de tokens expirados
  - Script one-shot `backend/scripts/cleanup-refresh-tokens.ts` e o `npm run cleanup:refresh-tokens` foram adicionados para execução periódica fora do processo API (ex.: CronJob Kubernetes).
  - `ENABLE_REFRESH_CLEANUP` é uma feature flag disponível, mas não recomendamos habilitar em réplicas da API em produção — prefira CronJob centralizado.

- pacote compartilhado: `@dindinho/shared`
  - Bumped para `0.1.0` e esquema de resposta de login (`LoginResponseDTO`) agora inclui `refreshToken`.
  - Frontend atualizado para usar o novo campo nos mocks/testes.

## Segurança e comportamento

- Apenas o hash (SHA-256) do refresh token é persistido — o valor raw é conhecido somente pelo cliente e pelo momento de criação.
- TTL configurável via `REFRESH_TOKEN_DAYS` (default 7 dias).

## Como aplicar em staging/produção

1. Gerar backup do banco antes de aplicar a migration.
2. Executar no servidor de deploy:

```bash
cd backend
npx prisma migrate deploy --schema=backend/prisma/schema.prisma
npx prisma generate --schema=backend/prisma/schema.prisma
```

3. Reiniciar os pods/serviços do backend.
4. Rodar o script de limpeza manualmente (opcional) para sincronizar estado:

```bash
npm run cleanup:refresh-tokens
```

## Observações e próximos passos

- Revisar política de revogação caso deseje suportar múltiplos dispositivos por usuário (hoje a rotação/revogação cobre cenário básico).
- Publicar versão do pacote `@dindinho/shared` no registry interno (se aplicável) antes de atualizar consumidores externos.
- Coordenar com equipe de infraestrutura para aplicar migration em staging e executar smoke tests.
