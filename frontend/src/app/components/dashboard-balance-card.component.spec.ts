import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { Component, signal } from '@angular/core';
import { describe, it, expect, beforeEach } from 'vitest';
import { DashboardBalanceCardComponent } from './dashboard-balance-card.component';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

@Component({
  standalone: true,
  imports: [DashboardBalanceCardComponent],
  template: `
    <app-dashboard-balance-card [totalBalance]="totalBalance()" (quickAdd)="onQuickAdd($event)" />
  `,
})
class DashboardBalanceCardHostComponent {
  readonly totalBalance = signal(123.45);
  readonly lastQuickAdd = signal<'INCOME' | 'EXPENSE' | null>(null);

  onQuickAdd(type: 'INCOME' | 'EXPENSE') {
    this.lastQuickAdd.set(type);
  }
}

describe('DashboardBalanceCardComponent', () => {
  let fixture: ComponentFixture<DashboardBalanceCardHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardBalanceCardHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardBalanceCardHostComponent);
    fixture.detectChanges();
  });

  it('deve renderizar o card com saldo total', () => {
    const card = fixture.nativeElement.querySelector('[data-testid="balance-card"]') as HTMLElement;
    const title = fixture.nativeElement.querySelector(
      '[data-testid="balance-title"]',
    ) as HTMLElement;

    expect(card).toBeTruthy();
    expect(title).toBeTruthy();
    expect(title.textContent).toContain('Saldo Total');
    expect(card.textContent).toContain('123');
  });

  it('deve emitir INCOME ao clicar em "Receita"', () => {
    const host = fixture.componentInstance;
    const incomeButtonHost = fixture.nativeElement.querySelector(
      '[data-testid="income-button"]',
    ) as HTMLElement;
    const target = (incomeButtonHost.querySelector('button') ?? incomeButtonHost) as HTMLElement;

    target.click();
    fixture.detectChanges();

    expect(host.lastQuickAdd()).toBe('INCOME');
  });

  it('deve emitir EXPENSE ao clicar em "Despesa"', () => {
    const host = fixture.componentInstance;
    const expenseButtonHost = fixture.nativeElement.querySelector(
      '[data-testid="expense-button"]',
    ) as HTMLElement;
    const target = (expenseButtonHost.querySelector('button') ?? expenseButtonHost) as HTMLElement;

    target.click();
    fixture.detectChanges();

    expect(host.lastQuickAdd()).toBe('EXPENSE');
  });
});
