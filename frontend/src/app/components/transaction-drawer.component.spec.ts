// @vitest-environment jsdom
import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { of } from 'rxjs';
import { By } from '@angular/platform-browser';
import { TransactionDrawerComponent } from './transaction-drawer.component';
import { ApiService } from '../services/api.service';
import { AccountService } from '../services/account.service';
import { CategoryDTO, TransactionDTO } from '@dindinho/shared';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

describe('TransactionDrawerComponent', () => {
  let component: TransactionDrawerComponent;
  let fixture: ComponentFixture<TransactionDrawerComponent>;

  const accountId = 'account-1';
  const tx: TransactionDTO = {
    id: 'tx-1',
    accountId,
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

  const categories: CategoryDTO[] = [
    {
      id: '123e4567-e89b-12d3-a456-426614174099',
      name: 'Outros',
      icon: 'pi-tag',
      parentId: null,
      userId: null,
    },
  ];

  beforeEach(async () => {
    TestBed.resetTestingModule();
    const apiServiceMock = {
      getCategories: vi.fn(() => of(categories)),
      getTransactionById: vi.fn(() => of(tx)),
      updateTransaction: vi.fn(() => of({ ...tx, description: 'Mercado' })),
      deleteTransaction: vi.fn(() => of({ deletedIds: [tx.id] })),
    };

    const accountServiceMock = {
      getAccountById: vi.fn(() => ({ id: accountId, name: 'Conta', type: 'STANDARD' })),
    };

    await TestBed.configureTestingModule({
      imports: [TransactionDrawerComponent],
      providers: [
        { provide: ApiService, useValue: apiServiceMock },
        { provide: AccountService, useValue: accountServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionDrawerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve abrir e carregar a transação ao chamar show()', async () => {
    component.show(tx.id);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const comp = component as unknown as { visible: () => boolean };
    expect(comp.visible()).toBe(true);
    const drawerEl = fixture.debugElement.query(By.css('[data-testid="transaction-drawer"]'));
    expect(drawerEl).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Café');
  });

  it('deve salvar alterações e emitir updated', async () => {
    const api = TestBed.inject(ApiService);
    const updateSpy = vi.spyOn(api, 'updateTransaction');

    let emitted: TransactionDTO | null = null;
    component.updated.subscribe((val: unknown) => (emitted = val as TransactionDTO));

    component.show(tx.id);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const comp = component as unknown as {
      form: {
        controls: { description: { setValue: (v: string) => void; markAsDirty: () => void } };
      };
      onSave: () => void;
    };
    comp.form.controls.description.setValue('Mercado');
    comp.form.controls.description.markAsDirty();
    fixture.detectChanges();

    comp.onSave();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(updateSpy).toHaveBeenCalled();
    expect((emitted as TransactionDTO | null)?.description).toBe('Mercado');
  });

  it('deve excluir com escopo selecionado e emitir deleted', async () => {
    const recurringTx: TransactionDTO = {
      ...tx,
      id: 'tx-rec-1',
      recurrenceId: 'rec-1',
      installmentNumber: 2,
      totalInstallments: 3,
    };

    const api = TestBed.inject(ApiService);
    const apiMock = api as unknown as {
      getTransactionById: { mockReturnValueOnce: (val: unknown) => void };
      deleteTransaction: { mockReturnValueOnce: (val: unknown) => void };
    };
    apiMock.getTransactionById.mockReturnValueOnce(of(recurringTx));
    apiMock.deleteTransaction.mockReturnValueOnce(of({ deletedIds: [recurringTx.id] }));

    let emittedIds: string[] | null = null;
    component.deleted.subscribe((val: string[]) => (emittedIds = val));

    component.show(recurringTx.id);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    // Clicar no botão de excluir para abrir o diálogo de confirmação
    const deleteBtn = fixture.debugElement.query(By.css('[data-testid="transaction-delete-btn"]'));
    deleteBtn.triggerEventHandler('onClick', null);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    // Selecionar escopo "ALL"
    // Usar document.querySelector como fallback caso o PrimeNG tenha movido o diálogo para o body
    const scopeAllEl = document.querySelector(
      '[data-testid="delete-scope-all"] input',
    ) as HTMLInputElement;
    if (scopeAllEl) {
      scopeAllEl.click();
    } else {
      const scopeAll = fixture.debugElement.query(By.css('[data-testid="delete-scope-all"] input'));
      scopeAll.nativeElement.click();
    }
    fixture.detectChanges();

    // Confirmar exclusão
    const confirmBtn = fixture.debugElement.query(
      By.css('[data-testid="transaction-delete-confirm"]'),
    );

    // Se não achou no debugElement, o triggerEventHandler não vai funcionar.
    // Vamos tentar achar o componente do p-button se estiver no body.
    if (confirmBtn) {
      confirmBtn.triggerEventHandler('onClick', null);
    } else {
      // Fallback para clique nativo se o componente não for achado pelo debugElement
      const nativeConfirm = document.querySelector(
        '[data-testid="transaction-delete-confirm"] button',
      ) as HTMLElement;
      nativeConfirm?.click();
    }
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.deleteTransaction).toHaveBeenCalledWith(recurringTx.id, 'ALL');
    expect(emittedIds).toEqual([recurringTx.id]);
  });

  it('deve salvar com escopo selecionado quando transação tem série', async () => {
    const recurringTx: TransactionDTO = {
      ...tx,
      id: 'tx-rec-1',
      recurrenceId: 'rec-1',
      installmentNumber: 2,
      totalInstallments: 3,
    };

    const api = TestBed.inject(ApiService);
    const apiMock = api as unknown as {
      getTransactionById: { mockReturnValueOnce: (val: unknown) => void };
      updateTransaction: { mockReturnValueOnce: (val: unknown) => void };
    };
    apiMock.getTransactionById.mockReturnValueOnce(of(recurringTx));
    apiMock.updateTransaction.mockReturnValueOnce(of({ ...recurringTx, description: 'Mercado' }));

    component.show(recurringTx.id);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const comp = component as unknown as {
      form: {
        controls: { description: { setValue: (v: string) => void; markAsDirty: () => void } };
      };
      onSave: () => void;
    };
    comp.form.controls.description.setValue('Mercado');
    comp.form.controls.description.markAsDirty();
    fixture.detectChanges();

    // Selecionar escopo "ALL" para atualização
    const scopeAll = fixture.debugElement.query(By.css('[data-testid="update-scope-all"] input'));
    scopeAll.nativeElement.click();
    fixture.detectChanges();

    comp.onSave();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.updateTransaction).toHaveBeenCalledWith(
      recurringTx.id,
      expect.objectContaining({ description: 'Mercado' }),
      'ALL',
    );
  });
});
