/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TestBed, getTestBed } from '@angular/core/testing';
import { Router, RouterStateSnapshot, ActivatedRouteSnapshot } from '@angular/router';
import { subdomainGuard } from './subdomain.guard';
import { runInInjectionContext, EnvironmentInjector } from '@angular/core';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

describe('subdomainGuard', () => {
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

    injector = TestBed.inject(EnvironmentInjector);

    // Mock do window.location
    vi.stubGlobal('location', {
      hostname: 'app.dindinho.com',
      origin: 'https://app.dindinho.com',
      protocol: 'https:',
      href: '',
    });
  });

  it('deve bloquear acesso a /docs se NÃO estiver no subdomínio docs e redirecionar', () => {
    const mockLocation = {
      hostname: 'app.dindinho.com',
      origin: 'https://app.dindinho.com',
      href: '',
    };
    vi.stubGlobal('location', mockLocation);

    const result = runInInjectionContext(injector, () =>
      subdomainGuard({} as ActivatedRouteSnapshot, { url: '/docs' } as RouterStateSnapshot),
    );

    expect(result).toBe(false);
    expect(mockLocation.href).toBe('https://docs.app.dindinho.com/docs');
  });

  it('deve permitir acesso se não estiver no subdomínio docs e NÃO for rota de documentação', () => {
    vi.stubGlobal('location', {
      hostname: 'app.dindinho.com',
      origin: 'https://app.dindinho.com',
    });

    const result = runInInjectionContext(injector, () =>
      subdomainGuard({} as ActivatedRouteSnapshot, { url: '/dashboard' } as RouterStateSnapshot),
    );

    expect(result).toBe(true);
  });

  it('deve permitir acesso a /docs no subdomínio docs', () => {
    vi.stubGlobal('location', {
      hostname: 'docs.dindinho.com',
      origin: 'https://docs.dindinho.com',
    });

    const result = runInInjectionContext(injector, () =>
      subdomainGuard({} as ActivatedRouteSnapshot, { url: '/docs/api' } as RouterStateSnapshot),
    );

    expect(result).toBe(true);
  });

  it('deve permitir acesso a /login no subdomínio docs', () => {
    vi.stubGlobal('location', {
      hostname: 'docs.dindinho.com',
      origin: 'https://docs.dindinho.com',
    });

    const result = runInInjectionContext(injector, () =>
      subdomainGuard({} as ActivatedRouteSnapshot, { url: '/login' } as RouterStateSnapshot),
    );

    expect(result).toBe(true);
  });

  it('deve redirecionar para o domínio principal via window.location se acessar rota proibida no subdomínio docs (mesmo em dev com subdomínio)', () => {
    const mockLocation = {
      hostname: 'docs.localhost',
      origin: 'http://docs.localhost:4200',
      protocol: 'http:',
      href: '',
    };
    vi.stubGlobal('location', mockLocation);

    const result = runInInjectionContext(injector, () =>
      subdomainGuard({} as ActivatedRouteSnapshot, { url: '/dashboard' } as RouterStateSnapshot),
    );

    expect(result).toBe(false);
    expect(mockLocation.href).toBe('http://localhost:4200/dashboard');
  });

  it('deve permitir acesso a / no subdomínio docs', () => {
    vi.stubGlobal('location', {
      hostname: 'docs.dindinho.com',
      origin: 'https://docs.dindinho.com',
    });

    const result = runInInjectionContext(injector, () =>
      subdomainGuard({} as ActivatedRouteSnapshot, { url: '/' } as RouterStateSnapshot),
    );

    expect(result).toBe(true);
  });

  it('deve redirecionar para o subdomínio docs em localhost se acessar /docs', () => {
    const mockLocation = {
      hostname: 'localhost',
      origin: 'http://localhost:4200',
      href: '',
    };
    vi.stubGlobal('location', mockLocation);

    const result = runInInjectionContext(injector, () =>
      subdomainGuard({} as ActivatedRouteSnapshot, { url: '/docs/intro' } as RouterStateSnapshot),
    );

    expect(result).toBe(false);
    expect(mockLocation.href).toBe('http://docs.localhost:4200/docs/intro');
  });

  it('deve redirecionar para o subdomínio docs em produção se acessar /docs', () => {
    const mockLocation = {
      hostname: 'app.dindinho.com',
      origin: 'https://app.dindinho.com',
      href: '',
    };
    vi.stubGlobal('location', mockLocation);

    const result = runInInjectionContext(injector, () =>
      subdomainGuard({} as ActivatedRouteSnapshot, { url: '/docs/intro' } as RouterStateSnapshot),
    );

    expect(result).toBe(false);
    expect(mockLocation.href).toBe('https://docs.app.dindinho.com/docs/intro');
  });

  it('deve redirecionar para o domínio principal se estiver em produção e acessar rota proibida no docs', () => {
    const mockLocation = {
      hostname: 'docs.dindinho.forjacorp.com',
      origin: 'https://docs.dindinho.forjacorp.com',
      protocol: 'https:',
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
