---
id: adr-0008-estratégia-testes-data-testid
title: "ADR 0008: Estratégia de Testes e Uso de data-testid"
description: "Padronização da organização dos testes e uso de atributos data-testid para garantir testes resilientes a mudanças de layout."
audience: ["dev", "qa"]
visibility: "interno"
status: "estável"
owners: ["engineering"]
tags: ["arquitetura", "qa", "testes"]
mvp: true
createdAt: "2026-02-05"
---

# ADR 0008: Estratégia de Testes e Uso de data-testid

## Status

**Aceito** (Estável)

## Contexto

Testes automatizados frequentemente quebram quando o layout ou a estilização (classes CSS) mudam, mesmo que a lógica de negócio permaneça intacta. Além disso, a falta de padronização na nomenclatura e estrutura dos testes dificulta a manutenção e a leitura dos resultados.

## Decisão

Padronizamos a estratégia de testes no Dindinho com as seguintes diretrizes:

1.  **Seletores Resilientes:** É obrigatório o uso do atributo `data-testid` para selecionar elementos em testes unitários, de integração ou E2E.
    - Exemplo: `<button data-testid="submit-transaction">Salvar</button>`.
    - Evitar seletores baseados em classes CSS ou hierarquia complexa de DOM.
2.  **Nomenclatura de Testes:** As descrições dos testes (`describe`, `it`, `test`) devem ser escritas em **Português (PT-BR)** para facilitar o entendimento do domínio de negócio pela equipe.
3.  **Localização:** Arquivos `.spec.ts` devem residir ao lado do arquivo que estão testando.
4.  **Isolamento:** Preferir o uso de stubs para serviços e chamadas de rede para garantir que os testes de componente sejam rápidos e determinísticos.

## Consequências

### Prós

- **Resiliência:** Mudanças visuais ou refatorações de CSS não quebram os testes, desde que o `data-testid` seja mantido.
- **Clareza de Negócio:** Testes em português tornam a documentação viva do comportamento do sistema mais acessível.
- **Desacoplamento:** Separa a intenção do teste (funcionalidade) da implementação visual (UI).

### Contras

- **Boilerplate Adicional:** Necessidade de adicionar atributos extras ao HTML que não têm função em produção (embora possam ser removidos no build se necessário).
- **Disciplina da Equipe:** Exige que os desenvolvedores lembrem de adicionar os IDs durante o desenvolvimento da UI.
