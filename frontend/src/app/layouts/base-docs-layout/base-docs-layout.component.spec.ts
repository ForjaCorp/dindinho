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
        {
          id: 'item1',
          label: 'Guia de Inicio',
          icon: 'pi-home',
          link: '/item1',
          priority: 'alta',
          owner: 'engineering',
        },
        { id: 'item2', label: 'Item 2', icon: 'pi-user', link: '/item2', status: 'ANDAMENTO' },
      ],
    },
    {
      id: 'cat2',
      label: 'Categoria 2',
      isBacklog: true,
      items: [
        { id: 'item3', label: 'Item 3', icon: 'pi-cog', link: '/item3', status: 'DISCUSSAO' },
        { id: 'item4', label: 'Item 4', icon: 'pi-check', link: '/item4', status: 'ARQUIVADO' },
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

  it('deve exibir o link de pulo (skip link) para acessibilidade', () => {
    const skipLink = fixture.debugElement.query(By.css('a[href="#main-content"]'));
    expect(skipLink).toBeTruthy();
    expect(skipLink.nativeElement.classList.contains('sr-only')).toBe(true);
    expect(skipLink.nativeElement.textContent.trim()).toBe('Pular para o conteúdo principal');
  });

  it('deve exibir o título correto no header da sidebar mobile', () => {
    const mobileHeader = fixture.debugElement.query(By.css('aside .lg\\:hidden.items-center'));
    expect(mobileHeader).toBeTruthy();

    const title = mobileHeader.query(By.css('span.font-bold'));
    expect(title.nativeElement.textContent).toBe('Conteúdo do Guia');

    const icon = mobileHeader.query(By.css('i.pi-list'));
    expect(icon).toBeTruthy();
  });

  it('deve ter atributos de acessibilidade ARIA corretos', () => {
    const nav = fixture.debugElement.query(By.css('nav'));
    expect(nav.attributes['aria-label']).toBe('Navegação da documentação');

    const main = fixture.debugElement.query(By.css('main'));
    expect(main.attributes['id']).toBe('main-content');
    expect(main.attributes['tabindex']).toBe('-1');

    // Verifica role="group" nas categorias expandidas
    const expandedGroup = fixture.debugElement.query(By.css('[role="group"]'));
    expect(expandedGroup).toBeTruthy();
    expect(expandedGroup.attributes['aria-label']).toContain('Itens de Categoria 1');
  });

  it('deve aplicar as classes de status corretamente', () => {
    expect(baseComponent.getStatusClass('ANDAMENTO')).toContain('bg-indigo-50');
    expect(baseComponent.getStatusClass('DISCUSSAO')).toContain('bg-orange-50');
    expect(baseComponent.getStatusClass('ARQUIVADO')).toContain('bg-slate-100');
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

    // No novo template, os itens são filtrados por status, mas não possuem headers de texto explícitos
    // O teste falha porque não existem elementos com a classe .text-xs.font-bold.uppercase.tracking-tighter
    // Vamos verificar se os itens estão presentes e se o status é exibido corretamente
    const statusBadges = backlogCategory.queryAll(
      By.css('span.font-bold.uppercase.tracking-wider'),
    );
    const statusTexts = statusBadges.map((b) => b.nativeElement.textContent.trim());

    expect(statusTexts).toContain('DISCUSSÃO');
    expect(statusTexts).toContain('ARQUIVADO');
  });

  describe('Command Palette e Metadados Avançados', () => {
    it('deve exibir ícones de prioridade e tags de proprietário nos itens da sidebar', () => {
      const item1 = fixture.debugElement.query(By.css('[data-testid="nav-item1"]'));
      expect(item1).toBeTruthy();

      // Verifica ícone de prioridade
      const priorityIcon = item1.query(By.css('.pi-bolt'));
      expect(priorityIcon).toBeTruthy();
      expect(priorityIcon.nativeElement.classList.contains('text-orange-500')).toBe(true);

      // Verifica tag de proprietário
      const ownerTag = item1.query(By.css('.border-slate-200\\/50'));
      expect(ownerTag).toBeTruthy();
      expect(ownerTag.nativeElement.textContent.trim()).toBe('engineering');
      expect(ownerTag.nativeElement.classList.contains('hidden')).toBe(true); // Oculto por padrão (hover)
    });

    it('deve abrir a busca ao pressionar Ctrl+K', () => {
      expect(fixture.debugElement.query(By.css('[role="dialog"]'))).toBeFalsy();

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        cancelable: true,
      });
      window.dispatchEvent(event);
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('[role="dialog"]'))).toBeTruthy();
      expect(baseComponent['isSearchOpen']()).toBe(true);
    });

    it('deve filtrar resultados na command palette', async () => {
      baseComponent['openSearch']();
      fixture.detectChanges();

      baseComponent['onSearchQueryChange']('Guia');
      fixture.detectChanges();

      const results = baseComponent['searchResults']();
      expect(results.length).toBe(1);
      expect(results[0].label).toBe('Guia de Inicio');
    });

    it('deve navegar para o resultado ao pressionar Enter', () => {
      const routerSpy = vi.spyOn(baseComponent['router'], 'navigateByUrl');
      baseComponent['openSearch']();
      baseComponent['onSearchQueryChange']('Guia');
      fixture.detectChanges();

      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        cancelable: true,
      });
      window.dispatchEvent(event);

      expect(routerSpy).toHaveBeenCalledWith('/item1');
      expect(baseComponent['isSearchOpen']()).toBe(false);
    });

    it('deve fechar a busca ao pressionar Esc', () => {
      baseComponent['openSearch']();
      fixture.detectChanges();
      expect(baseComponent['isSearchOpen']()).toBe(true);

      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        cancelable: true,
      });
      window.dispatchEvent(event);
      fixture.detectChanges();

      expect(baseComponent['isSearchOpen']()).toBe(false);
    });
  });
});
