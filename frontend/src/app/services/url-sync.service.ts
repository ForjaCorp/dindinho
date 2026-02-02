import { Injectable, inject } from '@angular/core';
import { Router, ActivatedRoute, Params } from '@angular/router';

export interface SyncOptions {
  // Se true, força openFilters=1 (comportamento da TransactionsPage)
  openFilters?: boolean;
}

@Injectable({ providedIn: 'root' })
export class UrlSyncService {
  private router = inject(Router);

  /**
   * Sincroniza um conjunto parcial de parâmetros com a URL atual via merge.
   * Abstrai a complexidade do router.navigate e relativeTo.
   *
   * @param route A rota ativa atual (para garantir navegação relativa correta).
   * @param params Parâmetros a serem mesclados (null remove o parâmetro).
   * @param options Opções de sincronização.
   */
  updateParams(route: ActivatedRoute, params: Params, options?: SyncOptions): void {
    const finalParams = { ...params };
    if (options?.openFilters) {
      finalParams['openFilters'] = 1;
    }

    this.router.navigate([], {
      relativeTo: route,
      queryParams: finalParams,
      queryParamsHandling: 'merge',
    });
  }
}
