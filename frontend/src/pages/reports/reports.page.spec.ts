/** @vitest-environment jsdom */
import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { of, throwError } from 'rxjs';
import { ReportsPage, AppBaseChartDirective } from './reports.page';
import { ReportsService } from '../../app/services/reports.service';
import { AccountService } from '../../app/services/account.service';
import { Component, input, Directive } from '@angular/core';
import { Router } from '@angular/router';
import { PageHeaderComponent } from '../../app/components/page-header.component';
import { ChartEvent, ActiveElement, ChartData, ChartOptions, ChartType } from 'chart.js';

@Component({
  selector: 'app-page-header',
  standalone: true,
  template: '<div>{{ title() }}</div>',
})
class MockPageHeaderComponent {
  title = input<string>('');
  subtitle = input<string | null>(null);
}

@Directive({
  selector: '[appBaseChart]',
  standalone: true,
})
class MockBaseChartDirective {
  data = input<ChartData | null>(null);
  options = input<ChartOptions | null>(null);
  type = input<ChartType | null>(null);
}

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

describe('ReportsPage', () => {
  let fixture: ComponentFixture<ReportsPage>;
  let component: ReportsPage;
  let reportsServiceMock: {
    getSpendingByCategory: Mock;
    getSpendingByCategoryChart: Mock;
    getCashFlow: Mock;
    getCashFlowChart: Mock;
    getBalanceHistory: Mock;
    getBalanceHistoryChart: Mock;
    exportTransactionsCsv: Mock;
  };
  let accountServiceMock: {
    accounts: Mock;
    loadAccounts: Mock;
  };

  beforeEach(async () => {
    reportsServiceMock = {
      getSpendingByCategory: vi.fn(() => of([])),
      getSpendingByCategoryChart: vi.fn(() =>
        of({ data: { labels: [], datasets: [{ data: [] }] }, categoryIds: [] }),
      ),
      getCashFlow: vi.fn(() => of([])),
      getCashFlowChart: vi.fn(() => of({ labels: [], datasets: [{ data: [] }, { data: [] }] })),
      getBalanceHistory: vi.fn(() => of([])),
      getBalanceHistoryChart: vi.fn(() => of({ labels: [], datasets: [{ data: [] }] })),
      exportTransactionsCsv: vi.fn(() => of(new Blob())),
    };

    accountServiceMock = {
      accounts: vi.fn(() => []),
      loadAccounts: vi.fn(),
    };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ReportsPage, MockPageHeaderComponent, MockBaseChartDirective],
      providers: [
        { provide: ReportsService, useValue: reportsServiceMock },
        { provide: AccountService, useValue: accountServiceMock },
      ],
    })
      .overrideComponent(ReportsPage, {
        remove: { imports: [PageHeaderComponent, AppBaseChartDirective] },
        add: { imports: [MockPageHeaderComponent, MockBaseChartDirective] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ReportsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve renderizar os filtros com acessibilidade', () => {
    const filters = fixture.nativeElement.querySelector('[role="search"]');
    expect(filters).toBeTruthy();
    expect(filters.getAttribute('aria-label')).toBe('Filtros de relatório');
  });

  it('deve renderizar os cards de gráficos com ARIA labels', () => {
    const cards = fixture.nativeElement.querySelectorAll('p-card');
    expect(cards.length).toBe(3);
    expect(cards[0].getAttribute('aria-label')).toBe('Relatório de gastos por categoria');
    expect(cards[1].getAttribute('aria-label')).toBe('Relatório de evolução de saldo');
    expect(cards[2].getAttribute('aria-label')).toBe('Relatório de fluxo de caixa mensal');
  });

  it('deve mostrar skeletons durante o carregamento', () => {
    component.loadingSpending.set(true);
    fixture.detectChanges();
    const skeletons = fixture.nativeElement.querySelectorAll('p-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('deve mostrar mensagem de estado vazio quando não há dados', () => {
    component.loadingSpending.set(false);
    component.spendingData.set({
      labels: [],
      datasets: [{ data: [] }],
    });
    fixture.detectChanges();
    const emptyState = fixture.nativeElement.querySelector('[role="status"]');
    expect(emptyState).toBeTruthy();
    expect(emptyState.textContent).toContain('Nenhum gasto registrado');
  });

  describe('Drill-down', () => {
    let router: Router;

    beforeEach(() => {
      router = TestBed.inject(Router);
      vi.spyOn(router, 'navigate');
    });

    it('deve navegar para transações ao clicar em uma categoria no gráfico de rosca', () => {
      (component as unknown as { categoryIds: string[] }).categoryIds = ['cat-1', 'cat-2'];

      const options = component.doughnutChartOptions;
      if (options?.onClick) {
        const event = {} as ChartEvent;
        const elements: ActiveElement[] = [
          { index: 0, datasetIndex: 0, element: {} as ActiveElement['element'] },
        ];
        options.onClick(event, elements, {} as never);
      }

      expect(router.navigate).toHaveBeenCalledWith(['/transactions'], {
        queryParams: expect.objectContaining({
          type: 'EXPENSE',
          categoryId: 'cat-1',
          openFilters: 1,
        }),
      });
    });

    it('deve navegar para transações ao clicar em uma barra no gráfico de fluxo de caixa', () => {
      component.cashFlowData.set({
        labels: ['2024-01', '2024-02'],
        datasets: [
          { label: 'Receitas', data: [100, 200] },
          { label: 'Despesas', data: [50, 150] },
        ],
      });

      const options = component.barChartOptions;
      if (options?.onClick) {
        const event = {} as ChartEvent;
        const elements: ActiveElement[] = [
          { index: 0, datasetIndex: 0, element: {} as ActiveElement['element'] },
        ];
        options.onClick(event, elements, {} as never);
      }

      expect(router.navigate).toHaveBeenCalledWith(['/transactions'], {
        queryParams: expect.objectContaining({
          type: 'INCOME',
          month: '2024-01',
          openFilters: 1,
        }),
      });
    });

    it('deve incluir accountId na navegação se apenas uma conta estiver selecionada', () => {
      component.selectedAccountIds.set(['acc-123']);
      component.cashFlowData.set({
        labels: ['2024-01', '2024-02'],
        datasets: [
          { label: 'Receitas', data: [100, 200] },
          { label: 'Despesas', data: [50, 150] },
        ],
      });

      const options = component.barChartOptions;
      if (options?.onClick) {
        const event = {} as ChartEvent;
        const elements: ActiveElement[] = [
          { index: 1, datasetIndex: 1, element: {} as ActiveElement['element'] },
        ];
        options.onClick(event, elements, {} as never);
      }

      expect(router.navigate).toHaveBeenCalledWith(['/transactions'], {
        queryParams: expect.objectContaining({
          type: 'EXPENSE',
          month: '2024-02',
          accountId: 'acc-123',
          openFilters: 1,
        }),
      });
    });
  });

  describe('Tratamento de Erros e Casos de Borda', () => {
    it('deve lidar com erro na API de gastos por categoria', () => {
      reportsServiceMock.getSpendingByCategoryChart.mockReturnValue(
        throwError(() => new Error('Erro API')),
      );

      component.loadAllReports();

      expect(component.loadingSpending()).toBe(false);
      expect(component.spendingData().labels?.length).toBe(0);
    });

    it('deve exportar CSV ao clicar no botão de exportação', () => {
      const mockBlob = new Blob(['csv content'], { type: 'text/csv' });
      reportsServiceMock.exportTransactionsCsv.mockReturnValue(of(mockBlob));

      // Simular window.URL.createObjectURL e link.click
      const createObjectURLSpy = vi
        .spyOn(window.URL, 'createObjectURL')
        .mockReturnValue('blob:url');
      const revokeObjectURLSpy = vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {
        /* mock */
      });

      component.exportCsv();

      expect(reportsServiceMock.exportTransactionsCsv).toHaveBeenCalled();
      expect(createObjectURLSpy).toHaveBeenCalledWith(mockBlob);
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:url');
    });

    it('deve lidar com datas nulas nos filtros', () => {
      component.dateRange.set([null as unknown as Date, null as unknown as Date]);
      component.onDateChange();

      expect(reportsServiceMock.getSpendingByCategoryChart).not.toHaveBeenCalledTimes(2); // Chamado 1x no init
    });
  });
});
