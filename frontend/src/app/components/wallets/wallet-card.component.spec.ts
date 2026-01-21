import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { WalletCardComponent } from './wallet-card.component';
import { WalletDTO } from '@dindinho/shared';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

describe('WalletCardComponent', () => {
  let fixture: ComponentFixture<WalletCardComponent>;

  const standardWallet: WalletDTO = {
    id: 'wallet-1',
    name: 'Carteira Padrão',
    color: '#10b981',
    icon: 'pi-wallet',
    type: 'STANDARD',
    ownerId: 'user-1',
    balance: 123.45,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const creditWallet: WalletDTO = {
    id: 'wallet-2',
    name: 'Cartão Nubank',
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
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WalletCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WalletCardComponent);
  });

  it('deve renderizar carteira padrão no modo full', () => {
    fixture.componentRef.setInput('wallet', standardWallet);
    fixture.componentRef.setInput('variant', 'full');
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('[data-testid="wallet-card-wallet-1"]');
    const type = fixture.nativeElement.querySelector('[data-testid="wallet-type-wallet-1"]');
    const name = fixture.nativeElement.querySelector('[data-testid="wallet-name-wallet-1"]');
    const value = fixture.nativeElement.querySelector('[data-testid="wallet-value-wallet-1"]');

    expect(card).toBeTruthy();
    expect(type).toBeTruthy();
    expect(type.textContent).toContain('Conta');
    expect(name).toBeTruthy();
    expect(name.textContent).toContain('Carteira Padrão');
    expect(value).toBeTruthy();
    expect(value.textContent).toContain('R$');
  });

  it('deve renderizar cartão de crédito no modo compact', () => {
    fixture.componentRef.setInput('wallet', creditWallet);
    fixture.componentRef.setInput('variant', 'compact');
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('[data-testid="wallet-card-wallet-2"]');
    const type = fixture.nativeElement.querySelector('[data-testid="wallet-type-wallet-2"]');
    const name = fixture.nativeElement.querySelector('[data-testid="wallet-name-wallet-2"]');
    const value = fixture.nativeElement.querySelector('[data-testid="wallet-value-wallet-2"]');
    const caption = fixture.nativeElement.querySelector('[data-testid="wallet-caption-wallet-2"]');

    expect(card).toBeTruthy();
    expect(type).toBeTruthy();
    expect(type.textContent).toContain('Crédito');
    expect(name).toBeTruthy();
    expect(name.textContent).toContain('Cartão Nubank');
    expect(value).toBeTruthy();
    expect(value.textContent).toContain('R$');
    expect(caption).toBeTruthy();
    expect(caption.textContent).toContain('Limite disponível');
  });
});
