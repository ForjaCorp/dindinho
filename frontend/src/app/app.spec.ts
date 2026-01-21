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
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
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
   * Testa se o componente contém o router-outlet.
   */
  it('deve conter o router-outlet', () => {
    const routerOutlet = fixture.nativeElement.querySelector('router-outlet');
    expect(routerOutlet).toBeTruthy();
  });
});
