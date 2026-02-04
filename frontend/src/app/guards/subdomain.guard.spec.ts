/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TestBed, getTestBed } from '@angular/core/testing';
import { Router, RouterStateSnapshot, ActivatedRouteSnapshot, UrlTree } from '@angular/router';
import { subdomainGuard } from './subdomain.guard';
import { runInInjectionContext, EnvironmentInjector } from '@angular/core';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

describe('subdomainGuard', () => {
  let router: Router;
  let injector: EnvironmentInjector;

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    const routerSpy = {
      createUrlTree: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: routerSpy }],
    });

    router = TestBed.inject(Router);
    injector = TestBed.inject(EnvironmentInjector);

    // Mock do window.location
    vi.stubGlobal('location', {
      hostname: 'app.dindinho.com',
      href: '',
    });
  });

  it('deve permitir acesso se não estiver no subdomínio docs', () => {
    vi.stubGlobal('location', { hostname: 'app.dindinho.com' });

    const result = runInInjectionContext(injector, () =>
      subdomainGuard({} as ActivatedRouteSnapshot, { url: '/dashboard' } as RouterStateSnapshot),
    );

    expect(result).toBe(true);
  });

  it('deve permitir acesso a /docs no subdomínio docs', () => {
    vi.stubGlobal('location', { hostname: 'docs.dindinho.com' });

    const result = runInInjectionContext(injector, () =>
      subdomainGuard({} as ActivatedRouteSnapshot, { url: '/docs/api' } as RouterStateSnapshot),
    );

    expect(result).toBe(true);
  });

  it('deve permitir acesso a /login no subdomínio docs', () => {
    vi.stubGlobal('location', { hostname: 'docs.dindinho.com' });

    const result = runInInjectionContext(injector, () =>
      subdomainGuard({} as ActivatedRouteSnapshot, { url: '/login' } as RouterStateSnapshot),
    );

    expect(result).toBe(true);
  });

  it('deve redirecionar para /docs se acessar rota proibida no subdomínio docs (dev)', () => {
    vi.stubGlobal('location', { hostname: 'docs.localhost' });
    const urlTree = {} as UrlTree;
    vi.spyOn(router, 'createUrlTree').mockReturnValue(urlTree);

    const result = runInInjectionContext(injector, () =>
      subdomainGuard({} as ActivatedRouteSnapshot, { url: '/dashboard' } as RouterStateSnapshot),
    );

    expect(result).toBe(urlTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/docs']);
  });

  it('deve redirecionar para o domínio principal se estiver em produção', () => {
    const mockLocation = {
      hostname: 'docs.dindinho.forjacorp.com',
      href: '',
    };
    vi.stubGlobal('location', mockLocation);

    const result = runInInjectionContext(injector, () =>
      subdomainGuard({} as ActivatedRouteSnapshot, { url: '/dashboard' } as RouterStateSnapshot),
    );

    expect(result).toBe(false);
    expect(mockLocation.href).toBe('https://dindinho.forjacorp.com/dashboard');
  });
});
