import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ReportFilterDTO,
  SpendingByCategoryDTO,
  CashFlowDTO,
  BalanceHistoryDTO,
} from '@dindinho/shared';

/**
 * Serviço responsável por buscar dados de relatórios e estatísticas.
 *
 * @description
 * Este serviço integra com os endpoints de reports do backend para fornecer
 * dados estruturados para os gráficos e dashboards.
 *
 * @since 1.0.0
 */
@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/reports`;

  /**
   * Obtém o relatório de gastos agrupados por categoria.
   *
   * @param filters Filtros de data e contas
   * @returns Observable com a lista de gastos por categoria
   */
  getSpendingByCategory(filters: ReportFilterDTO): Observable<SpendingByCategoryDTO> {
    const params = this.buildParams(filters);
    return this.http.get<SpendingByCategoryDTO>(`${this.baseUrl}/spending-by-category`, { params });
  }

  /**
   * Obtém o relatório de fluxo de caixa (Entradas vs Saídas).
   *
   * @param filters Filtros de data e contas
   * @returns Observable com os dados de fluxo de caixa por período
   */
  getCashFlow(filters: ReportFilterDTO): Observable<CashFlowDTO> {
    const params = this.buildParams(filters);
    return this.http.get<CashFlowDTO>(`${this.baseUrl}/cash-flow`, { params });
  }

  /**
   * Obtém o histórico de evolução de saldo total.
   *
   * @param filters Filtros de data e contas
   * @returns Observable com a série temporal de saldos
   */
  getBalanceHistory(filters: ReportFilterDTO): Observable<BalanceHistoryDTO> {
    const params = this.buildParams(filters);
    return this.http.get<BalanceHistoryDTO>(`${this.baseUrl}/balance-history`, { params });
  }

  /**
   * Converte o DTO de filtros em HttpParams.
   *
   * @param filters DTO de filtros
   * @returns HttpParams formatado para a URL
   */
  private buildParams(filters: ReportFilterDTO): HttpParams {
    let params = new HttpParams();

    if (filters.startDate) {
      params = params.set('startDate', filters.startDate);
    }
    if (filters.endDate) {
      params = params.set('endDate', filters.endDate);
    }
    if (filters.includePending) {
      params = params.set('includePending', String(filters.includePending));
    }
    if (filters.accountIds?.length) {
      filters.accountIds.forEach((id) => {
        params = params.append('accountIds', id);
      });
    }

    return params;
  }
}
