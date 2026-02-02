/** @vitest-environment jsdom */
import { Component, signal, input, Input } from '@angular/core';
import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ActivatedRoute,
  ParamMap,
  convertToParamMap,
  provideRouter,
  Router,
} from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { TransactionsPage } from './transactions.page';
import { ApiService } from '../../app/services/api.service';
import { AccountService } from '../../app/services/account.service';
import { CategoryService } from '../../app/services/category.service';
import { TransactionDTO, AccountDTO, TimeFilterSelectionDTO } from '@dindinho/shared';
import { PageHeaderComponent } from '../../app/components/page-header.component';
import { TransactionDrawerComponent } from '../../app/components/transaction-drawer.component';
import { EmptyStateComponent } from '../../app/components/empty-state.component';

@Component({
  selector: 'app-page-header',
  standalone: true,
  template: '<ng-content select="[page-header-actions]"></ng-content>',
})
class MockPageHeaderComponent {
  title = input<string>();
  subtitle = input<string>();
}

@Component({
  selector: 'app-transaction-drawer',
  standalone: true,
  template: '',
})
class MockTransactionDrawerComponent {
  show(id: string) {
    return id;
  }
}

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: '',
  host: {
    '[attr.data-testid]': 'testId',
  },
})
class MockEmptyStateComponent {
  @Input() testId = '';
  icon = input<string>();
  title = input<string>();
  description = input<string>();
}

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

describe('TransactionsPage', () => {
  let fixture: ComponentFixture<TransactionsPage>;
  let queryParamMap$: BehaviorSubject<ParamMap>;
  let router: Router;

  interface TransactionsPageHarness {
    onTransactionUpdated: (t: TransactionDTO) => void;
    onTransactionsDeleted: (ids: string[]) => void;
  }
  const originalIntersectionObserver = globalThis.IntersectionObserver;
  const observeSpy = vi.fn();
  const disconnectSpy = vi.fn();

  const account: AccountDTO = {
    id: 'account-1',
    name: 'Conta Padrão',
    color: '#10b981',
    icon: 'pi-wallet',
    type: 'STANDARD',
    ownerId: 'user-1',
    balance: 100,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const txs: TransactionDTO[] = [
    {
      id: 'tx-1',
      accountId: account.id,
      categoryId: null,
      amount: 10,
      description: 'Café',
      date: '2026-01-02T00:00:00.000Z',
      type: 'EXPENSE',
      isPaid: true,
      recurrenceId: null,
      installmentNumber: null,
      totalInstallments: null,
      createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    },
  ];

  beforeEach(async () => {
    observeSpy.mockReset();
    disconnectSpy.mockReset();

    queryParamMap$ = new BehaviorSubject<ParamMap>(convertToParamMap({}));

    class MockIntersectionObserver {
      constructor(
        private callback: IntersectionObserverCallback,
        private options?: IntersectionObserverInit,
      ) {
        void callback;
        void options;
      }

      observe = observeSpy;
      disconnect = disconnectSpy;
      unobserve = vi.fn();
      takeRecords = vi.fn(() => [] as IntersectionObserverEntry[]);
      root = null;
      rootMargin = '';
      thresholds = [] as number[];
    }

    globalThis.IntersectionObserver =
      MockIntersectionObserver as unknown as typeof IntersectionObserver;

    const apiServiceMock = {
      getTransactions: vi.fn(() => of({ items: txs, nextCursorId: null })),
    };

    const accountServiceMock = {
      accounts: signal([account]),
      loadAccounts: vi.fn(),
      totalBalance: signal(100),
    };

    const categoryServiceMock = {
      list: vi.fn(() => of([])),
      loadCategories: vi.fn(),
      categories: signal([]),
    };

    await TestBed.configureTestingModule({
      imports: [TransactionsPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: queryParamMap$.asObservable(),
          },
        },
        { provide: ApiService, useValue: apiServiceMock },
        { provide: AccountService, useValue: accountServiceMock },
        { provide: CategoryService, useValue: categoryServiceMock },
      ],
    })
      .overrideComponent(TransactionsPage, {
        remove: { imports: [PageHeaderComponent, TransactionDrawerComponent, EmptyStateComponent] },
        add: {
          imports: [
            MockPageHeaderComponent,
            MockTransactionDrawerComponent,
            MockEmptyStateComponent,
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(TransactionsPage);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  afterEach(() => {
    globalThis.IntersectionObserver = originalIntersectionObserver;
    TestBed.resetTestingModule();
  });

  it('deve renderizar a página', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="transactions-page"]')).toBeTruthy();
  });

  it('deve carregar transações na inicialização', () => {
    const api = TestBed.inject(ApiService) as unknown as {
      getTransactions: ReturnType<typeof vi.fn>;
    };
    expect(api.getTransactions).toHaveBeenCalledTimes(1);
    expect(api.getTransactions).toHaveBeenCalledWith({ limit: 30 });

    const list = fixture.nativeElement.querySelector('[data-testid="transactions-list"]');
    expect(list).toBeTruthy();
    expect(list.textContent).toContain('Café');
  });

  it('deve atualizar item na lista ao receber transação atualizada', () => {
    const component = fixture.componentInstance as unknown as TransactionsPageHarness;

    component.onTransactionUpdated({ ...txs[0], description: 'Mercado' });
    fixture.detectChanges();

    const list = fixture.nativeElement.querySelector('[data-testid="transactions-list"]');
    expect(list).toBeTruthy();
    expect(list.textContent).toContain('Mercado');
  });

  it('deve remover itens da lista ao receber ids excluídos', () => {
    const component = fixture.componentInstance as unknown as TransactionsPageHarness;

    component.onTransactionsDeleted([txs[0].id]);
    fixture.detectChanges();

    const list = fixture.nativeElement.querySelector('[data-testid="transactions-list"]');
    expect(list).toBeFalsy();

    // Check if empty state is rendered
    const emptyState = fixture.nativeElement.querySelector('app-empty-state');
    expect(emptyState).toBeTruthy();
    expect(emptyState.getAttribute('data-testid')).toBe('transactions-empty');
  });

  it('deve navegar para nova transação ao acionar ação', () => {
    const component = fixture.componentInstance as unknown as { onNewTransaction: () => void };
    component.onNewTransaction();

    expect(router.navigate).toHaveBeenCalledWith(['/transactions/new'], {
      queryParams: { openAmount: 1 },
    });
  });

  it('deve esconder filtros avançados até acionar o botão de filtros', () => {
    const filters = fixture.nativeElement.querySelector('[data-testid="transactions-filters"]');
    expect(filters).toBeFalsy();

    const component = fixture.componentInstance as unknown as { toggleFilters: () => void };
    component.toggleFilters();
    fixture.detectChanges();

    const filtersAfter = fixture.nativeElement.querySelector(
      '[data-testid="transactions-filters"]',
    );
    expect(filtersAfter).toBeTruthy();
  });

  it('deve expor aria-label no botão de filtros', () => {
    const btn = fixture.nativeElement.querySelector(
      '[data-testid="transactions-filters-toggle"]',
    ) as HTMLElement | null;
    expect(btn).toBeTruthy();
    expect(btn?.getAttribute('aria-label')).toBeTruthy();
  });

  it('deve exibir filtro de período ao abrir filtros avançados', () => {
    const component = fixture.componentInstance as unknown as { toggleFilters: () => void };
    component.toggleFilters();
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="transactions-time-filter"]'),
    ).toBeTruthy();
  });

  it('deve aplicar filtro de invoiceMonth ao carregar transações', () => {
    const api = TestBed.inject(ApiService) as unknown as {
      getTransactions: ReturnType<typeof vi.fn>;
    };

    const component = fixture.componentInstance as unknown as {
      toggleFilters: () => void;
      onTimeFilterSelectionChange: (s: TimeFilterSelectionDTO) => void;
    };
    component.toggleFilters();
    fixture.detectChanges();

    component.onTimeFilterSelectionChange({ mode: 'INVOICE_MONTH', invoiceMonth: '2026-01' });
    fixture.detectChanges();

    const lastCall = api.getTransactions.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(lastCall).toMatchObject({
      limit: 30,
      invoiceMonth: '2026-01',
    });

    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParamsHandling: 'merge',
        queryParams: expect.objectContaining({
          invoiceMonth: '2026-01',
          month: null,
          periodPreset: null,
          startDay: null,
          endDay: null,
        }),
      }),
    );
  });

  it('deve aplicar filtro de startDay/endDay ao carregar transações', () => {
    const api = TestBed.inject(ApiService) as unknown as {
      getTransactions: ReturnType<typeof vi.fn>;
    };

    queryParamMap$.next(
      convertToParamMap({
        startDay: '2026-01-10',
        endDay: '2026-01-15',
        tzOffsetMinutes: '180',
        openFilters: '1',
      }),
    );
    fixture.detectChanges();

    const lastCall = api.getTransactions.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(lastCall).toMatchObject({
      limit: 30,
      startDay: '2026-01-10',
      endDay: '2026-01-15',
      tzOffsetMinutes: 180,
    });
  });

  it('deve aplicar preset via query param e manter label por extenso', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 30, 12, 0, 0));

    const api = TestBed.inject(ApiService) as unknown as {
      getTransactions: ReturnType<typeof vi.fn>;
    };

    queryParamMap$.next(
      convertToParamMap({
        periodPreset: 'TODAY',
        tzOffsetMinutes: '180',
        openFilters: '1',
      }),
    );
    fixture.detectChanges();

    const lastCall = api.getTransactions.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(lastCall).toMatchObject({
      limit: 30,
      tzOffsetMinutes: 180,
    });
    expect(typeof lastCall['startDay']).toBe('string');
    expect(typeof lastCall['endDay']).toBe('string');

    const summary = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-summary"]',
    ) as HTMLElement | null;
    expect(summary).toBeTruthy();
    expect((summary?.textContent ?? '').trim()).toBe('Hoje');

    vi.useRealTimers();
  });

  it('deve sincronizar periodPreset ao selecionar preset no filtro', () => {
    const component = fixture.componentInstance as unknown as {
      toggleFilters: () => void;
      onTimeFilterSelectionChange: (s: TimeFilterSelectionDTO) => void;
    };

    component.toggleFilters();
    fixture.detectChanges();

    component.onTimeFilterSelectionChange({
      mode: 'DAY_RANGE',
      period: { preset: 'TODAY', tzOffsetMinutes: 180 },
    });

    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParamsHandling: 'merge',
        queryParams: expect.objectContaining({
          periodPreset: 'TODAY',
          invoiceMonth: null,
          month: null,
          startDay: null,
          endDay: null,
        }),
      }),
    );
  });

  it('deve limpar query param legado month ao trocar para preset', () => {
    queryParamMap$.next(convertToParamMap({ month: '2026-01', openFilters: '1' }));
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      toggleFilters: () => void;
      onTimeFilterSelectionChange: (s: TimeFilterSelectionDTO) => void;
    };
    component.toggleFilters();
    fixture.detectChanges();

    component.onTimeFilterSelectionChange({
      mode: 'DAY_RANGE',
      period: { preset: 'TODAY', tzOffsetMinutes: 180 },
    });

    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParamsHandling: 'merge',
        queryParams: expect.objectContaining({
          month: null,
          invoiceMonth: null,
          periodPreset: 'TODAY',
        }),
      }),
    );
  });

  it('deve aplicar filtro de conta via query param', () => {
    const api = TestBed.inject(ApiService) as unknown as {
      getTransactions: ReturnType<typeof vi.fn>;
    };

    queryParamMap$.next(convertToParamMap({ accountId: 'account-1', openFilters: '1' }));
    fixture.detectChanges();

    const lastCall = api.getTransactions.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(lastCall).toMatchObject({ limit: 30, accountIds: ['account-1'] });

    expect(
      fixture.nativeElement.querySelector('[data-testid="transactions-filters"]'),
    ).toBeTruthy();
    // p-multiselect is more complex to query by value, so checking presence is enough for now
    // or check component instance state
    const component = fixture.componentInstance as unknown as {
      accountFilterIds: () => string[];
    };
    expect(component.accountFilterIds()).toEqual(['account-1']);
  });

  it('deve aplicar filtro de categoria via query param', () => {
    const api = TestBed.inject(ApiService) as unknown as {
      getTransactions: ReturnType<typeof vi.fn>;
    };

    queryParamMap$.next(convertToParamMap({ categoryId: 'cat-1', openFilters: '1' }));
    fixture.detectChanges();

    const lastCall = api.getTransactions.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(lastCall).toMatchObject({ limit: 30, categoryId: 'cat-1' });

    expect(
      fixture.nativeElement.querySelector('[data-testid="transactions-filters"]'),
    ).toBeTruthy();
  });

  it('deve aplicar filtro de tipo via query param', () => {
    const api = TestBed.inject(ApiService) as unknown as {
      getTransactions: ReturnType<typeof vi.fn>;
    };

    queryParamMap$.next(convertToParamMap({ type: 'INCOME', openFilters: '1' }));
    fixture.detectChanges();

    const lastCall = api.getTransactions.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(lastCall).toMatchObject({ limit: 30, type: 'INCOME' });

    expect(
      fixture.nativeElement.querySelector('[data-testid="transactions-filters"]'),
    ).toBeTruthy();
  });

  it('deve sincronizar query params ao mudar filtro de conta', () => {
    const component = fixture.componentInstance as unknown as {
      toggleFilters: () => void;
      onAccountFilterChange: (ids: string[]) => void;
    };

    component.toggleFilters();
    fixture.detectChanges();

    component.onAccountFilterChange(['account-1']);

    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParamsHandling: 'merge',
        queryParams: expect.objectContaining({
          accountIds: ['account-1'],
          accountId: null,
          openFilters: 1,
        }),
      }),
    );
  });

  it('deve sincronizar query params ao mudar filtro de categoria', () => {
    const component = fixture.componentInstance as unknown as {
      toggleFilters: () => void;
      onCategoryFilterChange: (e: Event) => void;
    };

    component.toggleFilters();
    fixture.detectChanges();

    component.onCategoryFilterChange({
      target: { value: 'cat-1' },
    } as unknown as Event);

    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParamsHandling: 'merge',
        queryParams: expect.objectContaining({ categoryId: 'cat-1', openFilters: 1 }),
      }),
    );
  });

  it('deve sincronizar query params ao mudar filtro de tipo', () => {
    const component = fixture.componentInstance as unknown as {
      toggleFilters: () => void;
      onTypeFilterChange: (e: Event) => void;
    };

    component.toggleFilters();
    fixture.detectChanges();

    component.onTypeFilterChange({
      target: { value: 'EXPENSE' },
    } as unknown as Event);

    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParamsHandling: 'merge',
        queryParams: expect.objectContaining({ type: 'EXPENSE', openFilters: 1 }),
      }),
    );
  });

  it('deve sincronizar openFilters=0 ao fechar filtros', () => {
    const component = fixture.componentInstance as unknown as { toggleFilters: () => void };
    component.toggleFilters();
    fixture.detectChanges();
    component.toggleFilters();

    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParamsHandling: 'merge',
        queryParams: expect.objectContaining({ openFilters: 0 }),
      }),
    );
  });

  it('deve registrar observer para scroll infinito quando lista renderiza', async () => {
    await new Promise<void>((resolve) => queueMicrotask(() => resolve()));
    fixture.detectChanges();

    const loadMoreEl = fixture.nativeElement.querySelector(
      '[data-testid="transactions-load-more"]',
    ) as HTMLElement | null;
    expect(loadMoreEl).toBeTruthy();
    expect(observeSpy).toHaveBeenCalledTimes(1);
    expect(observeSpy).toHaveBeenCalledWith(loadMoreEl);
  });

  it('deve limitar tzOffsetMinutes para -840 quando menor que o limite', () => {
    const api = TestBed.inject(ApiService) as unknown as {
      getTransactions: ReturnType<typeof vi.fn>;
    };

    queryParamMap$.next(
      convertToParamMap({
        periodPreset: 'TODAY',
        tzOffsetMinutes: '-1000',
        openFilters: '1',
      }),
    );
    fixture.detectChanges();

    const lastCall = api.getTransactions.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(lastCall).toMatchObject({
      tzOffsetMinutes: -840,
    });
  });

  it('deve limitar tzOffsetMinutes para 840 quando maior que o limite', () => {
    const api = TestBed.inject(ApiService) as unknown as {
      getTransactions: ReturnType<typeof vi.fn>;
    };

    queryParamMap$.next(
      convertToParamMap({
        periodPreset: 'TODAY',
        tzOffsetMinutes: '1000',
        openFilters: '1',
      }),
    );
    fixture.detectChanges();

    const lastCall = api.getTransactions.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(lastCall).toMatchObject({
      tzOffsetMinutes: 840,
    });
  });

  it('deve cair no filtro padrão se periodPreset=CUSTOM mas datas ausentes', () => {
    const component = fixture.componentInstance as unknown as {
      timeFilterSelection: () => TimeFilterSelectionDTO;
    };

    // Sem startDay nem endDay
    queryParamMap$.next(
      convertToParamMap({
        periodPreset: 'CUSTOM',
        openFilters: '1',
      }),
    );
    fixture.detectChanges();

    const selection = component.timeFilterSelection();
    if (selection.mode !== 'DAY_RANGE') {
      throw new Error('Expected DAY_RANGE mode');
    }
    expect(selection.period).toMatchObject({
      preset: 'THIS_MONTH',
    });
  });

  it('deve aceitar CUSTOM se ao menos uma data estiver presente (range implícito)', () => {
    const component = fixture.componentInstance as unknown as {
      timeFilterSelection: () => TimeFilterSelectionDTO;
    };

    queryParamMap$.next(
      convertToParamMap({
        periodPreset: 'CUSTOM',
        startDay: '2026-01-01',
        openFilters: '1',
      }),
    );
    fixture.detectChanges();

    const selection = component.timeFilterSelection();
    if (selection.mode !== 'DAY_RANGE') {
      throw new Error('Expected DAY_RANGE mode');
    }
    expect(selection.period).toMatchObject({
      preset: 'CUSTOM',
      startDay: '2026-01-01',
      endDay: '2026-01-01',
    });
  });
});
