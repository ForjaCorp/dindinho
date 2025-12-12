import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { runInInjectionContext, EnvironmentInjector } from '@angular/core';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  let authService: AuthService;
  let router: Router;
  let mockActivatedRouteSnapshot: ActivatedRouteSnapshot;
  let mockRouterStateSnapshot: RouterStateSnapshot;
  let injector: EnvironmentInjector;

  beforeEach(() => {
    const authServiceSpy = {
      isAuthenticated: vi.fn(),
      currentUser: {
        value: null,
        set: vi.fn(),
        update: vi.fn(),
      },
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
    mockRouterStateSnapshot = {} as RouterStateSnapshot;
  });

  it('should allow access when user is authenticated', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);

    const result = runInInjectionContext(injector, () =>
      authGuard(mockActivatedRouteSnapshot, mockRouterStateSnapshot),
    );

    expect(result).toBe(true);
    expect(authService.isAuthenticated).toHaveBeenCalled();
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('should redirect to login when user is not authenticated', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(false);
    const loginUrlTree = { url: '/login' } as unknown as UrlTree;
    vi.spyOn(router, 'createUrlTree').mockReturnValue(loginUrlTree);

    const result = runInInjectionContext(injector, () =>
      authGuard(mockActivatedRouteSnapshot, mockRouterStateSnapshot),
    );

    expect(result).toBe(loginUrlTree);
    expect(authService.isAuthenticated).toHaveBeenCalled();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login']);
  });

  it('should be created with proper dependencies', () => {
    expect(authService).toBeTruthy();
    expect(router).toBeTruthy();
  });

  it('should not call router.navigate when redirecting', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(false);
    const loginUrlTree = { url: '/login' } as unknown as UrlTree;
    vi.spyOn(router, 'createUrlTree').mockReturnValue(loginUrlTree);

    runInInjectionContext(injector, () =>
      authGuard(mockActivatedRouteSnapshot, mockRouterStateSnapshot),
    );

    expect(router.navigate).not.toHaveBeenCalled();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login']);
  });

  it('should work with different route snapshots', () => {
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
});
