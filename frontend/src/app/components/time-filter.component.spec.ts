/** @vitest-environment jsdom */
import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TimeFilterSelectionDTO } from '@dindinho/shared';
import { TimeFilterComponent } from './time-filter.component';
import { computeDayRangeForPreset } from '../utils/time-filter.util';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

const flushMicrotasks = async () => {
  await new Promise<void>((resolve) => queueMicrotask(resolve));
};

describe('TimeFilterComponent', () => {
  let fixture: ComponentFixture<TimeFilterComponent>;
  let component: TimeFilterComponent;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [TimeFilterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TimeFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('deve renderizar o botão de abertura com atributos ARIA básicos', () => {
    const open = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-open"]',
    ) as HTMLButtonElement | null;
    expect(open).toBeTruthy();
    expect(open?.getAttribute('aria-haspopup')).toBe('dialog');
    expect(open?.getAttribute('aria-controls')).toBeTruthy();
  });

  it('deve abrir o editor e expor o diálogo com aria-labelledby', async () => {
    const open = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-open"]',
    ) as HTMLButtonElement;
    open.click();
    fixture.detectChanges();

    const sheet = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-sheet"]',
    ) as HTMLElement | null;
    expect(sheet).toBeTruthy();
    expect(sheet?.getAttribute('role')).toBe('dialog');
    expect(sheet?.getAttribute('aria-modal')).toBe('true');
    expect(sheet?.getAttribute('aria-labelledby')).toBeTruthy();

    const controls = open.getAttribute('aria-controls');
    expect(controls).toBe(sheet?.getAttribute('id'));
  });

  it('deve mover foco para o botão Concluir ao abrir', async () => {
    const open = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-open"]',
    ) as HTMLButtonElement;
    open.click();
    fixture.detectChanges();
    await flushMicrotasks();

    const close = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-close"]',
    ) as HTMLButtonElement | null;
    expect(close).toBeTruthy();
    expect(document.activeElement).toBe(close);
  });

  it('não deve permitir foco no backdrop', () => {
    const open = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-open"]',
    ) as HTMLButtonElement;
    open.click();
    fixture.detectChanges();

    const backdrop = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-backdrop"]',
    ) as HTMLElement | null;
    expect(backdrop).toBeTruthy();
    expect(backdrop?.tagName).toBe('DIV');
    expect(backdrop?.getAttribute('tabindex')).toBeNull();
    expect(backdrop?.tabIndex).toBe(-1);
  });

  it('deve refletir o modo ativo no título do sheet', () => {
    const open = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-open"]',
    ) as HTMLButtonElement;
    open.click();
    fixture.detectChanges();

    const title = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-sheet"] h2',
    ) as HTMLElement | null;
    expect(title).toBeTruthy();
    expect((title?.textContent ?? '').replace(/\s+/g, ' ').trim()).toBe('Período');

    const invoiceMode = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-mode-invoice"]',
    ) as HTMLButtonElement | null;
    expect(invoiceMode).toBeTruthy();
    invoiceMode?.click();
    fixture.detectChanges();

    const titleAfter = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-sheet"] h2',
    ) as HTMLElement | null;
    expect(titleAfter).toBeTruthy();
    expect((titleAfter?.textContent ?? '').replace(/\s+/g, ' ').trim()).toBe('Fatura');
  });

  it('deve fechar ao pressionar ESC e restaurar foco no botão de abertura', async () => {
    const open = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-open"]',
    ) as HTMLButtonElement;
    open.click();
    fixture.detectChanges();
    await flushMicrotasks();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    await flushMicrotasks();

    const sheet = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-sheet"]',
    ) as HTMLElement | null;
    expect(sheet).toBeFalsy();

    const openAfter = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-open"]',
    ) as HTMLButtonElement | null;
    expect(document.activeElement).toBe(openAfter);
  });

  it('deve devolver foco para o botão de abertura ao fechar', async () => {
    const open = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-open"]',
    ) as HTMLButtonElement;
    open.click();
    fixture.detectChanges();
    await flushMicrotasks();

    const close = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-close"]',
    ) as HTMLButtonElement;
    close.click();
    fixture.detectChanges();
    await flushMicrotasks();

    const openAfter = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-open"]',
    ) as HTMLButtonElement | null;
    expect(document.activeElement).toBe(openAfter);
  });

  it('deve emitir seleção ao aplicar modo de fatura', async () => {
    const emitSpy = vi.spyOn(component.selectionChange, 'emit');

    const open = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-open"]',
    ) as HTMLButtonElement;
    open.click();
    fixture.detectChanges();

    const invoiceMode = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-mode-invoice"]',
    ) as HTMLButtonElement | null;
    expect(invoiceMode).toBeTruthy();
    invoiceMode?.click();
    fixture.detectChanges();

    const apply = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-apply"]',
    ) as HTMLButtonElement | null;
    expect(apply).toBeTruthy();
    apply?.click();
    fixture.detectChanges();

    expect(emitSpy).toHaveBeenCalledTimes(1);
    const selection = emitSpy.mock.calls[0]?.[0] as TimeFilterSelectionDTO | undefined;
    expect(selection?.mode).toBe('INVOICE_MONTH');
    expect(
      typeof (selection as TimeFilterSelectionDTO & { mode: 'INVOICE_MONTH' }).invoiceMonth,
    ).toBe('string');
  });

  it('deve aplicar a seleção ao fechar quando houver mudanças', async () => {
    const emitSpy = vi.spyOn(component.selectionChange, 'emit');

    const open = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-open"]',
    ) as HTMLButtonElement;
    open.click();
    fixture.detectChanges();
    await flushMicrotasks();

    const preset = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-preset-LAST_MONTH"]',
    ) as HTMLButtonElement | null;
    expect(preset).toBeTruthy();
    preset?.click();
    fixture.detectChanges();

    const close = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-close"]',
    ) as HTMLButtonElement;
    close.click();
    fixture.detectChanges();

    expect(emitSpy).toHaveBeenCalledTimes(1);
    const selection = emitSpy.mock.calls[0]?.[0] as TimeFilterSelectionDTO | undefined;
    expect(selection).toEqual(
      expect.objectContaining({
        mode: 'DAY_RANGE',
        period: expect.objectContaining({ preset: 'LAST_MONTH' }),
      }),
    );

    const sheet = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-sheet"]',
    ) as HTMLElement | null;
    expect(sheet).toBeFalsy();
  });

  it('não deve emitir ao fechar quando não houver mudanças', async () => {
    const emitSpy = vi.spyOn(component.selectionChange, 'emit');

    const open = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-open"]',
    ) as HTMLButtonElement;
    open.click();
    fixture.detectChanges();
    await flushMicrotasks();

    const close = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-close"]',
    ) as HTMLButtonElement;
    close.click();
    fixture.detectChanges();
    await flushMicrotasks();

    expect(emitSpy).toHaveBeenCalledTimes(0);
  });

  it('deve manter preset quando datepicker emitir o mesmo range do preset', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15, 12, 0, 0));

    const emitSpy = vi.spyOn(component.selectionChange, 'emit');

    const open = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-open"]',
    ) as HTMLButtonElement;
    open.click();
    fixture.detectChanges();

    const preset = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-preset-THIS_MONTH"]',
    ) as HTMLButtonElement;
    preset.click();
    fixture.detectChanges();

    const range = computeDayRangeForPreset('THIS_MONTH', new Date());
    expect(range).toBeTruthy();
    (component as unknown as { onDayRangeModelChange: (v: unknown) => void }).onDayRangeModelChange(
      [range!.start, range!.end],
    );
    fixture.detectChanges();

    const apply = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-apply"]',
    ) as HTMLButtonElement;
    apply.click();
    fixture.detectChanges();

    expect(emitSpy).toHaveBeenCalledTimes(1);
    const selection = emitSpy.mock.calls[0]?.[0] as TimeFilterSelectionDTO;
    expect(selection).toEqual(
      expect.objectContaining({
        mode: 'DAY_RANGE',
        period: expect.objectContaining({ preset: 'THIS_MONTH' }),
      }),
    );

    vi.useRealTimers();
  });

  it('deve ignorar ngModelChange ao sincronizar range de preset', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 30, 12, 0, 0));

    const emitSpy = vi.spyOn(component.selectionChange, 'emit');

    const open = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-open"]',
    ) as HTMLButtonElement;
    open.click();
    fixture.detectChanges();

    const preset = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-preset-TODAY"]',
    ) as HTMLButtonElement;
    preset.click();
    fixture.detectChanges();

    const range = computeDayRangeForPreset('TODAY', new Date());
    expect(range).toBeTruthy();

    (component as unknown as { suppressDayRangeModelChange: boolean }).suppressDayRangeModelChange =
      true;
    (component as unknown as { onDayRangeModelChange: (v: unknown) => void }).onDayRangeModelChange(
      [range!.start, range!.end],
    );
    fixture.detectChanges();

    const apply = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-apply"]',
    ) as HTMLButtonElement;
    apply.click();
    fixture.detectChanges();

    expect(emitSpy).toHaveBeenCalledTimes(1);
    const selection = emitSpy.mock.calls[0]?.[0] as TimeFilterSelectionDTO;
    expect(selection).toEqual(
      expect.objectContaining({
        mode: 'DAY_RANGE',
        period: expect.objectContaining({ preset: 'TODAY' }),
      }),
    );

    vi.useRealTimers();
  });

  it('deve forçar modo período quando allowInvoiceLens estiver desabilitado', () => {
    component.allowInvoiceLens = false;
    component.selection = { mode: 'INVOICE_MONTH', invoiceMonth: '2026-01' };
    fixture.detectChanges();

    const pill = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-mode-pill"]',
    ) as HTMLElement | null;
    expect(pill).toBeTruthy();
    expect((pill?.textContent ?? '').trim()).toBe('Período');
  });

  it('deve preservar o último rascunho ao alternar entre Período e Fatura', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15, 12, 0, 0));

    const open = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-open"]',
    ) as HTMLButtonElement;
    open.click();
    fixture.detectChanges();

    const preset = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-preset-LAST_MONTH"]',
    ) as HTMLButtonElement | null;
    expect(preset).toBeTruthy();
    preset?.click();
    fixture.detectChanges();

    const modeInvoice = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-mode-invoice"]',
    ) as HTMLButtonElement | null;
    expect(modeInvoice).toBeTruthy();
    modeInvoice?.click();
    fixture.detectChanges();

    (
      component as unknown as { suppressInvoiceMonthModelChange: boolean }
    ).suppressInvoiceMonthModelChange = false;
    (
      component as unknown as { onInvoiceMonthModelChange: (v: unknown) => void }
    ).onInvoiceMonthModelChange(new Date(2026, 1, 15, 12, 0, 0));
    fixture.detectChanges();

    const summary = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-sheet-summary"]',
    ) as HTMLElement | null;
    expect(summary).toBeTruthy();
    expect((summary?.textContent ?? '').replace(/\s+/g, ' ').trim()).toContain('Fatura 02/2026');

    const modeDay = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-mode-day"]',
    ) as HTMLButtonElement | null;
    expect(modeDay).toBeTruthy();
    modeDay?.click();
    fixture.detectChanges();

    const summaryDay = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-sheet-summary"]',
    ) as HTMLElement | null;
    expect(summaryDay).toBeTruthy();
    expect((summaryDay?.textContent ?? '').replace(/\s+/g, ' ').trim()).toContain('Último mês');

    modeInvoice?.click();
    fixture.detectChanges();

    const summaryInvoiceAgain = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-sheet-summary"]',
    ) as HTMLElement | null;
    expect(summaryInvoiceAgain).toBeTruthy();
    expect((summaryInvoiceAgain?.textContent ?? '').replace(/\s+/g, ' ').trim()).toContain(
      'Fatura 02/2026',
    );

    vi.useRealTimers();
  });

  it('deve emitir dayRangeChange ao aplicar um preset de período', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15, 12, 0, 0));

    const dayRangeSpy = vi.spyOn(component.dayRangeChange, 'emit');
    const selectionSpy = vi.spyOn(component.selectionChange, 'emit');

    const open = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-open"]',
    ) as HTMLButtonElement;
    open.click();
    fixture.detectChanges();

    const preset = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-preset-TODAY"]',
    ) as HTMLButtonElement;
    preset.click();
    fixture.detectChanges();

    const apply = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-apply"]',
    ) as HTMLButtonElement;
    apply.click();
    fixture.detectChanges();

    expect(selectionSpy).toHaveBeenCalledTimes(1);
    expect(dayRangeSpy).toHaveBeenCalledTimes(1);

    const payload = dayRangeSpy.mock.calls[0]?.[0];
    expect(Array.isArray(payload)).toBe(true);
    if (Array.isArray(payload)) {
      const [start, end] = payload;
      expect(start).toBeInstanceOf(Date);
      expect(end).toBeInstanceOf(Date);
      const s = start as Date;
      const e = end as Date;
      expect(s.getFullYear()).toBe(2026);
      expect(s.getMonth()).toBe(0);
      expect(s.getDate()).toBe(15);
      expect(e.getFullYear()).toBe(2026);
      expect(e.getMonth()).toBe(0);
      expect(e.getDate()).toBe(15);
    }

    vi.useRealTimers();
  });

  it('deve emitir invoiceMonthChange ao aplicar seleção de fatura', async () => {
    const invoiceSpy = vi.spyOn(component.invoiceMonthChange, 'emit');
    const selectionSpy = vi.spyOn(component.selectionChange, 'emit');

    const open = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-open"]',
    ) as HTMLButtonElement;
    open.click();
    fixture.detectChanges();

    const invoiceMode = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-mode-invoice"]',
    ) as HTMLButtonElement;
    invoiceMode.click();
    fixture.detectChanges();

    (
      component as unknown as { suppressInvoiceMonthModelChange: boolean }
    ).suppressInvoiceMonthModelChange = false;
    (
      component as unknown as { onInvoiceMonthModelChange: (v: unknown) => void }
    ).onInvoiceMonthModelChange(new Date(2026, 3, 15, 12, 0, 0));
    fixture.detectChanges();

    const apply = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-apply"]',
    ) as HTMLButtonElement;
    apply.click();
    fixture.detectChanges();

    expect(selectionSpy).toHaveBeenCalledTimes(1);
    expect(invoiceSpy).toHaveBeenCalledTimes(1);

    const emitted = invoiceSpy.mock.calls[0]?.[0] ?? null;
    expect(emitted).toBeInstanceOf(Date);
    const d = emitted as Date;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(3);
    expect(d.getDate()).toBe(1);
  });

  it('não deve renderizar tabs de modo quando allowInvoiceLens estiver desabilitado', () => {
    component.allowInvoiceLens = false;
    fixture.detectChanges();

    const open = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-open"]',
    ) as HTMLButtonElement;
    open.click();
    fixture.detectChanges();

    const tabs = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-modes"]',
    ) as HTMLElement | null;
    expect(tabs).toBeFalsy();

    const rangePicker = fixture.nativeElement.querySelector(
      '[data-testid="time-filter-range-picker"]',
    ) as HTMLElement | null;
    expect(rangePicker).toBeTruthy();
  });
});
