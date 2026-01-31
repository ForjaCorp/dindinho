/** @vitest-environment jsdom */
import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { of, throwError } from 'rxjs';
import { ReportsPage, AppBaseChartDirective } from './reports.page';
import { ReportsService } from '../../app/services/reports.service';
import { AccountService } from '../../app/services/account.service';
import { Component, Directive, Input } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { PageHeaderComponent } from '../../app/components/page-header.component';
import { ReportChartCardComponent } from '../../app/components/report-chart-card.component';
import { ChartEvent, ActiveElement, ChartData, ChartOptions, ChartType } from 'chart.js';

@Component({
  selector: 'app-page-header',
  standalone: true,
  template: '<div>{{ title }}</div>',
})
class MockPageHeaderComponent {
  @Input() title = '';
  @Input() subtitle: string | null = null;
}

@Directive({
  selector: '[appBaseChart]',
  standalone: true,
})
class MockBaseChartDirective {
  @Input() data: ChartData | null = null;
  @Input() options: ChartOptions | null = null;
  @Input() type: ChartType | null = null;
}

@Component({
  selector: 'app-report-chart-card',
  standalone: true,
  template: `
    <div [attr.aria-label]="ariaLabel" class="mock-card">
      @if (loading) {
        <div class="mock-skeleton"></div>
      } @else if (isEmpty) {
        <div role="status">{{ emptyMessage }}</div>
      }
      <ng-content></ng-content>
    </div>
  `,
})
class MockReportChartCardComponent {
  @Input() title = '';
  @Input() ariaLabel = '';
  @Input() loading = false;
  @Input() loadingType: 'circle' | 'rect' = 'rect';
  @Input() isEmpty = false;
  @Input() emptyMessage = 'Nenhum dado encontrado';
  @Input() emptyIcon = 'pi-inbox';
  @Input() styleClass = '';
  @Input() contentClass = '';
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
      getCashFlowChart: vi.fn(() =>
        of({
          periodKeys: [],
          data: { labels: [], datasets: [{ data: [] }, { data: [] }] },
        }),
      ),
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
      imports: [
        ReportsPage,
        MockPageHeaderComponent,
        MockBaseChartDirective,
        MockReportChartCardComponent,
      ],
      providers: [
        { provide: ReportsService, useValue: reportsServiceMock },
        { provide: AccountService, useValue: accountServiceMock },
        provideRouter([]),
      ],
    })
      .overrideComponent(ReportsPage, {
        remove: {
          imports: [PageHeaderComponent, AppBaseChartDirective, ReportChartCardComponent],
        },
        add: {
          imports: [MockPageHeaderComponent, MockBaseChartDirective, MockReportChartCardComponent],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ReportsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve manter cards alinhados com o título no mobile', () => {
    const root = fixture.nativeElement.querySelector('[data-testid="reports-page"]');
    const filters = fixture.nativeElement.querySelector('[data-testid="reports-filters"]');
    const charts = fixture.nativeElement.querySelector('[data-testid="reports-charts"]');

    expect(root).toBeTruthy();
    expect(filters).toBeTruthy();
    expect(charts).toBeTruthy();

    const filtersClass = (filters as HTMLElement).className;
    const chartsClass = (charts as HTMLElement).className;

    expect(filtersClass).not.toContain('mx-4');
    expect(chartsClass).not.toContain('px-4');
  });

  it('deve renderizar os filtros com acessibilidade', () => {
    const filters = fixture.nativeElement.querySelector('[data-testid="reports-filters"]');
    expect(filters).toBeTruthy();
    expect(filters.getAttribute('aria-label')).toBe('Filtros de relatório');
  });

  it('deve renderizar os cards de gráficos com ARIA labels', () => {
    const cards = fixture.nativeElement.querySelectorAll('.mock-card');
    expect(cards.length).toBe(3);
    expect(cards[0].getAttribute('aria-label')).toBe('Relatório de gastos por categoria');
    expect(cards[1].getAttribute('aria-label')).toBe('Relatório de evolução de saldo');
    expect(cards[2].getAttribute('aria-label')).toBe('Relatório de fluxo de caixa mensal');
  });

  it('deve enviar tzOffsetMinutes ao carregar relatórios', () => {
    const tzSpy = vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(180);
    component.dateRange.set([new Date(2024, 0, 22), new Date(2024, 0, 22)]);

    try {
      component.loadAllReports();

      expect(reportsServiceMock.getSpendingByCategoryChart).toHaveBeenCalledWith(
        expect.objectContaining({
          startDay: '2024-01-22',
          endDay: '2024-01-22',
          tzOffsetMinutes: 180,
          includePending: true,
        }),
      );
      expect(reportsServiceMock.getCashFlowChart).toHaveBeenCalledWith(
        expect.objectContaining({
          startDay: '2024-01-22',
          endDay: '2024-01-22',
          tzOffsetMinutes: 180,
          includePending: true,
        }),
      );
    } finally {
      tzSpy.mockRestore();
    }
  });

  it('deve expor acessibilidade básica nos canvases de relatório', () => {
    const spendingCanvas = fixture.nativeElement.querySelector(
      '[data-testid="spending-by-category-chart"]',
    ) as HTMLElement | null;
    const balanceCanvas = fixture.nativeElement.querySelector(
      '[data-testid="balance-history-chart"]',
    ) as HTMLElement | null;
    const cashFlowCanvas = fixture.nativeElement.querySelector(
      '[data-testid="cashflow-chart"]',
    ) as HTMLElement | null;

    expect(spendingCanvas).toBeTruthy();
    expect(balanceCanvas).toBeTruthy();
    expect(cashFlowCanvas).toBeTruthy();

    expect(spendingCanvas?.getAttribute('role')).toBe('button');
    expect(spendingCanvas?.getAttribute('tabindex')).toBe('0');
    expect(spendingCanvas?.getAttribute('aria-label')).toBe('Gráfico de gastos por categoria');
    expect(spendingCanvas?.getAttribute('aria-describedby')).toBe('spending-chart-help');
    expect(fixture.nativeElement.querySelector('#spending-chart-help')).toBeTruthy();

    expect(balanceCanvas?.getAttribute('role')).toBe('img');
    expect(balanceCanvas?.getAttribute('aria-label')).toBe('Gráfico de evolução do saldo');
    expect(balanceCanvas?.getAttribute('aria-describedby')).toBe('balance-history-chart-help');
    expect(fixture.nativeElement.querySelector('#balance-history-chart-help')).toBeTruthy();

    expect(cashFlowCanvas?.getAttribute('role')).toBe('button');
    expect(cashFlowCanvas?.getAttribute('tabindex')).toBe('0');
    expect(cashFlowCanvas?.getAttribute('aria-label')).toBe('Gráfico de fluxo de caixa mensal');
    expect(cashFlowCanvas?.getAttribute('aria-describedby')).toBe('cashflow-chart-help');
    expect(fixture.nativeElement.querySelector('#cashflow-chart-help')).toBeTruthy();
  });

  it('deve expor data-testid nos canvases dos gráficos', () => {
    expect(
      fixture.nativeElement.querySelector('[data-testid="spending-by-category-chart"]'),
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="balance-history-chart"]'),
    ).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="cashflow-chart"]')).toBeTruthy();
  });

  it('deve abrir transações ao acionar Enter no gráfico de gastos por categoria', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');

    const canvas = fixture.nativeElement.querySelector(
      '[data-testid="spending-by-category-chart"]',
    ) as HTMLCanvasElement | null;
    expect(canvas).toBeTruthy();

    canvas?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(router.navigate).toHaveBeenCalledWith(['/transactions'], {
      queryParams: expect.objectContaining({ type: 'EXPENSE', openFilters: 1 }),
    });
  });

  it('deve abrir transações ao acionar Espaço no gráfico de gastos por categoria', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');

    const canvas = fixture.nativeElement.querySelector(
      '[data-testid="spending-by-category-chart"]',
    ) as HTMLCanvasElement | null;
    expect(canvas).toBeTruthy();

    canvas?.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
    expect(router.navigate).toHaveBeenCalledWith(['/transactions'], {
      queryParams: expect.objectContaining({ type: 'EXPENSE', openFilters: 1 }),
    });
  });

  it('deve abrir transações ao acionar Enter no gráfico de fluxo de caixa', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');

    const canvas = fixture.nativeElement.querySelector(
      '[data-testid="cashflow-chart"]',
    ) as HTMLCanvasElement | null;
    expect(canvas).toBeTruthy();

    canvas?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(router.navigate).toHaveBeenCalledWith(['/transactions'], {
      queryParams: expect.objectContaining({ openFilters: 1 }),
    });
  });

  it('deve abrir transações ao acionar Espaço no gráfico de fluxo de caixa', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');

    const canvas = fixture.nativeElement.querySelector(
      '[data-testid="cashflow-chart"]',
    ) as HTMLCanvasElement | null;
    expect(canvas).toBeTruthy();

    canvas?.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
    expect(router.navigate).toHaveBeenCalledWith(['/transactions'], {
      queryParams: expect.objectContaining({ openFilters: 1 }),
    });
  });

  it('deve descrever o histórico de saldo com resumo acessível do período', () => {
    component.balanceData.set({
      datasets: [
        {
          data: [
            { x: Date.UTC(2024, 0, 1), y: 1000, label: '2024-01-01' },
            { x: Date.UTC(2024, 0, 30), y: 1200, label: '2024-01-30' },
          ],
        },
      ],
    } as unknown as ChartData<'line'>);

    fixture.detectChanges();

    const help = fixture.nativeElement.querySelector(
      '#balance-history-chart-help',
    ) as HTMLElement | null;
    expect(help).toBeTruthy();

    const text = help?.textContent ?? '';
    expect(text).toContain('Período: 01/01 - 30/01');
    expect(text).toContain('Saldo inicial');
    expect(text).toMatch(/R\$\s*1\.000,00/);
    expect(text).toContain('Saldo final');
    expect(text).toMatch(/R\$\s*1\.200,00/);
    expect(text).toMatch(/Variação:\s*\+R\$\s*200,00/);
  });

  it('deve configurar o eixo X do saldo como linear para respeitar o tempo', () => {
    const options = component.lineChartOptions();
    const scales = options.scales as unknown as Record<
      string,
      { type?: unknown; ticks?: { callback?: unknown } }
    >;
    const x = scales?.['x'];

    expect(x?.type).toBe('linear');

    const tickCallback = x?.ticks?.callback;
    expect(typeof tickCallback).toBe('function');
    if (typeof tickCallback === 'function') {
      expect(tickCallback(Date.UTC(2024, 0, 1), 0, [] as never)).toBe('01/01');
    }
  });

  it('deve mostrar tooltip de intervalo no saldo quando houver período', () => {
    const options = component.lineChartOptions();
    const tooltip = options.plugins?.tooltip as unknown as {
      callbacks?: { title?: unknown };
    };

    const titleCallback = tooltip.callbacks?.title;
    expect(typeof titleCallback).toBe('function');

    if (typeof titleCallback === 'function') {
      const title = titleCallback([
        {
          raw: { periodStart: '2024-01-01', periodEnd: '2024-01-07' },
        } as unknown as never,
      ]);
      expect(title).toBe('01/01 - 07/01');
    }
  });

  it('deve clamar o eixo X do saldo ao período selecionado', () => {
    component.dateRange.set([new Date(2024, 0, 1), new Date(2024, 0, 31)]);
    fixture.detectChanges();

    const options = component.lineChartOptions();
    const scales = options.scales as unknown as Record<string, { min?: unknown; max?: unknown }>;
    const x = scales?.['x'];

    expect(x?.min).toBe(Date.UTC(2024, 0, 1));
    expect(x?.max).toBe(Date.UTC(2024, 0, 31));
  });

  it('deve normalizar o período quando as datas estiverem invertidas', () => {
    component.dateRange.set([new Date(2024, 0, 31), new Date(2024, 0, 1)]);
    fixture.detectChanges();

    const options = component.lineChartOptions();
    const scales = options.scales as unknown as Record<string, { min?: unknown; max?: unknown }>;
    const x = scales?.['x'];

    expect(x?.min).toBe(Date.UTC(2024, 0, 1));
    expect(x?.max).toBe(Date.UTC(2024, 0, 31));
  });

  it('deve mostrar skeletons durante o carregamento', () => {
    component.loadingSpending.set(true);
    fixture.detectChanges();
    const skeletons = fixture.nativeElement.querySelectorAll('.mock-skeleton');
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
      component.cashFlowPeriodKeys.set(['2024-01', '2024-02']);
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
          invoiceMonth: '2024-01',
          openFilters: 1,
        }),
      });
    });

    it('deve incluir accountId na navegação se apenas uma conta estiver selecionada', () => {
      component.selectedAccountIds.set(['acc-123']);
      component.cashFlowPeriodKeys.set(['2024-01', '2024-02']);
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
          invoiceMonth: '2024-02',
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
