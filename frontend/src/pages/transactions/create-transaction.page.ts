import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, CurrencyPipe, isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ApiService } from '../../app/services/api.service';
import { WalletService } from '../../app/services/wallet.service';
import {
  CategoryDTO,
  CreateCategoryDTO,
  CreateTransactionDTO,
  createCategorySchema,
  createTransactionSchema,
} from '@dindinho/shared';

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

type Operator = '+' | '-' | '*' | '/';

const normalizeAmountExpression = (input: string) =>
  input.trim().replaceAll(',', '.').replaceAll(/\s+/g, '');

const isDigit = (c: string) => c >= '0' && c <= '9';

const precedence = (op: Operator) => {
  if (op === '*' || op === '/') return 2;
  return 1;
};

const applyOperator = (op: Operator, b: number, a: number) => {
  if (op === '+') return a + b;
  if (op === '-') return a - b;
  if (op === '*') return a * b;
  if (op === '/') return a / b;
  return NaN;
};

const parseAmountExpression = (raw: string): { value: number } | { error: string } => {
  const input = normalizeAmountExpression(raw);
  if (input === '') return { error: 'Informe o valor' };

  const tokens: (number | Operator | '(' | ')')[] = [];
  let i = 0;
  while (i < input.length) {
    const c = input[i];

    if (c === '(' || c === ')') {
      tokens.push(c);
      i += 1;
      continue;
    }

    if (c === '+' || c === '-' || c === '*' || c === '/') {
      const op = c as Operator;
      const prev = tokens[tokens.length - 1];
      const isUnary =
        op === '-' &&
        (tokens.length === 0 ||
          prev === '(' ||
          prev === '+' ||
          prev === '-' ||
          prev === '*' ||
          prev === '/');

      if (isUnary) {
        tokens.push(0);
        tokens.push('-');
        i += 1;
        continue;
      }

      tokens.push(op);
      i += 1;
      continue;
    }

    if (isDigit(c) || c === '.') {
      let j = i;
      let dotCount = 0;
      while (j < input.length) {
        const cj = input[j];
        if (cj === '.') {
          dotCount += 1;
          if (dotCount > 1) break;
          j += 1;
          continue;
        }
        if (!isDigit(cj)) break;
        j += 1;
      }

      const slice = input.slice(i, j);
      if (slice === '.' || slice === '') return { error: 'Expressão inválida' };
      const num = Number(slice);
      if (!Number.isFinite(num)) return { error: 'Expressão inválida' };
      tokens.push(num);
      i = j;
      continue;
    }

    return { error: 'Use apenas números e + - * / ( )' };
  }

  const values: number[] = [];
  const ops: (Operator | '(')[] = [];

  const reduceOnce = (): { error: string } | null => {
    const op = ops.pop();
    if (!op || op === '(') return { error: 'Expressão inválida' };
    const b = values.pop();
    const a = values.pop();
    if (a === undefined || b === undefined) return { error: 'Expressão inválida' };
    const result = applyOperator(op, b, a);
    if (!Number.isFinite(result)) return { error: 'Expressão inválida' };
    values.push(result);
    return null;
  };

  for (const t of tokens) {
    if (typeof t === 'number') {
      values.push(t);
      continue;
    }
    if (t === '(') {
      ops.push('(');
      continue;
    }
    if (t === ')') {
      while (ops.length && ops[ops.length - 1] !== '(') {
        const err = reduceOnce();
        if (err) return err;
      }
      if (ops.pop() !== '(') return { error: 'Parênteses inválidos' };
      continue;
    }

    const op = t as Operator;
    while (ops.length && ops[ops.length - 1] !== '(') {
      const top = ops[ops.length - 1] as Operator;
      if (precedence(top) < precedence(op)) break;
      const err = reduceOnce();
      if (err) return err;
    }
    ops.push(op);
  }

  while (ops.length) {
    if (ops[ops.length - 1] === '(') return { error: 'Parênteses inválidos' };
    const err = reduceOnce();
    if (err) return err;
  }

  if (values.length !== 1) return { error: 'Expressão inválida' };
  const value = values[0];
  if (!Number.isFinite(value)) return { error: 'Expressão inválida' };
  const rounded = Math.round(value * 100) / 100;
  if (!(rounded > 0)) return { error: 'Valor deve ser positivo' };
  return { value: rounded };
};

const lastWalletStorageKey = 'dindinho:lastWalletId';

type AmountKey =
  | { id: string; label: string; kind: 'digit'; token?: string }
  | { id: string; label: string; kind: 'operator'; token: string }
  | { id: 'del' | 'c'; label: string; kind: 'action' };

const categoryIconOptions = [
  'pi-shopping-cart',
  'pi-car',
  'pi-home',
  'pi-briefcase',
  'pi-ticket',
  'pi-heart',
  'pi-bolt',
  'pi-wrench',
  'pi-mobile',
  'pi-desktop',
  'pi-gift',
  'pi-tag',
  'pi-book',
  'pi-globe',
  'pi-send',
  'pi-map-marker',
  'pi-wallet',
  'pi-credit-card',
  'pi-chart-line',
  'pi-star',
  'pi-shield',
  'pi-bell',
  'pi-camera',
  'pi-shopping-bag',
];

@Component({
  selector: 'app-create-transaction-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    CurrencyPipe,
  ],
  template: `
    <div data-testid="create-transaction-page" class="p-4">
      <div class="max-w-xl mx-auto flex flex-col gap-4">
        <form
          data-testid="create-transaction-form"
          [formGroup]="form"
          (ngSubmit)="onSubmit()"
          class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-4"
        >
          <div
            class="-m-4 mb-3 bg-linear-to-r from-emerald-500 to-teal-600 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden"
          >
            <div class="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>

            <div class="flex items-center justify-between gap-3">
              <span class="text-emerald-50 text-sm font-medium">Valor</span>
            </div>

            <button
              data-testid="transaction-amount-trigger"
              type="button"
              class="mt-3 h-12 w-full rounded-2xl bg-white/15 border border-white/20 px-4 flex items-center justify-between gap-3 focus:outline-none focus:ring-2 focus:ring-white/50"
              [attr.aria-haspopup]="'dialog'"
              [attr.aria-expanded]="amountSheetVisible()"
              [attr.aria-controls]="'amount-sheet'"
              aria-label="Informar valor"
              (click)="openAmountSheet()"
            >
              @if (!amountExpressionError() && amountPreview() !== null) {
                <div
                  data-testid="transaction-amount-preview"
                  class="text-white text-2xl font-bold tracking-tight tabular-nums"
                >
                  {{ amountPreview() | currency: 'BRL' }}
                </div>
              } @else {
                <div class="text-white/85 text-base font-semibold">Toque para informar</div>
              }
              <i class="pi pi-chevron-up text-white/80 pointer-events-none"></i>
            </button>

            @if (amountExpressionError()) {
              <div data-testid="transaction-amount-error" class="mt-2 text-xs text-red-100">
                {{ amountExpressionError() }}
              </div>
            }
          </div>

          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-slate-700" for="description">Título</label>
            <input
              data-testid="transaction-description"
              pInputText
              id="description"
              class="h-11 rounded-xl"
              formControlName="description"
              placeholder="Ex: Mercado, aluguel, Netflix"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-2">
              <span class="text-sm font-medium text-slate-700">Tipo</span>
              <div
                data-testid="transaction-type"
                class="grid grid-cols-3 gap-2"
                role="group"
                aria-label="Tipo de transação"
              >
                @for (o of typeOptions; track o.value) {
                  <button
                    type="button"
                    [attr.data-testid]="'transaction-type-' + o.value.toLowerCase()"
                    [attr.aria-pressed]="type() === o.value"
                    [class]="typeButtonClass(o.value)"
                    (click)="setType(o.value)"
                  >
                    <span class="sr-only">{{ o.label }}</span>
                    <i [class]="'pi ' + o.icon + ' text-lg sm:hidden'"></i>
                    <span class="hidden sm:inline">{{ o.label }}</span>
                  </button>
                }
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-slate-700" for="walletId">Carteira</label>
              <select
                data-testid="transaction-wallet"
                id="walletId"
                class="h-11 rounded-xl border border-slate-200 px-3 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                formControlName="walletId"
              >
                <option value="" disabled>Selecione uma carteira</option>
                @for (w of wallets(); track w.id) {
                  <option [value]="w.id">{{ w.name }}</option>
                }
              </select>
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <span class="text-sm font-medium text-slate-700">Data</span>
            <div data-testid="transaction-date-presets" class="grid grid-cols-3 gap-2">
              <button
                data-testid="transaction-date-today"
                type="button"
                [class]="
                  datePreset() === 'TODAY'
                    ? 'h-11 rounded-xl bg-emerald-600 text-white text-sm font-medium'
                    : 'h-11 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium'
                "
                (click)="setDatePreset('TODAY')"
              >
                Hoje
              </button>
              <button
                data-testid="transaction-date-yesterday"
                type="button"
                [class]="
                  datePreset() === 'YESTERDAY'
                    ? 'h-11 rounded-xl bg-emerald-600 text-white text-sm font-medium'
                    : 'h-11 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium'
                "
                (click)="setDatePreset('YESTERDAY')"
              >
                Ontem
              </button>
              <button
                data-testid="transaction-date-other"
                type="button"
                [class]="
                  datePreset() === 'OTHER'
                    ? 'h-11 rounded-xl bg-emerald-600 text-white text-sm font-medium'
                    : 'h-11 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium'
                "
                (click)="setDatePreset('OTHER')"
              >
                Outra
              </button>
            </div>
            @if (datePreset() === 'OTHER') {
              <input
                data-testid="transaction-date"
                id="date"
                type="date"
                class="h-11 rounded-xl border border-slate-200 px-3 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                formControlName="date"
              />
            }
          </div>

          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between gap-3">
              <label class="text-sm font-medium text-slate-700" for="categoryId">Categoria</label>
              <button
                data-testid="transaction-category-new"
                type="button"
                class="h-9 px-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50"
                (click)="openCreateCategoryDialog()"
              >
                <span class="sr-only">Nova categoria</span>
                <i class="pi pi-plus sm:hidden"></i>
                <span class="hidden sm:inline">Nova</span>
              </button>
            </div>
            <select
              data-testid="transaction-category"
              id="categoryId"
              class="h-11 rounded-xl border border-slate-200 px-3 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              formControlName="categoryId"
            >
              <option value="" disabled>Selecione uma categoria</option>
              @for (c of sortedCategories(); track c.id) {
                <option [value]="c.id">{{ c.name }}</option>
              }
            </select>
          </div>

          @if (type() === 'TRANSFER') {
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-slate-700" for="destinationWalletId"
                >Carteira de destino</label
              >
              <select
                data-testid="transaction-destination-wallet"
                id="destinationWalletId"
                class="h-11 rounded-xl border border-slate-200 px-3 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                formControlName="destinationWalletId"
              >
                <option value="" disabled>Selecione a carteira de destino</option>
                @for (w of destinationWalletOptions(); track w.id) {
                  <option [value]="w.id">{{ w.name }}</option>
                }
              </select>
            </div>
          }

          <details
            data-testid="transaction-advanced"
            class="rounded-2xl border border-slate-100 bg-white overflow-hidden"
          >
            <summary
              class="cursor-pointer select-none px-4 py-3 text-sm font-medium text-slate-700 flex items-center justify-between"
            >
              Mais opções
              <i class="pi pi-chevron-down text-slate-400"></i>
            </summary>

            <div class="px-4 pb-4 flex flex-col gap-4">
              @if (installmentsEnabled()) {
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-slate-700" for="installments"
                    >Parcelas</label
                  >
                  <input
                    data-testid="transaction-installments"
                    pInputText
                    id="installments"
                    type="number"
                    step="1"
                    inputmode="numeric"
                    class="h-11 rounded-xl"
                    formControlName="totalInstallments"
                  />
                </div>
              }

              <div class="flex flex-col gap-2">
                <label class="text-sm font-medium text-slate-700" for="tags">Tags</label>
                <input
                  data-testid="transaction-tags"
                  pInputText
                  id="tags"
                  class="h-11 rounded-xl"
                  formControlName="tagsText"
                  placeholder="Ex: mercado, casa"
                />
              </div>

              @if (invoiceMonthEnabled()) {
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-slate-700" for="invoiceMonth"
                    >Mês da fatura</label
                  >
                  <input
                    data-testid="transaction-invoice-month"
                    id="invoiceMonth"
                    type="month"
                    class="h-11 rounded-xl border border-slate-200 px-3 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    formControlName="invoiceMonth"
                  />
                </div>
              }

              @if (recurrenceAvailable()) {
                <div
                  class="rounded-2xl border border-slate-100 bg-slate-50 p-3 flex flex-col gap-3"
                >
                  <label class="flex items-center gap-3 select-none">
                    <input
                      data-testid="transaction-recurrence-enabled"
                      type="checkbox"
                      class="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                      formControlName="recurrenceEnabled"
                    />
                    <span class="text-sm text-slate-700">Repetir</span>
                  </label>

                  @if (form.controls.recurrenceEnabled.value) {
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div class="flex flex-col gap-2">
                        <label class="text-sm font-medium text-slate-700" for="recurrenceFrequency"
                          >Frequência</label
                        >
                        <select
                          data-testid="transaction-recurrence-frequency"
                          id="recurrenceFrequency"
                          class="h-11 rounded-xl border border-slate-200 px-3 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                          formControlName="recurrenceFrequency"
                        >
                          <option value="MONTHLY">Mensal</option>
                          <option value="WEEKLY">Semanal</option>
                          <option value="YEARLY">Anual</option>
                          <option value="CUSTOM">Personalizada</option>
                        </select>
                      </div>

                      <div class="flex flex-col gap-2">
                        <label class="text-sm font-medium text-slate-700" for="recurrenceCount"
                          >Quantidade</label
                        >
                        <input
                          data-testid="transaction-recurrence-count"
                          pInputText
                          id="recurrenceCount"
                          type="number"
                          step="1"
                          inputmode="numeric"
                          class="h-11 rounded-xl"
                          formControlName="recurrenceCount"
                          [disabled]="form.controls.recurrenceForever.value"
                        />
                      </div>
                    </div>

                    <label class="flex items-center gap-3 select-none">
                      <input
                        data-testid="transaction-recurrence-forever"
                        type="checkbox"
                        class="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                        formControlName="recurrenceForever"
                      />
                      <span class="text-sm text-slate-700">Para sempre</span>
                    </label>

                    @if (form.controls.recurrenceFrequency.value === 'CUSTOM') {
                      <div class="flex flex-col gap-2">
                        <label
                          class="text-sm font-medium text-slate-700"
                          for="recurrenceIntervalDays"
                          >Intervalo (dias)</label
                        >
                        <input
                          data-testid="transaction-recurrence-interval"
                          pInputText
                          id="recurrenceIntervalDays"
                          type="number"
                          step="1"
                          inputmode="numeric"
                          class="h-11 rounded-xl"
                          formControlName="recurrenceIntervalDays"
                        />
                      </div>
                    }
                  }
                </div>
              }

              @if (isPaidVisible()) {
                <label class="flex items-center gap-3 select-none">
                  <input
                    data-testid="transaction-is-paid"
                    type="checkbox"
                    class="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                    formControlName="isPaid"
                  />
                  <span class="text-sm text-slate-700">{{ isPaidLabel() }}</span>
                </label>
              }
            </div>
          </details>

          @if (error()) {
            <div
              data-testid="transaction-error"
              class="rounded-xl bg-red-50 text-red-700 border border-red-100 px-3 py-2 text-sm"
            >
              {{ error() }}
            </div>
          }

          <div data-testid="transaction-actions" class="grid grid-cols-2 gap-3 w-full">
            <p-button
              data-testid="transaction-cancel-btn"
              type="button"
              label="Cancelar"
              severity="secondary"
              [outlined]="true"
              (onClick)="onCancel()"
              styleClass="w-full"
            />
            <p-button
              data-testid="transaction-submit-btn"
              type="submit"
              label="Salvar"
              icon="pi pi-check"
              [loading]="isLoading()"
              [disabled]="isLoading() || walletsLoading()"
              styleClass="w-full"
            />
          </div>
        </form>

        @if (amountSheetVisible()) {
          <button
            data-testid="amount-sheet-overlay"
            type="button"
            aria-label="Fechar"
            class="fixed inset-0 z-70 bg-black/30"
            (click)="closeAmountSheet()"
          ></button>
          <div
            data-testid="amount-sheet"
            id="amount-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Informar valor"
            class="fixed inset-x-0 bottom-0 z-71 bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 pb-safe"
          >
            <div class="max-w-xl mx-auto p-4 flex flex-col gap-3">
              <div class="flex items-center justify-between gap-3">
                <div class="flex flex-col min-w-0">
                  <div class="text-sm font-medium text-slate-700">Valor</div>
                  @if (amountDraftPreview() !== null) {
                    <div
                      data-testid="amount-sheet-preview"
                      class="text-2xl font-bold text-slate-900 tracking-tight tabular-nums"
                    >
                      {{ amountDraftPreview() | currency: 'BRL' }}
                    </div>
                  } @else {
                    <div class="text-sm text-slate-500">Digite um valor ou expressão</div>
                  }
                </div>
              </div>

              <input
                data-testid="amount-sheet-input"
                pInputText
                inputmode="decimal"
                class="h-12 rounded-2xl w-full text-right text-xl font-semibold tracking-tight"
                placeholder="Ex: 10+5"
                [value]="amountDraft()"
                (input)="onAmountDraftInput($event)"
                (keydown)="onAmountSheetKeydown($event)"
                aria-label="Valor"
              />

              @if (amountDraftError()) {
                <div data-testid="amount-sheet-error" class="text-sm text-red-600">
                  {{ amountDraftError() }}
                </div>
              } @else if (amountDraftLiveError()) {
                <div class="text-sm text-slate-500">{{ amountDraftLiveError() }}</div>
              }

              <div data-testid="amount-sheet-keypad" class="grid grid-cols-4 gap-2">
                @for (k of amountKeypadKeys; track k.id) {
                  <button
                    data-testid="amount-sheet-key"
                    type="button"
                    [attr.aria-label]="amountKeyAriaLabel(k)"
                    [class]="
                      k.kind === 'action'
                        ? 'h-12 rounded-2xl bg-slate-100 text-slate-800 text-sm font-semibold active:scale-[0.99] transition'
                        : k.kind === 'operator'
                          ? 'h-12 rounded-2xl bg-emerald-50 text-emerald-700 text-sm font-semibold active:scale-[0.99] transition'
                          : 'h-12 rounded-2xl bg-white border border-slate-200 text-slate-900 text-lg font-semibold active:scale-[0.99] transition'
                    "
                    (click)="onAmountKeypadPress(k)"
                  >
                    {{ k.label }}
                  </button>
                }
              </div>

              <div class="grid grid-cols-2 gap-3">
                <button
                  data-testid="amount-sheet-cancel"
                  type="button"
                  class="h-12 rounded-2xl border border-slate-200 text-slate-700 text-base font-semibold"
                  (click)="closeAmountSheet()"
                >
                  Cancelar
                </button>

                <button
                  data-testid="amount-sheet-confirm"
                  type="button"
                  class="h-12 rounded-2xl bg-emerald-600 text-white text-base font-semibold flex items-center justify-center gap-2"
                  (click)="confirmAmountSheet()"
                >
                  <i class="pi pi-check"></i>
                  Concluir
                </button>
              </div>
            </div>
          </div>
        }

        <p-dialog
          data-testid="create-category-dialog"
          header="Nova categoria"
          [modal]="true"
          [(visible)]="createCategoryDialogVisible"
          [style]="{ width: '95vw', maxWidth: '520px', maxHeight: '90vh' }"
          [draggable]="false"
          [resizable]="false"
          (onHide)="resetCreateCategoryForm()"
        >
          <form
            data-testid="create-category-form"
            [formGroup]="createCategoryForm"
            (ngSubmit)="onCreateCategorySubmit()"
            class="flex flex-col gap-4 mt-2 max-h-[70vh] overflow-y-auto overflow-x-hidden px-1"
          >
            <div class="flex flex-col gap-2">
              <label for="categoryName" class="font-medium text-slate-700 text-sm">Nome</label>
              <input
                data-testid="create-category-name"
                pInputText
                id="categoryName"
                formControlName="name"
                placeholder="Ex: Mercado"
                class="w-full"
              />
            </div>

            <div class="flex flex-col gap-2">
              <span class="font-medium text-slate-700 text-sm">Ícone</span>
              <div data-testid="create-category-icons" class="grid grid-cols-6 gap-2">
                @for (icon of categoryIconOptions; track icon) {
                  <button
                    data-testid="create-category-icon"
                    type="button"
                    [attr.aria-label]="icon"
                    [class]="
                      createCategoryForm.controls.icon.value === icon
                        ? 'h-11 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-700 flex items-center justify-center'
                        : 'h-11 rounded-xl border border-slate-200 bg-white text-slate-700 flex items-center justify-center'
                    "
                    (click)="selectCategoryIcon(icon)"
                  >
                    <i [class]="'pi ' + icon"></i>
                  </button>
                }
              </div>
            </div>

            @if (createCategoryError()) {
              <div
                data-testid="create-category-error"
                class="rounded-xl bg-red-50 text-red-700 border border-red-100 px-3 py-2 text-sm"
              >
                {{ createCategoryError() }}
              </div>
            }

            <div class="flex flex-row justify-end gap-3 mt-2 sticky bottom-0 bg-white pt-2">
              <p-button
                data-testid="create-category-cancel"
                label="Cancelar"
                [text]="true"
                type="button"
                severity="secondary"
                (onClick)="createCategoryDialogVisible.set(false)"
              />
              <p-button
                data-testid="create-category-submit"
                label="Criar"
                type="submit"
                icon="pi pi-check"
                [loading]="createCategoryLoading()"
                [disabled]="createCategoryForm.invalid"
              />
            </div>
          </form>
        </p-dialog>
      </div>
    </div>
  `,
})
export class CreateTransactionPage {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private walletService = inject(WalletService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);
  private host = inject(ElementRef<HTMLElement>);

  protected readonly wallets = this.walletService.wallets;
  protected readonly walletsLoading = this.walletService.isLoading;

  protected readonly categories = signal<CategoryDTO[]>([]);
  protected readonly categoriesLoading = signal(false);
  protected readonly createCategoryLoading = signal(false);
  protected readonly createCategoryError = signal<string | null>(null);
  protected readonly createCategoryDialogVisible = signal(false);

  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly type = signal<'INCOME' | 'EXPENSE' | 'TRANSFER'>('EXPENSE');
  protected readonly walletId = signal<string>('');
  protected readonly destinationWalletId = signal<string>('');
  protected readonly categoryId = signal<string>('');

  protected readonly amountPreview = signal<number | null>(null);
  protected readonly amountExpressionError = signal<string | null>(null);
  protected readonly amountSheetVisible = signal(false);
  protected readonly amountDraft = signal('');
  protected readonly amountDraftError = signal<string | null>(null);

  protected readonly datePreset = signal<'TODAY' | 'YESTERDAY' | 'OTHER'>('TODAY');

  protected readonly typeOptions = [
    { label: 'Receita', value: 'INCOME' as const, icon: 'pi-arrow-up' },
    { label: 'Despesa', value: 'EXPENSE' as const, icon: 'pi-arrow-down' },
    { label: 'Transf.', value: 'TRANSFER' as const, icon: 'pi-arrow-right-arrow-left' },
  ];

  protected typeButtonClass(value: 'INCOME' | 'EXPENSE' | 'TRANSFER') {
    const isSelected = this.type() === value;
    const base =
      'h-11 rounded-xl border text-sm font-semibold shadow-sm flex items-center justify-center gap-2';

    if (!isSelected) {
      return `${base} bg-white border-slate-200 text-slate-700 hover:bg-slate-50`;
    }

    const palette =
      value === 'INCOME'
        ? 'bg-emerald-600 border-emerald-600 text-white'
        : value === 'EXPENSE'
          ? 'bg-rose-600 border-rose-600 text-white'
          : 'bg-sky-600 border-sky-600 text-white';

    return `${base} ${palette}`;
  }

  protected setType(value: 'INCOME' | 'EXPENSE' | 'TRANSFER') {
    this.form.controls.type.setValue(value);
    this.form.controls.type.markAsDirty();
  }

  protected readonly amountDraftPreview = computed(() => {
    if (normalizeAmountExpression(this.amountDraft()) === '') return null;
    const r = parseAmountExpression(this.amountDraft());
    return 'value' in r ? r.value : null;
  });

  protected readonly amountDraftLiveError = computed(() => {
    if (normalizeAmountExpression(this.amountDraft()) === '') return null;
    const r = parseAmountExpression(this.amountDraft());
    return 'error' in r ? r.error : null;
  });

  protected readonly amountKeypadKeys: AmountKey[] = [
    { id: '7', label: '7', kind: 'digit' },
    { id: '8', label: '8', kind: 'digit' },
    { id: '9', label: '9', kind: 'digit' },
    { id: 'del', label: '⌫', kind: 'action' },
    { id: '4', label: '4', kind: 'digit' },
    { id: '5', label: '5', kind: 'digit' },
    { id: '6', label: '6', kind: 'digit' },
    { id: '/', label: '÷', kind: 'operator', token: '/' },
    { id: '1', label: '1', kind: 'digit' },
    { id: '2', label: '2', kind: 'digit' },
    { id: '3', label: '3', kind: 'digit' },
    { id: '*', label: '×', kind: 'operator', token: '*' },
    { id: '0', label: '0', kind: 'digit' },
    { id: '.', label: ',', kind: 'digit', token: ',' },
    { id: '-', label: '-', kind: 'operator', token: '-' },
    { id: '+', label: '+', kind: 'operator', token: '+' },
    { id: '(', label: '(', kind: 'operator', token: '(' },
    { id: ')', label: ')', kind: 'operator', token: ')' },
    { id: '00', label: '00', kind: 'digit' },
    { id: 'c', label: 'C', kind: 'action' },
  ];

  protected readonly categoryIconOptions = categoryIconOptions;
  protected readonly sortedCategories = computed(() =>
    [...this.categories()].sort((a, b) => a.name.localeCompare(b.name)),
  );

  protected readonly selectedWallet = computed(
    () => this.wallets().find((w) => w.id === this.walletId()) ?? null,
  );
  protected readonly selectedDestinationWallet = computed(
    () => this.wallets().find((w) => w.id === this.destinationWalletId()) ?? null,
  );
  protected readonly destinationWalletOptions = computed(() => {
    const originId = this.walletId();
    return this.wallets().filter((w) => w.id !== originId);
  });

  protected readonly recurrenceAvailable = computed(() => {
    if (this.type() === 'TRANSFER') return false;
    const wallet = this.selectedWallet();
    if (!wallet) return false;
    return wallet.type !== 'CREDIT';
  });

  protected readonly installmentsEnabled = computed(() => {
    if (this.type() !== 'EXPENSE') return false;
    return this.selectedWallet()?.type === 'CREDIT';
  });

  protected readonly invoiceMonthEnabled = computed(() => {
    const origin = this.selectedWallet();
    if (origin?.type === 'CREDIT') return true;
    if (this.type() === 'TRANSFER' && this.selectedDestinationWallet()?.type === 'CREDIT')
      return true;
    return false;
  });

  protected readonly isPaidVisible = computed(() => {
    if (this.type() === 'TRANSFER') return this.selectedDestinationWallet()?.type === 'CREDIT';
    const wallet = this.selectedWallet();
    if (!wallet) return false;
    return wallet.type !== 'CREDIT';
  });

  protected readonly isPaidLabel = computed(() => {
    if (this.type() === 'TRANSFER') return 'Pagar fatura';
    return 'Marcar como paga';
  });

  protected readonly form = this.fb.group({
    walletId: this.fb.nonNullable.control('', [Validators.required]),
    categoryId: this.fb.nonNullable.control('', [Validators.required]),
    type: this.fb.nonNullable.control<'INCOME' | 'EXPENSE' | 'TRANSFER'>('EXPENSE', [
      Validators.required,
    ]),
    date: this.fb.nonNullable.control(toDateInputValue(new Date()), [Validators.required]),
    amountExpression: this.fb.nonNullable.control('', [Validators.required]),
    description: this.fb.nonNullable.control<string>(''),
    isPaid: this.fb.nonNullable.control(true),
    totalInstallments: this.fb.nonNullable.control<number>(1, [Validators.min(1)]),
    destinationWalletId: this.fb.nonNullable.control<string>(''),
    tagsText: this.fb.nonNullable.control<string>(''),
    recurrenceEnabled: this.fb.nonNullable.control(false),
    recurrenceFrequency: this.fb.nonNullable.control<'MONTHLY' | 'WEEKLY' | 'YEARLY' | 'CUSTOM'>(
      'MONTHLY',
      [Validators.required],
    ),
    recurrenceIntervalDays: this.fb.control<number | null>(null, [Validators.min(1)]),
    recurrenceCount: this.fb.control<number | null>(12, [Validators.min(1)]),
    recurrenceForever: this.fb.nonNullable.control(false),
    invoiceMonth: this.fb.nonNullable.control<string>(''),
  });

  protected readonly createCategoryForm = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required]),
    icon: this.fb.nonNullable.control('', [Validators.required]),
  });

  constructor() {
    const queryType = this.route.snapshot.queryParamMap.get('type');
    if (queryType === 'INCOME' || queryType === 'EXPENSE' || queryType === 'TRANSFER') {
      this.form.controls.type.setValue(queryType, { emitEvent: false });
      this.type.set(queryType);
    }

    const queryWalletId = this.route.snapshot.queryParamMap.get('walletId');
    if (typeof queryWalletId === 'string' && queryWalletId.length > 0) {
      this.form.controls.walletId.setValue(queryWalletId, { emitEvent: false });
      this.walletId.set(queryWalletId);
    } else {
      try {
        const last = localStorage.getItem(lastWalletStorageKey);
        if (typeof last === 'string' && last.length > 0) {
          this.form.controls.walletId.setValue(last, { emitEvent: false });
          this.walletId.set(last);
        }
      } catch {
        void 0;
      }
    }

    if (this.wallets().length === 0) {
      this.walletService.loadWallets();
    }

    this.loadCategories();

    this.syncDatePresetFromValue(this.form.controls.date.value);
    this.syncInstallmentsControl();
    this.syncTransferControl(this.form.controls.type.value);
    this.syncRecurrenceControls();
    this.syncIsPaidControl();

    this.form.controls.type.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        this.type.set(v);
        this.applyDefaultCategoryIfNeeded();
        this.syncInstallmentsControl();
        this.syncTransferControl(v);
        this.syncRecurrenceControls();
        this.syncIsPaidControl();
      });

    this.form.controls.walletId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        this.walletId.set(v);
        try {
          if (typeof v === 'string' && v.length > 0) {
            localStorage.setItem(lastWalletStorageKey, v);
          }
        } catch {
          void 0;
        }
        this.syncInstallmentsControl();
        this.syncRecurrenceControls();
        this.syncIsPaidControl();
      });

    this.categoryId.set(this.form.controls.categoryId.value);
    this.form.controls.categoryId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        this.categoryId.set(v);
      });

    this.form.controls.destinationWalletId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        this.destinationWalletId.set(v);
        this.syncIsPaidControl();
      });

    this.form.controls.recurrenceEnabled.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.syncRecurrenceControls();
      });

    this.form.controls.recurrenceFrequency.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.syncRecurrenceControls();
      });

    this.form.controls.recurrenceForever.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        if (v) {
          this.form.controls.recurrenceCount.setValue(null, { emitEvent: false });
        } else if (this.form.controls.recurrenceCount.value === null) {
          this.form.controls.recurrenceCount.setValue(12, { emitEvent: false });
        }
      });

    this.form.controls.amountExpression.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        if (normalizeAmountExpression(v) === '') {
          this.amountExpressionError.set(null);
          this.amountPreview.set(null);
          return;
        }

        const r = parseAmountExpression(v);
        if ('error' in r) {
          this.amountExpressionError.set(r.error);
          this.amountPreview.set(null);
          return;
        }

        this.amountExpressionError.set(null);
        this.amountPreview.set(r.value);
      });

    this.form.controls.date.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        this.syncDatePresetFromValue(v);
      });

    const openAmount = this.route.snapshot.queryParamMap.get('openAmount');
    if (openAmount === '1' || openAmount === 'true') {
      queueMicrotask(() => this.openAmountSheet());
    }
  }

  private loadCategories() {
    if (this.categoriesLoading()) return;
    this.categoriesLoading.set(true);
    this.api
      .getCategories()
      .pipe(
        finalize(() => this.categoriesLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (cats) => {
          this.categories.set(cats);
          this.applyDefaultCategoryIfNeeded();
        },
        error: () => {
          this.categories.set([]);
        },
      });
  }

  private applyDefaultCategoryIfNeeded() {
    const control = this.form.controls.categoryId;
    if (control.dirty) return;
    if (control.value !== '') return;

    const name = this.type() === 'INCOME' ? 'Salário' : 'Outros';
    const match = this.categories().find((c) => c.name === name);
    if (!match) return;

    control.setValue(match.id, { emitEvent: false });
    this.categoryId.set(match.id);
  }

  protected openAmountSheet() {
    this.amountDraftError.set(null);
    this.amountDraft.set(this.form.controls.amountExpression.value);
    this.amountSheetVisible.set(true);

    this.focusAmountInputIfDesktop();
  }

  private focusAmountInputIfDesktop() {
    if (!isPlatformBrowser(this.platformId as object)) return;
    const coarse = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
    if (coarse) return;

    setTimeout(() => {
      const input = this.host.nativeElement.querySelector(
        '[data-testid="amount-sheet-input"]',
      ) as HTMLInputElement | null;
      input?.focus();
      input?.select?.();
    }, 0);
  }

  protected closeAmountSheet() {
    this.amountDraftError.set(null);
    this.amountSheetVisible.set(false);
  }

  protected onAmountDraftInput(event: Event) {
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    this.amountDraftError.set(null);
    this.amountDraft.set(value);
  }

  protected onAmountSheetKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      this.confirmAmountSheet();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.closeAmountSheet();
    }
  }

  protected amountKeyAriaLabel(key: AmountKey): string {
    if (key.kind === 'action') {
      if (key.id === 'del') return 'Apagar último caractere';
      if (key.id === 'c') return 'Limpar';
      return key.label;
    }

    if (key.kind === 'operator') {
      if (key.token === '+') return 'Somar';
      if (key.token === '-') return 'Subtrair';
      if (key.token === '*') return 'Multiplicar';
      if (key.token === '/') return 'Dividir';
      if (key.token === '(') return 'Abrir parênteses';
      if (key.token === ')') return 'Fechar parênteses';
      return key.label;
    }

    return key.label;
  }

  protected onAmountKeypadPress(key: AmountKey) {
    if (key.kind === 'action') {
      if (key.id === 'del') {
        const current = this.amountDraft();
        this.amountDraftError.set(null);
        this.amountDraft.set(current.slice(0, -1));
        return;
      }
      if (key.id === 'c') {
        this.amountDraftError.set(null);
        this.amountDraft.set('');
      }
      return;
    }

    const token = key.kind === 'operator' ? key.token : (key.token ?? key.label);
    const current = this.amountDraft();
    const normalized = current.trimEnd();
    const last = normalized.length ? normalized[normalized.length - 1] : '';

    const isOp = (c: string) => c === '+' || c === '-' || c === '*' || c === '/';
    const isTokenOp = token === '+' || token === '-' || token === '*' || token === '/';

    if (isTokenOp && isOp(last)) {
      this.amountDraftError.set(null);
      this.amountDraft.set(normalized.slice(0, -1) + token);
      return;
    }

    this.amountDraftError.set(null);
    this.amountDraft.set(current + token);
  }

  protected confirmAmountSheet() {
    const r = parseAmountExpression(this.amountDraft());
    if ('error' in r) {
      this.amountDraftError.set(r.error);
      return;
    }

    this.form.controls.amountExpression.setValue(this.amountDraft());
    this.form.controls.amountExpression.markAsDirty();
    this.amountSheetVisible.set(false);
    this.amountDraftError.set(null);
  }

  private syncInstallmentsControl() {
    const control = this.form.controls.totalInstallments;

    if (this.installmentsEnabled()) {
      control.enable({ emitEvent: false });
      if (!Number.isFinite(control.value) || control.value < 1) {
        control.setValue(1, { emitEvent: false });
      }
      return;
    }

    control.setValue(1, { emitEvent: false });
    control.disable({ emitEvent: false });
  }

  private syncTransferControl(type: 'INCOME' | 'EXPENSE' | 'TRANSFER') {
    const dest = this.form.controls.destinationWalletId;
    if (type === 'TRANSFER') {
      dest.setValidators([Validators.required]);
      dest.updateValueAndValidity({ emitEvent: false });
      return;
    }

    dest.clearValidators();
    dest.setValue('', { emitEvent: false });
    dest.updateValueAndValidity({ emitEvent: false });
  }

  private syncIsPaidControl() {
    const control = this.form.controls.isPaid;
    if (this.isPaidVisible()) {
      if (control.disabled) {
        control.setValue(true, { emitEvent: false });
        control.enable({ emitEvent: false });
      }
      return;
    }

    control.setValue(false, { emitEvent: false });
    control.disable({ emitEvent: false });
  }

  private syncRecurrenceControls() {
    const enabled = this.form.controls.recurrenceEnabled;
    const freq = this.form.controls.recurrenceFrequency;
    const count = this.form.controls.recurrenceCount;
    const forever = this.form.controls.recurrenceForever;
    const interval = this.form.controls.recurrenceIntervalDays;

    if (!this.recurrenceAvailable()) {
      enabled.setValue(false, { emitEvent: false });
      freq.setValue('MONTHLY', { emitEvent: false });
      count.setValue(12, { emitEvent: false });
      forever.setValue(false, { emitEvent: false });
      interval.setValue(null, { emitEvent: false });
      interval.clearValidators();
      interval.updateValueAndValidity({ emitEvent: false });
      return;
    }

    if (!enabled.value) {
      interval.clearValidators();
      interval.updateValueAndValidity({ emitEvent: false });
      return;
    }

    if (freq.value === 'CUSTOM') {
      interval.setValidators([Validators.required, Validators.min(1)]);
    } else {
      interval.clearValidators();
      interval.setValue(null, { emitEvent: false });
    }
    interval.updateValueAndValidity({ emitEvent: false });

    if (forever.value) {
      count.setValue(null, { emitEvent: false });
    } else if (count.value === null || count.value < 1) {
      count.setValue(12, { emitEvent: false });
    }
  }

  protected openCreateCategoryDialog() {
    this.createCategoryError.set(null);
    this.createCategoryDialogVisible.set(true);
  }

  protected resetCreateCategoryForm() {
    this.createCategoryError.set(null);
    this.createCategoryForm.reset({ name: '', icon: '' });
  }

  protected selectCategoryIcon(icon: string) {
    this.createCategoryForm.controls.icon.setValue(icon);
  }

  protected onCreateCategorySubmit() {
    if (this.createCategoryForm.invalid || this.createCategoryLoading()) return;
    const raw = this.createCategoryForm.getRawValue();
    const payload: CreateCategoryDTO = {
      name: raw.name.trim(),
      icon: raw.icon.trim(),
      parentId: null,
    };

    try {
      createCategorySchema.parse(payload);
    } catch {
      this.createCategoryError.set('Revise os campos');
      return;
    }

    this.createCategoryLoading.set(true);
    this.api
      .createCategory(payload)
      .pipe(
        finalize(() => this.createCategoryLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (created) => {
          this.categories.update((prev) => [created, ...prev]);
          this.form.controls.categoryId.setValue(created.id);
          this.resetCreateCategoryForm();
          this.createCategoryDialogVisible.set(false);
        },
        error: () => {
          this.createCategoryError.set('Erro ao criar categoria');
        },
      });
  }

  protected setDatePreset(preset: 'TODAY' | 'YESTERDAY' | 'OTHER') {
    this.datePreset.set(preset);
    if (preset === 'OTHER') return;

    const now = new Date();
    const date = preset === 'TODAY' ? now : new Date(now.getTime() - 24 * 60 * 60 * 1000);
    this.form.controls.date.setValue(toDateInputValue(date), { emitEvent: false });
  }

  private syncDatePresetFromValue(value: string) {
    const today = toDateInputValue(new Date());
    const yesterday = toDateInputValue(new Date(Date.now() - 24 * 60 * 60 * 1000));
    if (value === today) {
      this.datePreset.set('TODAY');
      return;
    }
    if (value === yesterday) {
      this.datePreset.set('YESTERDAY');
      return;
    }
    this.datePreset.set('OTHER');
  }

  private getFallbackDescription(type: 'INCOME' | 'EXPENSE' | 'TRANSFER', categoryId: string) {
    if (type === 'TRANSFER') return 'Transferência';
    const cat = this.categories().find((c) => c.id === categoryId);
    if (cat) return cat.name;
    return type === 'INCOME' ? 'Receita' : 'Despesa';
  }

  protected onCancel() {
    this.router.navigate(['/dashboard']);
  }

  protected onSubmit() {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Revise os campos obrigatórios');
      return;
    }

    const raw = this.form.getRawValue();
    const wallets = this.wallets();
    if (wallets.length === 0) {
      this.error.set('Crie uma carteira antes de lançar uma transação');
      return;
    }

    const amountResult = parseAmountExpression(raw.amountExpression);
    if ('error' in amountResult) {
      this.amountExpressionError.set(amountResult.error);
      this.error.set(amountResult.error);
      return;
    }
    const amount = amountResult.value;
    const totalInstallments = this.installmentsEnabled()
      ? Math.max(1, Number(raw.totalInstallments) || 1)
      : 1;

    const tags = raw.tagsText
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const recurrence =
      this.recurrenceAvailable() && raw.recurrenceEnabled
        ? {
            frequency: raw.recurrenceFrequency,
            ...(raw.recurrenceFrequency === 'CUSTOM'
              ? { intervalDays: Number(raw.recurrenceIntervalDays ?? 0) }
              : {}),
            ...(raw.recurrenceForever
              ? { forever: true }
              : { count: Math.max(1, Number(raw.recurrenceCount ?? 1)) }),
          }
        : undefined;

    const description =
      raw.description.trim() !== ''
        ? raw.description.trim()
        : this.getFallbackDescription(raw.type, raw.categoryId);

    const payload: CreateTransactionDTO = {
      walletId: raw.walletId,
      categoryId: raw.categoryId,
      amount,
      description,
      date: dateInputToIso(raw.date),
      type: raw.type,
      isPaid: raw.isPaid,
      ...(totalInstallments > 1 ? { totalInstallments } : {}),
      ...(raw.type === 'TRANSFER' ? { destinationWalletId: raw.destinationWalletId } : {}),
      ...(tags.length ? { tags } : {}),
      ...(recurrence ? { recurrence } : {}),
      ...(this.invoiceMonthEnabled() && raw.invoiceMonth.trim() !== ''
        ? { invoiceMonth: raw.invoiceMonth.trim() }
        : {}),
    };

    let parsed: CreateTransactionDTO;
    try {
      parsed = createTransactionSchema.parse(payload);
    } catch {
      this.error.set('Dados inválidos');
      return;
    }

    this.isLoading.set(true);
    this.api
      .createTransaction(parsed)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          const message =
            typeof err?.error?.message === 'string'
              ? err.error.message
              : 'Erro ao salvar transação';
          this.error.set(message);
        },
      });
  }
}
