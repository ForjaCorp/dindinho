import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DrawerModule } from 'primeng/drawer';
import { InputTextModule } from 'primeng/inputtext';
import {
  CategoryDTO,
  DeleteTransactionScopeDTO,
  TransactionDTO,
  UpdateTransactionDTO,
  UpdateTransactionScopeDTO,
  updateTransactionSchema,
} from '@dindinho/shared';
import { ApiService } from '../services/api.service';
import { AccountService } from '../services/account.service';

const toDateInputValue = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const dateInputToIso = (value: string) => {
  const [year, month, day] = value.split('-').map((v) => Number(v));
  const utc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return utc.toISOString();
};

interface DeleteScopeOption {
  label: string;
  value: DeleteTransactionScopeDTO;
  testId: string;
}

interface UpdateScopeOption {
  label: string;
  value: UpdateTransactionScopeDTO;
  testId: string;
}

@Component({
  selector: 'app-transaction-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DrawerModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    CurrencyPipe,
    DatePipe,
  ],
  host: {
    class: 'block',
  },
  template: `
    <p-drawer
      data-testid="transaction-drawer"
      [modal]="true"
      [(visible)]="visible"
      position="bottom"
      [style]="{ height: '92vh', maxHeight: '720px' }"
      [draggable]="false"
      [dismissible]="true"
      (onHide)="onHide()"
    >
      <ng-template pTemplate="header">
        <div class="flex flex-col gap-0.5 min-w-0">
          <span class="text-base font-bold text-slate-900">Transação</span>
          @if (tx()) {
            <span class="text-xs text-slate-500">{{ headerSubtitle() }}</span>
          }
        </div>
      </ng-template>

      <div class="flex flex-col gap-4">
        @if (loading()) {
          <div data-testid="transaction-drawer-loading" class="text-sm text-slate-500">
            Carregando...
          </div>
        } @else if (error()) {
          <div
            data-testid="transaction-drawer-error"
            class="rounded-xl bg-red-50 text-red-700 border border-red-100 px-3 py-2 text-sm"
          >
            {{ error() }}
          </div>
        } @else if (tx()) {
          <div
            class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-3"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <div class="text-sm font-semibold text-slate-900 truncate">
                  {{ title(tx()!) }}
                </div>
                <div class="text-xs text-slate-500 truncate">
                  {{ accountName(tx()!.accountId) }}
                </div>
              </div>

              <div class="flex flex-col items-end">
                <div class="text-sm font-bold" [class]="amountClass(tx()!)">
                  {{ signedAmount(tx()!) | currency: 'BRL' }}
                </div>
                <div class="text-xs text-slate-500">{{ typeLabel(tx()!) }}</div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div class="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                <div class="text-[11px] text-slate-500">Data</div>
                <div class="text-sm text-slate-800">{{ tx()!.date | date: 'dd/MM/yyyy' }}</div>
              </div>

              <div class="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                <div class="text-[11px] text-slate-500">Status</div>
                <div class="text-sm text-slate-800">{{ tx()!.isPaid ? 'Pago' : 'Pendente' }}</div>
              </div>
            </div>

            @if (seriesLabel()) {
              <div class="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                <div class="text-[11px] text-slate-500">Série</div>
                <div class="text-sm text-slate-800">{{ seriesLabel() }}</div>
              </div>
            }
          </div>

          <form
            data-testid="transaction-edit-form"
            [formGroup]="form"
            (ngSubmit)="onSave()"
            class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-4"
          >
            <div class="flex flex-col gap-2">
              <label for="date" class="text-sm font-medium text-slate-700">Data</label>
              <input
                data-testid="transaction-edit-date"
                id="date"
                type="date"
                class="h-11 rounded-xl border border-slate-200 px-3 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                formControlName="date"
              />
            </div>

            <div class="flex flex-col gap-2">
              <label for="categoryId" class="text-sm font-medium text-slate-700">Categoria</label>
              <select
                data-testid="transaction-edit-category"
                id="categoryId"
                class="h-11 rounded-xl border border-slate-200 px-3 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                formControlName="categoryId"
              >
                <option value="">Sem categoria</option>
                @for (c of sortedCategories(); track c.id) {
                  <option [value]="c.id">{{ c.name }}</option>
                }
              </select>
            </div>

            <div class="flex flex-col gap-2">
              <label for="description" class="text-sm font-medium text-slate-700">Descrição</label>
              <input
                data-testid="transaction-edit-description"
                pInputText
                id="description"
                type="text"
                class="w-full"
                formControlName="description"
                placeholder="Ex: Mercado, Uber, Salário"
              />
            </div>

            <label class="flex items-center gap-3 select-none">
              <input
                data-testid="transaction-edit-is-paid"
                type="checkbox"
                class="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                formControlName="isPaid"
              />
              <span class="text-sm text-slate-700">Pago</span>
            </label>

            @if (shouldShowUpdateScopeOptions()) {
              <div class="flex flex-col gap-2">
                <div class="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Aplicar alterações
                </div>
                <div class="flex flex-col gap-2">
                  @for (opt of updateScopeOptions; track opt.value) {
                    <label
                      class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
                      [attr.data-testid]="opt.testId"
                    >
                      <input
                        type="radio"
                        name="updateScope"
                        class="w-4 h-4"
                        [value]="opt.value"
                        [checked]="updateScope() === opt.value"
                        (change)="onUpdateScopeChange(opt.value)"
                      />
                      <span class="text-sm text-slate-800">{{ opt.label }}</span>
                    </label>
                  }
                </div>
              </div>
            }

            @if (saveError()) {
              <div
                data-testid="transaction-edit-error"
                class="rounded-xl bg-red-50 text-red-700 border border-red-100 px-3 py-2 text-sm"
              >
                {{ saveError() }}
              </div>
            }

            <div class="flex flex-row gap-3 justify-end">
              <p-button
                data-testid="transaction-delete-btn"
                type="button"
                label="Excluir"
                severity="danger"
                [outlined]="true"
                (onClick)="openDeleteDialog()"
              />
              <p-button
                data-testid="transaction-save-btn"
                type="submit"
                label="Salvar"
                icon="pi pi-check"
                [loading]="saving()"
                [disabled]="!canSave()"
              />
            </div>
          </form>
        }
      </div>
    </p-drawer>

    <p-dialog
      data-testid="transaction-delete-dialog"
      header="Confirmar exclusão"
      [modal]="true"
      [(visible)]="deleteDialogVisible"
      [style]="{ width: '95vw', maxWidth: '520px' }"
      [draggable]="false"
      [resizable]="false"
      (onHide)="deleteError.set(null)"
    >
      <div class="flex flex-col gap-4">
        <div class="text-sm text-slate-700">Deseja excluir esta transação?</div>

        @if (shouldShowScopeOptions()) {
          <div class="flex flex-col gap-2">
            <div class="text-xs font-semibold text-slate-600 uppercase tracking-wide">Escopo</div>
            <div class="flex flex-col gap-2">
              @for (opt of deleteScopeOptions; track opt.value) {
                <label
                  class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
                  [attr.data-testid]="opt.testId"
                >
                  <input
                    type="radio"
                    name="deleteScope"
                    class="w-4 h-4"
                    [value]="opt.value"
                    [checked]="deleteScope() === opt.value"
                    (change)="onDeleteScopeChange(opt.value)"
                  />
                  <span class="text-sm text-slate-800">{{ opt.label }}</span>
                </label>
              }
            </div>
          </div>
        }

        @if (deleteError()) {
          <div
            data-testid="transaction-delete-error"
            class="rounded-xl bg-red-50 text-red-700 border border-red-100 px-3 py-2 text-sm"
          >
            {{ deleteError() }}
          </div>
        }

        <div class="flex flex-row justify-end gap-3">
          <p-button
            data-testid="transaction-delete-cancel"
            type="button"
            label="Cancelar"
            severity="secondary"
            [text]="true"
            (onClick)="deleteDialogVisible.set(false)"
          />
          <p-button
            data-testid="transaction-delete-confirm"
            type="button"
            label="Excluir"
            icon="pi pi-trash"
            severity="danger"
            [loading]="deleting()"
            (onClick)="onConfirmDelete()"
          />
        </div>
      </div>
    </p-dialog>
  `,
})
export class TransactionDrawerComponent {
  private api = inject(ApiService);
  private accountService = inject(AccountService);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);

  readonly updated = output<TransactionDTO>();
  readonly deleted = output<string[]>();

  protected readonly visible = signal(false);
  private readonly transactionId = signal<string | null>(null);
  protected readonly tx = signal<TransactionDTO | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly categories = signal<CategoryDTO[]>([]);
  protected readonly categoriesLoading = signal(false);
  protected readonly sortedCategories = computed(() =>
    [...this.categories()].sort((a, b) => a.name.localeCompare(b.name)),
  );

  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);

  protected readonly updateScope = signal<UpdateTransactionScopeDTO>('ONE');

  protected readonly updateScopeOptions: UpdateScopeOption[] = [
    { label: 'Apenas esta', value: 'ONE', testId: 'update-scope-one' },
    {
      label: 'Esta e as próximas',
      value: 'THIS_AND_FOLLOWING',
      testId: 'update-scope-this-and-following',
    },
    { label: 'Todas', value: 'ALL', testId: 'update-scope-all' },
  ];

  protected readonly deleteDialogVisible = signal(false);
  protected readonly deleteScope = signal<DeleteTransactionScopeDTO>('ONE');
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  protected readonly deleteScopeOptions: DeleteScopeOption[] = [
    { label: 'Excluir apenas esta', value: 'ONE', testId: 'delete-scope-one' },
    {
      label: 'Excluir esta e todas após esta',
      value: 'THIS_AND_FOLLOWING',
      testId: 'delete-scope-this-and-following',
    },
    { label: 'Excluir todas', value: 'ALL', testId: 'delete-scope-all' },
  ];

  protected readonly form = this.fb.group({
    date: this.fb.nonNullable.control('', [Validators.required]),
    categoryId: this.fb.nonNullable.control(''),
    description: this.fb.nonNullable.control(''),
    isPaid: this.fb.nonNullable.control(true),
  });

  private readonly formSeq = signal(0);

  protected readonly canSave = computed(() => {
    this.formSeq();
    if (!this.tx()) return false;
    if (this.loading() || this.saving()) return false;
    if (this.form.invalid) return false;
    return this.form.dirty;
  });

  protected readonly seriesLabel = computed(() => {
    const t = this.tx();
    if (!t) return null;
    if (!t.recurrenceId) return null;
    if (typeof t.installmentNumber === 'number' && typeof t.totalInstallments === 'number') {
      return `Parcela ${t.installmentNumber}/${t.totalInstallments}`;
    }
    return 'Recorrente';
  });

  protected readonly headerSubtitle = computed(() => {
    const t = this.tx();
    if (!t) return '';
    const date = new Date(t.date);
    const dateText = isNaN(date.getTime()) ? '' : toDateInputValue(date);
    return `${this.typeLabel(t)} • ${dateText}`.trim();
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.formSeq.update((v) => v + 1);
    });

    this.form.statusChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.formSeq.update((v) => v + 1);
    });
  }

  show(id: string) {
    const normalized = typeof id === 'string' ? id.trim() : '';
    if (!normalized) return;

    this.visible.set(true);
    this.transactionId.set(normalized);
    this.error.set(null);
    this.saveError.set(null);
    this.deleteError.set(null);
    this.deleteDialogVisible.set(false);
    this.updateScope.set('ONE');

    this.loadCategories();
    this.loadTransaction(normalized);
  }

  protected onHide() {
    this.transactionId.set(null);
    this.tx.set(null);
    this.error.set(null);
    this.saveError.set(null);
    this.deleteError.set(null);
    this.deleteDialogVisible.set(false);
    this.updateScope.set('ONE');
    this.form.reset({ date: '', categoryId: '', description: '', isPaid: true });
    this.form.markAsPristine();
    this.formSeq.update((v) => v + 1);
  }

  private loadCategories() {
    if (this.categoriesLoading()) return;
    if (this.categories().length > 0) return;
    this.categoriesLoading.set(true);
    this.api
      .getCategories()
      .pipe(
        finalize(() => this.categoriesLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (cats) => this.categories.set(cats),
        error: () => this.categories.set([]),
      });
  }

  private loadTransaction(id: string) {
    if (this.loading()) return;
    this.loading.set(true);
    this.api
      .getTransactionById(id)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (t) => {
          this.tx.set(t);
          const d = new Date(t.date);
          this.form.reset(
            {
              date: isNaN(d.getTime()) ? '' : toDateInputValue(d),
              categoryId: t.categoryId ?? '',
              description: t.description ?? '',
              isPaid: t.isPaid,
            },
            { emitEvent: false },
          );
          this.form.markAsPristine();
          this.formSeq.update((v) => v + 1);
        },
        error: () => {
          this.tx.set(null);
          this.error.set('Erro ao carregar transação');
        },
      });
  }

  protected onSave() {
    if (!this.tx() || !this.transactionId() || !this.canSave()) return;

    const raw = this.form.getRawValue();
    const payload: UpdateTransactionDTO = {};

    if (this.form.controls.date.dirty) {
      payload.date = dateInputToIso(raw.date);
    }

    if (this.form.controls.categoryId.dirty) {
      payload.categoryId = raw.categoryId === '' ? null : raw.categoryId;
    }

    if (this.form.controls.description.dirty) {
      const trimmed = raw.description.trim();
      payload.description = trimmed.length > 0 ? trimmed : null;
    }

    if (this.form.controls.isPaid.dirty) {
      payload.isPaid = raw.isPaid;
    }

    try {
      updateTransactionSchema.parse(payload);
    } catch {
      this.saveError.set('Revise os campos');
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);
    const scope = this.shouldShowUpdateScopeOptions() ? this.updateScope() : undefined;
    this.api
      .updateTransaction(this.transactionId()!, payload, scope)
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (updated) => {
          this.tx.set(updated);
          const d = new Date(updated.date);
          this.form.reset(
            {
              date: isNaN(d.getTime()) ? '' : toDateInputValue(d),
              categoryId: updated.categoryId ?? '',
              description: updated.description ?? '',
              isPaid: updated.isPaid,
            },
            { emitEvent: false },
          );
          this.form.markAsPristine();
          this.formSeq.update((v) => v + 1);
          this.updated.emit(updated);
        },
        error: () => {
          this.saveError.set('Erro ao salvar');
        },
      });
  }

  protected shouldShowUpdateScopeOptions() {
    const t = this.tx();
    if (!t) return false;
    return typeof t.recurrenceId === 'string' && typeof t.installmentNumber === 'number';
  }

  protected onUpdateScopeChange(scope: UpdateTransactionScopeDTO) {
    this.updateScope.set(scope);
  }

  protected openDeleteDialog() {
    this.deleteError.set(null);
    this.deleteScope.set('ONE');
    this.deleteDialogVisible.set(true);
  }

  protected shouldShowScopeOptions() {
    const t = this.tx();
    if (!t) return false;
    return typeof t.recurrenceId === 'string' && typeof t.installmentNumber === 'number';
  }

  protected onDeleteScopeChange(scope: DeleteTransactionScopeDTO) {
    this.deleteScope.set(scope);
  }

  protected onConfirmDelete() {
    const id = this.transactionId();
    if (!id || this.deleting()) return;
    this.deleting.set(true);
    this.deleteError.set(null);

    this.api
      .deleteTransaction(id, this.deleteScope())
      .pipe(
        finalize(() => this.deleting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => {
          this.deleteDialogVisible.set(false);
          this.visible.set(false);
          this.deleted.emit(result.deletedIds);
          this.onHide();
        },
        error: () => {
          this.deleteError.set('Erro ao excluir');
        },
      });
  }

  protected accountName(accountId: string) {
    const a = this.accountService.getAccountById(accountId);
    return a?.name ?? 'Conta';
  }

  protected title(t: TransactionDTO) {
    const desc = typeof t.description === 'string' ? t.description.trim() : '';
    if (desc) return desc;
    if (t.type === 'INCOME') return 'Receita';
    if (t.type === 'EXPENSE') return 'Despesa';
    return 'Transferência';
  }

  protected typeLabel(t: TransactionDTO) {
    if (t.type === 'INCOME') return 'Receita';
    if (t.type === 'EXPENSE') return 'Despesa';
    return 'Transferência';
  }

  protected signedAmount(t: TransactionDTO) {
    if (t.type === 'INCOME') return Math.abs(t.amount);
    if (t.type === 'EXPENSE') return -Math.abs(t.amount);
    return t.amount;
  }

  protected amountClass(t: TransactionDTO) {
    if (t.type === 'INCOME') return 'text-emerald-600';
    if (t.type === 'EXPENSE') return 'text-rose-600';
    return t.amount >= 0 ? 'text-slate-800' : 'text-slate-800';
  }
}
