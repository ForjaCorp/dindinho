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
import { TransactionDTO, AccountDTO } from '@dindinho/shared';

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
      accounts: vi.fn(() => [account]),
      loadAccounts: vi.fn(),
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
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionsPage);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  afterEach(() => {
    globalThis.IntersectionObserver = originalIntersectionObserver;
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
    expect(fixture.nativeElement.querySelector('[data-testid="transactions-empty"]')).toBeTruthy();
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

  it('deve exibir filtros de mês e ano ao abrir filtros avançados', () => {
    const component = fixture.componentInstance as unknown as { toggleFilters: () => void };
    component.toggleFilters();
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="transactions-month-year-picker"]'),
    ).toBeTruthy();
  });

  it('deve aplicar filtro de mês e ano ao carregar transações', () => {
    const api = TestBed.inject(ApiService) as unknown as {
      getTransactions: ReturnType<typeof vi.fn>;
    };

    const component = fixture.componentInstance as unknown as { toggleFilters: () => void };
    component.toggleFilters();
    fixture.detectChanges();

    (
      fixture.componentInstance as unknown as { monthYearControl: { setValue: (v: Date) => void } }
    ).monthYearControl.setValue(new Date(2026, 0, 1));
    fixture.detectChanges();

    const lastCall = api.getTransactions.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(lastCall).toMatchObject({
      limit: 30,
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-31T23:59:59.999Z',
    });
  });

  it('deve aplicar filtro de conta via query param', () => {
    const api = TestBed.inject(ApiService) as unknown as {
      getTransactions: ReturnType<typeof vi.fn>;
    };

    queryParamMap$.next(convertToParamMap({ accountId: 'account-1', openFilters: '1' }));
    fixture.detectChanges();

    const lastCall = api.getTransactions.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(lastCall).toMatchObject({ limit: 30, accountId: 'account-1' });

    expect(
      fixture.nativeElement.querySelector('[data-testid="transactions-filters"]'),
    ).toBeTruthy();
    const select = fixture.nativeElement.querySelector(
      '[data-testid="transactions-account-select"]',
    ) as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(select.value).toBe('account-1');
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
      onAccountFilterChange: (e: Event) => void;
    };

    component.toggleFilters();
    fixture.detectChanges();

    component.onAccountFilterChange({
      target: { value: 'account-1' },
    } as unknown as Event);

    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParamsHandling: 'merge',
        queryParams: expect.objectContaining({ accountId: 'account-1', openFilters: 1 }),
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
});
