/** @vitest-environment jsdom */
import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { FormGroup } from '@angular/forms';
import { of } from 'rxjs';
import { CreateTransactionPage } from './create-transaction.page';
import { AccountService } from '../../app/services/account.service';
import { ApiService } from '../../app/services/api.service';
import { CategoryDTO, AccountDTO } from '@dindinho/shared';
import { MessageService } from 'primeng/api';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

describe('CreateTransactionPage', () => {
  let fixture: ComponentFixture<CreateTransactionPage>;

  const accounts: AccountDTO[] = [
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Conta Principal',
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

  const createAccountServiceMock = (opts: { accounts: AccountDTO[]; loading: boolean }) => ({
    accounts: vi.fn(() => opts.accounts),
    isLoading: vi.fn(() => opts.loading),
    loadAccounts: vi.fn(),
  });

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('deve renderizar a página', async () => {
    localStorage.clear();
    const accountServiceMock = createAccountServiceMock({ accounts, loading: false });
    const apiServiceMock = {
      createTransaction: vi.fn(() => of({})),
      getCategories: vi.fn(() => of(categories)),
      createCategory: vi.fn(() => of(categories[0])),
    };

    await TestBed.configureTestingModule({
      imports: [CreateTransactionPage],
      providers: [
        provideRouter([]),
        { provide: AccountService, useValue: accountServiceMock },
        { provide: ApiService, useValue: apiServiceMock },
        { provide: MessageService, useValue: { add: vi.fn() } },
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

    expect(fixture.nativeElement.querySelector('[data-testid="transaction-account"]')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="transaction-category"]'),
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="transaction-submit-btn"]'),
    ).toBeTruthy();
  });

  it('deve inicializar a conta a partir do query param accountId', async () => {
    localStorage.clear();

    const accountServiceMock = createAccountServiceMock({ accounts, loading: false });
    const apiServiceMock = {
      createTransaction: vi.fn(() => of({})),
      getCategories: vi.fn(() => of(categories)),
      createCategory: vi.fn(() => of(categories[0])),
    };

    await TestBed.configureTestingModule({
      imports: [CreateTransactionPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({ accountId: accounts[0].id }) },
          },
        },
        { provide: AccountService, useValue: accountServiceMock },
        { provide: ApiService, useValue: apiServiceMock },
        { provide: MessageService, useValue: { add: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateTransactionPage);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as { form: FormGroup };
    expect(component.form.controls['accountId']?.value).toBe(accounts[0].id);
  });

  it('deve enviar transação válida', async () => {
    localStorage.clear();
    const accountServiceMock = createAccountServiceMock({ accounts, loading: false });
    const apiServiceMock = {
      createTransaction: vi.fn(() => of({})),
      getCategories: vi.fn(() => of(categories)),
      createCategory: vi.fn(() => of(categories[0])),
    };

    await TestBed.configureTestingModule({
      imports: [CreateTransactionPage],
      providers: [
        provideRouter([]),
        { provide: AccountService, useValue: accountServiceMock },
        { provide: ApiService, useValue: apiServiceMock },
        { provide: MessageService, useValue: { add: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateTransactionPage);
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as { form: FormGroup };
    component.form.setValue({
      accountId: accounts[0].id,
      categoryId: categories[0].id,
      type: 'EXPENSE',
      date: '2026-01-01',
      amountExpression: '10 + 5',
      description: 'Café',
      isPaid: true,
      totalInstallments: 1,
      destinationAccountId: '',
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
      accountId: accounts[0].id,
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

  it('deve concluir o sheet de valor ao pressionar Enter', async () => {
    localStorage.clear();
    const accountServiceMock = createAccountServiceMock({ accounts, loading: false });
    const apiServiceMock = {
      createTransaction: vi.fn(() => of({})),
      getCategories: vi.fn(() => of(categories)),
      createCategory: vi.fn(() => of(categories[0])),
    };

    await TestBed.configureTestingModule({
      imports: [CreateTransactionPage],
      providers: [
        provideRouter([]),
        { provide: AccountService, useValue: accountServiceMock },
        { provide: ApiService, useValue: apiServiceMock },
        { provide: MessageService, useValue: { add: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateTransactionPage);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      form: FormGroup;
      openAmountSheet: () => void;
    };

    component.form.controls['amountExpression']?.setValue('');
    component.openAmountSheet();
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector(
      '[data-testid="amount-sheet-input"]',
    ) as HTMLInputElement;
    expect(input).toBeTruthy();

    input.value = '10+5';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();

    expect(component.form.controls['amountExpression']?.value).toBe('10+5');
    expect(fixture.nativeElement.querySelector('[data-testid="amount-sheet"]')).toBeFalsy();
  });
});
