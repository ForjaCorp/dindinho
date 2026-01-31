import {
  Component,
  OnInit,
  inject,
  signal,
  Directive,
  ChangeDetectionStrategy,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ReportsService } from '../../app/services/reports.service';
import { AccountService } from '../../app/services/account.service';
import { PageHeaderComponent } from '../../app/components/page-header.component';
import { ChartData, ActiveElement, ChartOptions, TooltipItem } from 'chart.js';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { DatePickerModule } from 'primeng/datepicker';
import { MultiSelectModule } from 'primeng/multiselect';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectButtonModule } from 'primeng/selectbutton';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { BalanceHistoryGranularity, ReportFilterDTO } from '@dindinho/shared';
import { finalize } from 'rxjs';
import { DownloadUtil } from '../../app/utils/download.util';
import { COMMON_CHART_OPTIONS } from '../../app/utils/chart.util';
import { ReportChartCardComponent } from '../../app/components/report-chart-card.component';

/**
 * Wrapper para o BaseChartDirective para seguir padrões de seletor.
 */
@Directive({
  selector: 'canvas[appBaseChart]',
  standalone: true,
  hostDirectives: [
    {
      directive: BaseChartDirective,
      inputs: ['data', 'options', 'type'],
    },
  ],
})
export class AppBaseChartDirective {}

/**
 * Página de Relatórios e Insights Financeiros.
 */
@Component({
  selector: 'app-reports',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
    AppBaseChartDirective,
    ReportChartCardComponent,
    DatePickerModule,
    MultiSelectModule,
    SelectButtonModule,
    ButtonModule,
    ProgressSpinnerModule,
    ToastModule,
  ],
  providers: [provideCharts(withDefaultRegisterables()), MessageService],
  template: `
    <div class="flex flex-col gap-4 md:gap-6" data-testid="reports-page">
      <p-toast />
      <app-page-header title="Relatórios">
        <p-button
          page-header-actions
          label="Exportar CSV"
          icon="pi pi-download"
          size="small"
          [loading]="exporting()"
          (onClick)="exportCsv()"
          severity="secondary"
          data-testid="export-csv-button"
          aria-label="Exportar dados filtrados para CSV"
        />
      </app-page-header>

      <!-- Filtros -->
      <section
        class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end"
        data-testid="reports-filters"
        role="search"
        aria-label="Filtros de relatório"
      >
        <div class="flex flex-col gap-1.5 flex-1 min-w-[280px]">
          <label
            for="date-range"
            class="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1"
            >Período</label
          >
          <div
            class="reports-period-field w-full bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-200 focus-within:border-emerald-300"
          >
            <p-datepicker
              inputId="date-range"
              [ngModel]="dateRange()"
              (ngModelChange)="onDateRangeModelChange($event)"
              selectionMode="range"
              [readonlyInput]="true"
              [showIcon]="true"
              appendTo="body"
              [baseZIndex]="1000"
              (onSelect)="onDateChange()"
              placeholder="Selecione o período"
              styleClass="w-full reports-period-picker"
              inputStyleClass="!bg-transparent !border-0 !rounded-none !py-3 !px-4 !shadow-none !min-h-[46px]"
              dateFormat="dd/mm/yy"
              aria-label="Selecionar intervalo de datas"
            />
          </div>
        </div>

        <div class="flex flex-col gap-1.5 flex-1 min-w-[280px]">
          <label
            for="accounts-select"
            class="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1"
            >Contas</label
          >
          <p-multiselect
            inputId="accounts-select"
            [ngModel]="selectedAccountIds()"
            (ngModelChange)="onSelectedAccountIdsModelChange($event)"
            [options]="accountService.accounts()"
            optionLabel="name"
            optionValue="id"
            placeholder="Todas as contas"
            styleClass="w-full !bg-white !border-slate-200 !rounded-xl !min-h-[46px]"
            display="chip"
            [maxSelectedLabels]="3"
            aria-label="Selecionar contas para filtrar"
          />
        </div>

        <div
          class="flex flex-col gap-1.5 flex-1 min-w-[280px]"
          data-testid="balance-granularity-field"
        >
          <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1"
            >Granularidade (Saldo)</span
          >
          <p-selectButton
            data-testid="balance-granularity-select"
            [options]="balanceGranularityOptions"
            optionLabel="label"
            optionValue="value"
            styleClass="w-full"
            [allowEmpty]="false"
            [unselectable]="true"
            [ngModel]="balanceGranularity()"
            (ngModelChange)="onBalanceGranularityChange($event)"
            aria-label="Selecionar granularidade do histórico de saldo"
          />
        </div>
      </section>

      <!-- Gráficos -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6" data-testid="reports-charts">
        <!-- Gastos por Categoria -->
        <app-report-chart-card
          title="Gastos por Categoria"
          ariaLabel="Relatório de gastos por categoria"
          [loading]="loadingSpending()"
          loadingType="circle"
          [isEmpty]="!spendingData().datasets[0]?.data?.length"
          emptyMessage="Nenhum gasto registrado no período"
        >
          <p id="spending-chart-help" class="sr-only" data-testid="spending-chart-help">
            Gráfico interativo. Use o mouse para selecionar uma categoria. Pressione Enter ou Espaço
            para abrir a lista de transações.
          </p>
          <canvas
            appBaseChart
            data-testid="spending-by-category-chart"
            [data]="spendingData()"
            [options]="doughnutChartOptions"
            [type]="'doughnut'"
            class="cursor-pointer block w-full h-full focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-white"
            role="button"
            tabindex="0"
            aria-label="Gráfico de gastos por categoria"
            aria-describedby="spending-chart-help"
            (keydown.enter)="onSpendingChartKeyboardActivate($event)"
            (keydown.space)="onSpendingChartKeyboardActivate($event)"
          >
          </canvas>
        </app-report-chart-card>

        <!-- Histórico de Saldo -->
        <app-report-chart-card
          title="Evolução do Saldo"
          ariaLabel="Relatório de evolução de saldo"
          [loading]="loadingBalance()"
        >
          <p
            id="balance-history-chart-help"
            class="sr-only"
            data-testid="balance-history-chart-help"
          >
            {{ balanceHistoryA11ySummary() }}
          </p>
          <canvas
            appBaseChart
            data-testid="balance-history-chart"
            [data]="balanceData()"
            [options]="lineChartOptions()"
            [type]="'line'"
            class="block w-full h-full"
            role="img"
            aria-label="Gráfico de evolução do saldo"
            aria-describedby="balance-history-chart-help"
          >
          </canvas>
        </app-report-chart-card>

        <!-- Fluxo de Caixa -->
        <app-report-chart-card
          title="Fluxo de Caixa Mensal"
          ariaLabel="Relatório de fluxo de caixa mensal"
          styleClass="lg:col-span-2"
          contentClass="h-[350px]"
          [loading]="loadingCashFlow()"
        >
          <p id="cashflow-chart-help" class="sr-only" data-testid="cashflow-chart-help">
            Gráfico interativo. Use o mouse para selecionar um mês e tipo. Pressione Enter ou Espaço
            para abrir a lista de transações.
          </p>
          <canvas
            appBaseChart
            data-testid="cashflow-chart"
            [data]="cashFlowData()"
            [options]="barChartOptions"
            [type]="'bar'"
            class="cursor-pointer block w-full h-full focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-white"
            role="button"
            tabindex="0"
            aria-label="Gráfico de fluxo de caixa mensal"
            aria-describedby="cashflow-chart-help"
            (keydown.enter)="onCashFlowChartKeyboardActivate($event)"
            (keydown.space)="onCashFlowChartKeyboardActivate($event)"
          >
          </canvas>
        </app-report-chart-card>
      </div>
    </div>
  `,
  styles: [
    `
      :host ::ng-deep canvas.cursor-pointer {
        cursor: pointer;
      }

      :host ::ng-deep .reports-period-field .reports-period-picker.p-datepicker {
        display: flex;
        width: 100%;
        align-items: stretch;
      }

      :host ::ng-deep .reports-period-field .p-inputgroup,
      :host ::ng-deep .reports-period-field .p-inputwrapper {
        border: 0 !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        background: transparent !important;
      }

      :host ::ng-deep .reports-period-field .p-inputtext,
      :host ::ng-deep .reports-period-field .p-datepicker-input {
        flex: 1 1 auto;
        min-width: 0;
        width: auto;
        border: 0 !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        background: transparent !important;
      }

      :host ::ng-deep .reports-period-field .p-datepicker-dropdown,
      :host ::ng-deep .reports-period-field .p-datepicker-trigger {
        flex: 0 0 48px;
        width: 48px;
        min-width: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 0 2px 0 !important;
        line-height: 1;
        border: 0 !important;
        border-left: 1px solid #e2e8f0 !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        background: transparent !important;
        color: #475569;
      }

      :host ::ng-deep .reports-period-field .p-datepicker-dropdown .p-icon,
      :host ::ng-deep .reports-period-field .p-datepicker-trigger .p-icon {
        display: block;
        width: 16px;
        height: 16px;
      }

      :host ::ng-deep .reports-period-field .p-datepicker-trigger .p-button-icon {
        color: #475569;
      }
    `,
  ],
})
export class ReportsPage implements OnInit {
  private reportsService = inject(ReportsService);
  protected accountService = inject(AccountService);
  private router = inject(Router);
  private messageService = inject(MessageService);

  private readonly balanceGranularityStorageKey = 'dindinho:reports:balance-history:granularity';

  protected readonly balanceGranularityOptions: {
    label: string;
    value: BalanceHistoryGranularity;
  }[] = [
    { label: 'Dia', value: 'DAY' },
    { label: 'Semana', value: 'WEEK' },
    { label: 'Mês', value: 'MONTH' },
  ];

  balanceGranularity = signal<BalanceHistoryGranularity>('DAY');

  // Filtros
  dateRange = signal<[Date | null, Date | null]>([
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
  ]);
  accounts = this.accountService.accounts;
  selectedAccountIds = signal<string[]>([]);

  // Estados de Carregamento
  loadingSpending = signal(false);
  loadingCashFlow = signal(false);
  loadingBalance = signal(false);
  exporting = signal(false);

  // Dados dos Gráficos
  spendingData = signal<ChartData<'doughnut'>>({
    labels: [],
    datasets: [{ data: [] }],
  });
  cashFlowData = signal<ChartData<'bar'>>({
    labels: [],
    datasets: [],
  });
  cashFlowPeriodKeys = signal<string[]>([]);
  balanceData = signal<ChartData<'line'>>({
    labels: [],
    datasets: [],
  });

  balanceHistoryA11ySummary = computed(() => this.buildBalanceHistoryA11ySummary());

  private categoryIds: string[] = [];

  // Configurações dos Gráficos
  doughnutChartOptions = this.createDoughnutOptions();
  lineChartOptions = computed(() => this.createLineOptions());
  barChartOptions = this.createBarOptions();

  private createDoughnutOptions(): ChartOptions<'doughnut'> {
    return {
      ...COMMON_CHART_OPTIONS,
      onClick: (_, elements: ActiveElement[]) => {
        if (elements.length > 0) {
          const index = elements[0].index;
          const categoryId = this.categoryIds[index];
          this.navigateToTransactions('EXPENSE', categoryId);
        }
      },
    };
  }

  /**
   * Opções do gráfico de saldo (linha) com eixo X linear.
   * O clamp do domínio evita ticks fora do período selecionado.
   */
  private createLineOptions(): ChartOptions<'line'> {
    const domain = this.getBalanceHistoryDomainMs();

    return {
      ...COMMON_CHART_OPTIONS,
      layout: {
        padding: 10,
      },
      plugins: {
        ...COMMON_CHART_OPTIONS.plugins,
        tooltip: {
          ...COMMON_CHART_OPTIONS.plugins.tooltip,
          callbacks: {
            title: (items: TooltipItem<'line'>[]) => this.getBalanceTooltipTitle(items),
            footer: () => '',
          },
        },
        legend: {
          display: false,
        },
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false,
      },
      scales: {
        y: {
          beginAtZero: false,
          grid: { color: '#f1f5f9' },
        },
        x: {
          type: 'linear',
          grid: { display: false },
          min: domain?.min,
          max: domain?.max,
          ticks: {
            autoSkip: true,
            maxTicksLimit: 8,
            maxRotation: 0,
            minRotation: 0,
            callback: (value) => this.formatBalanceTick(value),
          },
        },
      },
    };
  }

  /**
   * Calcula o domínio do eixo X em UTC (ms) com base no período selecionado.
   * Normaliza datas invertidas para garantir min <= max.
   */
  private getBalanceHistoryDomainMs(): { min: number; max: number } | null {
    const [start, end] = this.dateRange();
    if (!start || !end) return null;

    const min = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const max = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;

    if (min <= max) return { min, max };
    return { min: max, max: min };
  }

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

  private formatBalanceTick(value: unknown): string {
    const numeric = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numeric)) return '';
    return this.formatUtcMsToDayMonth(numeric);
  }

  private formatUtcMsToDayMonth(ms: number): string {
    const d = new Date(ms);
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  }

  private formatBalanceLabel(label: string): string {
    const dayMatch = label.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dayMatch) {
      const day = dayMatch[3];
      const month = dayMatch[2];
      return `${day}/${month}`;
    }

    const monthMatch = label.match(/^(\d{4})-(\d{2})$/);
    if (monthMatch) {
      const year = Number(monthMatch[1]);
      const month = Number(monthMatch[2]);
      if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12)
        return label;
      return `${this.ptBrShortMonths[month - 1]}/${year}`;
    }

    return label;
  }

  private getBalanceTooltipTitle(items: TooltipItem<'line'>[]): string {
    const raw = items?.[0]?.raw as
      | {
          label?: string;
          periodStart?: string;
          periodEnd?: string;
          x?: number;
        }
      | undefined;

    if (!raw) return '';

    if (
      typeof raw.periodStart === 'string' &&
      typeof raw.periodEnd === 'string' &&
      raw.periodStart !== raw.periodEnd
    ) {
      return `${this.formatBalanceLabel(raw.periodStart)} - ${this.formatBalanceLabel(raw.periodEnd)}`;
    }

    if (typeof raw.label === 'string') return this.formatBalanceLabel(raw.label);

    if (typeof raw.x === 'number' && Number.isFinite(raw.x))
      return this.formatUtcMsToDayMonth(raw.x);

    return '';
  }

  private createBarOptions(): ChartOptions<'bar'> {
    return {
      ...COMMON_CHART_OPTIONS,
      onClick: (_, elements: ActiveElement[]) => {
        if (elements.length > 0) {
          const element = elements[0];
          const invoiceMonth = this.cashFlowPeriodKeys()[element.index];
          const type = element.datasetIndex === 0 ? 'INCOME' : 'EXPENSE';
          this.navigateToTransactions(type, undefined, invoiceMonth);
        }
      },
      scales: {
        x: { stacked: false, grid: { display: false } },
        y: { stacked: false, grid: { color: '#f1f5f9' } },
      },
    };
  }

  ngOnInit() {
    this.balanceGranularity.set(this.readBalanceGranularityFromStorage());
    this.accountService.loadAccounts();
    this.loadAllReports();
  }

  onDateChange() {
    const [start, end] = this.dateRange();
    if (start && end) {
      this.loadAllReports();
    }
  }

  loadAllReports() {
    const filters = this.getCurrentFilters();
    if (!filters) return;

    this.fetchSpending(filters);
    this.fetchCashFlow(filters);
    this.fetchBalanceHistory(filters);
  }

  exportCsv() {
    const filters = this.getCurrentFilters();
    if (!filters) return;

    this.exporting.set(true);
    this.reportsService
      .exportTransactionsCsv(filters)
      .pipe(finalize(() => this.exporting.set(false)))
      .subscribe({
        next: (blob: Blob) => {
          const fileName = DownloadUtil.generateFileName('transacoes');
          DownloadUtil.downloadBlob(blob, fileName);
          this.messageService.add({
            severity: 'success',
            summary: 'Sucesso',
            detail: 'Relatório exportado com sucesso',
          });
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail: 'Falha ao exportar relatório',
          });
        },
      });
  }

  private fetchSpending(filters: ReportFilterDTO) {
    this.loadingSpending.set(true);
    this.reportsService
      .getSpendingByCategoryChart(filters)
      .pipe(finalize(() => this.loadingSpending.set(false)))
      .subscribe({
        next: (result) => {
          this.spendingData.set(result.data);
          this.categoryIds = result.categoryIds;
        },
        error: () => this.resetSpendingData(),
      });
  }

  private fetchCashFlow(filters: ReportFilterDTO) {
    this.loadingCashFlow.set(true);
    this.reportsService
      .getCashFlowChart(filters)
      .pipe(finalize(() => this.loadingCashFlow.set(false)))
      .subscribe({
        next: (result) => {
          this.cashFlowData.set(result.data);
          this.cashFlowPeriodKeys.set(result.periodKeys);
        },
        error: () => this.resetCashFlowData(),
      });
  }

  private fetchBalanceHistory(filters: ReportFilterDTO) {
    this.loadingBalance.set(true);

    const [start, end] = this.dateRange();
    const rangeDays = this.computeUtcDaysInclusive(start, end);
    const changeOnly =
      this.balanceGranularity() === 'DAY' && rangeDays != null ? rangeDays > 120 : undefined;

    this.reportsService
      .getBalanceHistoryChart({
        ...filters,
        granularity: this.balanceGranularity(),
        changeOnly,
      })
      .pipe(finalize(() => this.loadingBalance.set(false)))
      .subscribe({
        next: (data) => this.balanceData.set(data),
        error: () => this.resetBalanceData(),
      });
  }

  protected onSpendingChartKeyboardActivate(event: Event) {
    event.preventDefault();
    this.navigateToTransactions('EXPENSE');
  }

  protected onCashFlowChartKeyboardActivate(event: Event) {
    event.preventDefault();
    this.navigateToTransactions();
  }

  protected onBalanceGranularityChange(value: unknown) {
    const next = this.normalizeGranularity(value);
    if (!next || next === this.balanceGranularity()) return;

    this.balanceGranularity.set(next);
    this.persistBalanceGranularity(next);

    const filters = this.getCurrentFilters();
    if (!filters) return;
    this.fetchBalanceHistory(filters);
  }

  protected onDateRangeModelChange(value: unknown) {
    const normalized = this.normalizeDateRange(value);
    if (!normalized) return;
    this.dateRange.set(normalized);
  }

  protected onSelectedAccountIdsModelChange(value: unknown) {
    const normalized = this.normalizeAccountIds(value);
    if (!normalized) return;
    this.selectedAccountIds.set(normalized);
    this.loadAllReports();
  }

  private getCurrentFilters(): ReportFilterDTO | null {
    const [start, end] = this.dateRange();
    if (!start || !end) return null;

    const startDay = this.formatIsoDayLocal(start);
    const endDay = this.formatIsoDayLocal(end);

    return {
      startDay,
      endDay,
      tzOffsetMinutes: start.getTimezoneOffset(),
      accountIds: this.selectedAccountIds().length > 0 ? this.selectedAccountIds() : undefined,
      includePending: true,
    };
  }

  private formatIsoDayLocal(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private readBalanceGranularityFromStorage(): BalanceHistoryGranularity {
    if (typeof localStorage === 'undefined') return 'DAY';

    const raw = localStorage.getItem(this.balanceGranularityStorageKey);
    const normalized = this.normalizeGranularity(raw);
    return normalized ?? 'DAY';
  }

  private persistBalanceGranularity(value: BalanceHistoryGranularity): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.balanceGranularityStorageKey, value);
  }

  private normalizeGranularity(value: unknown): BalanceHistoryGranularity | null {
    if (value === 'DAY' || value === 'WEEK' || value === 'MONTH') return value;
    return null;
  }

  private normalizeDateRange(value: unknown): [Date | null, Date | null] | null {
    if (!Array.isArray(value) || value.length !== 2) return null;

    const start = value[0];
    const end = value[1];

    const startDate = start instanceof Date ? start : start == null ? null : null;
    const endDate = end instanceof Date ? end : end == null ? null : null;

    return [startDate, endDate];
  }

  private normalizeAccountIds(value: unknown): string[] | null {
    if (!Array.isArray(value)) return null;
    const ids = value.filter((v) => typeof v === 'string');
    return ids.length === value.length ? ids : null;
  }

  private computeUtcDaysInclusive(start: Date | null, end: Date | null): number | null {
    if (!start || !end) return null;

    const startUtc = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
    const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());

    const diffDays = Math.floor((endUtc - startUtc) / (24 * 60 * 60 * 1000));
    return diffDays + 1;
  }

  private resetSpendingData() {
    this.spendingData.set({ labels: [], datasets: [{ data: [] }] });
    this.categoryIds = [];
  }

  private resetCashFlowData() {
    this.cashFlowData.set({ labels: [], datasets: [] });
    this.cashFlowPeriodKeys.set([]);
  }

  private resetBalanceData() {
    this.balanceData.set({ labels: [], datasets: [] });
  }

  private buildBalanceHistoryA11ySummary(): string {
    const base =
      'Gráfico de linhas que mostra a evolução do saldo ao longo do período selecionado.';

    const dataset = this.balanceData().datasets?.[0];
    const points = this.extractBalanceHistoryPoints(dataset?.data);

    if (points.length === 0) return `${base} Nenhum dado para o período selecionado.`;

    if (points.length === 1) {
      const only = points[0];
      const label = this.getBalancePointLabel(only, 'single');
      return `${base} Data: ${label}. Saldo: ${this.formatCurrencyBr(only.y)}.`;
    }

    const first = points[0];
    const last = points[points.length - 1];

    const periodStart = this.getBalancePointLabel(first, 'start');
    const periodEnd = this.getBalancePointLabel(last, 'end');

    const delta = last.y - first.y;
    const deltaText = this.formatSignedCurrencyBr(delta);

    return `${base} Período: ${periodStart} - ${periodEnd}. Saldo inicial: ${this.formatCurrencyBr(first.y)}. Saldo final: ${this.formatCurrencyBr(last.y)}. Variação: ${deltaText}.`;
  }

  private extractBalanceHistoryPoints(data: unknown): {
    x: number;
    y: number;
    label?: string;
    periodStart?: string;
    periodEnd?: string;
  }[] {
    if (!Array.isArray(data)) return [];

    const points = data
      .map((raw) => {
        if (!raw || typeof raw !== 'object') return null;
        const obj = raw as Record<string, unknown>;
        const xRaw = obj['x'];
        const yRaw = obj['y'];
        const x = typeof xRaw === 'number' ? xRaw : Number(xRaw);
        const y = typeof yRaw === 'number' ? yRaw : Number(yRaw);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

        const labelRaw = obj['label'];
        const periodStartRaw = obj['periodStart'];
        const periodEndRaw = obj['periodEnd'];

        return {
          x,
          y,
          label: typeof labelRaw === 'string' ? labelRaw : undefined,
          periodStart: typeof periodStartRaw === 'string' ? periodStartRaw : undefined,
          periodEnd: typeof periodEndRaw === 'string' ? periodEndRaw : undefined,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p != null)
      .sort((a, b) => a.x - b.x);

    return points;
  }

  private getBalancePointLabel(
    point: { x: number; label?: string; periodStart?: string; periodEnd?: string },
    kind: 'start' | 'end' | 'single',
  ): string {
    const rawLabel =
      kind === 'start'
        ? (point.periodStart ?? point.label)
        : kind === 'end'
          ? (point.periodEnd ?? point.label)
          : (point.label ?? point.periodStart ?? point.periodEnd);

    if (typeof rawLabel === 'string') return this.formatBalanceLabel(rawLabel);
    if (typeof point.x === 'number' && Number.isFinite(point.x))
      return this.formatUtcMsToDayMonth(point.x);
    return '';
  }

  private formatCurrencyBr(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  private formatSignedCurrencyBr(value: number): string {
    if (!Number.isFinite(value)) return '';
    const abs = this.formatCurrencyBr(Math.abs(value));
    if (value > 0) return `+${abs}`;
    if (value < 0) return `-${abs}`;
    return abs;
  }

  private navigateToTransactions(
    type?: 'INCOME' | 'EXPENSE',
    categoryId?: string,
    invoiceMonth?: string,
  ) {
    const [start, end] = this.dateRange();
    const queryParams: Record<string, string | number | undefined> = {
      type,
      startDate: start?.toISOString(),
      endDate: end?.toISOString(),
      openFilters: 1,
    };

    if (categoryId && categoryId !== 'none') {
      queryParams['categoryId'] = categoryId;
    }

    if (invoiceMonth) {
      queryParams['invoiceMonth'] = invoiceMonth;
    }

    if (this.selectedAccountIds().length === 1) {
      queryParams['accountId'] = this.selectedAccountIds()[0];
    }

    this.router.navigate(['/transactions'], { queryParams });
  }
}
