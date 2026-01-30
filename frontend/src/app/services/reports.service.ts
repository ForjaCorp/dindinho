import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ReportFilterDTO,
  SpendingByCategoryDTO,
  CashFlowDTO,
  BalanceHistoryDTO,
} from '@dindinho/shared';
import { ChartData } from 'chart.js';
import { CATEGORY_PALETTE, CHART_COLORS } from '../utils/chart.util';

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

  private readonly ptBrShortMonths = [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez',
  ];

  private parsePeriodToSortKey(period: string): number {
    const monthMatch = period.match(/^(\d{4})-(\d{2})$/);
    if (monthMatch) {
      const year = Number(monthMatch[1]);
      const month = Number(monthMatch[2]);
      return Date.UTC(year, month - 1, 1);
    }

    const parsed = Date.parse(period);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private formatPeriodLabel(period: string): string {
    const monthMatch = period.match(/^(\d{4})-(\d{2})$/);
    if (monthMatch) {
      const year = Number(monthMatch[1]);
      const month = Number(monthMatch[2]);
      if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
        return period;
      }

      return `${this.ptBrShortMonths[month - 1]}/${year}`;
    }

    return period;
  }

  /**
   * Busca gastos agrupados por categoria e mapeia para o formato do Chart.js.
   */
  getSpendingByCategoryChart(filters: ReportFilterDTO): Observable<{
    data: ChartData<'doughnut'>;
    categoryIds: string[];
  }> {
    return this.getSpendingByCategory(filters).pipe(
      map((data) => {
        const categoryIds = data.map((d) => d.categoryId || 'none');
        return {
          categoryIds,
          data: {
            labels: data.map((d) => d.categoryName),
            datasets: [
              {
                data: data.map((d) => d.amount),
                backgroundColor: CATEGORY_PALETTE.slice(0, data.length),
                hoverOffset: 12,
                borderRadius: 4,
                spacing: 2,
              },
            ],
          },
        };
      }),
    );
  }

  /**
   * Busca fluxo de caixa e mapeia para o formato do Chart.js.
   */
  getCashFlowChart(filters: ReportFilterDTO): Observable<{
    data: ChartData<'bar'>;
    periodKeys: string[];
  }> {
    return this.getCashFlow(filters).pipe(
      map((data) => {
        const ordered = [...data].sort(
          (a, b) => this.parsePeriodToSortKey(a.period) - this.parsePeriodToSortKey(b.period),
        );

        return {
          periodKeys: ordered.map((d) => d.period),
          data: {
            labels: ordered.map((d) => this.formatPeriodLabel(d.period)),
            datasets: [
              {
                label: 'Receitas',
                data: ordered.map((d) => d.income),
                backgroundColor: CHART_COLORS.emerald.base,
                borderRadius: 6,
              },
              {
                label: 'Despesas',
                data: ordered.map((d) => d.expense),
                backgroundColor: CHART_COLORS.red.base,
                borderRadius: 6,
              },
            ],
          },
        };
      }),
    );
  }

  /**
   * Busca histórico de saldo e mapeia para o formato do Chart.js.
   */
  getBalanceHistoryChart(filters: ReportFilterDTO): Observable<ChartData<'line'>> {
    return this.getBalanceHistory(filters).pipe(
      map((data) => ({
        labels: data.map((d) => d.date),
        datasets: [
          {
            label: 'Saldo',
            data: data.map((d) => d.balance),
            borderColor: CHART_COLORS.indigo.base,
            backgroundColor: CHART_COLORS.indigo.light + '33', // 20% opacity
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      })),
    );
  }

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
   * Exporta as transações filtradas para CSV.
   *
   * @param filters Filtros de data e contas
   * @returns Observable com o blob do arquivo CSV
   */
  exportTransactionsCsv(filters: ReportFilterDTO): Observable<Blob> {
    const params = this.buildParams(filters);
    return this.http.get(`${this.baseUrl}/export/csv`, {
      params,
      responseType: 'blob',
    });
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
