// @vitest-environment jsdom
import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PublicLayoutComponent } from './public-layout.component';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

/**
 * @description
 * Testes para o PublicLayoutComponent.
 * Verifica se os elementos básicos de navegação e estrutura estão presentes.
 */
describe('PublicLayoutComponent', () => {
  let component: PublicLayoutComponent;
  let fixture: ComponentFixture<PublicLayoutComponent>;

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicLayoutComponent],
      providers: [
        provideRouter([
          { path: 'login', component: class {} },
          { path: 'signup', component: class {} },
          { path: 'pricing', component: class {} },
          { path: 'faq', component: class {} },
          { path: 'privacy-policy', component: class {} },
        ]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PublicLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve renderizar o header público com os links de navegação', () => {
    const header = fixture.nativeElement.querySelector('[data-testid="public-header"]');
    const logo = fixture.nativeElement.querySelector('[data-testid="public-logo"]');
    const nav = fixture.nativeElement.querySelector('[data-testid="public-nav"]');

    expect(header).toBeTruthy();
    expect(logo).toBeTruthy();
    expect(logo.textContent).toContain('Dindinho');
    expect(nav).toBeTruthy();

    const navLinks = [
      { testId: 'nav-pricing', text: 'Preços' },
      { testId: 'nav-faq', text: 'FAQ' },
      { testId: 'nav-privacy', text: 'Privacidade' },
    ];

    navLinks.forEach((link) => {
      const element = fixture.nativeElement.querySelector(`[data-testid="${link.testId}"]`);
      expect(element).toBeTruthy();
      expect(element.textContent).toContain(link.text);
    });
  });

  it('deve renderizar os botões de login e cadastro', () => {
    const loginBtn = fixture.nativeElement.querySelector('[data-testid="btn-login"]');
    const signupBtn = fixture.nativeElement.querySelector('[data-testid="btn-signup"]');

    expect(loginBtn).toBeTruthy();
    expect(loginBtn.textContent).toContain('Entrar');
    expect(signupBtn).toBeTruthy();
    expect(signupBtn.textContent).toContain('Começar agora');
  });

  it('deve renderizar o router-outlet dentro da tag main', () => {
    const main = fixture.nativeElement.querySelector('[data-testid="public-main"]');
    expect(main).toBeTruthy();
    expect(main.querySelector('router-outlet')).toBeTruthy();
  });

  it('deve renderizar o footer público', () => {
    const footer = fixture.nativeElement.querySelector('[data-testid="public-footer"]');
    expect(footer).toBeTruthy();
    expect(footer.textContent).toContain('Dindinho');
    expect(footer.textContent).toContain('2026');
  });
});
