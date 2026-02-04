/** @vitest-environment jsdom */
import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { AdminDocsLayoutComponent } from './admin-docs-layout.component';
import { BaseDocsLayoutComponent } from '../base-docs-layout/base-docs-layout.component';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

/**
 * @description
 * Testes para o AdminDocsLayoutComponent.
 * Verifica a estrutura da sidebar, agrupamento de status e funcionalidades premium.
 */
describe('AdminDocsLayoutComponent', () => {
  let component: AdminDocsLayoutComponent;
  let fixture: ComponentFixture<AdminDocsLayoutComponent>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [AdminDocsLayoutComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDocsLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Força a inicialização das categorias expandidas no componente base
    const baseComponent = fixture.debugElement.query(
      By.directive(BaseDocsLayoutComponent),
    ).componentInstance;
    baseComponent.initializeExpanded();
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve renderizar a logo administrativa', () => {
    const logoSubtitle = fixture.debugElement.query(By.css('.font-medium.text-indigo-600'));
    expect(logoSubtitle).toBeTruthy();
    expect(logoSubtitle.nativeElement.textContent).toContain('Internal');
  });

  it('deve exibir as categorias principais na sidebar', () => {
    const categoryButtons = fixture.debugElement.queryAll(By.css('aside nav button'));
    expect(categoryButtons.length).toBeGreaterThan(0);

    const labels = categoryButtons.map((b) =>
      b.query(By.css('span')).nativeElement.textContent.trim().toUpperCase(),
    );
    expect(labels).toContain('GERAL');
    expect(labels).toContain('BACKLOG & PLANEJAMENTO');
  });

  it('deve agrupar itens de backlog por status', () => {
    fixture.detectChanges();

    // Localiza a seção de backlog
    const backlogSection = fixture.debugElement.queryAll(By.css('aside nav > div')).find((el) => {
      const span = el.query(By.css('span'));
      return span && span.nativeElement.textContent.trim().toUpperCase().includes('BACKLOG');
    });

    expect(backlogSection).toBeTruthy();

    // Verifica os cabeçalhos de status
    const statusHeaders = backlogSection!.queryAll(By.css('.uppercase.tracking-tighter'));
    const headerTexts = statusHeaders.map((h) => h.nativeElement.textContent);

    expect(headerTexts.some((t) => t.includes('Ativo (WIP)'))).toBe(true);
    expect(headerTexts.some((t) => t.includes('Discussão (RFC)'))).toBe(true);
    expect(headerTexts.some((t) => t.includes('Arquivado (Done)'))).toBe(true);
  });

  it('deve alternar a visibilidade de uma categoria ao clicar', () => {
    fixture.detectChanges();

    const categoryButton = fixture.debugElement.query(By.css('aside nav button'));
    const categoryId = component['categories'][0].id;

    const baseComponent = fixture.debugElement.query(
      By.directive(BaseDocsLayoutComponent),
    ).componentInstance;

    // Inicialmente deve estar expandida
    expect(baseComponent.isExpanded(categoryId)).toBe(true);

    // Clica para colapsar
    categoryButton.triggerEventHandler('click', null);
    fixture.detectChanges();
    expect(baseComponent.isExpanded(categoryId)).toBe(false);

    // Clica para expandir novamente
    categoryButton.triggerEventHandler('click', null);
    fixture.detectChanges();
    expect(baseComponent.isExpanded(categoryId)).toBe(true);
  });

  it('deve aplicar as cores corretas para cada badge de status', () => {
    const baseComponent = fixture.debugElement.query(
      By.directive(BaseDocsLayoutComponent),
    ).componentInstance;
    expect(baseComponent.getStatusClass('WIP')).toContain('bg-indigo-50');
    expect(baseComponent.getStatusClass('RFC')).toContain('bg-orange-50');
    expect(baseComponent.getStatusClass('DONE')).toContain('bg-slate-100');
  });

  it('deve conter o link para o roadmap com o status WIP', () => {
    const roadmapLink = fixture.debugElement.query(By.css('[data-testid="nav-roadmap"]'));
    expect(roadmapLink).toBeTruthy();

    const badge = roadmapLink.query(By.css('.rounded.font-bold'));
    expect(badge.nativeElement.textContent.trim()).toBe('WIP');
  });
});
