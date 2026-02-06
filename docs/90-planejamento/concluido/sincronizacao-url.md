---
id: doc-refactor-url-sync
title: "Refatoração da Sincronização de URL (Query Params)"
description: "Plano para centralizar sincronização de filtros via query params em um serviço/utilitários."
audience: ["dev"]
visibility: "interno"
status: "concluido"
owners: ["engineering"]
tags: ["roteamento", "query-params", "refatoração"]
mvp: false
createdAt: "2026-02-03"
updatedAt: "2026-02-03"
---

# Planejamento: Refatoração da Sincronização de URL (Query Params)

## 1. Contexto e Problema

Atualmente, as páginas `TransactionsPage` e `ReportsPage` duplicam uma lógica complexa de sincronização entre o estado da aplicação (Signals) e os parâmetros da URL (Query Params).

**Pontos de Duplicação:**

1.  **Resolução de Filtros de Tempo:** Conversão de `TimeFilterSelectionDTO` (presets, ranges, invoice month) para parâmetros planos (`invoiceMonth`, `startDay`, `endDay`, `periodPreset`, etc.).
2.  **Normalização de Contas:** Tratamento de arrays de IDs de contas vs `null`.
3.  **Estratégia de Navegação:** Uso repetitivo de `router.navigate([], { relativeTo, queryParamsHandling: 'merge' })`.
4.  **Reconstrução de Estado:** Lógica "se partial for undefined, use o valor atual" repetida em todos os métodos de atualização.

**Riscos:**

- Inconsistência na forma como os filtros são persistidos na URL entre páginas.
- Dificuldade de manutenção: alterar a lógica de filtros de tempo exige mudanças em múltiplos arquivos.
- Aumento da complexidade nos componentes de página (violando Single Responsibility Principle).

## 2. Solução Proposta

Criar um **`UrlSyncService`** (ou `QueryParamSyncService`) centralizado e reutilizável, focado em gerenciar a sincronização unidirecional (Estado -> URL).

### 2.1. Arquitetura

O serviço será agnóstico ao domínio específico da página, mas terá "conhecimento" sobre os padrões de filtros comuns do sistema (Tempo, Contas).

**Localização:** `src/app/services/url-sync.service.ts`

**Interface Proposta (Conceitual):**

```typescript
interface SyncOptions {
  // Se true, força openFilters=1 (comportamento da TransactionsPage)
  openFilters?: boolean;
}

@Injectable({ providedIn: "root" })
export class UrlSyncService {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  /**
   * Sincroniza um conjunto parcial de parâmetros com a URL atual via merge.
   * Abstrai a complexidade do router.navigate e relativeTo.
   */
  updateParams(params: Params, options?: SyncOptions): void {
    const finalParams = { ...params };
    if (options?.openFilters) {
      finalParams["openFilters"] = 1;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: finalParams,
      queryParamsHandling: "merge",
    });
  }

  /**
   * Helper puro para converter seleção de tempo em Params planos.
   * Pode ser movido para um utilitário se não precisar de injeção.
   */
  resolveTimeParams(selection: TimeFilterSelectionDTO): Params {
    // Lógica extraída de transactions.page.ts e reports.page.ts
    // Retorna { invoiceMonth, periodPreset, startDay, endDay, ... } com nulls corretos
  }
}
```

### 2.2. Utilitários de Resolução (`src/app/utils/query-params.util.ts`)

Para manter o serviço leve, a lógica pura de transformação de objetos complexos para `Params` deve ser extraída para funções utilitárias puras.

```typescript
export function timeSelectionToParams(
  selection: TimeFilterSelectionDTO,
): Params {
  // Implementação unificada
}

export function accountSelectionToParams(ids: string[]): Params {
  return {
    accountIds: ids.length > 0 ? ids : null,
    accountId: null, // Limpa legado se necessário
  };
}
```

## 3. Plano de Implementação

### Fase 1: Criação dos Artefatos Compartilhados (Concluído)

1.  [x] Criar `src/app/utils/query-params.util.ts`.
    - Mover lógica de `resolveTimeFilterToTransactionsQuery` (e adaptar para retornar Params planos com nulls explícitos).
    - Implementar `accountSelectionToParams`.
2.  [x] Criar `src/app/services/url-sync.service.ts`.
    - Implementar método genérico `setParams(params: Params)`.

### Fase 2: Refatoração da `TransactionsPage` (Concluído)

1.  [x] Injetar `UrlSyncService`.
2.  [x] Substituir o método privado `syncQueryParams` por chamadas aos utilitários + serviço.
    - Ex: `this.urlSync.setParams({ ...timeSelectionToParams(sel), ...accountSelectionToParams(ids) })`.
3.  [x] Validar se o comportamento de "abrir filtros" (`openFilters=1`) é mantido.

### Fase 3: Refatoração da `ReportsPage` (Concluído)

1.  [x] Injetar `UrlSyncService`.
2.  [x] Substituir método privado `syncQueryParams`.
3.  [x] Remover lógicas duplicadas de tratamento de `TimeFilterSelectionDTO`.

## 4. Benefícios Esperados

- **Redução de Código:** Remoção de ~50-80 linhas de código duplicado e complexo em cada página.
- **Robustez:** Testes unitários podem ser escritos especificamente para o `query-params.util.ts`, garantindo que edge cases de datas e timezones sejam tratados corretamente uma única vez.
- **Padronização:** Garante que "limpar um filtro" (setar null) funcione igual em todo o app.

## 5. Checklist de Validação

- [x] Testes unitários para `query-params.util.ts` cobrindo todos os modos de tempo (Invoice, Preset, Custom Range).
- [x] Navegação na `TransactionsPage` continua atualizando URL corretamente.
- [x] Navegação na `ReportsPage` continua atualizando URL corretamente.
- [x] Reload da página (F5) mantém o estado dos filtros (já garantido pela leitura dos params no `ngOnInit`, mas a escrita deve ser compatível).

## 6. Conclusão

Refatoração concluída com sucesso. O `UrlSyncService` agora centraliza a lógica de navegação e atualização de parâmetros, enquanto `query-params.util.ts` contém a lógica pura de conversão de estado para parâmetros de URL. Ambas as páginas `TransactionsPage` e `ReportsPage` foram migradas para usar a nova arquitetura, eliminando duplicação de código e melhorando a testabilidade.
