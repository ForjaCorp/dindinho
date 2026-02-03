/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TestBed, getTestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { runInInjectionContext, EnvironmentInjector } from '@angular/core';
import { authGuard } from './auth.guard';
import { AuthService, UserState } from '../services/auth.service';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

describe('authGuard', () => {
  let authService: AuthService;
  let router: Router;
  let mockActivatedRouteSnapshot: ActivatedRouteSnapshot;
  let mockRouterStateSnapshot: RouterStateSnapshot;
  let injector: EnvironmentInjector;

  beforeEach(() => {
    const authServiceSpy = {
      isAuthenticated: vi.fn(),
      currentUser: vi.fn(),
    };

    const routerSpy = {
      navigate: vi.fn(),
      createUrlTree: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });

    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    injector = TestBed.inject(EnvironmentInjector);

    mockActivatedRouteSnapshot = {} as ActivatedRouteSnapshot;
    mockRouterStateSnapshot = { url: '/test-url' } as RouterStateSnapshot;
    // Mock do RouterState
    Object.defineProperty(router, 'routerState', {
      get: () => ({
        snapshot: { url: '/test-url' },
      }),
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('deve permitir acesso quando usuário autenticado', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
    const user: UserState = {
      id: '1',
      name: 'User',
      email: 'user@test.com',
      role: 'VIEWER',
    };
    vi.spyOn(authService, 'currentUser').mockReturnValue(user);

    const result = runInInjectionContext(injector, () =>
      authGuard(mockActivatedRouteSnapshot, mockRouterStateSnapshot),
    );

    expect(result).toBe(true);
    expect(authService.isAuthenticated).toHaveBeenCalled();
  });

  it('deve redirecionar para login quando usuário não autenticado', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(false);
    const createUrlTreeSpy = vi.spyOn(router, 'createUrlTree');

    runInInjectionContext(injector, () =>
      authGuard(mockActivatedRouteSnapshot, mockRouterStateSnapshot),
    );

    expect(authService.isAuthenticated).toHaveBeenCalled();
    expect(createUrlTreeSpy).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/test-url' },
    });
  });

  it('deve criar dependências corretamente', () => {
    expect(authService).toBeTruthy();
    expect(router).toBeTruthy();
  });

  it('deve evitar router.navigate ao redirecionar', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(false);
    const loginUrlTree = { url: '/login' } as unknown as UrlTree;
    vi.spyOn(router, 'createUrlTree').mockReturnValue(loginUrlTree);

    runInInjectionContext(injector, () =>
      authGuard(mockActivatedRouteSnapshot, mockRouterStateSnapshot),
    );

    expect(router.navigate).not.toHaveBeenCalled();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/test-url' },
    });
  });

  it('deve funcionar com diferentes snapshots de rota', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(false);
    const loginUrlTree = { url: '/login' } as unknown as UrlTree;
    vi.spyOn(router, 'createUrlTree').mockReturnValue(loginUrlTree);

    const customRouteSnapshot = {
      routeConfig: { path: 'protected-route' },
    } as ActivatedRouteSnapshot;

    const result = runInInjectionContext(injector, () =>
      authGuard(customRouteSnapshot, mockRouterStateSnapshot),
    );

    expect(result).toBe(loginUrlTree);
    expect(authService.isAuthenticated).toHaveBeenCalled();
  });

  it('deve bloquear acesso quando role não corresponde', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
    const user: UserState = {
      id: '1',
      name: 'User',
      email: 'user@test.com',
      role: 'VIEWER',
    };
    vi.spyOn(authService, 'currentUser').mockReturnValue(user);

    const routeWithRole = {
      data: { requiredRole: 'ADMIN' },
    } as unknown as ActivatedRouteSnapshot;

    const result = runInInjectionContext(injector, () =>
      authGuard(routeWithRole, mockRouterStateSnapshot),
    );

    expect(router.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
    expect(result).not.toBe(true);
  });

  it('deve permitir acesso quando role atende requisito', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
    const user: UserState = {
      id: '1',
      name: 'User',
      email: 'user@test.com',
      role: 'ADMIN',
    };
    vi.spyOn(authService, 'currentUser').mockReturnValue(user);

    const routeWithRole = {
      data: { requiredRole: 'ADMIN' },
    } as unknown as ActivatedRouteSnapshot;

    const result = runInInjectionContext(injector, () =>
      authGuard(routeWithRole, mockRouterStateSnapshot),
    );

    expect(result).toBe(true);
  });

  it('deve permitir acesso quando role está entre as permitidas', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
    const user: UserState = {
      id: '1',
      name: 'User',
      email: 'user@test.com',
      role: 'EDITOR',
    };
    vi.spyOn(authService, 'currentUser').mockReturnValue(user);

    const routeWithRoles = {
      data: { roles: ['VIEWER', 'EDITOR'] },
    } as unknown as ActivatedRouteSnapshot;

    const result = runInInjectionContext(injector, () =>
      authGuard(routeWithRoles, mockRouterStateSnapshot),
    );

    expect(result).toBe(true);
  });

  it('deve bloquear acesso quando role não está entre as permitidas', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
    const user: UserState = {
      id: '1',
      name: 'User',
      email: 'user@test.com',
      role: 'VIEWER',
    };
    vi.spyOn(authService, 'currentUser').mockReturnValue(user);

    const routeWithRoles = {
      data: { roles: ['ADMIN'] },
    } as unknown as ActivatedRouteSnapshot;

    const result = runInInjectionContext(injector, () =>
      authGuard(routeWithRoles, mockRouterStateSnapshot),
    );

    expect(router.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
    expect(result).not.toBe(true);
  });
});
