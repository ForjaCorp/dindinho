/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TestBed, getTestBed } from '@angular/core/testing';
import { Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { guestGuard } from './guest.guard';
import { AuthService } from '../services/auth.service';
import { EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

describe('guestGuard', () => {
  let authService: AuthService;
  let router: Router;
  let injector: EnvironmentInjector;
  let mockActivatedRouteSnapshot: ActivatedRouteSnapshot;
  let mockRouterStateSnapshot: RouterStateSnapshot;

  beforeEach(() => {
    const authServiceSpy = {
      isAuthenticated: vi.fn(),
    };

    const routerSpy = {
      createUrlTree: vi.fn().mockReturnValue({} as UrlTree),
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

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should allow access when user is NOT authenticated', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(false);

    const result = runInInjectionContext(injector, () =>
      guestGuard(mockActivatedRouteSnapshot, mockRouterStateSnapshot),
    );

    expect(result).toBe(true);
    expect(authService.isAuthenticated).toHaveBeenCalled();
  });

  it('should redirect to dashboard when user IS authenticated', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
    const createUrlTreeSpy = vi.spyOn(router, 'createUrlTree');

    runInInjectionContext(injector, () =>
      guestGuard(mockActivatedRouteSnapshot, mockRouterStateSnapshot),
    );

    expect(authService.isAuthenticated).toHaveBeenCalled();
    expect(createUrlTreeSpy).toHaveBeenCalledWith(['/dashboard']);
  });
});
