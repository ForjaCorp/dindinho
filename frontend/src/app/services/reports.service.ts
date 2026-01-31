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

  private formatBalanceHistoryLabel(label: string): string {
    const dayMatch = label.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dayMatch) {
      const day = Number(dayMatch[3]);
      const month = Number(dayMatch[2]);
      if (!Number.isFinite(day) || !Number.isFinite(month)) return label;
      return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
    }

    const monthMatch = label.match(/^(\d{4})-(\d{2})$/);
    if (monthMatch) {
      return this.formatPeriodLabel(label);
    }

    return label;
  }

  private parseIsoDayToUtcMs(value: string): number | null {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    return Date.UTC(year, month - 1, day);
  }

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

  getBalanceHistoryChart(filters: ReportFilterDTO): Observable<ChartData<'line'>> {
    return this.getBalanceHistory(filters).pipe(
      map((data) => {
        const ordered = [...data]
          .map((d) => {
            const x = typeof d.t === 'number' ? d.t : this.parseIsoDayToUtcMs(d.date);
            return { ...d, t: x };
          })
          .filter((d) => typeof d.t === 'number' && Number.isFinite(d.t))
          .sort((a, b) => (a.t ?? 0) - (b.t ?? 0));

        const balances = ordered.map((d) => d.balance);

        const showPoint = balances.map((b, i) => {
          if (i === 0) return true;

          const changed = ordered[i]?.changed;
          if (typeof changed === 'boolean') return changed;

          const prev = balances[i - 1];
          return b !== prev;
        });
        if (showPoint.length > 1) showPoint[showPoint.length - 1] = true;

        const points = ordered.map((d) => ({
          x: d.t as number,
          y: d.balance,
          label: d.label ?? d.date,
          periodStart: d.periodStart,
          periodEnd: d.periodEnd,
        }));

        return {
          datasets: [
            {
              label: 'Saldo',
              data: points,
              borderColor: CHART_COLORS.indigo.base,
              backgroundColor: CHART_COLORS.indigo.light + '33',
              fill: true,
              stepped: true,
              pointRadius: (ctx) => (showPoint[ctx.dataIndex] ? 3 : 0),
              pointHoverRadius: 6,
              pointHitRadius: 14,
            },
          ],
        };
      }),
    );
  }

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
    if (filters.startDay) {
      params = params.set('startDay', filters.startDay);
    }
    if (filters.endDay) {
      params = params.set('endDay', filters.endDay);
    }
    if (typeof filters.tzOffsetMinutes === 'number') {
      params = params.set('tzOffsetMinutes', String(filters.tzOffsetMinutes));
    }
    if (filters.includePending) {
      params = params.set('includePending', String(filters.includePending));
    }
    if (filters.accountIds?.length) {
      filters.accountIds.forEach((id) => {
        params = params.append('accountIds', id);
      });
    }

    if (filters.granularity) {
      params = params.set('granularity', filters.granularity);
    }
    if (typeof filters.changeOnly === 'boolean') {
      params = params.set('changeOnly', String(filters.changeOnly));
    }

    return params;
  }
}
