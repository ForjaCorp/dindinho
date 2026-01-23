import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
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
        { provide: ApiService, useValue: apiServiceMock },
        { provide: AccountService, useValue: accountServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionsPage);
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

  it('deve navegar para nova transação ao acionar ação', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

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
