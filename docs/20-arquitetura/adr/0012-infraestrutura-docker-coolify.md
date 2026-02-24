---
id: adr-0012-infraestrutura-docker-coolify
title: "ADR 0012: Infraestrutura Imutável via Docker e Coolify"
description: "Decisão de utilizar containers Docker para empacotamento e a plataforma Coolify para orquestração e gerenciamento simplificado de infraestrutura."
audience: ["ops", "dev"]
visibility: "interno"
status: "estável"
owners: ["engineering"]
tags: ["arquitetura", "ops", "infraestrutura", "docker", "cloud"]
mvp: true
createdAt: "2026-02-05"
---

# ADR 0012: Infraestrutura Imutável via Docker e Coolify

## Status

**Aceito** (Estável)

## Contexto

O Dindinho precisa de um ambiente de deploy que seja reprodutível, fácil de gerenciar e que minimize o "funciona na minha máquina". Além disso, como uma startup/projeto ágil, precisamos de uma solução de "PaaS Self-Hosted" que evite a complexidade de gerenciar servidores bare-metal ou clusters Kubernetes complexos.

## Decisão

Padronizamos a infraestrutura baseada em containers:

1.  **Docker:** Todos os serviços (Frontend, Backend, Banco de Dados) são empacotados como imagens Docker.
2.  **Docker Compose:** Utilizado para definir a orquestração local e servir de base para o deploy.
3.  **Coolify:** Adotado como plataforma de gerenciamento de deploy (Self-Hosted PaaS). Ele automatiza o build via GitHub Webhooks, gerencia certificados SSL (Let's Encrypt), logs e monitoramento básico.
4.  **PR Previews:** Implementação de ambientes efêmeros para cada Pull Request, permitindo validação isolada de funcionalidades antes do merge.
5.  **Isolamento de Banco de Dados:** Para ambientes de Preview, utiliza-se uma instância dedicada de MariaDB via Docker Compose para garantir que testes paralelos não interfiram entre si, enquanto a Produção utiliza um banco de dados gerenciado externo.
6.  **Infraestrutura como Código:** O arquivo `docker-compose.coolify.yml` e as configurações de variáveis de ambiente no Coolify servem como a definição da nossa infraestrutura.

## Consequências

### Prós

- **Isolamento:** Cada serviço roda em seu próprio ambiente isolado com suas dependências específicas.
- **Agilidade de Deploy:** O fluxo "Push to Deploy" via Coolify reduz drasticamente o tempo entre o desenvolvimento e a produção.
- **Custo-Benefício:** Coolify permite gerenciar múltiplos serviços em um único VPS de forma organizada.
- **Reprodutibilidade:** O ambiente de produção é identico ao de staging/desenvolvimento.

### Contras

- **Dependência de Ferramenta:** Dependemos da estabilidade do Coolify para gerenciar os deploys (embora possamos sempre voltar para Docker puro).
- **Sobrecarga de Recurso:** Rodar múltiplos containers exige mais memória/CPU do que rodar processos nativos diretamente no host.
