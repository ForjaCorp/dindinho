import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Component, signal } from '@angular/core';
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

  afterEach(() => {
    fixture.destroy();
  });

  it('deve aplicar focus ring inset para evitar corte da borda', () => {
    fixture.componentRef.setInput('account', standardAccount);
    fixture.componentRef.setInput('variant', 'full');
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector(
      '[data-testid="account-card-account-1"]',
    ) as HTMLElement;

    expect(card).toBeTruthy();
    expect(card.className).toContain('focus:ring-inset');
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

  it('não deve renderizar botão de transações no modo full', () => {
    fixture.componentRef.setInput('account', standardAccount);
    fixture.componentRef.setInput('variant', 'full');
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="account-transactions-account-1"]'),
    ).toBeFalsy();
  });

  it('não deve renderizar botão de 3 pontos', () => {
    fixture.componentRef.setInput('account', standardAccount);
    fixture.componentRef.setInput('variant', 'full');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[aria-label="Ações"]')).toBeFalsy();
  });
});

@Component({
  standalone: true,
  imports: [AccountCardComponent],
  template: `
    <app-account-card
      [account]="account()"
      variant="full"
      (edit)="onEdit($event)"
      (openTransactions)="onOpenTransactions($event)"
    />
  `,
})
class AccountCardHostComponent {
  readonly account = signal<AccountDTO>({
    id: 'account-1',
    name: 'Conta Padrão',
    color: '#10b981',
    icon: 'pi-wallet',
    type: 'STANDARD',
    ownerId: 'user-1',
    balance: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  });

  readonly edited = signal<AccountDTO | null>(null);
  readonly opened = signal<AccountDTO | null>(null);

  onEdit(a: AccountDTO) {
    this.edited.set(a);
  }

  onOpenTransactions(a: AccountDTO) {
    this.opened.set(a);
  }
}

@Component({
  standalone: true,
  imports: [AccountCardComponent],
  template: `
    <app-account-card
      [account]="accountA()"
      variant="compact"
      (openTransactions)="onOpenTransactions($event)"
    />
    <app-account-card
      [account]="accountB()"
      variant="compact"
      (openTransactions)="onOpenTransactions($event)"
    />
  `,
})
class AccountCardMultiHostComponent {
  readonly accountA = signal<AccountDTO>({
    id: 'account-a',
    name: 'Conta A',
    color: '#10b981',
    icon: 'pi-wallet',
    type: 'STANDARD',
    ownerId: 'user-1',
    balance: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  });

  readonly accountB = signal<AccountDTO>({
    id: 'account-b',
    name: 'Conta B',
    color: '#0ea5e9',
    icon: 'pi-wallet',
    type: 'STANDARD',
    ownerId: 'user-1',
    balance: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  });

  readonly openedIds = signal<string[]>([]);

  onOpenTransactions(a: AccountDTO) {
    this.openedIds.update((v) => [...v, a.id]);
  }
}

function createPointerEvent(
  type: string,
  init: Partial<PointerEventInit> & Record<string, unknown>,
) {
  if (typeof PointerEvent !== 'undefined') {
    return new PointerEvent(type, init as PointerEventInit);
  }

  const e = new Event(type, {
    bubbles: true,
    cancelable: true,
  }) as unknown as PointerEvent;

  for (const [k, v] of Object.entries(init)) {
    Object.defineProperty(e, k, {
      value: v,
      enumerable: true,
    });
  }

  return e;
}

describe('AccountCardComponent (outputs)', () => {
  let hostFixture: ComponentFixture<AccountCardHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountCardHostComponent],
    }).compileComponents();

    hostFixture = TestBed.createComponent(AccountCardHostComponent);
    hostFixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
    hostFixture.destroy();
  });

  it('deve emitir edit ao clicar em editar pelo menu', () => {
    const card = hostFixture.nativeElement.querySelector(
      '[data-testid="account-card-account-1"]',
    ) as HTMLElement;

    card.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 120,
        clientY: 120,
      }),
    );
    hostFixture.detectChanges();

    const btn = hostFixture.nativeElement.querySelector(
      '[data-testid="account-edit-account-1"]',
    ) as HTMLButtonElement;
    expect(btn).toBeTruthy();

    btn.click();
    hostFixture.detectChanges();

    expect(hostFixture.componentInstance.edited()?.id).toBe('account-1');
  });

  it('deve emitir openTransactions ao clicar em transações pelo menu', () => {
    const card = hostFixture.nativeElement.querySelector(
      '[data-testid="account-card-account-1"]',
    ) as HTMLElement;

    card.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 120,
        clientY: 120,
      }),
    );
    hostFixture.detectChanges();

    const btn = hostFixture.nativeElement.querySelector(
      '[data-testid="account-transactions-account-1"]',
    ) as HTMLButtonElement;
    expect(btn).toBeTruthy();

    btn.click();
    hostFixture.detectChanges();

    expect(hostFixture.componentInstance.opened()?.id).toBe('account-1');
  });

  it('deve abrir o menu ao clicar com o botão direito', () => {
    const card = hostFixture.nativeElement.querySelector(
      '[data-testid="account-card-account-1"]',
    ) as HTMLElement;

    card.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
      }),
    );
    hostFixture.detectChanges();

    expect(
      hostFixture.nativeElement.querySelector('[data-testid="account-transactions-account-1"]'),
    ).toBeTruthy();
    expect(
      hostFixture.nativeElement.querySelector('[data-testid="account-edit-account-1"]'),
    ).toBeTruthy();
    expect(hostFixture.componentInstance.opened()).toBeNull();
  });

  it('deve focar primeira ação ao abrir menu via teclado', async () => {
    const card = hostFixture.nativeElement.querySelector(
      '[data-testid="account-card-account-1"]',
    ) as HTMLElement;
    expect(card).toBeTruthy();

    card.focus();
    expect(document.activeElement).toBe(card);

    card.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    );
    hostFixture.detectChanges();

    await new Promise<void>((resolve) => queueMicrotask(() => resolve()));
    hostFixture.detectChanges();

    const firstAction = hostFixture.nativeElement.querySelector(
      '[data-testid="account-transactions-account-1"]',
    ) as HTMLButtonElement | null;
    expect(firstAction).toBeTruthy();
    expect(document.activeElement).toBe(firstAction);

    firstAction!.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      }),
    );
    hostFixture.detectChanges();

    expect(
      hostFixture.nativeElement.querySelector('[data-testid="account-transactions-account-1"]'),
    ).toBeFalsy();
    expect(document.activeElement).toBe(card);
  });

  it('deve fechar o menu ao clicar fora', () => {
    const card = hostFixture.nativeElement.querySelector(
      '[data-testid="account-card-account-1"]',
    ) as HTMLElement;

    card.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100,
      }),
    );
    hostFixture.detectChanges();

    expect(
      hostFixture.nativeElement.querySelector('[data-testid="account-edit-account-1"]'),
    ).toBeTruthy();

    document.dispatchEvent(
      createPointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        pointerId: 99,
        pointerType: 'mouse',
        clientX: 1,
        clientY: 1,
      }),
    );
    hostFixture.detectChanges();

    expect(
      hostFixture.nativeElement.querySelector('[data-testid="account-edit-account-1"]'),
    ).toBeFalsy();
  });

  it('deve abrir o menu no long-press e não emitir clique em seguida', () => {
    vi.useFakeTimers();

    const card = hostFixture.nativeElement.querySelector(
      '[data-testid="account-card-account-1"]',
    ) as HTMLElement;

    card.dispatchEvent(
      createPointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: 'touch',
        clientX: 10,
        clientY: 10,
      }),
    );

    vi.advanceTimersByTime(500);
    hostFixture.detectChanges();

    expect(
      hostFixture.nativeElement.querySelector('[data-testid="account-edit-account-1"]'),
    ).toBeTruthy();

    card.click();
    hostFixture.detectChanges();

    expect(hostFixture.componentInstance.opened()).toBeNull();
  });
});

describe('AccountCardComponent (menu único)', () => {
  let hostFixture: ComponentFixture<AccountCardMultiHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountCardMultiHostComponent],
    }).compileComponents();

    hostFixture = TestBed.createComponent(AccountCardMultiHostComponent);
    hostFixture.detectChanges();
  });

  afterEach(() => {
    hostFixture.destroy();
  });

  it('deve manter apenas um menu aberto por vez', () => {
    const cardA = hostFixture.nativeElement.querySelector(
      '[data-testid="account-card-account-a"]',
    ) as HTMLElement;
    const cardB = hostFixture.nativeElement.querySelector(
      '[data-testid="account-card-account-b"]',
    ) as HTMLElement;

    cardA.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100,
      }),
    );
    hostFixture.detectChanges();

    expect(
      hostFixture.nativeElement.querySelector('[data-testid="account-edit-account-a"]'),
    ).toBeTruthy();
    expect(
      hostFixture.nativeElement.querySelector('[data-testid="account-edit-account-b"]'),
    ).toBeFalsy();

    cardB.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 120,
        clientY: 120,
      }),
    );
    hostFixture.detectChanges();

    expect(
      hostFixture.nativeElement.querySelector('[data-testid="account-edit-account-a"]'),
    ).toBeFalsy();
    expect(
      hostFixture.nativeElement.querySelector('[data-testid="account-edit-account-b"]'),
    ).toBeTruthy();
  });
});
