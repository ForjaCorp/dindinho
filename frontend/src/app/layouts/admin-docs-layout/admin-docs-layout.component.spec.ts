/** @vitest-environment jsdom */
import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { AdminDocsLayoutComponent } from './admin-docs-layout.component';
import { BaseDocsLayoutComponent } from '../base-docs-layout/base-docs-layout.component';
import { AuthService } from '../../services/auth.service';
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

    const authServiceMock = {
      isAuthenticated: () => true,
      currentUser: () => ({ role: 'ADMIN' }),
    };

    await TestBed.configureTestingModule({
      imports: [AdminDocsLayoutComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: authServiceMock }],
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
    expect(logoSubtitle.nativeElement.textContent).toContain('Interno');
  });

  it('deve exibir as categorias principais na sidebar', () => {
    fixture.detectChanges();
    const categories = fixture.debugElement.queryAll(By.css('[data-testid^="category-button-"]'));
    const labels = categories.map((c) =>
      c.query(By.css('span')).nativeElement.textContent.trim().toUpperCase(),
    );
    expect(labels).toContain('GERAL');
    expect(labels).toContain('BACKLOG & PLANEJAMENTO');
  });

  it('deve conter divisores entre itens de backlog de diferentes status', () => {
    fixture.detectChanges();

    // Localiza a seção de backlog usando testid do botão da categoria
    const backlogButton = fixture.debugElement.query(
      By.css('[data-testid="category-button-backlog"]'),
    );
    const backlogSection = backlogButton.nativeElement.closest('div');

    expect(backlogSection).toBeTruthy();

    // Verifica a presença dos divisores (divs com classe h-px)
    const dividers = backlogSection.querySelectorAll('.h-px.bg-slate-200');
    // Deve haver divisores separando os grupos (WIP, RFC, DONE)
    expect(dividers.length).toBeGreaterThan(0);
  });

  it('deve alternar a visibilidade de uma categoria ao clicar', () => {
    fixture.detectChanges();

    const categoryId = component['categories'][0].id;
    const categoryButton = fixture.debugElement.query(
      By.css(`[data-testid="category-button-${categoryId}"]`),
    );

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

  it('deve exibir o texto correto no botão de voltar', () => {
    const backButton = fixture.debugElement.query(By.css('[data-testid="back-to-app-button"]'));
    expect(backButton.nativeElement.textContent).toContain('Voltar para a Plataforma');
  });

  it('deve exibir o link de acesso rápido para a visão do usuário', () => {
    const userViewLink = fixture.debugElement.query(By.css('[data-testid="user-view-link"]'));
    expect(userViewLink).toBeTruthy();
    expect(userViewLink.nativeElement.textContent).toContain('Visão do Usuário');
  });

  it('deve aplicar as cores corretas para cada badge de status', () => {
    const baseComponent = fixture.debugElement.query(
      By.directive(BaseDocsLayoutComponent),
    ).componentInstance;
    expect(baseComponent.getStatusClass('ANDAMENTO')).toContain('bg-indigo-50');
    expect(baseComponent.getStatusClass('DISCUSSAO')).toContain('bg-orange-50');
    expect(baseComponent.getStatusClass('ARQUIVADO')).toContain('bg-slate-100');
  });

  it('deve conter o link para o roadmap com o status ANDAMENTO', () => {
    const roadmapLink = fixture.debugElement.query(By.css('[data-testid="nav-fix-docs-access"]'));
    expect(roadmapLink).toBeTruthy();

    const badge = roadmapLink.query(By.css('.rounded.font-bold'));
    expect(badge.nativeElement.textContent.trim()).toBe('ANDAMENTO');
  });
});
