import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportsService } from '../../app/services/reports.service';
import { AccountService } from '../../app/services/account.service';
import { PageHeaderComponent } from '../../app/components/page-header.component';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { DatePickerModule } from 'primeng/datepicker';
import { MultiSelectModule } from 'primeng/multiselect';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ReportFilterDTO } from '@dindinho/shared';
import { finalize } from 'rxjs';

/**
 * Página de Relatórios e Insights Financeiros.
 *
 * @description
 * Esta página fornece uma visão detalhada das finanças do usuário através de gráficos:
 * 1. Gastos por Categoria (Doughnut)
 * 2. Fluxo de Caixa Mensal (Barra)
 * 3. Evolução de Saldo (Linha)
 *
 * @since 1.0.0
 */
@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
    BaseChartDirective,
    DatePickerModule,
    MultiSelectModule,
    CardModule,
    ProgressSpinnerModule,
  ],
  providers: [provideCharts(withDefaultRegisterables())],
  template: `
    <div class="flex flex-col gap-6 pb-24">
      <app-page-header title="Relatórios" />

      <!-- Filtros -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4">
        <div class="flex flex-col gap-1.5">
          <label
            for="filter-date-range"
            class="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1"
            >Período</label
          >
          <p-datepicker
            id="filter-date-range"
            [(ngModel)]="dateRange"
            selectionMode="range"
            [readonlyInput]="true"
            [showIcon]="true"
            iconDisplay="input"
            placeholder="Selecione o período"
            styleClass="w-full"
            inputStyleClass="!bg-white !border-slate-200 !rounded-xl !py-3"
            (onSelect)="onDateChange()"
            appendTo="body"
            data-testid="filter-date-range"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label
            for="filter-accounts"
            class="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1"
            >Contas</label
          >
          <p-multiSelect
            id="filter-accounts"
            [options]="accountService.accounts()"
            [(ngModel)]="selectedAccountIds"
            optionLabel="name"
            optionValue="id"
            placeholder="Todas as contas"
            styleClass="w-full !bg-white !border-slate-200 !rounded-xl"
            panelStyleClass="!rounded-xl shadow-xl"
            (onChange)="loadAllReports()"
            display="chip"
            appendTo="body"
            data-testid="filter-accounts"
          />
        </div>
      </div>

      <!-- Conteúdo de Gráficos -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 px-4">
        <!-- Gastos por Categoria -->
        <p-card
          header="Gastos por Categoria"
          styleClass="!shadow-sm !border-none !bg-white !rounded-2xl"
        >
          @if (loadingSpending()) {
            <div class="flex justify-center items-center h-[300px]">
              <p-progressSpinner styleClass="w-10 h-10" strokeWidth="4" />
            </div>
          } @else if (spendingData().datasets[0].data.length === 0) {
            <div
              class="flex flex-col items-center justify-center h-[300px] text-slate-400 bg-slate-50/50 rounded-xl"
            >
              <i class="pi pi-chart-pie text-4xl mb-2 opacity-20"></i>
              <p class="text-sm font-medium">Nenhum gasto registrado</p>
            </div>
          } @else {
            <div class="h-[300px] flex items-center justify-center p-2">
              <canvas
                baseChart
                [data]="spendingData()"
                [options]="doughnutChartOptions"
                [type]="'doughnut'"
              >
              </canvas>
            </div>
          }
        </p-card>

        <!-- Evolução de Saldo -->
        <p-card
          header="Evolução de Saldo"
          styleClass="!shadow-sm !border-none !bg-white !rounded-2xl"
        >
          @if (loadingBalance()) {
            <div class="flex justify-center items-center h-[300px]">
              <p-progressSpinner styleClass="w-10 h-10" strokeWidth="4" />
            </div>
          } @else if (balanceData().labels?.length === 0) {
            <div
              class="flex flex-col items-center justify-center h-[300px] text-slate-400 bg-slate-50/50 rounded-xl"
            >
              <i class="pi pi-chart-line text-4xl mb-2 opacity-20"></i>
              <p class="text-sm font-medium">Sem histórico no período</p>
            </div>
          } @else {
            <div class="h-[300px] p-2">
              <canvas baseChart [data]="balanceData()" [options]="lineChartOptions" [type]="'line'">
              </canvas>
            </div>
          }
        </p-card>

        <!-- Fluxo de Caixa -->
        <p-card
          header="Fluxo de Caixa"
          styleClass="!shadow-sm !border-none !bg-white !rounded-2xl lg:col-span-2"
        >
          @if (loadingCashFlow()) {
            <div class="flex justify-center items-center h-[300px]">
              <p-progressSpinner styleClass="w-10 h-10" strokeWidth="4" />
            </div>
          } @else if (cashFlowData().labels?.length === 0) {
            <div
              class="flex flex-col items-center justify-center h-[300px] text-slate-400 bg-slate-50/50 rounded-xl"
            >
              <i class="pi pi-chart-bar text-4xl mb-2 opacity-20"></i>
              <p class="text-sm font-medium">Nenhuma movimentação no período</p>
            </div>
          } @else {
            <div class="h-[350px] p-2">
              <canvas baseChart [data]="cashFlowData()" [options]="barChartOptions" [type]="'bar'">
              </canvas>
            </div>
          }
        </p-card>
      </div>
    </div>
  `,
  styles: [
    `
      :host ::ng-deep {
        .p-card {
          border-radius: 1rem;
          overflow: hidden;
        }
        .p-card-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1e293b;
        }
      }
    `,
  ],
})
export class ReportsPage implements OnInit {
  private reportsService = inject(ReportsService);
  protected accountService = inject(AccountService);

  // Filtros
  dateRange = signal<Date[]>([
    new Date(new Date().getFullYear(), new Date().getMonth(), 1), // Primeiro dia do mês
    new Date(),
  ]);
  selectedAccountIds = signal<string[]>([]);

  // Estados de Loading
  loadingSpending = signal(false);
  loadingCashFlow = signal(false);
  loadingBalance = signal(false);

  // Dados dos Gráficos
  spendingData = signal<ChartData<'doughnut'>>({
    labels: [],
    datasets: [{ data: [], backgroundColor: [], hoverOffset: 4 }],
  });

  cashFlowData = signal<ChartData<'bar'>>({
    labels: [],
    datasets: [],
  });

  balanceData = signal<ChartData<'line'>>({
    labels: [],
    datasets: [],
  });

  // Opções dos Gráficos
  doughnutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.raw as number;
            return ` ${label}: R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
          },
        },
      },
    },
  };

  barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => `R$ ${value}`,
        },
      },
    },
  };

  lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    elements: {
      line: { tension: 0.4 },
      point: { radius: 2, hoverRadius: 5 },
    },
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: {
        ticks: {
          callback: (value) => `R$ ${value}`,
        },
      },
    },
  };

  ngOnInit() {
    this.accountService.loadAccounts();
    this.loadAllReports();
  }

  onDateChange() {
    if (this.dateRange()?.length === 2 && this.dateRange()[0] && this.dateRange()[1]) {
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

  private fetchSpending(filters: ReportFilterDTO) {
    this.loadingSpending.set(true);
    this.reportsService
      .getSpendingByCategory(filters)
      .pipe(finalize(() => this.loadingSpending.set(false)))
      .subscribe((data) => {
        this.spendingData.set({
          labels: data.map((i) => i.categoryName),
          datasets: [
            {
              data: data.map((i) => i.amount),
              backgroundColor: data.map((i) => i.color || this.getRandomColor()),
              hoverOffset: 4,
            },
          ],
        });
      });
  }

  private fetchCashFlow(filters: ReportFilterDTO) {
    this.loadingCashFlow.set(true);
    this.reportsService
      .getCashFlow(filters)
      .pipe(finalize(() => this.loadingCashFlow.set(false)))
      .subscribe((data) => {
        this.cashFlowData.set({
          labels: data.map((i) => i.period),
          datasets: [
            {
              label: 'Receitas',
              data: data.map((i) => i.income),
              backgroundColor: '#10b981', // Emerald 500
              borderRadius: 4,
            },
            {
              label: 'Despesas',
              data: data.map((i) => i.expense),
              backgroundColor: '#ef4444', // Red 500
              borderRadius: 4,
            },
          ],
        });
      });
  }

  private fetchBalanceHistory(filters: ReportFilterDTO) {
    this.loadingBalance.set(true);
    this.reportsService
      .getBalanceHistory(filters)
      .pipe(finalize(() => this.loadingBalance.set(false)))
      .subscribe((data) => {
        this.balanceData.set({
          labels: data.map((i) => new Date(i.date).toLocaleDateString('pt-BR')),
          datasets: [
            {
              label: 'Saldo',
              data: data.map((i) => i.balance),
              fill: true,
              borderColor: '#6366f1', // Indigo 500
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              pointBackgroundColor: '#6366f1',
              borderWidth: 2,
            },
          ],
        });
      });
  }

  private getRandomColor() {
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}
