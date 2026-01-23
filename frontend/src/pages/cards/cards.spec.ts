import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, vi } from 'vitest';
import { CardsPage } from './cards.page';
import { AccountService } from '../../app/services/account.service';
import { AccountDTO } from '@dindinho/shared';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

describe('CardsPage', () => {
  let fixture: ComponentFixture<CardsPage>;

  const cards: AccountDTO[] = [
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
  ];

  const createAccountServiceMock = (opts: { accounts: AccountDTO[]; loading: boolean }) => ({
    accounts: vi.fn(() => opts.accounts),
    isLoading: vi.fn(() => opts.loading),
    loadAccounts: vi.fn(),
  });

  it('deve exibir estado vazio quando não há cartões', async () => {
    const accountServiceMock = createAccountServiceMock({ accounts: [], loading: false });

    await TestBed.configureTestingModule({
      imports: [CardsPage],
      providers: [{ provide: AccountService, useValue: accountServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(CardsPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="cards-page"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="cards-create-btn"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="cards-empty-state"]')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="cards-empty-create-btn"]'),
    ).toBeTruthy();
  });

  it('deve renderizar cards quando há cartões', async () => {
    const accountServiceMock = createAccountServiceMock({ accounts: cards, loading: false });

    await TestBed.configureTestingModule({
      imports: [CardsPage],
      providers: [{ provide: AccountService, useValue: accountServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(CardsPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="cards-grid"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="account-card-card-1"]')).toBeTruthy();
  });

  it('não deve renderizar cartões quando há apenas contas', async () => {
    const accountServiceMock = createAccountServiceMock({
      accounts: [
        {
          id: 'account-1',
          name: 'Carteira',
          color: '#10b981',
          icon: 'pi-wallet',
          type: 'STANDARD',
          ownerId: 'user-1',
          balance: 100,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      loading: false,
    });

    await TestBed.configureTestingModule({
      imports: [CardsPage],
      providers: [{ provide: AccountService, useValue: accountServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(CardsPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="cards-empty-state"]')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="account-card-account-1"]'),
    ).toBeFalsy();
  });
});
