/**
 * Testes de unidade para o componente Dashboard.
 *
 * Este arquivo contém testes para garantir o funcionamento correto
 * do componente Dashboard, que exibe o painel principal do aplicativo
 * com informações financeiras e atalhos rápidos.
 *
 * @see {@link https://angular.io/guide/testing} Documentação oficial de testes do Angular
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { DashboardComponent } from './dashboard.page';
import { ApiService } from '../app/services/api.service';
import { AccountService } from '../app/services/account.service';
import { ApiResponseDTO, TransactionDTO, AccountDTO } from '@dindinho/shared';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { CreateAccountDialogComponent } from '../app/components/accounts/create-account-dialog.component';
import { signal } from '@angular/core';
import { AuthService, UserState } from '../app/services/auth.service';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  interface DashboardHarness {
    recentTransactions: { set: (v: TransactionDTO[]) => void };
    onTransactionUpdated: (t: TransactionDTO) => void;
    onTransactionsDeleted: (ids: string[]) => void;
  }
  let apiServiceMock: {
    getHello: ReturnType<typeof vi.fn>;
    getTransactions: ReturnType<typeof vi.fn>;
  };
  let accountServiceMock: {
    accounts: ReturnType<typeof vi.fn>;
    isLoading: ReturnType<typeof vi.fn>;
    totalBalance: ReturnType<typeof vi.fn>;
    loadAccounts: ReturnType<typeof vi.fn>;
  };
  let authServiceMock: { currentUser: ReturnType<typeof signal<UserState | null>> };

  /**
   * Configura o ambiente de teste antes de cada caso de teste.
   */
  beforeEach(async () => {
    const account: AccountDTO = {
      id: 'account-1',
      name: 'Conta Padrão',
      color: '#10b981',
      icon: 'pi-wallet',
      type: 'STANDARD',
      ownerId: 'user-1',
      balance: 100,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    const apiResponse: ApiResponseDTO = {
      message: 'ok',
      docs: 'docs',
      endpoints: {
        health: '/health',
        test_db: '/test-db',
      },
    };

    apiServiceMock = {
      getHello: vi.fn(() => of(apiResponse)),
      getTransactions: vi.fn(() => of({ items: [], nextCursorId: null })),
    };

    accountServiceMock = {
      accounts: vi.fn(() => [account]),
      isLoading: vi.fn(() => false),
      totalBalance: vi.fn(() => 100),
      loadAccounts: vi.fn(),
    };

    authServiceMock = {
      currentUser: signal<UserState | null>({
        id: 'user-1',
        name: 'Usuário',
        email: 'user@example.com',
        role: 'VIEWER',
      }),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        { provide: ApiService, useValue: apiServiceMock },
        { provide: AccountService, useValue: accountServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: MessageService, useValue: { add: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  /**
   * Testa se o componente é criado com sucesso.
   */
  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  /**
   * Testa se o título "Saldo Total" está sendo exibido corretamente.
   */
  it('deve exibir o título "Saldo Total"', () => {
    const titleElement = fixture.nativeElement.querySelector('[data-testid="balance-title"]');
    expect(titleElement).toBeTruthy();
    expect(titleElement.textContent).toContain('Saldo Total');
  });

  /**
   * Testa se os botões de receita e despesa estão sendo exibidos.
   */
  it('deve exibir os botões de receita e despesa', () => {
    const incomeButton = fixture.nativeElement.querySelector('[data-testid="income-button"]');
    const expenseButton = fixture.nativeElement.querySelector('[data-testid="expense-button"]');

    expect(incomeButton).toBeTruthy();
    expect(expenseButton).toBeTruthy();
    expect(incomeButton.textContent).toContain('Receita');
    expect(expenseButton.textContent).toContain('Despesa');
  });

  /**
   * Testa se os atalhos de navegação estão sendo exibidos corretamente.
   */
  it('deve exibir os atalhos de navegação', () => {
    const shortcutsSection = fixture.nativeElement.querySelector(
      '[data-testid="quick-links-section"]',
    );
    const textosEsperados = ['Contas', 'Cartões', 'Relatórios', 'Ajustes'];

    textosEsperados.forEach((texto) => {
      expect(shortcutsSection.textContent).toContain(texto);
    });
  });

  /**
   * Testa se a seção de transações recentes está sendo exibida.
   */
  it('deve exibir a seção de transações recentes', () => {
    const transactionsSection = fixture.nativeElement.querySelector(
      '[data-testid="transactions-section"]',
    );

    expect(transactionsSection).toBeTruthy();
    expect(transactionsSection.textContent).toContain('Últimas Transações');
    expect(transactionsSection.textContent).toContain('Nenhuma transação recente');
  });

  it('deve renderizar lista de últimas transações quando há dados', () => {
    const txs: TransactionDTO[] = [
      {
        id: 'tx-1',
        accountId: 'account-1',
        categoryId: null,
        amount: 10,
        description: 'Mercado',
        date: '2026-01-02T00:00:00.000Z',
        type: 'EXPENSE',
        isPaid: true,
        recurrenceId: null,
        installmentNumber: null,
        totalInstallments: null,
        createdAt: '2026-01-02T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
    ];

    apiServiceMock.getTransactions.mockReturnValueOnce(of({ items: txs, nextCursorId: null }));

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const list = fixture.nativeElement.querySelector('[data-testid="dashboard-transactions-list"]');
    expect(list).toBeTruthy();
    expect(list.textContent).toContain('Mercado');
  });

  it('deve atualizar transação na lista ao receber updated do drawer', () => {
    const tx: TransactionDTO = {
      id: 'tx-1',
      accountId: 'account-1',
      categoryId: null,
      amount: 10,
      description: 'Café',
      date: '2026-01-02T00:00:00.000Z',
      type: 'EXPENSE',
      isPaid: true,
      recurrenceId: null,
      installmentNumber: null,
      totalInstallments: null,
      createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    };

    const harness = component as unknown as DashboardHarness;
    harness.recentTransactions.set([tx]);
    fixture.detectChanges();

    harness.onTransactionUpdated({ ...tx, description: 'Mercado' });
    fixture.detectChanges();

    const list = fixture.nativeElement.querySelector('[data-testid="dashboard-transactions-list"]');
    expect(list).toBeTruthy();
    expect(list.textContent).toContain('Mercado');
  });

  it('deve remover transações da lista ao receber deleted do drawer', () => {
    const tx: TransactionDTO = {
      id: 'tx-1',
      accountId: 'account-1',
      categoryId: null,
      amount: 10,
      description: 'Café',
      date: '2026-01-02T00:00:00.000Z',
      type: 'EXPENSE',
      isPaid: true,
      recurrenceId: null,
      installmentNumber: null,
      totalInstallments: null,
      createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    };

    const harness = component as unknown as DashboardHarness;
    harness.recentTransactions.set([tx]);
    fixture.detectChanges();

    harness.onTransactionsDeleted([tx.id]);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="dashboard-transactions-list"]'),
    ).toBeFalsy();
  });

  it('não deve exibir o botão "Nova Conta" quando já há contas', () => {
    const button = fixture.nativeElement.querySelector(
      '[data-testid="dashboard-create-account-btn"]',
    );

    expect(button).toBeFalsy();
  });

  it('deve exibir o botão "Nova Conta" quando não há contas', () => {
    accountServiceMock.accounts.mockReturnValue([]);

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      '[data-testid="dashboard-create-account-btn"]',
    );

    expect(button).toBeTruthy();
    expect(button.textContent).toContain('Nova Conta');
  });

  it('deve exibir o botão "Novo Cartão"', () => {
    const button = fixture.nativeElement.querySelector(
      '[data-testid="dashboard-create-credit-card-btn"]',
    );

    expect(button).toBeTruthy();
    expect(button.textContent).toContain('Novo Cartão');
  });

  it('deve navegar para contas ao clicar em "Contas" nos atalhos', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const button = fixture.nativeElement.querySelector(
      '[data-testid="quick-link-accounts"]',
    ) as HTMLButtonElement;

    button.click();
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/accounts']);
  });

  it('deve navegar para cartões ao clicar em "Cartões" nos atalhos', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const button = fixture.nativeElement.querySelector(
      '[data-testid="quick-link-cards"]',
    ) as HTMLButtonElement;

    button.click();
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/cards']);
  });

  it('deve renderizar lista de contas quando há dados', () => {
    const list = fixture.nativeElement.querySelector('[data-testid="dashboard-account-list"]');
    const card = fixture.nativeElement.querySelector('[data-testid="account-card-account-1"]');

    expect(list).toBeTruthy();
    expect(card).toBeTruthy();
  });

  it('deve navegar para transações filtradas ao clicar em transações no card', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

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

    expect(router.navigate).toHaveBeenCalledWith(['/transactions'], {
      queryParams: { accountId: 'account-1', openFilters: 1 },
    });
  });

  it('deve abrir o diálogo em modo edição ao clicar em editar na conta', () => {
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
    const dialogInstance = dialogDe.componentInstance as CreateAccountDialogComponent;
    expect(dialogInstance.visible()).toBe(true);
    expect(dialogInstance.form.controls.name.value).toBe('Conta Padrão');
  });

  it('deve navegar para transações filtradas ao clicar em transações no cartão', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    accountServiceMock.accounts.mockReturnValue([
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
      {
        id: 'card-1',
        name: 'Cartão',
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

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
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

    expect(router.navigate).toHaveBeenCalledWith(['/transactions'], {
      queryParams: { accountId: 'card-1', openFilters: 1 },
    });
  });

  it('deve abrir o diálogo em modo edição ao clicar em editar no cartão', () => {
    accountServiceMock.accounts.mockReturnValue([
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
      {
        id: 'card-1',
        name: 'Cartão',
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

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
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

    const editButton: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      '[data-testid="account-edit-card-1"]',
    );
    expect(editButton).toBeTruthy();

    editButton!.click();
    fixture.detectChanges();

    const dialogDe = fixture.debugElement.query(By.directive(CreateAccountDialogComponent));
    const dialogInstance = dialogDe.componentInstance as CreateAccountDialogComponent;
    expect(dialogInstance.visible()).toBe(true);
    expect(dialogInstance.form.controls.name.value).toBe('Cartão');
  });

  it('deve exibir estado vazio para cartões quando não há cartões', () => {
    const empty = fixture.nativeElement.querySelector(
      '[data-testid="dashboard-credit-card-empty"]',
    );
    expect(empty).toBeTruthy();
  });

  it('deve exibir o card de status do backend', () => {
    const statusCard = fixture.nativeElement.querySelector('[data-testid="backend-status-card"]');

    expect(statusCard).toBeTruthy();
    expect(statusCard.textContent).toContain('Status do Backend');
  });

  it('deve navegar para nova transação ao clicar em "Nova Transação"', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const button = fixture.nativeElement.querySelector(
      '[data-testid="dashboard-new-transaction"]',
    ) as HTMLButtonElement;

    button.click();
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/transactions/new'], {
      queryParams: { openAmount: 1 },
    });
  });

  it('deve exibir acesso admin quando usuário é ADMIN', () => {
    authServiceMock.currentUser.set({
      id: 'admin-1',
      name: 'Admin',
      email: 'admin@example.com',
      role: 'ADMIN',
    });

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const section = fixture.nativeElement.querySelector('[data-testid="dashboard-admin-section"]');
    const button = fixture.nativeElement.querySelector('[data-testid="dashboard-admin-allowlist"]');

    expect(section).toBeTruthy();
    expect(button).toBeTruthy();
  });

  it('deve navegar para allowlist ao clicar no acesso admin', () => {
    authServiceMock.currentUser.set({
      id: 'admin-1',
      name: 'Admin',
      email: 'admin@example.com',
      role: 'ADMIN',
    });

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const button = fixture.nativeElement.querySelector(
      '[data-testid="dashboard-admin-allowlist"]',
    ) as HTMLButtonElement;

    button.click();
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/admin/allowlist']);
  });

  it('não deve exibir acesso admin quando usuário não é ADMIN', () => {
    authServiceMock.currentUser.set({
      id: 'user-1',
      name: 'Usuário',
      email: 'user@example.com',
      role: 'VIEWER',
    });

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const section = fixture.nativeElement.querySelector('[data-testid="dashboard-admin-section"]');

    expect(section).toBeFalsy();
  });
});
