/** @vitest-environment jsdom */
import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { UrlSyncService } from './url-sync.service';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

describe('UrlSyncService', () => {
  let service: UrlSyncService;
  let router: Router;
  let route: ActivatedRoute;

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  beforeEach(() => {
    const routerMock = {
      navigate: vi.fn(),
    };

    // ActivatedRoute mock simples já que só usamos para referência relativa
    const routeMock = {};

    TestBed.configureTestingModule({
      providers: [
        UrlSyncService,
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: routeMock },
      ],
    });

    service = TestBed.inject(UrlSyncService);
    router = TestBed.inject(Router);
    route = TestBed.inject(ActivatedRoute);
  });

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  describe('updateParams', () => {
    it('deve chamar router.navigate com parâmetros mesclados', () => {
      const params = { foo: 'bar', baz: null };

      service.updateParams(route, params);

      expect(router.navigate).toHaveBeenCalledWith([], {
        relativeTo: route,
        queryParams: { foo: 'bar', baz: null },
        queryParamsHandling: 'merge',
      });
    });

    it('deve adicionar openFilters=1 se options.openFilters for true', () => {
      const params = { foo: 'bar' };

      service.updateParams(route, params, { openFilters: true });

      expect(router.navigate).toHaveBeenCalledWith([], {
        relativeTo: route,
        queryParams: { foo: 'bar', openFilters: 1 },
        queryParamsHandling: 'merge',
      });
    });

    it('NÃO deve adicionar openFilters se options.openFilters for false ou undefined', () => {
      const params = { foo: 'bar' };

      service.updateParams(route, params, { openFilters: false });

      expect(router.navigate).toHaveBeenCalledWith([], {
        relativeTo: route,
        queryParams: { foo: 'bar' },
        queryParamsHandling: 'merge',
      });
    });
  });
});
