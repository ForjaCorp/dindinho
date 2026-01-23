import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { AccountCardComponent } from './account-card.component';
import { AccountDTO } from '@dindinho/shared';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

describe('AccountCardComponent', () => {
  let fixture: ComponentFixture<AccountCardComponent>;

  const standardAccount: AccountDTO = {
    id: 'account-1',
    name: 'Conta Padrão',
    color: '#10b981',
    icon: 'pi-wallet',
    type: 'STANDARD',
    ownerId: 'user-1',
    balance: 123.45,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const creditAccount: AccountDTO = {
    id: 'account-2',
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
      imports: [AccountCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountCardComponent);
  });

  it('deve renderizar conta padrão no modo full', () => {
    fixture.componentRef.setInput('account', standardAccount);
    fixture.componentRef.setInput('variant', 'full');
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('[data-testid="account-card-account-1"]');
    const type = fixture.nativeElement.querySelector('[data-testid="account-type-account-1"]');
    const name = fixture.nativeElement.querySelector('[data-testid="account-name-account-1"]');
    const value = fixture.nativeElement.querySelector('[data-testid="account-value-account-1"]');

    expect(card).toBeTruthy();
    expect(type).toBeTruthy();
    expect(type.textContent).toContain('Conta');
    expect(name).toBeTruthy();
    expect(name.textContent).toContain('Conta Padrão');
    expect(value).toBeTruthy();
    expect(value.textContent).toContain('R$');
  });

  it('deve exibir saldo negativo em vermelho para conta padrão', () => {
    fixture.componentRef.setInput('account', { ...standardAccount, balance: -118 });
    fixture.componentRef.setInput('variant', 'full');
    fixture.detectChanges();

    const value = fixture.nativeElement.querySelector(
      '[data-testid="account-value-account-1"]',
    ) as HTMLElement;

    expect(value).toBeTruthy();
    expect(value.className).toContain('text-rose-');
  });

  it('deve renderizar cartão de crédito no modo compact', () => {
    fixture.componentRef.setInput('account', creditAccount);
    fixture.componentRef.setInput('variant', 'compact');
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('[data-testid="account-card-account-2"]');
    const type = fixture.nativeElement.querySelector('[data-testid="account-type-account-2"]');
    const name = fixture.nativeElement.querySelector('[data-testid="account-name-account-2"]');
    const value = fixture.nativeElement.querySelector('[data-testid="account-value-account-2"]');
    const caption = fixture.nativeElement.querySelector(
      '[data-testid="account-caption-account-2"]',
    );

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
