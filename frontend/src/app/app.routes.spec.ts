import '@angular/compiler'; // Import necessário para JIT no ambiente de teste
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { routes } from './app.routes';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';
import { subdomainGuard } from './guards/subdomain.guard';
import { Route } from '@angular/router';
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout.component';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import '@angular/compiler'; // Import necessário para JIT no ambiente de teste

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

describe('Rotas da aplicação', () => {
  let routesList: Route[];

  beforeEach(() => {
    routesList = routes;
  });

  it('deve estar definido', () => {
    expect(routesList).toBeDefined();
    expect(Array.isArray(routesList)).toBe(true);
  });

  it('deve redirecionar rota inicial baseada no subdomínio', () => {
    const initialRoute = routesList.find((route) => route.path === '' && route.redirectTo);
    expect(initialRoute).toBeDefined();
    expect(typeof initialRoute?.redirectTo).toBe('function');
    expect(initialRoute?.canActivate).toContain(subdomainGuard);

    // Mock do hostname para testar a função redirectTo
    const redirectTo = initialRoute?.redirectTo as () => string;

    vi.stubGlobal('location', { hostname: 'dindinho.forjacorp.com' });
    expect(redirectTo()).toBe('login');

    vi.stubGlobal('location', { hostname: 'docs.dindinho.forjacorp.com' });
    expect(redirectTo()).toBe('docs/intro');

    vi.unstubAllGlobals();
  });

  it('deve ter rota de layout de auth com guest guard e subdomain guard', () => {
    const authRoute = routesList.find((route) => route.component === AuthLayoutComponent);
    expect(authRoute).toBeDefined();
    expect(authRoute?.canActivate).toContain(subdomainGuard);
    expect(authRoute?.children).toBeDefined();

    const loginChild = authRoute?.children?.find((child) => child.path === 'login');
    expect(loginChild).toBeDefined();
    expect(loginChild?.loadComponent).toBeDefined();
    expect(loginChild?.canActivate).toContain(guestGuard);
  });

  it('deve ter rota de layout principal com auth guard e subdomain guard', () => {
    const mainRoute = routesList.find((route) => route.component === MainLayoutComponent);
    expect(mainRoute).toBeDefined();
    expect(mainRoute?.canActivate).toContain(authGuard);
    expect(mainRoute?.canActivate).toContain(subdomainGuard);
    expect(mainRoute?.children).toBeDefined();

    const dashboardChild = mainRoute?.children?.find((child) => child.path === 'dashboard');
    expect(dashboardChild).toBeDefined();
    expect(dashboardChild?.loadComponent).toBeDefined();

    const accountsChild = mainRoute?.children?.find((child) => child.path === 'accounts');
    expect(accountsChild).toBeDefined();
    expect(accountsChild?.loadComponent).toBeDefined();

    const cardsChild = mainRoute?.children?.find((child) => child.path === 'cards');
    expect(cardsChild).toBeDefined();
    expect(cardsChild?.loadComponent).toBeDefined();

    const transactionsChild = mainRoute?.children?.find((child) => child.path === 'transactions');
    expect(transactionsChild).toBeDefined();
    expect(transactionsChild?.loadComponent).toBeDefined();

    const createTxChild = mainRoute?.children?.find((child) => child.path === 'transactions/new');
    expect(createTxChild).toBeDefined();
    expect(createTxChild?.loadComponent).toBeDefined();

    const allowlistChild = mainRoute?.children?.find((child) => child.path === 'admin/allowlist');
    expect(allowlistChild).toBeDefined();
    expect(allowlistChild?.loadComponent).toBeDefined();
  });

  it('deve ter rota curinga redirecionando para login', () => {
    const wildcardRoute = routesList.find((route) => route.path === '**');
    expect(wildcardRoute).toBeDefined();
    expect(wildcardRoute?.redirectTo).toBe('login');
  });

  it('deve redirecionar docs vazio para intro', () => {
    const docsRoute = routesList.find((route) => route.path === 'docs');
    expect(docsRoute).toBeDefined();
    const emptyChild = docsRoute?.children?.find((child) => child.path === '');
    expect(emptyChild).toBeDefined();
    expect(emptyChild?.redirectTo).toBe('intro');
    expect(emptyChild?.pathMatch).toBe('full');
  });
});
