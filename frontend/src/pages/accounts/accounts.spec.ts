import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, vi } from 'vitest';
import { AccountsPage } from './accounts.page';
import { AccountService } from '../../app/services/account.service';
import { AccountDTO } from '@dindinho/shared';

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
  });

  it('deve exibir estado vazio quando não há contas', async () => {
    const accountServiceMock = createAccountServiceMock({ accounts: [], loading: false });

    await TestBed.configureTestingModule({
      imports: [AccountsPage],
      providers: [{ provide: AccountService, useValue: accountServiceMock }],
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
      providers: [{ provide: AccountService, useValue: accountServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountsPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="accounts-grid"]')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="account-card-account-1"]'),
    ).toBeTruthy();
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
      providers: [{ provide: AccountService, useValue: accountServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountsPage);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="accounts-empty-state"]'),
    ).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="account-card-card-1"]')).toBeFalsy();
  });
});
