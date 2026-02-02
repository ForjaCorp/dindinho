import {
  Component,
  OnInit,
  inject,
  signal,
  Directive,
  ChangeDetectionStrategy,
  computed,
  DestroyRef,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReportsService } from '../../app/services/reports.service';
import { AccountService } from '../../app/services/account.service';
import { PageHeaderComponent } from '../../app/components/page-header.component';
import { ChartData, ActiveElement, ChartOptions, TooltipItem } from 'chart.js';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { MultiSelectModule } from 'primeng/multiselect';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectButtonModule } from 'primeng/selectbutton';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import {
  BalanceHistoryGranularity,
  ReportFilterDTO,
  TimeFilterSelectionDTO,
  PeriodPreset,
} from '@dindinho/shared';
import { finalize } from 'rxjs';
import { DownloadUtil } from '../../app/utils/download.util';
import { COMMON_CHART_OPTIONS } from '../../app/utils/chart.util';
import { ReportChartCardComponent } from '../../app/components/report-chart-card.component';
import { TimeFilterComponent } from '../../app/components/time-filter.component';
import {
  formatIsoDayLocal,
  parseIsoMonthToLocalDate,
  resolvePeriodSelectionToDayRange,
  resolveTimeFilterToTransactionsQuery,
} from '../../app/utils/time-filter.util';

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
    TimeFilterComponent,
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
          <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1"
            >Período</span
          >
          <app-time-filter
            data-testid="reports-time-filter"
            [selection]="timeFilterSelection()"
            (selectionChange)="onTimeFilterSelectionChange($event)"
            aria-label="Selecionar período do relatório"
          />
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
    `,
  ],
})
export class ReportsPage implements OnInit {
  private reportsService = inject(ReportsService);
  protected accountService = inject(AccountService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
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
  timeFilterSelection = signal<TimeFilterSelectionDTO>(this.buildDefaultSelection());
  accounts = this.accountService.accounts;
  selectedAccountIds = signal<string[]>([]);

  private readonly localDateRange = computed(() => this.resolveSelectionToLocalDateRange());

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

  constructor() {
    effect(() => {
      // Reagir a mudanças nos filtros para recarregar relatórios
      this.timeFilterSelection();
      this.selectedAccountIds();
      this.balanceGranularity();

      // Usar untracked se necessário para evitar ciclos, mas aqui queremos reagir a tudo
      this.loadAllReports();
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      // Sincronizar URL -> Estado

      // 1. Account IDs
      const accountIds = params.getAll('accountIds');
      const legacyAccountId = params.get('accountId');
      const finalAccountIds =
        accountIds.length > 0 ? accountIds : legacyAccountId ? [legacyAccountId] : [];

      const currentAccountIds = this.selectedAccountIds();
      const accountsChanged =
        currentAccountIds.length !== finalAccountIds.length ||
        currentAccountIds.some((id, i) => id !== finalAccountIds[i]);

      if (accountsChanged) {
        this.selectedAccountIds.set(finalAccountIds);
      }

      // 2. Time Filter
      const invoiceMonth = this.parseInvoiceMonthParam(
        params.get('invoiceMonth') ?? params.get('month'),
      );
      const periodPreset = this.parsePeriodPresetParam(params.get('periodPreset'));
      const startDay = this.parseIsoDayParam(params.get('startDay'));
      const endDay = this.parseIsoDayParam(params.get('endDay'));
      const tzOffsetMinutes =
        this.parseTzOffsetMinutesParam(params.get('tzOffsetMinutes')) ??
        new Date().getTimezoneOffset();

      const nextTimeSelection: TimeFilterSelectionDTO = invoiceMonth
        ? { mode: 'INVOICE_MONTH', invoiceMonth }
        : periodPreset && periodPreset !== 'CUSTOM'
          ? {
              mode: 'DAY_RANGE',
              period: { preset: periodPreset, tzOffsetMinutes },
            }
          : startDay || endDay || (periodPreset === 'CUSTOM' && startDay && endDay)
            ? {
                mode: 'DAY_RANGE',
                period: {
                  preset: 'CUSTOM',
                  startDay: startDay ?? endDay ?? '1970-01-01',
                  endDay: endDay ?? startDay ?? '1970-01-01',
                  tzOffsetMinutes,
                },
              }
            : {
                mode: 'DAY_RANGE',
                period: { preset: 'THIS_MONTH', tzOffsetMinutes },
              };

      if (!this.sameTimeFilterSelection(this.timeFilterSelection(), nextTimeSelection)) {
        this.timeFilterSelection.set(nextTimeSelection);
      }
    });
  }

  private parseInvoiceMonthParam(value: string | null): string | null {
    if (!value) return null;
    const normalized = value.trim();
    if (!/^\d{4}-\d{2}$/.test(normalized)) return null;
    const year = Number(normalized.slice(0, 4));
    const month = Number(normalized.slice(5, 7));
    if (!Number.isFinite(year) || year < 1970 || year > 2100) return null;
    if (!Number.isFinite(month) || month < 1 || month > 12) return null;
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  private parseIsoDayParam(value: string | null): string | null {
    if (!value) return null;
    const normalized = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;

    const [y, m, d] = normalized.split('-').map((v) => Number(v));
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    if (m < 1 || m > 12) return null;
    if (d < 1 || d > 31) return null;
    const dt = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
    if (dt.getUTCFullYear() !== y) return null;
    if (dt.getUTCMonth() !== m - 1) return null;
    if (dt.getUTCDate() !== d) return null;
    return normalized;
  }

  private parsePeriodPresetParam(value: string | null): PeriodPreset | null {
    if (!value) return null;
    const normalized = value.trim();
    const allowed: PeriodPreset[] = [
      'TODAY',
      'YESTERDAY',
      'THIS_WEEK',
      'LAST_WEEK',
      'THIS_MONTH',
      'LAST_MONTH',
      'CUSTOM',
    ];
    return (allowed as string[]).includes(normalized) ? (normalized as PeriodPreset) : null;
  }

  private parseTzOffsetMinutesParam(value: string | null): number | null {
    if (!value) return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    if (parsed < -840) return -840;
    if (parsed > 840) return 840;
    return parsed;
  }

  private sameTimeFilterSelection(a: TimeFilterSelectionDTO, b: TimeFilterSelectionDTO): boolean {
    if (a.mode !== b.mode) return false;

    if (a.mode === 'INVOICE_MONTH' && b.mode === 'INVOICE_MONTH') {
      return a.invoiceMonth === b.invoiceMonth;
    }

    if (a.mode === 'DAY_RANGE' && b.mode === 'DAY_RANGE') {
      if (a.period.preset !== b.period.preset) return false;
      if (a.period.tzOffsetMinutes !== b.period.tzOffsetMinutes) return false;
      if (a.period.preset !== 'CUSTOM') return true;
      return a.period.startDay === b.period.startDay && a.period.endDay === b.period.endDay;
    }

    return false;
  }

  ngOnInit() {
    this.balanceGranularity.set(this.readBalanceGranularityFromStorage());
    this.accountService.loadAccounts();
    // loadAllReports é chamado pelo effect
  }

  /**
   * Aplica a seleção do filtro temporal quando o usuário confirma no editor.
   */
  protected onTimeFilterSelectionChange(selection: TimeFilterSelectionDTO) {
    // Sincronizar Estado -> URL
    const query = resolveTimeFilterToTransactionsQuery(selection);

    if (selection.mode === 'INVOICE_MONTH') {
      this.syncQueryParams({
        invoiceMonth: query.invoiceMonth ?? null,
        month: null,
        periodPreset: null,
        startDay: null,
        endDay: null,
        tzOffsetMinutes: null,
      });
      return;
    }

    if (selection.period.preset !== 'CUSTOM') {
      this.syncQueryParams({
        invoiceMonth: null,
        month: null,
        periodPreset: selection.period.preset,
        startDay: null,
        endDay: null,
        tzOffsetMinutes:
          typeof selection.period.tzOffsetMinutes === 'number'
            ? selection.period.tzOffsetMinutes
            : null,
      });
      return;
    }

    this.syncQueryParams({
      invoiceMonth: null,
      month: null,
      periodPreset: 'CUSTOM',
      startDay: query.startDay ?? null,
      endDay: query.endDay ?? null,
      tzOffsetMinutes: typeof query.tzOffsetMinutes === 'number' ? query.tzOffsetMinutes : null,
    });
  }

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
    const [start, end] = this.localDateRange();
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

    const [start, end] = this.localDateRange();
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

  protected onSelectedAccountIdsModelChange(value: unknown) {
    const normalized = this.normalizeAccountIds(value);
    if (!normalized) return;
    this.selectedAccountIds.set(normalized);
    this.syncQueryParams({
      accountIds: normalized.length > 0 ? normalized : null,
    });
  }

  private syncQueryParams(partial: {
    accountIds?: string[] | null;
    invoiceMonth?: string | null;
    month?: string | null;
    periodPreset?: string | null;
    startDay?: string | null;
    endDay?: string | null;
    tzOffsetMinutes?: number | null;
  }) {
    // 1. Account IDs
    const accountIds =
      partial.accountIds !== undefined ? partial.accountIds : this.selectedAccountIds();

    // 2. Time Filter
    const timeKeys = [
      'invoiceMonth',
      'month',
      'periodPreset',
      'startDay',
      'endDay',
      'tzOffsetMinutes',
    ] as const;
    const hasTimePartial = timeKeys.some((k) => partial[k] !== undefined);

    let timeParams: Record<string, string | number | null | undefined> = {};

    if (hasTimePartial) {
      timeParams = {
        invoiceMonth: partial.invoiceMonth,
        month: partial.month,
        periodPreset: partial.periodPreset,
        startDay: partial.startDay,
        endDay: partial.endDay,
        tzOffsetMinutes: partial.tzOffsetMinutes,
      };
    } else {
      // Reconstruir do signal atual
      const currentSelection = this.timeFilterSelection();
      const query = resolveTimeFilterToTransactionsQuery(currentSelection);

      if (currentSelection.mode === 'INVOICE_MONTH') {
        timeParams['invoiceMonth'] = query.invoiceMonth ?? null;
      } else {
        if (currentSelection.period.preset && currentSelection.period.preset !== 'CUSTOM') {
          timeParams['periodPreset'] = currentSelection.period.preset;
          timeParams['tzOffsetMinutes'] =
            typeof currentSelection.period.tzOffsetMinutes === 'number'
              ? currentSelection.period.tzOffsetMinutes
              : null;
        } else {
          timeParams['periodPreset'] = 'CUSTOM';
          timeParams['startDay'] = query.startDay ?? null;
          timeParams['endDay'] = query.endDay ?? null;
          timeParams['tzOffsetMinutes'] =
            typeof query.tzOffsetMinutes === 'number' ? query.tzOffsetMinutes : null;
        }
      }
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        accountIds: accountIds?.length ? accountIds : null,
        accountId: null,
        ...timeParams,
      },
      queryParamsHandling: 'merge',
    });
  }

  /**
   * Converte a seleção do filtro temporal em `ReportFilterDTO`.
   *
   * Regras:
   * - `INVOICE_MONTH`: envia `invoiceMonth`.
   * - `DAY_RANGE`: envia `startDay/endDay/tzOffsetMinutes`.
   */
  private getCurrentFilters(): ReportFilterDTO | null {
    const query = resolveTimeFilterToTransactionsQuery(this.timeFilterSelection());
    if (!query.invoiceMonth && (!query.startDay || !query.endDay)) return null;

    return {
      ...(query.invoiceMonth ? { invoiceMonth: query.invoiceMonth } : {}),
      ...(query.startDay ? { startDay: query.startDay } : {}),
      ...(query.endDay ? { endDay: query.endDay } : {}),
      ...(typeof query.tzOffsetMinutes === 'number'
        ? { tzOffsetMinutes: query.tzOffsetMinutes }
        : {}),
      accountIds: this.selectedAccountIds().length > 0 ? this.selectedAccountIds() : undefined,
      includePending: true,
    };
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

  private normalizeAccountIds(value: unknown): string[] | null {
    if (!Array.isArray(value)) return null;
    const ids = value.filter((v) => typeof v === 'string');
    return ids.length === value.length ? ids : null;
  }

  private buildDefaultSelection(): TimeFilterSelectionDTO {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return {
      mode: 'DAY_RANGE',
      period: {
        preset: 'CUSTOM',
        startDay: formatIsoDayLocal(start),
        endDay: formatIsoDayLocal(end),
        tzOffsetMinutes: now.getTimezoneOffset(),
      },
    };
  }

  /**
   * Resolve o período atual para um range de `Date` local.
   *
   * Usado para:
   * - domínio do eixo X (saldo)
   * - cálculo de dias no período para heurísticas (ex.: `changeOnly`)
   */
  private resolveSelectionToLocalDateRange(): [Date | null, Date | null] {
    const sel = this.timeFilterSelection();

    if (sel.mode === 'INVOICE_MONTH') {
      const start = parseIsoMonthToLocalDate(sel.invoiceMonth);
      if (!start) return [null, null];
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      return [start, end];
    }

    const resolved = resolvePeriodSelectionToDayRange(sel.period);
    if (!resolved) return [null, null];
    return [resolved.start, resolved.end];
  }

  private computeUtcDaysInclusive(start: Date | null, end: Date | null): number | null {
    if (!start || !end) return null;

    const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());

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

  /**
   * Navega para Transações mantendo coerência com o filtro atual.
   *
   * Prioridade do período:
   * 1) `invoiceMonth` explícito (drill-down de barra)
   * 2) seleção atual no filtro temporal
   */
  private navigateToTransactions(
    type?: 'INCOME' | 'EXPENSE',
    categoryId?: string,
    invoiceMonth?: string,
  ) {
    const queryParams: Record<string, string | number | string[] | undefined> = {
      type,
      openFilters: 1,
    };

    if (categoryId && categoryId !== 'none') {
      queryParams['categoryId'] = categoryId;
    }

    if (invoiceMonth) {
      queryParams['invoiceMonth'] = invoiceMonth;
    } else {
      const selection = this.timeFilterSelection();
      if (selection.mode === 'INVOICE_MONTH') {
        queryParams['invoiceMonth'] = selection.invoiceMonth;
      } else if (selection.period.preset && selection.period.preset !== 'CUSTOM') {
        queryParams['periodPreset'] = selection.period.preset;
        if (typeof selection.period.tzOffsetMinutes === 'number') {
          queryParams['tzOffsetMinutes'] = selection.period.tzOffsetMinutes;
        }
      } else {
        const resolved = resolvePeriodSelectionToDayRange(selection.period);
        if (resolved) {
          queryParams['periodPreset'] = 'CUSTOM';
          queryParams['startDay'] = resolved.startDay;
          queryParams['endDay'] = resolved.endDay;
          queryParams['tzOffsetMinutes'] = resolved.tzOffsetMinutes;
        }
      }
    }

    if (this.selectedAccountIds().length > 0) {
      queryParams['accountIds'] = this.selectedAccountIds();
    }

    this.router.navigate(['/transactions'], { queryParams });
  }
}
