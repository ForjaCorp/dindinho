/**
 * Testes de unidade para o componente raiz da aplicação.
 *
 * Este arquivo contém testes para garantir o funcionamento correto
 * do componente App, que é o componente raiz da aplicação.
 *
 * @see {@link https://angular.io/guide/testing} Documentação oficial de testes do Angular
 */

/**
 * @vitest-environment jsdom
 */
import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
}

describe('App', () => {
  let fixture: ComponentFixture<App>;
  let component: App;

  /**
   * Configura o ambiente de teste antes de cada caso de teste.
   */
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]), // Fornece o roteador sem rotas, já que estamos testando apenas o componente raiz
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  /**
   * Testa se o componente é criado com sucesso.
   */
  it('deve criar o aplicativo', () => {
    expect(component).toBeTruthy();
  });

  /**
   * Testa se o template renderiza o título e a logo corretamente.
   */
  it('deve renderizar o título e a logo', () => {
    const titleElement = fixture.nativeElement.querySelector('[data-testid="app-title"]');
    const logoElement = fixture.nativeElement.querySelector('[data-testid="logo"]');

    expect(titleElement).toBeTruthy();
    expect(titleElement.textContent).toContain('Dindinho');
    expect(logoElement).toBeTruthy();
  });

  /**
   * Testa se a navegação inferior está sendo renderizada corretamente.
   */
  it('deve renderizar a navegação inferior com os botões corretos', () => {
    const navElement = fixture.nativeElement.querySelector('[data-testid="bottom-navigation"]');
    const navItems = [
      { testId: 'nav-home', text: 'Início' },
      { testId: 'nav-wallet', text: 'Carteira' },
      { testId: 'add-button' },
      { testId: 'nav-reports', text: 'Relatórios' },
      { testId: 'nav-profile', text: 'Perfil' },
    ];

    expect(navElement).toBeTruthy();

    // Verifica cada item de navegação
    navItems.forEach((item) => {
      const element = fixture.nativeElement.querySelector(`[data-testid="${item.testId}"]`);
      expect(element).toBeTruthy();

      // Verifica o texto se existir
      if (item.text) {
        expect(element.textContent).toContain(item.text);
      }
    });
  });

  /**
   * Testa se a área de conteúdo principal está presente.
   */
  it('deve conter a área de conteúdo principal', () => {
    const mainElement = fixture.nativeElement.querySelector('[data-testid="main-content"]');
    expect(mainElement).toBeTruthy();

    // Verifica se o router-outlet está presente dentro do main
    const routerOutlet = mainElement.querySelector('router-outlet');
    expect(routerOutlet).toBeTruthy();
  });
});
