import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, vi } from 'vitest';
import { AccountsPage } from './accounts.page';
import { AccountService } from '../../app/services/account.service';
import { AccountDTO } from '@dindinho/shared';
import { provideRouter, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { CreateAccountDialogComponent } from '../../app/components/accounts/create-account-dialog.component';
import { MessageService } from 'primeng/api';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

describe('AccountsPage', () => {
  let fixture: ComponentFixture<AccountsPage>;

  const accounts: AccountDTO[] = [
    {
      id: 'account-1',
      name: 'Conta Padrão',
      color: '#10b981',
      icon: 'pi-wallet',
      type: 'STANDARD',
      ownerId: 'user-1',
      balance: 100,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  const createAccountServiceMock = (opts: { accounts: AccountDTO[]; loading: boolean }) => ({
    accounts: vi.fn(() => opts.accounts),
    isLoading: vi.fn(() => opts.loading),
    loadAccounts: vi.fn(),
    clearError: vi.fn(),
    createAccount: vi.fn(),
    updateAccount: vi.fn(),
  });

  it('deve exibir estado vazio quando não há contas', async () => {
    const accountServiceMock = createAccountServiceMock({ accounts: [], loading: false });

    await TestBed.configureTestingModule({
      imports: [AccountsPage],
      providers: [
        { provide: AccountService, useValue: accountServiceMock },
        { provide: MessageService, useValue: { add: vi.fn() } },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountsPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="accounts-page"]')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="accounts-create-account-btn"]'),
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="accounts-empty-state"]'),
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="accounts-empty-create-btn"]'),
    ).toBeTruthy();
  });

  it('deve renderizar cards quando há contas', async () => {
    const accountServiceMock = createAccountServiceMock({ accounts, loading: false });

    await TestBed.configureTestingModule({
      imports: [AccountsPage],
      providers: [
        { provide: AccountService, useValue: accountServiceMock },
        { provide: MessageService, useValue: { add: vi.fn() } },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountsPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="accounts-grid"]')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="account-card-account-1"]'),
    ).toBeTruthy();
  });

  it('deve abrir o diálogo em modo edição ao clicar em editar', async () => {
    const accountServiceMock = createAccountServiceMock({ accounts, loading: false });

    await TestBed.configureTestingModule({
      imports: [AccountsPage],
      providers: [
        { provide: AccountService, useValue: accountServiceMock },
        { provide: MessageService, useValue: { add: vi.fn() } },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountsPage);
    fixture.detectChanges();

    const cardEl: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="account-card-account-1"]',
    );
    expect(cardEl).toBeTruthy();

    cardEl!.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 120,
        clientY: 120,
      }),
    );
    fixture.detectChanges();

    const editButton: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      '[data-testid="account-edit-account-1"]',
    );
    expect(editButton).toBeTruthy();

    editButton!.click();
    fixture.detectChanges();

    const dialogDe = fixture.debugElement.query(By.directive(CreateAccountDialogComponent));
    const dialog = dialogDe.componentInstance as CreateAccountDialogComponent;
    expect(dialog.visible()).toBe(true);
    expect(dialog.form.controls.name.value).toBe('Conta Padrão');
  });

  it('deve navegar para transações filtradas ao clicar em transações', async () => {
    const accountServiceMock = createAccountServiceMock({ accounts, loading: false });

    await TestBed.configureTestingModule({
      imports: [AccountsPage],
      providers: [
        { provide: AccountService, useValue: accountServiceMock },
        { provide: MessageService, useValue: { add: vi.fn() } },
        provideRouter([]),
      ],
    }).compileComponents();

    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    fixture = TestBed.createComponent(AccountsPage);
    fixture.detectChanges();

    const cardEl: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="account-card-account-1"]',
    );
    expect(cardEl).toBeTruthy();

    cardEl!.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 120,
        clientY: 120,
      }),
    );
    fixture.detectChanges();

    const transactionsBtn: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      '[data-testid="account-transactions-account-1"]',
    );
    expect(transactionsBtn).toBeTruthy();

    transactionsBtn!.click();
    expect(navigateSpy).toHaveBeenCalledWith(['/transactions'], {
      queryParams: { accountId: 'account-1', openFilters: 1 },
    });
  });

  it('não deve renderizar contas quando há apenas cartões', async () => {
    const accountServiceMock = createAccountServiceMock({
      accounts: [
        {
          id: 'card-1',
          name: 'Nubank',
          color: '#8A2BE2',
          icon: 'pi-credit-card',
          type: 'CREDIT',
          ownerId: 'user-1',
          balance: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          creditCardInfo: {
            closingDay: 10,
            dueDay: 15,
            limit: 5000,
            brand: 'Mastercard',
          },
        },
      ],
      loading: false,
    });

    await TestBed.configureTestingModule({
      imports: [AccountsPage],
      providers: [
        { provide: AccountService, useValue: accountServiceMock },
        { provide: MessageService, useValue: { add: vi.fn() } },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountsPage);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="accounts-empty-state"]'),
    ).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="account-card-card-1"]')).toBeFalsy();
  });
});
