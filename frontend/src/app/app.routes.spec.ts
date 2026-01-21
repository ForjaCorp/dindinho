import { describe, it, expect, beforeEach } from 'vitest';
import { routes } from './app.routes';
import { authGuard } from './guards/auth.guard';
import { Route } from '@angular/router';

describe('app.routes', () => {
  let routesList: Route[];

  beforeEach(() => {
    routesList = routes;
  });

  it('should be defined', () => {
    expect(routesList).toBeDefined();
    expect(Array.isArray(routesList)).toBe(true);
  });

  it('should have the correct number of routes', () => {
    expect(routesList).toHaveLength(4);
  });

  it('should have default route redirecting to dashboard', () => {
    const defaultRoute = routesList.find((route) => route.path === '');
    expect(defaultRoute).toBeDefined();
    if (defaultRoute) {
      expect(defaultRoute.redirectTo).toBe('dashboard');
      expect(defaultRoute.pathMatch).toBe('full');
    }
  });

  it('should have login route without guard', () => {
    const loginRoute = routesList.find((route) => route.path === 'login');
    expect(loginRoute).toBeDefined();
    if (loginRoute) {
      expect(loginRoute.loadComponent).toBeDefined();
      expect(typeof loginRoute.loadComponent).toBe('function');
      expect(loginRoute.component).toBeUndefined();
      expect(loginRoute.canActivate).toBeUndefined();
    }
  });

  it('should have dashboard route with auth guard', () => {
    const dashboardRoute = routesList.find((route) => route.path === 'dashboard');
    expect(dashboardRoute).toBeDefined();
    if (dashboardRoute) {
      expect(dashboardRoute.loadComponent).toBeDefined();
      expect(typeof dashboardRoute.loadComponent).toBe('function');
      expect(dashboardRoute.component).toBeUndefined();
      expect(dashboardRoute.canActivate).toBeDefined();
      expect(dashboardRoute.canActivate).toContain(authGuard);
    }
  });

  it('should have wildcard route redirecting to dashboard', () => {
    const wildcardRoute = routesList.find((route) => route.path === '**');
    expect(wildcardRoute).toBeDefined();
    if (wildcardRoute) {
      expect(wildcardRoute.redirectTo).toBe('dashboard');
    }
  });

  it('should have routes in correct order', () => {
    const paths = routesList.map((route) => route.path);
    expect(paths).toEqual(['', 'login', 'dashboard', '**']);
  });

  it('should use correct components', () => {
    const loginRoute = routesList.find((route) => route.path === 'login');
    const dashboardRoute = routesList.find((route) => route.path === 'dashboard');

    if (loginRoute) {
      expect(loginRoute.loadComponent).toBeDefined();
    }
    if (dashboardRoute) {
      expect(dashboardRoute.loadComponent).toBeDefined();
    }
  });

  it('should apply auth guard only to protected routes', () => {
    const loginRoute = routesList.find((route) => route.path === 'login');
    const dashboardRoute = routesList.find((route) => route.path === 'dashboard');

    if (loginRoute) {
      expect(loginRoute.canActivate).toBeUndefined();
    }
    if (dashboardRoute) {
      expect(dashboardRoute.canActivate).toBeDefined();
      expect(dashboardRoute.canActivate).toHaveLength(1);
    }
  });

  it('should handle route configuration consistency', () => {
    routesList.forEach((route) => {
      if (route.redirectTo) {
        expect(route.pathMatch || route.path === '**').toBeTruthy();
      }
      if (route.component) {
        expect(typeof route.component).toBe('function');
      }
      if (route.loadComponent) {
        expect(typeof route.loadComponent).toBe('function');
      }
      if (route.path) {
        expect(typeof route.path).toBe('string');
      }
    });
  });

  it('should have proper route path patterns', () => {
    // Verifica se temos paths esperados diretamente nas rotas
    const hasEmptyPath = routesList.some((route) => route.path === '');
    const hasLoginPath = routesList.some((route) => route.path === 'login');
    const hasDashboardPath = routesList.some((route) => route.path === 'dashboard');
    const hasWildcardPath = routesList.some((route) => route.path === '**');

    expect(hasEmptyPath).toBe(true);
    expect(hasLoginPath).toBe(true);
    expect(hasDashboardPath).toBe(true);
    expect(hasWildcardPath).toBe(true);

    // Verifica se os paths são strings quando definidos
    routesList.forEach((route) => {
      if (route.path) {
        expect(typeof route.path).toBe('string');
        expect(route.path.length).toBeGreaterThan(0);
      }
    });
  });

  it('should redirect unmatched routes appropriately', () => {
    const wildcardRoute = routesList.find((route) => route.path === '**');
    if (wildcardRoute) {
      expect(wildcardRoute.redirectTo).toBe('dashboard');
      expect(wildcardRoute.component).toBeUndefined();
      expect(wildcardRoute.canActivate).toBeUndefined();
    }
  });

  it('should maintain route configuration structure', () => {
    routesList.forEach((route) => {
      expect(route).toBeInstanceOf(Object);
      expect('path' in route).toBe(true);
    });
  });
});
