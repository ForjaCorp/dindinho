/** @vitest-environment jsdom */
import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { ReportChartCardComponent } from './report-chart-card.component';
import { describe, it, expect, beforeEach } from 'vitest';
import { Component, signal } from '@angular/core';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { By } from '@angular/platform-browser';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

@Component({
  standalone: true,
  imports: [ReportChartCardComponent],
  template: `
    <app-report-chart-card
      [title]="title()"
      [ariaLabel]="ariaLabel()"
      [loading]="loading()"
      [isEmpty]="isEmpty()"
      [emptyMessage]="emptyMessage()"
    >
      <div class="test-content">Conteúdo Interno</div>
    </app-report-chart-card>
  `,
})
class TestWrapperComponent {
  title = signal('Teste Gráfico');
  ariaLabel = signal('Label de Teste');
  loading = signal(false);
  isEmpty = signal(false);
  emptyMessage = signal('Nenhum dado encontrado no período');
}

/**
 * Testes unitários para o componente ReportChartCardComponent.
 * Verifica a renderização do título, estados de carregamento e estados vazios.
 */
describe('ReportChartCardComponent', () => {
  let fixture: ComponentFixture<TestWrapperComponent>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [TestWrapperComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestWrapperComponent);
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    const component = fixture.debugElement.query(By.directive(ReportChartCardComponent));
    expect(component).toBeTruthy();
  });

  it('deve renderizar o título corretamente', () => {
    const titleElement = fixture.nativeElement.querySelector('.p-card-title');
    expect(titleElement.textContent).toContain('Teste Gráfico');
  });

  it('deve mostrar o skeleton quando loading for true', () => {
    fixture.componentInstance.loading.set(true);
    fixture.detectChanges();
    const loadingState = fixture.nativeElement.querySelector('[data-testid="loading-state"]');
    const skeleton = fixture.nativeElement.querySelector('[data-testid="loading-skeleton-rect"]');
    expect(loadingState).toBeTruthy();
    expect(skeleton).toBeTruthy();
  });

  it('deve mostrar mensagem de estado vazio quando isEmpty for true', () => {
    fixture.componentInstance.isEmpty.set(true);
    fixture.componentInstance.emptyMessage.set('Sem dados');
    fixture.detectChanges();
    const emptyState = fixture.nativeElement.querySelector('[data-testid="empty-state"]');
    const message = fixture.nativeElement.querySelector('[data-testid="empty-message"]');
    expect(emptyState).toBeTruthy();
    expect(message.textContent).toContain('Sem dados');
  });

  it('deve renderizar o conteúdo via ng-content quando não estiver carregando nem vazio', () => {
    const actualContent = fixture.nativeElement.querySelector('[data-testid="actual-content"]');
    const content = fixture.nativeElement.querySelector('.test-content');
    expect(actualContent).toBeTruthy();
    expect(content.textContent).toContain('Conteúdo Interno');
  });
});
