import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, vi } from 'vitest';
import { WalletsPage } from './wallets.page';
import { WalletService } from '../../app/services/wallet.service';
import { WalletDTO } from '@dindinho/shared';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

describe('WalletsPage', () => {
  let fixture: ComponentFixture<WalletsPage>;

  const wallets: WalletDTO[] = [
    {
      id: 'wallet-1',
      name: 'Carteira Padrão',
      color: '#10b981',
      icon: 'pi-wallet',
      type: 'STANDARD',
      ownerId: 'user-1',
      balance: 100,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  const createWalletServiceMock = (opts: { wallets: WalletDTO[]; loading: boolean }) => ({
    wallets: vi.fn(() => opts.wallets),
    isLoading: vi.fn(() => opts.loading),
    loadWallets: vi.fn(),
  });

  it('deve exibir estado vazio quando não há carteiras', async () => {
    const walletServiceMock = createWalletServiceMock({ wallets: [], loading: false });

    await TestBed.configureTestingModule({
      imports: [WalletsPage],
      providers: [{ provide: WalletService, useValue: walletServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(WalletsPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="wallets-page"]')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="wallets-create-wallet-btn"]'),
    ).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="wallets-empty-state"]')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="wallets-empty-create-btn"]'),
    ).toBeTruthy();
  });

  it('deve renderizar cards quando há carteiras', async () => {
    const walletServiceMock = createWalletServiceMock({ wallets, loading: false });

    await TestBed.configureTestingModule({
      imports: [WalletsPage],
      providers: [{ provide: WalletService, useValue: walletServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(WalletsPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="wallets-grid"]')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="wallet-card-wallet-1"]'),
    ).toBeTruthy();
  });
});
