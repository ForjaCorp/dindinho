---
id: deploy
title: "Guia de Deploy"
description: "Processos de deploy, integração contínua e gerenciamento de infraestrutura via Coolify e Docker."
audience: ["ops", "dev"]
visibility: "interno"
status: "estável"
owners: ["engineering"]
tags: ["deploy", "ops", "infraestrutura", "docker"]
mvp: true
createdAt: "2026-02-04"
---

# Guia de Deploy

O deploy do Dindinho é automatizado e baseado em containers.

## Infraestrutura

- **Orquestração:** Docker Compose.
- **Gerenciamento:** Coolify.
- **Ambientes:** Staging e Production.
