import { Component, ViewChild, signal } from '@angular/core';
import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { TransactionDrawerComponent } from './transaction-drawer.component';
import { ApiService } from '../services/api.service';
import { AccountService } from '../services/account.service';
import { CategoryDTO, TransactionDTO } from '@dindinho/shared';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

@Component({
  standalone: true,
  imports: [TransactionDrawerComponent],
  template: `
    <app-transaction-drawer
      (updated)="lastUpdated.set($event)"
      (deleted)="lastDeletedIds.set($event)"
    />
  `,
})
class TransactionDrawerHostComponent {
  @ViewChild(TransactionDrawerComponent)
  drawer!: TransactionDrawerComponent;

  readonly lastUpdated = signal<TransactionDTO | null>(null);
  readonly lastDeletedIds = signal<string[] | null>(null);
}

describe('TransactionDrawerComponent', () => {
  let fixture: ComponentFixture<TransactionDrawerHostComponent>;

  interface DrawerHarness {
    visible: () => boolean;
    onSave: () => void;
    form: {
      controls: {
        description: { setValue: (v: string) => void; markAsDirty: () => void };
      };
    };
  }

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
      imports: [TransactionDrawerHostComponent],
      providers: [
        { provide: ApiService, useValue: apiServiceMock },
        { provide: AccountService, useValue: accountServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionDrawerHostComponent);
    fixture.detectChanges();
  });

  it('deve abrir e carregar a transação ao chamar show()', () => {
    const host = fixture.componentInstance;
    host.drawer.show(tx.id);
    fixture.detectChanges();

    const drawer = host.drawer as unknown as DrawerHarness;

    expect(drawer.visible()).toBe(true);
    expect(fixture.nativeElement.querySelector('[data-testid="transaction-drawer"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Café');
  });

  it('deve salvar alterações e emitir updated', async () => {
    const host = fixture.componentInstance;
    host.drawer.show(tx.id);
    fixture.detectChanges();

    await new Promise<void>((resolve) => queueMicrotask(() => resolve()));
    fixture.detectChanges();

    const drawer = host.drawer as unknown as DrawerHarness;
    drawer.form.controls.description.setValue('Mercado');
    drawer.form.controls.description.markAsDirty();
    fixture.detectChanges();

    drawer.onSave();
    fixture.detectChanges();

    await new Promise<void>((resolve) => queueMicrotask(() => resolve()));
    fixture.detectChanges();

    expect(host.lastUpdated()?.description).toBe('Mercado');
  });

  it('deve excluir com escopo selecionado e emitir deleted', () => {
    const host = fixture.componentInstance;

    const recurringTx: TransactionDTO = {
      ...tx,
      id: 'tx-rec-1',
      recurrenceId: 'rec-1',
      installmentNumber: 2,
      totalInstallments: 3,
    };

    const api = TestBed.inject(ApiService) as unknown as {
      getTransactionById: ReturnType<typeof vi.fn>;
      deleteTransaction: ReturnType<typeof vi.fn>;
    };
    api.getTransactionById.mockReturnValueOnce(of(recurringTx));
    api.deleteTransaction.mockReturnValueOnce(of({ deletedIds: [recurringTx.id] }));

    host.drawer.show(recurringTx.id);
    fixture.detectChanges();

    const deleteBtnHost = fixture.nativeElement.querySelector(
      '[data-testid="transaction-delete-btn"]',
    ) as HTMLElement;
    const deleteBtn = (deleteBtnHost.querySelector('button') ?? deleteBtnHost) as HTMLElement;
    deleteBtn.click();
    fixture.detectChanges();

    const scopeAll = fixture.nativeElement.querySelector(
      '[data-testid="delete-scope-all"] input',
    ) as HTMLInputElement;
    scopeAll.click();
    fixture.detectChanges();

    const confirmHost = fixture.nativeElement.querySelector(
      '[data-testid="transaction-delete-confirm"]',
    ) as HTMLElement;
    const confirm = (confirmHost.querySelector('button') ?? confirmHost) as HTMLElement;
    confirm.click();
    fixture.detectChanges();

    expect(api.deleteTransaction).toHaveBeenCalledWith(recurringTx.id, 'ALL');
    expect(host.lastDeletedIds()).toEqual([recurringTx.id]);
  });

  it('deve salvar com escopo selecionado quando transação tem série', async () => {
    const host = fixture.componentInstance;

    const recurringTx: TransactionDTO = {
      ...tx,
      id: 'tx-rec-1',
      recurrenceId: 'rec-1',
      installmentNumber: 2,
      totalInstallments: 3,
    };

    const api = TestBed.inject(ApiService) as unknown as {
      getTransactionById: ReturnType<typeof vi.fn>;
      updateTransaction: ReturnType<typeof vi.fn>;
    };
    api.getTransactionById.mockReturnValueOnce(of(recurringTx));
    api.updateTransaction.mockReturnValueOnce(of({ ...recurringTx, description: 'Mercado' }));

    host.drawer.show(recurringTx.id);
    fixture.detectChanges();

    await new Promise<void>((resolve) => queueMicrotask(() => resolve()));
    fixture.detectChanges();

    const drawer = host.drawer as unknown as DrawerHarness;
    drawer.form.controls.description.setValue('Mercado');
    drawer.form.controls.description.markAsDirty();
    fixture.detectChanges();

    const scopeAll = fixture.nativeElement.querySelector(
      '[data-testid="update-scope-all"] input',
    ) as HTMLInputElement;
    scopeAll.click();
    fixture.detectChanges();

    drawer.onSave();
    fixture.detectChanges();

    await new Promise<void>((resolve) => queueMicrotask(() => resolve()));
    fixture.detectChanges();

    expect(api.updateTransaction).toHaveBeenCalledWith(
      recurringTx.id,
      expect.objectContaining({ description: 'Mercado' }),
      'ALL',
    );
  });
});
