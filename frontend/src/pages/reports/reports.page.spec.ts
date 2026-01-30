/** @vitest-environment jsdom */
import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { ReportsPage } from './reports.page';
import { ReportsService } from '../../app/services/reports.service';
import { AccountService } from '../../app/services/account.service';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Component, input } from '@angular/core';
import { Router } from '@angular/router';
import { PageHeaderComponent } from '../../app/components/page-header.component';

@Component({
  selector: 'app-page-header',
  standalone: true,
  template: '<div>{{ title() }}</div>',
})
class MockPageHeaderComponent {
  title = input<string>('');
  subtitle = input<string | null>(null);
}

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

describe('ReportsPage', () => {
  let fixture: ComponentFixture<ReportsPage>;
  let reportsServiceMock: {
    getSpendingByCategory: ReturnType<typeof vi.fn>;
    getCashFlow: ReturnType<typeof vi.fn>;
    getBalanceHistory: ReturnType<typeof vi.fn>;
  };
  let accountServiceMock: {
    accounts: ReturnType<typeof vi.fn>;
    loadAccounts: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    reportsServiceMock = {
      getSpendingByCategory: vi.fn(() => of([])),
      getCashFlow: vi.fn(() => of([])),
      getBalanceHistory: vi.fn(() => of([])),
    };

    accountServiceMock = {
      accounts: vi.fn(() => []),
      loadAccounts: vi.fn(),
    };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ReportsPage, MockPageHeaderComponent],
      providers: [
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        provideNoopAnimations(),
        { provide: ReportsService, useValue: reportsServiceMock },
        { provide: AccountService, useValue: accountServiceMock },
      ],
    })
      .overrideComponent(ReportsPage, {
        remove: { imports: [PageHeaderComponent] },
        add: { imports: [MockPageHeaderComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ReportsPage);
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
    fixture.componentInstance.loadingSpending.set(true);
    fixture.detectChanges();
    const skeletons = fixture.nativeElement.querySelectorAll('p-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('deve mostrar mensagem de estado vazio quando não há dados', () => {
    fixture.componentInstance.loadingSpending.set(false);
    fixture.componentInstance.spendingData.set({
      labels: [],
      datasets: [{ data: [], backgroundColor: [], hoverOffset: 4 }],
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
      const component = fixture.componentInstance;
      // Simula IDs de categoria carregados
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (component as any).categoryIds = ['cat-1', 'cat-2'];

      // Simula o clique no gráfico
      const options = component.doughnutChartOptions;
      if (options?.onClick) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        options.onClick({} as any, [{ index: 0, datasetIndex: 0 }] as any, {} as any);
      }

      expect(router.navigate).toHaveBeenCalledWith(['/transactions'], {
        queryParams: expect.objectContaining({
          type: 'EXPENSE',
          openFilters: 1,
        }),
      });
    });

    it('deve navegar para transações ao clicar em uma barra no gráfico de fluxo de caixa', () => {
      const component = fixture.componentInstance;
      component.cashFlowData.set({
        labels: ['2024-01', '2024-02'],
        datasets: [
          { label: 'Receitas', data: [100, 200] },
          { label: 'Despesas', data: [50, 150] },
        ],
      });

      // Simula o clique no gráfico de barras (Receitas do primeiro mês)
      const options = component.barChartOptions;
      if (options?.onClick) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        options.onClick({} as any, [{ index: 0, datasetIndex: 0 }] as any, {} as any);
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
      const component = fixture.componentInstance;
      component.selectedAccountIds.set(['acc-123']);

      // Simula o clique no gráfico de barras (Despesas do segundo mês)
      const options = component.barChartOptions;
      component.cashFlowData.set({
        labels: ['2024-01', '2024-02'],
        datasets: [
          { label: 'Receitas', data: [100, 200] },
          { label: 'Despesas', data: [50, 150] },
        ],
      });

      if (options?.onClick) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        options.onClick({} as any, [{ index: 1, datasetIndex: 1 }] as any, {} as any);
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
});
