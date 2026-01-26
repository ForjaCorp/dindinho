import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { Component, signal } from '@angular/core';
import { describe, it, expect, beforeEach } from 'vitest';
import { AccountDTO } from '@dindinho/shared';
import { DashboardAccountsSectionComponent } from './dashboard-accounts-section.component';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

@Component({
  standalone: true,
  imports: [DashboardAccountsSectionComponent],
  template: `
    <app-dashboard-accounts-section
      [accounts]="accounts()"
      (create)="onCreate()"
      (openTransactions)="onOpenTransactions($event)"
      (edit)="onEdit($event)"
    />
  `,
})
class DashboardAccountsSectionHostComponent {
  readonly accounts = signal<AccountDTO[]>([]);
  readonly created = signal(false);
  readonly openedAccountId = signal<string | null>(null);
  readonly editedAccountId = signal<string | null>(null);

  onCreate() {
    this.created.set(true);
  }

  onOpenTransactions(account: AccountDTO) {
    this.openedAccountId.set(account.id);
  }

  onEdit(account: AccountDTO) {
    this.editedAccountId.set(account.id);
  }
}

describe('DashboardAccountsSectionComponent', () => {
  let fixture: ComponentFixture<DashboardAccountsSectionHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardAccountsSectionHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardAccountsSectionHostComponent);
  });

  it('deve exibir estado vazio quando não há contas', () => {
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="dashboard-account-empty"]'),
    ).toBeTruthy();
  });

  it('deve renderizar lista quando há contas', () => {
    fixture.componentInstance.accounts.set([
      {
        id: 'account-1',
        name: 'Conta',
        color: '#10b981',
        icon: 'pi-wallet',
        type: 'STANDARD',
        ownerId: 'user-1',
        balance: 10,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="dashboard-account-list"]'),
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="account-card-account-1"]'),
    ).toBeTruthy();
  });

  it('não deve exibir "Nova Conta" quando já há contas', () => {
    fixture.componentInstance.accounts.set([
      {
        id: 'account-1',
        name: 'Conta',
        color: '#10b981',
        icon: 'pi-wallet',
        type: 'STANDARD',
        ownerId: 'user-1',
        balance: 10,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="dashboard-create-account-btn"]'),
    ).toBeFalsy();
  });

  it('deve emitir evento ao clicar em "Nova Conta"', () => {
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector(
      '[data-testid="dashboard-create-account-btn"]',
    ) as HTMLButtonElement;
    btn.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.created()).toBe(true);
  });

  it('deve emitir evento ao clicar em "Transações" no card', () => {
    fixture.componentInstance.accounts.set([
      {
        id: 'account-1',
        name: 'Conta',
        color: '#10b981',
        icon: 'pi-wallet',
        type: 'STANDARD',
        ownerId: 'user-1',
        balance: 10,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
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
    fixture.detectChanges();

    expect(fixture.componentInstance.openedAccountId()).toBe('account-1');
  });

  it('deve emitir evento ao clicar em "Editar" no card', () => {
    fixture.componentInstance.accounts.set([
      {
        id: 'account-1',
        name: 'Conta',
        color: '#10b981',
        icon: 'pi-wallet',
        type: 'STANDARD',
        ownerId: 'user-1',
        balance: 10,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
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

    const editBtn: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      '[data-testid="account-edit-account-1"]',
    );
    expect(editBtn).toBeTruthy();

    editBtn!.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.editedAccountId()).toBe('account-1');
  });
});
