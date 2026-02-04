/** @vitest-environment jsdom */
import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { BaseDocsLayoutComponent, SidebarCategory } from './base-docs-layout.component';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

/**
 * @description
 * Testes para o BaseDocsLayoutComponent.
 * Verifica a estrutura base, inputs, outputs e funcionalidades de expansão/colapso.
 */
describe('BaseDocsLayoutComponent', () => {
  let fixture: ComponentFixture<BaseDocsLayoutComponent>;
  let baseComponent: BaseDocsLayoutComponent;

  const mockCategories: SidebarCategory[] = [
    {
      id: 'cat1',
      label: 'Categoria 1',
      items: [
        { id: 'item1', label: 'Item 1', icon: 'pi-home', link: '/item1' },
        { id: 'item2', label: 'Item 2', icon: 'pi-user', link: '/item2', status: 'WIP' },
      ],
    },
    {
      id: 'cat2',
      label: 'Categoria 2',
      isBacklog: true,
      items: [
        { id: 'item3', label: 'Item 3', icon: 'pi-cog', link: '/item3', status: 'RFC' },
        { id: 'item4', label: 'Item 4', icon: 'pi-check', link: '/item4', status: 'DONE' },
      ],
    },
  ];

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [BaseDocsLayoutComponent],
      providers: [
        provideRouter([
          { path: 'item1', component: class {} },
          { path: 'item2', component: class {} },
          { path: 'item3', component: class {} },
          { path: 'item4', component: class {} },
        ]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BaseDocsLayoutComponent);
    baseComponent = fixture.componentInstance;

    // Configurar inputs iniciais
    baseComponent.categories = mockCategories;
    baseComponent.testId = 'test-layout';
    baseComponent.logoLetter = 'T';
    baseComponent.logoSubtitle = 'Test';
    baseComponent.logoBgClass = 'bg-red-500';
    baseComponent.logoTextClass = 'text-red-500';
    baseComponent.badgeText = 'Beta';
    baseComponent.footerText = 'Footer v1';
    baseComponent.logoLink = '/home';
    baseComponent.activeLinkClass = 'active-class';

    fixture.detectChanges();

    // Forçar inicialização das categorias expandidas se necessário
    baseComponent.initializeExpanded();
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('deve criar o componente', () => {
    expect(baseComponent).toBeTruthy();
  });

  it('deve renderizar a logo e o subtitulo corretamente', () => {
    const logoContainer = fixture.debugElement.query(By.css('.w-8.h-8'));
    expect(logoContainer.nativeElement.textContent.trim()).toBe('T');
    expect(logoContainer.nativeElement.classList.contains('bg-red-500')).toBe(true);

    const subtitle = fixture.debugElement.query(By.css('.font-medium.text-red-500'));
    expect(subtitle.nativeElement.textContent.trim()).toBe('Test');
  });

  it('deve exibir o badge quando fornecido', () => {
    const badge = fixture.debugElement.query(By.css('span.uppercase.tracking-widest'));
    expect(badge.nativeElement.textContent.trim()).toBe('Beta');
  });

  it('deve renderizar todas as categorias na sidebar', () => {
    const categoryButtons = fixture.debugElement.queryAll(By.css('aside nav button'));
    expect(categoryButtons.length).toBe(2);
    expect(categoryButtons[0].nativeElement.textContent).toContain('Categoria 1');
    expect(categoryButtons[1].nativeElement.textContent).toContain('Categoria 2');
  });

  it('deve alternar a expansão da categoria ao clicar', () => {
    const categoryId = mockCategories[0].id;
    expect(baseComponent.isExpanded(categoryId)).toBe(true);

    const categoryButton = fixture.debugElement.query(By.css('aside nav button'));
    categoryButton.triggerEventHandler('click', null);
    fixture.detectChanges();
    expect(baseComponent.isExpanded(categoryId)).toBe(false);

    categoryButton.triggerEventHandler('click', null);
    fixture.detectChanges();
    expect(baseComponent.isExpanded(categoryId)).toBe(true);
  });

  it('deve emitir backToApp ao clicar no botão de voltar', () => {
    const emitSpy = vi.spyOn(baseComponent.backToApp, 'emit');
    // Usamos um seletor mais específico para o botão de voltar,
    // já que agora temos o botão de menu mobile também
    const backButton = fixture.debugElement.query(
      By.css('header div.flex.items-center.gap-4 button'),
    );
    backButton.triggerEventHandler('click', null);
    expect(emitSpy).toHaveBeenCalled();
  });

  it('deve aplicar as classes de status corretamente', () => {
    expect(baseComponent.getStatusClass('WIP')).toContain('bg-indigo-50');
    expect(baseComponent.getStatusClass('RFC')).toContain('bg-orange-50');
    expect(baseComponent.getStatusClass('DONE')).toContain('bg-slate-100');
  });

  it('deve alternar o menu mobile', () => {
    expect(baseComponent.isMobileMenuOpen()).toBe(false);

    baseComponent.toggleMobileMenu();
    expect(baseComponent.isMobileMenuOpen()).toBe(true);

    baseComponent.closeMobileMenu();
    expect(baseComponent.isMobileMenuOpen()).toBe(false);
  });

  it('deve fechar o menu mobile ao clicar em um link de navegação', () => {
    baseComponent.isMobileMenuOpen.set(true);
    fixture.detectChanges();

    const navLink = fixture.debugElement.query(By.css('[data-testid^="nav-"]'));
    // Simulamos o evento de clique real passando um objeto de evento
    navLink.triggerEventHandler('click', { button: 0 });
    fixture.detectChanges();

    expect(baseComponent.isMobileMenuOpen()).toBe(false);
  });

  it('deve agrupar itens de backlog quando isBacklog for true', () => {
    const navElements = fixture.debugElement.queryAll(By.css('aside nav > div'));
    const backlogCategory = navElements[1];

    // No novo template, os headers estão dentro de divs específicas
    const headers = backlogCategory.queryAll(
      By.css('.text-xs.font-bold.uppercase.tracking-tighter'),
    );

    const headerTexts = headers.map((h) => h.nativeElement.textContent);
    expect(headerTexts.some((t) => t.includes('Discussão (RFC)'))).toBe(true);
    expect(headerTexts.some((t) => t.includes('Arquivado (Concluído)'))).toBe(true);
  });
});
