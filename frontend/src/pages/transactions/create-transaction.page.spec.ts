import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, vi } from 'vitest';
import { provideRouter, Router } from '@angular/router';
import { FormGroup } from '@angular/forms';
import { of } from 'rxjs';
import { CreateTransactionPage } from './create-transaction.page';
import { WalletService } from '../../app/services/wallet.service';
import { ApiService } from '../../app/services/api.service';
import { CategoryDTO, WalletDTO } from '@dindinho/shared';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

describe('CreateTransactionPage', () => {
  let fixture: ComponentFixture<CreateTransactionPage>;

  const wallets: WalletDTO[] = [
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Carteira Principal',
      color: '#10b981',
      icon: 'pi-wallet',
      type: 'STANDARD',
      ownerId: 'user-1',
      balance: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  const categories: CategoryDTO[] = [
    {
      id: '123e4567-e89b-12d3-a456-426614174099',
      name: 'Mercado',
      icon: 'pi-shopping-cart',
      parentId: null,
      userId: 'user-1',
    },
  ];

  const createWalletServiceMock = (opts: { wallets: WalletDTO[]; loading: boolean }) => ({
    wallets: vi.fn(() => opts.wallets),
    isLoading: vi.fn(() => opts.loading),
    loadWallets: vi.fn(),
  });

  it('deve renderizar a página', async () => {
    localStorage.clear();
    const walletServiceMock = createWalletServiceMock({ wallets, loading: false });
    const apiServiceMock = {
      createTransaction: vi.fn(() => of({})),
      getCategories: vi.fn(() => of(categories)),
      createCategory: vi.fn(() => of(categories[0])),
    };

    await TestBed.configureTestingModule({
      imports: [CreateTransactionPage],
      providers: [
        provideRouter([]),
        { provide: WalletService, useValue: walletServiceMock },
        { provide: ApiService, useValue: apiServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateTransactionPage);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="create-transaction-page"]'),
    ).toBeTruthy();

    const advanced = fixture.nativeElement.querySelector(
      '[data-testid="transaction-advanced"]',
    ) as HTMLElement;
    const description = fixture.nativeElement.querySelector(
      '[data-testid="transaction-description"]',
    ) as HTMLElement;
    expect(advanced).toBeTruthy();
    expect(description).toBeTruthy();
    expect(advanced.contains(description)).toBe(false);

    expect(fixture.nativeElement.querySelector('[data-testid="transaction-wallet"]')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="transaction-category"]'),
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="transaction-submit-btn"]'),
    ).toBeTruthy();
  });

  it('deve enviar transação válida', async () => {
    localStorage.clear();
    const walletServiceMock = createWalletServiceMock({ wallets, loading: false });
    const apiServiceMock = {
      createTransaction: vi.fn(() => of({})),
      getCategories: vi.fn(() => of(categories)),
      createCategory: vi.fn(() => of(categories[0])),
    };

    await TestBed.configureTestingModule({
      imports: [CreateTransactionPage],
      providers: [
        provideRouter([]),
        { provide: WalletService, useValue: walletServiceMock },
        { provide: ApiService, useValue: apiServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateTransactionPage);
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as { form: FormGroup };
    component.form.setValue({
      walletId: wallets[0].id,
      categoryId: categories[0].id,
      type: 'EXPENSE',
      date: '2026-01-01',
      amountExpression: '10 + 5',
      description: 'Café',
      isPaid: true,
      totalInstallments: 1,
      destinationWalletId: '',
      tagsText: 'mercado, casa',
      recurrenceEnabled: false,
      recurrenceFrequency: 'MONTHLY',
      recurrenceIntervalDays: null,
      recurrenceCount: 12,
      recurrenceForever: false,
      invoiceMonth: '',
    });
    fixture.detectChanges();

    const formEl = fixture.nativeElement.querySelector('[data-testid="create-transaction-form"]');
    formEl.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(apiServiceMock.createTransaction).toHaveBeenCalledTimes(1);
    expect(apiServiceMock.createTransaction).toHaveBeenCalledWith({
      walletId: wallets[0].id,
      categoryId: categories[0].id,
      amount: 15,
      description: 'Café',
      date: '2026-01-01T12:00:00.000Z',
      type: 'EXPENSE',
      isPaid: true,
      tags: ['mercado', 'casa'],
    });

    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });
});
