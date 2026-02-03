---
id: routing-evolution-plan
title: "Planejamento de Evolução: Arquitetura de Roteamento e API"
description: "Estratégia de evolução da arquitetura de roteamento e infraestrutura do Dindinho, focada em escalabilidade e resiliência."
audience: ["dev", "ops"]
visibility: "internal"
status: "planning"
owners: ["engineering"]
tags: ["routing", "architecture", "nginx", "api"]
mvp: false
---

# Planejamento de Evolução: Arquitetura de Roteamento e API

Este documento detalha a estratégia de evolução da arquitetura de roteamento e infraestrutura do Dindinho, focada em escalabilidade, resiliência e manutenibilidade.

---

## Estratégia Geral

O sistema utiliza um modelo de **Proxy Reverso** com Nginx, onde o frontend e o backend compartilham o mesmo domínio, diferenciados pelo prefixo `/api`. O objetivo é consolidar as boas práticas e preparar a aplicação para crescimento.

---

## Cronograma de Evolução

### Fase 1: Padronização e Versionamento (Curto Prazo)

O objetivo é isolar a API atual para permitir evoluções futuras sem quebrar clientes legados.

- [ ] **Introduzir Versionamento de API (`/v1`)**
  - Mover todas as rotas de negócio no backend para o prefixo `/api/v1`.
  - Atualizar `environment.prod.ts` e `environment.ts` para incluir a versão na `apiUrl`.
  - Manter redirecionamento temporário de `/api` para `/api/v1` no Nginx para transição suave.
- [ ] **Unificação de Schemas OpenAPI**
  - Garantir que todos os modelos compartilhados em `@dindinho/shared` tenham `zod-to-json-schema` configurado.
  - Adicionar validação de tipos estrita no Swagger UI.
- [ ] **Critérios de Aceite:**
  - [ ] Requisições em `/api/v1/auth/login` retornam 200 OK.
  - [ ] Documentação disponível em `/api/docs` reflete as rotas `/v1`.
  - [ ] Frontend funcionando sem alterações manuais de path em cada serviço.

### Fase 2: Resiliência e Observabilidade (Médio Prazo)

Melhorar a forma como detectamos falhas de roteamento e integração.

- [ ] **Health Checks Granulares**
  - Implementar `/health/liveness` (o servidor está de pé?).
  - Implementar `/health/readiness` (o banco e serviços externos estão prontos?).
  - Configurar Nginx para usar esses novos endpoints em vez do `/health` genérico.
- [ ] **Monitoramento de Erros de Roteamento**
  - Configurar logs customizados no Nginx para capturar 404s em recursos estáticos (`.js`, `.css`).
  - Adicionar `requestId` em todos os headers de resposta da API para rastreabilidade (Correlation ID).
- [ ] **Critérios de Aceite:**
  - [ ] Ferramenta de monitoramento consegue distinguir entre falha de app e falha de banco.
  - [ ] Logs do Nginx mostram o `requestId` gerado pelo backend.

### Fase 3: Automação e Segurança (Longo Prazo)

Reduzir a dependência de configurações manuais e fortalecer o perímetro.

- [ ] **Geração Automática de Client API**
  - Configurar script para gerar o `api.service.ts` e interfaces TypeScript diretamente do JSON do Swagger.
  - Eliminar a necessidade de duplicar DTOs manualmente no frontend.
- [ ] **Hardening do Nginx**
  - Implementar Rate Limiting no nível do Nginx (além do backend) para ataques de força bruta.
  - Configurar buffers de proxy para evitar ataques de Slowloris.
- [ ] **Critérios de Aceite:**
  - [ ] Build do frontend falha se houver quebra de contrato na especificação OpenAPI do backend.
  - [ ] Nginx bloqueia IPs que excederem 100 req/sec antes de sobrecarregar o Node.js.

---

## Arquitetura Proposta

```mermaid
graph TD
    A[Internet] --> B[Nginx Proxy]
    B -->|/api/v1/*| C[Fastify Backend]
    B -->|/api/docs| D[Swagger UI]
    B -->|/*| E[Angular SPA]
    C -->|Shared Types| F[@dindinho/shared]
    E -->|Shared Types| F
```

## Diretrizes de Implementação

1. **Case Sensitivity:** O roteamento deve ser sempre em minúsculas para evitar ambiguidades.
2. **Trailing Slashes:** Seguir a política de "No Trailing Slash" para evitar redirecionamentos indesejados de POST para GET.
3. **Prefixos:** Manter o prefixo `/api` como separador lógico entre aplicação estática e serviços dinâmicos.
