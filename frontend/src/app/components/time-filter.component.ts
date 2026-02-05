import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { PeriodPreset, TimeFilterSelectionDTO } from '@dindinho/shared';
import {
  formatIsoDayLocal,
  formatIsoMonthLocal,
  parseIsoMonthToLocalDate,
  resolvePeriodSelectionToDayRange,
} from '../utils/time-filter.util';

/**
 * Seletor de filtro temporal com presets e opção de lente de fatura.
 */
@Component({
  selector: 'app-time-filter',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DatePickerModule],
  template: `
    <section class="flex flex-col gap-2" data-testid="time-filter">
      @let sel = selectionState();

      <button
        type="button"
        class="w-full min-h-[46px] rounded-xl border border-slate-200 bg-white px-3 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        (click)="openEditor()"
        data-testid="time-filter-open"
        aria-haspopup="dialog"
        [attr.aria-expanded]="editorOpen()"
        [attr.aria-controls]="sheetId"
      >
        <span
          class="shrink-0 h-7 px-2.5 rounded-lg text-xs font-semibold leading-none flex items-center"
          [class]="
            sel.mode === 'INVOICE_MONTH'
              ? 'bg-slate-100 text-slate-700'
              : 'bg-emerald-50 text-emerald-700'
          "
          data-testid="time-filter-mode-pill"
        >
          {{ sel.mode === 'INVOICE_MONTH' ? 'Fatura' : 'Período' }}
        </span>

        <span
          class="flex-1 min-w-0 text-sm text-slate-800 truncate"
          data-testid="time-filter-summary"
          [attr.aria-label]="timeFilterA11ySummary()"
        >
          {{ timeFilterSummary() }}
        </span>

        <span class="shrink-0 text-slate-500" aria-hidden="true">▾</span>
      </button>

      @if (editorOpen()) {
        <div
          class="fixed inset-0 z-40 p-0 border-0 bg-transparent"
          data-testid="time-filter-backdrop"
          (click)="closeEditor()"
          aria-hidden="true"
        >
          <div class="absolute inset-0 bg-black/40"></div>
        </div>

        <section
          class="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl border border-slate-200 shadow-xl"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="titleId"
          [attr.id]="sheetId"
          data-testid="time-filter-sheet"
        >
          @let draft = draftSelectionState();

          <header class="px-4 pt-4 pb-3 flex items-center justify-between">
            <div class="flex flex-col">
              <h2
                class="text-sm font-semibold text-slate-900"
                [attr.id]="titleId"
                data-testid="time-filter-sheet-title"
              >
                {{ draft.mode === 'INVOICE_MONTH' ? 'Fatura' : 'Período' }}
              </h2>
              <span class="text-xs text-slate-500" data-testid="time-filter-sheet-summary">
                {{ draftSummary() }}
              </span>
            </div>

            <button
              type="button"
              class="h-9 px-3 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold"
              (click)="closeEditor()"
              data-testid="time-filter-close"
              aria-label="Concluir edição do filtro"
            >
              Concluir
            </button>
          </header>

          @if (allowInvoiceLens) {
            <div
              class="px-4 pb-3"
              role="tablist"
              aria-label="Selecionar lente de período"
              data-testid="time-filter-modes"
            >
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  data-testid="time-filter-mode-day"
                  [class]="
                    draft.mode === 'DAY_RANGE'
                      ? 'h-10 rounded-xl bg-emerald-600 text-white text-sm font-semibold'
                      : 'h-10 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold'
                  "
                  (click)="setDraftMode('DAY_RANGE')"
                  role="tab"
                  [attr.aria-selected]="draft.mode === 'DAY_RANGE'"
                >
                  Período
                </button>
                <button
                  type="button"
                  data-testid="time-filter-mode-invoice"
                  [class]="
                    draft.mode === 'INVOICE_MONTH'
                      ? 'h-10 rounded-xl bg-emerald-600 text-white text-sm font-semibold'
                      : 'h-10 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold'
                  "
                  (click)="setDraftMode('INVOICE_MONTH')"
                  role="tab"
                  [attr.aria-selected]="draft.mode === 'INVOICE_MONTH'"
                >
                  Fatura
                </button>
              </div>
            </div>
          }

          <div class="px-4 pb-4 flex flex-col gap-3">
            @if (draft.mode === 'DAY_RANGE') {
              <div
                class="flex gap-2 overflow-x-auto pb-1"
                data-testid="time-filter-presets"
                aria-label="Selecionar período rápido"
              >
                @for (p of presets; track p.value) {
                  <button
                    type="button"
                    [attr.data-testid]="'time-filter-preset-' + p.value"
                    class="shrink-0 h-10 px-4 rounded-xl text-sm font-semibold whitespace-nowrap"
                    [class]="
                      draft.mode === 'DAY_RANGE' && draft.period.preset === p.value
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-700'
                    "
                    (click)="setDraftPreset(p.value)"
                    [attr.aria-label]="'Selecionar período ' + p.label"
                  >
                    {{ p.label }}
                  </button>
                }
              </div>

              <div
                class="w-full bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-200 focus-within:border-emerald-300"
                data-testid="time-filter-range-field"
              >
                <p-datepicker
                  inputId="time-filter-range"
                  [ngModel]="dayRangeModel()"
                  (ngModelChange)="onDayRangeModelChange($event)"
                  selectionMode="range"
                  [readonlyInput]="true"
                  [showIcon]="true"
                  [showClear]="true"
                  appendTo="body"
                  [baseZIndex]="3000"
                  placeholder="Selecione o período"
                  styleClass="w-full"
                  inputStyleClass="!bg-transparent !border-0 !rounded-none !py-3 !px-4 !shadow-none !min-h-[46px]"
                  dateFormat="dd/mm/yy"
                  aria-label="Selecionar intervalo de datas"
                  data-testid="time-filter-range-picker"
                />
              </div>
            } @else {
              <div
                class="w-full bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-200 focus-within:border-emerald-300"
                data-testid="time-filter-invoice-field"
              >
                <p-datepicker
                  inputId="time-filter-invoice-month"
                  [ngModel]="invoiceMonthModel()"
                  (ngModelChange)="onInvoiceMonthModelChange($event)"
                  view="month"
                  dateFormat="mm/yy"
                  [showIcon]="true"
                  [showClear]="true"
                  [readonlyInput]="true"
                  appendTo="body"
                  [baseZIndex]="3000"
                  styleClass="w-full"
                  inputStyleClass="!bg-transparent !border-0 !rounded-none !py-3 !px-4 !shadow-none !min-h-[46px]"
                  aria-label="Selecionar mês de fatura"
                  data-testid="time-filter-invoice-picker"
                />
              </div>
            }
          </div>

          <footer class="px-4 py-3 border-t border-slate-100 flex gap-2">
            <button
              type="button"
              class="flex-1 min-h-[46px] rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold"
              (click)="resetDraft()"
              data-testid="time-filter-reset"
            >
              Resetar
            </button>
            <button
              type="button"
              class="flex-1 min-h-[46px] rounded-xl bg-emerald-600 text-white text-sm font-semibold"
              (click)="applyDraft()"
              data-testid="time-filter-apply"
            >
              Aplicar
            </button>
          </footer>
        </section>
      }
    </section>
  `,
})
export class TimeFilterComponent {
  private static instanceSeq = 0;

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly instanceId = ++TimeFilterComponent.instanceSeq;

  protected readonly sheetId = `time-filter-sheet-${this.instanceId}`;
  protected readonly titleId = `time-filter-title-${this.instanceId}`;

  @Input() allowInvoiceLens = true;

  @Output() selectionChange = new EventEmitter<TimeFilterSelectionDTO>();
  @Output() dayRangeChange = new EventEmitter<[Date | null, Date | null]>();
  @Output() invoiceMonthChange = new EventEmitter<Date | null>();

  private readonly selectionSig = signal<TimeFilterSelectionDTO>({
    mode: 'DAY_RANGE',
    period: { preset: 'THIS_MONTH', tzOffsetMinutes: new Date().getTimezoneOffset() },
  });

  private readonly draftSelectionSig = signal<TimeFilterSelectionDTO>(this.selectionSig());
  private readonly editorOpenSig = signal(false);

  protected readonly editorOpen = this.editorOpenSig.asReadonly();

  protected readonly selectionState = this.selectionSig.asReadonly();
  protected readonly draftSelectionState = this.draftSelectionSig.asReadonly();

  protected readonly dayRangeModel = signal<[Date | null, Date | null]>([null, null]);
  protected readonly invoiceMonthModel = signal<Date | null>(null);

  private suppressDayRangeModelChange = false;
  private suppressInvoiceMonthModelChange = false;

  private readonly lastDayRangeSelection = signal<TimeFilterSelectionDTO & { mode: 'DAY_RANGE' }>({
    mode: 'DAY_RANGE',
    period: { preset: 'THIS_MONTH', tzOffsetMinutes: new Date().getTimezoneOffset() },
  });

  private readonly lastInvoiceSelection = signal<
    TimeFilterSelectionDTO & { mode: 'INVOICE_MONTH' }
  >({
    mode: 'INVOICE_MONTH',
    invoiceMonth: formatIsoMonthLocal(new Date()),
  });

  private readonly lastDraftDayRangeSelection = signal<
    TimeFilterSelectionDTO & { mode: 'DAY_RANGE' }
  >(this.lastDayRangeSelection());

  private readonly lastDraftInvoiceSelection = signal<
    TimeFilterSelectionDTO & { mode: 'INVOICE_MONTH' }
  >(this.lastInvoiceSelection());

  protected readonly presets: { label: string; value: PeriodPreset }[] = [
    { label: 'Hoje', value: 'TODAY' },
    { label: 'Ontem', value: 'YESTERDAY' },
    { label: 'Esta semana', value: 'THIS_WEEK' },
    { label: 'Última semana', value: 'LAST_WEEK' },
    { label: 'Este mês', value: 'THIS_MONTH' },
    { label: 'Último mês', value: 'LAST_MONTH' },
  ];

  /**
   * Mantém o componente controlável via binding e preserva o estado interno com signals.
   */
  @Input()
  set selection(value: TimeFilterSelectionDTO) {
    if (!value) return;

    if (!this.allowInvoiceLens && value.mode !== 'DAY_RANGE') {
      this.selectionSig.set({
        mode: 'DAY_RANGE',
        period: { preset: 'THIS_MONTH', tzOffsetMinutes: new Date().getTimezoneOffset() },
      });
      return;
    }

    this.selectionSig.set(value);
    if (!this.editorOpenSig()) {
      this.draftSelectionSig.set(value);
    }
  }

  constructor() {
    effect(() => {
      if (!this.editorOpenSig()) return;
      queueMicrotask(() => {
        const closeButton = this.host.nativeElement.querySelector(
          '[data-testid="time-filter-close"]',
        ) as HTMLButtonElement | null;
        closeButton?.focus();
      });
    });

    effect((onCleanup) => {
      if (!this.editorOpenSig()) return;

      const handler = (event: KeyboardEvent) => {
        if (event.key === 'Escape') this.closeEditor();
      };

      document.body.classList.add('overflow-hidden');
      window.addEventListener('keydown', handler);

      onCleanup(() => {
        document.body.classList.remove('overflow-hidden');
        window.removeEventListener('keydown', handler);
      });
    });

    effect(() => {
      const sel = this.selectionSig();
      if (sel.mode === 'INVOICE_MONTH') {
        this.lastInvoiceSelection.set(sel);
      } else {
        this.lastDayRangeSelection.set(sel);
      }
    });

    effect(() => {
      if (!this.editorOpenSig()) return;

      const sel = this.draftSelectionSig();

      if (sel.mode === 'INVOICE_MONTH') {
        this.suppressInvoiceMonthModelChange = true;
        this.invoiceMonthModel.set(parseIsoMonthToLocalDate(sel.invoiceMonth));
        return;
      }

      const resolved = resolvePeriodSelectionToDayRange(sel.period);
      if (!resolved) return;
      this.suppressDayRangeModelChange = true;
      this.dayRangeModel.set([resolved.start, resolved.end]);
    });

    effect(() => {
      if (!this.editorOpenSig()) return;

      const draft = this.draftSelectionSig();
      if (draft.mode === 'INVOICE_MONTH') {
        this.lastDraftInvoiceSelection.set(draft);
      } else {
        this.lastDraftDayRangeSelection.set(draft);
      }
    });
  }

  protected openEditor() {
    const current = this.selectionSig();
    if (current.mode === 'INVOICE_MONTH') {
      this.lastDraftInvoiceSelection.set(current);
    } else {
      this.lastDraftDayRangeSelection.set(current);
    }

    this.draftSelectionSig.set(current);
    this.editorOpenSig.set(true);
  }

  protected closeEditor() {
    const draft = this.draftSelectionSig();
    const current = this.selectionSig();

    if (!this.sameSelection(current, draft)) {
      this.applyDraft();
      return;
    }

    this.draftSelectionSig.set(current);
    this.editorOpenSig.set(false);
    this.focusOpenButton();
  }

  protected setDraftMode(mode: TimeFilterSelectionDTO['mode']) {
    const current = this.draftSelectionSig();
    if (mode === current.mode) return;

    if (current.mode === 'INVOICE_MONTH') {
      this.lastDraftInvoiceSelection.set(current);
    } else {
      this.lastDraftDayRangeSelection.set(current);
    }

    if (mode === 'INVOICE_MONTH') {
      this.draftSelectionSig.set(this.lastDraftInvoiceSelection());
      return;
    }

    this.draftSelectionSig.set(this.lastDraftDayRangeSelection());
  }

  protected setDraftPreset(preset: PeriodPreset) {
    this.draftSelectionSig.set({
      mode: 'DAY_RANGE',
      period: { preset, tzOffsetMinutes: new Date().getTimezoneOffset() },
    });
  }

  protected onDayRangeModelChange(value: unknown) {
    if (!Array.isArray(value) || value.length !== 2) return;

    if (this.suppressDayRangeModelChange) {
      this.suppressDayRangeModelChange = false;
      return;
    }

    const start = value[0] instanceof Date ? (value[0] as Date) : null;
    const end = value[1] instanceof Date ? (value[1] as Date) : null;
    this.dayRangeModel.set([start, end]);

    if (!start || !end) {
      this.draftSelectionSig.set({
        mode: 'DAY_RANGE',
        period: { preset: 'THIS_MONTH', tzOffsetMinutes: new Date().getTimezoneOffset() },
      });
      return;
    }

    const normalized =
      start.getTime() <= end.getTime() ? { start, end } : { start: end, end: start };
    const startDay = formatIsoDayLocal(normalized.start);
    const endDay = formatIsoDayLocal(normalized.end);

    const draft = this.draftSelectionSig();
    if (draft.mode === 'DAY_RANGE' && draft.period.preset && draft.period.preset !== 'CUSTOM') {
      const resolved = resolvePeriodSelectionToDayRange(draft.period);
      if (resolved && resolved.startDay === startDay && resolved.endDay === endDay) {
        this.draftSelectionSig.set({
          mode: 'DAY_RANGE',
          period: {
            preset: draft.period.preset,
            tzOffsetMinutes: normalized.start.getTimezoneOffset(),
          },
        });
        return;
      }
    }

    this.draftSelectionSig.set({
      mode: 'DAY_RANGE',
      period: {
        preset: 'CUSTOM',
        startDay,
        endDay,
        tzOffsetMinutes: normalized.start.getTimezoneOffset(),
      },
    });
  }

  protected onInvoiceMonthModelChange(value: unknown) {
    if (this.suppressInvoiceMonthModelChange) {
      this.suppressInvoiceMonthModelChange = false;
      return;
    }

    const date = value instanceof Date ? value : null;
    this.invoiceMonthModel.set(date);

    const next = date ? formatIsoMonthLocal(date) : formatIsoMonthLocal(new Date());
    this.draftSelectionSig.set({ mode: 'INVOICE_MONTH', invoiceMonth: next });
  }

  protected resetDraft() {
    const draft = this.draftSelectionSig();

    if (draft.mode === 'INVOICE_MONTH') {
      this.invoiceMonthModel.set(new Date());
      this.draftSelectionSig.set({
        mode: 'INVOICE_MONTH',
        invoiceMonth: formatIsoMonthLocal(new Date()),
      });
      return;
    }

    this.dayRangeModel.set([null, null]);
    this.draftSelectionSig.set({
      mode: 'DAY_RANGE',
      period: { preset: 'THIS_MONTH', tzOffsetMinutes: new Date().getTimezoneOffset() },
    });
  }

  protected applyDraft() {
    const next = this.draftSelectionSig();
    if (!this.allowInvoiceLens && next.mode !== 'DAY_RANGE') return;

    this.selectionSig.set(next);
    this.selectionChange.emit(next);

    if (next.mode === 'INVOICE_MONTH') {
      this.invoiceMonthChange.emit(parseIsoMonthToLocalDate(next.invoiceMonth));
    } else {
      const resolved = resolvePeriodSelectionToDayRange(next.period);
      this.dayRangeChange.emit(resolved ? [resolved.start, resolved.end] : [null, null]);
    }

    this.editorOpenSig.set(false);
    this.focusOpenButton();
  }

  private focusOpenButton() {
    queueMicrotask(() => {
      const openButton = this.host.nativeElement.querySelector(
        '[data-testid="time-filter-open"]',
      ) as HTMLButtonElement | null;
      openButton?.focus();
    });
  }

  private sameSelection(a: TimeFilterSelectionDTO, b: TimeFilterSelectionDTO): boolean {
    if (a.mode !== b.mode) return false;

    if (a.mode === 'INVOICE_MONTH' && b.mode === 'INVOICE_MONTH') {
      return a.invoiceMonth === b.invoiceMonth;
    }

    if (a.mode === 'DAY_RANGE' && b.mode === 'DAY_RANGE') {
      if (a.period.preset !== b.period.preset) return false;
      if (a.period.tzOffsetMinutes !== b.period.tzOffsetMinutes) return false;
      if (a.period.preset !== 'CUSTOM') return true;
      return a.period.startDay === b.period.startDay && a.period.endDay === b.period.endDay;
    }

    return false;
  }

  protected timeFilterSummary(): string {
    const selection = this.selectionSig();
    if (selection.mode === 'INVOICE_MONTH') {
      const parsed = parseIsoMonthToLocalDate(selection.invoiceMonth);
      if (!parsed) return 'Selecione o mês';
      return this.formatLocalMonthYear(parsed);
    }

    if (selection.period.preset !== 'CUSTOM') {
      const presetLabel = this.presetLabel(selection.period.preset);
      if (presetLabel) return presetLabel;
    }

    const resolved = resolvePeriodSelectionToDayRange(selection.period);
    if (!resolved) return 'Selecione o período';
    return `${this.formatLocalDay(resolved.start)} - ${this.formatLocalDay(resolved.end)}`;
  }

  protected timeFilterA11ySummary(): string {
    const selection = this.selectionSig();
    if (selection.mode === 'INVOICE_MONTH') {
      const parsed = parseIsoMonthToLocalDate(selection.invoiceMonth);
      return parsed ? `Fatura ${this.formatLocalMonthYear(parsed)}` : 'Selecionar mês de fatura';
    }

    const resolved = resolvePeriodSelectionToDayRange(selection.period);
    if (!resolved) return 'Selecionar período';

    const presetLabel =
      selection.period.preset !== 'CUSTOM' ? this.presetLabel(selection.period.preset) : '';
    const range = `de ${this.formatLocalDay(resolved.start)} até ${this.formatLocalDay(resolved.end)}`;
    return presetLabel ? `Período ${presetLabel}, ${range}` : `Período ${range}`;
  }

  protected draftSummary(): string {
    const selection = this.draftSelectionSig();
    if (selection.mode === 'INVOICE_MONTH') {
      const parsed = parseIsoMonthToLocalDate(selection.invoiceMonth);
      return parsed ? `Fatura ${this.formatLocalMonthYear(parsed)}` : 'Selecione o mês';
    }

    const resolved = resolvePeriodSelectionToDayRange(selection.period);
    if (!resolved) return 'Selecione o período';

    const presetLabel = this.presetLabel(selection.period.preset);
    const range = `${this.formatLocalDay(resolved.start)} - ${this.formatLocalDay(resolved.end)}`;
    return presetLabel ? `${presetLabel} • ${range}` : range;
  }

  private formatLocalDay(value: Date): string {
    const day = String(value.getDate()).padStart(2, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const year = String(value.getFullYear());
    return `${day}/${month}/${year}`;
  }

  private formatLocalMonthYear(value: Date): string {
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const year = String(value.getFullYear());
    return `${month}/${year}`;
  }

  private presetLabel(preset: PeriodPreset | undefined): string {
    if (!preset) return '';
    const found = this.presets.find((p) => p.value === preset);
    return found?.label ?? '';
  }
}
