import { Component, OnInit, inject, signal, Directive } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ReportsService } from '../../app/services/reports.service';
import { AccountService } from '../../app/services/account.service';
import { PageHeaderComponent } from '../../app/components/page-header.component';
import { ChartData, ActiveElement, ChartOptions } from 'chart.js';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { DatePickerModule } from 'primeng/datepicker';
import { MultiSelectModule } from 'primeng/multiselect';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ReportFilterDTO } from '@dindinho/shared';
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
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
    AppBaseChartDirective,
    ReportChartCardComponent,
    DatePickerModule,
    MultiSelectModule,
    ButtonModule,
    ProgressSpinnerModule,
    ToastModule,
  ],
  providers: [provideCharts(withDefaultRegisterables()), MessageService],
  template: `
    <div class="flex flex-col gap-6 p-4 md:p-6 pb-24 max-w-5xl mx-auto">
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
        class="bg-white mx-4 p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end"
        role="search"
        aria-label="Filtros de relatório"
      >
        <div class="flex flex-col gap-1.5 flex-1 min-w-[280px]">
          <label
            for="date-range"
            class="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1"
            >Período</label
          >
          <p-datepicker
            inputId="date-range"
            [(ngModel)]="dateRange"
            selectionMode="range"
            [readonlyInput]="true"
            [showIcon]="true"
            (onSelect)="onDateChange()"
            placeholder="Selecione o período"
            styleClass="w-full"
            inputStyleClass="!bg-white !border-slate-200 !rounded-xl !py-3 !px-4"
            dateFormat="dd/mm/yy"
            aria-label="Selecionar intervalo de datas"
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
            [(ngModel)]="selectedAccountIds"
            [options]="accountService.accounts()"
            optionLabel="name"
            optionValue="id"
            placeholder="Todas as contas"
            (onChange)="loadAllReports()"
            styleClass="w-full !bg-white !border-slate-200 !rounded-xl !min-h-[46px]"
            display="chip"
            [maxSelectedLabels]="3"
            aria-label="Selecionar contas para filtrar"
          />
        </div>
      </section>

      <!-- Gráficos -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 px-4">
        <!-- Gastos por Categoria -->
        <app-report-chart-card
          title="Gastos por Categoria"
          ariaLabel="Relatório de gastos por categoria"
          [loading]="loadingSpending()"
          loadingType="circle"
          [isEmpty]="!spendingData().datasets[0]?.data?.length"
          emptyMessage="Nenhum gasto registrado no período"
        >
          <canvas
            appBaseChart
            [data]="spendingData()"
            [options]="doughnutChartOptions"
            [type]="'doughnut'"
            class="cursor-pointer"
          >
          </canvas>
        </app-report-chart-card>

        <!-- Histórico de Saldo -->
        <app-report-chart-card
          title="Evolução do Saldo"
          ariaLabel="Relatório de evolução de saldo"
          [loading]="loadingBalance()"
        >
          <canvas appBaseChart [data]="balanceData()" [options]="lineChartOptions" [type]="'line'">
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
          <canvas
            appBaseChart
            [data]="cashFlowData()"
            [options]="barChartOptions"
            [type]="'bar'"
            class="cursor-pointer"
          >
          </canvas>
        </app-report-chart-card>
      </div>
    </div>
  `,
  styles: [
    `
      :host ::ng-deep {
        canvas.cursor-pointer {
          cursor: pointer;
        }
      }
    `,
  ],
})
export class ReportsPage implements OnInit {
  private reportsService = inject(ReportsService);
  protected accountService = inject(AccountService);
  private router = inject(Router);
  private messageService = inject(MessageService);

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
  balanceData = signal<ChartData<'line'>>({
    labels: [],
    datasets: [],
  });

  private categoryIds: string[] = [];

  // Configurações dos Gráficos
  doughnutChartOptions = this.createDoughnutOptions();
  lineChartOptions = this.createLineOptions();
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

  private createLineOptions(): ChartOptions<'line'> {
    return {
      ...COMMON_CHART_OPTIONS,
      layout: {
        padding: 10,
      },
      scales: {
        y: {
          beginAtZero: false,
          grid: { color: '#f1f5f9' },
        },
        x: {
          grid: { display: false },
        },
      },
    };
  }

  private createBarOptions(): ChartOptions<'bar'> {
    return {
      ...COMMON_CHART_OPTIONS,
      onClick: (_, elements: ActiveElement[]) => {
        if (elements.length > 0) {
          const element = elements[0];
          const month = this.cashFlowData().labels?.[element.index] as string;
          const type = element.datasetIndex === 0 ? 'INCOME' : 'EXPENSE';
          this.navigateToTransactions(type, undefined, month);
        }
      },
      scales: {
        x: { stacked: false, grid: { display: false } },
        y: { stacked: false, grid: { color: '#f1f5f9' } },
      },
    };
  }

  ngOnInit() {
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
    const [start, end] = this.dateRange();
    if (!start || !end) return;

    const filters: ReportFilterDTO = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      accountIds: this.selectedAccountIds().length > 0 ? this.selectedAccountIds() : undefined,
      includePending: true,
    };

    this.fetchSpending(filters);
    this.fetchCashFlow(filters);
    this.fetchBalanceHistory(filters);
  }

  exportCsv() {
    const [start, end] = this.dateRange();
    if (!start || !end) return;

    const filters: ReportFilterDTO = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      accountIds: this.selectedAccountIds().length > 0 ? this.selectedAccountIds() : undefined,
      includePending: true,
    };

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
        next: (data) => this.cashFlowData.set(data),
        error: () => this.resetCashFlowData(),
      });
  }

  private fetchBalanceHistory(filters: ReportFilterDTO) {
    this.loadingBalance.set(true);
    this.reportsService
      .getBalanceHistoryChart(filters)
      .pipe(finalize(() => this.loadingBalance.set(false)))
      .subscribe({
        next: (data) => this.balanceData.set(data),
        error: () => this.resetBalanceData(),
      });
  }

  private resetSpendingData() {
    this.spendingData.set({ labels: [], datasets: [{ data: [] }] });
    this.categoryIds = [];
  }

  private resetCashFlowData() {
    this.cashFlowData.set({ labels: [], datasets: [] });
  }

  private resetBalanceData() {
    this.balanceData.set({ labels: [], datasets: [] });
  }

  private navigateToTransactions(type: 'INCOME' | 'EXPENSE', categoryId?: string, month?: string) {
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

    if (month) {
      queryParams['month'] = month;
    }

    if (this.selectedAccountIds().length === 1) {
      queryParams['accountId'] = this.selectedAccountIds()[0];
    }

    this.router.navigate(['/transactions'], { queryParams });
  }
}
