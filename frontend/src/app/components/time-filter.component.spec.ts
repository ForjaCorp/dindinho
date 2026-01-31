/** @vitest-environment jsdom */
import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TimeFilterSelectionDTO } from '@dindinho/shared';
import { TimeFilterComponent } from './time-filter.component';

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

  it('deve mover foco para o botão Fechar ao abrir', async () => {
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
});
