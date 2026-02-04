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
import { describe, it, expect, beforeEach, vi, afterEach, Mock } from 'vitest';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { AuthService } from './services/auth.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

describe('App', () => {
  let fixture: ComponentFixture<App>;
  let component: App;
  let authServiceMock: {
    getAccessToken: Mock;
  };

  beforeEach(() => {
    const testBed = getTestBed();
    testBed.resetTestingModule();
    if (!testBed.platform) {
      testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Configura o ambiente de teste antes de cada caso de teste.
   */
  const createComponent = async () => {
    authServiceMock = {
      getAccessToken: vi.fn().mockReturnValue(null),
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  /**
   * Testa se o componente é criado com sucesso.
   */
  it('deve criar o aplicativo', async () => {
    await createComponent();
    expect(component).toBeTruthy();
  });

  /**
   * Testa se o componente contém o router-outlet.
   */
  it('deve conter o router-outlet', async () => {
    await createComponent();
    const routerOutlet = fixture.nativeElement.querySelector('router-outlet');
    expect(routerOutlet).toBeTruthy();
  });
});
