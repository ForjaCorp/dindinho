import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { Component, signal } from '@angular/core';
import { describe, it, expect, beforeEach } from 'vitest';
import { AccountDTO } from '@dindinho/shared';
import { DashboardCreditCardsSectionComponent } from './dashboard-credit-cards-section.component';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

@Component({
  standalone: true,
  imports: [DashboardCreditCardsSectionComponent],
  template: `
    <app-dashboard-credit-cards-section
      [cards]="cards()"
      (create)="onCreate()"
      (openTransactions)="onOpenTransactions($event)"
      (edit)="onEdit($event)"
    />
  `,
})
class DashboardCreditCardsSectionHostComponent {
  readonly cards = signal<AccountDTO[]>([]);
  readonly created = signal(false);
  readonly openedCardId = signal<string | null>(null);
  readonly editedCardId = signal<string | null>(null);

  onCreate() {
    this.created.set(true);
  }

  onOpenTransactions(card: AccountDTO) {
    this.openedCardId.set(card.id);
  }

  onEdit(card: AccountDTO) {
    this.editedCardId.set(card.id);
  }
}

describe('DashboardCreditCardsSectionComponent', () => {
  let fixture: ComponentFixture<DashboardCreditCardsSectionHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardCreditCardsSectionHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardCreditCardsSectionHostComponent);
  });

  it('deve exibir estado vazio quando não há cartões', () => {
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="dashboard-credit-card-empty"]'),
    ).toBeTruthy();
  });

  it('deve renderizar lista quando há cartões', () => {
    fixture.componentInstance.cards.set([
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
    ]);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="dashboard-credit-card-list"]'),
    ).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="account-card-card-1"]')).toBeTruthy();
  });

  it('não deve exibir "Novo Cartão" quando já há cartões', () => {
    fixture.componentInstance.cards.set([
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
    ]);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="dashboard-create-credit-card-btn"]'),
    ).toBeFalsy();
  });

  it('deve emitir evento ao clicar em "Novo Cartão"', () => {
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector(
      '[data-testid="dashboard-create-credit-card-btn"]',
    ) as HTMLButtonElement;
    btn.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.created()).toBe(true);
  });

  it('deve emitir evento ao clicar em "Transações" no card', () => {
    fixture.componentInstance.cards.set([
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
    ]);
    fixture.detectChanges();

    const cardEl: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="account-card-card-1"]',
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
      '[data-testid="account-transactions-card-1"]',
    );
    expect(transactionsBtn).toBeTruthy();

    transactionsBtn!.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.openedCardId()).toBe('card-1');
  });

  it('deve emitir evento ao clicar em "Editar" no card', () => {
    fixture.componentInstance.cards.set([
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
    ]);
    fixture.detectChanges();

    const cardEl: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="account-card-card-1"]',
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

    const editBtn: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      '[data-testid="account-edit-card-1"]',
    );
    expect(editBtn).toBeTruthy();

    editBtn!.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.editedCardId()).toBe('card-1');
  });
});
